---
name: desk-log
description: Turn sales desk input into confirmed saves. Use for voice notes, transcripts, forwarded email, screenshots, WhatsApp exports, weekly Meta CSVs, or updates about buyers, partners, villas and next steps.
---

# desk-log

Rules version: 2026-11-21. If `desk` shows a different version, say so and make no writes.

Follow `desk` first for sheet discovery, Settings, Properties, Schema, operator authority and conversation caching. Propose, confirm, append history, update current facts, read back, then report. Never claim success before verification.

## Procedure

1. Reuse the confirmed chat operator or roster-listed project instructions `This is <Name>'s sales desk.` for `logged_by` and `resolved_by`. Conflicting names need one identity question; no name needs “Who's logging?” Bundle blocking identity, authority and transaction-evidence questions. Project identity never substitutes for connector authentication or protected authority.
2. Extract each supplied event, occurrence date, person, property, villa/type, commitment, profile, contact and next action. Separate facts from requests. Search People by every supplied name, phone and email without narrating the lookup; ask existing/new only when genuinely ambiguous. Apply Matching below.
3. Read relevant People, Partners, Units, Pipeline and open Tasks. Construct Source keys; reconcile every expected event and current-record effect against all matching `source_key` prefixes and retained message keys. Plan only missing effects; one saved event does not complete a multi-event source.
4. Show the preview below, including every task, Calendar, inventory and override effect. One Save approves those visible effects. Only blocking identity, authority or transaction evidence precedes the preview; other questions belong in Before I save.
5. Before every save re-read affected buyer/current records, including open tasks and current inventory used for matches. Concurrent changes require a rebuilt preview and new Save. Append Interactions first; update approved current records and tasks afterward.
6. Read back every appended event by source key, every changed cell, task and Calendar receipt; verify unique IDs and literal values. Report partial failures accurately. Retry only missing effects.

## Buyer card

Use chat with bold header/labels, never a code block, table, boxed card, artifact or monospaced layout. New buyers and updates changing three or more facts use the full preview. Smaller existing-buyer updates use one sentence plus questions/effects and the save prompt. Label existing versus new explicitly.

The header is **New buyer: Daniel and Marisol Reyes** · <lead ID>. Replace the angle-bracket instruction with the real next ID computed from People and the confirmed/proposed first-contact date. Existing buyers use only their saved People `lead_id`; omit it when absent. Never print placeholder or guessed IDs. Lead IDs appear only here, never on the dashboard.

Use these fact lines in this exact order, with bold labels: **Contact**, **Heard about OCN**, **First contact**, **Profile**, **Interested in**, **Budget**, **Matches**, **Next step**, **Owner**. Contact always appears, using “not given yet” when missing; omit other empty facts. Put timing in Profile. Heard about OCN is acquisition source; First contact is how/date/logger. Profile combines supplied background and confirmed intended use. Interested in contains only buyer statements. Matches is always labelled “suggestion” and never saved as buyer interest. Budget shows parsed amount and currency. Quote only current Units prices. Next step states action, buyer, responsible person and date; a proposed booking says “on the calendar when you save”. Mark proposed values visibly. Owner shows the saved owner or supported proposed name, without a question mark. Additional approved effects, including override clearing, follow in plain sales language. Exclude connector details, ad IDs, budget flags and retention gaps from previews.

All questions go in ONE numbered **Before I save:** list after facts. Never put questions in fact lines. Each question uses “Buyer: question? Option / Option / Other”, best supported first, Other last. Include proposed owner/host/date questions even when shown in facts. Do not add per-question “If skipped” tails. Before the save prompt, say once: “Anything you skip becomes a task for you, due today.” This applies to unknown facts without a visible proposal: Save accepts all displayed proposals and effects. End exactly **Save, change or cancel?** An answer rebuilds the preview and still waits for Save; missing nonblocking facts never prevent Save.

Translate the complete preview for Spanish input: **Nuevo comprador: Daniel y Marisol Reyes** · <real ID>, **Contacto**, **Cómo conocieron OCN**, **Primer contacto**, **Perfil**, **Les interesa**, **Presupuesto**, **Opciones (sugerencia)**, **Próximo paso**, **Responsable**, **Antes de guardar**, ending **¿Guardar, cambiar o cancelar?** Missing contact is “aún no proporcionado”. The single follow-up line is exactly “Lo que no respondas queda como tarea tuya para hoy.” IDs and stored canonical values stay unchanged.

Invented example, with confirmed date, next sequence from People and current Units price:

**New buyer: Daniel and Marisol Reyes** · OCN-261119-004

**Contact:** not given yet
**Heard about OCN:** Walk-in
**First contact:** In person · Nov 19 · Freddie
**Profile:** From Denver · Vacation home
**Interested in:** Ola villas
**Budget:** $500–600k USD
**Matches:** Ola MZ1-L03 $550k (suggestion)
**Next step:** Proposed tour for Daniel and Marisol with Freddie, Sat, Nov 21, 10:00 am; on the calendar when you save
**Owner:** Proposed Freddie

**Before I save:**
1. Daniel and Marisol Reyes: What's their phone or email? Provide contact / Other
2. Daniel and Marisol Reyes: Who will host their tour? Freddie / Alix / Other
3. Daniel and Marisol Reyes: When should their tour happen? Sat, Nov 21, 10:00 am / Other
4. Daniel and Marisol Reyes: Who should own their follow-up? Freddie / Alix / Other

Anything you skip becomes a task for you, due today.

**Save, change or cancel?**

## Questions and follow-ups

Reuse known answers. Missing acquisition source, first channel, intended use, current loss/on-hold reason, contact, action details and proposed host/owner/date go in Before I save, never a separate interrogation. None blocks Save. Ask the logger first about facts they may know, never an “ask Jorge” task. Save approves every visibly proposed owner, host, date, task and Calendar effect without separate answers. Only unanswered facts with no proposal stay blank and become named follow-ups for the confirmed logger, due today in the reporting zone. For the example above, Save assigns Freddie and books the proposed tour; only missing contact creates a collection task. Never invent an unshown assignment/appointment. Deduplicate equivalent open work; follow `desk-tasks` for history, Calendar receipts and recovery.

Use sales language throughout previews, questions, tasks and confirmations: buyer name and missing fact, never row/column/Schema/code/ID terminology. Exact question **How did they hear about OCN?** offers **Meta ad / Website / Referral partner / Walk-in / Friend or family / Other**. Name the buyer in its numbered context. Skipping creates “Ask <buyer> how they heard about OCN”. First channel asks how <buyer> first contacted us: WhatsApp / Email / Phone / In person / Form / Instagram / Other. Intended use asks “How are they planning to use the property?” with Vacation home / Rental or investment / Both / Other; skip task “Ask <buyer> how they plan to use the property”. Store `vacation home`, `rental or investment`, `both`, `other` in People `intended_use`. Never infer from budget, type or notes or migrate old values.

Missing contact asks “What's their phone or email?” in a numbered item naming the buyer; skipped task is exactly “Get <buyer>'s phone or email”. Loss/on-hold asks why <buyer> decided not to buy or paused: Price / Timing / Financing / Location / Another property / Unresponsive / Other. Store `price`, `timing`, `financing`, `location`, `chose another property`, `unresponsive`, `other` in that outcome's Interactions `lost_reason`; never reuse an earlier outcome's reason. Budget flag suggests Price first without selecting it. Skipping leaves `lost_reason` blank, workflow reason “Reason not provided”, and task “Ask <buyer> why they decided not to buy” (or paused). Existing strategy/review-date requirements still apply. Translate questions/tasks into Spanish.

## Matching and first contact

A name plus one matching city, phone, email or unit interest identifying exactly one existing buyer means Existing buyer, without a same-person question. Ask only when evidence is missing, ambiguous or genuinely conflicts. This applies to inbound emails/forms/imports too; a full name typed by the team that matches exactly one buyer, with nothing conflicting, also means Existing buyer; a first or partial name alone needs a supporting fact. Supported phone/email matches without conflicts enter the preview. Split semicolon-separated contacts, trim, compare phones by digits with country code; preserve original strings. Clarify first names, similar spellings, shared contacts or handles only when supporting facts still leave ambiguity. Match handles only to stored `instagram_handle`. Households do not merge people; ask which named people “the couple” means. For “they're in”, clarify who and whether inquiry, tour, hold or deposit. Unresolved identity can retain source with reference blank and a Review question, never guessed buyer-specific facts.

People `source` stores acquisition: Meta ad, website, ClickAdvisor, referral partner, walk-in, friend or family, other. `first_channel` separately stores WhatsApp, email, phone, in person, form, Instagram. Meeting a buyer in person with no stated source establishes `source=walk-in`, `first_channel=in person`, without asking, including existing buyers with blank source/channel. This inference fills those blanks without further first-contact questions; unknown first_touch_date stays unchanged. An explicitly supplied source takes precedence. Interactions `channel` describes the note's transport, not acquisition. Meta lead/ad ID goes in People `ad` when known. Otherwise existing buyers need confirmed first-contact evidence to fill blanks; never overwrite original `source`, `first_channel`, `first_touch_date` or migrate legacy walk-in/web-form channel values. Conflicts go in Before I save with both choices; preserve acquisition and log later influence separately.

Keep internal `person_id`; new buyers get next `B` number and `lead_id=OCN-YYMMDD-###`, next unused sequence for their first-contact date in `America/Mexico_City`. Check duplicates before proposing and sequence again before writing. Missing new-buyer date: visibly propose the message date on First contact and ask in Before I save. Save confirms that visible date proposal for lead ID and initial interaction; Change can supply an earlier date. Never default an existing buyer's date. Read back both keys; collisions never overwrite either record.

## Buyer owner

People `owner` is one supported `task_owners` name. For new/unowned buyers propose a supported logger or otherwise supported person on Owner and ask confirmation in Before I save. Save approves the visible owner proposal without a separate answer. Only no supported proposal or selection leaves owner blank and creates the logger's follow-up “Confirm <buyer>'s owner”. An unsupported name requires the desk owner to add them to Settings first. The morning run only lists missing owners. Any authorized logger may reassign: append `event=owner_set`, `record_type=decision`, buyer ID and old/new owner plus changer in summary, update People, read both back. Use the source identity's next event position, or `chat:<operator>:<message time>:e1` for a standalone change. Dashboard is view-only. Task owner may differ from buyer owner. Reference this sole owner rule.

## Tasks and buyer journey

Follow `desk-workflows` and its shared journey reference for qualification, accepted handoffs, tours/recaps, villa holds, On hold, nurture, lost and closed outcomes. Preserve required workflow payload, strategy/review dates and transaction evidence. Warm handoff stays with sender until recipient accepts; temporary coverage never reassigns buyer. Actual vetting is `record_type=touch`, `qualification.conversation=true`; internal readiness is `decision`, conversation false. Readiness alone never implies a stage. Review known qualification before offering a tour, ask only what is still needed. Disabled website automation requires its separate standing policy.

Reuse suitable open tasks. Missing action/owner/date: offer supported choices in Before I save, including existing work or no action with reason, Other last. Preview proposed host and date questions there. Save confirms displayed supported proposals, including host/date, and creates the task/Calendar booking. Missing details without a proposal become logger follow-ups. Source-stated action with owner/date also becomes a task in the same Save. Possible duplicate: name existing buyer task, ask Move / Replace / Keep both / Other; never move/close on a guess. Follow `desk-tasks` for creation, reassignment, completion and cancellation. Replacement cancels old task with reason `replaced by <new task ID>` unless evidence says completed. Interactions retains source next step; Pipeline reflects earliest open task.

Visit reschedule/cancellation uses stable receipt links in the workflow reference, not wording matching; close only linked host task. Direct host-task cancellation asks whether visit is cancelled too; task-only cancellation leaves visible hosting gap. Log confirmed completion even without recap and ask for missing recap/next action. Booking never means completion. Personal drafts use confirmed owner/context; appointment options require freshly verified host availability and zone. Drafting never sends. Relevant reply/booking/takeover/opt-out/outcome raises sequence-stop request before marketing, never permission for improvised email.

## Interaction fields

Resolve every key through Schema; leave unmapped, manual and formula cells untouched. Empty means no change; literal `clear` removes an optional value. Each event gets its own row.

- `interaction_id`: next I number, existing padding, consecutive within source. `timestamp`: occurrence with reporting offset, or date only; same-day ordering uses `logged_at`. Ask when unknown/order matters; never invent time. `logged_at`: now with offset.
- `channel`: `chat voice note`, `chat transcript`, `chat note`, `email`, `web form`, `ad lead`. Forwarded email stays email; screenshots/WhatsApp/confirmed chat decisions use chat note.
- `record_type`: touch for conversations, decision for rulings/transactions/readiness, correction for fixes. Only touches count as activity. `corrects_interaction_id` only for corrections.
- `person_id`, `partner_id`, `unit_id`, `property_id`: confirmed references. Partner-only conversations may omit buyer/property. One property defaults; multiple require evidence or question. `partner_role`: participant if involved (including claims), credited for accepted referrer only.
- `summary`: neutral fact sentence, no contact details/quotes/links. `source_text`: retained raw text; `source_link`: original Drive link. `logged_by`: confirmed roster operator. `source_key`: below.
- `stage`, `unit_status`, `deposit_date`, `next_step`, `next_step_due`: confirmed changes, due/deposit dates YYYY-MM-DD; clear cancelled/done next step and due together.
- `unit_type`: buyer-stated singular Casita / Nativo / Ola, multiple separated by `; `; recognize plurals. Specific unit alone never implies type interest.
- Copy supplied `campaign_id`, `ad_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`; campaign/ad IDs require well-formed known campaign. Broken IDs remain only in source with missing-attribution Review.
- `duplicate_person_id`, `survivor_person_id`: confirmed identity decision, normally desk-review. Outcome `lost_reason`: questions above.

## Events and stages

New identifiable buyer inquiry → `inquiry`/lead; repeat inquiry → inquiry/no stage. Unit/type interest → `unit_interest`; confirmed preferred unit/shortlist with checked price/availability → `unit_selected`/unit selection only from earlier stage. Two-way preferences conversation → `note`/contact and discovery from earlier stage. Delivered presentation with agreed next step → `presentation_sent`/presentation from earlier stage. Confirmed booking/completion → `tour_booked`/`tour_completed`, Tour only from earlier active stage. Completion requires actual outcome time and linked host-task closure. Requests never establish booking/completion.

Hold request → `hold_requested`, no stage/status; ask acceptance, unresolved goes hold confirmation Review. Confirmed acceptance → `hold_accepted` decision, held + holder. Release → `hold_released` decision, available + clear holder/deposit. Paid reservation → `deposit_paid` decision/reservation, reserved + deposit date. Signed promesa → `promesa_signed` decision/under contract, promesa signed. Confirmed trust/deed closing → `closed` decision/closed, sold. Populate matching interaction unit status/holder person/deposit facts. Never assign another buyer's held/reserved/promesa villa without asking; elapsed time never releases it.

Operator outcomes `lost`, `on_hold`, `nurture` are decisions with stages lost, on hold, long-term nurture, required reason/workflow. Lost never releases inventory. Reactivation/backward stage needs explicit operator instruction; booking never reactivates inactive/closed stages. `referral_claim`, `question`, ordinary `note` are touches/no stage. Partner terms requests are notes, never agreed commission changes. Never promote on enthusiasm.

Qualification People keys `interest_type` (villa/condo/both), `budget_range`, `purchase_timing`, `intended_use`, `preferred_channel`, `marketing_permission` require stated/confirmed facts. Suggest temperature with fact-based reason, save `lead_temperature`/`temperature_reason` only with operator/lead approval: cold early/incomplete/long horizon; warm engaged; hot clear next-step intent; not a fit confirmed mismatch with reason. Missing budget never disqualifies; opens/likes never raise temperature.

## Budget and matches

Use `parseBudget` and matching from `desk-workflows/scripts/matching.cjs`: k/mil thousands, M millions, bare 100–999 thousands USD; USD default unless MXN/pesos named. Shared range suffix applies to both ends; accept –/-/to/a. `450` means $450k USD, `500 a 600 mil` $500–600k, `1.2M` $1.2M. Preview amount/currency, Save confirms People budget; no redundant shorthand question. Invalid amounts need clarification; never convert MXN or compare it with USD inventory. Units prices stay literal.

Match current available Units on latest effective buyer-stated type and budget, applying corrections and proposed facts. At most three cheapest first, up to 10% above maximum; unknown type matches budget only. Unrelated notes never erase prior type. Prices only from `list_price`. Recompute People `budget_flag` when interest/budget/Units are read for saving; show the effect through plain Matches wording. When wanted type starts above budget, show returned text and supported alternative, e.g. “Ola starts at $550k, above their $450k budget. Nativo fits.” Save flag such as `below Ola` or blank. Active likelihood reason: “budget below the villas they want”; closed/lost gets no budget reason. Dec 1 increase stays price confirmation Review until approved; unconfirmed rental/ocean claims need fact sheet Review.

## Overrides and commissions

Confirmed Freddie/Alix alone may override likelihood 0–100 or valid stage. Ask for a short reason when none is supplied; show reason/value in the preview. Preserve the other metric’s override when setting or clearing either metric. Append decision, update People `likelihood_override`/`override_reason` or Pipeline `stage_override`/`stage_override_reason`. Exact reason format `Set by <Name>: <reason>`, English prefix/canonical name even in Spanish; display reason under eight words, full reason in Details. Promised deposit stays Unit selection; explain and offer permitted override, never invent payment/contract/closing or change Units.

Next logged event moving freshly computed before/after likelihood/stage clears only that metric's override/reason in same Save. Unrelated/older/unchanged facts or clock alone never clear. Preview actual setter/value clearing; concurrency rebuilds preview. Read back both cells. `DeskLikelihood.compute`, `DeskRules.setOverride`/`advanceOverrides` supply pure calculations/proposals.

Six approved commission cases, USD contract %, paid per installment: Freddie buyer Alix 1.75/Freddie 4.25; Alix relationship 3.75/2.25; outside agent/friend/website operator outside 3/Alix 1/Freddie 2; partner/owner/prior contact Alix 1/Freddie 2/shared bonus 3; individually approved full-6 brokerage outside 6/Alix .5/Freddie .5. Sixth: first logger credit 90 days, agencies paid for agents, friends sign introduction letter, website credit only website/chatbot first contact, discounts lower commission; approvals with José García. Unknown/inactive partner terms, 5%, unapproved 6%, unclear web origin, expired credit or discount: ask logger first, preview deduplicated commission gap Review, never alter terms or decide referral winner.

Before referral claim read accepted referrer, prior claims/decisions. Competing unresolved/accepted partner: one referral conflict Review naming buyer/both partners, interaction new claim, candidates both partners. Resolved same evidence never reopens; accepted attribution changes only with sales lead/developer decision.

## Sources

Source identity + ordered `:e1`, `:e2`; never processing time or buyer/record ID. Email `email:<Message-ID without brackets>` else `email:<original sender>:<original sent ISO time>`; form `form:<submission id>`; Meta `meta:<lead id>`; recording `voice:<operator>:<recording ISO time>` (same for its transcript); meeting `transcript:<operator>:<start ISO time>`; typed `chat:<operator>:<message ISO time>`. Screenshot/export identity is first covered message key.

Message key `<platform>:<account or ->:<counterpart>:<YYYY-MM-DDTHH:MM>:<first words>`; platform instagram/imessage/sms/whatsapp/email, project account when relevant, counterpart lowercase/no spaces, first six words lowercase alphanumeric hyphen-joined. Retain `message keys:` block listing every covered key; compare keys across crops/exports, reconcile missing events/effects before skipping. Group unsaved messages by counterpart/local day/event. Unknown screenshot capture date/relative labels or unreadable text require questions/Review, never guessed keys. WhatsApp continuation lines join prior message, skip system notices, retain [media omitted]; ambiguous day/month order asks. Read platform/account/speakers and original email headers; forwarder is not sender. Email source starts known message-id/original-from/original-date lines. Mid-speech corrections use corrected fact, confirmed in preview; transcripts preserve commitments on correct buyer.

Follow desk's pinned access boundary. Original source retention is allowed only inside Settings `drive_folder`, using that configured folder directly, never cross-folder access or Drive search. Raw text stays `source_text`; originals go in its Sources subfolder, linked in `source_link`. Unavailable retention never blocks the log; keep that technical gap out of the sales preview and report it separately to the desk owner. Over 50,000 characters: retained first part ends “continued in source_link”, full original in the permitted folder. Failed audio/upload never logs from memory.

Weekly Meta CSV updates Campaigns, not Interactions; Gmail cannot read attachments. Require campaign/week breakdown, never split totals. Read IDs/name/start/end/spend/currency/leads; result type must be leads or count unknown. Non-USD row writes nothing, report unsupported currency. Key property/campaign/week_start; match known ID or exact name, unclear asks. Existing key replaces spend/count/week_end/currency/source_link, never adds totals; conflicting other-source replacement needs desk owner or Review. New key fills every mapped Campaigns key; incomplete week ends last covered date. Retain CSV/link.

## Safe writes, corrections and failures

Append history first using actual append operation; never estimate append row numbers. Build full header-width arrays with explicit blanks including trailing cells and empty source_link before logged_by/source_key/stage; never compact. appendCells uses empty cell objects, values arrays `""`. Existing cells locate by ID and Schema header; reread layout if changed. Never touch unmapped/manual/formula cells. People notes, Pipeline notes/last_touch/days_since_last_touch and Partners last_partner_touch stay untouched. Confirm added existing-buyer contacts before appending `; `; preserve supplied strings. New People include confirmed name/contact/acquisition/date and confirmed owner; buyer-supplied home_city/home_country/instagram_handle stay exact. New buyers also get Pipeline person_id/stage/next_step/next_step_due, with formula/manual cells blank. New Partners require confirmation, commission blank unless approved terms. Referrer needs sales-lead approval without competing claims.

Use RAW/literal strings, never USER_ENTERED, including =/+/-/@/whitespace/apostrophe prefixes. Preserve phone +/spacing/zeros/punctuation; normalization only matches. No stripping or extra apostrophe. Without RAW read [literal-sheet-writes](references/literal-sheet-writes.md), inspect tool schema for appendCells/stringValue or repeatCell; update-only support is not append support. Otherwise stop affected write. Read back actual string and no formula, not formatted display; coercion/ambiguous verification is failure requiring source retention and confirmed repair.

Current facts use latest effective occurrence then logged_at with corrections; older facts append without overwriting newer state. Undo follows desk reference; older corrections append `record_type=correction`, original channel, corrected fields and corrects_interaction_id; timestamp only if correcting time, clear removes optional fact. Update current records/read back, never edit original. ID collision leaves both records unchanged and opens data repair Review.

Review: next R ID, interaction_id/source_key/reason/candidate_ids, plain buyer/fact question, open; deduplicate same evidence/reason. Reasons include identity uncertainty, unreadable source, referral conflict, missing attribution/date, hold/status confirmation, data repair, unsupported currency, commission gap, price confirmation, fact sheet. Data repairs instead use Schema key `reason=data repair` (the “why” category), route to configured desk owner, never operator Tasks; preserve source and explain affected buyer/fact. No invented Review owner column.

Confirmation leads with saved buyer/action, changes, then named missing facts; no IDs/system jargon. Missing sheet: retain preview, say unsaved and resume on laptop. Partial writes list saved/missing effects; never claim complete or duplicate on retry.

## Inventory facts

Re-read Units before preview and save; show villa old/new values. Write only status/holder/deposit, `list_price`, `size_m2`, and `size_ft2`. Require mapped measurements or ask owner to resume setup. Compute size_m2 × 10.7639, rounded to the nearest integer; preserve both supplied measurements; sq-ft-only needs confirmed m2 preview. Unknown area blank; legacy size readable, never rewritten/inferred by type.

Append a `record_type=decision`, `event=note` Interactions row first with unit/reporter/occurrence/old-new summary; populate Interactions `unit_status` with the confirmed new status. Keep `person_id` and buyer `stage` blank for an investor-held fact; clear holder/deposit when investor held. Update approved Units cells, read back history/inventory, latest-fact rules apply; no silent price increases.

An investor-held villa is unavailable inventory, never buyer sale/deposit/stage. Sold without buyer preserves inventory fact, never manufactures buyer/transaction. Preview Review assigned to Jorge with reason `status confirmation`: “Was <unit> sold to a buyer or held by an investor?” Set Review `candidate_ids` to that Units `unit_id` and `interaction_id` to the source evidence interaction. Deduplicate against an existing open question for that unit and reason, route in chat without invented owner/unit columns, read back; buyer stage waits for evidence.
