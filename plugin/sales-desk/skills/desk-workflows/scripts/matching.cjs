'use strict';

const TYPES = ['Casita', 'Nativo', 'Ola'];

function interestTypes(value) {
  const text = Array.isArray(value) ? value.filter(v => typeof v === 'string').join(' ') : typeof value === 'string' ? value : '';
  return TYPES.filter(type => new RegExp(`\\b${type}s?\\b`, 'i').test(text));
}

/** Parse operator budgets, returning dollar/peso bounds and currency, or null.
 * Single amounts are ceilings. Unqualified 100-999 means thousands in USD.
 * Shared range suffixes apply to both endpoints. No exchange rate is inferred.
 */
function parseBudget(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  let text = String(raw).trim();
  const usd = /\b(?:USD|dollars?|d[oó]lares?)\b/i.test(text);
  const mxn = /\b(?:MXN|pesos?)\b/i.test(text);
  if (usd && mxn) return null;
  if (/\d\s*\$\s*\d|\$\s*\$/.test(text)) return null;
  const currency = mxn ? 'MXN' : 'USD';
  text = text.replace(/\b(?:USD|MXN|dollars?|d[oó]lares?|pesos?)\b/gi, '').replace(/\$/g, '').trim();
  const number = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
  const bound = `${number}\\s*(mil|k|m)?`;
  const match = new RegExp(`^${bound}(?:\\s*(?:[–-]|to|a)\\s*${bound})?$`, 'i').exec(text);
  if (!match) return null;
  const scale = suffix => /^(?:k|mil)$/i.test(suffix) ? 1000 : /^m$/i.test(suffix) ? 1000000 : null;
  const convert = (value, suffix, shared) => {
    const n = Number(value.replace(/,/g, ''));
    const multiplier = scale(suffix) || shared || (currency === 'USD' && n >= 100 && n < 1000 ? 1000 : 1);
    return n * multiplier;
  };
  const first = convert(match[1], match[2], scale(match[4]));
  const second = match[3] == null ? null : convert(match[3], match[4], scale(match[2]));
  const budgetMin = second == null ? 0 : first;
  const budgetMax = second == null ? first : second;
  if (amount(budgetMin) == null || amount(budgetMax) == null || budgetMax <= 0 || budgetMin > budgetMax) return null;
  return { budgetMin, budgetMax, currency };
}

// Units.list_price is a number, not a formatted quote or a price inferred from type.
function amount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER / 100) return null;
  const cents = Math.round(number * 100);
  return Math.abs(number * 100 - cents) < 0.0001 ? cents : null;
}

function dollars(cents) {
  if (cents >= 100000000 && cents % 100000 === 0) return `$${cents / 100000000}M`;
  if (cents >= 100000 && cents % 10000 === 0) return `$${cents / 100000}k`;
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Pure USD villa suggestions from Units rows, resolved by Schema keys:
 * unit_id, type, list_price, currency, status. No sheet writes or stage changes.
 * buyer: { unit_type or interest, budget_range or budgetMin?/budgetMax }.
 * unit_type and budget_range, when present, are the latest supplied inputs.
 * Numeric compatibility bounds remain absolute dollars, never shorthand.
 * A missing/invalid ceiling or an inverted range produces no suggestions or flag.
 * Unknown interest uses budget alone. A flag compares the actual ceiling, even
 * when a wanted villa qualifies for the 10% suggestion allowance. Alternatives
 * fit the actual budget. Missing inventory/prices never imply a budget problem.
 */
function matchUnits(units, buyer = {}) {
  const result = {
    matches: [], budget_flag: '', flag_text: '',
    likelihood_reason: '', suggested_lost_reason: null,
  };
  buyer = buyer || {};
  const budget = Object.hasOwn(buyer, 'budget_range') ? parseBudget(buyer.budget_range)
    : { budgetMin: buyer.budgetMin == null || buyer.budgetMin === '' ? 0 : buyer.budgetMin, budgetMax: buyer.budgetMax, currency: 'USD' };
  if (!budget || budget.currency !== 'USD') return result;
  const max = amount(budget.budgetMax);
  const min = amount(budget.budgetMin);
  if (max == null || max <= 0 || min == null || min > max) return result;
  const interest = interestTypes(Object.hasOwn(buyer, 'unit_type') ? buyer.unit_type : buyer.interest);
  const available = (Array.isArray(units) ? units : []).flatMap(row => {
    if (!row || String(row.status || '').trim().toLowerCase() !== 'available') return [];
    const types = interestTypes(row.type);
    const type = types.length === 1 ? types[0] : null;
    const price = amount(row.list_price);
    const currency = String(row.currency || '').trim().toUpperCase();
    if (!type || !String(row.unit_id || '').trim() || price == null || price <= 0 || (currency && currency !== 'USD')) return [];
    return [{ unit_id: String(row.unit_id).trim(), type, list_price: price / 100, currency: currency || 'USD', cents: price }];
  }).sort((a, b) => a.cents - b.cents || a.unit_id.localeCompare(b.unit_id, 'en'));

  const wanted = available.filter(row => !interest.length || interest.includes(row.type));
  result.matches = wanted.filter(row => row.cents >= min && row.cents <= max + Math.floor(max / 10))
    .slice(0, 3).map(({ cents, ...row }) => row);
  if (interest.length && wanted.length && wanted[0].cents > max) {
    result.budget_flag = `below ${interest.join('/')}`;
    const starts = interest.map(type => {
      const first = wanted.find(row => row.type === type);
      return first ? `${type} starts at ${dollars(first.cents)}` : null;
    }).filter(Boolean);
    result.flag_text = `${starts.join('; ')}, above their ${dollars(max)} budget.`;
    const alternative = available.find(row => !interest.includes(row.type) && row.cents >= min && row.cents <= max);
    if (alternative) result.flag_text += ` ${alternative.type} fits.`;
    result.likelihood_reason = 'budget below the villas they want';
    result.suggested_lost_reason = 'Price';
  }
  return result;
}

module.exports = { matchUnits, parseBudget };
