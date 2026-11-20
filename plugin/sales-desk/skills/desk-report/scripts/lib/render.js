// Turns report data plus narrative into page HTML from the fixed templates (Node only).
// Each page is one self-contained file: data, CSS, fonts, and code inline.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from './metrics.js';
import { S } from './strings.js';
import { esc } from './format.js';
import { bundle } from './inline.js';
import { makeCtx, masthead, footer } from '../templates/components.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
export const TEMPLATE_VERSION = '1.0.0';

export const REPORTS = {
  'source-to-sale': { template: 'templates/source-to-sale.js', path: 'source-to-sale.html', audience: 'The developer and the sales lead', cadence: 'weekly' },
  'closed-lost': { template: 'templates/closed-lost.js', path: 'closed-lost.html', audience: 'The developer and the sales lead', cadence: 'weekly' },
  'buyer-segments': { template: 'templates/buyer-segments.js', path: 'buyer-segments.html', audience: 'The developer and the sales lead', cadence: 'weekly' },

  'sales-pulse': { template: 'templates/sales-pulse.js', path: 'index.html', audience: 'The developer, the sales lead, the operator, and the developer’s named team', cadence: 'daily' },
  'demand-and-ads': { template: 'templates/demand-and-ads.js', path: 'demand-and-ads.html', audience: 'The developer, the sales lead, the operator, and the named ad operator', cadence: 'weekly' },
  'partner-network': { template: 'templates/partner-network.js', path: 'partner-network.html', audience: 'The sales lead, the operator, and the developer', cadence: 'weekly' },
  'unit-interest': { template: 'templates/unit-interest.js', path: 'unit-interest.html', audience: 'The developer and the sales lead', cadence: 'weekly' },
  'owner-brief': { template: 'templates/owner-brief.js', path: 'owner-brief.html', audience: 'The developer and the named ownership team', cadence: 'daily' },
  'buyer-brief': { template: 'templates/buyer-brief.js', path: 'buyers/{id}.html', audience: 'The sales lead, the operator, and the team member conducting the visit', cadence: 'on demand' },
  'custom.spend-vs-closings': { template: 'templates/custom-spend-vs-closings.js', path: 'custom/spend-vs-closings.html', audience: 'The sales lead and the operator', cadence: 'on demand' },
};

export function reportIdOf(key) { return key.startsWith('buyer-brief.') ? 'buyer-brief' : key; }
export function pathOf(key) { const id = reportIdOf(key); return REPORTS[id].path.replace('{id}', key.split('.')[1]); }

let assetCache = null;
export function assets() {
  if (assetCache) return assetCache;
  const font = (file, family, weight = '400') => `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${readFileSync(resolve(ROOT, 'styles/fonts', file)).toString('base64')}) format("woff2");font-weight:${weight};font-style:normal;font-display:swap;}`;
  const fontCss = font('Marcellus-Regular.woff2', 'Marcellus') + font('PontanoSans.woff2', 'Pontano Sans', '400 600');
  const css = readFileSync(resolve(ROOT, 'styles/tokens.css'), 'utf8') + '\n' + readFileSync(resolve(ROOT, 'styles/report.css'), 'utf8');
  assetCache = { fontCss, css, bundles: new Map(), templates: new Map() };
  return assetCache;
}

export async function loadTemplate(reportId) {
  const a = assets();
  if (!a.templates.has(reportId)) a.templates.set(reportId, (await import(resolve(ROOT, REPORTS[reportId].template))).default);
  return a.templates.get(reportId);
}

function pageBundle(reportId) {
  const a = assets();
  if (!a.bundles.has(reportId)) a.bundles.set(reportId, bundle([resolve(ROOT, REPORTS[reportId].template), resolve(ROOT, 'templates/client.js')]));
  return a.bundles.get(reportId);
}

/**
 * The second allowlist, applied after calculation: what one page may embed.
 * Buyer briefs embed only that buyer's records, related agents, and public inventory facts.
 */
export function projectForPage(rd, key) {
  const reportId = reportIdOf(key);
  const base = {
    schema_version: rd.schema_version, schema: rd.schema, meta: rd.meta, scope: rd.scope, definitions: rd.definitions,
    entities: rd.entities, events: rd.events, reviews: rd.reviews, delivery: rd.delivery, diagnostics: rd.diagnostics,
    changes: rd.changes, reports: rd.reports, published_buyers: rd.published_buyers,
    narrative: { [key]: (rd.narrative || {})[key] || null },
    metrics: Object.fromEntries(Object.entries(rd.metrics).filter(([k]) => k.startsWith(key + '.'))),
  };
  if (reportId !== 'buyer-brief') return base;
  const id = key.split('.')[1];
  const d = M.derive(rd);
  const buyer = rd.entities.buyers.find((b) => b.person_id === id);
  const events = rd.events.filter((e) => e.person_id === id);
  const partnerIds = new Set([buyer.referring_partner_id, ...events.map((e) => e.partner_id)].filter(Boolean));
  const reviews = rd.reviews.filter((r) => r.person_id === id || r.candidate_ids.includes(id))
    .map((r) => ({ ...r, candidate_ids: r.candidate_ids.filter((c) => c === id || partnerIds.has(c)) }));
  const units = rd.entities.units.map((u) => {
    if (u.tracking_scope !== 'tracked') return u;
    // Finalized public inventory state from the full run; the buyer's filtered timeline cannot change it.
    const cur = d.units.get(u.unit_id);
    const mine = cur.holder_person_id === id;
    return { ...u, sheet_status: null, sheet_holder: null, sheet_deposit_date: null,
      final_status: cur.status, final_holder: mine ? id : null, final_deposit_date: mine ? cur.deposit_date : null };
  });
  return {
    ...base,
    entities: { units, buyers: [buyer], partners: rd.entities.partners.filter((p) => partnerIds.has(p.partner_id)), campaigns: [] },
    events, reviews, delivery: [],
    diagnostics: rd.diagnostics.filter((x) => x.ref === id),
    changes: rd.changes && rd.changes.rows ? { ...rd.changes, rows: rd.changes.rows.filter((r) => r.person_id === id) } : rd.changes,
    reports: rd.reports.filter((r) => r.key === key || !r.key.startsWith('buyer-brief.')),
    published_buyers: [id],
  };
}

export async function renderPage(pageData, key) {
  const reportId = reportIdOf(key);
  const template = await loadTemplate(reportId);
  const ctx = makeCtx(pageData, key);
  const depth = pathOf(key).split('/').length - 1;
  const up = '../'.repeat(depth);
  const links = pageData.reports.filter((r) => REPORTS[r.report_id].cadence !== 'on demand').map((r) => ({ key: r.key, href: up + r.path, label: r.nav }));
  const a = assets();
  const b = pageBundle(reportId);
  const json = JSON.stringify(pageData).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const title = `${S.reports[reportId].title} / ${pageData.scope.property.name}`;
  let main = template.layout(ctx);
  if (depth) main = main.replace(/href="(index|demand-and-ads|owner-brief|unit-interest|partner-network)\.html/g, `href="${up}$1.html`).replace(/href="buyers\//g, `href="${up}buyers/`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style id="fonts">${a.fontCss}</style>
<style>${a.css}</style>
</head>
<body class="${esc(template.bodyClass || '')}" data-report="${esc(key)}">
${masthead(ctx, links)}
<main id="main">
${main}
</main>
${footer(ctx)}
<dialog class="drawer" id="drawer" aria-labelledby="drawer-title">
  <div class="drawer__head"><div><h2 class="drawer__title" id="drawer-title"></h2><p class="drawer__sub" id="drawer-sub"></p></div><button type="button" class="drawer__close" data-action="close" aria-label="${esc(S.drawer.close)}">&times;</button></div>
  <div class="drawer__body" id="drawer-body"></div>
</dialog>
<script type="application/json" id="report-data">${json}</script>
<script>
${b.code}
window.__SD.client.boot({ template: window.__SD[${JSON.stringify(REPORTS[reportId].template.replace(/^templates\//, '').replace(/\.js$/, ''))}].default, reportKey: ${JSON.stringify(key)} });
</script>
</body>
</html>
`;
}
