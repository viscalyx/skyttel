# Object merge persistence

This guide is for developers extending history, export, import, permanent
erasure, and clients that edit household content. Object merges belong to
the existing private draft and use its version, whole-save operation,
receipt, and undo boundaries. No alias redirects an old object identity.

## Compound proposal

The authenticated map merge endpoint accepts two explicit identities,
reviewed effective objects and incident relationships, a separate identity
confirmation, and choices for differing facts and every incident edge.
Custom values retain their source type meaning. Fields from another type
must be explicitly omitted. An unconfirmed proposal blocks the whole save.

Object and edge changes use ordinary before and after snapshots. All edges
incident to either object enter the checked change set. Kept edges replace
only the absorbed endpoint; null endpoints, knowledge, status and dates
remain. Colliding kept edges reject the entire proposal. A new edge to the
absorbed object after proposal blocks the entire save through endpoint
validation. The user cancels the compound proposal and reviews current
identities and edges before supplying another save instruction.

Changes belonging to a merge cannot be edited individually. Discarding any
member restores the prior affected private proposals while retaining other
draft work. Undo of unrelated history remains available. History undo uses
ordinary retained rows, exact original identities and fact conflict rules;
it never creates a missing retained row from a merge snapshot.

## Persisted inventory

The surviving draft object change contains `merge` metadata inside
`map_draft.changes`. It stores both stable object IDs, identity confirmation,
the reviewed object and relationship snapshots, retained source type
definitions and endpoint names, prior affected private proposals, and
optional image copy lineage. Grouped discard restores those prior proposals.
The snapshot can include effective facts from the owner's private draft.

On save, the receipt's surviving object change retains the same metadata
except the prior private proposal arrays. This appears in `map_save.receipt`
and `map_history.changes`; ordinary before and after changes describe the
actual shared transition. Historical snapshots have no automatic expiry.
New objects that exist only in the same draft have no prior shared state;
whole-save undo reverses their creation, as for ordinary proposals.

Selecting an absorbed object's image deliberately copies its encoded bytes
to a new version owned by the survivor. The original ownership never changes.
`merge.imageCopy` records `sourceObjectId`, `sourceImageId` and `copiedImageId`.
Source image references occur in `merge.objects[].profileImageId`. Access and
pruning inspect this exact server-authored path and the ordinary before and
after paths. Arbitrary custom field keys never grant image access. Receipts
are inserted before draft cleanup in the same transaction, so retained
historical image references remain reachable.

## Full export, import and erasure contract

Include these JSON records, original and copied image versions, retained
removed rows, and stable identities with the rest of household content.
Preserve user ownership of drafts and historical attribution. Validate
household boundaries, object ownership, type meanings and image lineage
before atomic import; restoring old content must not restore old access.

Permanent erasure must remove affected information from current and removed
rows, every private draft including prior proposals and merge snapshots,
both historical JSON locations, and original and copied image versions.
Follow copy lineage when erasing the source image or absorbed identity so a
copy cannot retain the erased information. Invalidate pending operations and
client views as required by the whole-content replacement contract. A cached
merge snapshot must never recreate an erased identity or edge. The actual
administrative endpoints belong to the export, import and erasure work items.

Personal placements remain attached to their original object IDs. A merge
does not transfer them; restoring an identity makes its placement relevant
again. See [profile image persistence](profile-images.md).
