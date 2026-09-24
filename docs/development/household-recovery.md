# Historical content ownership after recovery

A full archive is portable content, without authentication authority. Follow
the [operator runbook](../operations/recovery.md) to restore onto an empty
installation, then assign historical private content explicitly. No schema
change is required: schema 15 already separates `content_identity.id` from
its nullable current `userId`. Archive format 1 remains unchanged.

## Public interface

Current household administrators can read
`GET /api/households/:id/content-owners`. The response contains
`contentVersion`, historical identity IDs and names, current bindings,
private proposal and position counts, a view-settings presence flag,
verified current members, and the count of pending live save operations.
It does not return private proposal values. Eligible members must already
have a Google or Microsoft account in this installation. Membership and
provider-account linking remain separate workflows.

Assignment uses `POST /api/households/:id/content-owners/assign`, same-origin
JSON and the ordinary build header. The exact body is:

```json
{
  "identityId": "historical-content-id",
  "userId": "verified-current-member-id",
  "contentVersion": 3,
  "confirmed": true
}
```

Use `userId: null` to leave an identity without a current owner. Authentication,
current administrator access, the maintenance gate, current content generation
and eligible membership are checked within the immediate SQLite transaction.
Unknown identities return 404; stale content and an ineligible member return
409. Anonymous and unauthorized callers receive 401 and 403 respectively.

## Atomic reassignment

An identity can have one current user, and each household member can own one
historical identity. Reassignment detaches the target member's previous
identity and then attaches the selected identity. The displaced identity and
all its private content remain stored, unmapped, and available for a later
explicit reassignment. A previous owner retains household membership but
loses access to that private content. Their next map read creates an empty
personal identity if they no longer have one. No private records are merged.

Before increasing the content generation, all live save attempts are copied
into historical operation evidence. The existing generation trigger retires
their operation IDs and removes live retry authority. Pending evidence stays
pending; it is never promoted to a confirmed save. All bindings, evidence and
the generation change commit together or roll back together. Repeating an
already-current binding is a no-op, with no generation increment.

Every old client must reload before editing, even if its draft or personal-view
version happens to equal the newly selected owner's version. A fresh generation
cannot reuse retired operation IDs. Immutable receipt authors, history, object
IDs, draft contents, settings, positions and encoded image versions are never
rewritten by assignment. A subsequent export retains displaced content and
historical attempts, so another installation can repeat recovery without
restoring old retry or login authority.

## Uncertain results and verification

Assignment is synchronous. If its response is lost, the UI locks the proposal
until an authenticated read returns current bindings. It reports current state,
not proof that an earlier request succeeded. Another administrator could have
changed the binding in between. Failed reads keep that uncertainty locked;
review and confirm any further change against fresh state.

Public HTTP tests cover authority, same-version collisions, displacement,
personal views and transaction rollback. The real-browser recovery test moves
content through three isolated applications and SQLite files using only ZIP
bytes between installations. It checks old sessions and OAuth credentials,
stable history, image bytes, historical attempts and restart persistence.
The production container check adds private-image recovery, ownership changes
across restart, retired-attempt rejection and a fresh whole-draft save.
