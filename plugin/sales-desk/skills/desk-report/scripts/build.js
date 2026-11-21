#!/usr/bin/env node
// Sales desk report build.
//
//   node build.js --snapshot <file> --narrative <file> --previous <file|none> --out <dir>
//                 [--buyers B003,B010] [--custom spend-vs-closings]
//
// With no arguments it runs the training build: the seed adapter supplies the
// snapshot, fixtures/narrative-training.json supplies the narrative, there is no
// previous report, and pages go to out/public/.
//
// Order: validate and compute -> validate narrative -> render every page -> privacy
// guard on every embedded data set and page -> write. Any failure writes nothing.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import * as M from './lib/metrics.js';
import * as F from './lib/format.js';
import { S } from './lib/strings.js';
import { validateNarrative } from './lib/narrative.js';
import { REPORTS, TEMPLATE_VERSION, projectForPage, renderPage, pathOf, reportIdOf } from './lib/render.js';
import { scanData, scanPageText, scanIds, checkCard, checkStatus, PrivacyError } from './lib/privacy.js';
import { makeCtx } from './templates/components.js';
import { cardSvg } from './lib/card.js';
import liveTarget from './lib/live-target.cjs';
import publicationTarget from './lib/publication-target.cjs';
import sanitizer from './lib/sanitize.cjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STANDING = ['sales-pulse', 'demand-and-ads', 'partner-network', 'unit-interest', 'owner-brief'];
// Source to sale, Closed Lost Insights and Buyer Segment Insights are drafts (Andie, Nov 19): off the standing set until their data is recorded.

export class BuildError extends Error {}

/** Compute report-data.json (without narrative) from a snapshot. */
export function computeReportData(snapshot, { previous = null, buyers = [], customs = [], runId, target, provenance } = {}) {
  liveTarget.assertLiveTarget({mode:snapshot.mode,target,provenance,content:snapshot});
  if(snapshot.mode==='training'&&provenance&&(provenance.mode!=='training'||provenance.sheet_id!==publicationTarget.TRAINING_SHEET||provenance.status!=='ok'||provenance.origin!=='google-sheets'))throw new BuildError('Training source receipt does not match the training sheet and read time.');
  if(snapshot.mode==='live'&&(!snapshot.sources?.some(s=>s.kind==='sheet')||snapshot.sources.filter(s=>s.kind==='sheet').some(s=>s.source_id!==target.sheet_id||s.retrieved_at!==provenance.retrieved_at)||snapshot.as_of!==provenance.retrieved_at))throw new BuildError('Live export source must match its sheet read receipt and completed time.');
  const model = M.buildModel(sanitizer.sanitizeReportSnapshot(snapshot));
  const known = new Set(model.entities.buyers.map((b) => b.person_id));
  for (const b of buyers) if (!known.has(b)) throw new BuildError(`buyer brief requested for unknown buyer ${b}`);
  for (const c of customs) if (!REPORTS[`custom.${c}`]) throw new BuildError(`custom report ${c} is not in the registry; add its rule and tests before requesting it`);
  const keys = [...STANDING, ...buyers.map((b) => `buyer-brief.${b}`), ...customs.map((c) => `custom.${c}`)];
  const changes = M.changes(model, previous);
  const metrics = {};
  const periods = {};
  for (const key of keys) {
    const reportId = reportIdOf(key);
    const res = M.computeReport(model, reportId, M.defaultFilters(model, reportId), { personId: key.split('.')[1], changes });
    for (const [id, r] of Object.entries(res)) {
      if (!r || id === 'changes') continue;
      metrics[`${key}.${id}`] = { ...r, display: F.display(r) };
    }
    periods[key] = reportPeriod(model, key, res);
  }
  const c = M.unitCount(model).value;
  const names = Object.fromEntries([...model.entities.partners.map((p) => [p.partner_id, p.name])]);
  const events = model.events.map((e) => ({ ...e, description: F.eventDescription(e, names) }));
  // An opaque random token: nothing from the snapshot text can reach the public status.json.
  const run = runId || `r-${randomBytes(8).toString('hex')}`;
  const reports = keys.map((key) => {
    const reportId = reportIdOf(key);
    const def = REPORTS[reportId];
    const tmplParts = { 'sales-pulse': ['intro', 'lead', 'board', 'pace', 'pipeline', 'changes', 'attention', 'limitations', 'card'] }[reportId];
    return {
      key, report_id: reportId, title: S.reports[reportId].title, nav: reportId === 'buyer-brief' ? (model.entities.buyers.find((x) => x.person_id === key.split('.')[1]) || {}).name || S.reports[reportId].short : S.reports[reportId].short,
      path: pathOf(key), audience: def.audience, cadence: def.cadence, period: periods[key],
      component_ids: tmplParts || null, default_filters: M.defaultFilters(model, reportId),
      supported_filters: Object.keys(M.defaultFilters(model, reportId)),
      headline_metric_refs: Object.keys(metrics).filter((k) => k.startsWith(key + '.')),
      card_metric_refs: CARD_REFS[reportId].map((id) => `${key}.${id}`),
    };
  });
  return {
    schema_version: 'sales-desk-report-v1',
    schema: model.schema,
    meta: { ...model.meta, sheet_id: provenance?.sheet_id || snapshot.sources.find(s=>s.kind==='sheet')?.source_id, run_id: run, computed_at: new Date().toISOString(), template_version: TEMPLATE_VERSION,
      comparison_as_of: changes.previous_as_of, snapshot_stale_hours: model.scope.settings.snapshot_stale_hours },
    scope: { ...model.scope, currency: 'USD', unit_counts: { total: c.development_total, tracked: c.tracked, historical: c.sold_before_tracking },
      limitations: model.diagnostics.filter((d) => d.level !== 'info').map((d) => ({ code: d.code, ref: d.ref })) },
    definitions: Object.fromEntries(M.REGISTRY.map((d) => [d.id, { ...d, label: (S.metricLabels && S.metricLabels[d.id]) || d.id }])),
    entities: model.entities,
    events,
    reviews: model.reviews,
    delivery: model.delivery,
    diagnostics: model.diagnostics,
    metrics,
    changes,
    reports,
    published_buyers: buyers,
  };
}

const CARD_REFS = {
  'source-to-sale': ['revenue_insights'],
  'closed-lost': ['revenue_insights'],
  'buyer-segments': ['revenue_insights'],
  'sales-pulse': ['remaining_to_secure', 'four_week_absorption', 'projected_sellout', 'secured_value'],
  'demand-and-ads': ['spend', 'platform_leads', 'cost_per_platform_lead', 'deposit_buyers'],
  'partner-network': ['partner_activity', 'accepted_referrals'],
  'unit-interest': ['remaining_to_secure', 'unit_inquiries', 'unit_tours', 'unit_holds'],
  'owner-brief': ['remaining_to_secure', 'four_week_absorption', 'projected_sellout', 'secured_value', 'tour_buyers'],
  'buyer-brief': ['buyer_units_of_interest', 'unit_tours', 'open_reviews'],
  'custom.spend-vs-closings': ['spend', 'platform_leads', 'closings_by_partner'],
};

function reportPeriod(model, key, res) {
  const id = reportIdOf(key);
  if (id === 'demand-and-ads' || id === 'custom.spend-vs-closings') return { start: res.spend.period_start, end: res.spend.period_end };
  if (id === 'owner-brief') return { start: res.tour_buyers.period_start, end: res.tour_buyers.period_end };
  return null;
}

/** Validate and expand every report's narrative. Throws with every error found. With no narrative, pages render without it. */
export function applyNarrative(rd, narrative) {
  if (narrative == null) return { ...rd, narrative: {} };
  // Spec 02: dates and unit IDs may be written plainly. Buyers, agents, and reviews appear by name or description.
  const knownIds = new Set(rd.entities.units.map((u) => u.unit_id));
  const errors = [];
  const out = {};
  for (const r of rd.reports) {
    if (narrative && typeof narrative === 'object') delete narrative._note;
    const res = validateNarrative((narrative || {})[r.key], { reportKey: r.key, metrics: rd.metrics, period: r.period, knownIds });
    errors.push(...res.errors);
    out[r.key] = res.expanded;
  }
  if (errors.length) throw new BuildError(`Narrative check failed:\n  ${errors.join('\n  ')}`);
  return { ...rd, narrative: out };
}

/** Render every page and run the privacy guard. Returns files to write; writes nothing. */
export async function renderAll(rd) {
  const files = [];
  const findings = [...scanData(rd, 'report-data.json')];
  for (const r of rd.reports) {
    const data = projectForPage(rd, r.key);
    findings.push(...scanData(data, r.path));
    const html = await renderPage(data, r.key);
    findings.push(...scanPageText(html).map((f) => ({ ...f, path: `${r.path} ${f.path}` })));
    findings.push(...scanIds(html, r.path, data.entities.units.map(u=>u.unit_id)));
    // The card is checked on its own: it can be forwarded outside the protected site.
    const cardCtx = makeCtx(data, r.key);
    const names = [...rd.entities.buyers.map((b) => b.name), ...rd.entities.partners.map((p) => p.name)];
    findings.push(...checkCard(cardSvg(cardCtx), { names, allowIds: cardCtx.personId ? [cardCtx.personId] : [] }, `${r.path} card`));
    files.push({ path: join('public', r.path), content: html });
  }
  const status = { run_id: rd.meta.run_id, as_of: rd.meta.as_of };
  findings.push(...checkStatus(status));
  files.push({ path: join('public', 'status.json'), content: JSON.stringify(status) + '\n' });
  files.push({ path: join('data', 'report-data.json'), content: JSON.stringify(rd, null, 1) });
  if (findings.length) throw new PrivacyError(findings);
  return files;
}

/** The compute step: report-data.json for Claude to write the narrative against, privacy-scanned. */
export function computeOnly({ snapshot, previous = null, outDir, buyers = [], customs = [], write = true, target, provenance, inputPaths=[] }) {
  liveTarget.assertLiveTarget({mode:snapshot.mode,target,provenance,content:{snapshot,previous},paths:inputPaths});
  const rd = computeReportData(snapshot, { previous, buyers, customs, target, provenance });
  const findings = scanData(rd, 'report-data.json');
  if (findings.length) throw new PrivacyError(findings);
  if (write) { mkdirSync(join(outDir, 'data'), { recursive: true }); writeFileSync(join(outDir, 'data', 'report-data.json'), JSON.stringify(rd, null, 1)); }
  return rd;
}

export async function build({ snapshot, narrative, previous = null, outDir, buyers = [], customs = [], write = true, target, provenance, inputPaths=[] }) {
  liveTarget.assertLiveTarget({mode:snapshot.mode,target,provenance,content:{snapshot,narrative,previous},paths:inputPaths});
  let rd = computeReportData(snapshot, { previous, buyers, customs, target, provenance });
  rd = applyNarrative(rd, narrative);
  const files = await renderAll(rd);
  const sheet_id=provenance?.sheet_id||snapshot.sources.find(s=>s.kind==='sheet')?.source_id;
  const source=publicationTarget.sourceManifest({mode:snapshot.mode,sheet_id,run_id:rd.meta.run_id,as_of:rd.meta.as_of});
  const sourceFindings=scanData(source,'source.json');if(sourceFindings.length)throw new PrivacyError(sourceFindings);
  files.push({path:join('public','source.json'),content:JSON.stringify(source)+'\n'});
  if(snapshot.mode==='live')for(const file of files){
    if(file.path.endsWith('.html'))file.content=file.content.replaceAll('Training data, invented','');
    if(liveTarget.BLOCKED.some(id=>file.content.includes(id))||/Training data, invented|>Practice<|>Fictional</i.test(file.content))throw new BuildError('Live output retained a non-live label or destination.');
    liveTarget.scanLive(file.path.endsWith('.json')?JSON.parse(file.content):file.content.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,''));
  }
  if (write) {
    for (const f of files) {
      const p = join(outDir, f.path);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, f.content);
    }
  }
  return { rd, files };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const snapPath = arg('snapshot', null);
  const training = !snapPath;
  const targetPath=arg('target',null),provenancePath=arg('provenance',null);
  const target=targetPath?JSON.parse(readFileSync(targetPath,'utf8')):undefined;
  const provenance=provenancePath?JSON.parse(readFileSync(provenancePath,'utf8')):undefined;
  if(target?.mode==='live')liveTarget.checkPaths([snapPath,targetPath,provenancePath,arg('narrative',null),arg('previous',null)]);
  if(training&&target?.mode==='live')throw new BuildError('Live builds require an explicit completed sheet export.');
  const snapshot = training ? (await import('./adapters/seed.js')).seedSnapshot() : JSON.parse(readFileSync(snapPath, 'utf8'));
  const narrArg = arg('narrative', training ? resolve(HERE, 'fixtures/narrative-training.json') : 'none');
  const narrative = narrArg === 'none' ? null : JSON.parse(readFileSync(narrArg, 'utf8'));
  const prevArg = arg('previous', 'none');
  const previous = prevArg && prevArg !== 'none' && existsSync(prevArg) ? JSON.parse(readFileSync(prevArg, 'utf8')) : null;
  if (prevArg && prevArg !== 'none' && !previous) throw new BuildError(`previous report data not found: ${prevArg}`);
  const inputPaths=[snapPath,targetPath,provenancePath,narrArg,prevArg];
  const outDir = resolve(arg('out', resolve(HERE, 'out')));
  const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const buyers = list(arg('buyers', training ? 'B003' : ''));
  const customs = list(arg('custom', training ? 'spend-vs-closings' : ''));
  if (training) { mkdirSync(join(outDir, 'data'), { recursive: true }); writeFileSync(join(outDir, 'data', 'snapshot-training.json'), JSON.stringify(snapshot, null, 1)); }
  if (process.argv.includes('--compute-only')) {
    const rd = computeOnly({ snapshot, previous, outDir, buyers, customs, target, provenance, inputPaths });
    process.stdout.write(`Computed ${rd.reports.length} reports for ${rd.meta.run_id} (as of ${rd.meta.as_of}) into ${join(outDir, 'data', 'report-data.json')}\n`);
    return;
  }
  const { rd, files } = await build({ snapshot, narrative, previous, outDir, buyers, customs, target, provenance, inputPaths });
  process.stdout.write(`Built ${files.filter((f) => f.path.endsWith('.html')).length} pages for ${rd.meta.run_id} (as of ${rd.meta.as_of}) into ${outDir}\n`);
  for (const f of files) process.stdout.write(`  ${f.path}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
