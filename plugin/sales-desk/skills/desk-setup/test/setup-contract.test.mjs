import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const base = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
function csv(text) {
  const rows = []; let row = [], cell = '', quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quote && text[i + 1] === '"') { cell += '"'; i++; } else quote = !quote; }
    else if (!quote && (c === ',' || c === '\n')) { row.push(cell); cell = ''; if (c === '\n') { rows.push(row); row = []; } }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...body] = rows;
  return body.map(row => Object.fromEntries(headers.map((key, i) => [key, row[i] ?? ''])));
}
test('new sheet default schema and documented formulas agree exactly', () => {
  const schema = csv(read('assets/schema.csv'));
  assert.equal(new Set(schema.map(r => `${r.tab}.${r.key}`)).size, schema.length);
  const pipeline = schema.filter(r => r.tab === 'Pipeline').map(r => r.key);
  assert.equal(pipeline[pipeline.indexOf('stage_override') + 1], 'stage_override_reason');
  const output = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('scripts/formulas.mjs', base)), '--default', '--json'], {encoding:'utf8'}));
  const blocks = [...read('assets/sheet-setup.md').matchAll(/```\n(=ARRAYFORMULA[\s\S]*?)\n```/g)].map(m => m[1]);
  assert.deepEqual(blocks, output.formulas.map(f => f.formula));
  assert.ok(output.protect.includes('Interactions!A2:AH'));
});
test('live template has no training clock, fake account email or invented lot mapping', () => {
  const settings = Object.fromEntries(csv(read('assets/live-settings.csv')).map(r => [r.setting,r.value]));
  assert.equal(settings.mode,'live'); assert.equal(settings.report_clock,'');
  assert.equal(settings.operators,'Alix; Freddie; Jackson');
  assert.ok(settings.task_owners.includes('<ask Google email>'));
  assert.ok(!settings.task_owners.includes('@'));
  const units = csv(read('assets/live-units-template.csv'));
  assert.equal(units.length,41); assert.equal(new Set(units.map(r => r.unit_id)).size,41);
  for (const row of units) for (const [key,value] of Object.entries(row)) if (key === 'size_unit') assert.equal(value,'m2'); else if (key !== 'unit_id') assert.equal(value,'');
});
test('fictional seed carries unique lead IDs and confirmed override/budget examples', () => {
  const people = csv(read('assets/seed/people.csv'));
  assert.equal(people.length,40);
  assert.equal(new Set(people.map(r => r.lead_id)).size,40);
  for (const p of people) assert.match(p.lead_id,/^OCN-\d{6}-\d{3}$/);
  assert.ok(people.some(p => p.budget_flag && p.likelihood_override && p.override_reason));
  const pipeline = csv(read('assets/seed/pipeline.csv'));
  assert.ok(pipeline.some(p => p.stage_override && p.stage_override_reason));
});

test('all training seed copies preserve the same override and budget examples', () => {
  const root = new URL('../../../../', base);
  for (const file of ['people.csv','pipeline.csv']) {
    const setup = read('assets/seed/' + file);
    for (const dir of ['training/seed/', 'plugin/sales-desk/skills/desk-report/training/seed/']) assert.equal(readFileSync(new URL(dir + file, root),'utf8'),setup);
  }
  const people = csv(read('assets/seed/people.csv'));
  const pipeline = csv(read('assets/seed/pipeline.csv'));
  const buyer = people.find(p=>p.person_id==='B001');
  assert.equal(buyer.budget_flag,'below Ola');assert.equal(buyer.interest_type,'Ola');
  const require = createRequire(import.meta.url);
  const likelihood = require('../../desk-workflows/scripts/likelihood.cjs');
  const rules = require('../../desk-workflows/scripts/rules.cjs');
  const result = likelihood.compute({person:buyer,stage:'contact and discovery',operators:['Carmen','Bea']});
  assert.equal(result.percent,40);assert.equal(result.override,true);assert.equal(result.overrideReason,buyer.override_reason);assert.equal(result.reason,'budget below the villas they want');
  const overridden = pipeline.find(p=>p.person_id==='B022');
  assert.equal(overridden.stage_override,'contact and discovery');
  assert.equal(rules.overrideAttribution(overridden.stage_override_reason,{operators:['Carmen','Bea']}).operator,'Carmen');
});


test('new settings support private artifacts and unit area schema stays compatible', () => {
  for (const name of ['live-settings.csv','training-settings.csv']) {
    const settings = Object.fromEntries(csv(read('assets/' + name)).map(r=>[r.setting,r.value]));
    assert.ok(Object.hasOwn(settings,'report_artifact'));
    assert.equal(settings.report_artifact,'');
    assert.ok(Object.hasOwn(settings,'dashboard_link'));
    assert.equal(settings.dashboard_link,'');
  }
  const keys = csv(read('assets/schema.csv')).filter(r=>r.tab==='Units').map(r=>r.key);
  for (const key of ['size','size_unit','square_footage','size_m2','size_ft2']) assert.ok(keys.includes(key));
  assert.match(csv(read('assets/schema.csv')).find(r=>r.tab==='Units'&&r.key==='status').description,/investor held/);
  const seed = csv(read('assets/seed/units.csv'));
  for (const row of seed) {
    assert.equal(Number(row.size_m2),Number(row.size));
    assert.equal(Number(row.size_ft2),Math.round(Number(row.size_m2)*10.7639));
  }
  for (const dir of ['../../../../training/seed/','../desk-report/training/seed/']) {
    assert.equal(read(dir+'units.csv'),read('assets/seed/units.csv'));
  }
});
