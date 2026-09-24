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

`read_map` returns the saved map. Optional `query` and `objectId` narrow
the objects and associated relationships. `read_my_draft` returns the
connected user's entire current private draft. Both tools reject unknown
arguments. Neither tool accepts household or user identifiers. No
administration, export, import, deletion or mutation tools are registered.

The resource metadata is at `/.well-known/oauth-protected-resource`.
The authorization server issuer is `SKYTTEL_ORIGIN` plus `/api/auth`.
Its metadata is discoverable at
`/.well-known/oauth-authorization-server/api/auth` and
`/api/auth/.well-known/oauth-authorization-server`.

Better Auth provides dynamic client registration, authorization code
exchange with PKCE, JWT signing and refresh. Only `skyttel:read` and
optional `offline_access` are available. Client credentials cannot grant
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
immediately before the synchronous database read. Revocation removes the
connection and its refresh tokens; membership removal also removes the
connection. Reconnection creates a different ID and cannot restore an old
token. There is no retained MCP response or conversation cache.

## Local deterministic verification

Run the repository's checks from [the testing guide](testing.md). Focused
checks are:

```sh
npm run build
npm run test:unit -- tests/unit/server/assistants.test.ts
npm run test:unit -- tests/unit/client/assistants.test.tsx
npm run test:integration -- tests/integration/assistants.spec.ts
```

The tests run the actual app over loopback HTTP with temporary SQLite.
Only Google and Microsoft are identity substitutes. Registration,
authorization codes, signed consent parameters, PKCE, token exchange,
refresh checks and MCP use the actual libraries. Cases cover privacy,
filtered reads, own drafts, restart persistence, invalid tokens,
cross-household identifiers, signed-query tampering, denied AI consent,
revocation and an already initialized SDK client.

Browser cases use Chromium in the devcontainer. These are deterministic
CI results, not evidence of real Google/Microsoft or external account
connections, physical devices, speech, or production deployment.

## Real text-client verification

Real ChatGPT web and Codex app connections remain unverified. The existing
local MCP prototype is not production evidence. The test environment and
tunnel decision is tracked separately in
[the devcontainer connection question](https://github.com/viscalyx/skyttel/issues/96).
No tunnel or public exposure is established by this implementation.

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
endpoint. Issue #55 remains open until its real-client acceptance criteria
are met. Codex login inside the devcontainer remains in its separate issue;
this workflow does not replace it.
