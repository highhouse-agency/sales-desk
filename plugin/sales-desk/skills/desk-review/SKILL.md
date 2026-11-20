---
name: desk-review
description: Clear the sales desk Review tab in conversation, one item at a time. Use when an operator asks to go through Review, asks what is open, or answers an open Review question.
---

# desk-review

Rules version: 2026-11-19. If the `desk` skill shows a different version, say so and make no writes.

Follow desk for access/identity/columns/Save/Undo; desk-log for matching, fields/events, add-only writes, keys and read-back. This skill owns Review resolution. Repair choices below are desk-owner-only.

## Procedure

1. Reuse the confirmed operator for `logged_by` and `resolved_by`. Read open Review oldest first and linked effective source/candidate records. Keep reason codes internal.
2. Separate data repairs before presenting sales questions. Misaligned data, missing receipts, broken formulas and duplicate rows belong in Review with `reason=data repair`, assigned to Settings `desk_owner`. Reuse an existing open repair. Report these only to the desk owner, never in operator Today, morning lists, dashboard questions or Tasks; never turn a repair into operator follow-up work. A genuine uncertain buyer identity remains an identity question.
3. Show one sales question at a time: buyer or partner name, date/channel and concise evidence, what conflicts or is missing, and supported candidates. If the opening request answers it, skip clarification. Otherwise offer choices, including Leave open/Not sure where useful, and always Other last. Never imply a likely answer without evidence. Other adds explanation, not resolution.
4. Every operator-facing question/task names the buyer (otherwise partner/villa) and missing/conflicting sales fact. Review questions explicitly must never use the words **row** or **column**, nor history rows, tabs, Schema, IDs, formulas, receipts or other system terms. Example: “Who sent Kate Mensah's Sept 30 email, Kate or Kofi?” Keep technical repair details in the desk owner's repair report.
5. Preview answer, evidence, every change and resolution under desk's card/one-line rules. Bundle missing blocking identity/authority/transaction evidence. Use desk-log Before I save for numbered missing-fact/contact/proposal questions. Follow the operator's language, including Spanish. Save approves every displayed effect, including proposed owner/host/date and Tasks/Calendar; only skipped questions without proposals need follow-ups under desk-log.
6. After approval, append Interactions before current-record updates. New decisions use the confirmation channel (`chat note` here); corrections keep the original channel. Use `review:<review_id>:e1`, `:e2` in write order; original-source events use that source's next unused position. Read back every effect. Only then set `resolved_by`, offset `resolved_at`, `resolution_interaction_id`, and `status=resolved` last. Never delete Review.
7. Confirm and continue until stopped. Unknown answers stay open. Failed writes/read-back leave it open; retry only missing effects after reconciling saved keys. Offline answers remain in chat, explicitly unsaved, for laptop continuation.

## Resolution records

| Reason | Possible answers | What you write |
|---|---|---|
| `identity uncertainty` | It's an existing person | A `correction` row on the original: `person_id` (and `partner_id`, `partner_role`, `event`, next step if they were waiting too). The original touch date stays. For new contact details follow desk-log Before I save; never re-ask supplied answers. |
| | It's a new person | A new People row and Pipeline row, then the same `correction` row pointing at the new ID. `first_channel` and `first_touch_date` come from the original source. |
| | Two existing records are one person | The operator picks the surviving person by name and distinguishing details; keep IDs internal. A `decision` row: `event=note`, `person_id` = survivor, `duplicate_person_id`, `survivor_person_id`. Both People rows and all old Interactions rows stay unchanged. |
| `hold confirmation` | Accepted | Use the supplied acceptance evidence, person and date; ask together only for missing facts. If the unit is held, reserved, or under promesa for someone else, stop and ask. A `decision` row: `event=hold_accepted`, `person_id`, `unit_id`, `unit_status=held`. Update Units. The request row stays as it was. |
| | Not accepted | A `decision` row: `event=note`, `person_id`, `unit_id`, summary "Hold request not accepted." Units stay as they are. |
| `unreadable source` or `missing date` | The operator supplies the text, the screenshot again, or the date | A `correction` row with the missing facts (`timestamp` when the date was missing). For a replacement screenshot, follow desk-log source reconciliation. |
| `missing attribution` | Evidence names the campaign | A `correction` row with `campaign_id` and `ad_id`, only from evidence the operator shows or points to. |
| | No evidence exists | A `decision` row: `event=note`, `person_id` of the buyer, summary "Campaign attribution confirmed unknown for <interaction_id>." No campaign is assigned. |
| `referral conflict` | The sales lead and the developer have decided | Use the supplied decision makers and date; ask together only for missing facts. A `decision` row: `event=note`, `person_id` of the buyer, `partner_id` of the accepted partner, `partner_role=credited`, summary naming the decision, the claim rows it settles, and who made it. Update People `referring_partner_id`. Accepted commission terms stay as they are. |
| | Not decided | Leave open. Do not suggest a winner or apply a first-touch rule. |
| `status confirmation` | Buyer sale or investor hold | For “Was <unit> sold to a buyer or held by an investor?”, follow desk Roles and sheet for the confirmer. A buyer sale needs the linked buyer and closing evidence before writing `sold`; an investor hold becomes `investor held`, never a buyer closing or Pipeline promotion. Append a `decision` row (`event=note` for an investor hold) with `unit_id`, `unit_status` and evidence (leave `person_id` and buyer `stage` blank for an investor hold), then update Units and read back before resolving. Do not invent a buyer, deposit or date. Keep one open question per unit and reason; reuse an existing open question. |
| `status confirmation` | Confirmed | A `decision` row with the event, `stage`, `unit_status`, and `deposit_date` from desk-log Events and stages. Update Units and Pipeline by the latest-fact rule. Before assigning a unit held by someone else, ask. |
| | Not confirmed | Leave open, or resolve with a `decision` row `event=note` saying it was not confirmed. |
| `data repair` (desk owner only) | The current record is wrong | Update the Units or Pipeline cells to match the latest effective confirmed fact. No new history is needed; set `resolution_interaction_id` to that fact's row. |
| | The earlier row is wrong (desk owner only, never an operator choice) | A `correction` row on that row, then update the current record to match. |
| | Confirmed as is (the current records are right) | Use the supplied confirmation and date; ask together only for missing facts. A `decision` row: `event=note`, `property_id`, plus `person_id` or `unit_id` if one is involved, with a summary naming what was confirmed and who confirmed it. Change no current records. Resolve against this row. |
| | The fix is a setting or a Properties value, or adds or removes Units rows | Append `decision`, `event=note`, confirmed values, confirmer/date. Keep open for desk-owner setup/manual changes; never write Settings/Properties or add/remove Units here. Pre-tracking sales belong in Properties `historical_sold_count`, never invented sold units. Resolve against the decision only after later read-back. |
| `unsupported currency` | The operator supplies USD values | Update the Campaigns row with the USD figures and their source. Otherwise leave open. |

If no answer in this table fits, write the confirmation as a `decision` row (`event=note`), leave the item open, and ask the desk owner rather than fitting the answer to the nearest row.

Pipeline and Units follow every answer: a confirmed new person gets a Pipeline row; a confirmed stage or unit change updates Pipeline and Units by the `desk-log` skill's latest-fact rule. Never touch `notes` or formula columns. Only Freddie or Alix may set or clear override columns with a reason under desk-log Overrides; resolution alone never authorizes an override.

## Several people in one source

For multiple people:
1. Append a `correction` row on the original placeholder row for the first person: `person_id`, the confirmed `event`, `next_step`, `next_step_due`, and any partner fields.
2. For each other person, append a new row with the same fields, keyed with the original source identity and its next unused event position.
3. Append one `decision` row, `event=note`, summarizing who the source covered, and resolve the Review item against it.
4. Update each person's Pipeline next step. Do not invent a stage, deposit, or unit change from the vague wording.

## Structured buyer-plan questions

Reasons `buyer hold strategy`, `missing next step`, `missing owner` and `buyer outcome` may be answered with the buyer-plan form after the linked person is unambiguous. Apply `desk-workflows` and verify the actual owner, stage, history and next task before resolution. Other adds only a note and leaves the question open. All other reasons retain the specialized resolution table above; a generic note cannot stand in for identity matching, transaction evidence or a referral decision. For hold confirmation, the dated villa-hold requirements in `desk-workflows` also apply. Write resolution metadata first and `status=resolved` last.

## Commission and published-fact gaps

Desk-log Commissions owns the six approved cases, evidence and gap triggers. Unknown/inactive terms or anything outside those cases remain `commission gap`; never guess rate/attribution. Ask the knowledgeable logger first. Ask the actual named-partner question with supported choices/Leave open. Resolve only after required approval and explicit terms/conditions are logged with José García: append who/when/terms decision, update only mapped agreed-term cells under the same Save, read back, then resolve. Unknown approval/terms stays open. Commission decisions never silently settle competing referral claims.

`price confirmation` and `fact sheet` likewise require source evidence answering the actual question. Never quote unconfirmed Dec 1 prices, rental returns or ocean-facing claims as facts.
