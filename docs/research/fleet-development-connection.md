# Fleet connection prerequisites for development

Research date: 2026-11-02. Intended readers: developers and the installation
operator deciding whether to plan a LangSmith Fleet compatibility trial.
This note identifies preparation and unresolved interoperability checks;
it does not establish a working connection.

## Finding and evidence boundary

Fleet's documented automatic OAuth registration and Skyttel's configured
dynamic client registration (DCR) make a trial plausible without application
changes. Use a user-authorized connection, initially with `skyttel:read`.
Actual compatibility remains unverified: transport negotiation, registration
metadata, requested scopes, resource binding, callback handling and request
origins must all work together. There is no evidence here that Fleet can
complete that sequence. [Fleet documentation][fleet], [Skyttel OAuth][auth]

Repository evidence refers to commit
`a3e60a0b99513999611dcb1ccba00672ae27aa2b`. It includes source and existing
test definitions, not new test results. External sources are official
documentation accessed on the research date. No application service,
database reset, account connection or billable provider test is part of
this investigation. Household records and private configuration values
are outside the evidence.

The user confirms that the existing development household is fictional and
may be changed during a later trial. That is a planning input, not a claim
derived from inspecting its records. The reset source establishes how to
recreate demo data; it does not establish the current database's contents.

## Documented Fleet behavior

Fleet accepts a remote MCP URL, discovers tools and forwards calls to the
server, which retains authentication and authorization responsibility.
Adding a server requires the MCP Server Create permission. Automatic OAuth
2.1 registers a client through DCR and asks the user to log in. Manual
OAuth supports Authorization Code with PKCE enabled, or Client Credentials.
Manual providers require organization-level setup and `workspaces:manage`.
Their authorization-code callback is
`https://<your-langsmith-host>/host-oauth-callback/<provider-id>`.
Manual configuration exposes a scope override. These facts come from
[Fleet's remote MCP documentation][fleet].

That page does not specify the automatic flow's callback, PKCE challenge
method, registration fields, scope-selection algorithm, resource indicators,
refresh behavior, Origin header, protocol version or exact HTTP transport.
It therefore cannot certify those aspects of compatibility. Its manual
callback must not be assumed to be the automatic callback.

## Skyttel behavior and compatibility implications

### Transport and discovery

Skyttel serves `/mcp` using the SDK's Streamable HTTP transport, with no
generated session ID and JSON responses enabled. It constructs and closes
the server per request. This is neither a local stdio process nor a separate
legacy `/sse` endpoint. Fleet must initialize and discover tools using this
behavior. Its generic remote-MCP support alone does not prove that it does.
[Transport implementation][transport]

The [MCP transport specification][mcp-transport] permits JSON or SSE replies
to POST requests and requires clients to accept both. Consequently,
Skyttel's JSON setting is not itself evidence of a protocol mismatch.
Confirm negotiated protocol version, initialization, `tools/list` and one
bounded `read_map` call in a later live trial.

An unauthenticated `/mcp` request receives a 401 with `WWW-Authenticate`
pointing to protected-resource metadata and requesting `skyttel:read`.
The resource metadata identifies the exact `${origin}/mcp`, its issuer at
`${origin}/api/auth`, read/write scopes and header bearer authentication.
The path-suffixed resource discovery address redirects to the root one.
Skyttel also exposes authorization-server metadata through the well-known
path for that issuer. [Discovery][discovery], [challenge][verify]

This supports standard discovery in principle. The [MCP authorization
specification][mcp-auth] describes metadata discovery and resource-bound
authorization, but compliance requirements are not observations of Fleet.
Verify that Fleet follows the challenge and issuer path rather than
guessing endpoints from the host root.

### DCR, PKCE, resources and scopes

Skyttel enables unauthenticated DCR, permits `authorization_code` and
`refresh_token` grants, configures `${origin}/mcp` as its audience and
registration's default resource, and defaults registered scopes to
`skyttel:read`. The allowed scope set additionally contains `skyttel:write`
and `offline_access`. Client Credentials is outside the configured grants
and cannot replace the household user's consent. [OAuth configuration][auth]

The lockfile pins the provider to 1.7.12. Its
[official provider guide][provider] describes public clients with token
authentication method `none`, PKCE and
S256 rather than plain challenges. Skyttel's checked-in HTTP test helper
demonstrates the intended combination: native DCR, `none`, an S256
challenge, explicit resource at authorization and token exchange, and the
original redirect URI/verifier. A test definition checks that a wrong
verifier fails. These are useful implementation evidence, not a Fleet
execution result. [Pinned dependency][lock], [flow helper][helper],
[consent/PKCE tests][consent-tests]

Fleet must supply registration metadata and token authentication consistent
with its registered client. The actual automatic redirect URI and client
type remain live checks; do not copy the CLI helper's loopback callback
into Fleet. The provider documents HTTPS web callbacks and native loopback
rules separately. [Provider registration rules][provider]

Every external MCP call must carry a token valid for issuer
`${origin}/api/auth`, audience `${origin}/mcp` and scope `skyttel:read`,
plus Skyttel's grant claims and a current matching connection/membership.
Merely logging into Skyttel with browser cookies is insufficient.
[Token and grant verification][verify]

Registration defaults are helpful but do not prove which audience Fleet's
complete exchange produces. Record whether it sends the exact `resource`
and whether the resulting token is accepted, without recording the token.
Skyttel rejects duplicate singleton OAuth parameters and protects repeated
resource indicators from parser ambiguity. Do not work around a failed
exchange by accepting a different resource. [Parameter validation][params]

Start with read scope only; request `offline_access` only if refresh is
part of the chosen trial. Protected-resource metadata advertises both read
and write, while the initial challenge requests read. If Fleet chooses all
advertised scopes, it could request write despite the read-only trial plan.
Inspect the consent screen and stop if it cannot deliver the intended
permission set. A manual provider's scope override is a documented option,
not a verified or preauthorized workaround. [Discovery][discovery],
[OAuth configuration][auth], [Fleet options][fleet]

### Household selection, consent and permissions

Skyttel forces consent on authorization. Its own consent handler requires
a logged-in user, an enabled registered client, membership in the selected
household and an explicit external-AI choice. A request for write scope
also requires the separate map-work choice. The connection stores that
user, household and client together, and access tokens reference the
specific grant. Household access also refuses access during installation
recovery. [Authorization entry][entry], [consent handler][consent],
[household access][membership]

The browser must therefore reach Skyttel's consent page, let the user
authenticate through the configured provider, choose the intended
development household and explicitly approve external AI processing.
Fleet need not implement household selection itself; it must preserve this
browser round trip. Consent is distinct from browser storage consent and
does not itself save household information. [User procedure][user-guide]

Read scope exposes the saved map and the connected user's own existing
draft. It is not an empty scratch space: `read_my_draft` includes proposals
from other clients for that user. Write tools are registered only when the
token also carries write scope. A later optional write stage needs a new
explicit grant and explicit save requests; server checks do not independently
prove what the user actually said. Administration, full export, reimport
and permanent erasure remain in the authenticated application, without
MCP administration tools. Fleet gains no installation-operator role.
[Tool registration][transport], [user boundaries][user-guide]

### Revocation and origins

The user can revoke their own connection; a household administrator can
also revoke members' connections in that household. Skyttel deletes the
grant's access tokens, refresh tokens, consent and connection. MCP request
verification checks the live connection and membership; map reads check the
connection again. Existing test definitions cover membership revocation
and refresh-token rejection. Verify Fleet's next read fails after
revocation and that reconnecting asks for consent again. Revocation cannot
delete results already received or retained by Fleet.
[Revocation handler][revoke], [request checks][verify],
[revocation tests][revoke-tests], [user guidance][user-guide]

At `/mcp`, a missing Origin header is accepted by this check; a nonempty
Origin must exactly equal the configured Skyttel origin or the request
receives 403 before token verification. Thus a request carrying a Fleet web
origin will fail even with a valid token. Server-to-server calls without
Origin are a plausible fit, not an observed Fleet behavior. Browser writes
to `/api/assistants/*` require the Skyttel origin, and Better Auth trusts
that same origin. [Origin checks][origin], [auth base URL][base]

Keep this rule intact. The [MCP transport specification][mcp-transport]
requires validation of supplied Origin headers. A live trial should
distinguish an origin-related 403 from an authentication-related 401 and
record only sanitized metadata.

## Reachable development origin and callbacks

Let `O` be one stable, browser-visible HTTPS origin without a path. Configure
`SKYTTEL_ORIGIN=O` and make the full app available there. Existing
[remote-client setup guidance][remote-setup] explicitly permits a
devcontainer experiment when MCP and OAuth are both reachable; this does
not require moving Skyttel's runtime or hosting to Fleet.

The planned route must cover these paths under `O`:

<!-- markdownlint-disable MD013 -->
| Purpose | Paths |
| --- | --- |
| MCP and resource identity | `/mcp` |
| Resource discovery | `/.well-known/oauth-protected-resource`, `/.well-known/oauth-protected-resource/mcp` |
| Issuer discovery | `/.well-known/oauth-authorization-server/api/auth`, `/api/auth/.well-known/oauth-authorization-server` |
| OAuth exchanges and keys | `/api/auth/oauth2/register`, `/api/auth/oauth2/authorize`, `/api/auth/oauth2/token`, `/api/auth/oauth2/revoke`, `/api/auth/jwks` |
| Browser login and consent | Full app assets/routes, `/assistant-consent`, `/api/auth` login/session routes, `/api/assistants` context/consent/revocation routes |
| Login-provider callbacks | `/api/auth/callback/google`, `/api/auth/callback/microsoft` |
<!-- markdownlint-enable MD013 -->

These are the [implemented routes][entry] and [discovery paths][discovery].
Fleet's service needs to reach discovery, registration, token exchange and
MCP; the user's browser needs login, consent, assets and the return routes.
Forwarding only `/mcp` cannot complete this flow. Preserve paths, bearer
headers, response headers and OAuth redirects. An ingress login screen
that intercepts Fleet's machine requests would be an additional unresolved
authentication barrier. These are network prerequisites inferred from the
flow, not a selected exposure method. [Remote setup][remote-setup]

Register the exact `O/api/auth/callback/google` and
`O/api/auth/callback/microsoft` in the corresponding development provider
applications. These callbacks return provider login to Skyttel. The
separate Skyttel-to-Fleet authorization callback belongs to Fleet and must
match Fleet's registered `redirect_uri`; it is not another Skyttel callback
to add to Google or Microsoft. [Installation callbacks][callbacks],
[OAuth flow helper][helper], [Fleet callback][fleet]

Choose the origin before connecting, keep it stable throughout the trial,
and plan restoration of local configuration afterward. No hostname,
tunnel, certificate, provider registration or external exposure is
provisioned by this research.

## Recovery preparation and remaining decisions

The user's stated recovery option is to recreate seed data through DB
console setup. The repository's documented equivalent is
`npm run db:setup`, implemented by `scripts/setup-database.ts`; no separate
DB-console reset procedure is established here. It loads
`SKYTTEL_DEV_ENV_FILE` or `.devcontainer/.env`, refuses production mode and
placeholder administrator subjects, opens the selected database, clears
all application tables in a transaction and seeds `TestHousehold` with
the configured administrator. It preserves migration history and SQLite
internal tables, not prior household state. [Reset source][reset],
[reset guide][reset-guide]

This is a whole-development-database reset: other households, memberships,
sessions, connections, drafts and history are replaced too. Seed contents
include saved history and an administrator draft, including a conflict;
the reset is not a clean empty-draft baseline. IDs use fresh UUIDs, so
later scenarios must rediscover identifiers and reauthorize connections.
It does not remove Fleet conversations, traces or cached tool results.
[Reset source][reset], [seed source][seed], [revocation limits][user-guide]

Before an authorized trial, the operator must privately confirm the selected
database/environment and administrator identity, decide whether any current
development work needs preservation, and record the intended initial draft
state. Rebuilding the devcontainer also resets demo data; normal restarts
preserve it. Revoke the trial connection before teardown, then reset only
if explicitly intended and sign in again afterward. [Reset guide][reset-guide]

Two planning questions remain sharp:

1. Which stable HTTPS development origin and access route will make the
   entire OAuth/app/MCP flow reachable while preserving the existing origin
   policy and the later return to local development?
2. What exact trial acceptance and stop conditions cover read-only scope,
   DCR/PKCE/resource compatibility, consent/household identity, revocation,
   optional refresh and cleanup on both services?

Answering those questions can produce a trial plan. Execution must still
record the real automatic callback, registration acceptance, transport,
headers, scopes, token acceptance and post-revocation behavior. If a
required behavior fails, report the incompatibility; this note authorizes
no application or authorization-policy changes to make it pass.

[fleet]: https://docs.langchain.com/langsmith/fleet/remote-mcp-servers
[mcp-auth]: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
[mcp-transport]: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
[provider]: https://www.better-auth.com/docs/plugins/oauth-provider
[auth]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-auth.ts#L30-L65
[transport]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L268-L360
[discovery]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L41-L59
[verify]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L212-L286
[params]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/oauth-parameters.ts#L49-L80
[entry]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/app.ts#L264-L302
[consent]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L90-L180
[membership]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/households.ts#L12-L25
[revoke]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L182-L210
[origin]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L60-L65
[base]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/auth.ts#L30-L43
[user-guide]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/user-guide/assistants.md
[lock]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/package-lock.json#L262-L279
[helper]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/tests/support/assistant.ts#L5-L89
[consent-tests]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/tests/unit/server/assistants.test.ts#L290-L325
[revoke-tests]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/tests/unit/server/assistants.test.ts#L231-L288
[remote-setup]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/manual-tests/setup/assistants.md#L197-L209
[callbacks]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/installation.md#L288-L297
[reset]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/scripts/setup-database.ts
[reset-guide]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/development/devcontainer.md#L254-L276
[seed]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/scripts/seeds/demo.ts
