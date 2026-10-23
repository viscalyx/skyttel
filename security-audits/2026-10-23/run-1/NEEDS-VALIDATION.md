# Needs validation

These are source-grounded leads, not confirmed vulnerabilities. Source was independently checked twice. No target code, provider call, or deployment was exercised. Perform local steps only after all required OS sandbox controls are verified; owner-observed checks use existing records and no live probing.

## 1. An older database restore may reinstate a revoked household member

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

## 2. Ordinary map reads materialize retained save receipts

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

## 3. Type-removal response reveals whether another draft uses a shared type

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

## 4. Repeated duplicate relationship forms retain full submissions

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

## 5. Completed assistant turns retain growing session snapshots

**Fingerprint:** `text-assistant-completed-result-quadratic-retention`

**Boundary and possible result:** An authenticated member with conversation consent can complete serial assistant turns. The 200-item cap applies to pending work, while each completed turn stays in the accepted map with a fresh task list and shallow copy of the growing reply list. This creates quadratic retained list entries during a conversation. Shared-process effect is unmeasured.

**Claimed root cause:** Completed accepted-message records remain until conversation reset or stop, and each completion stores arrays that grow with prior turns.

**Source trace:**

- entrypoint — `src/server/text-assistant.ts:2015` (POST assistant message): An authenticated household member submits a message to an existing conversation.
- propagation — `src/server/text-assistant.ts:2081` (admission limit): The 200-item limit counts queued and working messages, allowing serial completed turns.
- propagation — `src/server/text-assistant.ts:2104` (accepted-message retention): Each distinct request ID is retained in the session's accepted map.
- propagation — `src/server/text-assistant.ts:1795` (completed reply history): Each completed turn appends another reply to session history.
- sink — `src/server/text-assistant.ts:1813` (retained result snapshot): An accepted entry keeps a view of the growing task list and a copy of all completed replies.

**Verified source evidence:**

- `src/server/text-assistant.ts:314` — Session view creates task objects for every accepted message.
- `src/server/text-assistant.ts:1815` — Completed result stores a new array of reply references; reply objects and text are not deep-copied.
- `src/server/text-assistant.ts:843` — Explicit reset clears accepted records and replies.
- `src/server/text-assistant.ts:208` — Stopping a session clears accepted records.
- `src/server/text-assistant.ts:1930` — Timer schedules conversation expiry from the MCP deadline.
- `src/server/text-assistant-mcp.ts:159` — Initial MCP deadline is at most 30 minutes after connection.

**Exact blockers:**

- No target fixture ran because scratch disk bounds and race-safe artifact promotion were not verified.
- Source shows quadratic retained list entries but no measured availability effect under a supported memory budget.

**Resolution plan:**

- **Bounded local:** In the required offline resource-limited sandbox, use dummy accounts and a mocked provider to complete bounded serial turns at 10, 20, and 40. Measure retained heap and latency after garbage collection, including an ordinary request from a second dummy user. Stop well before memory exhaustion; account for 30-minute expiry and reset cleanup.
- **Owner-observed:** Have the owner identify production memory budget, expected concurrent conversations, and restart behavior, then compare bounded measurements with those limits.

## 6. Shared map text may induce an unrequested change to another member’s private draft

**Fingerprint:** `text-assistant/shared-map-to-private-draft-action-binding`

**Boundary and possible result:** An authenticated household member can save text in a shared map object. Another member’s assistant can read that object and pass its text to the model. If the model treats the text as an instruction and calls a proposal tool, the server can change the consuming member’s private draft without checking that the member requested that change. The source does not establish that a model actually makes such a call.

**Claimed root cause:** Proposal dispatch validates the model’s tool arguments and the consuming member’s authority and draft version, but does not deterministically compare the proposed change with that member’s request.

**Source trace:**

- entrypoint — `src/server/map-routes.ts:101` (Household map draft route): An authenticated member submits object text for their own draft.
- propagation — `src/server/map.ts:687` (Object proposal): The value enters that member’s draft after map validation.
- propagation — `src/server/map-routes.ts:217` (Household map save route): The member requests that their draft become shared map content.
- propagation — `src/server/map.ts:905` (Saved object write): The object’s text properties enter the shared map.
- propagation — `src/server/assistant-routes.ts:243` (read_map tool): Another member’s assistant retrieves the saved object under its household grant.
- propagation — `src/server/text-assistant.ts:1438` (Tool result continuation): The map read result is appended to the model conversation.
- propagation — `src/server/text-assistant.ts:1098` (Model request): The conversation is sent to the model with proposal tools available.
- propagation — `src/server/text-assistant.ts:1413` (Model tool dispatch): A model proposal passes authority and version checks without request-to-action comparison.
- propagation — `src/server/assistant-work.ts:266` (propose_object handler): The handler sends the proposal to the consuming member’s map domain.
- sink — `src/server/map.ts:779` (Private draft write): A valid proposal updates the consuming member’s private draft.

**Verified source evidence:**

- `src/shared/properties.ts:16` — A text property can contain up to 10,000 characters, including instruction-like text.
- `src/server/map.ts:104` — Draft writes are keyed by household and content owner.
- `src/server/text-assistant.ts:1164` — Batch operations are checked against tool schemas before mutation.
- `src/server/text-assistant.ts:1385` — Non-read-only calls check current draft and content versions without comparing to the member’s requested action.
- `src/server/text-assistant.ts:1377` — Saving requires separate explicit intent, limiting this lead to unsaved draft change.
- `src/server/assistant-instructions.ts:136` — The model is told map text and tool results are data, never instructions; actual model behavior is unobserved.

**Exact blockers:**

- No observed model response shows map text causing a proposal unrelated to the consuming member’s request.
- The required sandbox, including bounded scratch disk and race-safe artifact promotion, was not verified, so no target fixture ran.
- A real provider call would be billable and lacks explicit user authorization.

**Resolution plan:**

- **Bounded local:** After verifying all required sandbox controls, use dummy members and a disposable database. Have member A save instruction-like object text and member B request only a summary. First use a deterministic model stub to verify that a proposal call would alter only B’s unsaved draft. Only with explicit billable authorization, capture a real model response and compare B’s draft before and after. Stop at the first unrequested mutation; do not save it.
- **Owner-observed:** If local model behavior cannot reproduce the configured model, an authorized operator can perform the same dummy-household check in an isolated test installation and inspect the model tool call and member B’s unsaved draft.

## Blocked coverage review: OAuth provider internals

The assistant-consent source path was partially reviewed, but the installed `@better-auth/oauth-provider` package was unavailable. Review the exact pinned provider source for signed `oauth_query`, duplicate parameters, consent-scope binding, and authorization-code binding in a safe environment. Run the existing tests only after the audit sandbox requirements are met. No source-grounded bypass was identified in Skyttel’s own route and grant checks.
