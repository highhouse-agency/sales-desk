# Literal writes when the value tools lack RAW

Use this route only when the connected Sheets tool supports the required batch requests and raw grid reads. The October 16 training check verified exact `=1+1` source text and a leading-plus fictional phone through explicit string cells. That is evidence for the method, not proof that another connector exposes it.

## Before writing

Keep the approved preview and desk-log's history-first order. Resolve the spreadsheet, numeric tab ID, headers and writable columns from fresh metadata and Schema. Read the record ID and source-key columns to detect a saved event before retrying. A timed-out write may have succeeded: reconcile first, never append a duplicate blindly.

Check the actual append extent when the tab contains array formulas or prefilled rows. The append must preserve formula columns and land in the supported data area. If placement or literal read-back cannot be established, pause that affected write. Never test placement by deliberately writing an out-of-range row or estimate an empty row to overwrite.

## New rows: append, then locate

Use a supported `appendCells` request with the observed numeric `sheetId`, `rows` containing `values`, and `fields: "userEnteredValue"`. Each supplied text value is a cell of this form:

```json
{"userEnteredValue":{"stringValue":"=1+1"}}
```

Build the row to the full width of row 1 and place values in their Schema-mapped columns. Emit an empty cell object `{}` at every empty position, including an empty `source_link` / Original file and trailing cells. Never compact the values array: `logged_by`, `source_key`, stage and later fields must retain their header positions. Verify these positions in the read-back. Only include approved writable data; keep protected/formula columns untouched. Preserve exact text, including spaces, leading zeros and punctuation. Do not convert source strings to `formulaValue` or `numberValue`, add an apostrophe, or rely on plain-text formatting. Do not supply a guessed start row. `repeatCell` is not an append operation.

After each append, locate the unique row by its stable ID and source key using a fresh read. Verify the raw cells before proceeding to dependent record changes. If there is no unique match, preserve the rows and report reconciliation instead of overwriting one.

## Existing cells: identify, re-read, then update

Resolve the row by its unique record ID and the column by Schema. Re-read its current value immediately before writing; if it differs from the approved preview, show the change and reconfirm. Use a narrowly bounded `repeatCell` range for that cell, `cell.userEnteredValue.stringValue` for the exact text, and `fields: "userEnteredValue"`. Do not apply a whole-row update that clears other fields, formatting or formulas.

An explicitly approved restoration to blank clears only that cell's user-entered value, using the connector's supported clear operation or an empty `cell` with that same narrow field mask. Do not substitute a space or an apostrophe. Follow the field's normal contract: this is not permission to clear a protected field, alter earlier Interactions, or change a schema-defined sentinel such as Pipeline `clear`.

## Read-back and recovery

Inspect raw grid data for the located row/cell. A supplied string must have exactly the intended `userEnteredValue.stringValue`, no formula or numeric value, and the expected effective value. A displayed value alone is insufficient. An approved blank restoration must read back empty. Formula cells elsewhere are expected and must remain untouched.

Keep each history/current-record receipt separately. On partial or uncertain results, preserve verified work, check saved keys and current values, and report the remaining step. Corrections to Interactions are new correction rows; never edit or remove the original. A failed literal check is not a successful save and does not authorize an unpreviewed repair.
