Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

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

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

