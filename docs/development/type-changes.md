# Object type changes and retained meaning

This guide is for developers of map editing, conflict resolution, export,
import and permanent erasure. Type changes use the existing object ID,
private draft and atomic whole-save path. They do not replace objects or
rewrite relationships. No additional database table or migration is needed.

## Review and conflict semantics

The editor starts the new type's custom fields unanswered and shows displaced
values until the user explicitly handles them. The ordinary proposal endpoint
accepts the complete desired object value and validates every supplied custom
field against the selected type. It never infers a conversion from field names.
An absent boolean and false remain different facts.

Field IDs belong to a type. When compared object values have different types,
conflict resolution treats type and all custom values as one choice. With the
same type, independent custom fields can still merge separately. Other facts,
including financial facts and the optional profile image, remain independent.

Undo uses the same rule. A type change creates an `objectMeaning` entry in
server-authored `undoFields`, covering the type and its entire custom-value
set. Later changes to that set require a conflict choice. Own overlapping
custom-field proposals block undo; unrelated private facts remain when the
user chooses either the saved or proposed type. Existing undo metadata without
this entry remains readable.

## Persistence inventory

- `map_object` keeps the existing `typeId` and `customValues` columns.
- `map_draft.changes` retains `before`, `after`, target `type`, optional
  source `beforeType`, and any `undoFields`. Source snapshots keep the old
  field labels readable if the current catalog changes. Existing drafts
  without a source snapshot use their available saved definition.
- `map_save.receipt.changes` and `map_history.changes` retain the existing
  saved `before`/`after`, `type` and optional `beforeType` snapshots. Saved
  receipts continue to include actor and time through the history contract.

Export and import must preserve these nested values, definitions and undo
metadata with stable object and field IDs. Permanent erasure must include
these retained snapshots in every affected private draft and saved record.
Ordinary type changes do not erase history. These downstream workflows have
separate implementation scope; this guide does not claim they are available.
