// Shared report components. Each is a pure function from a render context to an
// HTML string. build.js renders the first view with them; the page runs the same
// functions again after a sort or period change. No metric arithmetic happens here:
// every figure comes from lib/metrics.js results through lib/format.js.

import * as M from '../lib/metrics.js';
import { S, t } from '../lib/strings.js';
import * as F from '../lib/format.js';
import { cardSvg, bigNumbers, unitsLine } from '../lib/card.js';

const h = F.esc;

// ---------------------------------------------------------------- context

export function makeCtx(rd, reportKey, state) {
  const reportId = reportKey.startsWith('buyer-brief') ? 'buyer-brief' : reportKey;
  const personId = reportId === 'buyer-brief' ? reportKey.split('.')[1] : null;
  const defaults = M.defaultFilters(rd, reportId);
  const st = state || { ...defaults };
  const m = M.computeReport(rd, reportId, st, { personId, changes: rd.changes });
  const d = M.derive(rd);
  const names = {};
  for (const b of rd.entities.buyers) names[b.person_id] = b.name;
  for (const p of rd.entities.partners) names[p.partner_id] = p.name;
  for (const c of rd.entities.campaigns) names[c.campaign_id] = c.campaign_name;
  const filtered = Object.keys(defaults).some((k) => !['sort', 'q', 'dir'].includes(k) && String(st[k] ?? '') !== String(defaults[k] ?? ''));
  return { rd, reportKey, reportId, personId, state: st, defaults, m, d, names, filtered,
    narrative: (rd.narrative || {})[reportKey] || null, report: (rd.reports || []).find((r) => r.key === reportKey) || null };
}

// ---------------------------------------------------------------- primitives

/** Buyers and agents appear by name. Identifiers stay in data attributes only. */
export function who(ctx, id) { return ctx.names[id] || S.recordMissing; }
/** Record identifiers in free text become names, or a safe missing-record label. Unit names stay. */
export const ID_PATTERN = /\b[BPRIC]\d{3}\b/g;
export function text(ctx, s) { return s == null ? s : String(s).replace(ID_PATTERN, (id) => ctx.names[id] || S.recordMissing); }
export const reasonLabel = (r) => S.attention.reviewReason[r.reason] || r.reason || S.attention.review;
export const statusClass = (s) => 'st-' + String(s).replace(/\s+/g, '-').replace(/_/g, '-');

export function selectCtl(name, label, options, value, { disabled = false } = {}) {
  const opts = options.map((o) => `<option value="${h(o.value)}"${String(o.value) === String(value ?? '') ? ' selected' : ''}>${h(o.label)}</option>`).join('');
  return `<label class="ctl"><span class="ctl__label">${h(label)}</span><select class="ctl__select" data-filter="${h(name)}"${disabled ? ' disabled' : ''}>${opts}</select></label>`;
}

export function section(title, body, { id = '', cls = '' } = {}) {
  return `<section class="sec${cls ? ' ' + cls : ''}"${id ? ` id="${h(id)}" data-section="${h(id)}"` : ''}>${title ? `<h2 class="sec__title">${h(title)}</h2>` : ''}${body}</section>`;
}

export function asOfText(ctx) {
  return t(S.asOf, { datetime: F.datetime(ctx.rd.meta.as_of, ctx.rd.meta.reporting_timezone), tz: F.tzLabel(ctx.rd.meta.reporting_timezone) });
}

export function weekOptions(ctx) {
  return ctx.rd.scope.weeks.map((w) => ({ value: w.index, label: w.complete ? F.range(w.start, w.end) : `${F.range(w.start, w.through)}, ${S.pace.partial}` }));
}

// ---------------------------------------------------------------- masthead, intro, footer

export function masthead(ctx, links) {
  const prop = ctx.rd.scope.property;
  const items = links.map((l) => `<li><a href="${h(l.href)}"${l.key === ctx.reportKey ? ' aria-current="page"' : ''}>${h(l.label)}</a></li>`).join('');
  // The invented-data label appears only on training pages, never on live ones.
  const training = ctx.rd.meta.mode === 'training' ? `<div class="training" role="note">${h(S.trainingLabel)}</div>\n  ` : '';
  return `${training}<header class="mast">
    <a class="mast__prop" href="${h(links[0].href)}">${h(prop.name)}</a>
    <details class="mast__menu"><summary>${h(S.nav.label)}</summary><nav aria-label="${h(S.nav.label)}"><ul>${items}</ul></nav></details>
  </header>`;
}

/** Title and as-of line; a hidden slot for the property photo when the operator supplies one. */
export function intro(ctx, { title, sub = '' } = {}) {
  const n = ctx.narrative;
  const rep = S.reports[ctx.reportId] || {};
  // A filtered view never shows the default narrative as if it described the new numbers.
  if (ctx.filtered) { title = title && !(n && title === n.headline) ? title : rep.title; sub = ''; }
  const cov = ctx.rd.scope.coverage;
  const meta = [rep.title, asOfText(ctx)].join(' / ');
  const diag = ctx.rd.diagnostics.filter((x) => x.code === 'records_need_check').length;
  return `<section class="intro" data-section="intro">
    <figure class="photo" hidden></figure>
    <p class="intro__meta meta">${h(meta)}</p>
    <h1 class="intro__title">${h(title || (n && n.headline) || rep.title)}</h1>
    ${sub ? `<p class="intro__sub">${sub}</p>` : ''}
    <p class="stale" id="stale" hidden data-asof="${h(ctx.rd.meta.as_of)}" data-hours="${h(ctx.rd.scope.settings.snapshot_stale_hours ?? '')}">${h(t(S.staleBanner, { hours: ctx.rd.scope.settings.snapshot_stale_hours, datetime: `${F.datetime(ctx.rd.meta.as_of, ctx.rd.meta.reporting_timezone)}, ${F.tzLabel(ctx.rd.meta.reporting_timezone)}` }))}</p>
    ${diag ? `<p class="check">${h(S.recordsNeedCheck)}: ${h(t(S.limitations.diagnostics, { n: diag }))}</p>` : ''}
    <span class="sr">${h(t(S.coverageLine, { sheet: F.date((cov.sheet || {}).covered_through, { year: true }), campaigns: F.date(cov.campaigns_through, { year: true }) }))}</span>
  </section>`;
}

/** One row of big numbers. Each may link to the page that explains it. */
export function numbers(ctx, list) {
  return `<dl class="numbers" style="--count:${list.length}" data-section="numbers">${list.map((n) => {
    const text = /[a-z]{3,}/i.test(n.value) && !/^\$/.test(n.value);
    return `<div class="num"><dt class="num__label">${h(n.label)}</dt><dd class="num__value${text ? ' is-text' : ''}">${h(n.value)}</dd></div>`;
  }).join('')}</dl>`;
}

export function footer(ctx) {
  return `<footer class="foot">
    <details class="more" data-static="card"><summary>${h(S.card.title)}</summary>
      <div class="card" data-section="card">${cardSvg(ctx)}</div>
    </details>
  </footer>`;
}

export function cardPart(ctx) { return `<div class="card" data-section="card">${cardSvg(ctx)}</div>`; }

// ---------------------------------------------------------------- units grid

export function unitsGrid(ctx, { highlight = [] } = {}) {
  const units = ctx.d.unitList.filter((u) => u.tracking_scope === 'tracked');
  const buildings = [...new Set(units.map((u) => u.building))];
  const labels = Object.fromEntries((ctx.rd.scope.property.buildings || []).map((b) => [b.building, b.label]));
  const hl = new Set(highlight);
  const groups = buildings.map((b) => {
    const list = units.filter((u) => u.building === b).sort((a, z) => a.display_order - z.display_order);
    const name = b ? `${t(S.building, { n: b })}${labels[b] ? `, ${labels[b]}` : ''}` : S.locationNotSupplied;
    return `<div class="bldg"><h3 class="bldg__name">${h(name)}</h3><ul class="cells">${list.map((u) =>
      `<li><button type="button" class="cell ${statusClass(u.status)}${hl.has(u.unit_id) ? ' is-hl' : ''}" data-open="unit" data-id="${h(u.unit_id)}"><span class="cell__name">${h(u.unit_id)}</span><span class="cell__status">${h(F.statusLabel(u.status))}</span></button></li>`).join('')}</ul></div>`;
  }).join('');
  const u = unitsLine(ctx.rd);
  return `${groups}<p class="note">${h(u.line)}. ${h(u.earlier)}.</p>`;
}

// ---------------------------------------------------------------- lines: changes and attention

export function changeLines(ctx, max = 5) {
  const ch = ctx.rd.changes;
  if (!ch || ch.status === 'no_baseline') return `<p class="lede">${h(S.firstRun)}</p>`;
  const nameOf = (id) => ctx.names[id] || id;
  const label = (v) => (S.stage[v] ? F.stageLabel(v) : F.statusLabel(v));
  const rows = ch.rows.slice(0, max).map((r) => `<li>${h(t(S.changes[r.kind] || r.kind, {
    person: nameOf(r.person_id), survivor: nameOf(r.survivor), unit: r.unit_id, from: label(r.from), to: label(r.to),
    review: (ctx.rd.reviews.find((x) => x.review_id === r.review_id) || {}).question || '', ref: r.unit_id || nameOf(r.person_id) || '',
  }))}</li>`).join('');
  const more = ch.rows.length > max ? `<p class="note">${h(t(S.changes.more, { n: ch.rows.length - max }))}</p>` : '';
  return `${rows ? `<ul class="lines">${rows}</ul>` : `<p class="lede">${h(S.changes.none)}</p>`}${more}<p class="note">${h(t(S.comparing, { previous: F.datetime(ch.previous_as_of, ctx.rd.meta.reporting_timezone), current: F.datetime(ch.current_as_of, ctx.rd.meta.reporting_timezone) }))}</p>`;
}

const PRIORITY = ['records_need_check', 'overdue', 'review', 'partner_overdue', 'stale', 'missing_attribution', 'undated_buyer', 'unknown_date'];

function attentionRow(ctx, r) {
  const line = (main, meta = '') => `<li>${h(main)}${meta ? `<span class="lines__meta">${h(meta)}</span>` : ''}</li>`;
  switch (r.kind) {
    case 'overdue': return line(`${who(ctx, r.person_id)}: ${text(ctx, r.next_step) || S.attention.noStep}`, t(S.attention.dueOn, { date: F.date(r.due) }));
    case 'stale': return line(`${who(ctx, r.person_id)}: ${text(ctx, r.next_step) || S.attention.noStep}`, t(S.attention.stale, { n: r.age }));
    case 'review': return line(text(ctx, r.question) || reasonLabel(r), reasonLabel(r));
    case 'missing_attribution': return line(who(ctx, r.person_id), S.attention.missing_attribution);
    case 'undated_buyer': return line(who(ctx, r.person_id), S.attention.undated_buyer);
    case 'unknown_date': return line(r.person_id ? who(ctx, r.person_id) : S.attention.unknown_date, S.attention.unknown_date);
    case 'partner_overdue': return line(`${who(ctx, r.partner_id)}: ${text(ctx, r.next_step) || ''}`, t(S.attention.dueOn, { date: F.date(r.due) }));
    case 'records_need_check': return line(`${text(ctx, r.ref)}: ${t(S.unitDrawer.recordsCheck, { sheet: text(ctx, F.statusLabel(r.detail.sheet)), reconstructed: text(ctx, F.statusLabel(r.detail.reconstructed)) })}`);
    default: return '';
  }
}

/** Three lines that matter most: Claude's attention bullets, or the three highest-priority records. The rest is one tap deeper. */
export function attentionLines(ctx) {
  const rows = M.attentionRows(ctx.rd, {}).sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || String(a.due || '').localeCompare(String(b.due || '')));
  const n = ctx.narrative;
  const top = n && n.attention && n.attention.length
    ? n.attention.slice(0, 3).map((x) => `<li>${h(x)}</li>`).join('')
    : rows.slice(0, 3).map((r) => attentionRow(ctx, r)).join('');
  if (!top) return `<p class="lede">${h(S.attention.none)}</p>`;
  const more = rows.length ? `<details class="more"><summary>${h(t(S.attention.show, { n: rows.length }))}</summary><ul class="lines">${rows.map((r) => attentionRow(ctx, r)).join('')}</ul></details>` : '';
  return `<ul class="lines">${top}</ul>${more}`;
}

// ---------------------------------------------------------------- tables

/**
 * A table that becomes labeled rows on a phone. cols: [{key, label, num, sort}].
 * Sortable headers set state.sort; the page re-renders through the same function.
 */
export function table(ctx, cols, rows, { caption = '', sortKey = null } = {}) {
  const head = cols.map((c) => {
    const lbl = c.sort ? `<button type="button" class="sort" data-sort="${h(c.sort)}" aria-pressed="${sortKey === c.sort}">${h(c.label)}</button>` : h(c.label);
    return `<th scope="col"${c.num ? ' class="num-col"' : ''}${c.sort && sortKey === c.sort ? ' aria-sort="descending"' : ''}>${lbl}</th>`;
  }).join('');
  const body = rows.map((r) => `<tr${r.open ? ` data-open="${h(r.open.kind)}" data-id="${h(r.open.id)}" tabindex="0" role="button"` : ''}${r.cls ? ` class="${r.cls}"` : ''}>${cols.map((c, i) => {
    const tag = i === 0 ? 'th scope="row"' : 'td';
    return `<${tag} data-label="${h(c.label)}"${c.num ? ' class="num-col"' : ''}>${r.cells[c.key] ?? ''}</${i === 0 ? 'th' : 'td'}>`;
  }).join('')}</tr>`).join('');
  return `<table class="tbl">${caption ? `<caption class="sr">${h(caption)}</caption>` : ''}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** On a phone the header row is hidden, so sorting moves to one select. */
export function phoneSort(ctx, options) {
  return `<div class="sortbar sortbar--phone">${selectCtl('sort', S.filters.sort, options, ctx.state.sort)}</div>`;
}

// ---------------------------------------------------------------- drawers

/** What the unit is, then where it stands, then what happened to it. */
export function drawerUnit(ctx, id) {
  const u = ctx.d.units.get(id);
  if (!u || u.tracking_scope !== 'tracked') return { title: t(S.unitDrawer.title, { unit: id }), sub: S.board.historyUnavailable, body: '' };
  const statusEvents = ctx.rd.events.filter((e) => e.unit_id === id && e.unit_status);
  const activity = ctx.rd.events.filter((e) => e.unit_id === id && !e.unit_status && ['inquiry', 'unit_interest', 'tour_booked', 'tour_completed', 'hold_requested', 'hold_accepted', 'hold_released'].includes(e.kind));
  const dom = M.daysOnMarket(ctx.rd, {}).value[id];
  const published = new Set(ctx.rd.published_buyers || []);
  let holder = h(S.unitDrawer.noHolder);
  if (u.holder_person_id) holder = published.has(u.holder_person_id) ? `<a href="buyers/${h(u.holder_person_id)}.html">${h(who(ctx, u.holder_person_id))}</a>` : `${h(who(ctx, u.holder_person_id))}<span class="lines__meta">${h(S.unitDrawer.buyerBriefOnRequest)}</span>`;
  const facts = [
    [S.filters.status, `<span class="chip ${statusClass(u.status)}" aria-hidden="true"></span>${h(F.statusLabel(u.status))}`],
    [S.unitDrawer.holder, holder],
    [S.unitDrawer.price, h(u.list_price_cents != null ? `${F.usd(u.list_price_cents)} ${S.usd}` : S.reasons.not_recorded)],
    [S.unitDrawer.size, h(F.unitArea(u))],
    [S.unitDrawer.listed, h(u.listed_date ? `${F.date(u.listed_date, { year: true })}, ${t(S.units.days, { n: dom && dom.days != null ? dom.days : '' })}` : S.reasons.not_recorded)],
  ];
  if (u.deposit_date) facts.push([S.unitDrawer.deposit, h(F.date(u.deposit_date, { year: true }))]);
  const item = (e, what) => `<li>${what}<span class="lines__meta">${h(e.occurred_date ? F.date(e.occurred_date, { year: true }) : S.eventUnknownTime)}</span><span class="credit">${h(F.credit(e, { withDate: false }))}</span></li>`;
  const hist = statusEvents.length ? `<ul class="lines">${statusEvents.map((e) => item(e, `${h(F.statusLabel(e.unit_status))}${e.person_id ? `, ${h(who(ctx, e.person_id))}` : ''}`)).join('')}</ul>` : `<p>${h(S.unitDrawer.noHistory)}</p>`;
  const act = activity.length ? `<ul class="lines">${activity.map((e) => item(e, `${h(S.event[e.kind] || e.kind)}${e.person_id ? `, ${h(who(ctx, e.person_id))}` : ''}`)).join('')}</ul>` : `<p>${h(S.unitDrawer.noActivity)}</p>`;
  const check = u.mismatch ? `<p class="check">${h(S.recordsNeedCheck)}: ${h(t(S.unitDrawer.recordsCheck, { sheet: text(ctx, F.statusLabel(u.mismatch.sheet)), reconstructed: text(ctx, F.statusLabel(u.mismatch.reconstructed)) }))}</p>` : '';
  return {
    title: t(S.unitDrawer.title, { unit: id }),
    sub: F.unitPlace(u),
    body: `${check}<dl class="facts">${facts.map(([k, v]) => `<dt>${h(k)}</dt><dd>${v}</dd>`).join('')}</dl><h3>${h(S.unitDrawer.history)}</h3>${hist}<h3>${h(S.unitDrawer.activity)}</h3>${act}`,
  };
}

export const sharedDrawers = { unit: drawerUnit };
