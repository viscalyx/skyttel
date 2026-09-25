# Durable save operations

This contract is for developers maintaining map clients, household import
and permanent erasure. HTTP, browser and assistant clients use the same
operation identity and results through the shared map rules.

## Registration and recovery

`GET /api/households/:id/map` provides the private content owner's `userId`,
current `contentVersion`, and private draft version. The content owner can
differ from the authenticated login after explicit recovery mapping.
Save requests contain only
`operationId`, `version`, and `contentVersion`. Generate an operation ID
once and retain the complete request for retries. Omitting `contentVersion`
means generation 1, never the household's current generation.

1. `POST /api/households/:id/map/operations` registers that request and
   returns `{ operation }`. Registration commits before any map changes.
2. `POST /api/households/:id/map/save` submits the same request. Success
   returns `{ receipt }`; a known rejection returns `{ error }` and its
   HTTP error status. The save endpoint also registers requests from
   clients that omit the separate registration call.
3. `GET /api/households/:id/map/operations` discovers the caller's pending
   operations and twenty most recently created terminal operations.
4. `GET /api/households/:id/map/operations/:operationId` returns
   `{ operation }`, including older terminal results. A missing operation
   returns `{ operation: null }`.

Operations include the user, household, operation ID, draft version,
content version, and creation time. The `SaveOperation` union in
[`src/shared/map.ts`](../../src/shared/map.ts) has these durable outcomes:

<!-- markdownlint-disable MD013 -->

| Status | Meaning | Client action |
| --- | --- | --- |
| `pending` | Registration persists; no terminal result exists. | Check or retry the same request. |
| `succeeded` | Map changes, history, consumed draft, and receipt commit together. | Verify the receipt identity and reread the map and history. |
| `rejected` | The error code persists; the attempted map transaction has no effects. | Explain the rejection; reread and correct the draft. |

<!-- markdownlint-enable MD013 -->

An unknown outcome is a client's observation when a response or status
check is unavailable. It is not a durable server status. A missing result
does not prove failure: an earlier request may still be arriving. Never
replace an unknown request with a new operation ID, claim success from
local state, or claim that a disconnected save was undone.

While the caller has a pending operation, draft edits, conflict resolution,
discard, and registration of another operation return `operation_pending`.
Retry the pending request to obtain its terminal result before editing.
Other household members can continue using their own drafts.

## Identity, transactions, and errors

Every read and retry checks current household membership. Operation lookup
is private to its actor, including for administrators. Another member's
operation ID gives the same missing result as an unknown ID. Shared map
history continues to include successful changes by all household members.

An operation binds its request to the draft snapshot at registration. The
server stores a SHA-256 digest of that snapshot while pending. Reusing an
ID with another version or altered snapshot returns `operation_conflict`.
Unexpected request fields and malformed identities return `invalid_request`.
Requests from another content generation return `content_conflict`.

A stale registration itself records a rejected `draft_conflict` result.
Other map validation failures roll back the complete map transaction before
recording their rejected result. Repeating a rejected request returns the
same error even if the current draft later changes. Retrying a successful
request returns its existing receipt without adding history or consuming
another draft. Unexpected storage errors preserve the pending registration;
the client must check or retry because a missing response is inconclusive.

Migration 006 preserves older receipts, assigns them content generation 1,
and makes their successful operations discoverable. Ordinary server restarts
preserve drafts, pending operations, rejections, and receipts in SQLite.

## Import, erasure and content generations

Administrators use the public
[household import](household-import.md) and
[permanent erasure](household-erasure.md) lifecycles. These capabilities are
absent from assistant tools. Both use the shared maintenance coordinator,
which commits a durable content gate before asynchronous cancellation and
cleanup. The content change and generation increase then commit atomically.
Clients must check the administrative operation's own status after a lost
reply; a map-save receipt is not an import or erasure receipt.

The current generation trigger retires live operation IDs and clears only
the live `map_operation` authority. It does not delete all drafts, saved
receipts or history. Import replaces those collections explicitly; scoped
erasure prunes affected content while preserving independent history and
private work. Do not reintroduce the older household-wide trigger as an
erasure shortcut.

Imported operation evidence belongs to `historical_operation`; retired
operation IDs cannot become new current requests. Historical receipts keep
their original generation and author. New proposals use the target's current
generation and explicitly mapped content owner. The
[recovery contract](household-recovery.md) describes that mapping without
restoring old authentication or membership.

A failed content transaction rolls back its generation increase and writes
together. Old requests fail with `content_conflict` even when their draft
version or object IDs reappear. Never attach the latest generation to an
old request. Physical cleanup can remain pending after a committed content
change; the durable maintenance gate stays closed until cleanup succeeds.
Follow the import or erasure status and recovery procedure instead of
clearing operation rows or treating a missing response as failure.
