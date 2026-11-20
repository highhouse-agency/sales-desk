// Narrative validation and expansion (spec 02, "Computed data and narrative contract").
// Claude writes narrative fields with {{metric:<report>.<metric>[.<key>]}} references.
// This module resolves them against report-data metrics, enforces word and bullet
// limits after expansion, and rejects any number in prose that did not come from a
// reference, apart from dates and record identifiers.

import { display, displayPath } from './format.js';

export const LIMITS = {
  headline: { words: 12 },
  summary: { words: 60 },
  changes: { items: 4, words: 20 },
  attention: { items: 4, words: 20 },
  limitations: { items: 3, words: 20 },
  card_caption: { words: 20 },
};
const REQUIRED = ['headline', 'summary', 'card_caption'];

const PLACEHOLDER = /\{\{metric:([A-Za-z0-9._-]+)\}\}/g;
const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_TOKENS = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  new RegExp(`\\b${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, 'g'),
  new RegExp(`\\b\\d{1,2}\\s+${MONTH}(?:\\s+\\d{4})?\\b`, 'g'),
];
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen|half|twice|double|triple|percent)\b/i;

export const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

/**
 * @param narrative  {headline, summary, changes[], attention[], limitations[], card_caption}
 * @param ctx        {reportKey, metrics: flat map "report.metric" -> result, period: {start,end}, knownIds: Set}
 */
export function validateNarrative(narrative, ctx) {
  const errors = [];
  const refs = new Set();
  const expanded = {};
  if (!narrative || typeof narrative !== 'object') return { ok: false, errors: [`${ctx.reportKey}: narrative missing`], expanded: null, refs: [] };
  for (const f of REQUIRED) if (!narrative[f] || !String(narrative[f]).trim()) errors.push(`${ctx.reportKey}.${f}: required`);
  for (const f of Object.keys(narrative)) if (!(f in LIMITS)) errors.push(`${ctx.reportKey}.${f}: unknown field`);

  const expand = (text, where) => {
    let out = String(text);
    out = out.replace(PLACEHOLDER, (whole, ref) => {
      const r = resolve(ref, ctx);
      if (r.error) { errors.push(`${where}: ${r.error}`); return whole; }
      refs.add(ref);
      return r.text;
    });
    checkProse(String(text), where, ctx, errors);
    return out;
  };

  for (const [f, lim] of Object.entries(LIMITS)) {
    const v = narrative[f];
    if (v == null) { expanded[f] = lim.items ? [] : null; continue; }
    if (lim.items) {
      if (!Array.isArray(v)) { errors.push(`${ctx.reportKey}.${f}: must be a list`); continue; }
      if (v.length > lim.items) errors.push(`${ctx.reportKey}.${f}: at most ${lim.items} bullets`);
      expanded[f] = v.map((b, i) => {
        const e = expand(b, `${ctx.reportKey}.${f}[${i}]`);
        if (words(e) > lim.words) errors.push(`${ctx.reportKey}.${f}[${i}]: ${words(e)} words, limit ${lim.words}`);
        return e;
      });
    } else {
      const e = expand(v, `${ctx.reportKey}.${f}`);
      if (words(e) > lim.words) errors.push(`${ctx.reportKey}.${f}: ${words(e)} words, limit ${lim.words}`);
      expanded[f] = e;
    }
  }
  return { ok: errors.length === 0, errors, expanded, refs: [...refs] };
}

function resolve(ref, ctx) {
  const prefix = ctx.reportKey + '.';
  if (!ref.startsWith(prefix)) return { error: `reference ${ref} belongs to another report` };
  const rest = ref.slice(prefix.length).split('.');
  const metricId = rest[0];
  const r = ctx.metrics[prefix + metricId];
  if (!r) return { error: `unresolved reference ${ref}` };
  if (r.currency && r.currency !== 'USD') return { error: `reference ${ref} has currency ${r.currency}` };
  if (ctx.period && r.period_end && ctx.period.end && r.period_end > ctx.period.end) return { error: `reference ${ref} ends after the report period` };
  const text = rest.length > 1 ? displayPath(r, rest.slice(1)) : display(r);
  if (text == null || text === '') return { error: `reference ${ref} has no display value` };
  return { text };
}

function checkProse(text, where, ctx, errors) {
  let prose = text.replace(PLACEHOLDER, ' ');
  for (const re of DATE_TOKENS) prose = prose.replace(re, ' ');
  // Unit names pass only when they are real IDs from the sheet (1G, O-01, C-04), matched literally.
  // An ID with no letter (a bare number) never passes, so it cannot carry an invented figure.
  const ids = [...(ctx.knownIds || [])].map(String).filter((id) => /[A-Za-z]/.test(id)).sort((a, b) => b.length - a.length);
  if (ids.length) {
    const alt = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    prose = prose.replace(new RegExp(`(?<![A-Za-z0-9-])(?:${alt})(?![A-Za-z0-9-])`, 'g'), ' ');
  }
  const digit = prose.match(/[^\s]*\d[^\s]*/);
  if (digit) errors.push(`${where}: number "${digit[0]}" is not from a metric reference`);
  const word = prose.match(NUMBER_WORDS);
  if (word) errors.push(`${where}: quantity word "${word[0]}" is not from a metric reference`);
  if (/%/.test(prose)) errors.push(`${where}: percentage written outside a metric reference`);
  if (/\u2014/.test(text)) errors.push(`${where}: em dash`);
  if (/\u00b7/.test(text)) errors.push(`${where}: middle dot`);
}
