#!/usr/bin/env node
// Rebuild the desk sheet's three formula columns from the Schema tab.
//
// The formulas read Interactions by column position, so they must be regenerated after
// anyone adds, moves, or deletes a column on Interactions, Pipeline, or Partners, or
// renames a formula column's header. This script turns the current layout into the
// exact formula text and the cell each one goes in. It changes nothing by itself.
//
//   node formulas.mjs --layout layout.json      # the sheet as it is now
//   node formulas.mjs --default                 # the layout in assets/schema.csv
//   node formulas.mjs --default --json          # machine-readable output
//
// layout.json:
//   {
//     "schema":  [ { "tab": "Interactions", "key": "timestamp", "header": "When" }, ... ],
//     "headers": { "Interactions": ["ID", "When", ...], "Pipeline": [...], "Partners": [...],
//                  "Units": [...], "Properties": [...] },
//     "positions": { "Pipeline.last_touch": "C" }      // optional overrides, by column letter
//   }
// "headers" is row 1 of each tab as the sheet shows it, left to right, blanks included.
//
// Exit codes: 0 formulas printed, 1 the layout has problems (listed), 2 bad input.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function defaultLayout() {
  const schema = parseCsv(readFileSync(join(HERE, '..', 'assets', 'schema.csv'), 'utf8'));
  const headers = {};
  for (const r of schema) (headers[r.tab] ||= []).push(r.header);
  return { schema, headers, positions: {} };
}

let layout;
try {
  if (flag('default')) layout = defaultLayout();
  else if (opt('layout')) layout = JSON.parse(readFileSync(opt('layout'), 'utf8'));
  else { console.error('Usage: node formulas.mjs --layout layout.json | --default [--json]'); process.exit(2); }
} catch (e) { console.error(`Could not read the layout: ${e.message}`); process.exit(2); }

const problems = [];
const letter = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const fromLetter = (s) => [...s.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const schemaHeader = (tab, key) => (layout.schema || []).find((r) => r.tab === tab && r.key === key)?.header;

// 1-based column position of a key on a tab, resolved through Schema and row 1.
function pos(tab, key, { formula = false } = {}) {
  const override = layout.positions?.[`${tab}.${key}`];
  if (override) return fromLetter(override);
  const header = schemaHeader(tab, key);
  const row = layout.headers?.[tab];
  if (!row) { problems.push(`Row 1 of ${tab} was not supplied.`); return 0; }
  if (header === undefined) { problems.push(`Schema has no row for ${tab} ${key}.`); return 0; }
  const hits = row.map((h, i) => (String(h).trim() === header.trim() ? i + 1 : 0)).filter(Boolean);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) { problems.push(`${tab} has ${hits.length} columns headed "${header}". Headers must be unique.`); return 0; }
  // A formula column still shows its old header until the formula is rebuilt.
  if (formula) {
    const byKey = row.map((h, i) => (String(h).trim() === key ? i + 1 : 0)).filter(Boolean);
    if (byKey.length === 1) return byKey[0];
  }
  problems.push(`${tab} has no column headed "${header}" (Schema key ${key}).${formula ? ` Say which column holds ${key}.` : ''}`);
  return 0;
}

const lastCol = (tab) => {
  const row = layout.headers?.[tab] || [];
  let n = row.length; while (n > 0 && String(row[n - 1]).trim() === '') n--;
  return n;
};
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const colRange = (tab, key, here) => {
  const L = letter(pos(tab, key));
  return here === tab ? `${L}2:${L}` : `${tab}!${L}2:${L}`;
};

// Interactions positions every formula needs.
const I = {
  id: pos('Interactions', 'interaction_id'), ts: pos('Interactions', 'timestamp'), lg: pos('Interactions', 'logged_at'),
  rt: pos('Interactions', 'record_type'), cor: pos('Interactions', 'corrects_interaction_id'),
  per: pos('Interactions', 'person_id'), pa: pos('Interactions', 'partner_id'), role: pos('Interactions', 'partner_role'),
};
const iLast = Math.max(lastCol('Interactions'), ...Object.values(I));
const iRows = `Interactions!A2:${letter(iLast)}`;
const iIdCol = colRange('Interactions', 'interaction_id');

const pLast = pos('Pipeline', 'last_touch', { formula: true });
const pDays = pos('Pipeline', 'days_since_last_touch', { formula: true });
const ptLast = pos('Partners', 'last_partner_touch', { formula: true });
const pPerson = colRange('Pipeline', 'person_id', 'Pipeline');
const ptId = colRange('Partners', 'partner_id', 'Partners');

const H = {
  last: schemaHeader('Pipeline', 'last_touch') ?? 'last_touch',
  days: schemaHeader('Pipeline', 'days_since_last_touch') ?? 'days_since_last_touch',
  partner: schemaHeader('Partners', 'last_partner_touch') ?? 'last_partner_touch',
};

const shared = (extra) => `  d, FILTER(${iRows}, ${iIdCol} <> ""),
  id, CHOOSECOLS(d, ${I.id}), ts, CHOOSECOLS(d, ${I.ts}), lg, CHOOSECOLS(d, ${I.lg}),
  rt, CHOOSECOLS(d, ${I.rt}), cor, CHOOSECOLS(d, ${I.cor}), ${extra},
  fix, LAMBDA(col, MAP(id, col, LAMBDA(i, v,
    IFERROR(INDEX(SORT(FILTER(HSTACK(lg, col), cor = i, col <> ""), 1, FALSE), 1, 2), v)))),`;
const tail = `  utc, LAMBDA(t, DATEVALUE(LEFT(t, 10)) + TIMEVALUE(MID(t, 12, 8))
    - IF(MID(t, 20, 1) = "Z", 0, IF(MID(t, 20, 1) = "-", -1, 1) * (VALUE(MID(t, 21, 2)) / 24 + VALUE(MID(t, 24, 2)) / 1440))),
  known, (effT <> "") * (effT <> "clear"),
  latest, LAMBDA(mask, IF(SUM(mask) = 0, "",
    IF(SUM(mask * known) = 0, "unknown", LET(
      t, FILTER(effT, mask * known), l, FILTER(lg, mask * known),
      INDEX(SORT(HSTACK(
        MAP(t, LAMBDA(x, DATEVALUE(LEFT(x, 10)))),
        MAP(t, l, LAMBDA(x, y, IF(LEN(x) = 10, utc(y), utc(x)))),
        t), 1, FALSE, 2, FALSE), 1, 3))))),`;

const lastTouch = `=ARRAYFORMULA(VSTACK(${q(H.last)}, IFERROR(LET(
${shared(`per, CHOOSECOLS(d, ${I.per})`)}
  effT, fix(ts), effP, fix(per),
${tail}
  MAP(FILTER(${pPerson}, ${pPerson} <> ""), LAMBDA(p, latest((rt = "touch") * (effP = p))))
), "")))`;

const pLastRange = `${letter(pLast)}2:${letter(pLast)}`;
const daysSince = `=ARRAYFORMULA(VSTACK(${q(H.days)}, IFERROR(
  MAP(FILTER(${pLastRange}, ${pPerson} <> ""), LAMBDA(t,
    IF(t = "", "", IF(t = "unknown", "unknown", TODAY() - DATEVALUE(LEFT(t, 10)))))), "")))`;

const partnerTouch = `=ARRAYFORMULA(VSTACK(${q(H.partner)}, IFERROR(LET(
${shared(`pa, CHOOSECOLS(d, ${I.pa}), role, CHOOSECOLS(d, ${I.role})`)}
  effT, fix(ts), effPa, fix(pa), effRole, fix(role),
${tail}
  MAP(FILTER(${ptId}, ${ptId} <> ""), LAMBDA(p,
    latest((rt = "touch") * (effPa = p) * (effRole = "participant"))))
), "")))`;

// Range-based dropdowns that follow other columns.
const dropdowns = [];
if (layout.headers?.Units) dropdowns.push({ cells: `Interactions ${schemaHeader('Interactions', 'unit_type') ?? 'unit_type'} column`, source: `Units!${letter(pos('Units', 'type'))}2:${letter(pos('Units', 'type'))}` });
if (layout.headers?.Properties) dropdowns.push({ cells: 'every property_id column (Interactions, Units, Campaigns)', source: `Properties!${letter(pos('Properties', 'property_id'))}2:${letter(pos('Properties', 'property_id'))}` });

if (problems.length) {
  if (flag('json')) console.log(JSON.stringify({ ok: false, problems: [...new Set(problems)] }, null, 1));
  else { console.log('The layout has problems. Nothing to paste yet:'); for (const p of new Set(problems)) console.log(`- ${p}`); }
  process.exit(1);
}

const out = {
  ok: true,
  formulas: [
    { tab: 'Pipeline', key: 'last_touch', cell: `Pipeline!${letter(pLast)}1`, clear: `Pipeline!${letter(pLast)}2:${letter(pLast)}`, formula: lastTouch },
    { tab: 'Pipeline', key: 'days_since_last_touch', cell: `Pipeline!${letter(pDays)}1`, clear: `Pipeline!${letter(pDays)}2:${letter(pDays)}`, formula: daysSince },
    { tab: 'Partners', key: 'last_partner_touch', cell: `Partners!${letter(ptLast)}1`, clear: `Partners!${letter(ptLast)}2:${letter(ptLast)}`, formula: partnerTouch },
  ],
  dropdowns,
  protect: [`Interactions!A2:${letter(iLast)}`, `Pipeline!${letter(pLast)}:${letter(pLast)}`, `Pipeline!${letter(pDays)}:${letter(pDays)}`, `Partners!${letter(ptLast)}:${letter(ptLast)}`],
};

if (flag('json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const f of out.formulas) {
  console.log(`## ${f.cell} (${f.key}). Clear ${f.clear} first.\n\n${f.formula}\n`);
}
for (const d of out.dropdowns) console.log(`Dropdown check: ${d.cells} should list values from ${d.source}.`);
console.log(`Warning-only protection: ${out.protect.join(', ')}.`);
