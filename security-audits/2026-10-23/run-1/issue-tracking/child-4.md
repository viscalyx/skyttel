Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

**Fingerprint:** `relationship-form-unbounded-attempt-retention`

**Boundary and possible result:** A member can submit valid relationship forms with fresh staging IDs that select an existing relationship. The duplicate path leaves the draft unchanged but stores each full JSON request in shared SQLite. Source shows a 2,000,000-byte per-request cap and no aggregate attempt limit or ordinary expiry. Service impact depends on deployed controls, storage limits, and recovery.

**Claimed root cause:** The duplicate-outcome path records every full request as immutable recovery evidence without an aggregate retention bound; ignored top-level JSON fields are retained.

**Source trace:**

- entrypoint — `src/server/map-routes.ts:158` (POST relationship-form): An authenticated member supplies a form with a fresh stagingId.
- propagation — `src/server/relationships.ts:263` (Duplicate detection): A new relationship ID with existing endpoints selects the existing relationship without changing draft.
- propagation — `src/server/map.ts:677` (Duplicate outcome): The duplicate outcome still records the submission.
- sink — `src/server/relationship-form-attempts.ts:41` (Attempt insert): Complete JSON is serialized into a new SQLite row keyed by stagingId.

**Verified source evidence:**

- `src/server/map-routes.ts:15` — Route requires session and POST requires configured Origin.
- `src/server/map.ts:69` — Transaction rechecks household access and content ownership.
- `src/server/map.ts:654` — Only reuse of an already recorded stagingId returns before recording.
- `src/server/relationships.ts:270` — Duplicate relationship returns unchanged draft and existing relationship ID.
- `src/server/relationship-form-attempts.ts:47` — Insert stores JSON.stringify(submission), including unused fields.
- `src/server/app.ts:155` — Route is subject to propertyWriteLimit body cap.
- `src/server/properties.ts:6` — Body cap is 2,000,000 bytes.
- `migrations/025_relationship_form_attempts.sql:3` — No count, byte, or age constraint; cleanup trigger runs on contentVersion change.
- `src/server/map.ts:951` — Ordinary map save resets draft without changing household contentVersion.

**Exact blockers:**

- Safe local storage-growth check cannot run because required sandbox controls, including scratch disk quota and artifact promotion, were not verified.
- Source does not establish deployed ingress rate limits, persistent-volume quota, or service recovery when SQLite fills.

**Resolution plan:**

- **Bounded local:** In the required sandbox, use a small dummy household with an existing relationship. Submit several bounded duplicate forms with fresh stagingIds and unused top-level padding; compare attempt count and stored bytes while draft version stays fixed. Perform an ordinary save and check whether rows remain. Stop well below disk limit.
- **Owner-observed:** Ask the owner to inspect ingress request limits and persistent-volume quota, then review documented or prior SQLite-full recovery. Do not load-test a live installation.

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

