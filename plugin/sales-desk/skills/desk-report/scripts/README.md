# Sales desk reports

The report system specified in [../specs/02-reports-spec.md](../specs/02-reports-spec.md), built against the training seed. It has no runtime dependencies: plain Node computes and renders, and every page is one self-contained HTML file that works offline.

## Run it

Run these from the folder that contains `reports/`.

```sh
node --test reports/test              # 100 tests
node reports/build.js                 # training build: seed -> reports/out/public/*.html, status.json, out/data/report-data.json
```

The report skill makes two calls, with the same snapshot and page list in both:

```sh
# 1. Compute. Writes a privacy-scanned <out>/data/report-data.json and no pages.
node reports/build.js --compute-only --snapshot snapshot.json --previous <previous report-data.json | none> --out <out> \
  [--buyers B003,B010] [--custom spend-vs-closings]

# 2. Render. Claude's narrative goes in --narrative (or none). Writes <out>/public/ and <out>/data/report-data.json.
node reports/build.js --snapshot snapshot.json --narrative narrative.json --previous <previous report-data.json | none> --out <out> \
  [--buyers B003,B010] [--custom spend-vs-closings]
```

Live calls must add `--target work/target.json --provenance work/provenance.json` to both commands. The independent target is `{mode:"live",sheet_id:<fresh verified pinned/configured live sheet ID>}`; the actual completed read receipt is `{kind:"sheet",origin:"google-sheets",mode:"live",sheet_id:<actual ID>,status:"ok",retrieved_at:<offset ISO>}`. The snapshot's sheet source_id must match that ID, and sheet retrieved_at/as_of must match the receipt. API builds require the same `target` and `provenance` arguments. Missing/mixed receipts, seed/fixture/training origins or input paths, known old destinations stop before writes. Live calls never load the seed adapter. Metric logic and forbidden-field/contact protections remain unchanged. Names and ordinary record IDs do not establish provenance.

`--narrative none` renders pages without narrative. With no `--snapshot`, the build uses the training seed, the training narrative, buyer B003, and the custom report. Any failure exits non-zero and writes nothing: an invalid or failed snapshot, a narrative check, a privacy finding, or a card check.

Screenshots, layout checks, keyboard drawer, partner search, stale banner, and card rendering (dev only; Playwright lives outside the shipped files):

```sh
PLAYWRIGHT_DIR=<dir with node_modules/playwright> [CHROMIUM=<chrome-headless-shell>] node reports/tools/shoot.mjs
```

## How the report skill calls it

1. Claude exports the allowed sheet fields to a snapshot (`sales-desk-snapshot-v1`, the shape `adapters/seed.js` produces for training). The model rejects any field outside the contract in `metrics.js` (`SNAPSHOT_FIELDS`, `TAB_FIELDS`, `SETTINGS_FIELDS`, `PROPERTY_FIELDS`, `BRAND_TOKEN_FIELDS`, `SOURCE_ROW_FIELDS`). It also stops the run on a failed or missing sheet source, a missing tab, or an empty Units tab.
2. `--compute-only` writes `report-data.json`. Claude writes the narrative against its metric keys using `{{metric:<report>.<metric>}}` references.
3. The render call validates the narrative and renders every page. It then runs the privacy guard on each page's embedded data and visible text, scans visible text for record identifiers, and checks each card on its own. Card captions come only from scope, period, and date, never from narrative.
4. Claude publishes `out/public/` together. `status.json` holds only `run_id` (an opaque random token) and `as_of`. The privacy-scanned `source.json` companion holds only mode, sheet_id and the same run_id/as_of; publish and read back both together. Before training updates, publication-target.cjs verifies both existing and newly built source metadata against the exact training sheet.

## Files

| Path | What |
|---|---|
| `lib/metrics.js` | The only place metric rules live. No imports. Embedded in every page; filters recompute through it. |
| `lib/format.js`, `lib/strings.js` | Display formatting; every reader-facing string (Sol edits `strings.js` only). |
| `lib/narrative.js` | Placeholder resolution, word and bullet limits, the no-bare-numbers rule. |
| `lib/card.js` | The typographic 1080 by 1350 card and each report's big numbers. |
| `lib/render.js`, `lib/inline.js` | Page assembly, the per-page data allowlist, and the inline module bundler. |
| `lib/privacy.js` | The guard: emails, phones, links, and forbidden fields block publication. |
| `adapters/seed.js` | Seed CSVs plus the world's board map to a sanitized snapshot. |
| `templates/` | One template per report, sharing `components.js`; `client.js` is the browser runtime. |
| `styles/tokens.css`, `styles/report.css` | Every color, type size, and spacing value is a token in `tokens.css`. |
| `styles/fonts/` | Embedded Latin Marcellus and Pontano Sans WOFF2 fonts (SIL OFL 1.1, see `OFL.txt`, `OFL-Marcellus.txt` and `OFL-PontanoSans.txt`). |
| `fixtures/narrative-training.json`, `fixtures/edge/snapshot.json` | Training narrative; the isolated positive-closing, zero-lead, empty-filter fixture. |

## Design decisions

- **Direction (October 1): simplify.** No illustrations: the facade drawing, oculus, palms, and plaster texture are gone. A warm off-white page, serif headlines and big numbers, mono for small metadata, and generous whitespace. A hidden photo slot sits at the top of every page for the property's real photography.
- **Each report fits one comfortable scroll, five sections at most.** The sales pulse is a headline sentence, four big numbers, the 20 tracked units as a typographic grid by building, what changed, and three attention lines. The other reports are one sentence plus one table or list. Longer lists show their first rows, with the rest one tap deeper. No charts.
- **Unit status is one warm tint ramp**, from available (plain) to sold (warmest), and the status word always shows. The 30 earlier sales are one line of text.
- **Accent: palm green (`--accent`), used only for focus, selection, and the stale banner.** Terracotta would collide with the warm status ramp.
- **Names, not IDs.** Buyers, agents, reviews, and campaigns appear by name or description. Unit names from the Units tab (1G, O-01) stay because they are the units' real names. The narrative check allows unit names only, as spec 02 says, and only names that are on the sheet, matched exactly. The buyer card keeps the buyer identifier, because spec 02 forbids buyer names on cards.
- **The card is typographic:** property, report title, the report's big numbers, the units line ("5 secured / 2 held / 13 available"), and the as-of line.
- Each history line carries a quiet source credit ("Bea, email" in training) built from `logged_by` and `channel`.
- Pages and cards use embedded Editorial fonts: Marcellus regular (400) and variable Pontano Sans (400 to 600). Pages include the WOFF2 data URLs directly, with no CDN. For a standalone card, call `cardSvg(ctx, { fontCss: assets().fontCss })`, importing `assets` from `lib/render.js`; the SVG then carries both font files and renders offline.

## What's verified

- 100 tests (13 cover Sol's review findings in `test/review.test.js`): every sales pulse metric against values worked out by hand from the CSVs; earlier sales from the Properties tab when the board marks none; the training label on training pages only; hyphenated unit names in the narrative; demand, partner, unit, buyer, owner, and custom spot checks; active buyers by owner and lead temperature, and owner and task decision rows that change no other metric; the edge fixture (one undisputed, one missing, one disputed closing; P901 at 50%, P902 at 100% disputed; No leads; empty filters); filter recomputation in the page's own bundle against fresh script runs for one campaign, one week range, and one unit type; the privacy guard and `status.json`; narrative validation; the bundled metric source; token mirroring; no middle dots or em dashes; and no buyer, agent, review, or campaign IDs in page text.
- Reconstructed last touches match the reclassified seed's sheet values for all 40 buyers and 50 partners (touch rows only).
- `tools/shoot.mjs`: all seven pages at 375 by 812 and 1280 by 800, with no horizontal scroll, no overflowing text, no targets under 44px, and no console errors. The keyboard drawer returns focus, partner search and sort work, the stale banner appears past 36 hours, and cards render at 1080 by 1350.

## Known limits

- Partners carry no structured firm or city, so the partner list omits the firm column and city grouping until the next spec round adds them. Parsing `relationship` prose is forbidden.
- The October 1 simplification removed spec 02 elements: the pulse's pipeline and pace charts and its board filters; the demand page's source, origin, and type sections; the Owner brief's week selector and fifth number; and the unit board on cards. The metric module still computes all of them, and filters still recompute in the page code.
- "Secured in the last 30 days" is a new registry metric (`secured_recent`): the weekly-absorption rule over a trailing 30-day window, chosen over calendar month-to-date, which reads 0 on Oct 2.
- Paid delivery (impressions, reach, link clicks) has no verified connector; those sections show not recorded.
- Training thresholds for partner activity (14 and 30 days), week start, report day, and stale hours are fixture settings, labeled on every page.
- Breakpoints stay literal in `report.css`, because CSS custom properties cannot be used in media queries.
- An undated touch recorded after a dated one does not reset the buyer's or partner's age; the age still comes from the latest dated touch (Sol review #11).
- Cloud runtime packaging (module manifest in the bundle, Node version check, the Python fallback) is left to the plugin packaging work (Sol review #15).
- Week completeness follows calendar dates and does not yet check partial source coverage within a week (the rest of Sol review #1). A failed or empty core export does stop the run.

## Standing reports

Sales pulse (Pulse), Demand and ads (Demand), Partner network (Partners), Unit interest (Units), Owner brief (Owner, stable `owner-brief.html` path), Source to sale (Sources), Closed Lost Insights (Closed Lost Insights), and Buyer Segment Insights (Segments). Buyer briefs and custom reports are on request and stay out of the standing menu. Custom labels name the report, such as Ad spend.

The revenue operations pages share first-contact period and buyer-type filters. Sources uses accepted partner, otherwise the first campaign, otherwise first channel. Lost groups current lost/on-hold buyers by the latest dated outcome reason and prior confirmed stage. Segments groups People `intended_use` as Second home (own use), Investor (rental or investment), Mix (own use with rental or investment, or mix/a mix), Not recorded (blank), or Other; English report labels and Spanish use answers are accepted without accent or case differences; whitespace is collapsed, and English/Spanish conjunctions, hyphens, semicolons, commas and slashes separate combined uses. `interest_type` remains property interest. Velocity is median days from first contact to the earliest confirmed deposit or contract. Blank reasons and types stay Not recorded; unrecognized categories group as Other; missing velocity stays Not recorded; a zero conversion denominator shows a dash. No commission splits are shown.

## Definitions and coverage

Metric definitions are stored in `report-data.json`, alongside the snapshot coverage, settings and narrative limitations. Pages omit the bulleted footnote block. The training label and stale-refresh banner remain.

These reports count distinct buyers at their first confirmed booking and first explicit completed tour. Tour stage is not completion evidence. Reschedules and replays do not add buyers. Booked buyers are not a count of current visits; cancellations and no-shows do not count as completed. Missing legacy evidence is unknown, not proof that no visit happened. Visit status, readiness, handoffs, preparation and recaps are available in the live desk.

All training people, records and amounts are invented. Training rules come from the snapshot settings: buyer staleness, partner activity thresholds, refresh age and reporting clock. Sheet and campaign coverage dates remain in the report data.

Owner brief is refreshed and shared daily. Cards are generated by Claude on request; report pages have no download control.
