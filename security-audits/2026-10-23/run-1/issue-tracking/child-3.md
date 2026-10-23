Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

**Fingerprint:** `map.definition-removal.private-draft-type-oracle`

**Boundary and possible result:** A current household member can propose removing a shared type with no saved or own-draft use. The response changes to definition_in_use when another member’s draft references or edits that type. This reveals a type-specific use bit without exposing names or values.

**Claimed root cause:** The deletion guard reads other members’ drafts and exposes use of a selected type through a distinguishable response. Whether that bit is confidential remains a product-policy question.

**Source trace:**

- entrypoint — `src/server/map-routes.ts:108` (Object-type proposal route): A member submits a type-removal proposal; relationship-type route at line 179 is analogous.
- propagation — `src/server/map.ts:617` (householdMap.proposeObjectType): Checks membership, editability, draft, and content version.
- propagation — `src/server/object-types.ts:104` (Object-type removal): Null value invokes type-use guard before caller draft update.
- propagation — `src/server/definition-usage.ts:45` (Cross-member type-use guard): After saved and caller-draft checks, other drafts are checked and definition_in_use can be thrown.
- sink — `src/server/app.ts:163` (HTTP error handler): Returns distinguishable MapError code to requesting member.

**Verified source evidence:**

- `docs/adr/0001-gemensam-hushallskarta.md:8` — Product describes drafts as private in ordinary work, while administrators can inspect complete export.
- `src/server/map.ts:79` — Ordinary map reads select draft by household and caller content identity.
- `src/server/definition-usage.ts:10` — Guard selects same-household drafts whose userId differs from caller.
- `src/server/definition-usage.ts:45` — Object-type branch rejects use or edits in other drafts; relationship branch mirrors this.
- `src/client/SaveOperations.tsx:62` — User-facing rejection says type may be used in private drafts.
- `tests/unit/server/definition-removal.test.ts:333` — Existing test expects other member pending edit to produce 409 definition_in_use.
- `tests/integration/definition-removal.spec.ts:359` — Integration test expects warning but no private names or values.

**Exact blockers:**

- Policy and tests establish private values and intentionally show a type-use rejection, but do not decide whether the type-specific use bit itself must be confidential.
- Independent two-member execution was unavailable because scratch disk and artifact promotion controls were not verified.

**Resolution plan:**

- **Bounded local:** In the required sandbox, use two dummy members and a shared type with no saved or caller-draft use. Compare first member’s type-removal response before and after second stages a private object or type edit using it; stop at the response-code difference.
- **Owner-observed:** Ask the product owner whether ordinary members may learn that another private draft uses a specific shared type. If no, revise deletion flow to preserve referential safety without exposing the predicate.

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

