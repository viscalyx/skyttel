Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

**Fingerprint:** `map-read.full-history-materialization`

**Boundary and possible result:** Authorized saves accumulate receipts. If a household has a deleted object, each ordinary map read loads and parses every retained receipt, including unrelated ones. A draft conflict can trigger a second full-history pass. Availability impact is unmeasured.

**Claimed root cause:** The map state reader derives deleted-object metadata by scanning the entire household save history rather than a targeted lookup or persisted derived value.

**Source trace:**

- entrypoint — `src/server/map-routes.ts:76` (GET /households/:id/map): An authenticated household member invokes an ordinary map read.
- propagation — `src/server/map.ts:55` (householdMap): The map binds actor to membership before read.
- propagation — `src/server/map.ts:202` (readState): A deleted object enables receipt-history work on every map read.
- sink — `src/server/map.ts:208` (readState metadata): Query materializes all receipt strings and loop parses each, without count or age limit.

**Verified source evidence:**

- `src/server/map-routes.ts:15` — Route middleware requires a session; householdMap checks membership.
- `src/server/map.ts:265` — Draft conflicts trigger a second full-history parse.
- `src/server/map.ts:939` — Each successful nonempty save appends map_history and map_save receipt rows.
- `src/server/map-operations.ts:141` — The 20-result cap applies to operation listing, not retained receipts.
- `migrations/015_content_maintenance.sql:158` — Current content-version cleanup trigger retires map_operation, but not map_save or map_history; it replaces earlier trigger.
- `src/server/app.ts:146` — Request body limit bounds individual uploads, not accumulated history or GET work.

**Exact blockers:**

- Required sandbox disk bounds and race-safe artifact promotion were not verified, so no bounded growth measurement ran.
- Source does not establish deployed receipt counts, memory headroom, concurrency, ingress timeouts, or recovery behavior needed to determine shared availability impact.

**Resolution plan:**

- **Bounded local:** In the required sandbox, create dummy households with and without one deleted object and increasing bounded counts of small valid receipts. Measure GET /map latency and peak memory, inspect the SQLite query plan, and stop at minimum observable growth.
- **Owner-observed:** Have the owner inspect private receipt counts, memory limits, concurrency and ingress controls, and recovery behavior to assess possible effect on other members.

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

