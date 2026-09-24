# Household export format and lifetime

This guide is for developers implementing recovery, import, permanent
erasure, or another reader of a full household export. The archive contains
private household content. It is not an authentication database or an
automatic backup.

## Version 1 envelope

The ZIP contains exactly three regular files, with these case-sensitive
names and no directory entries:

1. `manifest.json`: a UTF-8 JSON object.
2. `content.json`: a UTF-8 JSON object containing the collections below.
3. `images.bin`: consecutive encoded WebP images, without separators.

ZIP64 is used automatically when an entry or archive requires it. JSON
entries use DEFLATE; the encoded image entry is stored without additional
compression. No original uploaded image, operating-system path, or
authentication material is added. The writer uses
[yazl's streaming ZIP API](https://github.com/thejoshwolfe/yazl).

The manifest contains:

| Field | Meaning |
| --- | --- |
| `format` | Exactly `skyttel-household`. |
| `version` | Integer `1`; the public archive format version. |
| `createdAt` | UTC ISO timestamp when the content snapshot is complete. |
| `householdId` | The stable source household identity. |
| `schemaVersion` | Source database migration version; currently `15`. |
| `parts` | Exactly two records, for `content.json` then `images.bin`. |

Each part record contains `path`, the uncompressed byte count `bytes`, and
lowercase hexadecimal `sha256` of those exact uncompressed bytes. These
checksums validate archive content; they are not signatures or proof of
authority. The manifest does not contain a circular checksum of itself.
ZIP checksums also cover its entries. Reject duplicate, missing, unexpected,
or path-traversal entry names before import.

All byte counts, offsets, and lengths are nonnegative safe JSON integers,
at most `9007199254740991`. An image length is positive. The exporter fails
instead of rounding an unrepresentable archive size. Do not trust ZIP size
claims alone: count actual bytes while reading and check the manifest and
each image record. Empty image collections use `images: []` and an empty
`images.bin`; its part checksum is SHA-256 of zero bytes.

## Content inventory

The content object has the following members. Collections are arrays, even
when empty. Row columns keep their stored names, stable identities, nulls,
versions, and retained deletion flags. JSON columns listed below are parsed
JSON values, not JSON strings inside JSON. Generic nested snapshot fields
remain intact; an exporter does not reconstruct history from today's
definitions.

<!-- markdownlint-disable MD013 -->

| Member | Stored content and JSON columns |
| --- | --- |
| `household` | One source household row: `id`, `name`, `createdAt`, `contentVersion`. |
| `identities` | Referenced historical identities with only `id` and `name`. |
| `objectTypes` | All current and retained `object_type` rows. |
| `objectTypeFields` | Household-scoped `object_type_fields`; `fields` is JSON. |
| `relationshipTypes` | All current and retained `relationship_type` rows. |
| `relationshipTypeLabels` | Household-scoped forward and reverse labels. |
| `removedTypes` | Household-scoped `removed_type` records: `kind`, `typeId`. |
| `objects` | All `map_object` rows, including deleted rows; `financialFacts` and `customValues` are JSON. |
| `relationships` | All `map_relationship` rows, including deleted rows; `endDate` is JSON. |
| `drafts` | Every owner's `map_draft`; `changes`, `relationships`, `objectTypes`, and `relationshipTypes` are JSON. |
| `saves` | Every complete `map_save` record; `receipt` is JSON. |
| `history` | Every `map_history` row; `changes` is JSON. |
| `operations` | Durable `map_operation` records as historical evidence, not permission to retry an old operation. |
| `positions` | All stored `personal_position` rows, including removed and private object IDs. |
| `viewSettings` | All `personal_view_settings` rows; `settings` is JSON. |
| `images` | All household image records with the byte catalog described below. |

<!-- markdownlint-enable MD013 -->

Object `identity` remains the stored string or null. Relationship knowledge
and null targets preserve unknown, explicitly none, and uncertain meanings.
Custom values preserve false, zero, absent, and null distinctions from the
stored record. Definition fields retain their stable IDs and kinds.

The object and relationship catalogs include retained rows needed by old
content. Type tombstones are scoped through their corresponding definition
rows because the tombstone table itself has no household column. Export
does not use public personal-view reads, which hide retained placements.

`saves` is the complete history source, including relationship and definition
changes, actor names, earlier definitions, timestamps, and change groups.
`history` alone does not contain all of that information. Preserve both.
See [type changes](type-changes.md) and [object merges](object-merge.md).
Merge snapshots, prior private proposals, source definitions, and image-copy
lineage remain inside their existing nested JSON locations.

Definitions and objects are ordered by ID; drafts and views by owner and
object; saves and operations by owner and operation; history by row ID;
tombstones by kind and type ID. Ordering supports inspection but does not
replace identity-based references.

## Encoded image catalog

Each image catalog record preserves `id`, `householdId`, `objectId`,
`createdBy`, `width`, and `height`. The stored BLOB is replaced by:

- `offset`: its first byte in the uncompressed `images.bin`.
- `length`: the number of encoded bytes, from 1 through 262144.
- `sha256`: lowercase SHA-256 of exactly that segment.

Catalog records are ordered by image ID. The first offset is zero. Each
next offset equals the preceding offset plus length. The last segment ends
at the exact binary part size. Validate bounds, safe-integer addition,
non-overlap, complete coverage, encoded format, and dimensions before import.
Dimensions remain from 1 through 300 pixels on each axis.

All retained versions are included, including another user's private image,
historical versions, and original and copied versions from a merge. These
are encoded stored images; export does not invent original upload bytes.
Validate typed references and image ownership. Arbitrary custom-field names
or text that resembles an image ID do not establish an image reference.
See [profile image persistence](profile-images.md).

## Identity, access, and import

Identity records cover owners and authors referenced by drafts, saves,
history, operations, images, placements, and settings, including people
without current membership. Historical receipts retain their own actor-name
snapshots; the identity name does not replace those snapshots.

No sessions, provider accounts, emails, verification evidence, membership,
invitations, login-link state, assistant connections, OAuth tokens, or
server keys are exported. Historical identity records never authorize a
login or grant household access. Import must preserve attribution separately
from verified current account and ownership mapping. Do not create login
users from archived names or IDs.

Import must validate the complete archive and typed current and historical
references before mutation, then replace content atomically. It must not
replay exported operations or treat an exported content generation as a
current concurrency token. New content collections or incompatible meanings
require an explicit format revision and importer support; do not silently
drop unknown history fields during export.

## Snapshot and protected lifetime

`prepareHouseholdExport` opens a separate read-only SQLite connection and
one read transaction. Membership, household, definitions, private content,
images, and identities share that snapshot. File writes yield between rows,
so application writers can continue on their normal connection. A final
administrator and content-generation check precedes publication. Ordinary
saves do not change that generation or invalidate a completed snapshot.

The process streams one row or bounded encoded image at a time to protected
scratch files beside the database, then streams those files into the ZIP.
Memory follows the largest stored row, not the complete household. ZIP
metadata has three entries regardless of image count. Download buffering
uses a 64 KiB byte queue. There is no small total archive limit or household
storage limit introduced by export. Disk capacity must cover both snapshot
parts and the ZIP during preparation.

One preparation and at most two retained jobs are allowed per application
database. A new own preparation removes that owner's older handle. The
ready descriptor contains only `id`, `bytes`, and `expiresAt`. A ready copy
expires after ten minutes, and retrieval is allowed once. The current
administrator, household, and requesting owner are checked again at
retrieval. Files use mode `0600` inside `0700` directories and have no public
static URL. Errors use fixed codes and content-free diagnostics.

Administrator demotion and membership revocation commit the access change
first, then await cancellation of that owner's preparing, ready, and active
exports before responding. Other administrators' copies remain available.
The optional `actorId` argument to `invalidateHouseholdExports` provides
this owner scope; omission still invalidates the whole household. Data
already delivered or buffered in the network cannot be recalled.

Interrupted preparation, explicit cancellation, download completion or
cancellation, and expiry close readers and remove their files. Startup
removes abandoned copies before serving export routes. Only a complete ZIP
has a ready handle. The UI checks the complete response size and media type
before starting a browser file download; an interrupted one-use download
requires a new preparation.

`invalidateHouseholdExports(database, householdId)` aborts active snapshot
readers and download streams and removes ready artifacts. Await it before
database erasure or checkpoint cleanup. The caller must establish its
household maintenance/generation gate first and retain it through the
complete replacement or erasure, so a new export cannot start in the gap.
Advancing `contentVersion` also makes older prepared handles unavailable;
it does not replace cancellation of live readers. Bytes already delivered
to a client cannot be recalled by server-side erasure.

Import support and historical ownership are specified in
[the replacement guide](household-import.md).
