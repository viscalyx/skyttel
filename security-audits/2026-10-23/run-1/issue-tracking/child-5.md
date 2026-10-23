Parent audit: [#534](https://github.com/viscalyx/skyttel/issues/534)

This source-grounded lead awaits validation. No vulnerability or severity is confirmed.

Audit source: `e79b5b97cfe73563dc7b028852176cd9521deb70` (2026-10-23).

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

## Completion criteria

- Record the validation evidence or policy decision and the resulting disposition.
- If the lead is confirmed, track the smallest effective fix and regression coverage.
- Update the parent audit when this follow-up is resolved.

