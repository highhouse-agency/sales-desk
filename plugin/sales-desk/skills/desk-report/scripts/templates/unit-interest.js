// Unit interest: one table of the tracked units with price and recorded buyer activity.

import * as C from './components.js';
import * as M from '../lib/metrics.js';
import * as F from '../lib/format.js';
import { S, t } from '../lib/strings.js';

const h = F.esc;

function units(ctx) {
  const m = ctx.m;
  const list = M.selectUnits(ctx.rd, ctx.state);
  const inq = m.unit_inquiries.detail.per_unit, tou = m.unit_tours.detail.per_unit, hol = m.unit_holds.detail.per_unit, dom = m.days_on_market.value;
  const num = (o, id) => o[id] || 0;
  const key = ctx.state.sort || 'unit';
  const cmp = {
    unit: (a, b) => a.display_order - b.display_order,
    price: (a, b) => (b.list_price_cents ?? -1) - (a.list_price_cents ?? -1) || a.display_order - b.display_order,
    inquiries: (a, b) => num(inq, b.unit_id) - num(inq, a.unit_id) || a.display_order - b.display_order,
    tours: (a, b) => num(tou, b.unit_id) - num(tou, a.unit_id) || a.display_order - b.display_order,
    holds: (a, b) => num(hol, b.unit_id) - num(hol, a.unit_id) || a.display_order - b.display_order,
    dom: (a, b) => ((dom[b.unit_id] || {}).days ?? -1) - ((dom[a.unit_id] || {}).days ?? -1) || a.display_order - b.display_order,
  }[key] || ((a, b) => a.display_order - b.display_order);
  const cols = [
    { key: 'unit', label: S.unitInterest.col.unit, sort: 'unit' }, { key: 'status', label: S.unitInterest.col.status },
    { key: 'price', label: S.unitInterest.col.price, num: true, sort: 'price' }, { key: 'activity', label: S.unitInterest.col.activity, num: true, sort: 'inquiries' },
    { key: 'dom', label: S.unitInterest.col.dom, num: true, sort: 'dom' },
  ];
  const trs = list.sort(cmp).map((u) => {
    const d = dom[u.unit_id] || {};
    return { open: { kind: 'unit', id: u.unit_id }, cells: {
      unit: `${h(u.unit_id)}<span class="lines__meta">${h(u.type || '')}</span>`,
      status: `<span class="chip ${C.statusClass(u.status)}" aria-hidden="true"></span>${h(F.statusLabel(u.status))}`,
      price: h(u.list_price_cents != null ? F.usd(u.list_price_cents) : S.reasons.not_recorded),
      activity: h(`${F.count(num(inq, u.unit_id))} / ${F.count(num(tou, u.unit_id))} / ${F.count(num(hol, u.unit_id))}`),
      dom: h(d.status === 'ok' ? F.count(d.days) : S.reasons[d.status] || S.reasons.not_recorded),
    } };
  });
  const cap = 10;
  const tbl = C.table(ctx, cols, trs.slice(0, cap), { caption: S.unitInterest.rowsTitle, sortKey: key }) + (trs.length > cap ? `<details class="more"><summary>${h(t(S.unitInterest.showAll, { n: trs.length }))}</summary>${C.table(ctx, cols, trs.slice(cap), { caption: S.unitInterest.rowsTitle, sortKey: key })}</details>` : '');
  return `<div data-section="units">${tbl}<p class="note">${h(S.unitInterest.tableNote)}</p></div>`;
}

const SORTS = () => Object.entries(S.unitInterest.sort).filter(([k]) => k !== 'ratio').map(([k, v]) => ({ value: k, label: v }));

function statusFilter(ctx) {
  const counts = M.unitCount(ctx.rd, { ...ctx.state, status: '' }).value;
  const statuses = [...M.UNIT_STATUSES, ...(counts.unknown ? ['unknown'] : [])];
  const options = [{ value: '', label: t(S.unitInterest.statusCount, { status: S.unitInterest.allStatuses, n: F.count(counts.tracked) }) }, ...statuses.map((value) => ({
    value, label: t(S.unitInterest.statusCount, { status: S.unitInterest.statusLabels[value] || F.statusLabel(value), n: F.count(counts[value] || 0) }),
  }))];
  return `<div data-section="statusFilters">${C.selectCtl('status', S.unitInterest.status, options, ctx.state.status)}</div>`;
}

function layout(ctx) {
  const n = ctx.narrative;
  return [C.intro(ctx, { sub: n && n.summary ? h(n.summary) : '' }), C.section(S.unitInterest.rowsTitle, `<div data-static="sort">${statusFilter(ctx)}${C.phoneSort(ctx, SORTS())}</div>${units(ctx)}`)].join('\n');
}

export default { key: 'unit-interest', layout, parts: { statusFilters: statusFilter, intro: (ctx) => C.intro(ctx, { sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }), units, card: C.cardPart }, drawers: C.sharedDrawers };
