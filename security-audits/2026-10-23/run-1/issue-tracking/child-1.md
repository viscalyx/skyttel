Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

**Fingerprint:** `installation.restore.reinstates-revoked-membership`

**Boundary and possible result:** A complete database restore can bring back a membership row removed after the copy was made. Skyttel invalidates old authentication artifacts, but keeps provider account links and restored memberships. If the later revocation is not reapplied before ingress opens, the former member could sign in again and read the map. The runbook requires authorization checks, but does not establish reconciliation of post-copy changes.

**Claimed root cause:** Authority rotation clears sessions and tokens but does not reconcile membership revocations after the restored snapshot; the operator check is not specified in the repository.

**Source trace:**

- entrypoint — `src/server/map-routes.ts:76` (GET /households/:id/map): A formerly revoked member with a fresh provider session requests the restored map.
- propagation — `src/server/map-routes.ts:16` (Map route authentication): The route obtains the current session and passes its user ID to householdMap.
- propagation — `src/server/households.ts:16` (householdAccess): Authorization accepts a restored membership row that predates revocation.
- sink — `src/server/map.ts:227` (Map readState): The map selects household objects for the response.

**Verified source evidence:**

- `src/server/administration.ts:165` — Revoking a member deletes the membership row.
- `src/server/installation-authority.ts:34` — Restore invalidation deletes auth artifacts but leaves membership and account.
- `src/server/installation-authority.ts:106` — Declared generation change invokes invalidation before acknowledging restore.
- `docs/operations/database-restore.md:56` — Runbook says provider identity links and household content remain.
- `docs/operations/database-restore.md:75` — Runbook requires authorization checks before ingress but does not specify post-copy revocation reconciliation.

**Exact blockers:**

- A dummy-identity restore and fresh sign-in check could not run because required sandbox and artifact controls were not verified.
- The repository does not establish whether the operator retains independent post-copy membership records and reapplies revocations before ingress opens.

**Resolution plan:**

- **Bounded local:** In the required isolated sandbox with synthetic provider identities, create a household and member, make a consistent copy, revoke that member, restore the copy under a new generation, sign in freshly, and issue one dummy map read. Record only whether access is denied or a dummy object is returned.
- **Owner-observed:** Have the installation owner show the controlled restore checklist and independent post-copy membership records, then verify later revocations are reapplied before public ingress opens. Do not test a live household.

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

