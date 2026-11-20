---
name: desk-setup
description: Set up or resume the training/live sales desk, repair missing setup or connectors, and rebuild formulas after layout changes.
---

# desk-setup

Rules version: 2026-11-19. A mismatch with desk stops writes.

Follow desk first, especially the pinned-sheet boundary. Pinned access permits only that sheet/calendar and Settings drive_folder for original-source retention. Never search Drive or access other files/folders/calendars. The pinned calendar wins; discrepancies are owner-only data repairs. Inaccessibility uses desk's exact stop message. Setup/training title searches are allowed only without a pinned link.

Resume existing work, never duplicate sheets/folders/clean copies/morning tasks. Failed/incomplete searches are not absence. Never delete/reorder existing tabs/columns or overwrite filled cells. Preview differences; owner edits filled settings manually, then read back (`setup_status` excepted). Only desk owner changes shared setup. Others receive seat/dashboard checks only, with desk-tasks' own-link exception.

Use `${CLAUDE_SKILL_DIR}/assets/`: `sheet-setup.md` for layout/validation/formulas/protection, `schema.csv`, `seed/*.csv`, training/live settings and properties, inventory worksheet, `routine-prompt.md`; use `scripts/formulas.mjs` for resolved layouts. After each owner step record `setup_status=<step> done <now>` only on passed checks, otherwise pending with missing item.

## 1. Connectors
Load tools on demand before declaring a connector missing. Try one harmless read of the permitted resource. Sheet and Drive are required for creating a desk; pinned seats check only that sheet and configured source-retention folder. Calendar is optional (tasks remain in sheet), Gmail optional (inbox/delivery pending), Meta optional (CSV fallback). GitHub is optional publishing infrastructure, never part of desk-health's connection list.

For missing Google services, direct the account owner to Claude connector settings, then wait. Verify their intended account/roster independently of keyboard identity; never borrow the resource owner's sign-in. Missing organization access goes to Claude Team owner; tools still absent after connection require a new chat and resume. Meta connects under Plugins, Sales desk, Connectors. GitHub is not bundled: only the desk owner adds it, as a custom connector, for report publishing. Meta uses View performance; block all change tools. People alone sign in, create accounts and approve permissions.

## 2. Who, and what exists
1. Establish desk owner before shared writes; when configured ask "Setting up as <desk_owner>?"
2. Find sheet under desk rules. Only without a pin, find Sales desk folder/Clean seeded sheet, resolving duplicate matches with owner/parent details. Keep chosen resources throughout.
3. Read existing tabs, headers, occupied rows/columns, Settings, Schema and setup status.
4. Nonowners: if shared setup incomplete, stop for owner. Otherwise check connectors, step 9 seat and step 7a own dashboard only.
5. Briefly state what exists and next step.

## 3. Questions
All numbered questions appear together in ordinary text, never code/table. Ask training/live; property name/code and reporting zone; operators with sales lead/desk owner/developer roles; unit-status reporter/email; task owners with Google emails/colors. Reuse supplied answers. Training proposes Patio Niebla (`PN`), Carmen sales, Bea desk, Rodrigo developer, Elena Mercado (`elena@patio-niebla.example`) reporter, and asset roster/settings/properties for one yes.

Live OCN previews `live-settings.csv`: live, blank report clock, operators Alix; Freddie; Jackson. Confirm roles/emails/colors; never save template placeholders or invite them. Morning account is `andie@highhouseagency.com`, authenticated separately. Before scheduling obtain inbox, run time and zone; other unknown settings remain blank. Inventory template is a worksheet, never verified lot data; measurements stay unknown until supplied.

## 4. Folder and sheet
Without a pin, create only missing Sales desk folder/subfolders: Sources/ad exports, Reports/Published data, Reports/Templates, Setup, Training. Create a missing blank sheet with live/training exact title. Never create replacement for an inaccessible pin.

Build missing setup from sheet-setup.md: locale/zone, Interactions, People, Partners, Units, Campaigns, Pipeline, Review, Tasks, Settings, Properties, Schema; Intake only if capture enabled. Apply frozen headers, plain text, warning-only validations/protection and three formulas. Schema maps existing headers; never rename them to keys. Append missing columns beyond every occupied column, including blank headers/personal data; append mappings only after header verification. Default new-sheet formulas come from section 4; moved/renamed layouts use step 10.

Read back every header/mapping/format/validation range and value, freeze, locale/zone and formula. Failed text formats/formulas stop data loading; mark pending and give asset's manual fix. Missing protection is optional.

### Workflow migration
Append missing Interactions `workflow_json` and mapping, preserving layout/data/permissions/formulas; verify before workflow writes. Add absent safe defaults only. Alerts/nurture require internal account tests, never automatic activation/backfill.

### Existing-sheet upgrades
Run on every owner resume and before formula rebuild, even if setup says done. Preview missing Interactions `lost_reason` (0.9) and People `lead_id`, `source`, `ad`, `likelihood_override`, `override_reason`, `budget_flag`, Pipeline `stage_override_reason` (1.0), with mappings. After yes append at far right, expanding grid only if needed. Preserve existing valid renamed mappings. A mapping to a missing header stops for owner reconciliation. An unmapped exact-key header may be adopted only if unique and not personal; otherwise ask for distinct header/mapping. Never duplicate keys or overwrite existing Schema.

Write only new headers, specified text formats/warning validations, then missing mappings after read-back. Preserve all old values/formulas/manual cells/protection and compare before/after. Interrupted runs add only missing pieces. New defaults put stage_override_reason after stage_override. Retain legacy intended-use values; leave unknowns blank. Missing confirmed first-contact dates prohibit lead-ID backfill: ask via `missing date` Review. Check IDs using `scripts/lead-identity.mjs` re-read/read-back contract. Duplicate phone/email candidates, including last-ten-digit phone overlaps, create one possible duplicate Review with all candidates before new buyer creation; overlap never proves identity/merge permission. Verify new mappings; rebuild resolved formulas; failed checks stay pending.

## 5. Data
Training always reconciles by CSV IDs (Campaigns: campaign plus week), even when populated. Non-PN property or seed interaction ID with different property/source key means custom data: write nothing, ask whether to keep; on yes skip seed and record exception.

Append missing IDs in batches about forty, leaving formula cells empty. Fill only blank existing nonformula cells; differences require owner decision. Read exact text IDs/timestamps/dates/phones. Expect 165 Interactions, 40 People, 50 Partners, 20 Units, 18 Campaigns, 40 Pipeline, 3 open Review, 36 open Tasks. Compare all last-touch/partner-touch values including blanks with CSV; days-since equals seed plus days since Oct 2, 2026. Report mismatches to kit maintainer; never force values/formulas to match. Completion requires counts and formulas passing.

Live OCN: give Freddie 41-row worksheet; confirm actual lots/type/status/price and totals 17 sold, 24 available without assigning guessed lots. Confirm Casita $299,000, Nativo $450,000, Ola $550,000 from inventory; unknown dimensions stay blank (m2/sq ft only). No placeholder IDs or assumed availability. Dec 1 increase stays Review. Pending until confirmed mapping reads back. For supplied units/partners follow asset section 7: preview, compare existing IDs, yes, append missing only, verify. Otherwise resume later.

## 6. Settings and personal projects
Fill only missing/blank Settings/Properties from assets and confirmed answers; set permitted folder link; read back. Training after verified seed/settings copies Clean seeded sheet only if absent and unpinned; resets use that copy.

Each person's project instructions contain their canonical roster identity and exact resources, as these two ordinary-text lines:

This is <Name>'s sales desk.
Mode: live. Sheet: <sheet link>. Calendar: <calendar ID>.

Training uses Mode: training. Do not invent a missing calendar ID. Identity removes repeated logger questions, never authentication/authority checks. The pinned sheet/calendar restrict every subsequent chat.

## 7. Morning task
Owner only; verify OCN account `andie@highhouseagency.com`. Gmail absence skips inbox/email, retains pending alerts; sent-mail proof is required to claim delivery.

Find existing Sales desk morning run (or have owner check Scheduled). Compare sheet link, rules version, time/cadence and explain edits; never duplicate. Otherwise use routine-prompt.md with exact Desk sheet link. Owner schedules manually first through Scheduled, New task, Set up manually. Training stays manual. If tools cannot create it, supply prompt with click instructions.

Owner runs once to allow required tools for all tasks, leaving Meta change tools blocked. If unavailable, Team owner enables Always allow in organization Cowork permissions. Verify configured desk connections only, never unrelated plugins. A second unattended manual run must ask nothing before live switches to Daily at confirmed time/zone. Mark done only after owner's confirmation. Pinned work stays within the source-retention folder; other Drive/report access remains pending.

## 7a. Task calendar and dashboard
Optional; training skips unless requested. Read pinned calendar directly, otherwise configured calendar. Without pin/calendar, owner may provide existing ID or create/share a calendar in Google Calendar settings with task owners allowed changes; never create/share without yes. Fill blank task_calendar, verify. Each person accepts invitation, checks calendar and phone notifications. Compare their display zone against an approved practice appointment; local display difference alone is not a wrong instant. Owner guests receive reminders.

Use desk-tasks' view-only dashboard; verify real own-account publication/read access. No page writes or Sheet/Calendar write permissions. Each person says Open my dashboard in their own chat/connectors. An operator/task owner saves own entry; desk owner may save an entry for any task owner. Preview, one yes, re-read/merge/read-back preserve other Settings. Reject literal `|` or `;` in links; NFC and case-folding match canonical names. Legacy dashboard_link is owner fallback only.

## 8. Reports
Site infrastructure is set up from kit on owner's Mac, never here. Fill blank report_site/publishing_route only from owner-supplied URL and GitHub/Mac choice, then verify. Preserve existing values. Without site, build files locally; GitHub stays optional on Mac route. No Cloudflare/Netlify/GitHub provisioning here.

## 9. Check and finish
1. Read exact sheet/Settings/open Review. Ensure personal project lines above. Nonoperator authenticated task owners checking only own dashboard skip the general logging test in steps 2 to 4; no general logging permission. Own-link setup follows 7a.
2. Operator previews then appends desk-log test: decision/note/chat note, no buyer/partner, summary Setup test row; not a real event., unique source_key `setup:test:<now YYYY-MM-DDTHH:MM:SS>:e1`, actual logged_by.
3. Read by source key; verify unique ID and untouched notes/formulas.
4. Append/read correction linked to test, same channel, source key same time `:e2`, summary Withdraws the setup test row; it records no event.
5. Final checklist: choose **Sonnet** in the model picker for daily use. Reports/review may use Opus; connected model acceptance remains required. Say ready only after required connectors, all layout/read-back checks, seed/formulas (unless approved custom training), test/correction, and owner's live morning task pass. Otherwise list pending item/person/next step. List optional GitHub, Meta, protection/site separately. Record 9 done/pending. New chat: paste update or go through Review.

## 10. Rebuild the formulas
Owner only, after upgrades. Read Schema and headers for Interactions/Pipeline/Partners/Units/Properties and save first five Pipeline/Partners current touch values. Generate from work/layout.json per formulas.mjs contract. Problems stop for owner resolution. Preview three target cells/changes; after yes clear only named formula output ranges and write row-1 formulas. Fix generator-listed dropdown/protection ranges; verify headers and unchanged saved values. Changed values mean `10 pending: formula values changed`. Without Node manually substitute current positions per script: CHOOSECOLS indices, last Interactions column, person/partner ID ranges, last_touch column and Schema header; preview before writing.

## Launch questions
Reuse open stable keys launch:dec-1-prices and launch:fact-sheet; add only missing price confirmation/fact sheet questions after preview/yes/read-back. Confirmed resolved answers stay resolved. No unconfirmed prices/returns/ocean-facing claims. Commission exceptions use desk-log's commission gap. Internal data repairs use desk's owner-only data repair route, never operator follow-up tasks.
