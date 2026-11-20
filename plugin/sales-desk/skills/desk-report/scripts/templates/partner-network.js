// Partner network: one sortable, searchable list of agents.

import * as C from './components.js';
import * as M from '../lib/metrics.js';
import * as F from '../lib/format.js';
import { S, t } from '../lib/strings.js';

const h = F.esc;

function rows(ctx) {
  const refs = ctx.m.accepted_referrals.detail.by_partner;
  const fur = ctx.m.furthest_stage.value;
  const q = String(ctx.state.q || '').trim().toLowerCase();
  const list = ctx.d.partnerList.filter((p) => !q || p.name.toLowerCase().includes(q));
  const key = ctx.state.sort || 'last_touch';
  const counts = ctx.m.accepted_referrals.detail.count_by_partner;
  const n = (p) => counts[p.partner_id] || 0;
  const stage = (p) => M.STAGES.indexOf(fur[p.partner_id].furthest);
  const cmp = {
    name: (a, b) => a.name.localeCompare(b.name),
    last_touch: (a, b) => (b.last_touch_date || '').localeCompare(a.last_touch_date || '') || a.name.localeCompare(b.name),
    referrals: (a, b) => n(b) - n(a) || a.name.localeCompare(b.name),
    furthest: (a, b) => stage(b) - stage(a) || a.name.localeCompare(b.name),
  }[key] || ((a, b) => a.name.localeCompare(b.name));
  return list.sort(cmp);
}

function agents(ctx) {
  const refs = ctx.m.accepted_referrals.detail.by_partner;
  const fur = ctx.m.furthest_stage.value;
  const cols = [
    { key: 'name', label: S.partners.col.name, sort: 'name' }, { key: 'last', label: S.partners.col.lastTouch, sort: 'last_touch' },
    { key: 'refs', label: S.partners.col.referrals, num: true, sort: 'referrals' }, { key: 'furthest', label: S.partners.col.furthest, sort: 'furthest' },
  ];
  const list = rows(ctx);
  const trs = list.map((p) => ({ open: { kind: 'partner', id: p.partner_id }, cells: {
    name: h(p.name),
    last: h(p.last_touch_date ? `${F.date(p.last_touch_date)}, ${F.activityLabel(p.activity).toLowerCase()}` : `${S.noRecordedTouch}, ${F.activityLabel(p.activity).toLowerCase()}`),
    refs: h(F.count(ctx.m.accepted_referrals.detail.count_by_partner[p.partner_id] || 0)),
    furthest: h(fur[p.partner_id].furthest ? F.stageLabel(fur[p.partner_id].furthest) : S.partners.none),
  } }));
  const sk = ctx.state.sort || 'last_touch';
  const cap = 12;
  const body = !trs.length ? `<p class="lede">${h(S.filters.empty)}</p>`
    : C.table(ctx, cols, trs.slice(0, cap), { caption: S.partners.listTitle, sortKey: sk })
      + (trs.length > cap ? `<details class="more"><summary>${h(t(S.partners.showAll, { n: trs.length }))}</summary>${C.table(ctx, cols, trs.slice(cap), { caption: S.partners.listTitle, sortKey: sk })}</details>` : '');
  return `<div data-section="agents">${body}<p class="note">${h(t(S.partners.listCount, { n: list.length, total: ctx.d.partnerList.length }))}</p></div>`;
}

const SORTS = (ctx) => Object.entries(S.partners.sort).map(([k, v]) => ({ value: k, label: v }));

function layout(ctx) {
  const n = ctx.narrative;
  const search = `<div class="search" data-static="search"><label class="ctl"><span class="ctl__label">${h(S.partners.search)}</span><input class="ctl__input" type="search" data-filter="q" value="${h(ctx.state.q || '')}" autocomplete="off"></label></div>`;
  return [C.intro(ctx, { sub: n && n.summary ? h(n.summary) : '' }), C.section(S.partners.listTitle, `${search}<div data-static="sort">${C.phoneSort(ctx, SORTS(ctx))}</div>${agents(ctx)}`)].join('\n');
}

/** Who the agent is first, then their referrals and touches. */
function drawerPartner(ctx, id) {
  const p = ctx.d.partners.get(id);
  const refs = ctx.m.accepted_referrals.detail.by_partner[id] || [];
  let terms = S.partners.drawerTermsNone;
  if (p.commission_kind === 'percent') terms = t(S.partners.drawerTermsPercent, { rate: p.commission_rate });
  if (p.commission_kind === 'fixed') terms = t(S.partners.drawerTermsFixed, { amount: F.usd(p.fixed_commission_cents) });
  const exc = p.exceptions.status === 'ok' ? Object.entries(p.exceptions.map).map(([b, r]) => `${C.who(ctx, b)}: ${r}%`).join('; ') : '';
  const facts = [
    [S.partners.col.activity, `${F.activityLabel(p.activity)}${p.last_touch_date ? `, ${F.date(p.last_touch_date, { year: true })}` : ''}`],
    [S.partners.drawerTerms, `${terms}${exc ? `. ${t(S.partners.drawerExceptions, { list: exc })}` : ''}${p.exceptions.status === 'unknown' ? `. ${S.partners.drawerExceptionsUnknown}` : ''}`],
  ];
  const buyers = refs.length ? `<ul class="lines">${refs.map((x) => { const b = ctx.d.buyers.get(x.person_id); return `<li>${h(C.who(ctx, x.person_id))}<span class="lines__meta">${h(F.stageLabel(b.display_stage))}${x.disputed ? `, ${h(S.filters.disputedYes.toLowerCase())}` : ''}</span></li>`; }).join('')}</ul>` : `<p>${h(S.partners.drawerNoBuyers)}</p>`;
  const touches = p.touches.map((eid) => ctx.d.eventById.get(eid)).filter((e) => e.record_type === 'touch' && e.partner_role === 'participant').reverse();
  const tl = touches.length ? `<ul class="lines">${touches.slice(0, 8).map((e) => `<li>${h(e.person_id ? t(S.partners.touchAbout, { name: C.who(ctx, e.person_id) }) : S.partners.drawerPartnerOnly)}<span class="lines__meta">${h(F.date(e.occurred_date, { year: true }))}</span><span class="credit">${h(F.credit(e, { withDate: false }))}</span></li>`).join('')}</ul>` : `<p>${h(S.partners.drawerNoTouches)}</p>`;
  const claims = ctx.rd.reviews.filter((r) => r.status === 'open' && r.reason === M.REFERRAL_CONFLICT && r.candidate_ids.includes(id));
  return {
    title: p.name, sub: S.partners.agent,
    body: `<dl class="facts">${facts.map(([k, v]) => `<dt>${h(k)}</dt><dd>${h(v)}</dd>`).join('')}</dl>
      <h3>${h(S.partners.drawerBuyers)}</h3>${buyers}
      ${claims.length ? `<h3>${h(S.partners.drawerClaims)}</h3><ul class="lines">${claims.map((r) => `<li>${h(r.question || '')}</li>`).join('')}</ul>` : ''}
      <h3>${h(S.partners.drawerTouches)}</h3>${tl}`,
  };
}

export default { key: 'partner-network', layout, parts: { intro: (ctx) => C.intro(ctx, { sub: ctx.narrative && ctx.narrative.summary ? h(ctx.narrative.summary) : '' }), agents, card: C.cardPart }, drawers: { ...C.sharedDrawers, partner: drawerPartner } };
