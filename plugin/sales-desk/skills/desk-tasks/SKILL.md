---
name: desk-tasks
description: Open, reassign, finish, and cancel sales desk tasks, keep them on the shared task calendar, and publish the live dashboard. Use when someone assigns a follow-up ("have Freddie call Nora Thursday"), reports one done ("I already called Nora"), reassigns a buyer or a task, asks what is due, what to do today, or what can wait, or asks to publish or refresh the dashboard.
---

# desk-tasks

Rules version: 2026-11-19. If the `desk` skill shows a different version, say so and make no writes.

Follow `desk` for access, identity, Schema, one approved Save and Undo; `desk-log` owns safe writes, matching, event/field rules, buyer cards, missing-answer follow-ups and read-back. This skill owns task state, task Calendar and dashboard publication. Task IDs are internal. Every open, move, reassignment, completion and cancellation appends a decision before updating current state. Resolve dashboard names against fresh records and preview every linked effect together.

Every operator question and task names the buyer (or partner/villa when applicable) and the missing/conflicting fact or concrete sales action. Use ordinary sales words, never history rows, tabs, Schema, IDs, formulas or receipts. Review questions also ban the words row and column. Ask the logger who knows before assigning fact collection elsewhere.

Misalignment, missing receipts, broken formulas and duplicate rows are data repairs: reuse/open Review with `reason=data repair`, assigned to Settings `desk_owner`, reported only to that owner. Never create Tasks for them or include them in operator Today, morning lists, dashboard questions or task lists. Preserve affected saved work while the owner reconciles it.

## Task owners

Read `task_owners`, semicolon-separated `Name | Google email | calendar color`; buyer/task owners must be listed. Unknown names require desk-owner roster setup before writes. Anyone authorized to log may assign listed owners; nonoperator owners may update only their own tasks plus the narrow dashboard exception. Follow desk Roles and sheet for Jorge; never invent pending live email. Training uses invented domains only.

Calendar color IDs: Lavender 1, Sage 2, Grape 3, Flamingo 4, Banana 5, Tangerine 6, Peacock 7, Graphite 8, Blueberry 9, Basil 10, Tomato 11.

## Open a task

1. Gather buyer/partner, action, confirmed roster owner and due date; due time only if supplied. Bundle missing facts as supported choices, retaining Other. Never guess owner/date. Read open tasks and clarify move, close or keep both if work overlaps. Write a short verb-first task with the buyer's full name once, no owner prefix: “Call Nora Lind about the Casita price sheet.”
2. Follow desk-log Before I save: Save approves displayed owner/host/date proposals and all task/history/Pipeline/Calendar effects. Only skipped questions without proposals create logger follow-ups.
3. After approval append Interactions: `record_type=decision`, `event=task_opened`, source channel (`chat note` here), linked `person_id`, `partner_id`, `property_id`, summary identifying task/owner/action/due/assigner, `next_step`, `next_step_due`, `logged_by`, `source_key=task:<task_id>:opened:e1`.
4. Append Tasks with next T number, links, `task`, `owner`, `due_date`, `due_time`, `status=open`, `created_by`, offset `created_at`, `opened_interaction_id`, `property_id`. Create Calendar and save `calendar_event_id`; sync Pipeline below. Read back all effects before confirming. Claim invitation only after verifying the owner guest.

## Reassign a task or a buyer

If the target and new owner/date are clear, preserve other confirmed values and show one save preview. For buyer reassignment, include a task move only when explicitly requested; otherwise keep existing task owners. Ask whether to move open tasks only if the request is ambiguous, together with other missing facts.

- **A task:** append `event=task_reassigned` (summary identifies task, old/new owner and assigner), `source_key=task:<task_id>:reassigned:<now, YYYY-MM-DDTHH:MM:SS>:e1`. Update the Tasks `owner`. On the calendar, add the new owner as a guest (only if they have an email), remove the old one, and change the color. Read back.
- **A due date:** the same, summarizing old/new dates; update `due_date` and the event's date.
- **A buyer:** follow the `desk-log` skill's "Buyer owner" rule (`event=owner_set`). Reassigning a buyer alone does not move their open tasks. An explicit request to move both is one preview and one yes for all listed reassignments.

## Finish or cancel a task

1. Match open work by buyer, action, owner and date. If ambiguous, offer wording/date choices, never request an ID. Reuse confirmed next work; an active buyer without another owned dated task needs “What's next for Nora Lind?” with stage-based choices. Nothing for now needs a reason; closed/lost exceptions need no invented task.
2. For linked visit-host cancellation, clarify whether the visit also cancels only if unspecified. Offer visit plus task, task only (visit remains booked with unresolved host coverage), or keep both. Match by verified opening evidence, never wording. Preserve other visits; task date edits are not bookings, use the reschedule workflow.
3. Preview completion/cancellation, real buyer touch, next action and Calendar together under desk. After yes, log an actual conversation first as a touch using desk-log; task completion alone is not a buyer touch.
4. Append `task_done`, `source_key=task:<task_id>:done:e1`, or `task_cancelled` with reason and `source_key=task:<task_id>:cancelled:e1`; summary records action and closer. Set Tasks `status`, `closed_by`, `closed_at`, `closed_interaction_id`. Done Calendar titles start “Done: ”, color Graphite; cancelled events are deleted. Never delete for open work. Apply the approved next action, sync Pipeline and read back every effect.

## The calendar event

Use the project-pinned calendar when supplied; it wins over Settings `task_calendar`. Report disagreement only to the desk owner as data repair. Otherwise use configured `task_calendar`. Calendar operations require its working connector. If it is blank or fails, keep the task in the sheet, leave `calendar_event_id` empty, and say so; route missing Calendar confirmation to the desk owner as data repair, not operator work.

- **Calendar:** the pinned calendar, otherwise `task_calendar`. Never substitute a personal calendar.
- **Title:** a to-do a person would write: verb first, the buyer's full name once, no owner name (it's their own calendar), and no ID: "Call Amara Collins with Marcus," "Collect Hannah Weiss's deposit." Drop a leading "<Owner> to " from the task text; if the buyer's name is not in it, add "with <full name>" or "for <full name>," whichever reads naturally. No email, phone, budget, or notes.
- **When:** all day on `due_date`, or a 30-minute block at `due_time` in the reporting time zone. An open task that is past due moves to today (the morning run does this), with the title starting "Overdue: " and the description saying when it was due. The sheet keeps the real due date.
- **Guest:** the owner's email from `task_owners`, so the invitation and reminders reach them. If the owner has no email there, make the event with no guest and say plainly: "<Name> needs an email for calendar reminders."
- **Color:** the owner's color ID.
- **Description:** one line of context the owner needs at a glance ("Tour stage. Last talked Wed, Sep 30."), then "Desk: <task owner's own dashboard link>" resolved from `dashboard_links` for the task owner, not the person logging. Legacy `dashboard_link` is allowed only when that task owner is `desk_owner`. On reassignment, replace the old owner's link with the new owner's own link. If missing, omit the link and say once "Ask Claude to open your dashboard." Add "Tell Claude when it's done." All updates happen in chat; never direct anyone to a dashboard button or ask for an ID.
- **Heads-up:** when a task needs someone else first or is a tour, meeting, call, or visit (the same test as "Today and can wait"), give the event a popup reminder at 9:00 am on the working day before, so the owner starts in time.
- **Quiet changes:** moving an overdue event to today, or retitling an event, sends no update email (notifications off). A new owner, a new date someone chose, or a finished task may notify as usual.
- Calendar invitations go only to task owners. Never invite a buyer or a partner. When Settings `mode=training`, omit attendee additions/removals and request `notificationLevel=NONE` for create, update and delete. Do not expect invitations in training read-back. A missing mode does not establish training; verify the setting and host support before trial.

## Pipeline next step

Pipeline `next_step` and `next_step_due` show the buyer's earliest open task by `due_date` (then `due_time`, then `task_id`). After any task change for a buyer, re-read their open tasks and set those two cells; with no open task, write `clear` in both. Re-read the Pipeline row before writing, as `desk-log` says.

## Today and can wait

Read fresh open Tasks and sales Review assigned to the person answering, excluding data repairs. Today includes overdue (oldest first), today (time order), then next-working-day work requiring an answer/document/approval or tour/meeting/call/visit preparation (earliest deadline first). Working days are Monday-Friday. Include other work demonstrably needing an early start and explain why. An undated blocker keeps its urgency and unknown date.

Can wait lists other work due within seven days, by date. Lead with the Today count; use numbered verb-first actions naming buyer and why today. Name owners for team lists, omit them for personal lists. Offer rescheduling only as a choice. Never reset overdue dates to clear work. Empty Today says “Nothing needs you today” and names the next item. Include actual missing buyer owner/next-action sales decisions and the person's own dashboard link; if absent, say once “Ask Claude to open your dashboard.” Repairs never count as sales actions.

## The dashboard

The dashboard is view-only: Today, sales questions, details and task lists with filters/sorting. All changes use authenticated chat and the approved save; never direct people to dashboard action buttons.

Use `${CLAUDE_SKILL_DIR}/assets/dashboard.html`. Each person publishes in their own chat using their own authenticated connectors via the supported private-artifact route. On open, publish or refresh, resolve their own verified `dashboard_links` entry; if absent, publish their own. Verify page, read access and view-only behavior before sharing/saving. Request read access only. Never represent local output or a colleague's artifact as their publication. If unsupported, explain the setup-kit handoff, omit link and say once “Ask Claude to open your dashboard.” Refresh changes only that person's artifact/entry.

Parse `dashboard_links` as semicolon-separated `Name | link` entries. Establish authenticated task-owner identity for dashboard-only actions without granting general logging authority. Do not require an operator login or ask who is logging for a dashboard-only request. Trim, NFC normalize and apply case-folding to both sides; use roster spelling, no fuzzy matching. Duplicate/malformed target entries require reconciliation. Legacy `dashboard_link` is a fallback only for `desk_owner`.

**Narrow Settings exception:** an established operator listed in `operators` or task owner listed in `task_owners` may save only their own `dashboard_links` entry after verifying their own publication. The `desk_owner` may save an entry for any person in `task_owners` after verifying that target, never publish from another account. Validate own-entry identity against either roster; on-behalf targets against task owners, using trimmed NFC/case-folded exact comparisons and canonical roster spelling. Reject links with literal `|` or `;`; never truncate or silently encode the link. Show person/link in a preview and wait for yes (Save / Change / Cancel). Immediately re-read Settings and merge only that entry, preserving every entry except the approved target and all unrelated Settings; concurrent target changes require a new preview/yes. Append a missing setting through connector append, never guessed position. Read back the full value and preserved entries. Reconcile uncertain writes before retry. This grants no other Settings/Properties/Schema/header/roster or legacy `dashboard_link` permission. Shared setup stays desk-owner-only; morning resolves each recipient's own link without publishing.

The board keeps ordered stages, including empty stages, with buyer temperature, owner and next action. Missing stages need a question. Filters confer no authority; all changes use authenticated chat and desk-workflows validation.

The two-business-day alert to Alix is an escalation, never reassignment. Preserve original deadlines and explicit reschedule reasons in append-only history. Never reset Sheet deadlines just to clear overdue work. Reconcile any earlier partial save in chat before retrying.

## Journeys, booking and verified effects

Use desk-workflows and its event contract/checklist for readiness, handoffs and visits. Run shared `DeskJourney.state` with fresh Tasks and the selected pinned/configured calendar; unavailable reads mean unverified coverage. Show sales decisions first: sender for unaccepted handoffs, confirmed visit owner for missing recaps, missing owned next action. At day end give a short named list of these and unfinished commitments. Proposals are not saved or completed tasks; explicit buyer-plan confirmation/read-back is required. Unknown responsibility needs a named decision. Background delivery stays unverified until tested.

Missing/ambiguous legacy task links or Calendar acknowledgements are desk-owner data repairs, excluded from operator lists. Never link by matching wording or create replacement work automatically. Preserve existing tasks, deadlines and uncertain provider outcomes until reconciled. Journey opening keys are stable and linked through `Tasks.opened_interaction_id`; reuse only the verified same episode, following effective corrections.

Qualification is a touch only for an actual confirmed buyer conversation. Review known readiness without inventing a threshold. Booking proposes Tour only from Lead, Contact and discovery or Presentation; preserve later stages/side outcomes. Preview confirmed host, appointment-local instant with zone/offset, host task, stage and Calendar together. For a new host task use “Host Nora Lind for the confirmed tour,” identical in preview/history/task/Calendar, buyer name once; resolve missing name first. Existing labels stay unchanged. Opening key is `DeskJourney.hostTaskKey(personId,tourId)` (`journey-host:<person>:<tour>`). Recover partial work from verified opening evidence. Reschedule updates that task/event; completion/cancellation closes only that visit's linked task.

Compute Task date/time in reporting zone from the saved appointment instant; show appointment-local offset and explain Calendar viewers may see their own zone. Never apply today's offset to future dates. Completion/no-show passes actual/practice `now`, confirmed zone and, for same-day outcomes, actual `occurred_at` after start and no later than now. Reconcile earlier appointments and timing gaps explicitly.

Verify history, stage and Task separately before each next effect, then read actual Calendar create/update/delete results. An ID alone is not proof of content. Only explicit absence/cancelled status confirms deletion; network/permission failure is unknown. Preserve verified work/event IDs, report remaining effects and reconcile before retrying; changed scope needs a new preview. No buyer messages; Freddie's drafts require verified availability or a question for it.

## Dashboard reads

Paint saved display-only copy first with age; replace with fresh full tabs for open view. Today reads Tasks, People, Review, Pipeline, Interactions; Settings/Schema supply column contract. Other views/Details load their supporting tabs; Units/Campaigns load on open. Optional tables never block a view. Cache never drives scoring, previews, alerts or actions. Chat resolves fresh records under desk-log. Console records cache/fresh-load timing for two-second paint target.

Shared desk-workflows likelihood scorer uses fresh People/Pipeline/Interactions consistently across views; opening inventory cannot change it. Show “Likely to buy: 25%” plus reason, no icon; override adds recorded “Set by Freddie: <reason>”. Confirmed People `lead_temperature` alone supplies Hot/Warm/Cold/Not a fit badge; definitions and stage override reason sit under Details. Never derive temperature from percentage.

Include open sales Review price confirmation, fact sheet and commission gaps; exclude all data repairs. Unconfirmed Dec 1 prices, rental returns and ocean-facing claims stay questions. Budget/original-message/original-file/commission values remain private by column, never global text replacements; mask contacts.
