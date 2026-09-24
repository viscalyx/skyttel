# OAuth and MCP integration

This guide is for developers and operators who connect external text
clients. The [user guide](../users/assistants.md) describes consent and
revocation. The implementation follows
[the MCP decision](https://github.com/viscalyx/skyttel/issues/10#issuecomment-5662601732)
and [the technology decision](https://github.com/viscalyx/skyttel/issues/12#issuecomment-5691771132).

## Public interface

`/mcp` uses the official TypeScript MCP SDK and Streamable HTTP. Each
request uses a fresh stateless transport with JSON responses. There is
no long-lived server session or cached household content. An initialized
client must send its bearer token on every request. Cookie authentication
alone cannot call MCP.

`read_map` returns the saved map. Optional `query` searches object names
and descriptions without case sensitivity; `objectId` selects one object.
When both are provided, an object must match both. The response contains:

- `objects`: full saved values for the matching objects.
- `relationships`: incoming and outgoing relationships touching a matching
  object, including unknown or explicitly absent endpoints.
- `contextObjects`: only `id`, `name` and `typeId` for the other endpoints
  needed to understand those relationships. These are references, not full
  object values. Their other relationships are not followed.
- `types` and `relationshipTypes`: definitions used by the returned objects,
  endpoint references and relationships. Unrelated definitions are omitted.

A search with no matches returns empty lists, including both type catalogs.
An unfiltered read returns all saved objects and relationships, with an empty
`contextObjects` list because all endpoints are already full objects. Clients
should request another specific object only when its details are needed for
the user's task.

`read_my_draft` returns the connected user's entire current private draft.
It retains `version`, `changes` and optional relationship/type changes,
and adds `contentVersion`, relevant saved values in `current`, `conflicts`,
`unresolvedIdentities`, `pendingOperations` and `readyToSave`. The last flag
does not grant permission to save; domain conditions are checked again
when saving. All proposals, including earlier browser work, are included.
No tool accepts an acting household or user identifier. Administrative
tools remain absent, including export, import, erasure and access changes.

The resource metadata is at `/.well-known/oauth-protected-resource`.
The authorization server issuer is `SKYTTEL_ORIGIN` plus `/api/auth`.
Its metadata is discoverable at
`/.well-known/oauth-authorization-server/api/auth` and
`/api/auth/.well-known/oauth-authorization-server`.

Better Auth provides dynamic client registration, authorization code
exchange with PKCE, JWT signing and refresh. `skyttel:read` remains the
default. Map work requires both `skyttel:read` and `skyttel:write`, with
explicit map-work consent in addition to the AI-processing choice.
`offline_access` is optional. Earlier read tokens and refresh grants do
not gain write authority; request new consent to enable map work.
Client credentials cannot grant
household access. Native clients must declare `application_type: native`
when registering loopback HTTP callbacks; web callbacks require HTTPS.
Registration alone grants no access.
[Better Auth: OAuth provider](https://better-auth.com/docs/plugins/oauth-provider).

Every authorization requires consent. The server binds a fresh connection
ID to the authenticated user, selected household and registered client.
The connection ID is captured in the authorization code and signed access
token. Selection belongs to that consent request, so another browser tab
cannot change a pending token's household through session selection.

MCP checks token signature, issuer, audience, expiry, scope and the
current connection and membership. Tool execution rechecks the connection
immediately before each synchronous domain action. Revocation removes the
connection and its refresh tokens; membership removal also removes the
connection. Reconnection creates a different ID and cannot restore an old
token. There is no retained MCP response or conversation cache.

## Whole-draft map work

Write-authorized clients discover these additional tools through MCP:

- `read_type_catalog`: current effective definitions, including own browser
  type proposals. It works in an empty household; `read_map` still filters
  definitions to the returned objects and endpoints.
- `propose_object` and `propose_relationship`: new or corrected complete
  values, or `value: null` for ordinary reversible removal. Preserve facts
  that are not being changed. Supply stable `id`, `baseRevision`, the
  current type's `typeRevision`, and captured draft/content versions.
  A duplicate relationship returns its `existingId` without another edge.
- `resolve_conflict`: the exact latest conflict plus `saved` or `proposed`.
- `discard_proposal` and `discard_draft`: discard private work only.
- `prepare_save`: optionally register an approved attempt before saving.
  A pending record is not a receipt and prevents further draft edits.
- `save_draft`: atomically save the entire reviewed draft. Supply exactly
  `operationId`, `version` and `contentVersion`; no extra approval field
  can prove human intent. The return value contains the durable `receipt`.
- `read_save_operation` and `read_my_save_operations`: recover a known
  attempt or discover own pending and recent terminal attempts.

Every mutation requires `contentVersion` and the reviewed draft `version`.
Proposal, correction and discard results return the whole draft review.
Domain failures are MCP tool errors with a stable `error`, a Swedish
`message`, and current `review` when access permits it. Resolve conflicts
and unexpected versions, present the whole draft, and obtain a fresh save
instruction. Never save independent parts of a blocked whole draft.
Unknown internal outcomes expose no database diagnostic or household text.

The MCP initialization instructions govern the client conversation: deny
negative and hypothetical saves, include earlier proposals, permit a clear
correction plus save in one message without a redundant confirmation,
and confirm only receipt contents. These are client responsibilities;
server version checks are not independent evidence of human intent.
There is no mandatory visit to the map or extra approval screen.

Keep the operation ID and exact request until its outcome is known. After
a lost response, read status before changes or another save. `succeeded`
contains the original receipt, `pending` permits only an exact retry,
and `rejected` requires resolving the failure before a new approved
attempt. `null` means no live attempt was found in current content; it
does not prove success or renew approval after import. A retry of a
completed request returns its original receipt even if a newer draft
exists. A changed request under the same ID is rejected. Replacement
content retires old IDs and rejects old generations.

The adapter uses the authenticated connection's actor with `householdMap`;
it never treats an imported content-owner ID as a login identity. All
ordinary map constraints, identity questions, current definitions,
financial facts, image preservation and conflict rules come from the
same domain boundary as the forms. Type-definition editing, merge,
history and undo tools are separate extensions. No conversation is stored.

## Local deterministic verification

Run the repository's checks from [the testing guide](testing.md). Focused
checks are:

```sh
npm run build
npm run test:unit -- tests/unit/server/assistants.test.ts
npm run test:unit -- tests/unit/server/assistant-work.test.ts
npm run test:unit -- tests/unit/client/assistants.test.tsx
npm run test:integration -- tests/integration/assistants.spec.ts
npm run test:integration -- tests/integration/assistant-work.spec.ts
```

The tests run the actual app over loopback HTTP with temporary SQLite.
Only Google and Microsoft are identity substitutes. Registration,
authorization codes, signed consent parameters, PKCE, token exchange,
refresh checks and MCP use the actual libraries. Cases cover privacy,
filtered reads, own drafts, restart persistence, invalid tokens,
cross-household identifiers, signed-query tampering, denied AI consent,
revocation and an already initialized SDK client.
Map-work cases also cover browser draft handoff, whole-save conflicts,
receipt loss, interrupted SQLite writes, exact retries, content generations,
current types and preserved read-only grants. They do not run a language
model and do not prove that a real client follows the conversation rules.

The local AI-07 command intentionally requests read access. To prepare the
separate map-work cases, revoke and log out that test connection, then
repeat its login command with `--scopes skyttel:read,skyttel:write` and
approve **Godkänn kartarbete**. Use the same isolated data and cleanup.
Record real client behavior, including negative/hypothetical commands,
separately in issue #97; do not infer it from deterministic tool calls.

Browser cases use Chromium in the devcontainer. These are deterministic
CI results, not evidence of real Google/Microsoft or external account
connections, physical devices, speech, or production deployment.

## Manual local Codex CLI setup

The agreed first experiment in
[issue #96](https://github.com/viscalyx/skyttel/issues/96) uses Codex CLI inside
the devcontainer and Google login in the host browser. It needs no public
tunnel, new subscription, or provider secret. This is a manual experiment;
do not run it in CI or add real credentials to pull request workflows.
Execution status: **not yet run**. The installed CLI used to prepare these
instructions is `codex-cli 0.156.1`; its help includes `--no-browser`.

All manual verification for specification #31 runs after its implementation
is complete. Record results in the separate, nonblocking
[manual verification issue #97](https://github.com/viscalyx/skyttel/issues/97).

The developer prepares the local server and CLI commands below. The tester
performs login, household selection, consent, reads, revocation, reconnection,
and cleanup in [manual case AI-07](../manual-tests/assistants.md#ai-07-manuellt-codex-cli-prov-med-google-i-devcontainern).
Record actual execution separately from this plan. Existing synthetic-provider
tests do not establish real Google or Codex compatibility.

### Prerequisites and addresses

- Use an existing Codex subscription login in the devcontainer. Skyttel's
  Google login and MCP consent are separate from that Codex login.
- Follow the [Google development setup](local-authentication.md#4-create-the-google-web-client).
  The web client **Skyttel local development** needs both port-5173 and
  port-3301 Google callbacks. Use the existing Google administrator subject.
- Keep both Google and Microsoft credential pairs in `.env.local`; current
  startup validation requires both, although this case tests only Google.
- Keep port 3301 free in the container and on the host. VS Code already
  forwards it with the same host port. Use a fresh private browser window so
  ordinary development sessions do not carry into the disposable installation.

<!-- markdownlint-disable MD013 -->
| Purpose | Address |
| --- | --- |
| Host browser origin | `http://localhost:3301` |
| Codex MCP endpoint inside the container | `http://localhost:3301/mcp` |
| Protected resource discovery | `http://localhost:3301/.well-known/oauth-protected-resource` |
| OAuth issuer | `http://localhost:3301/api/auth` |
| Authorization-server discovery | `http://localhost:3301/.well-known/oauth-authorization-server/api/auth` |
| Client registration | `http://localhost:3301/api/auth/oauth2/register` |
| Authorization | `http://localhost:3301/api/auth/oauth2/authorize` |
| Token exchange | `http://localhost:3301/api/auth/oauth2/token` |
| Skyttel consent page | `http://localhost:3301/assistant-consent` |
| Google browser callback | `http://localhost:3301/api/auth/callback/google` |
| Codex callback | Exact loopback address produced by the current CLI login |
<!-- markdownlint-enable MD013 -->

Codex reaches discovery, registration, token exchange, and MCP directly inside
the container. The host browser reaches Skyttel through VS Code's forwarded
port and uses Google for sign-in. With `--no-browser`, the tester copies the
final Codex callback address into the waiting CLI instead of forwarding a
second callback port. That address contains a short-lived authorization code;
paste it only into the local login prompt, not into a conversation or report.
Google's registration receives only the Google callback, not the Codex one.

### Start an isolated compiled application

Run this whole block from `/workspace` in terminal A. It uses a new temporary
directory, so `db:setup` cannot reset the ordinary development database.
The subshell clears inherited provider and administrator settings so
`.env.local` is authoritative, then explicitly overrides the database and
origin. It generates a temporary Skyttel authentication secret without
printing it; the existing Google and Microsoft secrets are reused.

```sh
(
  set -e
  unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
  unset MICROSOFT_CLIENT_ID MICROSOFT_CLIENT_SECRET
  unset SKYTTEL_FIRST_ADMIN_PROVIDER SKYTTEL_FIRST_ADMIN_SUBJECT
  export SKYTTEL_DEV_ENV_FILE=/workspace/.env.local
  export SKYTTEL_ORIGIN=http://localhost:3301
  export HOST=127.0.0.1 PORT=3301 NODE_ENV=development
  SKYTTEL_CASE_DIR="$(mktemp -d /tmp/skyttel-codex-development.XXXXXX)"
  export SKYTTEL_DATABASE_PATH="$SKYTTEL_CASE_DIR/skyttel.sqlite"
  trap 'rm -rf -- "$SKYTTEL_CASE_DIR"' EXIT
  SKYTTEL_CASE_SECRET="$(openssl rand -base64 48)"
  export BETTER_AUTH_SECRET="$SKYTTEL_CASE_SECRET"
  npm run db:setup
  npm run dev:prodlike
)
```

Keep terminal A running until the manual case and connection cleanup finish.
The command builds and serves the complete app, including MCP and OAuth.
Its exit trap deletes this run's temporary directory, including SQLite files
and temporary export archives. The path comes only from the `mktemp` above.
It does not edit either private environment file. After an interrupted run,
remove any remaining test connection credentials before starting again.

In terminal B, check readiness and the available CLI login options:

```sh
curl --fail http://localhost:3301/healthz
codex --version
codex mcp login --help
```

Expect `{"status":"ok"}` and a CLI with `--no-browser` support. A readiness
response proves startup only. If the port is occupied, identify the process;
do not redirect the case to an unrelated running installation.

### Commands for the manual case

For a guided run, start this in terminal B after terminal A is ready:

```sh
bash scripts/manual-codex-case.sh
```

The wizard runs the CLI commands below and pauses for the browser steps in
AI-07. Keep that case open for its expected results. It does not collect
credentials, write configuration, or determine the test outcome. If you stop
early, follow the cleanup instructions below. The commands remain available
for running the same case without the wizard.

Use the dedicated server name `skyttel_development_case`, unused by ordinary
client configuration. These per-command overrides avoid adding a permanent
server to the shared Codex configuration. From terminal B in `/workspace`,
start login when the manual case calls for it:

```sh
codex \
  -c 'mcp_servers.skyttel_development_case.url="http://localhost:3301/mcp"' \
  mcp login skyttel_development_case --no-browser \
  --oauth-client-registration dcr --scopes skyttel:read
```

Open the printed authorization URL in the host's private browser window.
After the case's Google login and Skyttel consent steps, copy the browser's
complete final callback URL into the waiting CLI. The browser may show a
connection error because that loopback listener is inside the container.
The CLI must report successful login before continuing. Start the interactive
client with the same server override:

```sh
codex \
  -c 'mcp_servers.skyttel_development_case.url="http://localhost:3301/mcp"'
```

Inspect actual MCP tool calls and results during the case. Shell commands,
repository fixture reads, and answers from conversation history are not MCP
evidence. If Codex cannot call the tool, record that result instead of asking
it to find the answer in local files.

OAuth compatibility is still unverified. In particular, Skyttel requires a
native OAuth client registration for HTTP loopback callbacks; the installed
CLI's automatic registration must satisfy that requirement. If discovery,
registration, callback handling, or token exchange fails, record the case as
blocked and retain only a redacted error description. Do not bypass login or
consent, or report a passed test. Diagnose compatibility separately.
The CLI command options above come from installed help; OpenAI also documents
[HTTP MCP and OAuth support](https://learn.chatgpt.com/docs/extend/mcp).

### Cleanup and evidence

After the final reconnection check, revoke its connection in Skyttel and exit
the interactive Codex session. In terminal B, remove only this MCP login:

```sh
codex \
  -c 'mcp_servers.skyttel_development_case.url="http://localhost:3301/mcp"' \
  mcp logout skyttel_development_case
```

Close the private browser window, then press Ctrl+C in terminal A. The exit
trap removes the disposable database. Keep the existing provider client,
callback registrations, private environment files, and normal Codex login.
If server startup or login fails, still remove any credentials created for
this test server and stop terminal A. This workflow starts no public tunnel.

Record date, commit, Codex version, local origin, provider, observed tool-call
results, cleanup outcome, and passed, failed, blocked, or not-run status.
Do not include credentials, callback query strings, cookies, personal identity
values, or full conversation logs in public evidence. A successful result
establishes only the local Codex CLI and Google path. ChatGPT web, Codex desktop,
Microsoft login, and the deployed HTTPS endpoint need separate verification;
[issue #97](https://github.com/viscalyx/skyttel/issues/97) tracks those manual
checks after implementation without blocking the specification's work.

## Real text-client verification

Real ChatGPT web and Codex app connections remain unverified. The existing
local MCP prototype is not production evidence. The agreed first development
test in [issue #96](https://github.com/viscalyx/skyttel/issues/96) is the manual
local Codex CLI setup above, not a ChatGPT website or Codex desktop test.
The following HTTPS procedure remains separate. No tunnel or public exposure
is established by the local CLI plan.

Use an installation containing only fictional household data. A
devcontainer is sufficient for an initial real-client experiment if the
chosen transport makes both MCP and OAuth reachable. Configure
`SKYTTEL_ORIGIN` to the browser-visible HTTPS origin and expose the full
app under that same origin, including metadata, `/api/auth`, the consent
page and `/mcp`. Update the Google/Microsoft application's exact callback
URLs for that origin using [installation guidance](../operations/installation.md).
Do not copy development provider substitutes into a deployed login.

OpenAI also documents Secure MCP Tunnel for a private MCP upstream.
It does not automatically make a local OAuth authorization server
reachable. The choice must resolve that route as well; forwarding only
`/mcp` cannot complete this app's OAuth flow.
[OpenAI: Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels),
[OpenAI: connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt).

Once the chosen environment is available:

1. Open the HTTPS Skyttel URL and verify real provider login to a fictional
   household. Record the running commit and environment.
2. In ChatGPT web, enable the account's available developer mode and add
   the MCP URL with OAuth. Complete Skyttel's user, household and AI
   choices. Ask it to read one fictional object and your private draft.
3. In the host's Codex configuration, add the same HTTPS endpoint under
   `[mcp_servers.skyttel]` with `url = "https://HOST/mcp"`. Complete OAuth
   from that client's authentication control or `codex mcp login skyttel`.
   Repeat the same reads in the desktop app. Use the exact callback
   displayed by the installed client if manual registration is needed.
4. Revoke the connection in Skyttel while the client is open. Confirm a
   new read fails, then reconnect explicitly. Repeat with administrator
   revocation of a fictional member. Verify other members' drafts remain
   inaccessible and administration tools are absent.
5. Record date, client version, account/workspace eligibility, origin,
   commit, login provider, results and remaining limitations. Do not
   publish tokens, authorization codes, user content or cookies.

The client configuration instructions follow
[OpenAI's MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).
Client registration details and available account controls must be checked
against the actual installed clients. A successful tunnel experiment is
recorded separately from verification of the deployed production HTTPS
endpoint. These manual checks are deferred until specification #31 is
implemented and tracked in the separate, nonblocking issue #97. Closing
implementation issue #55 does not claim that these checks passed.
