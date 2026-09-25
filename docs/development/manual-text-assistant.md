# Controlled local text-assistant checks

Use this launcher for reproducible provider failures and delayed replies.
It runs the actual application, browser authentication, OAuth/MCP and SQLite
against a fresh temporary database. Only the external identity and model
providers are substitutes. It makes no real Google, Microsoft or OpenAI
requests and needs no provider credentials. It never opens your normal
development database or private environment file.

These controls verify application behavior, not a real model's understanding
of Swedish. Keep real-model results separate. All human execution belongs
to the later, nonblocking [restlista #97](https://github.com/viscalyx/skyttel/issues/97).

## Start and sign in

From the repository root, with dependencies installed, run:

```sh
npm run build
node --import tsx scripts/manual-text-assistant.ts
```

Keep this terminal open. The `ready` event prints an `origin` such as
`http://127.0.0.1:43127`. In VS Code's **Ports** panel, forward that printed
port to the same host port, keeping it private. Open the exact printed
origin in a new private browser window. Use `127.0.0.1`, not `localhost`:
authentication and same-origin checks use the printed address.

Choose Google sign-in. The substitute provider signs in **Alex Exempel**
without an external account or password. Complete the normal first-household
form with the name **Textprov**. Create only made-up content. Start
**Skyttels textassistent** with both explicit choices for external AI and
map work. The substitute uses that same application consent flow.

Enter the scenario's message and press **Skicka**. Each provider request
stops at the external boundary and prints a `held` event in the terminal.
Its increasing `id` identifies that exact request. The event includes the
synthetic message, draft versions, latest tool result, and available tool
names. The browser must continue showing ongoing work until you release a
response or cancel the task.

## Terminal commands

Enter commands in the launcher terminal, one line at a time. These are
launcher commands, not shell commands. Tool arguments must be one JSON
object using the tool's documented schema. The actual MCP entrance still
validates scope, permissions, versions and domain rules.

<!-- markdownlint-disable MD013 -->
| Command | Effect |
| --- | --- |
| `pending` | Display every held provider request and its original context. |
| `tool REQUEST TOOL JSON` | Return one model tool call for that held request. The application processes it through its actual MCP client. |
| `reply REQUEST TEXT` | Return a final plain-text model reply for that held request. |
| `fail REQUEST` | Fail that held provider request at the external boundary. |
| `restart` | Reject outstanding provider responses, restart the application with the same temporary database and origin, and release old assistant sessions. |
| `quit` | Stop the installation and delete its temporary database. |
<!-- markdownlint-enable MD013 -->

Replace `REQUEST` with the numeric `id` from the relevant `held` event.
For example, when request `1` is held, enter:

```text
tool 1 read_type_catalog {}
```

This releases request `1`. The application runs `read_type_catalog` through
MCP and asks the substitute model what to do next. A new `held` event, `2`,
contains the actual catalog under `lastToolResult`. To finish this simple
read without making a proposal, enter:

```text
reply 2 Typkatalogen är läst. Inget förslag har ändrats.
```

For a proposal, use the exact tool name and JSON arguments specified by the
manual case. Copy type/object IDs from the tool result and use the draft
`version` and `contentVersion` shown when the request was held. The launcher
does not repair, refresh or replace those arguments. A released tool call
does not itself prove that a proposal or save succeeded: inspect the next
`lastToolResult`, browser draft and any durable receipt.

## Delay, failure and restart

For a delayed response, leave the request held while performing the manual
case's browser edit, discard, cancellation or new instruction. Release the
original request by its original ID with its original arguments. Releasing
an old request must not replace newer work. Cancellation may cause the SDK
to ignore the released provider response entirely; confirm the actual
browser and saved/private map state, not just the terminal's `released`
event. `pending` can still show that intentionally retained old response.

For a provider failure, enter `fail` followed by the current held ID. Check
the browser error and preserved draft. Continue ordinary manual map editing
to confirm that it remains available. A new assistant message produces a
new held request that can be answered normally. No real network outage or
API charge is involved.

For restart recovery, enter `restart` and wait for `restarted`. Reload the
browser and start a new assistant session using its normal consent choices.
The database and browser login remain, while old conversation memory and
assistant grants are closed. The application reads durable proposals and
operation results through a new ordinary MCP connection. `restart` does
not simulate a missing post-commit response: use the manual case's stated
response-loss control when that fault is required.

## Cleanup

Enter `quit`, or press Ctrl+C. Wait for `closed`, which confirms deletion
of this launcher's temporary database. Close the private browser window
and remove its port-forward entry. Each new launcher process starts empty.
If the process is forcibly killed, stop any remaining process before
deleting only the temporary `directory` printed by its `ready` event.

Do not reuse this fixture for real household data. Terminal output includes
synthetic task context intentionally; do not publish terminal recordings.
No production endpoint, provider-address override or authentication bypass
is added by this development launcher.
