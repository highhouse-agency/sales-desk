// Sales desk metric module.
//
// This file is the only place metric rules live. build.js imports it to compute
// report-data.json, and every published page embeds this same source so browser
// filters recompute through identical code. It has no imports and no runtime
// dependencies; it must run unchanged in Node and in a browser.
//
// Money is integer USD cents. Dates are local YYYY-MM-DD strings in the
// reporting time zone. Results carry codes, never display copy; lib/format.js
// turns results into display strings.

export const METRIC_VERSION = '1.1.0';
export const MODEL_SCHEMA = 'sales-desk-model-v1';

export const STAGES = ['lead', 'contact and discovery', 'presentation', 'tour', 'unit selection', 'reservation', 'under contract', 'closed'];
// Side outcomes sit outside the buying order. Each needs a reason, and a buyer can be reopened from any of them.
export const SIDE_OUTCOMES = ['on hold', 'long-term nurture', 'lost'];
export const DISPLAY_STAGES = [...STAGES, ...SIDE_OUTCOMES, 'unknown'];
// Stage names used before OCN's stages (Oct 2026). Interactions is add-only, so old rows keep these; read them as the new names.
export const LEGACY_STAGES = { inquiry: 'lead', qualified: 'contact and discovery', 'reservation deposit': 'reservation', 'promesa signed': 'under contract' };
const stageName = (v) => { const s = String(v ?? '').trim(); return LEGACY_STAGES[s] || v; };
export const UNIT_STATUSES = ['available', 'held', 'investor held', 'reserved', 'promesa signed', 'sold'];
export const SECURED_STATUSES = ['reserved', 'promesa signed', 'sold'];
export const INTEREST_EVENTS = ['unit_interest', 'inquiry', 'tour_completed', 'hold_accepted'];
export const EVENT_KINDS = ['inquiry', 'unit_interest', 'tour_booked', 'tour_completed', 'hold_requested', 'hold_accepted',
  'hold_released', 'deposit_paid', 'promesa_signed', 'closed', 'lost', 'referral_claim', 'question', 'note',
  'presentation_sent', 'unit_selected', 'on_hold', 'nurture', 'owner_set', 'task_opened', 'task_reassigned', 'task_done', 'task_cancelled'];
// Record-keeping decision rows: who owns a buyer and the history of each task. The model keeps them,
// but they never count as buyer, unit, or partner activity, never move a stage or next step, and add no interest.
export const RECORD_KEEPING_EVENTS = ['owner_set', 'task_opened', 'task_reassigned', 'task_done', 'task_cancelled'];
// People lead_temperature values. Blank or anything else counts as not set.
export const LEAD_TEMPERATURES = ['hot', 'warm', 'cold', 'not a fit'];
// Report groups come only from the existing confirmed intended use.
export function intendedUseSegment(value) {
  const use = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/\bown\s*-\s*use\b/g, 'own use');
  if (!use) return 'unknown';
  if (use === 'mix' || use === 'a mix') return 'mix';
  const aliases = {
    'own use': 'own use', 'second home': 'own use', 'uso propio': 'own use',
    rental: 'rental', renta: 'rental', alquiler: 'rental',
    investment: 'investment', investor: 'investment', inversion: 'investment',
  };
  const parts = use.split(/\s*(?:[,;/&+\-]|\band\b|\bor\b|\by\b|\bo\b)\s*/).filter(Boolean)
    .map(part => Object.hasOwn(aliases, part) ? aliases[part] : null);
  if (!parts.length || parts.includes(null)) return 'other';
  if (parts.includes('own use')) return parts.some(part => part === 'rental' || part === 'investment') ? 'mix' : 'second home';
  return 'investor';
}
export const LOST_REASONS = ['price', 'timing', 'financing', 'location', 'chose another property', 'unresponsive', 'other'];
export const REFERRAL_CONFLICT = 'referral conflict';
const STAGE_FOR_EVENT = { presentation_sent: 'presentation', tour_completed: 'tour', unit_selected: 'unit selection', deposit_paid: 'reservation', promesa_signed: 'under contract', closed: 'closed' };

// ---------------------------------------------------------------- time

const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const fmtCache = new Map();

export function isTimestamp(v) { return typeof v === 'string' && TS_RE.test(v) && !Number.isNaN(Date.parse(v)); }
export function isDate(v) { return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')); }

export function localDate(iso, tz) {
  if (!isTimestamp(iso)) return null;
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    fmtCache.set(tz, f);
  }
  const parts = {};
  for (const p of f.formatToParts(new Date(Date.parse(iso)))) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dayNum(d) {
  const [y, m, dd] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, dd) / 86400000;
}
export function addDays(d, n) {
  const t = new Date((dayNum(d) + n) * 86400000);
  return t.toISOString().slice(0, 10);
}
export function diffDays(from, to) { return dayNum(to) - dayNum(from); }
function inRange(d, from, to) { return d != null && (!from || d >= from) && (!to || d <= to); }
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function weekday(d) { return new Date(dayNum(d) * 86400000).getUTCDay(); }

function cmpTime(a, b) {
  // Occurrence orders facts: local date first, then time when both rows carry one.
  // Date-only rows tie within their day and fall back to recording time; id is the final stable tie-break.
  const da = a.occurred_date, db = b.occurred_date;
  if (da !== db) { if (!da) return 1; if (!db) return -1; return da < db ? -1 : 1; }
  if (isTimestamp(a.occurred_at) && isTimestamp(b.occurred_at)) {
    const d = Date.parse(a.occurred_at) - Date.parse(b.occurred_at);
    if (d !== 0) return d;
  }
  const ar = a.recorded_at ? Date.parse(a.recorded_at) : Infinity;
  const br = b.recorded_at ? Date.parse(b.recorded_at) : Infinity;
  if (ar !== br) return ar - br;
  return String(a.event_id).localeCompare(String(b.event_id));
}

// ---------------------------------------------------------------- parsing

const blank = (v) => v == null || (typeof v === 'string' && v.trim() === '');
const str = (v) => (blank(v) ? null : String(v).trim());
function category(v, allowed) {
  if (blank(v)) return null;
  const normalized = String(v).trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : 'other';
}
function toCents(v) {
  if (blank(v)) return null;
  const s = String(v).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return undefined;
  const [i, f = ''] = s.split('.');
  const sign = i.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(parseInt(i, 10)) * 100 + parseInt((f + '00').slice(0, 2), 10));
}
function toInt(v) {
  if (blank(v)) return null;
  const s = String(v).trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : undefined;
}
function toNum(v) {
  if (blank(v)) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

export function parseExceptions(raw) {
  // Exact buyer identifier followed by a colon and percentage; entries separated by semicolons. Malformed or conflicting -> unknown.
  if (blank(raw)) return { status: 'none', map: {} };
  const map = {};
  for (const part of String(raw).split(';')) {
    const m = part.trim().match(/^(B\d+):\s*(\d+(?:\.\d+)?)%$/);
    if (!m) return { status: 'unknown', map: {} };
    const rate = Number(m[2]);
    if (m[1] in map && map[m[1]] !== rate) return { status: 'unknown', map: {} };
    map[m[1]] = rate;
  }
  return { status: 'ok', map };
}

// ---------------------------------------------------------------- input allowlist

// Spec 02 snapshot contract. Any field outside these lists is rejected before computing,
// so stray metadata or private prose can never reach a page.
export const SNAPSHOT_FIELDS = ['schema_version', 'snapshot_id', 'captured_at', 'as_of', 'reporting_timezone', 'mode', 'settings', 'tabs', 'properties', 'sources'];
// Preserve confirmed measurements and fill only a missing counterpart, including older sheets.
export function unitAreas(u = {}) {
  const area = value => {
    const cleaned = typeof value === 'string' ? value.trim().replace(/,/g, '') : value;
    const n = typeof cleaned === 'number' ? cleaned : typeof cleaned === 'string' && /^\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  let m2 = area(u.size_m2), ft2 = area(u.size_ft2 ?? u.square_footage);
  const legacy = area(u.size ?? u.Size);
  const label = String(u.size_unit ?? u['Size unit'] ?? '').toLowerCase().trim();
  if (m2 == null && ft2 == null && legacy != null) {
    if (['m2', 'm²', 'sqm', 'sq m', 'square meters', 'square metres'].includes(label)) m2 = legacy;
    if (['sq ft', 'ft2', 'ft²', 'sqft', 'square feet'].includes(label)) ft2 = legacy;
  }
  if (m2 == null && ft2 != null) m2 = Math.round(ft2 / 10.7639);
  if (ft2 == null && m2 != null) ft2 = Math.round(m2 * 10.7639);
  return { size_m2: m2, size_ft2: ft2 };
}

export const TAB_FIELDS = {
  Interactions: ['interaction_id', 'timestamp', 'logged_at', 'channel', 'record_type', 'corrects_interaction_id', 'person_id', 'partner_id',
    'partner_role', 'unit_id', 'unit_type', 'property_id', 'event', 'duplicate_person_id', 'survivor_person_id', 'logged_by', 'source_key',
    'stage', 'next_step_due', 'unit_status', 'deposit_date', 'campaign_id', 'ad_id', 'utm_source', 'utm_medium', 'utm_campaign',
    'utm_content', 'utm_term', 'summary', 'next_step', 'lost_reason'],
  // owner and lead_temperature are optional per row: older sheets lack them, and missing or empty means not set.
  People: ['person_id', 'name', 'source', 'first_channel', 'first_touch_date', 'referring_partner_id', 'home_city', 'home_country', 'owner', 'lead_temperature', 'intended_use'],
  Partners: ['partner_id', 'name', 'relationship', 'commission_kind', 'commission_rate', 'commission_exceptions', 'last_partner_touch'],
  Units: ['unit_id', 'type', 'size', 'size_unit', 'list_price', 'currency', 'status', 'holder_person_id', 'deposit_date', 'listed_date', 'property_id', 'size_m2', 'size_ft2', 'square_footage'],
  Campaigns: ['campaign_id', 'campaign_name', 'week_start', 'week_end', 'spend', 'currency', 'platform_lead_count', 'property_id'],
  Pipeline: ['person_id', 'stage', 'last_touch', 'next_step', 'next_step_due', 'days_since_last_touch', 'stage_override'],
  Review: ['review_id', 'interaction_id', 'source_key', 'reason', 'candidate_ids', 'question', 'status', 'resolved_by', 'resolved_at', 'resolution_interaction_id'],
};
export const SETTINGS_FIELDS = ['tracking_started_at', 'week_starts_on', 'weekly_report_day', 'buyer_stale_days', 'partner_active_days', 'partner_quiet_days', 'snapshot_stale_hours', 'morning_run_time', 'fixture'];
export const PROPERTY_FIELDS = ['property_id', 'name', 'sales_launch_date', 'total_units', 'historical_sold_count', 'brand_tokens', 'buildings', 'board_units'];
export const BOARD_FIELDS = ['unit_id', 'building', 'floor', 'display_order', 'tracking_scope'];
export const BUILDING_FIELDS = ['building', 'label'];
export const BRAND_TOKEN_FIELDS = ['page', 'panel', 'rule', 'ink', 'ink_2', 'ink_3', 'accent'];
export const SOURCE_FIELDS = ['source_id', 'kind', 'retrieved_at', 'covered_from', 'covered_through', 'status', 'rows'];
export const SOURCE_ROW_FIELDS = {
  sheet: ['property_id', 'campaign_id', 'week_start', 'week_end', 'covered_through'],
  meta_ads: ['property_id', 'campaign_id', 'week_start', 'week_end', 'impressions', 'link_clicks', 'reach'],
};

function onlyFields(obj, allowed, where) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(`snapshot: ${where} must be an object`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw new Error(`snapshot: unknown field ${where}.${k}`);
}

/** Reject anything outside the contract, and refuse a failed or empty core sheet export. */
export function checkSnapshot(snap) {
  if (!snap || snap.schema_version !== 'sales-desk-snapshot-v1') throw new Error('snapshot: unsupported schema_version');
  onlyFields(snap, SNAPSHOT_FIELDS, 'snapshot');
  for (const f of SNAPSHOT_FIELDS) if (snap[f] == null) throw new Error(`snapshot: missing ${f}`);
  onlyFields(snap.settings, SETTINGS_FIELDS, 'settings');
  onlyFields(snap.tabs, Object.keys(TAB_FIELDS), 'tabs');
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    if (!Array.isArray(snap.tabs[tab])) throw new Error(`snapshot: core sheet export is missing the ${tab} tab`);
    snap.tabs[tab].forEach((row, i) => onlyFields(row, fields, `${tab}[${i}]`));
  }
  if (!snap.tabs.Units.length) throw new Error('snapshot: core sheet export has no Units rows; the run stops instead of publishing empty inventory');
  if (!Array.isArray(snap.properties) || !snap.properties.length) throw new Error('snapshot: no property');
  snap.properties.forEach((p, i) => {
    onlyFields(p, PROPERTY_FIELDS, `properties[${i}]`);
    (p.board_units || []).forEach((b, j) => onlyFields(b, BOARD_FIELDS, `properties[${i}].board_units[${j}]`));
    (p.buildings || []).forEach((b, j) => onlyFields(b, BUILDING_FIELDS, `properties[${i}].buildings[${j}]`));
    if (p.brand_tokens) {
      onlyFields(p.brand_tokens, BRAND_TOKEN_FIELDS, `properties[${i}].brand_tokens`);
      for (const [k, v] of Object.entries(p.brand_tokens)) if (!/^#[0-9A-Fa-f]{6}$/.test(String(v))) throw new Error(`snapshot: brand token ${k} must be a hex color`);
    }
  });
  if (!Array.isArray(snap.sources)) throw new Error('snapshot: sources must be a list');
  snap.sources.forEach((src, i) => {
    onlyFields(src, SOURCE_FIELDS, `sources[${i}]`);
    const rowFields = SOURCE_ROW_FIELDS[src.kind];
    if (!rowFields) throw new Error(`snapshot: unknown source kind ${src.kind}`);
    (src.rows || []).forEach((r, j) => onlyFields(r, rowFields, `sources[${i}].rows[${j}]`));
  });
  const sheet = snap.sources.find((x) => x.kind === 'sheet');
  if (!sheet || sheet.status !== 'ok') throw new Error('snapshot: the core sheet export failed or is missing; the run stops and the last published pages stay in place');
}

// ---------------------------------------------------------------- model

const STRUCTURED_FIELDS = ['timestamp', 'channel', 'person_id', 'partner_id', 'partner_role', 'unit_id', 'unit_type', 'property_id',
  'event', 'duplicate_person_id', 'survivor_person_id', 'stage', 'next_step', 'next_step_due', 'unit_status', 'deposit_date',
  'campaign_id', 'ad_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'summary', 'lost_reason'];

/**
 * Validate and normalize a sanitized snapshot into the model the metrics read.
 * The model is plain JSON; report-data.json carries it and every page embeds it.
 */
export function buildModel(snap, opts = {}) {
  const diagnostics = [];
  const diag = (level, code, ref, detail = null) => diagnostics.push({ level, code, ref: ref ?? null, detail });
  checkSnapshot(snap);
  if (!isTimestamp(snap.as_of) || !isTimestamp(snap.captured_at)) throw new Error('snapshot: as_of and captured_at need ISO 8601 offsets');
  const tz = snap.reporting_timezone;
  const asOfMs = Date.parse(snap.as_of);
  const asOfDate = localDate(snap.as_of, tz);
  const settings = normalizeSettings(snap.settings, tz, diag);
  const prop = snap.properties.find((p) => p.property_id === opts.propertyId) || snap.properties[0];
  if (!prop) throw new Error('snapshot: no property');
  const pid = prop.property_id;
  const tabs = snap.tabs;
  const local = (iso) => localDate(iso, tz);

  // Campaign coverage from source metadata.
  const sheetSource = (snap.sources || []).find((s) => s.kind === 'sheet') || null;
  const metaSource = (snap.sources || []).find((s) => s.kind === 'meta_ads') || null;
  const coverageRows = new Map();
  for (const r of (sheetSource && sheetSource.rows) || []) {
    if (r.campaign_id && r.week_start) coverageRows.set(`${r.property_id || pid}|${r.campaign_id}|${r.week_start}`, r.covered_through);
  }

  // ---- interactions: validate, isolate invalid rows, dedupe source keys
  const rawRows = (tabs.Interactions || []).map((r) => ({ ...r, stage: stageName(r.stage) }));
  const ordered = rawRows.slice().sort((a, b) => {
    const la = Date.parse(a.logged_at || '') || 0, lb = Date.parse(b.logged_at || '') || 0;
    return la - lb || String(a.interaction_id).localeCompare(String(b.interaction_id));
  });
  const seenKeys = new Set();
  const byId = new Map();
  const corrections = [];
  for (const r of ordered) {
    const id = str(r.interaction_id);
    if (!id) { diag('error', 'invalid_row', null, 'interaction without identifier'); continue; }
    if (byId.has(id)) { diag('warn', 'duplicate_interaction_id', id); continue; }
    const rowProp = str(r.property_id);
    if (rowProp && rowProp !== pid) continue;
    const key = str(r.source_key);
    if (key) {
      if (seenKeys.has(key)) { diag('info', 'duplicate_source_key', id, key); continue; }
      seenKeys.add(key);
    }
    if (!blank(r.timestamp) && !isTimestamp(r.timestamp) && !isDate(String(r.timestamp).trim())) { diag('error', 'invalid_row', id, 'timestamp'); continue; }
    if (!blank(r.logged_at) && !isTimestamp(r.logged_at)) { diag('error', 'invalid_row', id, 'logged_at'); continue; }
    if (isTimestamp(r.timestamp) && Date.parse(r.timestamp) > asOfMs) { diag('error', 'future_touch', id, r.timestamp); continue; }
    if (isDate(String(r.timestamp || '').trim()) && String(r.timestamp).trim() > asOfDate) { diag('error', 'future_touch', id, r.timestamp); continue; }
    if (!blank(r.event) && !EVENT_KINDS.includes(String(r.event).trim())) { diag('error', 'invalid_row', id, 'event'); continue; }
    if (!blank(r.stage) && ![...STAGES, ...SIDE_OUTCOMES].includes(String(r.stage).trim())) { diag('error', 'invalid_row', id, 'stage'); continue; }
    if (!blank(r.unit_status) && ![...UNIT_STATUSES].includes(String(r.unit_status).trim())) { diag('error', 'invalid_row', id, 'unit_status'); continue; }
    if (str(r.record_type) === 'correction') { corrections.push(r); continue; }
    byId.set(id, { ...r, interaction_id: id, _corrected: [] });
  }
  // Corrections replace only nonempty structured fields on the linked original; `clear` removes.
  const correctionRoots = new Map();
  for (const c of corrections) {
    const targetId = str(c.corrects_interaction_id);
    const rootId = correctionRoots.get(targetId) || targetId;
    const target = byId.get(rootId);
    if (!target) { diag('error', 'invalid_correction', str(c.interaction_id), str(c.corrects_interaction_id)); continue; }
    correctionRoots.set(str(c.interaction_id), rootId);
    for (const f of STRUCTURED_FIELDS) {
      const v = str(c[f]);
      if (v == null) continue;
      target[f] = v === 'clear' ? null : v;
      target._corrected.push({ field: f, by: str(c.interaction_id) });
    }
  }
  // Identity links from confirmed decision rows.
  const survivorOf = {};
  for (const r of byId.values()) {
    if (str(r.record_type) === 'decision' && str(r.duplicate_person_id) && str(r.survivor_person_id)) {
      survivorOf[str(r.duplicate_person_id)] = str(r.survivor_person_id);
    }
  }
  const canonical = (id) => {
    let cur = str(id); const seen = new Set();
    while (cur && survivorOf[cur] && !seen.has(cur)) { seen.add(cur); cur = survivorOf[cur]; }
    return cur;
  };

  // ---- events
  const events = [];
  const depositKeys = new Set();
  for (const r of byId.values()) {
    const occurred = str(r.timestamp);
    const timed = isTimestamp(occurred), dated = !timed && isDate(occurred);
    const e = {
      event_id: r.interaction_id,
      occurred_at: timed || dated ? occurred : null,
      occurred_date: timed ? local(occurred) : dated ? occurred : null,
      occurred_precision: timed ? 'time' : dated ? 'date' : null,
      recorded_at: isTimestamp(r.logged_at) ? r.logged_at : null,
      kind: str(r.event) || 'note',
      record_type: str(r.record_type) || 'touch',
      channel: str(r.channel),
      logged_by: str(r.logged_by),
      person_id: canonical(r.person_id),
      original_person_id: str(r.person_id),
      partner_id: str(r.partner_id),
      partner_role: str(r.partner_role),
      unit_id: str(r.unit_id),
      unit_type: str(r.unit_type),
      property_id: str(r.property_id) || null,
      stage: str(r.stage),
      lost_reason: category(r.lost_reason, LOST_REASONS),
      unit_status: str(r.unit_status),
      deposit_date: isDate(str(r.deposit_date)) ? str(r.deposit_date) : null,
      next_step: str(r.next_step),
      next_step_due: str(r.next_step_due) === 'clear' ? 'clear' : (isDate(str(r.next_step_due)) ? str(r.next_step_due) : null),
      campaign_id: str(r.campaign_id),
      ad_id: str(r.ad_id),
      utm_source: str(r.utm_source),
      utm_medium: str(r.utm_medium),
      utm_campaign: str(r.utm_campaign),
      identity_decision: !!(str(r.duplicate_person_id) && str(r.survivor_person_id)),
      duplicate_person_id: str(r.duplicate_person_id),
      survivor_person_id: str(r.survivor_person_id),
      corrected: r._corrected.length > 0,
      corrected_fields: r._corrected.map((c) => c.field),
      corrected_by: [...new Set(r._corrected.map((c) => c.by))],
      evidence_ref: r.interaction_id,
    };
    if (!e.occurred_at) diag('warn', 'unknown_time', e.event_id);
    // Two confirmations of one deposit collapse by canonical person, property, unit, and deposit date.
    if (e.kind === 'deposit_paid' && e.deposit_date) {
      const k = [e.person_id, pid, e.unit_id, e.deposit_date].join('|');
      if (depositKeys.has(k)) { diag('info', 'duplicate_deposit', e.event_id); continue; }
      depositKeys.add(k);
    }
    events.push(e);
  }
  events.sort(cmpTime);

  // ---- units and board
  const board = (prop.board_units || []).slice().sort((a, b) => a.display_order - b.display_order);
  const unitRows = (tabs.Units || []).filter((u) => (str(u.property_id) || pid) === pid);
  const unitById = new Map();
  for (const u of unitRows) {
    const id = str(u.unit_id);
    if (!id) { diag('error', 'invalid_row', null, 'unit without identifier'); continue; }
    const currency = str(u.currency);
    let price = toCents(u.list_price);
    let currencyError = null;
    if (currency && currency !== 'USD') { currencyError = currency; price = null; diag('error', 'unsupported_currency', id, currency); }
    if (price === undefined) { price = null; diag('error', 'invalid_row', id, 'list_price'); }
    const listed = str(u.listed_date) || prop.sales_launch_date || null;
    unitById.set(id, {
      unit_id: id, property_id: pid, tracking_scope: 'tracked',
      type: str(u.type), size: toNum(u.size) ?? null, size_unit: str(u.size_unit),
      ...unitAreas(u),
      list_price_cents: price, currency: currencyError ? currency : 'USD', currency_error: currencyError,
      sheet_status: str(u.status), sheet_holder: canonical(u.holder_person_id), sheet_deposit_date: str(u.deposit_date),
      listed_date: isDate(listed) ? listed : null,
    });
  }
  const units = [];
  const boardIds = new Set();
  for (const b of board) {
    boardIds.add(b.unit_id);
    const base = { unit_id: b.unit_id, property_id: pid, building: String(b.building), floor: b.floor, display_order: b.display_order };
    if (b.tracking_scope === 'tracked') {
      const t = unitById.get(b.unit_id);
      if (!t) { diag('error', 'board_unit_missing', b.unit_id); units.push({ ...base, tracking_scope: 'tracked', missing_row: true }); continue; }
      units.push({ ...t, ...base, tracking_scope: 'tracked' });
    } else {
      units.push({ ...base, tracking_scope: 'sold_before_tracking' });
    }
  }
  let order = board.length;
  for (const t of unitById.values()) {
    if (!boardIds.has(t.unit_id)) { units.push({ ...t, building: null, floor: null, display_order: ++order }); diag('warn', 'location_not_supplied', t.unit_id); }
  }

  // ---- people, partners, pipeline, campaigns, reviews
  const pipeline = new Map((tabs.Pipeline || []).map((p) => [canonical(p.person_id), p]));
  const buyers = [];
  const seenPeople = new Set();
  for (const p of tabs.People || []) {
    const id = canonical(p.person_id);
    if (!id || seenPeople.has(id)) continue; // collapsed duplicates
    seenPeople.add(id);
    const pl = pipeline.get(id) || {};
    buyers.push({
      person_id: id, name: str(p.name), source: str(p.source), first_channel: str(p.first_channel),
      first_touch_date: isDate(str(p.first_touch_date)) ? str(p.first_touch_date) : null,
      referring_partner_id: str(p.referring_partner_id), home_city: str(p.home_city), home_country: str(p.home_country),
      buyer_segment: intendedUseSegment(p.intended_use),
      owner: str(p.owner), lead_temperature: temperatureOf(p.lead_temperature),
      sheet_stage: str(stageName(pl.stage)), stage_override: str(stageName(pl.stage_override)),
      sheet_next_step: str(pl.next_step), sheet_next_step_due: str(pl.next_step_due),
      sheet_last_touch: str(pl.last_touch),
    });
  }
  const partners = (tabs.Partners || []).map((p) => {
    const kind = str(p.commission_kind);
    const rate = toNum(p.commission_rate);
    return {
      partner_id: str(p.partner_id), name: str(p.name),
      commission_kind: kind === 'percent' || kind === 'fixed' ? kind : (kind ? 'unsupported' : null),
      commission_rate: rate === undefined ? null : rate,
      commission_exceptions: str(p.commission_exceptions),
      sheet_last_partner_touch: str(p.last_partner_touch),
    };
  });
  const campaigns = [];
  const campaignKeys = new Set();
  for (const c of tabs.Campaigns || []) {
    if ((str(c.property_id) || pid) !== pid) continue;
    const key = `${pid}|${str(c.campaign_id)}|${str(c.week_start)}`;
    if (campaignKeys.has(key)) { diag('warn', 'duplicate_campaign_week', key); continue; }
    campaignKeys.add(key);
    const currency = str(c.currency);
    const row = {
      campaign_id: str(c.campaign_id), campaign_name: str(c.campaign_name), week_start: str(c.week_start), week_end: str(c.week_end),
      covered_through: coverageRows.get(key) || str(c.week_end),
      spend_cents: toCents(c.spend), currency: currency || null, platform_lead_count: toInt(c.platform_lead_count),
      property_id: pid, currency_error: null,
    };
    if (currency !== 'USD') { row.currency_error = currency || 'missing'; row.spend_cents = null; diag('error', 'unsupported_currency', key, currency || 'missing'); }
    if (row.spend_cents === undefined) { row.spend_cents = null; diag('error', 'invalid_row', key, 'spend'); }
    if (row.platform_lead_count === undefined) { row.platform_lead_count = null; diag('error', 'invalid_row', key, 'platform_lead_count'); }
    campaigns.push(row);
  }
  const reviews = (tabs.Review || []).map((r) => ({
    review_id: str(r.review_id), interaction_id: str(r.interaction_id), reason: str(r.reason),
    candidate_ids: (str(r.candidate_ids) || '').split(';').map((s) => s.trim()).filter(Boolean),
    question: str(r.question), status: str(r.status), resolved_at: str(r.resolved_at), resolved_by: str(r.resolved_by),
    resolution_interaction_id: str(r.resolution_interaction_id),
    person_id: canonical((byId.get(str(r.interaction_id)) || {}).person_id) || null,
  }));
  // A campaign-week is one delivery fact. Exact retries collapse; conflicting
  // repeats stay unavailable until the source is reconciled.
  const deliveryByKey = new Map();
  for (const r of metaSource?.status === 'ok' ? (metaSource.rows || []) : []) {
    if ((r.property_id || pid) !== pid) continue;
    const row = Object.fromEntries(SOURCE_ROW_FIELDS.meta_ads.map(k => [k, r[k] ?? null]));
    for (const k of ['impressions','link_clicks','reach']) {
      const value = toInt(row[k]); row[k] = Number.isInteger(value) && value >= 0 ? value : null;
    }
    const key = `${pid}|${row.campaign_id}|${row.week_start}`;
    if (!row.campaign_id || !row.week_start || !row.week_end) { diag('warn','invalid_delivery_row',key); continue; }
    const prior = deliveryByKey.get(key);
    if (prior) {
      diag('warn','duplicate_delivery_week',key);
      if (JSON.stringify(prior) !== JSON.stringify(row)) {
        prior.impressions = prior.link_clicks = prior.reach = null;
        diag('warn','conflicting_delivery_week',key);
      }
    } else deliveryByKey.set(key,row);
  }
  const delivery = [...deliveryByKey.values()];

  // ---- weeks
  const trackStart = local(settings.tracking_started_at) || prop.sales_launch_date;
  const weeks = [];
  if (trackStart && settings.week_starts_on) {
    const wsIdx = WEEKDAYS.indexOf(settings.week_starts_on);
    let start = addDays(trackStart, -((weekday(trackStart) - wsIdx + 7) % 7));
    let i = 0;
    while (start <= asOfDate) {
      const end = addDays(start, 6);
      weeks.push({ index: i++, start, end, complete: start >= trackStart && end < asOfDate, through: end < asOfDate ? end : addDays(asOfDate, -1) });
      start = addDays(start, 7);
    }
  }

  const campaignThrough = campaigns.reduce((m, c) => (c.covered_through > m ? c.covered_through : m), '');
  const model = {
    schema: MODEL_SCHEMA,
    meta: { snapshot_id: snap.snapshot_id, as_of: snap.as_of, as_of_date: asOfDate, captured_at: snap.captured_at, reporting_timezone: tz, mode: snap.mode, metric_version: METRIC_VERSION },
    scope: {
      property: { property_id: pid, name: prop.name, sales_launch_date: prop.sales_launch_date, total_units: prop.total_units,
        historical_sold_count: prop.historical_sold_count, buildings: (prop.buildings || []).map((b) => ({ building: String(b.building), label: b.label })), brand_tokens: { ...(prop.brand_tokens || {}) } },
      property_count: snap.properties.length,
      settings,
      weeks,
      tracking_start_date: trackStart,
      coverage: {
        sheet: sheetSource ? { covered_from: sheetSource.covered_from, covered_through: sheetSource.covered_through, retrieved_at: sheetSource.retrieved_at, status: sheetSource.status } : null,
        campaigns_through: campaignThrough || null,
        meta_ads: metaSource ? { status: metaSource.status, covered_through: metaSource.covered_through } : { status: 'not_connected' },
      },
    },
    entities: { units, buyers, partners, campaigns },
    events,
    reviews,
    delivery,
    diagnostics,
  };
  // Records-need-a-check comparison runs once here so the model carries it.
  const st = derive(model);
  for (const u of st.unitList) if (u.mismatch) diagnostics.push({ level: 'warn', code: 'records_need_check', ref: u.unit_id, detail: u.mismatch });
  for (const b of st.buyerList) if (b.mismatch) diagnostics.push({ level: 'warn', code: 'records_need_check', ref: b.person_id, detail: b.mismatch });
  return model;
}

function temperatureOf(v) {
  const s = str(v);
  return s && LEAD_TEMPERATURES.includes(s.toLowerCase()) ? s.toLowerCase() : null;
}

function normalizeSettings(s, tz, diag) {
  const out = Object.fromEntries(SETTINGS_FIELDS.map((k) => [k, s[k] ?? null]));
  for (const k of ['buyer_stale_days', 'partner_active_days', 'partner_quiet_days', 'snapshot_stale_hours']) {
    const n = Number(s[k]);
    if (s[k] == null || !Number.isFinite(n) || n <= 0) { out[k] = null; diag('warn', 'setting_not_configured', k); } else out[k] = n;
  }
  if (out.partner_active_days != null && out.partner_quiet_days != null && !(out.partner_active_days < out.partner_quiet_days)) {
    diag('error', 'setting_invalid', 'partner_active_days', 'active must be less than quiet');
    out.partner_active_days = null; out.partner_quiet_days = null;
  }
  if (!WEEKDAYS.includes(s.week_starts_on)) { out.week_starts_on = null; diag('warn', 'setting_not_configured', 'week_starts_on'); }
  if (!isTimestamp(s.tracking_started_at)) { out.tracking_started_at = null; diag('warn', 'setting_not_configured', 'tracking_started_at'); }
  return out;
}

// ---------------------------------------------------------------- derived state

const memo = new WeakMap();

/** Derived per-unit, per-buyer, and per-partner state. Pure function of the model. */
export function derive(model) {
  if (memo.has(model)) return memo.get(model);
  const asOfDate = model.meta.as_of_date;
  const s = model.scope.settings;
  const ev = model.events;
  const byPerson = new Map(), byUnit = new Map(), byPartner = new Map();
  for (const e of ev) {
    if (RECORD_KEEPING_EVENTS.includes(e.kind)) continue;
    if (e.person_id) push(byPerson, e.person_id, e);
    if (e.unit_id) push(byUnit, e.unit_id, e);
    if (e.partner_id) push(byPartner, e.partner_id, e);
  }

  // Units: reconstruct current status from confirmed status events.
  const units = new Map();
  for (const u of model.entities.units) {
    if (u.tracking_scope !== 'tracked') { units.set(u.unit_id, { ...u, status: 'sold_before_tracking', history: [] }); continue; }
    const hist = (byUnit.get(u.unit_id) || []).filter((e) => e.unit_status);
    // A tracked unit with no sheet row and no status history has an unknown status, never available.
    let status = u.missing_row || !u.sheet_status ? 'unknown' : 'available', holder = null, deposit = null, firstSecured = null;
    for (const e of hist) {
      status = e.unit_status;
      holder = ['available', 'investor held'].includes(status) ? null : (e.person_id || holder);
      if (['available', 'investor held'].includes(status)) deposit = null;
      else if (e.deposit_date) deposit = e.deposit_date;
      if (!firstSecured && SECURED_STATUSES.includes(status) && e.occurred_date) firstSecured = { date: e.occurred_date, event_id: e.event_id, status };
    }
    if (!hist.length && u.sheet_status) { status = u.sheet_status; holder = u.sheet_holder; deposit = u.sheet_deposit_date; }
    // A buyer page carries the finalized public inventory state, independent of its filtered timeline.
    if (u.final_status) { status = u.final_status; holder = u.final_holder || null; deposit = u.final_deposit_date || null; firstSecured = null; }
    let mismatch = null;
    if (!u.final_status && u.sheet_status && (u.sheet_status !== status || (u.sheet_holder || null) !== (holder || null))) {
      mismatch = { field: u.sheet_status !== status ? 'status' : 'holder', sheet: u.sheet_status !== status ? u.sheet_status : u.sheet_holder, reconstructed: u.sheet_status !== status ? status : holder };
    }
    const secured = SECURED_STATUSES.includes(status);
    units.set(u.unit_id, {
      ...u, status, holder_person_id: holder, deposit_date: deposit, first_secured: firstSecured,
      undated_secured: secured && !firstSecured, mismatch,
      history: (byUnit.get(u.unit_id) || []).map((e) => e.event_id),
    });
  }

  // Buyers.
  const buyers = new Map();
  for (const b of model.entities.buyers) {
    const evs = byPerson.get(b.person_id) || [];
    let derived = null, furthest = -1, lost = false, lastTouch = null, undatedTouches = 0;
    let nextStep = null, nextDue = null;
    const milestones = { qualified: null, booked: null, tour: null, deposit: null, closed: null };
    const interest = new Set();
    let firstTouch = null;
    for (const e of evs) {
      if (e.stage && e.occurred_at) derived = e.stage;
      if (e.stage === 'lost' || e.kind === 'lost') lost = true;
      const stageFact = e.stage && !SIDE_OUTCOMES.includes(e.stage) ? e.stage : STAGE_FOR_EVENT[e.kind];
      if (stageFact) furthest = Math.max(furthest, STAGES.indexOf(stageFact));
      // Buyer activity counts touch rows only; decision rows (confirmations, identity and referral decisions) never count.
      const isTouch = e.record_type === 'touch';
      if (isTouch) {
        if (e.occurred_at) lastTouch = e; else undatedTouches++;
      }
      if (!firstTouch && e.record_type === 'touch' && e.occurred_at) firstTouch = e;
      if (e.next_step || e.next_step_due) {
        if (e.next_step === 'clear' || e.next_step_due === 'clear') { nextStep = null; nextDue = null; }
        else { nextStep = e.next_step || nextStep; nextDue = e.next_step_due || nextDue; }
      }
      if (e.occurred_date) {
        if (!milestones.qualified && e.stage === 'contact and discovery') milestones.qualified = mark(e);
        if (!milestones.booked && e.kind === 'tour_booked') milestones.booked = mark(e);
        if (!milestones.tour && e.kind === 'tour_completed') milestones.tour = mark(e);
        if (!milestones.deposit && (e.kind === 'deposit_paid' || e.stage === 'reservation')) milestones.deposit = mark(e);
        if (!milestones.closed && (e.kind === 'closed' || e.stage === 'closed')) milestones.closed = mark(e);
      }
      if (e.unit_id && INTEREST_EVENTS.includes(e.kind)) interest.add(e.unit_id);
    }
    // A stage name the desk does not know (an old name, a typo) shows as unknown instead of breaking the report.
    const known = (v) => (v && DISPLAY_STAGES.includes(v) ? v : null);
    const display = known(b.stage_override) || known(derived) || 'unknown';
    const active = !['closed', ...SIDE_OUTCOMES].includes(display);
    const lastDate = lastTouch ? lastTouch.occurred_date : null;
    const age = lastDate ? diffDays(lastDate, asOfDate) : null;
    let mismatch = null;
    // Respect labeled overrides: a sheet stage equal to the override is not a disagreement.
    if (b.sheet_stage && derived && b.sheet_stage !== derived && b.sheet_stage !== b.stage_override) mismatch = { field: 'stage', sheet: b.sheet_stage, reconstructed: derived };
    buyers.set(b.person_id, {
      ...b, derived_stage: derived, display_stage: display, override: !!b.stage_override,
      furthest_stage: furthest >= 0 ? STAGES[furthest] : null, lost, active,
      last_touch: lastTouch ? lastTouch.occurred_at : null, last_touch_date: lastDate, age,
      undated_touches: undatedTouches,
      next_step: nextStep, next_step_due: nextDue,
      milestones, units_of_interest: [...interest].sort(),
      first_touch_event: firstTouch ? firstTouch.event_id : null,
      acquisition: acquisition(firstTouch, model),
      first_source: firstSource(firstTouch, b),
      events: evs.map((e) => e.event_id), mismatch,
    });
  }

  // Partners.
  const partners = new Map();
  for (const p of model.entities.partners) {
    const evs = byPartner.get(p.partner_id) || [];
    let last = null, unknownTime = false, any = false;
    for (const e of evs) {
      if (e.record_type !== 'touch' || e.partner_role !== 'participant') continue;
      any = true;
      if (e.occurred_at) last = e; else unknownTime = true;
    }
    const age = last ? diffDays(last.occurred_date, asOfDate) : null;
    let cls = null;
    if (s.partner_active_days != null && s.partner_quiet_days != null) {
      if (last) cls = age < s.partner_active_days ? 'active' : age < s.partner_quiet_days ? 'warm' : 'quiet';
      else if (unknownTime) cls = 'unknown';
      else cls = 'quiet';
    }
    partners.set(p.partner_id, {
      ...p, last_touch: last ? last.occurred_at : null, last_touch_date: last ? last.occurred_date : null, age,
      activity: cls, no_recorded_touch: !any, exceptions: parseExceptions(p.commission_exceptions),
      fixed_commission_cents: p.commission_kind === 'fixed' && p.commission_rate != null ? Math.round(p.commission_rate * 100) : null,
      touches: evs.map((e) => e.event_id),
    });
  }

  const eventById = new Map(ev.map((e) => [e.event_id, e]));
  const out = {
    units, buyers, partners, eventById, byPerson, byUnit, byPartner,
    unitList: [...units.values()], buyerList: [...buyers.values()], partnerList: [...partners.values()],
    disputes: disputesOf(model, buyers),
  };
  memo.set(model, out);
  return out;
}

function push(m, k, v) { if (!m.has(k)) m.set(k, []); m.get(k).push(v); }
function mark(e) { return { date: e.occurred_date, event_id: e.event_id }; }

function acquisition(first, model) {
  // Earliest effective inbound touch decides the acquisition campaign. Missing, malformed, or conflicting tags stay unknown.
  if (!first || !first.campaign_id) return { campaign_id: null, reason: 'missing' };
  const rows = model.entities.campaigns.filter((c) => c.campaign_id === first.campaign_id);
  if (!rows.length) return { campaign_id: null, reason: 'malformed', raw: first.campaign_id };
  return { campaign_id: first.campaign_id, reason: null };
}

function firstSource(first, b) {
  // Confirmed acquisition source is separate from the first contact channel.
  // Older exports lack source and retain their original attribution fallback.
  if (b.source) return { key: `source:${b.source}`, kind: 'source', value: b.source };
  if (first && first.utm_source) return { key: `utm:${first.utm_source}`, kind: 'utm', value: first.utm_source };
  if (b.first_channel) return { key: `channel:${b.first_channel}`, kind: 'channel', value: b.first_channel };
  return { key: 'unknown', kind: 'unknown', value: null };
}

function disputesOf(model, buyers) {
  // Open referral-conflict review items. Each review is one dispute however many claims it holds.
  const list = [];
  for (const r of model.reviews) {
    if (r.status !== 'open' || r.reason !== REFERRAL_CONFLICT) continue;
    const people = new Set(r.candidate_ids.filter((id) => buyers.has(id)));
    if (r.person_id) people.add(r.person_id);
    list.push({ review_id: r.review_id, person_ids: [...people], partner_ids: r.candidate_ids.filter((id) => /^P/.test(id)) });
  }
  return list;
}

// ---------------------------------------------------------------- results

function R(id, value, o = {}) {
  let status = o.status;
  if (!status) status = value == null ? 'unknown' : value === 0 ? 'zero' : 'ok';
  return {
    metric_id: id, value, display: null, unit: o.unit || 'count', currency: o.currency || null,
    filters: o.filters || {}, period_start: o.ps || null, period_end: o.pe || null, status,
    reason: o.reason || null, unknown_count: o.unknown || 0, excluded_count: o.excluded || 0,
    evidence_refs: o.refs || [], detail: o.detail || null, scope: o.scope || 'tracked units',
  };
}

// ---------------------------------------------------------------- unit metrics

export function unitMatches(u, f = {}) {
  if (f.building && u.building !== f.building) return false;
  if (f.floor && u.floor !== f.floor) return false;
  if (f.type && u.type !== f.type) return false;
  if (f.status && u.status !== f.status) return false;
  if (f.price_min != null && f.price_min !== '' && !(u.list_price_cents != null && u.list_price_cents >= Number(f.price_min))) return false;
  if (f.price_max != null && f.price_max !== '' && !(u.list_price_cents != null && u.list_price_cents <= Number(f.price_max))) return false;
  return true;
}

export function selectUnits(model, f = {}) {
  return derive(model).unitList.filter((u) => u.tracking_scope === 'tracked' && unitMatches(u, f));
}

/** A non-negative whole number from a number or a digits-only string; anything else is null. */
function wholeCount(v) {
  const n = typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : v;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function unitCount(model, f = {}) {
  const st = derive(model);
  const sel = selectUnits(model, f);
  const counts = Object.fromEntries([...UNIT_STATUSES, 'unknown'].map((k) => [k, 0]));
  for (const u of sel) counts[u.status] = (counts[u.status] || 0) + 1;
  let historical = st.unitList.filter((u) => u.tracking_scope === 'sold_before_tracking').length;
  let total = st.unitList.length;
  if (!historical) {
    // No board cell marks an earlier sale (no display file for this property): use the Properties tab's
    // Sold before tracking and Total units. A blank or invalid count is unknown (null), never zero.
    const prop = model.scope.property || {};
    historical = wholeCount(prop.historical_sold_count);
    total = wholeCount(prop.total_units) ?? total + (historical || 0);
  }
  const secured = counts.reserved + counts['promesa signed'] + counts.sold;
  return R('unit_count', { ...counts, secured, tracked: sel.length, sold_before_tracking: historical, development_total: total },
    { filters: f, refs: sel.map((u) => u.unit_id), scope: 'development board', unknown: counts.unknown, status: counts.unknown ? 'incomplete' : 'ok' });
}

function unknownOpts(all, n) {
  const unknown = all.filter((u) => u.status === 'unknown').length;
  return unknown ? { unknown, status: 'incomplete' } : { status: n === 0 ? 'zero' : 'ok' };
}

export function remainingToSecure(model, f = {}) {
  const all = selectUnits(model, f);
  const sel = all.filter((u) => u.status === 'available' || u.status === 'held');
  return R('remaining_to_secure', sel.length, { filters: f, refs: sel.map((u) => u.unit_id), ...unknownOpts(all, sel.length) });
}

export function remainingToClose(model, f = {}) {
  const all = selectUnits(model, f);
  const sel = all.filter((u) => !['sold', 'investor held', 'unknown'].includes(u.status));
  return R('remaining_to_close', sel.length, { filters: f, refs: sel.map((u) => u.unit_id), ...unknownOpts(all, sel.length) });
}

export function inventoryValue(model, f = {}) {
  const all = selectUnits(model, f);
  const sel = all.filter((u) => !['sold', 'investor held', 'unknown'].includes(u.status));
  const r = sumPrices('inventory_value', sel, f);
  const unknown = all.filter((u) => u.status === 'unknown').length;
  if (unknown) { r.status = 'incomplete'; r.unknown_count += unknown; }
  return r;
}

function sumPrices(id, sel, f, extra = {}) {
  let total = 0, missing = 0;
  for (const u of sel) { if (u.list_price_cents == null) missing++; else total += u.list_price_cents; }
  return R(id, total, { unit: 'usd_cents', currency: 'USD', filters: f, refs: sel.map((u) => u.unit_id), unknown: missing,
    status: missing ? 'incomplete' : (total === 0 ? 'zero' : 'ok'), ...extra });
}

export function securedValue(model, f = {}) {
  const sel = selectUnits(model, f);
  const reserved = sel.filter((u) => u.status === 'reserved');
  const promesa = sel.filter((u) => u.status === 'promesa signed');
  const sumOf = (l) => l.reduce((t, u) => t + (u.list_price_cents || 0), 0);
  const missing = [...reserved, ...promesa].filter((u) => u.list_price_cents == null).length;
  const inv = inventoryValue(model, f);
  const combined = sumOf(reserved) + sumOf(promesa);
  const share = inv.status === 'ok' && inv.value > 0 && !missing ? (combined / inv.value) * 100 : null;
  return R('secured_value', combined, {
    unit: 'usd_cents', currency: 'USD', filters: f, unknown: missing, status: missing ? 'incomplete' : combined === 0 ? 'zero' : 'ok',
    refs: [...reserved, ...promesa].map((u) => u.unit_id),
    detail: { reserved_cents: sumOf(reserved), promesa_cents: sumOf(promesa), reserved_units: reserved.map((u) => u.unit_id),
      promesa_units: promesa.map((u) => u.unit_id), inventory_cents: inv.value, inventory_status: inv.status, share_pct: share },
  });
}

export function weeklyAbsorption(model) {
  const st = derive(model);
  const weeks = model.scope.weeks.map((w) => ({ ...w, units: [], count: 0 }));
  const undated = [];
  for (const u of st.unitList) {
    if (u.tracking_scope !== 'tracked' || u.status === 'investor held') continue;
    if (u.first_secured) {
      const w = weeks.find((x) => u.first_secured.date >= x.start && u.first_secured.date <= x.end);
      if (w) { w.units.push({ unit_id: u.unit_id, date: u.first_secured.date, status: u.first_secured.status, event_id: u.first_secured.event_id }); w.count++; }
    } else if (u.undated_secured) undated.push(u.unit_id);
  }
  return R('weekly_absorption', weeks.map((w) => ({ start: w.start, end: w.end, through: w.through, complete: w.complete, count: w.count, units: w.units })), {
    unit: 'units_per_week', unknown: undated.length, excluded: undated.length,
    detail: { undated_secured_units: undated },
    ps: weeks[0] ? weeks[0].start : null, pe: weeks.length ? weeks[weeks.length - 1].through : null,
  });
}

/** Units first secured (the weekly_absorption rule) in the trailing window ending on the as-of local date. */
export function securedRecent(model, days = 30) {
  const st = derive(model);
  const end = model.meta.as_of_date;
  const start = addDays(end, -(days - 1));
  const list = st.unitList.filter((u) => u.tracking_scope === 'tracked' && u.status !== 'investor held' && u.first_secured && inRange(u.first_secured.date, start, end));
  const undated = st.unitList.filter((u) => u.status !== 'investor held' && u.undated_secured).length;
  return R('secured_recent', list.length, { ps: start, pe: end, refs: list.map((u) => u.unit_id), unknown: undated, excluded: undated, detail: { days } });
}

export function fourWeekAbsorption(model) {
  const wk = weeklyAbsorption(model);
  const complete = wk.value.filter((w) => w.complete).slice(-4);
  if (complete.length < 4) return R('four_week_absorption', null, { unit: 'units_per_week', status: 'unknown', reason: 'insufficient_history', detail: { weeks: complete } });
  const sum = complete.reduce((t, w) => t + w.count, 0);
  return R('four_week_absorption', sum / 4, {
    unit: 'units_per_week', ps: complete[0].start, pe: complete[3].end,
    detail: { weeks: complete.map((w) => ({ start: w.start, end: w.end, count: w.count })), total: sum },
    unknown: wk.unknown_count, excluded: wk.excluded_count,
  });
}

export function projectedSellout(model, f = {}) {
  const rem = remainingToSecure(model, f).value;
  const four = fourWeekAbsorption(model);
  const base = { unit: 'weeks', ps: four.period_start, pe: four.period_end, filters: f };
  if (rem === 0) return R('projected_sellout', null, { ...base, status: 'not_applicable', reason: 'all_secured' });
  if (four.value == null) return R('projected_sellout', null, { ...base, status: 'unknown', reason: 'insufficient_history' });
  if (four.value === 0) return R('projected_sellout', null, { ...base, status: 'unknown', reason: 'no_recent_absorption' });
  const counts = four.detail.weeks.map((w) => w.count);
  const hi = Math.max(...counts), lo = Math.min(...counts);
  return R('projected_sellout', {
    central: rem / four.value,
    fast: Math.ceil(rem / hi),
    slow: lo === 0 ? null : Math.ceil(rem / lo),
    slow_unbounded: lo === 0,
    remaining: rem,
    weekly_counts: counts,
  }, base);
}

// ---------------------------------------------------------------- pipeline and attention

export function buyerMatches(b, f = {}, model) {
  if (f.stage && b.display_stage !== f.stage) return false;
  if (f.type) {
    const types = buyerTypes(model, b);
    if (f.type === '__unspecified') { if (types.length) return false; }
    else if (!types.includes(f.type)) return false;
  }
  if (f.partner === 'referred' && !b.referring_partner_id) return false;
  if (f.partner === 'direct' && b.referring_partner_id) return false;
  return true;
}

export function buyerTypes(model, b, period = {}) {
  const st = derive(model);
  const types = new Set();
  for (const id of b.events) {
    const e = st.eventById.get(id);
    if (!e || (period.from || period.to) && !inRange(e.occurred_date, period.from, period.to)) continue;
    if (e.unit_type) types.add(e.unit_type);
    if (e.unit_id && INTEREST_EVENTS.includes(e.kind)) {
      const u = st.units.get(e.unit_id);
      if (u && u.type) types.add(u.type);
    }
  }
  return [...types].sort();
}

export function pipelineCount(model, f = {}) {
  const st = derive(model);
  const counts = Object.fromEntries(DISPLAY_STAGES.map((k) => [k, 0]));
  const members = Object.fromEntries(DISPLAY_STAGES.map((k) => [k, []]));
  let overrides = 0;
  const sel = st.buyerList.filter((b) => buyerMatches(b, f, model));
  for (const b of sel) {
    counts[b.display_stage]++;
    members[b.display_stage].push(b.person_id);
    if (b.override) overrides++;
  }
  const active = sel.filter((b) => b.active).length;
  return R('pipeline_count', counts, { scope: 'canonical buyers', filters: f, unknown: counts.unknown,
    detail: { members, overrides, active, total: sel.length, outcomes: counts.closed + counts.lost } });
}

export function staleBuyers(model, f = {}) {
  const st = derive(model);
  const days = model.scope.settings.buyer_stale_days;
  if (days == null) return R('stale_buyers', null, { status: 'unknown', reason: 'not_configured', scope: 'active buyers' });
  const sel = st.buyerList.filter((b) => b.active && buyerMatches(b, f, model));
  const stale = sel.filter((b) => b.age != null && b.age >= days);
  const undated = sel.filter((b) => b.age == null);
  return R('stale_buyers', stale.length, { scope: 'active buyers', filters: f, unknown: undated.length,
    refs: stale.map((b) => b.person_id), detail: { threshold_days: days, undated: undated.map((b) => b.person_id) } });
}

export function overdueSteps(model, f = {}) {
  const st = derive(model);
  const asOf = model.meta.as_of_date;
  const sel = st.buyerList.filter((b) => b.active && buyerMatches(b, f, model));
  const overdue = sel.filter((b) => b.next_step_due && b.next_step_due !== 'clear' && b.next_step_due < asOf);
  // Partner-only commitments use the same date rule but stay separate and add no buyers.
  const partnerSteps = [];
  for (const p of st.partnerList) {
    let last = null;
    for (const id of p.touches) { const e = st.eventById.get(id); if (!e.person_id && (e.next_step || e.next_step_due)) last = e; }
    if (last && last.next_step !== 'clear' && last.next_step_due && last.next_step_due !== 'clear' && last.next_step_due < asOf) {
      partnerSteps.push({ partner_id: p.partner_id, next_step: last.next_step, due: last.next_step_due, event_id: last.event_id });
    }
  }
  return R('overdue_steps', overdue.length, { scope: 'active buyers', filters: f, refs: overdue.map((b) => b.person_id),
    detail: { partner_commitments: partnerSteps } });
}

/** Active buyers by People lead_temperature. Blank or unrecognized values count as not set. */
export function buyersByTemperature(model, f = {}) {
  const st = derive(model);
  const keys = [...LEAD_TEMPERATURES, 'not set'];
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  const members = Object.fromEntries(keys.map((k) => [k, []]));
  const sel = st.buyerList.filter((b) => b.active && buyerMatches(b, f, model));
  for (const b of sel) { const k = b.lead_temperature || 'not set'; counts[k]++; members[k].push(b.person_id); }
  return R('buyers_by_temperature', counts, { scope: 'active buyers', filters: f, unknown: counts['not set'], detail: { members, total: sel.length } });
}

/** Active buyers by People owner. Buyers with no owner group under __none. */
export function buyersByOwner(model, f = {}) {
  const st = derive(model);
  const counts = {}, members = {};
  const sel = st.buyerList.filter((b) => b.active && buyerMatches(b, f, model));
  for (const b of sel) {
    const k = b.owner || '__none';
    counts[k] = (counts[k] || 0) + 1;
    (members[k] = members[k] || []).push(b.person_id);
  }
  if (!('__none' in counts)) { counts.__none = 0; members.__none = []; }
  return R('buyers_by_owner', counts, { scope: 'active buyers', filters: f, unknown: counts.__none, detail: { members, total: sel.length } });
}

export function openReviews(model, f = {}) {
  const open = model.reviews.filter((r) => r.status === 'open' && (!f.person_id || r.person_id === f.person_id || r.candidate_ids.includes(f.person_id)));
  return R('open_reviews', new Set(open.map((r) => r.review_id)).size, { scope: 'review items', filters: f, refs: open.map((r) => r.review_id) });
}

export function openDisputes(model) {
  const d = derive(model).disputes;
  return R('open_disputes', d.length, { scope: 'review items', refs: d.map((x) => x.review_id) });
}

/** Attention rows: overdue next steps, stale buyers, open reviews, unknown dates, missing attribution. */
export function attentionRows(model, f = {}) {
  const st = derive(model);
  const rows = [];
  const od = overdueSteps(model, f);
  for (const id of od.evidence_refs) { const b = st.buyers.get(id); rows.push({ kind: 'overdue', person_id: id, next_step: b.next_step, due: b.next_step_due }); }
  for (const p of od.detail.partner_commitments) rows.push({ kind: 'partner_overdue', partner_id: p.partner_id, next_step: p.next_step, due: p.due });
  const stale = staleBuyers(model, f);
  if (stale.value != null) {
    for (const id of stale.evidence_refs) { const b = st.buyers.get(id); rows.push({ kind: 'stale', person_id: id, age: b.age, next_step: b.next_step, due: b.next_step_due }); }
    for (const id of stale.detail.undated) rows.push({ kind: 'undated_buyer', person_id: id });
  }
  for (const r of model.reviews.filter((x) => x.status === 'open')) rows.push({ kind: 'review', review_id: r.review_id, reason: r.reason, question: r.question, person_id: r.person_id, candidates: r.candidate_ids });
  for (const e of model.events) if (!e.occurred_at) rows.push({ kind: 'unknown_date', event_id: e.event_id, person_id: e.person_id });
  for (const b of st.buyerList) {
    if (!b.referring_partner_id && !b.acquisition.campaign_id && buyerMatches(b, f, model)) rows.push({ kind: 'missing_attribution', person_id: b.person_id, reason: b.acquisition.reason });
  }
  for (const d of model.diagnostics.filter((x) => x.code === 'records_need_check')) rows.push({ kind: 'records_need_check', ref: d.ref, detail: d.detail });
  return rows;
}

// ---------------------------------------------------------------- changes

export function changes(current, previous) {
  if (!previous) return { status: 'no_baseline', previous_as_of: null, current_as_of: current.meta.as_of, rows: [], counts: null };
  const cur = derive(current), prev = derive(previous);
  // Apply current identity links to both versions.
  const links = {};
  for (const e of current.events) if (e.identity_decision) links[e.duplicate_person_id] = e.survivor_person_id;
  const canon = (id) => { let c = id; const seen = new Set(); while (c && links[c] && !seen.has(c)) { seen.add(c); c = links[c]; } return c; };
  const rows = [];
  const prevBuyers = new Map(prev.buyerList.map((b) => [canon(b.person_id), b]));
  for (const b of cur.buyerList) {
    const p = prevBuyers.get(b.person_id);
    if (!p) { rows.push({ kind: 'new_buyer', person_id: b.person_id }); continue; }
    if (p.display_stage !== b.display_stage) rows.push({ kind: 'stage_changed', person_id: b.person_id, from: p.display_stage, to: b.display_stage });
    if ((p.stage_override || null) !== (b.stage_override || null)) rows.push({ kind: 'override_changed', person_id: b.person_id, from: p.stage_override, to: b.stage_override });
  }
  const curIds = new Set(cur.buyerList.map((b) => b.person_id));
  for (const [id, p] of prevBuyers) {
    if (!curIds.has(id)) rows.push({ kind: 'removed_buyer', person_id: id });
    if (id !== p.person_id) rows.push({ kind: 'identity_resolved', person_id: p.person_id, survivor: id });
  }
  for (const u of cur.unitList) {
    const p = prev.units.get(u.unit_id);
    if (!p || u.tracking_scope !== 'tracked') continue;
    if (p.status !== u.status) rows.push({ kind: 'unit_status_changed', unit_id: u.unit_id, from: p.status, to: u.status });
    else if ((p.holder_person_id || null) !== (u.holder_person_id || null)) rows.push({ kind: 'unit_holder_changed', unit_id: u.unit_id, from: p.holder_person_id, to: u.holder_person_id });
  }
  const prevReviews = new Map(previous.reviews.map((r) => [r.review_id, r]));
  for (const r of current.reviews) {
    const p = prevReviews.get(r.review_id);
    if (!p && r.status === 'open') rows.push({ kind: 'review_opened', review_id: r.review_id });
    else if (p && p.status !== r.status) rows.push({ kind: r.status === 'resolved' ? 'review_resolved' : 'review_reopened', review_id: r.review_id });
  }
  const prevCorrected = new Set(previous.events.filter((e) => e.corrected).map((e) => e.event_id + ':' + e.corrected_by.join(',')));
  for (const e of current.events) {
    if (e.corrected && !prevCorrected.has(e.event_id + ':' + e.corrected_by.join(','))) rows.push({ kind: 'fact_corrected', event_id: e.event_id, fields: e.corrected_fields, person_id: e.person_id, unit_id: e.unit_id });
  }
  const counts = {};
  for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1;
  return { status: 'compared', previous_as_of: previous.meta.as_of, current_as_of: current.meta.as_of, rows, counts };
}

// ---------------------------------------------------------------- campaigns and demand

/** Snap a selection of weeks to stored campaign reporting weeks. */
export function costPeriod(model, f = {}) {
  const weeks = model.scope.weeks;
  const from = f.week_from != null && f.week_from !== '' ? Number(f.week_from) : 0;
  const to = f.week_to != null && f.week_to !== '' ? Number(f.week_to) : weeks.length - 1;
  const sel = weeks.filter((w) => w.index >= from && w.index <= to);
  if (!sel.length) return { weeks: [], start: null, end: null, partial: false };
  const last = sel[sel.length - 1];
  const rows = model.entities.campaigns.filter((c) => c.week_start === last.start);
  const through = rows.reduce((m, c) => (c.covered_through && c.covered_through < m ? c.covered_through : m), last.end);
  return { weeks: sel.map((w) => w.start), start: sel[0].start, end: through, partial: !last.complete, from, to };
}

function campaignRows(model, f) {
  const p = costPeriod(model, f);
  return { period: p, rows: model.entities.campaigns.filter((c) => p.weeks.includes(c.week_start) && (!f.campaign || c.campaign_id === f.campaign)) };
}

export function spend(model, f = {}) {
  if (!model.scope.weeks.length) return R('spend', null, { unit: 'usd_cents', currency: 'USD', status: 'unknown', reason: 'not_configured', scope: 'campaign weeks', filters: f });
  const { period, rows } = campaignRows(model, f);
  const missing = rows.filter((r) => r.spend_cents == null).length;
  const total = rows.reduce((t, r) => t + (r.spend_cents || 0), 0);
  return R('spend', total, { unit: 'usd_cents', currency: 'USD', ps: period.start, pe: period.end, filters: f, scope: 'campaign weeks',
    unknown: missing, status: missing ? 'incomplete' : total === 0 ? 'zero' : 'ok', detail: { rows: rows.length, partial: period.partial } });
}

export function platformLeads(model, f = {}) {
  if (!model.scope.weeks.length) return R('platform_leads', null, { status: 'unknown', reason: 'not_configured', scope: 'platform-reported leads', filters: f, detail: { known_subtotal: null } });
  const { period, rows } = campaignRows(model, f);
  const missing = rows.filter((r) => r.platform_lead_count == null).length;
  const total = rows.reduce((t, r) => t + (r.platform_lead_count || 0), 0);
  return R('platform_leads', missing ? null : total, { ps: period.start, pe: period.end, filters: f, scope: 'platform-reported leads',
    unknown: missing, status: missing ? 'incomplete' : total === 0 ? 'zero' : 'ok', detail: { known_subtotal: total, partial: period.partial } });
}

export function costPerPlatformLead(model, f = {}) {
  const s = spend(model, f), l = platformLeads(model, f);
  const base = { unit: 'usd_cents', currency: 'USD', ps: s.period_start, pe: s.period_end, filters: f, scope: 'campaign weeks' };
  if (s.status === 'incomplete' || l.value == null) return R('cost_per_platform_lead', null, { ...base, status: 'unknown', reason: 'unavailable' });
  if (l.value === 0) return R('cost_per_platform_lead', null, { ...base, status: 'zero', reason: 'no_leads' });
  return R('cost_per_platform_lead', s.value / l.value, base);
}

export function campaignBuyers(model, f = {}) {
  const st = derive(model);
  const by = {};
  const unknown = [];
  for (const b of st.buyerList) {
    const c = b.acquisition.campaign_id;
    if (c) (by[c] = by[c] || []).push(b.person_id); else unknown.push(b.person_id);
  }
  const ids = f.campaign ? by[f.campaign] || [] : Object.values(by).flat();
  return R('campaign_buyers', ids.length, { scope: 'canonical buyers', filters: f, unknown: unknown.length, refs: ids,
    detail: { by_campaign: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])), members: by, unknown } });
}

const MILESTONE = { qualified_buyers: 'qualified', booked_tour_buyers: 'booked', tour_buyers: 'tour', deposit_buyers: 'deposit' };

/**
 * First explicit milestone in the selected period. Campaign scope joins to acquisition campaign.
 * With `attribution: 'campaign'`, only buyers acquired through the selected campaigns count.
 */
export function milestoneBuyers(model, id, f = {}, periodOverride, { attribution = 'any', campaigns = null } = {}) {
  const st = derive(model);
  const p = periodOverride || (f.week_from != null || f.week_to != null ? costPeriod(model, f) : { start: null, end: null });
  const key = MILESTONE[id];
  const list = st.buyerList.filter((b) => {
    const m = b.milestones[key];
    if (!m || !inRange(m.date, p.start, p.end)) return false;
    if (f.campaign && b.acquisition.campaign_id !== f.campaign) return false;
    if (attribution === 'campaign' && (!b.acquisition.campaign_id || (campaigns && !campaigns.includes(b.acquisition.campaign_id)))) return false;
    if (f.source && b.first_source.key !== f.source) return false;
    return true;
  });
  return R(id, list.length, { scope: 'canonical buyers', ps: p.start, pe: p.end, filters: f, refs: list.map((b) => b.person_id) });
}

export function costPerOutcome(model, f = {}) {
  const s = spend(model, f);
  const out = {};
  for (const id of Object.keys(MILESTONE)) {
    const m = milestoneBuyers(model, id, { ...f }, { start: s.period_start, end: s.period_end }, { attribution: 'campaign', campaigns: selectedCampaigns(model, f) });
    let v = null, status = 'ok', reason = null;
    if (s.value == null || s.status === 'incomplete') { status = 'unknown'; reason = 'unavailable'; }
    else if (m.value === 0) { status = 'zero'; reason = id === 'qualified_buyers' ? 'no_qualified' : id === 'tour_buyers' ? 'no_tours' : id === 'booked_tour_buyers' ? 'no_bookings' : 'no_deposits'; }
    else v = s.value / m.value;
    out[id] = { value: v, status, reason, outcomes: m.value, refs: m.evidence_refs };
  }
  return R('cost_per_outcome', out, { unit: 'usd_cents', currency: 'USD', ps: s.period_start, pe: s.period_end, filters: f, scope: 'campaign weeks' });
}

function selectedCampaigns(model, f) {
  return [...new Set(model.entities.campaigns.map((c) => c.campaign_id))].filter((id) => !f.campaign || id === f.campaign);
}

/**
 * Milestones in the selected weeks split by attribution: buyers acquired through the selected
 * campaigns, buyers a partner introduced, and buyers with no known source. Only the first
 * group may sit under campaign cost.
 */
export function outcomeAttribution(model, f = {}) {
  const p = costPeriod(model, f);
  const campaigns = selectedCampaigns(model, f);
  const out = {};
  for (const id of Object.keys(MILESTONE)) {
    const all = milestoneBuyers(model, id, { source: f.source || '' }, { start: p.start, end: p.end });
    const st = derive(model);
    const groups = { campaign: [], other_campaign: [], partner: [], unknown: [] };
    for (const pid of all.evidence_refs) {
      const b = st.buyers.get(pid);
      if (b.acquisition.campaign_id) (campaigns.includes(b.acquisition.campaign_id) ? groups.campaign : groups.other_campaign).push(pid);
      else if (b.referring_partner_id) groups.partner.push(pid);
      else groups.unknown.push(pid);
    }
    out[id] = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
    out[id].members = groups;
  }
  return R('outcome_attribution', out, { scope: 'canonical buyers by attribution', ps: p.start, pe: p.end, filters: f });
}

/** One row per campaign for the selected cost periods. */
export function campaignTable(model, f = {}) {
  const ids = [...new Set(model.entities.campaigns.map((c) => c.campaign_id))].filter((id) => !f.campaign || id === f.campaign);
  return ids.map((id) => {
    const cf = { ...f, campaign: id };
    const name = (model.entities.campaigns.find((c) => c.campaign_id === id) || {}).campaign_name;
    return {
      campaign_id: id, campaign_name: name,
      spend: spend(model, cf), platform_leads: platformLeads(model, cf), cost_per_platform_lead: costPerPlatformLead(model, cf),
      campaign_buyers: campaignBuyers(model, cf),
      cost_per_outcome: costPerOutcome(model, cf),
    };
  });
}

export function deliveryMetrics(model, f = {}) {
  const p = costPeriod(model, f);
  const rows = model.delivery.filter((r) => p.weeks.includes(r.week_start) && (!f.campaign || r.campaign_id === f.campaign));
  const connected = model.scope.coverage.meta_ads && model.scope.coverage.meta_ads.status === 'ok';
  if (!connected) {
    const na = { status: 'unknown', reason: 'no_delivery_source', ps: p.start, pe: p.end, filters: f, scope: 'campaign weeks' };
    return { impressions: R('impressions', null, na), ctr: R('ctr', null, { ...na, unit: 'percent' }), reach: R('reach', null, na) };
  }
  const expected = model.entities.campaigns.filter(r => p.weeks.includes(r.week_start) && (!f.campaign || r.campaign_id === f.campaign));
  const missingRows = !rows.length || expected.some(c => !rows.some(r => r.campaign_id === c.campaign_id && r.week_start === c.week_start && r.week_end >= c.covered_through));
  const missImp = rows.filter((r) => r.impressions == null).length + (missingRows ? 1 : 0);
  const missClk = rows.filter((r) => r.link_clicks == null).length + (missingRows ? 1 : 0);
  const imp = rows.reduce((t, r) => t + (r.impressions || 0), 0);
  const clk = rows.reduce((t, r) => t + (r.link_clicks || 0), 0);
  const impressions = R('impressions', missImp ? null : imp, { status: missImp ? 'incomplete' : imp === 0 ? 'zero' : 'ok', ps: p.start, pe: p.end, filters: f });
  let ctr;
  if (missImp || missClk) ctr = R('ctr', null, { unit: 'percent', status: 'unknown', reason: 'unavailable' });
  else if (imp === 0) ctr = R('ctr', null, { unit: 'percent', status: 'zero', reason: 'no_impressions' });
  else ctr = R('ctr', (clk / imp) * 100, { unit: 'percent', ps: p.start, pe: p.end, filters: f });
  const multiWeek = p.weeks.length > 1;
  const reach = R('reach', multiWeek || missingRows ? null : rows.map((r) => ({ campaign_id: r.campaign_id, week_start: r.week_start, reach: r.reach ?? null })),
    { status: multiWeek ? 'not_applicable' : missingRows ? 'incomplete' : 'ok', reason: multiWeek ? 'reach_not_combinable' : missingRows ? 'unavailable' : null, ps: p.start, pe: p.end, filters: f });
  return { impressions, ctr, reach };
}

export function sourceLeads(model, f = {}) {
  const st = derive(model);
  const p = f.week_from != null || f.week_to != null ? costPeriod(model, f) : { start: null, end: null };
  // Buyer-only chart uses exact dates of the selected weeks, not the campaign covered-through date.
  const weeks = model.scope.weeks.filter((w) => p.weeks ? p.weeks.includes(w.start) : true);
  const start = weeks[0] ? weeks[0].start : null, end = weeks.length ? weeks[weeks.length - 1].end : null;
  const by = {}, unknown = [];
  const series = {};
  for (const b of st.buyerList) {
    if (f.campaign && b.acquisition.campaign_id !== f.campaign) continue;
    if (f.source && b.first_source.key !== f.source) continue;
    if (!b.first_touch_date || b.first_source.kind === 'unknown') { unknown.push(b.person_id); continue; }
    if (!inRange(b.first_touch_date, start, end)) continue;
    (by[b.first_source.key] = by[b.first_source.key] || []).push(b.person_id);
    const w = weeks.find((x) => b.first_touch_date >= x.start && b.first_touch_date <= x.end);
    if (w) { series[b.first_source.key] = series[b.first_source.key] || {}; series[b.first_source.key][w.start] = (series[b.first_source.key][w.start] || 0) + 1; }
  }
  const total = Object.values(by).reduce((t, l) => t + l.length, 0);
  return R('source_leads', Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])), {
    scope: 'canonical buyers', ps: start, pe: end, filters: f, unknown: unknown.length,
    detail: { total, members: by, unknown, weeks: weeks.map((w) => w.start), series },
  });
}

export function buyerOrigin(model, f = {}) {
  const sl = sourceLeads(model, f);
  const st = derive(model);
  const ids = Object.values(sl.detail.members).flat();
  const by = {};
  let notRecorded = 0;
  for (const id of ids) {
    const b = st.buyers.get(id);
    const country = b.home_country || null, city = b.home_city || null;
    if (!country || !city) notRecorded++;
    const ck = country || '__not_recorded';
    by[ck] = by[ck] || { total: 0, cities: {} };
    by[ck].total++;
    const cityKey = city || '__not_recorded';
    by[ck].cities[cityKey] = (by[ck].cities[cityKey] || 0) + 1;
  }
  return R('buyer_origin', by, { scope: 'first-touch cohort', ps: sl.period_start, pe: sl.period_end, filters: f, unknown: notRecorded, detail: { cohort: ids.length } });
}

// ---------------------------------------------------------------- unit interest

function periodOf(f) { return { from: f.date_from || null, to: f.date_to || null }; }

export function unitEventCounts(model, kind, f = {}) {
  const st = derive(model);
  const p = periodOf(f);
  const per = {};
  for (const e of model.events) {
    if (e.kind !== kind || !e.unit_id || !e.person_id) continue;
    if ((p.from || p.to) && !inRange(e.occurred_date, p.from, p.to)) continue;
    const u = st.units.get(e.unit_id);
    if (!u || u.tracking_scope !== 'tracked' || !unitMatches(u, f)) continue;
    (per[e.unit_id] = per[e.unit_id] || new Set()).add(e.person_id);
  }
  const out = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.size]));
  const pairs = Object.values(out).reduce((t, n) => t + n, 0);
  return { per_unit: out, pairs, members: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, [...v].sort()])) };
}

export function unitInquiries(model, f = {}) { const c = unitEventCounts(model, 'inquiry', f); return R('unit_inquiries', c.pairs, { unit: 'buyer_unit_pairs', ps: f.date_from, pe: f.date_to, filters: f, detail: c }); }
export function unitTours(model, f = {}) { const c = unitEventCounts(model, 'tour_completed', f); return R('unit_tours', c.pairs, { unit: 'buyer_unit_pairs', ps: f.date_from, pe: f.date_to, filters: f, detail: c }); }
export function unitHolds(model, f = {}) { const c = unitEventCounts(model, 'hold_accepted', f); return R('unit_holds', c.pairs, { unit: 'buyer_unit_pairs', ps: f.date_from, pe: f.date_to, filters: f, detail: c }); }

export function daysOnMarket(model, f = {}) {
  const asOf = model.meta.as_of_date;
  const per = {};
  let missing = 0;
  for (const u of selectUnits(model, f)) {
    if (['sold', 'investor held'].includes(u.status)) { per[u.unit_id] = { status: 'not_on_market', days: null }; continue; }
    if (!u.listed_date) { per[u.unit_id] = { status: 'not_recorded', days: null }; missing++; continue; }
    per[u.unit_id] = { status: 'ok', days: diffDays(u.listed_date, asOf) };
  }
  return R('days_on_market', per, { unit: 'days', filters: f, unknown: missing });
}

export function typeDemand(model, f = {}) {
  const st = derive(model);
  const p = periodOf(f);
  const by = {}, unspecified = [];
  for (const b of st.buyerList) {
    const types = buyerTypes(model, b, p);
    const hasActivity = b.events.some((id) => { const e = st.eventById.get(id); return !(p.from || p.to) || inRange(e.occurred_date, p.from, p.to); });
    if (!types.length) { if (hasActivity) unspecified.push(b.person_id); continue; }
    for (const t of types) (by[t] = by[t] || []).push(b.person_id);
  }
  return R('type_demand', Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])), {
    scope: 'canonical buyers per type', ps: p.from, pe: p.to, filters: f, unknown: unspecified.length, detail: { members: by, unspecified },
  });
}

export function typeSupply(model, f = {}) {
  const by = {};
  for (const u of derive(model).unitList) {
    if (u.tracking_scope !== 'tracked' || !u.type) continue;
    if (!(u.type in by)) by[u.type] = 0;
    if (u.status === 'available' || u.status === 'held') by[u.type]++;
  }
  return R('type_supply', by, { scope: 'tracked units available or held', filters: f });
}

export function demandPerSupply(model, f = {}) {
  const d = typeDemand(model, f).value, s = typeSupply(model, f).value;
  const st = derive(model);
  const out = {};
  for (const t of new Set([...Object.keys(d), ...Object.keys(s)])) {
    const dem = d[t] || 0, sup = s[t] || 0;
    const prices = st.unitList.filter((u) => u.type === t && u.list_price_cents != null).map((u) => u.list_price_cents);
    out[t] = { demand: dem, supply: sup, ratio: sup === 0 ? null : dem / sup, status: sup === 0 ? 'no_supply' : 'ok',
      price_min_cents: prices.length ? Math.min(...prices) : null, price_max_cents: prices.length ? Math.max(...prices) : null };
  }
  return R('demand_per_supply', out, { unit: 'ratio', ps: f.date_from, pe: f.date_to, filters: f, scope: 'unit types' });
}

// ---------------------------------------------------------------- partners

export function partnerActivity(model, f = {}) {
  const st = derive(model);
  const s = model.scope.settings;
  if (s.partner_active_days == null || s.partner_quiet_days == null) return R('partner_activity', null, { status: 'unknown', reason: 'not_configured', scope: 'partners' });
  const counts = { active: 0, warm: 0, quiet: 0, unknown: 0 };
  const members = { active: [], warm: [], quiet: [], unknown: [] };
  let noTouch = 0;
  for (const p of st.partnerList) {
    counts[p.activity]++; members[p.activity].push(p.partner_id);
    if (p.no_recorded_touch) noTouch++;
  }
  return R('partner_activity', counts, { scope: 'partners', unknown: counts.unknown, filters: f,
    detail: { members, no_recorded_touch: noTouch, active_days: s.partner_active_days, quiet_days: s.partner_quiet_days, total: st.partnerList.length } });
}

function disputedPeople(model) { return new Set(derive(model).disputes.flatMap((d) => d.person_ids)); }

export function acceptedReferrals(model, f = {}) {
  const st = derive(model);
  const disputed = disputedPeople(model);
  const by = {};
  for (const b of st.buyerList) {
    if (!b.referring_partner_id) continue;
    if ((f.cohort_from || f.cohort_to) && !inRange(b.first_touch_date, f.cohort_from, f.cohort_to)) continue;
    (by[b.referring_partner_id] = by[b.referring_partner_id] || []).push({ person_id: b.person_id, disputed: disputed.has(b.person_id) });
  }
  const total = Object.values(by).reduce((t, l) => t + l.length, 0);
  return R('accepted_referrals', total, { scope: 'canonical buyers with accepted partner', ps: f.cohort_from, pe: f.cohort_to, filters: f,
    detail: { by_partner: by, count_by_partner: Object.fromEntries(model.entities.partners.map((p) => [p.partner_id, (by[p.partner_id] || []).length])), disputed: Object.values(by).flat().filter((x) => x.disputed).length } });
}

export function partnerFurthestStage(model, f = {}) {
  const st = derive(model);
  const ar = acceptedReferrals(model, f).detail.by_partner;
  const out = {};
  for (const p of st.partnerList) {
    const list = (ar[p.partner_id] || []).map((x) => st.buyers.get(x.person_id));
    let best = -1, current = null;
    for (const b of list) {
      const i = STAGES.indexOf(b.furthest_stage);
      if (i > best) { best = i; current = b.display_stage; }
    }
    out[p.partner_id] = { furthest: best >= 0 ? STAGES[best] : null, current_of_that_buyer: current };
  }
  return R('furthest_stage', out, { scope: 'accepted referral cohorts', filters: f });
}

export function partnerConversion(model, f = {}) {
  const st = derive(model);
  const ar = acceptedReferrals(model, f).detail.by_partner;
  const out = {};
  for (const p of st.partnerList) {
    const list = ar[p.partner_id] || [];
    if (!list.length) { out[p.partner_id] = { value: null, status: 'zero', reason: 'no_referrals', referrals: 0, closings: 0, disputed: 0 }; continue; }
    const closings = list.filter((x) => st.buyers.get(x.person_id).milestones.closed).length;
    out[p.partner_id] = { value: (closings / list.length) * 100, status: 'ok', referrals: list.length, closings, disputed: list.filter((x) => x.disputed).length };
  }
  return R('partner_conversion', out, { unit: 'percent', scope: 'accepted referral cohorts', ps: f.cohort_from, pe: f.cohort_to, filters: f });
}

export function commissionExposure(model) {
  const st = derive(model);
  const disputed = disputedPeople(model);
  const rows = [];
  for (const u of st.unitList) {
    if (u.tracking_scope !== 'tracked' || !['reserved', 'promesa signed'].includes(u.status) || !u.holder_person_id) continue;
    const b = st.buyers.get(u.holder_person_id);
    const partnerId = b && b.referring_partner_id;
    if (!partnerId) { rows.push({ unit_id: u.unit_id, person_id: u.holder_person_id, partner_id: null, group: 'no_partner', cents: null }); continue; }
    if (disputed.has(u.holder_person_id)) { rows.push({ unit_id: u.unit_id, person_id: u.holder_person_id, partner_id: partnerId, group: 'disputed', cents: null }); continue; }
    const p = st.partners.get(partnerId);
    let rate = null, kind = p ? p.commission_kind : null, group = 'estimate', basis = null;
    if (!p || !kind) group = 'not_recorded';
    else if (kind === 'unsupported') group = 'unknown_terms';
    else if (p.exceptions.status === 'unknown') group = 'unknown_terms';
    else if (kind === 'percent') {
      rate = p.exceptions.map[u.holder_person_id] ?? p.commission_rate;
      basis = p.exceptions.map[u.holder_person_id] != null ? 'exception' : 'general';
      if (rate == null) group = 'not_recorded';
    } else if (kind === 'fixed') {
      if (p.exceptions.map[u.holder_person_id] != null) { rate = p.exceptions.map[u.holder_person_id]; kind = 'percent'; basis = 'exception'; }
      else { basis = 'fixed'; if (p.commission_rate == null) group = 'not_recorded'; }
    }
    let cents = null;
    if (group === 'estimate') {
      if (kind === 'percent') { if (u.list_price_cents == null) group = 'unknown_terms'; else cents = (u.list_price_cents * rate) / 100; }
      else cents = Math.round(p.commission_rate * 100);
    }
    rows.push({ unit_id: u.unit_id, person_id: u.holder_person_id, partner_id: partnerId, group, kind, rate, basis, cents, status: u.status, list_price_cents: u.list_price_cents });
  }
  const total = rows.filter((r) => r.group === 'estimate').reduce((t, r) => t + r.cents, 0);
  const unknown = rows.filter((r) => r.group === 'unknown_terms' || r.group === 'not_recorded').length;
  return R('commission_exposure', total, { unit: 'usd_cents', currency: 'USD', scope: 'reserved and promesa units', unknown,
    excluded: rows.filter((r) => r.group === 'disputed').length, refs: rows.map((r) => r.unit_id), detail: { rows } });
}

// ---------------------------------------------------------------- buyer brief

export function buyerMetrics(model, personId, f = {}) {
  const st = derive(model);
  const b = st.buyers.get(personId);
  if (!b) return null;
  const p = periodOf(f);
  const evs = b.events.map((id) => st.eventById.get(id)).filter((e) => !(p.from || p.to) || inRange(e.occurred_date, p.from, p.to));
  const per = (kind) => new Set(evs.filter((e) => e.kind === kind && e.unit_id).map((e) => e.unit_id));
  const units = new Set(evs.filter((e) => e.unit_id && INTEREST_EVENTS.includes(e.kind)).map((e) => e.unit_id));
  const scope = 'this buyer';
  return {
    current_stage: R('current_stage', b.display_stage, { unit: 'stage', scope, detail: { override: b.override, derived: b.derived_stage } }),
    furthest_stage: R('furthest_stage', b.furthest_stage, { unit: 'stage', scope, detail: { lost: b.lost } }),
    buyer_last_touch: R('buyer_last_touch', b.last_touch, { unit: 'timestamp', scope, unknown: b.undated_touches }),
    buyer_age: R('buyer_age', b.age, { unit: 'days', scope }),
    buyer_units_of_interest: R('buyer_units_of_interest', units.size, { scope, ps: p.from, pe: p.to, filters: f, refs: [...units].sort() }),
    unit_inquiries: R('unit_inquiries', per('inquiry').size, { unit: 'buyer_unit_pairs', scope, ps: p.from, pe: p.to, refs: [...per('inquiry')] }),
    unit_tours: R('unit_tours', per('tour_completed').size, { unit: 'buyer_unit_pairs', scope, ps: p.from, pe: p.to, refs: [...per('tour_completed')] }),
    unit_holds: R('unit_holds', per('hold_accepted').size, { unit: 'buyer_unit_pairs', scope, ps: p.from, pe: p.to, refs: [...per('hold_accepted')] }),
    open_reviews: openReviews(model, { person_id: personId }),
  };
}

// ---------------------------------------------------------------- custom: spend against closings by partner

export function closingsByPartner(model, f = {}) {
  const st = derive(model);
  const p = costPeriod(model, f);
  const disputed = disputedPeople(model);
  const groups = { accepted: {}, missing: [], disputed: [] };
  for (const b of st.buyerList) {
    const c = b.milestones.closed;
    if (!c || !inRange(c.date, p.start, p.end)) continue;
    if (disputed.has(b.person_id)) groups.disputed.push(b.person_id);
    else if (!b.referring_partner_id) groups.missing.push(b.person_id);
    else (groups.accepted[b.referring_partner_id] = groups.accepted[b.referring_partner_id] || []).push(b.person_id);
  }
  const accepted = Object.values(groups.accepted).reduce((t, l) => t + l.length, 0);
  return R('closings_by_partner', { accepted, missing: groups.missing.length, disputed: groups.disputed.length, by_partner: Object.fromEntries(Object.entries(groups.accepted).map(([k, v]) => [k, v.length])) },
    { scope: 'confirmed closings', ps: p.start, pe: p.end, filters: f, status: accepted + groups.missing.length + groups.disputed.length === 0 ? 'zero' : 'ok', reason: accepted + groups.missing.length + groups.disputed.length === 0 ? 'no_closings' : null, detail: groups });
}

// Revenue operations reports use first-contact cohorts and confirmed milestones.
function sourceOf(b) {
  if (b.referring_partner_id) return { kind: 'partner', key: b.referring_partner_id };
  if (b.acquisition.campaign_id) return { kind: 'campaign', key: b.acquisition.campaign_id };
  return { kind: 'channel', key: b.first_source.key };
}
function conversionRows(buyers) {
  const tours = buyers.filter(b => b.milestones.tour);
  const reservations = buyers.filter(b => b.milestones.deposit);
  const converted = tours.filter(b => b.milestones.deposit && b.milestones.deposit.date >= b.milestones.tour.date);
  const durations = buyers.map(b => {
    const end = [b.milestones.deposit?.date, b.contract_date].filter(Boolean).sort()[0];
    return end && b.first_touch_date && end >= b.first_touch_date ? diffDays(b.first_touch_date, end) : null;
  }).filter(x => x != null).sort((a,b) => a-b);
  const mid = Math.floor(durations.length / 2);
  return { buyers: buyers.length, active: buyers.filter(b => b.active).length,
    tours: tours.length, reservations: reservations.length, closed: buyers.filter(b => b.milestones.closed).length,
    lead_to_tour: buyers.length ? tours.length / buyers.length * 100 : null,
    tour_to_reservation: tours.length ? converted.length / tours.length * 100 : null,
    velocity: durations.length ? (durations.length % 2 ? durations[mid] : (durations[mid-1] + durations[mid]) / 2) : null };
}
export function revenueInsights(model, reportId, f = {}) {
  const asOf = model.meta.as_of_date;
  const period = f.revenue_period || 'all';
  const dateFrom = period === '30' ? addDays(asOf, -29) : period === '90' ? addDays(asOf, -89) : period === 'year' ? asOf.slice(0,4) + '-01-01' : f.date_from;
  const dateTo = period !== 'all' ? asOf : f.date_to;
  const st = derive(model);
  const buyers = st.buyerList.filter(b => (!(dateFrom || dateTo) || inRange(b.first_touch_date, dateFrom, dateTo)) && (!f.buyer_segment || b.buyer_segment === f.buyer_segment)).map(b => ({ ...b,
    contract_date: model.events.find(e => e.person_id === b.person_id && e.occurred_date && (e.kind === 'promesa_signed' || e.stage === 'under contract'))?.occurred_date }));
  const groups = new Map();
  const disputed = disputedPeople(model);
  for (const b of buyers) {
    if (reportId === 'closed-lost' && !['lost', 'on hold'].includes(b.display_stage)) continue;
    let group;
    if (reportId === 'source-to-sale') group = sourceOf(b);
    else if (reportId === 'buyer-segments') group = { kind: 'segment', key: b.buyer_segment || 'unknown' };
    else {
      const evs = model.events.filter(e => e.person_id === b.person_id && e.occurred_date);
      const drop = [...evs].reverse().find(e => ['lost', 'on hold'].includes(e.stage) || ['lost', 'on_hold'].includes(e.kind));
      let reached = -1;
      for (const e of evs) {
        if (e === drop) break;
        const stage = STAGE_FOR_EVENT[e.kind] || e.stage;
        reached = Math.max(reached, STAGES.indexOf(stage));
      }
      group = { kind: 'reason', key: drop?.lost_reason || 'unknown' };
      b.drop_stage = reached >= 0 ? STAGES[reached] : 'unknown';
    }
    const id = group.kind + ':' + group.key;
    if (!groups.has(id)) groups.set(id, { ...group, members: [] });
    groups.get(id).members.push(b);
  }
  const rows = [...groups.values()].map(g => {
    const stages = {}, sources = new Map();
    for (const b of g.members) {
      if (b.drop_stage) stages[b.drop_stage] = (stages[b.drop_stage] || 0) + 1;
      const src = sourceOf(b), id = src.kind + ':' + src.key;
      if (!sources.has(id)) sources.set(id, { ...src, count: 0 });
      sources.get(id).count++;
    }
    return { kind: g.kind, key: g.key, ...conversionRows(g.members), stages,
      sources: [...sources.values()].sort((a,b) => b.count-a.count || a.key.localeCompare(b.key)).slice(0,3),
      credit: g.members.filter(b => b.milestones.closed).map(b => ({ person_id: b.person_id, ...sourceOf(b), disputed: disputed.has(b.person_id) })) };
  }).sort((a,b) => b.buyers-a.buyers || a.key.localeCompare(b.key));
  const members = [...groups.values()].flatMap(g => g.members);
  return R('revenue_insights', { rows, ...conversionRows(members), lost: members.filter(b => b.display_stage === 'lost').length, on_hold: members.filter(b => b.display_stage === 'on hold').length, top_reason: rows[0]?.key || null }, { unit: 'rows', filters: f, scope: 'first-contact cohort', ps: dateFrom, pe: dateTo });
}

// ---------------------------------------------------------------- report-level computation (the one path)

/** Default filter state per report. */
export function defaultFilters(model, reportId) {
  const weeks = model.scope.weeks;
  const last = weeks.length - 1;
  const lastComplete = [...weeks].reverse().find((w) => w.complete);
  switch (reportId) {
    case 'source-to-sale':
    case 'closed-lost':
    case 'buyer-segments': return { revenue_period: 'all', buyer_segment: '' };
    case 'sales-pulse': return { building: '', floor: '', type: '', status: '', p_type: '', p_stage: '', selected_only: false };
    case 'demand-and-ads': return { week_from: 0, week_to: last, campaign: '', source: '' };
    case 'partner-network': return { activity: '', disputed: '', cohort_from: '', cohort_to: '', furthest: '', sort: 'last_touch', q: '' };
    case 'unit-interest': return { date_from: '', date_to: '', building: '', floor: '', type: '', status: '', price_min: '', price_max: '', sort: 'unit' };
    case 'owner-brief': return { week: lastComplete ? lastComplete.index : last };
    case 'buyer-brief': return { period: 'all' };
    case 'custom.spend-vs-closings': return { week_from: 0, week_to: last };
    default: return {};
  }
}

function unitFilter(f) { return { building: f.building || '', floor: f.floor || '', type: f.type || '', status: f.status || '' }; }

/**
 * Compute every metric a report shows for a filter state. build.js calls this with
 * the default state; the browser calls it again whenever a filter changes.
 */
export function computeReport(model, reportId, f = defaultFilters(model, reportId), opts = {}) {
  const m = {};
  switch (reportId) {
    case 'source-to-sale':
    case 'closed-lost':
    case 'buyer-segments': return { revenue_insights: revenueInsights(model, reportId, f) };
    case 'sales-pulse': {
      const uf = unitFilter(f);
      const bf = { type: f.p_type || '', stage: f.p_stage || '' };
      m.unit_count = unitCount(model, uf);
      m.remaining_to_secure = remainingToSecure(model, uf);
      m.remaining_to_close = remainingToClose(model, uf);
      m.inventory_value = inventoryValue(model, uf);
      m.secured_value = securedValue(model, uf);
      m.dev_remaining_to_secure = { ...remainingToSecure(model, {}), metric_id: 'remaining_to_secure', scope: 'whole development' };
      m.weekly_absorption = weeklyAbsorption(model);
      m.secured_recent = securedRecent(model);
      m.four_week_absorption = fourWeekAbsorption(model);
      m.projected_sellout = projectedSellout(model, {});
      m.pipeline_count = pipelineCount(model, bf);
      m.stale_buyers = staleBuyers(model, bf);
      m.overdue_steps = overdueSteps(model, bf);
      m.buyers_by_temperature = buyersByTemperature(model, bf);
      m.buyers_by_owner = buyersByOwner(model, bf);
      m.open_reviews = openReviews(model);
      m.changes = opts.changes || null;
      return m;
    }
    case 'owner-brief': {
      const w = model.scope.weeks[Number(f.week)] || model.scope.weeks[model.scope.weeks.length - 1] || null;
      m.remaining_to_secure = remainingToSecure(model, {});
      m.secured_recent = securedRecent(model);
      m.four_week_absorption = fourWeekAbsorption(model);
      m.projected_sellout = projectedSellout(model, {});
      m.secured_value = securedValue(model, {});
      m.inventory_value = inventoryValue(model, {});
      m.tour_buyers = w ? milestoneBuyers(model, 'tour_buyers', {}, { start: w.start, end: w.end < model.meta.as_of_date ? w.end : model.meta.as_of_date })
        : R('tour_buyers', null, { status: 'unknown', reason: 'not_configured', scope: 'canonical buyers' });
      m.unit_count = unitCount(model, {});
      return m;
    }
    case 'demand-and-ads': {
      const cf = { week_from: f.week_from, week_to: f.week_to, campaign: f.campaign || '' };
      const bf = { week_from: f.week_from, week_to: f.week_to, campaign: f.campaign || '', source: f.source || '' };
      m.spend = spend(model, cf);
      m.platform_leads = platformLeads(model, cf);
      m.cost_per_platform_lead = costPerPlatformLead(model, cf);
      m.campaign_buyers = campaignBuyers(model, cf);
      m.qualified_buyers = milestoneBuyers(model, 'qualified_buyers', bf);
      m.booked_tour_buyers = milestoneBuyers(model, 'booked_tour_buyers', bf);
      m.tour_buyers = milestoneBuyers(model, 'tour_buyers', bf);
      m.deposit_buyers = milestoneBuyers(model, 'deposit_buyers', bf);
      m.cost_per_outcome = costPerOutcome(model, cf);
      Object.assign(m, deliveryMetrics(model, cf));
      m.source_leads = sourceLeads(model, bf);
      m.buyer_origin = buyerOrigin(model, bf);
      const p = costPeriod(model, cf);
      const tf = { date_from: p.start, date_to: p.end };
      m.type_demand = typeDemand(model, tf);
      m.type_supply = typeSupply(model, tf);
      m.demand_per_supply = demandPerSupply(model, tf);
      m.campaign_table = R('campaign_table', campaignTable(model, cf), { unit: 'rows', ps: p.start, pe: p.end, filters: cf });
      m.outcome_attribution = outcomeAttribution(model, bf);
      return m;
    }
    case 'partner-network': {
      const pf = { cohort_from: f.cohort_from || '', cohort_to: f.cohort_to || '' };
      m.partner_activity = partnerActivity(model);
      m.accepted_referrals = acceptedReferrals(model, pf);
      m.furthest_stage = partnerFurthestStage(model, pf);
      m.partner_conversion = partnerConversion(model, pf);
      m.commission_exposure = commissionExposure(model);
      m.open_disputes = openDisputes(model);
      return m;
    }
    case 'unit-interest': {
      const uf = { ...unitFilter(f), price_min: f.price_min, price_max: f.price_max, date_from: f.date_from || '', date_to: f.date_to || '' };
      m.remaining_to_secure = remainingToSecure(model, uf);
      m.unit_inquiries = unitInquiries(model, uf);
      m.unit_tours = unitTours(model, uf);
      m.unit_holds = unitHolds(model, uf);
      m.days_on_market = daysOnMarket(model, uf);
      const tf = { date_from: f.date_from || '', date_to: f.date_to || '' };
      m.type_demand = typeDemand(model, tf);
      m.type_supply = typeSupply(model, tf);
      m.demand_per_supply = demandPerSupply(model, tf);
      return m;
    }
    case 'buyer-brief': {
      const asOf = model.meta.as_of_date;
      const bf = f.period === 'visit' ? { date_from: addDays(asOf, -13), date_to: asOf } : {};
      return buyerMetrics(model, opts.personId, bf);
    }
    case 'custom.spend-vs-closings': {
      const cf = { week_from: f.week_from, week_to: f.week_to };
      m.spend = spend(model, cf);
      m.platform_leads = platformLeads(model, cf);
      m.campaign_table = R('campaign_table', campaignTable(model, cf), { unit: 'rows', ps: m.spend.period_start, pe: m.spend.period_end, filters: cf });
      m.closings_by_partner = closingsByPartner(model, cf);
      m.accepted_referrals = acceptedReferrals(model, {});
      m.remaining_to_secure = remainingToSecure(model, {});
      return m;
    }
    default: throw new Error(`unknown report ${reportId}`);
  }
}

// ---------------------------------------------------------------- registry

const D = (id, rule, unit, applicable_filters, unknown_rule, zero_rule) => ({ id, rule, unit, applicable_filters, unknown_rule, zero_rule, version: METRIC_VERSION });
export const REGISTRY = [
  D('revenue_insights', 'First-contact cohort grouped by accepted referral partner, first campaign or confirmed acquisition source (legacy channel fallback); current lost/on-hold buyers by latest dated outcome reason and prior confirmed stage; buyer groups by confirmed People intended use. Tours require completion, reservations require deposit evidence. Conversion uses cohort buyers and toured buyers with a later reservation. Velocity is median nonnegative days to first deposit or contract. Closed credit is accepted partner or acquisition source, flagged by open referral disputes. Top three sources ranked by buyers.', 'rows', ['revenue_period', 'buyer_segment'], 'Missing reason/type stays unknown; zero denominators display a dash; missing velocity shows not recorded. Undated first contacts excluded only when date filtering.', 'Empty cohorts have zero buyers.'),
  D('unit_count', 'Tracked Units rows by current reconstructed status, plus the configured historical cells on the board, or the Properties tab sold-before-tracking count when the board marks none. Historical cells never enter tracked metrics.', 'count', ['building', 'floor', 'type', 'status'], 'Units without a board location are listed as Location not supplied.', 'A status with no units shows zero.'),
  D('remaining_to_secure', 'Tracked units currently available or held.', 'count', ['building', 'floor', 'type', 'status'], 'None.', 'Zero means no buyer inventory remains to secure; investor-held units are unavailable.'),
  D('remaining_to_close', 'Tracked units available, held, reserved or under promesa; investor-held units are unavailable and excluded.', 'count', ['building', 'floor', 'type', 'status'], 'None.', 'Zero means no buyer inventory remains to close.'),
  D('inventory_value', 'Sum of current USD list prices of tracked available, held, reserved and promesa units. Investor-held units are excluded.', 'usd', ['building', 'floor', 'type', 'status'], 'A missing price makes the subtotal incomplete.', 'Zero when nothing remains.'),
  D('secured_value', 'Sum of current USD list prices of reserved and promesa units, with each subtotal, against inventory value.', 'usd', ['building', 'floor', 'type', 'status'], 'A missing price makes the subtotal incomplete; share is computed only against a positive, complete inventory value.', 'Zero when nothing is reserved or under promesa.'),
  D('weekly_absorption', 'Distinct tracked units first reaching reserved, promesa signed, or sold on a confirmed, dated status event in the week. A unit counts once across all weeks. Currently investor-held units are excluded.', 'units per week', [], 'Secured units without a dated event are listed as undated and excluded.', 'Covered weeks without securing count as zero.'),
  D('secured_recent', 'Distinct tracked units first reaching reserved, promesa signed, or sold on a confirmed, dated status event in the 30 days ending on the as-of local date. Same first-securing rule as weekly_absorption.', 'count', [], 'Undated secured units are excluded and counted.', 'Zero when nothing was first secured in the window.'),
  D('four_week_absorption', 'Sum of weekly absorption for the four most recent complete weeks, divided by four.', 'units per week', [], 'Unavailable until four complete weeks exist.', 'Zero weeks count as zero.'),
  D('projected_sellout', 'Remaining to secure divided by four-week absorption; range uses the highest and lowest weekly counts, each rounded up.', 'weeks', [], 'Hidden without four complete weeks.', 'Lowest week zero makes the slow end unbounded; zero absorption hides the estimate.'),
  D('pipeline_count', 'Canonical buyers by latest confirmed stage, or by a labeled stage override when one is set.', 'count', ['type', 'stage'], 'Buyers without a stage form an unknown group.', 'A stage with no buyers shows zero.'),
  D('stale_buyers', 'Active buyers whose last-touch age is at least the stale threshold.', 'count', ['type', 'stage'], 'Undated active buyers form a separate group.', 'Zero when every active buyer is recent.'),
  D('overdue_steps', 'Active buyers with a next step due strictly before the as-of local date.', 'count', ['type', 'stage'], 'A step without a due date is not overdue.', 'Zero when nothing is overdue.'),
  D('buyers_by_temperature', 'Active buyers (any stage except closed, on hold, long-term nurture, and lost) by the People lead temperature: hot, warm, cold, or not a fit.', 'count', ['type', 'stage'], 'A blank or unrecognized temperature counts as not set.', 'A temperature with no active buyers shows zero.'),
  D('buyers_by_owner', 'Active buyers (any stage except closed, on hold, long-term nurture, and lost) by the People owner, one team member name each.', 'count', ['type', 'stage'], 'A blank owner counts as no owner.', 'No owner shows zero when every active buyer has one.'),
  D('open_reviews', 'Distinct Review identifiers with status open.', 'count', [], 'None.', 'Zero when Review is clear.'),
  D('open_disputes', 'Open Review items whose reason is a referral conflict; one item is one dispute.', 'count', [], 'None.', 'Zero when no conflict is open.'),
  D('changes', 'Row-level comparison with the previous successful standing data after applying current identity links to both.', 'rows', [], 'No baseline yields no comparison.', 'Compared with no differences shows zero.'),
  D('spend', 'Sum of unique property, campaign, and week rows in the selected covered weeks, USD.', 'usd', ['week range', 'campaign'], 'A missing value makes the total incomplete.', 'Zero spend shows zero.'),
  D('platform_leads', 'Sum of platform-reported lead counts for the same rows.', 'count', ['week range', 'campaign'], 'Any missing count makes the total unavailable; known subtotal kept.', 'Zero shows zero.'),
  D('cost_per_platform_lead', 'Selected spend divided by platform leads for the same periods and campaigns.', 'usd', ['week range', 'campaign'], 'Unavailable when spend, currency, coverage, or leads are missing.', 'Zero leads shows No leads.'),
  D('campaign_buyers', 'Canonical buyers assigned to the campaign on their earliest effective touch.', 'count', ['campaign'], 'Missing, malformed, or conflicting tags stay Unknown campaign.', 'Zero shows zero.'),
  D('qualified_buyers', 'Canonical buyers whose first explicit contact-and-discovery-stage event falls in the period.', 'count', ['week range', 'campaign', 'source'], 'Undated events are excluded.', 'Zero shows zero.'),
  D('booked_tour_buyers', 'Distinct canonical buyers whose first explicit confirmed tour booking falls in the period. Reschedules and repeated bookings do not add buyers; later cancellation does not erase the booking milestone. This is not a current visit count.', 'count', ['week range', 'campaign', 'source'], 'Undated and missing legacy booking evidence is excluded; visit identity and current status are unavailable in this snapshot.', 'Zero shows zero confirmed booking evidence.'),
  D('tour_buyers', 'Distinct canonical buyers whose first explicit completed-tour event falls in the period. Tour stage, bookings, no-shows and cancellations are not completion evidence.', 'count', ['week range', 'campaign', 'source'], 'Undated events and missing legacy completion evidence are excluded; a zero is not proof that no historical visit happened.', 'Zero shows zero confirmed completion evidence.'),
  D('deposit_buyers', 'Canonical buyers whose first confirmed paid deposit falls in the period.', 'count', ['week range', 'campaign', 'source'], 'Undated events are excluded.', 'Zero shows zero.'),
  D('cost_per_outcome', 'Campaign spend for the selected weeks divided by its discovery, booked-tour, completed-tour, or deposit buyers in exactly those weeks.', 'usd', ['week range', 'campaign'], 'Unavailable when coverage is incomplete.', 'Zero outcomes show No qualified buyers, No completed tours, or No deposits.'),
  D('impressions', 'Sum of verified impressions for disjoint campaign-week delivery rows.', 'count', ['week range', 'campaign'], 'Unknown fields are unavailable.', 'Zero shows No impressions.'),
  D('reach', 'Connector campaign-week reach only; never summed.', 'count', ['week range', 'campaign'], 'Missing shows not recorded.', 'Not combinable across weeks.'),
  D('ctr', 'Link clicks divided by impressions times 100.', 'percent', ['week range', 'campaign'], 'Unknown fields are unavailable.', 'Zero impressions shows No impressions.'),
  D('source_leads', 'Canonical buyers by earliest first-touch date and confirmed People source; older exports fall back to earliest-touch utm_source, then legacy first_channel. First contact channel is separate from acquisition source.', 'count', ['week range', 'campaign', 'source'], 'Missing first dates or sources stay Unknown, outside timed totals.', 'Zero shows zero.'),
  D('buyer_origin', 'Canonical buyers in the selected first-touch cohort by supplied home city and country.', 'count', ['week range', 'campaign', 'source'], 'Missing city or country stays visible as not recorded.', 'Zero shows zero.'),
  D('unit_inquiries', 'Distinct canonical buyers per tracked unit with an explicit unit-linked inquiry in the period.', 'buyer/unit pairs', ['date range', 'building', 'floor', 'type', 'status', 'price'], 'Unlinked inquiries do not add a unit.', 'Zero shows zero.'),
  D('unit_tours', 'Distinct canonical buyers per tracked unit with a completed tour in the period. Bookings do not count.', 'buyer/unit pairs', ['date range', 'building', 'floor', 'type', 'status', 'price'], 'None.', 'Zero shows zero.'),
  D('unit_holds', 'Distinct canonical buyers per tracked unit with an accepted hold in the period. Requests do not count.', 'buyer/unit pairs', ['date range', 'building', 'floor', 'type', 'status', 'price'], 'None.', 'Zero shows zero.'),
  D('buyer_units_of_interest', 'Distinct tracked units linked to this buyer by interest, inquiry, completed tour, or accepted hold.', 'count', ['period'], 'Unspecified units add nothing.', 'Zero shows zero.'),
  D('type_demand', 'Distinct canonical buyers per type with recorded type interest or a unit-linked interest event.', 'count', ['date range'], 'Missing type or unit stays Unspecified.', 'Zero shows zero.'),
  D('type_supply', 'Tracked units of the type currently available or held.', 'count', [], 'None.', 'Zero supply shows No remaining supply.'),
  D('demand_per_supply', 'Type demand divided by type supply.', 'ratio', ['date range'], 'None.', 'Zero supply shows No remaining supply.'),
  D('days_on_market', 'As-of local date minus listed date for each tracked unsold unit.', 'days', ['building', 'floor', 'type', 'status', 'price'], 'Missing listed date shows not recorded.', 'Sold and investor-held units show Not on market.'),
  D('current_stage', 'Latest effective confirmed stage, or the labeled override.', 'stage', [], 'Unknown stage has its own group.', 'Not applicable.'),
  D('furthest_stage', 'Highest explicitly confirmed buying stage ever recorded; lost ignored for ordering; overrides never count.', 'stage', ['cohort'], 'No confirmed stage shows not recorded.', 'Not applicable.'),
  D('buyer_last_touch', 'Latest effective buyer-touch occurrence, excluding corrections and identity decisions.', 'timestamp', [], 'Unknown time yields unknown.', 'Not applicable.'),
  D('buyer_age', 'As-of local date minus last-touch local date in calendar days.', 'days', [], 'Unknown time yields unknown age.', 'Zero means touched today.'),
  D('partner_activity', 'Age of the latest participant touch; active, warm, or quiet by the configured thresholds.', 'count', [], 'A known touch with unknown date is Activity unknown.', 'No recorded touch counts as quiet.'),
  D('accepted_referrals', 'Canonical buyers whose accepted referring partner is this partner, optionally in a first-touch cohort.', 'count', ['cohort'], 'Open claims add nothing.', 'Zero shows zero.'),
  D('partner_conversion', 'Confirmed closings in the accepted referral cohort divided by its referrals, times 100.', 'percent', ['cohort'], 'Overrides to closed are not closings.', 'Zero referrals shows No referrals.'),
  D('commission_exposure', 'For reserved and promesa units with a named holder, the accepted partner terms against current list price, or a fixed amount per unit.', 'usd', [], 'Malformed or conflicting exceptions, blank, or unsupported terms are unknown.', 'Zero when no unit qualifies.'),
];
