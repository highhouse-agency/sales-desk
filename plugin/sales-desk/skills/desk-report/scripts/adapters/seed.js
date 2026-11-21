// Training adapter: the seven seed CSVs plus the training world's board map ->
// a sanitized snapshot in the same shape the Google Sheets export produces.
// Node only. It never writes to the seed.
//
//   node adapters/seed.js [--out snapshot.json]

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sanitizer from '../lib/sanitize.cjs';
import { TAB_FIELDS, unitAreas } from '../lib/metrics.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SEED_DIR = resolve(HERE, '../../training/seed');
export const DEFAULT_WORLD = resolve(HERE, '../../training/world.md');

// Spec 02 allowlist per tab, shared with the model's input check.
export const ALLOWED = TAB_FIELDS;
const FILES = { Interactions: 'interactions.csv', People: 'people.csv', Partners: 'partners.csv', Units: 'units.csv', Campaigns: 'campaigns.csv', Pipeline: 'pipeline.csv', Review: 'review.csv' };
const FREE_TEXT = { Interactions: ['summary', 'next_step'], Partners: ['relationship', 'commission_exceptions'], Pipeline: ['next_step'], Review: ['question'] };

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Sanitization shares the publication guard's detector (lib/privacy.js).
export function sanitizeText(v) { return sanitizer.sanitizeFreeText(v); }
export function opaqueKey(key) {
  if (!key) return null;
  return 'sk_' + createHash('sha256').update(String(key)).digest('hex').slice(0, 16);
}

/** Parse the board map and building labels from the world's property section. */
export function parseWorldProperty(worldText) {
  const section = worldText.split(/\n## /).find((s) => s.startsWith('Property')) || '';
  const board = [];
  let order = 0;
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*(\d[A-Z])\s*\|\s*(\d+)\s*\|\s*(ground|first|second)\s*\|\s*([^|]+?)\s*\|.*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    board.push({ unit_id: m[1], building: m[2], floor: m[3], display_order: ++order, tracking_scope: /^sold before tracking/.test(m[5]) ? 'sold_before_tracking' : 'tracked' });
  }
  const buildings = [];
  const first = section.match(/Building (\d) faces the ([^,.;]+)/);
  if (first) buildings.push({ building: first[1], label: first[2].trim() });
  for (const m of section.matchAll(/building (\d) the ([^,.;]+)/g)) buildings.push({ building: m[1], label: m[2].replace(/^and /, '').trim() });
  const launch = (section.match(/default `listed_date` for all twenty tracked units is (\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  const name = (section.match(/^(Patio Niebla) is a 50-unit/m) || [])[1] || 'Patio Niebla';
  return { board, buildings, launch, name };
}

export const TRAINING_CLOCK = {
  // Training manifest: training today is Friday, October 2, 2026; the seed ends October 1 at 23:59:59
  // America/Mexico_City. The training run is the 08:00 morning run on October 2.
  as_of: '2026-10-02T08:00:00-06:00',
  captured_at: '2026-10-02T08:00:00-06:00',
  reporting_timezone: 'America/Mexico_City',
};

export const TRAINING_SETTINGS = {
  // Seven-day stale threshold and 08:00 run come from the training world. The partner thresholds,
  // week start, report day, and stale-snapshot hours are fixture choices, not live policy.
  tracking_started_at: '2026-08-24T00:00:00-06:00',
  week_starts_on: 'monday',
  weekly_report_day: 'friday',
  buyer_stale_days: 7,
  partner_active_days: 14,
  partner_quiet_days: 30,
  snapshot_stale_hours: 36,
  morning_run_time: '08:00',
  fixture: true,
};

export function seedSnapshot({ seedDir = DEFAULT_SEED_DIR, worldPath = DEFAULT_WORLD, clock = TRAINING_CLOCK, settings = TRAINING_SETTINGS } = {}) {
  const tabs = {};
  for (const [tab, file] of Object.entries(FILES)) {
    const rows = parseCsv(readFileSync(resolve(seedDir, file), 'utf8'));
    tabs[tab] = rows.map((r) => {
      const out = {};
      // Optional keys a CSV lacks (People source, owner, lead_temperature, intended_use and Interactions lost_reason on older seeds) pass through as null: not set.
      for (const k of ALLOWED[tab]) {
        let v = r[k];
        if (v === undefined || v === '') { out[k] = null; continue; }
        if ((FREE_TEXT[tab] || []).includes(k)) v = sanitizeText(v);
        if (k === 'source_key') v = opaqueKey(v);
        out[k] = v;
      }
      if (tab === 'Units') Object.assign(out, unitAreas(r));
      return out;
    });
  }
  const world = parseWorldProperty(readFileSync(worldPath, 'utf8'));
  const pid = (tabs.Units[0] && tabs.Units[0].property_id) || 'PN';
  const weeks = tabs.Campaigns.map((c) => ({ property_id: c.property_id || pid, campaign_id: c.campaign_id, week_start: c.week_start, week_end: c.week_end, covered_through: c.week_end }));
  return {
    schema_version: 'sales-desk-snapshot-v1',
    snapshot_id: 'training-seed-2026-10-02',
    captured_at: clock.captured_at,
    as_of: clock.as_of,
    reporting_timezone: clock.reporting_timezone,
    mode: 'training',
    settings: { ...settings },
    tabs,
    properties: [{
      property_id: pid, name: world.name, sales_launch_date: world.launch, total_units: 50, historical_sold_count: 30,
      brand_tokens: {}, buildings: world.buildings, board_units: world.board,
    }],
    sources: [{
      source_id: 'sheet', kind: 'sheet', retrieved_at: clock.captured_at, covered_from: '2026-08-24', covered_through: '2026-10-01', status: 'ok', rows: weeks,
    }],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const snap = seedSnapshot();
  const json = JSON.stringify(snap, null, 2);
  if (i > 0) writeFileSync(process.argv[i + 1], json); else process.stdout.write(json);
}
