// Display formatting. Turns metric results and data values into display strings
// using lib/strings.js. No arithmetic beyond rounding for display lives here.

import { S, t } from './strings.js';

export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function unitArea(u) {
  const number = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
  const parts = [];
  if (u.size_m2 != null) parts.push(`${number(u.size_m2)} m²`);
  if (u.size_ft2 != null) parts.push(`${number(u.size_ft2)} ft²`);
  return parts.join(' · ') || S.reasons.not_recorded;
}

export function count(n) { return n == null ? S.reasons.unknown : group(Math.round(n)); }

/** USD from integer cents. Whole dollars unless the amount has cents or `precise` is set. */
export function usd(cents, { precise = false, compact = false } = {}) {
  if (cents == null) return S.reasons.unknown;
  const neg = cents < 0; const c = Math.abs(cents);
  if (compact && c >= 100000000) return `${neg ? '-' : ''}$${(c / 100000000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (compact && c >= 100000) return `${neg ? '-' : ''}$${(c / 100000).toFixed(1).replace(/\.0$/, '')}K`;
  const rounded = Math.round(c);
  const dollars = Math.floor(rounded / 100), rest = rounded % 100;
  const showCents = precise || rest !== 0;
  return `${neg ? '-' : ''}$${group(dollars)}${showCents ? '.' + String(rest).padStart(2, '0') : ''}`;
}

export function pct(v) { return v == null ? S.reasons.unknown : `${v.toFixed(1)}%`; }
export function rate1(v) { return v == null ? S.reasons.unknown : v.toFixed(1); }

export function date(d, { year = false, weekday = false } = {}) {
  if (!d) return S.reasons.not_recorded;
  const [y, m, dd] = d.split('-').map(Number);
  let out = `${S.months[m - 1]} ${dd}`;
  if (year) out += `, ${y}`;
  if (weekday) out = `${S.weekdays[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]}, ${out}`;
  return out;
}

export function range(start, end, opts = {}) {
  if (!start && !end) return '';
  if (start === end) return date(start, opts);
  const sameMonth = start && end && start.slice(0, 7) === end.slice(0, 7);
  const endStr = sameMonth ? String(Number(end.slice(8, 10))) : date(end, opts);
  return t(S.periodRange, { start: date(start, sameMonth ? {} : opts), end: endStr + (sameMonth && opts.year ? `, ${end.slice(0, 4)}` : '') });
}

const dtCache = new Map();
export function datetime(iso, tz, { year = true } = {}) {
  if (!iso) return S.reasons.not_recorded;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return date(iso, { year });
  const key = tz;
  let f = dtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    dtCache.set(key, f);
  }
  const p = {};
  for (const x of f.formatToParts(new Date(Date.parse(iso)))) p[x.type] = x.value;
  return `${date(`${p.year}-${p.month}-${p.day}`, { year })}, ${p.hour}:${p.minute}`;
}

export function tzLabel(tz) { return String(tz || '').replace(/_/g, ' '); }

export const statusLabel = (s) => S.status[s] || s || S.reasons.not_recorded;
export const stageLabel = (s) => S.stage[s] || s || S.stage.unknown;
export const sourceLabel = (k) => S.source[k] || (k && k.startsWith('utm:') ? k.slice(4) : k ? k.replace(/^(?:channel|source):/, '') : S.source.unknown);
export const activityLabel = (a) => S.activity[a] || S.activity.unknown;

export function weeksText(n) { return t(S.units.weeks, { n }); }

/** Display string for a metric result. Unknown, zero, and not-applicable states use their reason copy. */
export function display(r) {
  if (!r) return S.reasons.unknown;
  if (r.reason && S.reasons[r.reason] && (r.value == null || r.status !== 'ok')) return S.reasons[r.reason];
  switch (r.metric_id) {
    case 'four_week_absorption': return r.value == null ? S.reasons.unknown : t(S.units.perWeek, { n: rate1(r.value) });
    case 'projected_sellout': {
      const v = r.value;
      if (!v) return S.reasons.unknown;
      if (v.slow_unbounded) return t(S.units.weeksOrLonger, { n: v.fast });
      if (v.fast === v.slow) return weeksText(v.fast);
      return t(S.units.weeksRange, { fast: v.fast, slow: v.slow });
    }
    case 'buyer_last_touch': return r.value ? r.value : S.reasons.unknown;
    case 'buyer_age': return r.value == null ? S.reasons.unknown : t(r.value === 1 ? S.units.day : S.units.days, { n: r.value });
    case 'current_stage': case 'furthest_stage': return stageLabel(r.value);
    default: break;
  }
  if (r.unit === 'usd_cents') return typeof r.value === 'number' ? usd(r.value, { precise: !Number.isInteger(r.value / 100) }) : S.reasons.unknown;
  if (r.unit === 'percent') return typeof r.value === 'number' ? pct(r.value) : S.reasons.unknown;
  if (typeof r.value === 'number') return count(r.value);
  if (r.value == null) return S.reasons.unknown;
  return '';
}

/** Format a sub-value reached by a narrative path such as pipeline_count.tour or secured_value.share_pct. */
export function displayPath(r, path) {
  let v = r.value && typeof r.value === 'object' && path[0] in r.value ? r.value : r.detail || {};
  for (const k of path) v = v == null ? null : v[k];
  const last = path[path.length - 1];
  if (v == null) return S.reasons.unknown;
  if (/_cents$/.test(last)) return usd(v);
  if (/_pct$/.test(last)) return pct(v);
  if (typeof v === 'number') return count(v);
  return String(v);
}

/** Safe, structured event description. Never copies source text or summaries. */
export function eventDescription(e, names = {}) {
  let kind = e.identity_decision ? 'identity' : e.kind;
  if (kind === 'note' && e.stage === 'contact and discovery') kind = 'qualified';
  if (kind === 'note' && e.stage === 'on hold') kind = 'on_hold';
  if (kind === 'note' && e.stage === 'long-term nurture') kind = 'nurture';
  if (kind === 'note' && e.stage === 'lost') kind = 'lost';
  const label = S.event[kind] || kind;
  const parts = [e.unit_id ? t(S.eventAbout, { event: label, unit: e.unit_id }) : label];
  if (e.partner_id && e.partner_role === 'participant') parts.push(t(S.eventWithPartner, { partner: names[e.partner_id] || e.partner_id }));
  return parts.join(' ');
}

/** A quiet source credit, like a photo credit: who logged it, through which channel, and when. */
export function credit(e, { withDate = true } = {}) {
  if (!e) return '';
  const who = S.credit.who[e.logged_by] || e.logged_by || S.credit.unknownWho;
  const channel = (S.channel[e.channel] || e.channel || '').toLowerCase();
  const when = e.occurred_date ? date(e.occurred_date) : S.eventUnknownTime;
  if (!withDate) return [who, channel].filter(Boolean).join(', ');
  return t(S.credit.line, { who, channel, date: when }).replace(/, ,/g, ',');
}

/** Type and place for a unit entry: "Two bedroom / Building 1, first". */
export function unitPlace(u) {
  const place = u.building ? `${t(S.building, { n: u.building })}, ${String(S.floors[u.floor] || u.floor || '').toLowerCase()}` : S.locationNotSupplied;
  return u.type ? `${u.type.charAt(0).toUpperCase()}${u.type.slice(1)} / ${place}` : place;
}
