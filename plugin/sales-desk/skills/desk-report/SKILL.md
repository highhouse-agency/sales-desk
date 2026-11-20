---
name: desk-report
description: Build, refresh and publish standing sales reports, buyer briefs or custom report pages from the sheet.
---

# desk-report

Rules version: 2026-11-20. A mismatch with desk stops publishing.

Follow desk's identity, Schema and exact pinned-resource boundary. Pinned Drive access is only Settings drive_folder for original-source retention; baselines/report files stay pending, with no fallback searches. `scripts/` is `${CLAUDE_SKILL_DIR}/scripts/`. scripts/README.md owns flags/components/metrics; report differences. build.js alone computes arithmetic.

## Requests
Standing morning refresh builds all five together: public/index.html, demand-and-ads.html, partner-network.html, unit-interest.html, owner-brief.html (each under public/). Owner brief is refreshed and shared daily; delivery is separately authorized. Keep owner-brief.html as its stable path. Buyer briefs: public/buyers/<person_id>.html, confirm buyer. Custom: public/custom/<short-lowercase-report_id>.html. Briefs/custom never replace standing pages/change records. Menu lists standing pages; custom names describe content. Cards are chat-only, no downloads. Every build writes public/status.json with run_id/as_of.

Normalize intended_use accents/case/whitespace and English/Spanish answers: own use/uso propio = Second home; rental/renta/alquiler/investment/inversión = Investor; combinations or mix/a mix = Mix; blank = Not recorded; other = Other. Buyer type filters use these groups, never interest_type (villa/condo/both). lost_reason is confirmed loss/on-hold category, blank Not recorded. Optional missing fields remain unknown. Source reports use first-contact cohorts and metric-computed Period/Buyer type filters; one short summary each.

Tour booking starts Tour, never proves completion. Use explicit completed-tour evidence and distinct first-event booking/completion measures. Snapshot lacks per-visit history; never infer current appointments, recap coverage or outcome timing from stage. Keep gaps visible.

## Procedure
1. In chat with a saved report_artifact URL, read that private artifact and its status.json; failure stops as owner-only data repair. A run under ten minutes old or morning started under ten minutes: ask whether to wait. Morning is only scheduled publisher.
2. Reuse Settings/Properties/Schema reads. Export seven allowed tabs below, full rows with headers resolved to keys; no Intake/unmapped columns. Optional People fields and Interactions lost_reason may be absent/null; continue with Not recorded and note pending setup. Other missing required keys stop export, owner receives layout issue.
3. Sanitize summary, next_step, question, relationship, commission_exceptions: remove contacts, links, handles/account numbers and quotations, retain neutral row description. Hash source_key to sk- plus first sixteen SHA-256 hex characters using Node crypto, consistently.
4. Write work/snapshot.json. Standing unpinned runs fetch Drive Sales desk/Reports/Published data/standing-current.json as work/previous.json; absent baseline uses none, visibly no comparison. Never invent a baseline or access it outside pinned boundary.
5. Run node scripts/build.js --compute-only --snapshot work/snapshot.json --previous <work/previous.json or none> --out work/out; add --buyers <IDs> or --custom <report_id>. Inspect diagnostics/privacy/currency/isolated rows. Training future_touch entries require warning with count, report_clock and latest timestamp; ask build/wait. Unattended morning builds with warning. Owner alone changes report_clock; practice clock gaps are separate from data errors.
6. Write work/narrative.json from report-data.json only; build with same flags, replacing --compute-only with --narrative work/narrative.json. Narrative rejection allows three wording attempts; other errors stop.
7. Verify all requested files, correct As of/zone/run ID/training label. No caption/card names a buyer or includes disputes/private history; brief embeds only its buyer.
8. Publish below. Only after the same artifact serves matching run_id/as_of, unpinned standing runs copy baseline to standing-previous.json and save report-data.json as standing-current.json. Custom uses custom/<report_id>.json, never standing baseline. Confirm with script-derived change counts and link.

## Snapshot contract
schema_version sales-desk-snapshot-v1; unique snapshot_id, captured_at, as_of, reporting_timezone, mode training/live, settings, tabs, properties, sources. ISO timestamps include offsets; identifiers strings; empties null; literal clear unchanged. Live as_of is completed sheet-read time; training uses fixed report_clock.

| Tab | Allowed keys |
|---|---|
| `Interactions` | `interaction_id`, `timestamp`, `logged_at`, `channel`, `record_type`, `corrects_interaction_id`, `person_id`, `partner_id`, `partner_role`, `unit_id`, `unit_type`, `property_id`, `event`, `duplicate_person_id`, `survivor_person_id`, `logged_by`, `source_key` (token), `stage`, `next_step_due`, `unit_status`, `deposit_date`, `campaign_id`, `ad_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, sanitized `summary`, sanitized `next_step`, `lost_reason` |
| `People` | `person_id`, `name`, `source`, `first_channel`, `first_touch_date`, `referring_partner_id`, `home_city`, `home_country`, `owner`, `lead_temperature`, `intended_use` (all optional: leave them out or empty when the sheet has no such column or the cell is blank) |
| `Partners` | `partner_id`, `name`, sanitized `relationship`, `commission_kind`, `commission_rate`, sanitized `commission_exceptions`, `last_partner_touch` |
| `Units` | `unit_id`, `type`, `size`, `size_unit`, `size_m2`, `size_ft2`, `list_price`, `currency`, `status`, `holder_person_id`, `deposit_date`, `listed_date`, `property_id` |
| `Campaigns` | `campaign_id`, `campaign_name`, `week_start`, `week_end`, `spend`, `currency`, `platform_lead_count`, `property_id` |
| `Pipeline` | `person_id`, `stage`, `last_touch`, sanitized `next_step`, `next_step_due`, `days_since_last_touch`, `stage_override` |
| `Review` | `review_id`, `interaction_id`, `source_key` (token), `reason`, `candidate_ids`, sanitized `question`, `status`, `resolved_by`, `resolved_at`, `resolution_interaction_id` |

Never export email, phone, instagram_handle, commission_terms, commission_note, source_text, source_link, manual notes, Intake or inbox content.

Settings allow tracking_started_at, week_starts_on, weekly_report_day, buyer_stale_days, partner_active_days, partner_quiet_days, snapshot_stale_hours, morning_run_time. Properties allow property_id, name, sales_launch_date, total_units, historical_sold_count, brand_tokens, board_units. Bundle provides board map/brand; missing map becomes Location not supplied, using historical_sold_count (blank: Earlier sales not supplied). Note limitation; open Review questioning count means unconfirmed.

Sources include sheet source_id/kind=sheet/retrieved_at/covered_from/covered_through/status/rows, and campaign coverage per property ending latest Campaigns week_end. Failed Meta refresh retains older coverage/date, while sheet keeps current as_of. Add meta_ads delivery only when read this run and verified.

Prefer confirmed People source categories Meta ad, website, ClickAdvisor, referral partner, walk-in, friend/family, other. first_channel is contact method, never replacement acquisition source. Legacy snapshots without source retain earliest-touch UTM/first_channel fallback; no guessed migration/backfill/raw attribution notes.

## Narrative and custom reports
Limits after placeholder expansion: headline twelve words, summary sixty, changes/attention four bullets each of twenty, limitations three of twenty, card_caption twenty. Numbers only via {{metric:<report_id>.<metric_id>}} from report-data.json; dates/unit IDs may be literal. No invented ratios, rounding, estimates or arithmetic. Missing metrics mean omit point; missing facts use gap placeholders. Label suggestions For consideration. Never conflate holds/deposits/promesas/closings or call spend wasted. No private contacts/conversations/disputes; buyer cards identify by ID internally.

Custom requests confirm title/audience/dates/property/components/filters and three-to-five headline figures together. Use only bundle components/metrics. Missing calculation: explain supported measures and offer them or code addition first (CUSTOMIZING.md). No campaign spend allocation without defined metric. Write request.json per README, pass to build, state dates/USD/attribution in narrative.

## Publishing
Private Claude artifacts only. One multi-file artifact contains index.html, demand-and-ads.html, partner-network.html, unit-interest.html, owner-brief.html and status.json at root; index.html is primary. Briefs use buyers/<person_id>.html and custom reports use custom/<report_id>.html inside it. Keep internal links. Morning refreshes all five regardless of weekly_report_day. Preserve existing standing, buyer and custom files unless rebuilt; briefs never replace standing pages.

Read Settings `report_artifact`. A saved URL means read and update that same artifact at that same URL, never create a replacement. Read/update failure stops publication as owner-only data repair. With blank Settings, only authenticated `desk_owner` may provide an existing private artifact URL or first publish. Read/verify it opens the right report; without a provided URL, create privately and verify files/access. Preview its URL with Save / Change / Cancel before saving `report_artifact`. Change revises; Cancel writes no Settings. Re-read Settings; newly nonblank target stops for reconciliation, never overwrite; other changes need new preview/Save. Append missing keys via connector; preserve unrelated settings, read back URL, reconcile uncertain saves before retry. Resume unsaved artifacts; never duplicate. Morning never creates artifacts; blank means build nothing for publication, skip and report owner setup needed.

Say once: "Open Share and add the named people who should see this page. Claude cannot share it for you." Never use a public link. Unsupported tools leave publication pending; no alternate hosts/zip handoffs.

After publishing, read status.json from that same private artifact and require both run_id and as_of to match this build before verified publication or saving any Drive comparison baseline. Check files. Failed/mismatched reads mean "Published but unverified"; keep the old baseline and report owner-only data repair. Email needs separate authorization and verified publication.

## Failures
Prepublish failure leaves old report up; explain failed step/error. Privacy rejection publishes nothing; never alter guard/allowlist/data to bypass. Records needing check do not block publishing: route to morning's owner-only Review reason data repair, exclude operator lists/tasks. Meta failure publishes with older ad date. An uncertain update requires reading the same artifact before retry; never recreate. Unmatched status stays published but unverified. Baseline save failure after publication reports older comparison date. Without Node stop, never calculate manually.
