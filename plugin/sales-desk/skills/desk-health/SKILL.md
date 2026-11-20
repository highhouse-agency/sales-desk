---
name: desk-health
description: Check sales desk connections when asked to check the desk or at the start of every morning run.
---

# desk-health

Rules version: 2026-11-20. If desk differs, say so.

Follow desk first, including exact pinned-sheet/calendar restrictions and inaccessible-sheet stop message. Read only; never write, send email or change events/settings. Use operator's language.

Check only Sheet, Calendar, Drive, optional Gmail and optional Meta. Never enumerate/probe other plugins or count report publishing as a desk connection. Pinned projects check only Settings `drive_folder` for source retention, never other Drive files/folders or searches. Use the pinned calendar over Settings; send discrepancies to owner as data repair.

## Checks
One small successful read earns OK; configured failure is Broken with plain error; absent optional configuration is Not set up. Load tools before declaring missing. One timeout retry only, never a loop.

1. Sheet: read Settings, resolve Schema, read full Interactions for column check. Inaccessible pin stops with desk's exact message, no fallback.
2. Calendar: read today's events only on pinned calendar, otherwise configured calendar. Failure leaves sheet tasks unverified; blank means Not set up.
3. Drive: list only configured drive_folder; flag source files unlogged over two days.
4. Gmail optional: configured shared_inbox plus connected account, read newest message. Failure is Broken; age over three days suggests forwarding check, not proven failure.
5. Meta optional: read latest week. Failure uses weekly CSV; Campaigns week_end over eight days is separate staleness.

## Column check
Read actual header positions including blank cells. Use DeskRules.interactionColumnIssues(row, {operators}) in desk-workflows/scripts/rules.cjs and inspect incompatible Schema/enumeration values. Empty source_link must leave logged_by in its own column: operator under Original file or stage under source_key is suspect. Valid legacy/optional blanks are not errors. Never realign/edit/delete history.

Route suspects privately to desk owner as Review reason `data repair`, with buyer/date/misplaced fact. This check writes nothing; approved repairs follow desk-log. Exclude repairs from operator Today, morning/dashboard/tasks and connection count.

## Reply
"All desk connections OK" or "<n> connections need attention." List failed connection, effect and account owner's reconnect step in Settings, Connectors. Omit OK details unless asked. Morning summary carries Connections result. Never request/store passwords, tokens or keys; owner signs in.
