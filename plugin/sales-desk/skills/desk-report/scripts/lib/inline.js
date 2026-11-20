// Inline bundler for published pages (Node only). Each ES module is embedded with its
// source unchanged except for two mechanical rewrites: `import ... from './x.js'`
// becomes a lookup in the page's module table, and the `export` keyword is removed
// from declarations. test/bundle.test.js checks that nothing else changes.

import { readFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const IMPORT_RE = /^import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+'(\.[^']+)';\s*$/gm;

export function moduleName(path) { return basename(path).replace(/\.js$/, ''); }

/** Collect the dependency graph of entry modules, in load order. */
export function collect(entries) {
  const order = [];
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) visit(resolve(dirname(path), m[3]));
    order.push({ path, name: moduleName(path), src });
  };
  for (const e of entries) visit(resolve(e));
  return order;
}

export function transform(src) {
  const exported = [];
  let out = src.replace(IMPORT_RE, (_, ns, named, from) => {
    const mod = JSON.stringify(moduleName(from));
    if (ns) return `const ${ns} = __m[${mod}];`;
    const names = named.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${names.join(', ')} } = __m[${mod}];`;
  });
  out = out.replace(/^export\s+(async\s+)?function\s+(\w+)/gm, (_, a, n) => { exported.push(n); return `${a || ''}function ${n}`; });
  out = out.replace(/^export\s+(const|let)\s+(\w+)/gm, (_, k, n) => { exported.push(n); return `${k} ${n}`; });
  out = out.replace(/^export\s+default\s+/m, () => { exported.push('default'); return 'const __default = '; });
  out = out.replace(/^export\s+\{([^}]*)\};?\s*$/gm, (_, list) => {
    for (const part of list.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      exported.push(as ? `${as}: ${local}` : local);
    }
    return '';
  });
  const ret = exported.map((e) => (e === 'default' ? 'default: __default' : e)).join(', ');
  return `${out}\nreturn { ${ret} };`;
}

export function bundle(entries) {
  const mods = collect(entries);
  const body = mods.map((m) => `__m[${JSON.stringify(m.name)}] = (function () {\n${transform(m.src)}\n})();`).join('\n');
  return { code: `(function () {\nconst __m = {};\n${body}\nwindow.__SD = __m;\n})();`, modules: mods.map((m) => m.name) };
}
