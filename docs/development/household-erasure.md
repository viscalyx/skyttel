# Permanent household erasure

This guide is for developers maintaining erasure, content storage, import,
or exports. Application users follow the
[erasure guide](../users/household-erasure.md). Operators
use the [recovery runbook](../operations/permanent-erasure.md).

## Reviewed scope

The administrator selects objects, relationships, or their definitions.
The catalog includes retained shared content and the administrator's own
private proposals. It does not reveal another owner's private-only names,
identifiers, descriptions, or images. The review lists known affected
identities and image versions, with counts for hidden private impact and
personal positions. The opaque review token covers every stored content
snapshot that can change the reviewed scope, including private proposals.

Current objects using a selected object type are explicit dependants.
Current relationships using a selected relationship type, or connecting
a selected object, are explicit dependants. An ordinary removed row is
still retained content and follows the same rule. A historical endpoint
or former type alone does not select today's otherwise independent row.

A merge links its source and survivor identities. Scope follows this
lineage transitively, including copied images, and shows every additionally
affected public identity before confirmation. It does not follow an
ordinary relationship into its other endpoint object.

Only documented typed paths are references. A custom field named like an
erased identifier, or arbitrary text containing that identifier, remains
ordinary data. Erasure is not a text search and replacement operation.

## Retained content traversal

`erasure-content.ts` computes scope; `erase-household-content.ts` applies it
inside the common maintenance transaction. Maintain both when introducing
a new content path. The traversal covers:

- Current and removed object and relationship rows; definitions, field
  definitions, relationship labels, and definition removal records.
- Every owner's private proposals, including before/after values, type
  snapshots, undo fields, generated relationship deletion owners, merge
  snapshots, and previous proposals that discarding a merge could restore.
- Saved receipts and the separate history index, including mixed groups,
  endpoint-name dictionaries, former types, and merge/image-copy evidence.
- Every retained encoded image version owned by an affected identity,
  including private versions and copies created by merges. Also remove
  versions whose last typed reference disappears from the retained content,
  even when their current object survives a former type's erasure.
- Every owner's positions for affected objects. Display settings contain
  no content references and remain unchanged.
- Live operation authority, retired operation identifiers, and imported
  historical operation evidence. Generation advancement retires live
  attempts. An emptied receipt loses its historical operation record;
  a pruned mixed receipt loses its obsolete draft hash.

Prune affected atomic changes from mixed receipts; retain the remaining
group's identity, author, and time. Remove empty groups. Do not invent a
historical snapshot by turning a missing before value into creation.
Fresh-context undo can still use surviving history after the generation
change. Old retries cannot create new authority from an old operation ID.

For a private edit whose obsolete meaning mentions erased content, keep
independent expected/proposed facts and its original revision. Replace
only the erased object type/custom-value group or relationship meaning
with the current clean meaning. Preserve independent conflicts. A current
relationship B→C remains when its old A→C snapshot is erased, and a private
end-date proposal remains subject to its original conflict checks. A
current object of type U remains when former type T is erased; its current
U values, including `false`, remain intact.

Review and execution use the same in-memory projection of surviving drafts,
receipts and history. Image references include current objects, before/after
snapshots, merge objects, source/copy evidence and nested prior proposals;
each reference must match the image's owning object. A surviving reference
preserves that version, including another owner's independent private work.
Report newly unreferenced versions in the reviewed image count and remove
them in the erasure transaction before physical cleanup. Public versions
appear by ID; other owners' private-only versions remain aggregate counts.
Unrelated image rows already lacking references before erasure remain
outside the selected scope, including rows retained by a complete import.
Do not use a household-wide orphan sweep or treat arbitrary text as a link.

## Durable operation and cleanup

The HTTP routes require a current administrator, authenticated browser
session, and same-origin JSON mutation. There is no MCP erasure operation.
Execution requires the reviewed selection/token, a stable operation ID,
and the exact irreversible confirmation. The same ID and request recover
the same operation; different content with that ID is rejected.

The shared coordinator commits `prepared` before asynchronous export
cancellation. This blocks target-household content access and writes.
After target exports, active downloads, and import uploads stop and all
their protected temporary files are removed, an immediate transaction
rechecks administrator access,
applies erasure, advances the generation, and enters `cleanup`. It clears
the identifiers-only scope payload in that same transaction. Only counts,
operation identity, and a one-way request digest remain for recovery.

`secure_delete=ON` applies before content deletion. Cleanup requires a
successful truncating checkpoint, `VACUUM`, another successful truncating
checkpoint, zero free pages, a successful quick integrity check, and no
foreign-key violations. Temporary SQLite work uses memory. A busy reader
or filesystem failure leaves the operation pending; it never produces
completion. An erasure in `cleanup` blocks content access across the
installation because WAL and free-page cleanup cover the whole database.

Only `completed` means the application cleanup checks passed. A failure
before the replacement commits retains `prepared` with unchanged content;
a later failure retains `cleanup`. Both are resumed through the same
administrator endpoint, including after restart. Status remains readable
while content is protected. Do not clear a pending row to reopen content.
Cancelled uploads whose files cannot be removed remain registered for
cleanup. Draining an upload alone is not proof that its bytes were removed.

The [manual cases](../manual-tests/household-erasure.md) have matching real
browser tests. HTTP/SQLite tests also exercise mixed history, private
conflicts, image lineage, pinned WAL readers, rollback, stale authority,
and raw database/journal sentinel absence after completion. Human manual
acceptance is tracked with the complete specification's deferred checks.
The production-container check keeps a separate SQLite reader alive across
a literal application-container restart, then verifies the same pending
operation, successful cleanup, stale-request denial, and surviving content.

## Storage limits

SQLite documents [secure deletion](https://www.sqlite.org/pragma.html#pragma_secure_delete),
[truncating checkpoints](https://www.sqlite.org/pragma.html#pragma_wal_checkpoint),
and [VACUUM reconstruction](https://www.sqlite.org/lang_vacuum.html).
These checks cover application-controlled database content and temporary
exports. They do not establish immediate physical erasure from storage
provider snapshots, filesystem history, SSD remapping, or downloaded
archives. Downloaded archives remain unchanged; an explicit later import
can restore their old content.
