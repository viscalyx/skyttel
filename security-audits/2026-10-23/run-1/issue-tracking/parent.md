# architecture.md

Skyttel is a shared household map for digital and financial relationships.
Authenticated household members read and edit the common map while their
unsaved drafts remain private. Household administrators control invitations,
membership, full export, import, and permanent erasure. The installation
operator configures the first administrator, provider credentials, persistent
SQLite database, origin, and authority generation. See `README.md:3-24`,
`GLOSSARY.md:52-65`, and `src/server/config.ts:52-125`.

The application is a Node.js 24 Hono server with a React/Vite browser client,
Better Auth Google/Microsoft sign-in, SQLite storage, optional OpenAI text and
voice features, an OAuth MCP assistant endpoint, and a WebSocket task-delivery
path. The source selects a Docker runtime with a persistent `/data` volume;
Compose binds its port to loopback while other deployment ingress is operator
configured. See `package.json:6-68`, `src/server/index.ts:10-29`,
`Dockerfile:23-50`, `compose.yaml:1-20`.

Comparable source-grounded protocols are OAuth/OIDC for sign-in, OAuth2 for MCP
access, WebSocket task delivery, and WebRTC for voice. Their identity, browser
origin, token scope, and connection-bound authority are the useful comparison
points; no external product's controls are assumed.

The primary HTTP entry is `src/server/app.ts:180-410`. Authentication and
browser binding are enforced in `src/server/auth.ts:23-96` and
`src/server/browser-binding.ts:192-275`. Household membership and draft scope
are checked in `src/server/households.ts:11-31` and
`src/server/map.ts:55-118`. Administrative operations are gated in
`src/server/administration.ts:19-25`; import, export, and erasure have separate
route and domain checks. ZIP upload reaches
`src/server/household-import.ts:196-400` through bounded parsing in
`src/server/import-archive.ts:13-124` and reference checks in
`src/server/import-references.ts:22-155`.

The MCP path binds OAuth tokens, household membership, consent, and tool scopes
in `src/server/assistant-routes.ts:86-299`. The built-in assistant processes
browser text and model tool arguments in `src/server/text-assistant.ts`; the
voice path accepts SDP in `src/server/voice-assistant.ts:218-263`. WebSocket
upgrade is attached directly to the Node server at
`src/server/task-delivery-transport.ts:22-59`, outside the Hono fetch wrapper.
The browser retains optional consent and login preferences in local storage.

The audit covers the working tree at
`e79b5b97cfe73563dc7b028852176cd9521deb70`, with three pre-existing dirty
paths recorded in run metadata. No compatible prior audit ledger was found.
Source inspection is available. Target-controlled builds, tests, or fixtures
will not run unless every required OS sandbox control, including total scratch
disk bounds and race-safe artifact promotion, is verified. Repository npm test
scripts inherit the ambient environment and write a shared lock, so they do
not themselves supply those controls (`scripts/testing/run-with-test-environment.py:39-56`).
Billable provider suites are outside this run.

Coverage starts at the HTTP/browser session, map and administrator decisions,
ZIP and image parsers, assistant and WebSocket paths, deployment configuration,
and release chain. Selected companions are HTTP/auth, client-side, data
isolation, AI/LLM, protocol messaging, resource exhaustion, cloud/deployment,
and supply chain. Native desktop/mobile IPC and memory-unsafe application
code are not source-visible; native dependencies remain a supply-chain and
image-processing boundary rather than an invented application entry surface.

# REPORT.md

## Run and result

- **Profile and scope:** standard full-repository source audit of `viscalyx/skyttel` at `e79b5b97cfe73563dc7b028852176cd9521deb70`. The worktree was already dirty in `.codex/config.toml, docs/research/codex-agent-routing.md, .agents/skills/security-audit/`. No target source was changed by this audit.
- **Budget and review effort:** no user-set agent budget. Initial plan estimated 32 units, 14 hunter assignments, and four critic calls. The final ledger has 49 units; 30 focused hunter assignments, 14 critic passes, 12 candidate/final record reviews, and three delegated reconnaissance reviews were used (59 delegated calls total).
- **Execution boundary:** source inspection only. No target builds, tests, provider calls, deployed probes, or billable voice/model suites ran. The required OS sandbox, including bounded scratch disk and race-safe artifact promotion, was not fully verified. Existing tests were inspected as source evidence only.
- **Prior runs:** no compatible prior audit ledger or findings were available. No carried confirmations or changed-source revalidations.
- **Coverage disposition:** 42 covered, 6 candidate, 1 blocked, 0 deferred, 0 out of scope. The final post-wave and distinct final-clean critics both returned no new units or reassignments.

**No confirmed vulnerability was established.** Six source-grounded leads need bounded local or owner-observed validation. The source shows several strong controls: browser-bound sessions, current household membership checks inside map transactions, versioned draft/save operations, import bounds, authority rotation on restore, and release evidence gates. These controls do not resolve the six specific missing facts below.

## Confirmed findings

| Severity | Finding | Boundary | Observed result |
| --- | --- | --- | --- |
| — | None | — | No target behavior was executed or independently demonstrated. |

## Needs validation

The validation leads are tracked individually in the sub-issues indexed in the
final NEEDS-VALIDATION.md section of this issue.

## Coverage limit

The OAuth provider review remains blocked and is tracked in a dedicated
sub-issue indexed in the final section.

Important exclusions were native desktop/mobile IPC and memory-unsafe application code, neither of which is source-visible. Native dependencies were considered through image handling and supply-chain boundaries. Billable provider suites required explicit authorization and were not relevant to a source-only run.

## Hardening notes

- `scripts/install-repository-npm.mjs` fetches exact `npm@12.0.2` without a repository-held artifact digest. An independently pinned digest would strengthen toolchain provenance.
- Historical model-generated summaries are installed in an assistant-role message with an untrusted marker inside JSON content. An explicit provenance label could reduce model confusion; source did not establish a separate effect.
- No cumulative per-member provider spend cap is source-visible, but no defined budget boundary or observed violation was established. The documented single-process deployment makes multi-instance consent concerns prospective.
- `src/server/definition-usage.ts` includes drafts retained after membership revocation; tests intentionally preserve those drafts for rejoining. No separate security result was established.
- A possible functional SQL alias defect at `src/server/profile-images.ts:57` was observed during source review; no security impact was established.

## Positive source patterns

- Authentication routes require confirmed browser binding; privileged writes check Origin and current identity.
- Map, membership, export, import, and erasure operations repeat authority checks in the domain transaction and bind household/content generations.
- Imports bound archive entry counts, bytes, schema, references, and destination state before replacement.
- Assistant MCP checks grant identity, user, client, audience, scope, and current membership; model save requires explicit current save intent.
- Release publication depends on successful CI/security gates, image identity, signatures, and retained scanner evidence.

## Audit artifacts

- `architecture.md` — source-grounded architecture and trust boundaries.
- `coverage-ledger.json` — 49 deterministic coverage units and independent checks.
- `findings.json` — six independently reviewed `needs_validation` records.
- `FINDINGS-DETAIL.md` — confirmed medium-or-higher detail (none).
- `NEEDS-VALIDATION.md` — complete lead traces and safe next steps.

# FINDINGS-DETAIL.md

No medium, high, or critical finding was confirmed in this source-only audit. No target-controlled local execution met the required sandbox conditions, and no candidate has a demonstrated security outcome sufficient for severity or remediation claims.

See `NEEDS-VALIDATION.md` for the six independently reviewed leads and their bounded validation plans.

# NEEDS-VALIDATION.md

The detailed source traces, evidence, blockers, and resolution plans are kept
in these sub-issues.

## Validation leads

- [ ] [#535 — Validate membership revocation after restoring an older database](https://github.com/viscalyx/skyttel/issues/535)
- [ ] [#536 — Validate availability impact of full save-history parsing](https://github.com/viscalyx/skyttel/issues/536)
- [ ] [#537 — Decide privacy policy for cross-member type-use responses](https://github.com/viscalyx/skyttel/issues/537)
- [ ] [#538 — Validate storage growth from duplicate relationship-form attempts](https://github.com/viscalyx/skyttel/issues/538)
- [ ] [#539 — Validate memory growth from completed assistant snapshots](https://github.com/viscalyx/skyttel/issues/539)
- [ ] [#540 — Validate shared-map prompt injection into another member's private draft](https://github.com/viscalyx/skyttel/issues/540)

## Blocked coverage review

- [ ] [#541 — Complete blocked OAuth provider source review](https://github.com/viscalyx/skyttel/issues/541)

