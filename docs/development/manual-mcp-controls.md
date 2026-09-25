# Controlled local MCP checks

Use `scripts/manual-mcp-client.ts` to retain exact requests, deliver them
after a browser edit, and deliberately suppress a completed save response.
It is a deterministic test client, without a language model. It does not
establish how Codex or ChatGPT interprets a human instruction. The matching
integration tests and the helper's executable test cover these controls;
manual repetition is optional troubleshooting, not a requirement in #97.

The helper uses public OAuth registration, PKCE and explicit Skyttel map-work
consent. It receives its own short-lived grant, never reads SQLite or browser
cookies, and never uses saved Codex credentials. Tokens and captured requests
stay in its process memory. Terminal output contains authorization links,
technical status and synthetic tool results, so do not record the terminal
or use real household information.

## Start a disposable installation

Complete the existing [local authentication setup](local-authentication.md)
and [port-3301 Google configuration](assistants.md#prerequisites-and-addresses)
first. Reuse the configured administrator and private development environment
file. The default is `.devcontainer/.env`; set `SKYTTEL_DEV_ENV_FILE` to your
existing file if different. Do not print its contents. Stop ordinary
development servers and keep port 3301 free.

This is the port-3301 counterpart of the
[disposable browser setup](testing.md#disposable-local-browser-session).
It keeps the database through restarts. Do not use the AI-07 wizard's cleanup
trap for these cases: stopping that separate setup deletes its database.

From the repository root in terminal A, run:

```sh
umask 077
SKYTTEL_MCP_CASE_DIR=$(mktemp -d /tmp/skyttel-mcp-case.XXXXXX)
printf 'SKYTTEL_DATABASE_PATH=%s/skyttel.sqlite\n' \
  "$SKYTTEL_MCP_CASE_DIR" > "$SKYTTEL_MCP_CASE_DIR/case.env"
env -u SKYTTEL_DATABASE_PATH SKYTTEL_ORIGIN=http://localhost:5173 \
  node --env-file="$SKYTTEL_MCP_CASE_DIR/case.env" scripts/develop-prodlike.mjs
```

The existing launcher builds the application and changes the origin to
`http://localhost:3301`. Open that address in a fresh private host-browser
window, sign in with the configured administrator, and create **MCP-prov**.
This empty database does not need `db:setup`. Keep terminal A open.

For a server restart, press Ctrl+C in terminal A, wait for shutdown, then
run only the following command in that same terminal. Do not recreate the
directory or close terminal B during the restart:

```sh
env -u SKYTTEL_DATABASE_PATH SKYTTEL_ORIGIN=http://localhost:5173 \
  node --env-file="$SKYTTEL_MCP_CASE_DIR/case.env" scripts/develop-prodlike.mjs
```

## Authorize the control client

In VS Code's **Ports** panel, forward container ports **3301** and **47731**
to the same host ports. Keep both local/private; no public tunnel is needed.
If host port 47731 is occupied, choose another unused port and use that same
number in the command below and its forwarding entry. The helper binds only
the container's loopback interface.

In terminal B, from the repository root, run:

```sh
node --import tsx scripts/manual-mcp-client.ts http://localhost:3301 47731
```

Open the `url` from the `authorize` output in the private browser window.
Choose **MCP-prov**, check the external AI and map-work consent boxes, and
approve. The loopback callback page sends no secrets to terminal output;
it tells you to return to terminal B, which must show `ready`. Do not copy
callback addresses, codes, cookies or tokens. Authorization expires after
ten minutes if unfinished; restart the helper if necessary. Revoke abandoned
connections in Skyttel.

The listener checks its origin, host, path and random state, then closes
after authorization. Denied consent or an invalid callback grants no access.
No refresh grant is requested. If the access token expires during a case,
revoke the connection, restart the helper, and start that case again.

## Commands

Enter commands directly in terminal B, one at a time. Each output is one
JSON object with an `event` field. `result.value` is the public MCP tool
result; an `error` inside that value is a domain rejection, not a success.
Never overwrite or reconstruct a captured request to perform an exact retry.

<!-- markdownlint-disable MD013 -->
| Command | Effect |
| --- | --- |
| `read` | Read the whole current private draft. |
| `map Lo` | Read saved objects matching Lo and their direct context. |
| `tools` | List the current authenticated MCP tools, their argument schemas and read-only annotations. |
| `read-tool TOOL JSON` | Call a listed read-only tool with its documented arguments. |
| `capture-tool LABEL TOOL JSON` | Retain a listed proposal with the supplied arguments and freshly read draft/content versions. Does not submit it. |
| `capture-save old` | Read and display the whole draft; retain its exact versions and a new operation ID under `old`. Does not save. |
| `send old` | Send the captured request unchanged. |
| `status old` | Read that save's durable operation status. |
| `drop old` | Prepare the captured save, send it, verify a matching successful response at the fault boundary, then discard that response without printing or retaining its receipt. |
| `discard manual-other` | Discard that object proposal using the current draft version. |
| `quit` | Close the helper and release credentials and captures. |
<!-- markdownlint-enable MD013 -->

`drop` must print `response-dropped` with `outcome: "unknown"`. It deliberately
removes a post-commit response at the client boundary; it does not simulate
an arbitrary network outage. A rejected or failed save is not labelled as
this fault. Check durable `status` before further work, then replay the same
capture with `send`. This verifies recovery without inventing a new operation.

`capture-object LABEL JSON` retains an unsent proposal using current draft
and content versions and the exact current type name. It supports only new
synthetic IDs starting with `manual-`, including corrections of their private
proposals. It refuses to edit saved objects. The following example needs no
hand-copied type IDs:

<!-- markdownlint-disable MD013 -->
```text
capture-object bank {"id":"manual-bank","type":"Bankkonto","name":"Betalkonto","identity":"unresolved"}
send bank
```
<!-- markdownlint-enable MD013 -->

Capturing a proposal does not submit it. Labels are unique for the process;
use the exact labels in the manual case in a fresh helper session. No shell,
database, authentication override or arbitrary JavaScript command is exposed.

### Advanced proposals and historical receipts

Run `tools` to inspect the exact public argument schema. Use `read-tool` for
current definitions, a merge review, or relevant history. `capture-tool`
accepts only listed non-read-only tools with draft and content versions.
Supply all other documented arguments as one JSON object. The helper rejects
unknown top-level fields and caller-supplied versions; the server validates
the complete values when `send` submits the request. Use `capture-save` for
saving: generic commands reject both `save_draft` and `prepare_save`.

For example, prepare a new synthetic object type with a yes/no field:

<!-- markdownlint-disable MD013 -->
```text
read-tool read_type_catalog {}
capture-tool type-example propose_object_type {"id":"manual-device","baseRevision":null,"value":{"name":"Provenhet","description":"Påhittad typ","fields":[{"id":"manual-enabled","name":"Aktiv","description":"","kind":"boolean"}]}}
send type-example
read
```
<!-- markdownlint-enable MD013 -->

Check the entire draft before capturing and sending a save. Leaving the
yes/no field unanswered is distinct from explicitly supplying `false` on
an object. The area's manual case provides the complete scenario and
expected results.

For history, run `read-tool read_history {}` and copy the relevant
`operationId` and historical `userId` from that result into the documented
JSON arguments for `read_history` or `propose_undo`. These are content
references, never authentication overrides. The historical author may be
unmapped after import. Undo captures today's draft/content versions; never
copy versions from the old receipt. For a merge, read `read_merge_review`
with the selected IDs and retain its exact `reviewed` value alongside the
explicit fact and relationship choices in `propose_merge`.

To test stale input, capture first, change the draft or relevant saved
content in the browser, then run `send` with the original label. The helper
does not refresh that request. Read the returned conflict and whole draft;
a fresh capture with a new label is a new proposal, not an exact retry.

## Cleanup

In the private browser, open **Assistentanslutningar** and revoke
**Skyttel manual MCP controls**. In terminal B run `read`: it must return
`MCP HTTP 401`. Then run `quit`. Ctrl+C also closes the helper and listener,
but does not revoke the server-side connection; revoke it in the browser.
Do not save terminal transcripts or callback parameters.

Close the private browser window and stop terminal A. Delete only this
temporary database directory in terminal A:

```sh
rm -r -- "${SKYTTEL_MCP_CASE_DIR:?}"
unset SKYTTEL_MCP_CASE_DIR
```

Start ordinary development again with `npm run dev:all`. Use a fresh database
and helper process for the next isolated case. The existing AI-07 Codex
wizard, provider registration and ordinary development database are unchanged.
