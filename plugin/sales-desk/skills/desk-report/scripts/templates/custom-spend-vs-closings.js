// Custom report: ad spend against closed deals by partner, in the same table style.
// Campaign spend has no partner allocation, so there is no cost per closing.

import * as C from './components.js';
import * as F from '../lib/format.js';
import { S, t } from '../lib/strings.js';

const h = F.esc;

function spend(ctx) {
  const cols = [{ key: 'name', label: S.demand.col.campaign }, { key: 'spend', label: S.demand.col.spend, num: true }, { key: 'leads', label: S.demand.col.leads, num: true }];
  const trs = ctx.m.campaign_table.value.map((r) => ({ cells: { name: h(r.campaign_name), spend: h(F.display(r.spend)), leads: h(F.display(r.platform_leads)) } }));
  trs.push({ cls: 'is-total', cells: { name: h(S.demand.total), spend: h(F.display(ctx.m.spend)), leads: h(F.display(ctx.m.platform_leads)) } });
  return `${C.table(ctx, cols, trs)}<p class="note">${h(F.range(ctx.m.spend.period_start, ctx.m.spend.period_end, { year: true }))}</p>`;
}

function closings(ctx) {
  const c = ctx.m.closings_by_partner;
  if (c.status === 'zero') return `<p class="lede">${h(S.reasons.no_closings)}</p><p class="note">${h(S.custom.noAllocation)}</p>`;
  const byPartner = Object.entries(c.value.by_partner).map(([pid, n]) => `${C.who(ctx, pid)} ${n}`).join(', ');
  const lines = [
    `<li>${h(S.custom.groupAccepted)}<span class="lines__meta">${h(t(S.custom.closingsN, { n: c.value.accepted }))}${byPartner ? `: ${h(byPartner)}` : ''}</span></li>`,
    `<li>${h(S.custom.groupMissing)}<span class="lines__meta">${h(t(S.custom.closingsN, { n: c.value.missing }))}</span></li>`,
    `<li>${h(S.custom.groupDisputed)}<span class="lines__meta">${h(t(S.custom.closingsN, { n: c.value.disputed }))}</span></li>`,
  ];
  return `<ul class="lines">${lines.join('')}</ul><p class="note">${h(S.custom.noAllocation)}</p>`;
}

function layout(ctx) {
  const n = ctx.narrative;
  return [C.intro(ctx, { sub: n && n.summary ? h(n.summary) : '' }), C.section(S.custom.spendTitle, spend(ctx)), C.section(S.custom.closingsTitle, closings(ctx))].join('\n');
}

export default { key: 'custom.spend-vs-closings', layout, parts: { intro: (ctx) => C.intro(ctx, { sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }), card: C.cardPart }, drawers: C.sharedDrawers };
