// Privacy guard (Node only). Runs before any page or data file is written. A finding
// blocks publication of the whole run.

export const FORBIDDEN_KEYS = ['email', 'phone', 'instagram_handle', 'commission_terms', 'commission_note', 'source_text', 'source_link', 'notes', 'raw', 'intake'];

// One detector for both the adapter's sanitization and the publication scan.
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
export const PHONES = [
  /\+\d[\d\s().-]{6,}\d/, // international, any separators
  /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/, // (512) 555-0106
  /(?<![\w.$,])\d{3}[-.\s]?\d{3}[-.\s]?\d{4}(?![\w.,])/, // 512-555-0106, 512.555.0106, 512 555 0106, 5125550106
  /(?<![\w.$,])\d{2}[-.\s]\d{4}[-.\s]\d{4}(?![\w.,])/, // 55 0000 0105 (Mexico City style)
];
export const LINK = /\bhttps?:\/\/[^\s"'<>]+/;
const g = (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');

export function hasPhone(text) { return PHONES.some((re) => re.test(String(text))); }

/** Replace contact details and links in free text. The adapter calls this before export. */
export function redact(text, { contact = '[contact removed]', link = '[link removed]' } = {}) {
  if (text == null) return text;
  let out = String(text).replace(g(EMAIL), contact);
  for (const re of PHONES) out = out.replace(g(re), contact);
  return out.replace(g(LINK), link);
}

/** Scan a JSON-like value. Returns a list of findings; empty means clean. */
export function scanData(value, path = '$', out = []) {
  if (value == null) return out;
  if (typeof value === 'string') {
    if (EMAIL.test(value)) out.push({ path, kind: 'email' });
    if (hasPhone(value)) out.push({ path, kind: 'phone' });
    if (LINK.test(value)) out.push({ path, kind: 'link' });
    return out;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => scanData(v, `${path}[${i}]`, out)); return out; }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(k)) out.push({ path: `${path}.${k}`, kind: `forbidden field ${k}` });
      scanData(v, `${path}.${k}`, out);
    }
  }
  return out;
}

/** Scan the visible text of a rendered page: tags, scripts, and styles removed. */
export function scanPageText(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const out = [];
  if (EMAIL.test(text)) out.push({ path: 'page text', kind: 'email' });
  if (hasPhone(text)) out.push({ path: 'page text', kind: 'phone' });
  if (LINK.test(text)) out.push({ path: 'page text', kind: 'link' });
  return out;
}

/** Record identifiers that must never appear in reader-facing text. Unit names (1G) are allowed. */
export const RECORD_ID = /\b[BPRIC]\d{3}\b/;

/** Visible text of a page with scripts, styles, and inline SVG removed. */
export function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

export function scanIds(html, where) {
  const m = visibleText(html).match(RECORD_ID);
  return m ? [{ path: where, kind: `record identifier ${m[0]} in visible text` }] : [];
}

/**
 * Cards can travel outside the protected site. Their text may hold only approved
 * strings: no contact details, links, buyer or agent names, or record identifiers
 * (a buyer card may carry its own buyer identifier, never a name).
 */
export function checkCard(svg, { names = [], allowIds = [] } = {}, where = 'card') {
  const text = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join('\n');
  const out = [];
  if (EMAIL.test(text)) out.push({ path: where, kind: 'email' });
  if (hasPhone(text)) out.push({ path: where, kind: 'phone' });
  if (LINK.test(text)) out.push({ path: where, kind: 'link' });
  for (const n of names) if (n && text.includes(n)) out.push({ path: where, kind: `person name ${n}` });
  for (const m of text.matchAll(new RegExp(RECORD_ID.source, 'g'))) if (!allowIds.includes(m[0])) out.push({ path: where, kind: `record identifier ${m[0]}` });
  return out;
}

/** status.json sits outside Access: exactly run_id and as_of, nothing else. */
export function checkStatus(obj) {
  const keys = Object.keys(obj).sort();
  const findings = [];
  if (keys.join(',') !== 'as_of,run_id') findings.push({ path: 'status.json', kind: `unexpected keys ${keys.join(',')}` });
  for (const k of keys) if (typeof obj[k] !== 'string') findings.push({ path: `status.json.${k}`, kind: 'not a string' });
  return findings.concat(scanData(obj, 'status.json'));
}

export class PrivacyError extends Error {
  constructor(findings) {
    super(`Privacy check failed; nothing was published:\n${findings.map((f) => `  ${f.path}: ${f.kind}`).join('\n')}`);
    this.findings = findings;
  }
}
