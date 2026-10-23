# Skyttel security audit

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

| Lead | Source boundary | Decisive missing fact |
| --- | --- | --- |
| An older database restore may reinstate a revoked household member | `src/server/map.ts:227` | Whether operators reconcile post-copy revocations before ingress opens. |
| Ordinary map reads materialize retained save receipts | `src/server/map.ts:208` | Whether full-history parsing materially affects shared service availability. |
| Type-removal response reveals whether another draft uses a shared type | `src/server/app.ts:163` | Whether a type-specific private-draft use bit is confidential by product policy. |
| Repeated duplicate relationship forms retain full submissions | `src/server/relationship-form-attempts.ts:41` | Whether deployed rate and disk limits allow shared-storage exhaustion. |
| Completed assistant turns retain growing session snapshots | `src/server/text-assistant.ts:1813` | Whether quadratic retained list entries affect shared-process memory or latency. |
| Shared map text may induce an unrequested change to another member’s private draft | `src/server/map.ts:779` | Whether saved map text actually induces an unrequested model proposal. |

Each lead has an exact source trace, blocker, and bounded validation plan in `NEEDS-VALIDATION.md`. None has a severity rating or is presented as a confirmed vulnerability.

## Coverage limit

The OAuth assistant-consent unit remains **blocked**: Skyttel’s source binds browser session, Origin, grant, client, scope, and current membership, but the installed `@better-auth/oauth-provider` package was absent. Its signed `oauth_query`, duplicate-parameter, consent-scope, and authorization-code internals could not be inspected. The existing tests could not run under the unverified sandbox. This is a review limit, not a finding.

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
