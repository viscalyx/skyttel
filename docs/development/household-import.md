# Household replacement and historical ownership

This guide is for developers adding recovery, owner mapping, assistant
mutations, and erasure. The current administrator imports through the web
application. No assistant receives an import capability.

## Public lifecycle

`POST /api/households/:id/imports` accepts `application/zip` with
`X-Skyttel-Content-Version`. It validates a protected uploaded copy and
returns `201` with `id`, `status: ready`, `contentVersion`,
`sourceHouseholdId`, collection `counts`, and `expiresAt`. No content changes
at this stage. Uploads are limited to 1,100,000,000 bytes; extracted
`content.json` to 32 MiB, `images.bin` to 1 GiB, and the manifest to 16 KiB.
Only one upload/validation runs per installation; at most two ready copies
are retained. The ZIP central directory must contain exactly the three
format entries, with bounded validated decompression and checksums.

`POST /api/households/:id/imports/:id/confirm` accepts exactly
`{contentVersion, confirmed: true}`. It commits a maintenance gate before
awaiting cancellation of other import copies and exports. An atomic
transaction rechecks current administrator authority and the generation,
replaces content, increments the generation, and enters cleanup. A content
fingerprint rejects changes made to shared or private content since upload
started. Memberships, invitations, login bindings, and authentication users
are not replaced. Stable IDs that collide with another household reject
replacement rather than changing the other household.

`GET /api/households/:id/imports/:id` reports ready, prepared, cleanup,
completed, or failed. Confirmation retries compare their durable request
digest and cannot apply replacement twice. Cleanup can be retried by the
same confirmation. A failed transaction leaves the old household intact.
A lost response has an unknown outcome until this status is read.

Temporary files use a private directory beside the database, with mode
0700 directories and 0600 files. Ready copies expire after ten minutes.
Startup removes temporary material before marking interrupted prepared
imports failed or committed cleanup imports completed. It does not undo a
committed replacement. Failed cleanup keeps the durable content gate shut.
Technical logs contain fixed event codes, not archive values or file paths.

## Supported content and ownership

Version 1 archives from database schema 14 and 15 have the same serialized
content shape. Their explicit migration inserts all historical owners into
`content_identity`, independently of authentication. No archived identity
creates a login user. Same-household replacement retains only an existing
verified identity-to-login binding. Foreign archive names, email-like text,
and even matching identity IDs never establish a binding. Unmapped private
drafts and personal views remain stored and included in administrator
exports; ordinary members cannot claim them by logging in.

[Recovery owner mapping](household-recovery.md) explicitly binds
`content_identity.userId` to a verified current login after administrator
confirmation. The nullable
binding is unique per household and current user. Membership still grants
access separately. A new current member gets a distinct owner when an
unmapped imported identity already uses the member's login ID.

Saved receipts retain their original actor, origin scope, timestamp, and
content generation. Working drafts and fresh undo proposals project only
typed household scopes to the current target. Custom-value strings are not
rewritten. Personal positions may intentionally retain an object ID after
a never-saved private object was discarded; those rows remain preserved
and exported even when ordinary reads filter them out. Image owners must
resolve a retained current, private, or historical object identity. History
images authorize through the current target household. Current live edges
must resolve current live endpoints and types. Historical snapshots may
retain deleted identities and old field meanings. Every definition snapshot
still obeys the field-count, field-ID, name and value-kind rules.
Imported operations enter `historical_operation`; they are export evidence,
not live save attempts. `retired_operation` prevents old local or imported
operation IDs from acquiring a new meaning after replacement.

## Shared maintenance and client contract

Use `householdMap(database, authenticatedActorId, householdId)` as the public
domain entrypoint. `read().userId` is the private content owner and can differ
from the authenticated actor. Capture `read().contentVersion` with every
proposal. Pass it to every mutation, including undo, discard, images and
personal views. Omitted generations belong only to initial generation one.
Do not attach the latest generation to a proposal captured before import.
A generation increase retires live operations but preserves unrelated
history and drafts for scoped erasure.

`contentMaintenance` commits the durable gate before asynchronous work;
its `apply` callback and generation increase share one transaction. Status
and administration remain available. Erasure cleanup gates all household
content while database-wide physical cleanup is pending. Erasure must await
both `invalidateHouseholdImports` and `invalidateHouseholdExports` after
committing its gate and before deleting content. Import invalidation drains
aborted uploads before deleting prepared files.
