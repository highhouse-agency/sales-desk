import * as C from './components.js';
import * as F from '../lib/format.js';
import { S } from '../lib/strings.js';
const h = F.esc;
function label(ctx, x) {
  if (x.kind === 'reason') return S.revenue.reason[x.key] || S.reasons.not_recorded;
  if (x.kind === 'segment') return S.revenue.segment[x.key] || C.text(ctx, x.key);
  return x.kind === 'channel' ? F.sourceLabel(x.key) : C.who(ctx, x.key);
}
function filters(ctx) {
  const types = [...new Set(ctx.rd.entities.buyers.map(b => b.buyer_segment))].sort();
  return `<div class="filters">${C.selectCtl('revenue_period', S.filters.period, ['all','30','90','year'].map(value => ({ value, label: S.revenue.periods[value] })), ctx.state.revenue_period)}${C.selectCtl('buyer_segment', S.revenue.col.segment, [{ value: '', label: S.revenue.all }, ...types.map(key => ({ value: key, label: label(ctx, { kind: 'segment', key }) }))], ctx.state.buyer_segment)}</div>`;
}
function results(ctx) {
  const id = ctx.reportId;
  const keys = id === 'source-to-sale' ? ['source','buyers','tours','reservations','closed','lead_to_tour','tour_to_reservation','credit'] : id === 'closed-lost' ? ['reason','buyers','stages'] : ['segment','active','closed','velocity','lead_to_tour','tour_to_reservation','sources'];
  const columns = keys.map(key => ({ key, label: key === 'buyers' && id === 'closed-lost' ? S.revenue.buyers : S.revenue.col[key], num: !['source','reason','segment','credit','stages','sources'].includes(key) }));
  const rows = ctx.m.revenue_insights.value.rows.map(row => {
    const cells = {};
    for (const key of keys) {
      if (['source','reason','segment'].includes(key)) cells[key] = h(label(ctx, row));
      else if (key === 'credit') cells[key] = row.credit.map(c => `${h(C.who(ctx, c.person_id))}: ${h(c.disputed ? S.revenue.disputed : label(ctx, c))}`).join('<br>');
      else if (key === 'stages') cells[key] = Object.entries(row.stages).map(([stage,n]) => `${h(S.stage[stage])}: ${h(F.count(n))}`).join('<br>');
      else if (key === 'sources') cells[key] = row.sources.map(src => `${h(label(ctx,src))}: ${h(F.count(src.count))}`).join('<br>');
      else cells[key] = h(row[key] == null ? (key.includes('_to_') && (key === 'lead_to_tour' ? row.buyers : row.tours) === 0 ? S.revenue.dash : S.reasons.not_recorded) : key === 'velocity' ? F.count(row[key]) : key.includes('_to_') ? `${F.rate1(row[key])}%` : F.count(row[key]));
    }
    return { cells };
  });
  return C.section('', rows.length ? C.table(ctx, columns, rows.slice(0, 6)) + (rows.length > 6 ? `<details><summary>${h(S.revenue.more)}</summary>${C.table(ctx, columns, rows.slice(6))}</details>` : '') : `<p>${h(S.revenue.empty)}</p>`, { id: 'results' });
}
export function revenueTemplate(key) {
  const intro = ctx => C.intro({ ...ctx, filtered: false }, { title: S.reports[key].title, sub: h(S.revenue.summary[key]) });
  return { key, layout: ctx => [intro(ctx), filters(ctx), results(ctx)].join('\n'), parts: { intro, results, card: C.cardPart }, drawers: C.sharedDrawers };
}
