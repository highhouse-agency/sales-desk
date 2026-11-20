// Demand and ads: one sentence and one table. Campaign spend, platform leads, cost per
// lead, and paid deposits, for whole reporting weeks.

import * as C from './components.js';
import * as M from '../lib/metrics.js';
import * as F from '../lib/format.js';
import { S, t } from '../lib/strings.js';

const h = F.esc;

function periodOptions(ctx) {
  const weeks = ctx.rd.scope.weeks;
  if (!weeks.length) return [{ value: '0--1', label: S.demand.noWeeks }];
  const last = weeks.length - 1;
  const complete = weeks.filter((w) => w.complete);
  const opts = [{ value: `0-${last}`, label: t(S.demand.periodAll, { range: F.range(weeks[0].start, M.costPeriod(ctx.rd, { week_from: 0, week_to: last }).end) }) }];
  if (complete.length >= 4) { const a = complete[complete.length - 4].index, b = complete[complete.length - 1].index; opts.push({ value: `${a}-${b}`, label: t(S.demand.periodLast4, { range: F.range(weeks[a].start, weeks[b].end) }) }); }
  for (const w of weeks.slice().reverse()) opts.push({ value: `${w.index}-${w.index}`, label: w.complete ? F.range(w.start, w.end) : `${F.range(w.start, w.through)}, ${S.pace.partial}` });
  return opts;
}

function campaigns(ctx) {
  const rows = ctx.m.campaign_table.value.slice().sort((a, b) => (b.spend.value || 0) - (a.spend.value || 0));
  const cols = [
    { key: 'name', label: S.demand.col.campaign }, { key: 'spend', label: S.demand.col.spend, num: true },
    { key: 'leads', label: S.demand.col.leads, num: true }, { key: 'cpl', label: S.demand.col.cpl, num: true }, { key: 'discovery', label: S.demand.col.discovery, num: true }, { key: 'booked', label: S.demand.col.booked, num: true }, { key: 'tours', label: S.demand.col.tours, num: true }, { key: 'deposits', label: S.demand.col.deposits, num: true },
  ];
  const trs = rows.map((r) => ({ open: { kind: 'campaign', id: r.campaign_id }, cells: {
    name: h(r.campaign_name), spend: h(F.display(r.spend)), leads: h(F.display(r.platform_leads)), cpl: h(F.display(r.cost_per_platform_lead)),
    discovery: h(F.count(r.cost_per_outcome.value.qualified_buyers.outcomes)), booked: h(F.count(r.cost_per_outcome.value.booked_tour_buyers.outcomes)), tours: h(F.count(r.cost_per_outcome.value.tour_buyers.outcomes)), deposits: h(F.count(r.cost_per_outcome.value.deposit_buyers.outcomes)),
  } }));
  trs.push({ cls: 'is-total', cells: { name: h(S.demand.total), spend: h(F.display(ctx.m.spend)), leads: h(F.display(ctx.m.platform_leads)), cpl: h(F.display(ctx.m.cost_per_platform_lead)), discovery: h(F.count(ctx.m.cost_per_outcome.value.qualified_buyers.outcomes)), booked: h(F.count(ctx.m.cost_per_outcome.value.booked_tour_buyers.outcomes)), tours: h(F.count(ctx.m.cost_per_outcome.value.tour_buyers.outcomes)), deposits: h(F.count(ctx.m.cost_per_outcome.value.deposit_buyers.outcomes)) } });
  // Outcomes outside the selected campaigns never sit under campaign cost; they get their own line.
  const oa = ctx.m.outcome_attribution.value.deposit_buyers;
  const outside = t(S.demand.depositsOutside, { partner: oa.partner, unknown: oa.unknown + oa.other_campaign });
  const p = ctx.m.spend;
  const range = p.period_start ? F.range(p.period_start, p.period_end, { year: true }) : S.reasons.not_configured;
  return `<div data-section="campaigns">${C.table(ctx, cols, trs, { caption: S.demand.campaignsTitle })}<p class="lede">${h(outside)}</p><p class="note">${h(t(S.demand.tableNote, { range }))}</p></div>`;
}

function sources(ctx) {
  const r=ctx.m.source_leads;
  return `<div data-section="sources"><dl class="facts">${Object.keys(r.value).map(k=>`<dt>${h(S.source[k]||S.source.unknown)}</dt><dd>${h(F.displayPath(r,[k]))}</dd>`).join('')}<dt>${h(S.demand.sourceUnknown)}</dt><dd>${h(F.count(r.unknown_count))}</dd></dl><p class="note">${h(S.demand.sourceNote)}</p></div>`;
}

const parts = {
  intro: (ctx) => C.intro(ctx, { sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }),
  campaigns, sources,
  card: C.cardPart,
};

function layout(ctx) {
  const n = ctx.narrative;
  const ctl = `<div class="sortbar" data-static="period">${C.selectCtl('period', S.filters.period, periodOptions(ctx), `${ctx.state.week_from}-${ctx.state.week_to}`, { disabled: !ctx.rd.scope.weeks.length })}</div>`;
  return [parts.intro(ctx), C.section(S.demand.campaignsTitle, ctl + campaigns(ctx)), C.section(S.demand.sourceTitle, sources(ctx))].join('\n');
}

function drawerCampaign(ctx, id) {
  const ids = ctx.m.campaign_buyers.detail.members[id] || [];
  const body = ids.length ? `<ul class="lines">${ids.map((pid) => { const b = ctx.d.buyers.get(pid); return `<li>${h(C.who(ctx, pid))}<span class="lines__meta">${h(F.stageLabel(b.display_stage))}, ${h(t(S.demand.firstTouch, { date: F.date(b.first_touch_date) }))}</span></li>`; }).join('')}</ul>` : `<p>${h(S.demand.noMatched)}</p>`;
  return { title: ctx.names[id] || id, sub: t(S.demand.campaignMembers, { n: ids.length }), body: body + `<p class="note">${h(S.demand.platformNote)}</p>` };
}

export default { key: 'demand-and-ads', layout, parts, drawers: { ...C.sharedDrawers, campaign: drawerCampaign } };
