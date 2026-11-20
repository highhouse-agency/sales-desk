// The 1080 by 1350 card: typographic, like a magazine's contents page. Property
// name, report title, the report's big numbers, the units line, and the as-of line
// on the warm page. Built as SVG from the page's data; Claude makes cards on request.

import * as M from './metrics.js';
import { S, t } from './strings.js';
import * as F from './format.js';

const h = F.esc;

// Token values mirrored from styles/tokens.css. The SVG becomes an image on export,
// where CSS custom properties do not resolve. test/bundle.test.js keeps them in step.
export const PALETTE = { page: '#FFFFFF', rule: '#D9DAD6', ink: '#142329', ink2: '#39464B', ink3: '#586367', accent: '#71532D' };
const P = PALETTE;
const SERIF = "'Marcellus', 'Iowan Old Style', Palatino, Georgia, serif";
const MONO = "'Pontano Sans', ui-monospace, Menlo, monospace";
const SANS = "'Pontano Sans', -apple-system, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif";
const W = 1080, H = 1350, X = 72;

function wrap(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The big numbers for a report, as {value, label}. The pages show the same set. */
export function bigNumbers(ctx) {
  const m = ctx.m;
  const so = m.projected_sellout;
  const sellout = so && so.value ? (so.value.slow_unbounded ? `${so.value.fast}+` : F.display(so).replace(/ weeks?$/, '')) : F.display(so);
  switch (ctx.reportId) {
    case 'source-to-sale':
    case 'buyer-segments': return ['buyers', 'tours', 'reservations', 'closed'].map(k => ({ value: F.count(m.revenue_insights.value[k]), label: S.revenue.col[k] }));
    case 'closed-lost': {
      const r = m.revenue_insights.value;
      return [{ value: F.count(r.lost), label: S.revenue.lost }, { value: F.count(r.on_hold), label: S.revenue.onHold }, { value: r.top_reason ? S.revenue.reason[r.top_reason] : S.reasons.not_recorded, label: S.revenue.topReason }];
    }
    case 'sales-pulse':
    case 'owner-brief': return [
      { value: F.display(m.remaining_to_secure), label: S.numbers.remaining },
      { value: F.display(m.secured_recent), label: S.numbers.securedRecent },
      { value: m.four_week_absorption.value == null ? F.display(m.four_week_absorption) : F.rate1(m.four_week_absorption.value), label: S.numbers.pace },
      { value: sellout, label: so && so.value ? S.numbers.sellout : S.numbers.selloutPlain },
    ];
    case 'demand-and-ads': return [
      { value: F.usd(m.spend.value), label: S.demand.leadSpend },
      { value: F.display(m.platform_leads), label: S.demand.leadLeads },
      { value: F.display(m.cost_per_platform_lead), label: S.demand.leadCpl },
      { value: F.display(m.deposit_buyers), label: S.demand.leadDeposits },
    ];
    case 'partner-network': {
      const a = m.partner_activity.value || {};
      return [
        { value: F.count(a.active), label: S.partners.leadActive },
        { value: F.count(a.warm), label: S.partners.leadWarm },
        { value: F.count(a.quiet), label: S.partners.leadQuiet },
        { value: F.display(m.accepted_referrals), label: S.partners.leadReferrals },
      ];
    }
    case 'unit-interest': return [
      { value: F.display(m.remaining_to_secure), label: S.unitInterest.leadRemaining },
      { value: F.display(m.unit_inquiries), label: S.unitInterest.leadInquiries },
      { value: F.display(m.unit_tours), label: S.unitInterest.leadTours },
      { value: F.display(m.unit_holds), label: S.unitInterest.leadHolds },
    ];
    case 'buyer-brief': return [
      { value: F.display(m.buyer_units_of_interest), label: S.buyer.figures.units },
      { value: F.display(m.unit_tours), label: S.buyer.figures.tours },
      { value: F.display(m.open_reviews), label: S.buyer.figures.reviews },
    ];
    case 'custom.spend-vs-closings': {
      const c = m.closings_by_partner;
      return [
        { value: F.usd(m.spend.value), label: S.custom.leadSpend },
        { value: F.display(m.platform_leads), label: S.custom.leadLeads },
        { value: c.status === 'zero' ? S.reasons.no_closings : F.count(c.value.accepted), label: S.custom.leadClosings },
      ];
    }
    default: return [];
  }
}

/** "5 secured / 2 held / 13 available", plus the earlier sales. */
export function unitsLine(rd) {
  const c = M.unitCount(rd).value;
  return { line: t(S.units.line, { secured: c.secured, held: c.held, available: c.available }), earlier: c.sold_before_tracking == null ? S.units.earlierUnknown : t(S.units.earlier, { n: c.sold_before_tracking }) };
}

function cardScope(ctx) {
  const st = ctx.state;
  const parts = [];
  for (const k of ['building', 'floor', 'type', 'status']) if (st[k]) parts.push(k === 'building' ? t(S.building, { n: st[k] }) : k === 'status' ? S.status[st[k]] : st[k]);
  if (st.campaign) parts.push(ctx.names[st.campaign] || st.campaign);
  if (st.source) parts.push(F.sourceLabel(st.source));
  if (st.revenue_period && st.revenue_period !== 'all') parts.push(S.revenue.periods[st.revenue_period]);
  if (st.buyer_segment) parts.push(S.revenue.segment[st.buyer_segment] || st.buyer_segment);
  if (st.date_from || st.date_to) parts.push([st.date_from ? `${S.revenue.from} ${F.date(st.date_from)}` : '', st.date_to ? `${S.revenue.through} ${F.date(st.date_to)}` : ''].filter(Boolean).join(', '));
  return parts.length ? t(S.card.filtered, { summary: parts.join(', ') }) : S.card.scopeAll;
}

function cardEmpty(ctx) {
  const f = { building: ctx.state.building, floor: ctx.state.floor, type: ctx.state.type, status: ctx.state.status };
  return Object.values(f).some(Boolean) && M.selectUnits(ctx.rd, f).length === 0;
}

function cardPeriod(ctx) {
  const m = ctx.m;
  if (m.spend && m.spend.period_start) return F.range(m.spend.period_start, m.spend.period_end, { year: true });
  if (m.secured_recent && m.secured_recent.period_start) return F.range(m.secured_recent.period_start, m.secured_recent.period_end, { year: true });
  return S.currentState;
}

/** The card caption: scope, period, and as-of date only. */
export function cardCaption(ctx) {
  return t(S.card.caption, { scope: cardScope(ctx), period: cardPeriod(ctx), date: F.date(ctx.rd.meta.as_of_date, { year: true }) });
}

/** 1080 by 1350 card. */
export function cardSvg(ctx, { fontCss = '' } = {}) {
  const prop = ctx.rd.scope.property;
  const rep = S.reports[ctx.reportId] || {};
  const tz = ctx.rd.meta.reporting_timezone;
  const empty = cardEmpty(ctx);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${h(t(S.card.alt, { title: rep.title, property: prop.name }))}">`;
  if (fontCss) s += `<style>${fontCss}</style>`;
  s += `<rect width="${W}" height="${H}" fill="${P.page}"/>`;
  // masthead
  s += `<text x="${X}" y="150" font-family="${SERIF}" font-size="72" fill="${P.ink}">${h(prop.name)}</text>`;
  s += `<text x="${X}" y="196" font-family="${MONO}" font-size="20" letter-spacing="2" fill="${P.ink3}">${h(S.location.toUpperCase())}</text>`;
  if (ctx.rd.meta.mode === 'training') s += `<text x="${W - X}" y="104" text-anchor="end" font-family="${MONO}" font-size="18" letter-spacing="2" fill="${P.ink3}">${h(S.trainingLabel.toUpperCase())}</text>`;
  s += `<line x1="${X}" y1="250" x2="${W - X}" y2="250" stroke="${P.ink}" stroke-width="2"/>`;
  // title and caption
  const title = ctx.reportId === 'buyer-brief' ? `${rep.title}, ${t(S.buyer.idLabel, { id: ctx.personId })}` : rep.title;
  s += `<text x="${X}" y="350" font-family="${SERIF}" font-size="${title.length > 26 ? 56 : 76}" fill="${P.ink}">${h(title)}</text>`;
  // Captions come only from approved scope and metric fields, never from free narrative.
  const caption = empty ? S.card.emptyFilter : cardCaption(ctx);
  wrap(caption, 62).slice(0, 2).forEach((line, i) => { s += `<text x="${X}" y="${408 + i * 36}" font-family="${SANS}" font-size="27" fill="${P.ink2}">${h(line)}</text>`; });
  // numbers, two per row like a contents page
  const nums = bigNumbers(ctx).slice(0, 5);
  const cols = nums.length > 4 ? 3 : 2;
  const colW = (W - 2 * X) / cols;
  const rowH = 230;
  nums.forEach((n, i) => {
    const x = X + (i % cols) * colW, y = 670 + Math.floor(i / cols) * rowH;
    const v = empty ? S.reasons.not_recorded : String(n.value);
    const size = Math.min(150, Math.floor((colW - 24) / Math.max(1, v.length * 0.48)));
    s += `<line x1="${x}" y1="${y - 150}" x2="${x + colW - 32}" y2="${y - 150}" stroke="${P.rule}" stroke-width="2"/>`;
    s += `<text x="${x}" y="${y}" font-family="${SERIF}" font-size="${size}" fill="${P.ink}">${h(v)}</text>`;
    wrap(n.label, Math.floor((colW - 32) / 13.5)).slice(0, 2).forEach((line, li) => { s += `<text x="${x}" y="${y + 44 + li * 32}" font-family="${SANS}" font-size="25" fill="${P.ink2}">${h(line)}</text>`; });
  });
  // A selected unit view omits the development-wide inventory line.
  if (ctx.reportId !== 'unit-interest' || !ctx.filtered) {
    // units line
    const u = unitsLine(ctx.rd);
    s += `<line x1="${X}" y1="1110" x2="${W - X}" y2="1110" stroke="${P.rule}" stroke-width="2"/>`;
    s += `<text x="${X}" y="1170" font-family="${SERIF}" font-size="46" fill="${P.ink}">${h(u.line)}</text>`;
    s += `<text x="${X}" y="1210" font-family="${SANS}" font-size="24" fill="${P.ink3}">${h(u.earlier)}</text>`;
  }
  // as-of line
  let asOf = t(S.card.asOf, { datetime: F.datetime(ctx.rd.meta.as_of, tz), tz: F.tzLabel(tz) });
  if (ctx.reportId === 'buyer-brief' && ctx.d.buyers.get(ctx.personId)?.next_step_due) asOf = `${t(S.buyer.cardNext, { date: F.date(ctx.d.buyers.get(ctx.personId).next_step_due) })} / ${asOf}`;
  s += `<line x1="${X}" y1="1250" x2="${W - X}" y2="1250" stroke="${P.ink}" stroke-width="2"/>`;
  s += `<text x="${X}" y="1292" font-family="${MONO}" font-size="18" letter-spacing="1.5" fill="${P.ink3}">${h(`${cardScope(ctx)} / ${cardPeriod(ctx)}`.toUpperCase())}</text>`;
  s += `<text x="${X}" y="1320" font-family="${MONO}" font-size="18" letter-spacing="1.5" fill="${P.ink3}">${h(asOf.toUpperCase())}</text>`;
  return s + '</svg>';
}
