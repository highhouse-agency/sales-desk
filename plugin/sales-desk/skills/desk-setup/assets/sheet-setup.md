# Sheet setup

This file is complete enough to build the desk sheet exactly, by hand or with the `desk-setup` skill.

Every desk column has a **key**, the fixed name the skills and the report code use. The `Schema` tab (section 2) maps each key to the **header** the sheet shows. A new sheet starts with every header equal to its key, in the order below. After that, headers can be renamed, columns reordered, and new columns added, as section 8 describes. The skills and the report export find columns by key through Schema, never by header text alone or by position.

## 1. Spreadsheet settings

1. Create the sheet in the shared `Sales desk` folder owned by the dedicated Google account. Name it `Sales desk sheet` (or `Sales desk sheet (training)` for the training copy).
2. File, Settings:
   - Locale: United States.
   - Time zone: the `reporting_timezone` setting. `TODAY()` in the age formula uses it.
   - Calculation: Recalculation "On change and every hour."
3. Create the tabs in this order, with these exact names: `Interactions`, `People`, `Partners`, `Units`, `Campaigns`, `Pipeline`, `Review`, `Tasks`, `Settings`, `Properties`, `Schema`. Add `Intake` last, only if Meta instant forms or automatic Instagram capture are turned on. Tab names never change.
4. On every tab, type the headers in row 1 exactly as listed, then View, Freeze, 1 row.
5. Fill the `Schema` tab from `assets/schema.csv` (section 2). Leave out the `Intake` rows unless the Intake tab exists.

## 2. Tabs and columns

### Schema (the column dictionary)

| Col | Header | Format |
|---|---|---|
| A | `tab` | text |
| B | `key` | text |
| C | `header` | text |
| D | `description` | text |

One row per desk column, from `assets/schema.csv`: the tab, the key, the header the sheet shows, and a plain description. The Schema tab's own four headers, and the `Settings` tab's `setting` and `value` headers, are fixed; never rename them.

How the desk reads a tab:
1. Read the Schema rows for the tab, and the tab's row 1.
2. For each key, find the one column whose row 1 text equals that key's `header`. That column holds the key.
3. A column whose header is not in Schema belongs to the people using the sheet. Keep it, never write to it, and leave its cell empty when appending a row.
4. Stop and make no writes to the tab if a key's header is missing from row 1, appears twice, or the same `tab` and `key` appear twice in Schema. Name the key and the header. The fix is to edit the Schema `header` cell or row 1 so they match.
5. If the Schema tab is missing (a sheet built before October 4, 2026), read headers as keys and offer `desk-setup` to add Schema.

The tables below list each tab's keys in their default order. In a new sheet the header equals the key.

Formats: set every column to Format, Number, **Plain text** before any data goes in, except the columns marked "number." Plain text keeps IDs, ISO timestamps, and `YYYY-MM-DD` dates exactly as written; otherwise Sheets turns them into its own date values and the export breaks.

### Interactions (add-only; nobody edits earlier rows)

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `interaction_id` | text | |
| B | `timestamp` | text | |
| C | `logged_at` | text | |
| D | `channel` | text | channel list |
| E | `record_type` | text | record type list |
| F | `corrects_interaction_id` | text | |
| G | `person_id` | text | |
| H | `partner_id` | text | |
| I | `unit_id` | text | |
| J | `summary` | text | |
| K | `source_text` | text | |
| L | `source_link` | text | |
| M | `logged_by` | text | logged by list |
| N | `source_key` | text | |
| O | `stage` | text | stage list |
| P | `next_step` | text | |
| Q | `next_step_due` | text | |
| R | `unit_status` | text | unit status list |
| S | `deposit_date` | text | |
| T | `campaign_id` | text | |
| U | `ad_id` | text | |
| V | `utm_source` | text | |
| W | `utm_medium` | text | |
| X | `utm_campaign` | text | |
| Y | `utm_content` | text | |
| Z | `utm_term` | text | |
| AA | `event` | text | event list |
| AB | `unit_type` | text | dropdown from range `Units!B2:B` |
| AC | `partner_role` | text | partner role list |
| AD | `property_id` | text | property list |
| AE | `duplicate_person_id` | text | |
| AF | `survivor_person_id` | text | |
| AG | `workflow_json` | plain text JSON | Versioned private workflow facts; blank on older rows; never published. |
| AH | `lost_reason` | text | lost reason list |

### People

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `person_id` | text | |
| B | `name` | text | |
| C | `email` | text | |
| D | `phone` | text | |
| E | `first_channel` | text | first channel list |
| F | `first_touch_date` | text | |
| G | `referring_partner_id` | text | |
| H | `notes` | text | manual column |
| I | `home_city` | text | |
| J | `home_country` | text | |
| K | `instagram_handle` | text | |
| L | `lead_temperature` | text | lead temperature list |
| M | `temperature_reason` | text | |
| N | `interest_type` | text | interest type list |
| O | `budget_range` | text | |
| P | `purchase_timing` | text | |
| Q | `intended_use` | text | intended use list |
| R | `preferred_channel` | text | |
| S | `marketing_permission` | text | yes no list |
| T | `owner` | text | task owner list |
| U | `lead_id` | text | unique OCN-YYMMDD-### |
| V | `source` | text | acquisition source list |
| W | `ad` | text | |
| X | `likelihood_override` | number | 0 to 100; blank allowed |
| Y | `override_reason` | text | required with likelihood override |
| Z | `budget_flag` | text | confirmed mismatch or blank |

### Partners

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `partner_id` | text | |
| B | `name` | text | |
| C | `relationship` | text | |
| D | `commission_terms` | text | |
| E | `last_partner_touch` | text | **formula, see section 4** |
| F | `commission_kind` | text | commission kind list |
| G | `commission_rate` | number | |
| H | `commission_note` | text | |
| I | `commission_exceptions` | text | |
| J | `instagram_handle` | text | |

### Units

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `unit_id` | text | |
| B | `type` | text | |
| C | `size` | number | |
| D | `size_unit` | text | size unit list |
| E | `list_price` | number | |
| F | `currency` | text | currency list |
| G | `status` | text | unit status list |
| H | `holder_person_id` | text | |
| I | `deposit_date` | text | |
| J | `listed_date` | text | |
| K | `property_id` | text | property list |
| L | `square_footage` | number | legacy field; preserve existing values |
| M | `size_m2` | number | square meters; derive missing counterpart from confirmed area |
| N | `size_ft2` | number | square feet; derive missing counterpart from confirmed area |

An `investor held` unit is unavailable inventory held by an investor, separate from a buyer hold. It is not a sold unit, paid reservation, buyer closing or sales-pace event. Exclude it from remaining inventory, inventory value and sellout calculations. Keep legacy area fields readable; store area in `size_m2` and `size_ft2`. Preserve supplied measurements. Derive only a missing counterpart using 1 m2 = 10.7639 ft2 (round square feet to a whole number). If neither area is supplied, leave both blank. Legacy `size` plus `size_unit` or `square_footage` can supply the confirmed measurement.

### Campaigns

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `campaign_id` | text | |
| B | `campaign_name` | text | |
| C | `week_start` | text | |
| D | `week_end` | text | |
| E | `spend` | number | |
| F | `currency` | text | currency list |
| G | `platform_lead_count` | number | |
| H | `source_link` | text | |
| I | `property_id` | text | property list |

### Pipeline

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `person_id` | text | |
| B | `stage` | text | stage list |
| C | `last_touch` | text | **formula, see section 4** |
| D | `next_step` | text | |
| E | `next_step_due` | text | |
| F | `days_since_last_touch` | number, 0 decimals | **formula, see section 4** |
| G | `notes` | text | manual column |
| H | `stage_override` | text | stage list; confirmed operator override |
| I | `stage_override_reason` | text | required with stage override |

### Review

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `review_id` | text | |
| B | `interaction_id` | text | |
| C | `source_key` | text | |
| D | `reason` | text | review reason list |
| E | `candidate_ids` | text | |
| F | `question` | text | |
| G | `status` | text | review status list |
| H | `resolved_by` | text | |
| I | `resolved_at` | text | |
| J | `resolution_interaction_id` | text | |

### Tasks

One row per task: a follow-up someone owns, with a due date. Tasks are the desk's to-do list; the dashboard and the shared task calendar both read from here. A task is a current record: its owner, due date, and status can change, and every change is also recorded as an Interactions row (the history). Nothing deletes a task row; a task that is no longer needed is `cancelled`.

| Col | Header | Format | Validation |
|---|---|---|---|
| A | `task_id` | text | |
| B | `person_id` | text | |
| C | `partner_id` | text | |
| D | `task` | text | |
| E | `owner` | text | task owner list |
| F | `due_date` | text | |
| G | `due_time` | text | |
| H | `status` | text | task status list |
| I | `calendar_event_id` | text | |
| J | `created_by` | text | |
| K | `created_at` | text | |
| L | `opened_interaction_id` | text | |
| M | `closed_by` | text | |
| N | `closed_at` | text | |
| O | `closed_interaction_id` | text | |
| P | `property_id` | text | property list |

### Settings

Two columns, one row per setting. These rows replace the old project-instructions settings block. The desk owner changes a filled value by hand; `desk-setup` fills only blank values and never overwrites one. Claude reads them at the start of every chat. A blank value means not configured.

| Col | Header | Format |
|---|---|---|
| A | `setting` | text |
| B | `value` | text |

| `setting` | What the value holds | Training value |
|---|---|---|
| `mode` | `training` or `live` | `training` |
| `reporting_timezone` | IANA zone name. Every timestamp carries this zone's offset. | `America/Mexico_City` |
| `report_clock` | Training only: the fixed as-of time for reports. Blank in live. | `2026-10-02T23:59:59-06:00` (use `2026-10-02T08:00:00-06:00` for a report on the untouched seed) |
| `operators` | People who log, separated by `;` | `Carmen; Bea` |
| `desk_owner` | The operator who runs the desk: setup, the Settings and Schema tabs, and the morning task | `Bea` |
| `sales_lead` | The operator who leads sales and confirms referrals, qualification, and lost buyers | `Carmen` |
| `developer` | The developer who reads reports and decides referral disputes with the sales lead | `Rodrigo` |
| `unit_status_reporter_name` | The developer's side: reports accepted holds, deposits, promesas, closings, releases | `Elena Mercado` |
| `unit_status_reporter_email` | That person's address | `elena@patio-niebla.example` |
| `shared_inbox` | The dedicated Google account's address | the training inbox address, or blank |
| `drive_folder` | Link to the `Sales desk` folder | set by `desk-setup` |
| `week_starts_on` | Day name, lowercase | `monday` |
| `weekly_report_day` | Day name, lowercase | `friday` |
| `morning_run_time` | `HH:MM` in the reporting time zone | `08:00` |
| `buyer_stale_days` | Whole days | `7` |
| `partner_active_days` | Whole days | `14` |
| `partner_quiet_days` | Whole days | `30` |
| `snapshot_stale_hours` | Report stale after this many hours | `36` |
| `tracking_started_at` | ISO timestamp with offset | `2026-08-24T00:00:00-06:00` |
| `report_site` | The report site URL. Blank until the report site is set up with the setup kit. | blank |
| `publishing_route` | `GitHub`, `Netlify`, or `Mac` (the setup kit deploys from a Mac; the cloud morning run cannot publish). Blank until the report site is set up. | blank |
| `task_owners` | Everyone who can own a buyer or a task, separated by `;`. Each entry is `Name \| Google email \| calendar color`. The color is a Google Calendar event color name: Tomato, Flamingo, Tangerine, Banana, Sage, Basil, Peacock, Blueberry, Lavender, Grape, or Graphite. Task owners do not have to be operators. | `Carmen \| carmen@patio-niebla.example \| Basil; Bea \| bea@patio-niebla.example \| Peacock; Rodrigo \| rodrigo@patio-niebla.example \| Grape; Elena Mercado \| elena@patio-niebla.example \| Banana` |
| `task_calendar` | The calendar ID of the shared task calendar (for example `OCN Sales`), from Google Calendar's settings for that calendar. Blank means tasks stay in the sheet and no events are made. | blank |
| `dashboard_links` | One or more named dashboards: `Name \| link;Name \| link`. Include every configured desk. | blank |
| `meta_delivery_fields_verified` | `no` or `yes` | `no` |
| `setup_status` | Written by `desk-setup`: the last completed setup step and when | set by `desk-setup` |

The partner thresholds, week start, report day, and stale hours above are the report bundle's labeled training fixture values, not live policy. Live values come from the sales lead and the desk owner. The training names (Carmen, Bea, Rodrigo) belong to the invented training world.

### Properties

One row per property. Replaces the old properties table.

| Col | Header | Format | Training value |
|---|---|---|---|
| A | `property_id` | text | `PN` |
| B | `name` | text | `Patio Niebla` |
| C | `sales_launch_date` | text, `YYYY-MM-DD` | `2026-08-24` |
| D | `instagram_account` | text | `@pationiebla` (placeholder) |
| E | `ad_account` | text | blank (placeholder) |
| F | `website_form` | text | `https://patio-niebla.example` (placeholder) |
| G | `total_units` | number | `50` |
| H | `historical_sold_count` | number | `30` |

### Intake (optional)

Connector-owned raw rows. Claude reads them and never edits them. One `source` column tells the routes apart; each route fills only its own columns.

| Col | Header | Filled by |
|---|---|---|
| A | `source` | every route: `meta_lead_form` or `instagram_dm` |
| B | `received_at` | every route |
| C | `property_id` | when the route knows it |
| D | `lead_id` | Meta form |
| E | `created_time` | Meta form |
| F | `full_name` | Meta form |
| G | `email` | Meta form |
| H | `phone_number` | Meta form |
| I | `campaign_id` | Meta form, when supplied |
| J | `ad_id` | Meta form, when supplied |
| K | `form_id` | Meta form |
| L | `page_id` | Meta form |
| M | `message_id` | Instagram |
| N | `conversation_id` | Instagram |
| O | `account` | Instagram |
| P | `handle` | Instagram |
| Q | `direction` | Instagram: `in` or `out` |
| R | `timestamp` | Instagram |
| S | `text` | Instagram |

Meta's native Google Sheets integration may insist on its own column layout or an empty sheet. Send a test lead before launch. If Meta cannot write into this layout with `source` filled, leave Meta forms on the email route instead.

## 3. Data validation lists

Data, Data validation, Add rule, Dropdown. Type the values exactly. Set "If the data is invalid" to **Show a warning**, not Reject, so the literal `clear` and connector writes still land.

| List | Values |
|---|---|
| channel | `chat voice note`, `chat transcript`, `chat note`, `email`, `web form`, `ad lead` |
| acquisition source | `Meta ad`, `website`, `ClickAdvisor`, `referral partner`, `walk-in`, `friend or family`, `other` |
| first channel | `WhatsApp`, `email`, `phone`, `in person`, `form`, `Instagram` |
| intended use | `vacation home`, `rental or investment`, `both`, `other` |
| record type | `touch`, `correction`, `decision` |
| event | `inquiry`, `unit_interest`, `tour_booked`, `tour_completed`, `hold_requested`, `hold_accepted`, `hold_released`, `deposit_paid`, `promesa_signed`, `closed`, `lost`, `referral_claim`, `question`, `note`, `presentation_sent`, `unit_selected`, `on_hold`, `nurture`, `owner_set`, `task_opened`, `task_reassigned`, `task_done`, `task_cancelled` |
| stage | `lead`, `contact and discovery`, `presentation`, `tour`, `unit selection`, `reservation`, `under contract`, `closed`, `on hold`, `long-term nurture`, `lost` |
| lead temperature | `cold`, `warm`, `hot`, `not a fit` |
| interest type | `villa`, `condo`, `both` |
| yes no | `yes`, `no` |
| unit status | `available`, `held`, `investor held`, `reserved`, `promesa signed`, `sold` |
| partner role | `participant`, `credited` |
| logged by | each name in the `operators` setting (training: `Carmen`, `Bea`), then any other name in `task_owners` (they log only their own task updates), then `scheduled job`, `web form`, `Meta integration` (the last two only matter if direct capture is turned on) |
| commission kind | `percent`, `fixed` |
| size unit | `m2`, `sq ft` |
| currency | `USD` |
| property | dropdown from range `Properties!A2:A` |
| review reason | `possible duplicate`, `identity uncertainty`, `unreadable source`, `referral conflict`, `missing attribution`, `missing date`, `hold confirmation`, `status confirmation`, `data repair`, `unsupported currency` |
| lost reason | `price`, `timing`, `financing`, `location`, `chose another property`, `unresponsive`, `other` |
| review status | `open`, `resolved` |
| task status | `open`, `done`, `cancelled` |
| task owner list | each name in the `task_owners` setting (training: `Carmen`, `Bea`, `Rodrigo`, `Elena Mercado`) |
| Intake source | `meta_lead_form`, `instagram_dm` |
| Intake direction | `in`, `out` |

Apply each list to the whole column from row 2 down (for example `Interactions!D2:D`).

Use acquisition source for People `source`, and first channel for People `first_channel`. Interactions `channel` records the transport used to log the update. For a walk-in reported later by voice note, save `source=walk-in`, `first_channel=in person`, and `channel=chat voice note`. Keep confirmed original attribution on returning inquiries. For new intended-use writes use the lowercase approved values above; older `own use`, `rental`, `investment`, and `mix` remain readable without a bulk rewrite. All dropdowns warn instead of rejecting older values.

### Lead identity and duplicates

Keep internal `person_id` unchanged. `lead_id` is a second unique identifier, `OCN-YYMMDD-###`. Use the confirmed first-contact date in America/Mexico_City, then one plus the largest suffix already allocated for that date (not row count); never reuse a deleted or retired ID. `scripts/lead-identity.mjs` implements allocation and duplicate checks. A missing first-contact date goes to Review, reason `missing date`, before allocating an ID; do not substitute today's date. Before a confirmed append, re-read People, recompute, and verify the allocated ID is absent. Read back uniqueness after saving. Concurrent conflicting allocations stop further writes and go to Review for reconciliation; the Sheet is not an atomic allocator.

Before creating a buyer, search names and every semicolon-separated phone/email value. Exact unique normalized email or phone is an existing-buyer candidate, never permission to append another buyer automatically. An exact email match, exact phone match, phone numbers sharing their last ten digits, shared contact details, or multiple candidates get one open `possible duplicate` Review item with all candidate person IDs and no new People row until confirmed. Normalize emails with trim/lowercase and phones by removing punctuation. Last-ten-digit overlap is only a duplicate warning, including local versus international formatting; preserve the supplied country code and never treat this as proof of identity or permission to merge. Confirmed same-person decisions use existing duplicate/survivor history, never delete history or reuse lead IDs.

## 4. Formula columns

The formulas below are written for the default layout. They read Interactions by column position, so after any column is added, moved, or deleted on Interactions, Pipeline, or Partners, or a formula column's Schema header changes, rebuild them (section 8). `scripts/formulas.mjs` produces the exact formula text for any layout; with the default layout it prints exactly the three formulas below.

Each formula goes in **row 1** of its column and replaces the typed header; the formula writes the header itself and fills every row below it. Cells below row 1 in these columns must stay empty: a typed value blocks the formula and shows `#REF!`. Claude never writes to these columns.

What the formulas do:
- They apply linked corrections first. A `correction` row that names an earlier row and carries a `timestamp`, `person_id`, `partner_id`, or `partner_role` replaces that value on the earlier row; the latest correction wins.
- **Only `touch` rows count as activity.** Decision and correction rows never refresh `last_touch` or `last_partner_touch`. `last_partner_touch` also requires `partner_role=participant`; credited rows do not count.
- The latest touch is ordered by local date, then by time. A date-only timestamp (`YYYY-MM-DD`) has no time, so within its day it is ordered by its `logged_at`. Timed values are converted to UTC from their offsets before comparing. The value shown is the original timestamp text.
- A person whose touches are all undated shows `unknown`. A person with no touches shows nothing.
- `days_since_last_touch` subtracts the last touch's local date from today in the sheet's time zone. It assumes timestamps carry the reporting time zone's offset, which the skills enforce.
- Confirmed duplicate buyers keep their own Pipeline rows here; the report merges them.

### Pipeline, cell C1 (`last_touch`)

```
=ARRAYFORMULA(VSTACK("last_touch", IFERROR(LET(
  d, FILTER(Interactions!A2:AH, Interactions!A2:A <> ""),
  id, CHOOSECOLS(d, 1), ts, CHOOSECOLS(d, 2), lg, CHOOSECOLS(d, 3),
  rt, CHOOSECOLS(d, 5), cor, CHOOSECOLS(d, 6), per, CHOOSECOLS(d, 7),
  fix, LAMBDA(col, MAP(id, col, LAMBDA(i, v,
    IFERROR(INDEX(SORT(FILTER(HSTACK(lg, col), cor = i, col <> ""), 1, FALSE), 1, 2), v)))),
  effT, fix(ts), effP, fix(per),
  utc, LAMBDA(t, DATEVALUE(LEFT(t, 10)) + TIMEVALUE(MID(t, 12, 8))
    - IF(MID(t, 20, 1) = "Z", 0, IF(MID(t, 20, 1) = "-", -1, 1) * (VALUE(MID(t, 21, 2)) / 24 + VALUE(MID(t, 24, 2)) / 1440))),
  known, (effT <> "") * (effT <> "clear"),
  latest, LAMBDA(mask, IF(SUM(mask) = 0, "",
    IF(SUM(mask * known) = 0, "unknown", LET(
      t, FILTER(effT, mask * known), l, FILTER(lg, mask * known),
      INDEX(SORT(HSTACK(
        MAP(t, LAMBDA(x, DATEVALUE(LEFT(x, 10)))),
        MAP(t, l, LAMBDA(x, y, IF(LEN(x) = 10, utc(y), utc(x)))),
        t), 1, FALSE, 2, FALSE), 1, 3))))),
  MAP(FILTER(A2:A, A2:A <> ""), LAMBDA(p, latest((rt = "touch") * (effP = p))))
), "")))
```

### Pipeline, cell F1 (`days_since_last_touch`)

```
=ARRAYFORMULA(VSTACK("days_since_last_touch", IFERROR(
  MAP(FILTER(C2:C, A2:A <> ""), LAMBDA(t,
    IF(t = "", "", IF(t = "unknown", "unknown", TODAY() - DATEVALUE(LEFT(t, 10)))))), "")))
```

### Partners, cell E1 (`last_partner_touch`)

```
=ARRAYFORMULA(VSTACK("last_partner_touch", IFERROR(LET(
  d, FILTER(Interactions!A2:AH, Interactions!A2:A <> ""),
  id, CHOOSECOLS(d, 1), ts, CHOOSECOLS(d, 2), lg, CHOOSECOLS(d, 3),
  rt, CHOOSECOLS(d, 5), cor, CHOOSECOLS(d, 6), pa, CHOOSECOLS(d, 8), role, CHOOSECOLS(d, 29),
  fix, LAMBDA(col, MAP(id, col, LAMBDA(i, v,
    IFERROR(INDEX(SORT(FILTER(HSTACK(lg, col), cor = i, col <> ""), 1, FALSE), 1, 2), v)))),
  effT, fix(ts), effPa, fix(pa), effRole, fix(role),
  utc, LAMBDA(t, DATEVALUE(LEFT(t, 10)) + TIMEVALUE(MID(t, 12, 8))
    - IF(MID(t, 20, 1) = "Z", 0, IF(MID(t, 20, 1) = "-", -1, 1) * (VALUE(MID(t, 21, 2)) / 24 + VALUE(MID(t, 24, 2)) / 1440))),
  known, (effT <> "") * (effT <> "clear"),
  latest, LAMBDA(mask, IF(SUM(mask) = 0, "",
    IF(SUM(mask * known) = 0, "unknown", LET(
      t, FILTER(effT, mask * known), l, FILTER(lg, mask * known),
      INDEX(SORT(HSTACK(
        MAP(t, LAMBDA(x, DATEVALUE(LEFT(x, 10)))),
        MAP(t, l, LAMBDA(x, y, IF(LEN(x) = 10, utc(y), utc(x)))),
        t), 1, FALSE, 2, FALSE), 1, 3))))),
  MAP(FILTER(A2:A, A2:A <> ""), LAMBDA(p,
    latest((rt = "touch") * (effPa = p) * (effRole = "participant"))))
), "")))
```

Line breaks inside the formulas are fine; Sheets accepts them when pasted. These formulas have not yet run in a live sheet; section 6 checks them against the training seed before anyone relies on them.

## 5. Protection

Data, Protect sheets and ranges, with **Show a warning when editing this range**:
- `Interactions!A2:AH` (every Interactions column from row 2), so a person editing an old row gets a warning.
- `Pipeline!C:C`, `Pipeline!F:F`, `Partners!E:E` (formula columns).
- After a layout change, `scripts/formulas.mjs` prints the ranges to protect instead.

Leave People `notes` and Pipeline `notes` unprotected; they are for people. Stage and likelihood overrides require an authorized operator confirmation and a reason, preserved in add-only history. Setup does not backfill overrides.

## 6. Training copy from the seed

1. Build the empty sheet as above, named `Sales desk sheet (training)`, with the Schema tab filled from `assets/schema.csv` (headers equal to keys, so the seed CSV headers line up).
2. For each CSV in `assets/seed/` (the same files as `training/seed/`), open the matching tab, then File, Import, Upload, **Replace current sheet**, separator Comma, and **uncheck** "Convert text to numbers, dates, and formulas."
3. Re-apply the formats and validation if the import cleared them.
4. Before adding formulas, copy `Pipeline!C:C`, `Pipeline!F:F`, and `Partners!E:E` into a scratch tab. These are the seed's precomputed values for October 2, 2026.
5. Clear `Pipeline!C2:C`, `Pipeline!F2:F`, and `Partners!E2:E`, then paste the three formulas into C1, F1, and E1.
6. Check: every `last_touch` and `last_partner_touch` value matches the scratch copy exactly (40 Pipeline rows, 50 Partners rows, with blanks where the seed is blank). `days_since_last_touch` matches only if today is October 2, 2026; on other days each value is larger by the same number of days. Then delete the scratch tab.
7. Make a copy named `Clean seeded sheet` and do not touch it again. Training resets restore from it.

## 7. Live sheet

1. Build the empty sheet as above, named `Sales desk sheet`.
2. For OCN use `live-units-template.csv` as an unfilled worksheet only: exactly 41 lot placeholders. Do not import placeholder IDs as verified Units. Ask Freddie to replace every placeholder with its actual lot ID and confirm type, price and status. The confirmed overall inventory is 17 sold and 24 available, but no sold-lot mapping is supplied. Never assign those statuses to particular lots or default them to available. Ask Freddie for the mapping; inventory remains pending until it reads back. Confirm base prices Casita $299,000, Nativo $450,000, Ola $550,000 against his inventory before saving actual unit rows. Preserve existing size, size_unit and square_footage values. Set size_unit to m2 for a new live OCN row, and leave size, size_m2 and size_ft2 blank until Freddie supplies an area, then derive only its missing counterpart with 1 m2 = 10.7639 ft2; do not invent measurements, lot types, dates, holders or deposit dates. Prices for buyer suggestions come from verified Units only. The Dec 1 price increase stays a Review question until confirmed.
3. Enter known partners in Partners, with `commission_terms` in the agreement's own words. Fill `commission_kind` and `commission_rate` only for an agreed sale-price percentage or fixed USD amount per unit; leave them blank otherwise.
4. Use `live-settings.csv` as a setup preview: mode live, report_clock blank, operators Alix; Freddie; Jackson. Ask for each task owner's actual Google email and color before saving the roster; placeholder tokens are prompts, never live values. Confirm role assignments, reporting time zone and morning account before saving. Never copy the training clock or training people into live Settings. Leave the other tabs empty below the header row.
5. Share the sheet only through the shared folder. The developer's report access never includes the sheet.

## 8. Changing the layout

The sheet belongs to the people using it. Through Schema they can make it read the way they like without breaking the desk.

- **Rename a column.** Change the header in row 1 and the matching Schema `header` cell to the same text. For a formula column (`last_touch`, `days_since_last_touch`, `last_partner_touch`), change only the Schema `header`, then rebuild the formulas; the formula writes its own header.
- **Reorder columns.** Drag columns freely, on any tab. Then rebuild the formulas if the tab is Interactions, Pipeline, or Partners.
- **Add your own column.** Insert it anywhere and give it a header that is not already in Schema. The desk keeps it and ignores it. To have the desk use a new column, add a Schema row with a new key, then update the skill that should fill it (the setup kit's CUSTOMIZING.md describes how).
- **Never** delete a column that has a Schema key, give two columns the same header on one tab, or rename a tab.
- Formats and validation normally move with a column; the rebuild step checks the two range-based dropdowns and the protected ranges. A column you insert gets Sheets' default format; set it to plain text if it holds IDs or dates.

### Rebuild the formulas

Say "rebuild the desk formulas" (the `desk-setup` skill, step 10), or by hand:
1. Write `layout.json` with the Schema rows and row 1 of Interactions, Pipeline, Partners, Units, and Properties, as the comment at the top of `scripts/formulas.mjs` shows.
2. Run `node scripts/formulas.mjs --layout layout.json`. If it lists problems, fix Schema or row 1 first.
3. For each formula: clear the cells it names below row 1, then paste the formula into the row 1 cell it names.
4. Check the two dropdowns it names still read from the right columns, and update the protected ranges it lists.
5. Read back three Pipeline rows and three Partners rows and compare `last_touch` and `last_partner_touch` with the values before the change. They must match.


## Workflow revision migration (rules 2026-10-13)

Append `workflow_json` after the existing Interactions columns and add its Schema row. Do not move columns, rewrite history or change Sheet access/protection. Preserve all existing formulas. Add missing Settings with safe defaults: `followup_alerts_enabled=no`, `followup_alert_recipient` blank until Alix is matched, `followup_alert_sender` blank until verified, `nurture_provider_verified=no`, `nurture_content_library=[]`. The library contains approved provider content-version references, no secrets. Do not enable either provider workflow from a training clock or a preview. Follow desk-workflows for its internal connection pilot and activation requirements.

## Upgrading to 0.9.0

On an existing desk, both "resume sales desk setup" and "rebuild the desk formulas" check and add the release field when missing:

- Interactions `lost_reason`: one plain-text column at the far right and one Schema row from `schema.csv` (`Interactions,lost_reason,lost_reason` plus its description).

Preview the additions and get the desk owner's yes. Preserve existing mappings, renamed headers, personal columns, data, history, formulas and protection. Read all occupied columns before choosing the append position; never insert, move, clear or backfill existing cells. Add only missing pieces and read back the header, mapping, plain-text formats and warning-only validation. If a header already exists, reconcile it before adopting or adding anything; never duplicate a header or Schema key. An interrupted upgrade resumes from what read back successfully. This release adds no new tab or setting. Missing values remain blank and reports group them as Not recorded.

Append `lost_reason` after the existing Interactions columns, without moving any columns. Text, warning-only validation: `price`, `timing`, `financing`, `location`, `chose another property`, `unresponsive`, `other`. Fill only on a confirmed lost/on-hold change; blank means not recorded. Corrections are add-only.


Segments uses the existing People `intended_use` field. No additional People column or qualification question is needed.

## Upgrading to 1.0

Preview missing People `lead_id`, `source`, `ad`, `likelihood_override`, `override_reason`, `budget_flag` and Pipeline `stage_override_reason`, then append only missing columns at the far right after owner confirmation. New sheets place `stage_override_reason` next to `stage_override`; existing sheets keep their current order. Preserve existing mappings, personal columns and data exactly as in the 0.9.0 migration. Apply warning-only validations, read back every header/mapping, and rebuild formulas from the resolved layout. Do not backfill lead IDs without confirmed first-contact dates or infer source from a later note's transport. Never convert old intended-use values in bulk. New sheets also append Interactions `lost_reason` at AH (plain text, lost-reason warning list).

### Launch Review

Live setup/resume ensures unresolved price and fact-sheet questions, idempotently, under desk-setup "Launch questions." Use `price confirmation` for the Dec 1 increase and `fact sheet` for rental returns and ocean-facing villas. Keep confirmed resolutions closed. Append the optional Units `square_footage` column and mapping if missing during live setup; keep it blank. Missing questions are included in the setup preview and require approval before appending and read-back. No claim is seeded as a fact.
