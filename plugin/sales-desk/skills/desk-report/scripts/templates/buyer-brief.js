// Buyer brief: a simple profile and a timeline. Embeds only this buyer's permitted
// records, related agents, and public inventory facts.

import * as C from './components.js';
import * as F from '../lib/format.js';
import { S, t } from '../lib/strings.js';

const h = F.esc;

function profile(ctx) {
  const b = ctx.d.buyers.get(ctx.personId);
  const m = ctx.m;
  const tz = ctx.rd.meta.reporting_timezone;
  const disputed = ctx.d.disputes.some((d) => d.person_ids.includes(b.person_id));
  const units = m.buyer_units_of_interest.evidence_refs;
  const questions = ctx.rd.reviews.filter((r) => r.status === 'open' && (r.person_id === b.person_id || r.candidate_ids.includes(b.person_id)));
  const facts = [
    [S.buyer.stage, `${h(F.stageLabel(b.display_stage))}${b.override ? ` <span class="lines__meta">${h(t(S.overrideNote, { derived: F.stageLabel(b.derived_stage) }))}</span>` : ''}`],
    [S.buyer.owner, h(b.owner || S.noOwner)],
    [S.buyer.temperature, h(S.temperature[b.lead_temperature || 'not set'])],
    [S.buyer.nextStep, b.next_step ? `${h(b.next_step)}${b.next_step_due ? `<span class="lines__meta">${h(t(S.attention.dueOn, { date: F.date(b.next_step_due, { year: true }) }))}</span>` : ''}` : h(S.buyer.noNextStep)],
    [S.buyer.unitsTitle, units.length ? units.map((u) => `<button type="button" class="sort" data-open="unit" data-id="${h(u)}">${h(u)}</button>`).join(', ') : h(S.buyer.noUnits)],
    [S.buyer.referrer, h(b.referring_partner_id ? C.who(ctx, b.referring_partner_id) : S.buyer.noReferrer) + (disputed ? `<span class="lines__meta">${h(S.buyer.disputeNotice)}</span>` : '')],
    [S.buyer.lastTouch, h(b.last_touch ? `${F.datetime(b.last_touch, tz)}, ${F.display(m.buyer_age)}` : S.reasons.unknown)],
    [S.buyer.origin, h([b.home_city, b.home_country].filter(Boolean).join(', ') || S.buyer.originUnknown)],
    [S.buyer.questions, questions.length ? questions.map((r) => h(r.question || '')).join('<br>') : h(S.buyer.noQuestions)],
  ];
  return `<dl class="facts">${facts.map(([k, v]) => `<dt>${h(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function timeline(ctx) {
  const b = ctx.d.buyers.get(ctx.personId);
  const evs = b.events.map((id) => ctx.d.eventById.get(id)).reverse();
  return `<ul class="lines">${evs.map((e) => `<li>${h(F.eventDescription(e, ctx.names))}<span class="lines__meta">${h(e.occurred_date ? F.date(e.occurred_date, { year: true }) : S.eventUnknownTime)}</span><span class="credit">${h(F.credit(e, { withDate: false }))}</span></li>`).join('')}</ul>`;
}

function layout(ctx) {
  const b = ctx.d.buyers.get(ctx.personId);
  const n = ctx.narrative;
  const recs = n && n.attention && n.attention.length ? C.section(S.buyer.recommendations, `<ul class="lines">${n.attention.map((x) => `<li>${h(x)}</li>`).join('')}</ul>`) : '';
  return [C.intro(ctx, { title: b.name || S.reasons.not_recorded, sub: n && n.summary ? h(n.summary) : '' }), C.section(S.buyer.profile, profile(ctx)), recs, C.section(S.buyer.timeline, timeline(ctx))].join('\n');
}

export default { key: 'buyer-brief', layout, parts: { card: C.cardPart, intro: (ctx) => C.intro(ctx, { title: ctx.d.buyers.get(ctx.personId).name || S.reasons.not_recorded, sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }) }, drawers: C.sharedDrawers };
