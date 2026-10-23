You are a security hunter. Find source-grounded security invariant failures in the assigned units and return exactly one JSON object matching the structured-result contract below.

## Architecture (verbatim)

# Skyttel security architecture

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


## Assigned units and block map

[
  {
    "coverage_id": "src%2Fserver%2Fapp.ts%23POST%20%2Fapi%2Fhouseholds::src%2Fserver%2Fhouseholds.ts%23createHousehold::src%2Fserver%2Finstallation::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/app.ts#POST /api/households",
      "boundary": "src/server/households.ts#createHousehold",
      "subsystem": "src/server/installation",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Initial household creation",
    "boundary": "src/server/households.ts#createHousehold",
    "subsystem": "src/server/installation",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/app.ts",
      "src/server/households.ts",
      "src/server/config.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 2,
    "status": "in_progress",
    "agent_id": "hunter_install",
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  },
  {
    "coverage_id": "src%2Fserver%2Fdatabase.ts%23startup::src%2Fserver%2Finstallation-authority.ts%23prepareInstallationAuthority::src%2Fserver%2Finstallation::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/database.ts#startup",
      "boundary": "src/server/installation-authority.ts#prepareInstallationAuthority",
      "subsystem": "src/server/installation",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Database restore and authority rotation",
    "boundary": "src/server/installation-authority.ts#prepareInstallationAuthority",
    "subsystem": "src/server/installation",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/installation-authority.ts",
      "src/server/database.ts",
      "src/server/auth.ts",
      "src/server/legacy-login-upgrade.ts",
      "docs/operations/database-restore.md"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 2,
    "status": "in_progress",
    "agent_id": "hunter_install",
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  }
]

## Selected source guidance (verbatim blocks)

### ATTACK-CLASSES.md#Access control

**Access control** (subagent_type: `general`)
Verify that a caller cannot do something outside its authority. Go beyond checking whether permission checks exist — verify they check the *right* permission for the *right* resource via the *right* mechanism:
- Is there a path to the same state change that checks a different (weaker) permission?
- Can a field in the request body override what the permission system intended to restrict?
- Are there endpoints that gate on authentication but forget authorization?
- Does the same resource have multiple access paths with inconsistent checks?
- What about bulk/batch/export/import operations — do they enforce per-item permissions?

For complex access models, split into separate agents for auth bypass vs authorization logic.

### DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- A tenant or owner field on a record is not isolation. Find the query, key, path, policy, or row-level control that enforces it for each read and write path.
- Trace derived copies. Sanitized primary data can become unsafe in search, cache, analytics, export, previews, logs, replicas, and backups with different ACL and retention rules.
- Deletion and revocation are lifecycle contracts. Check current, historical, cached, indexed, exported, restored, and queued copies within the product's stated boundary.
- Privacy or retention preference is not automatically a security vulnerability. Require an explicit data-access boundary or deletion/revocation guarantee and an unauthorized reader or later operation.
- Use `confirmed` for complete source-visible lineage and bounded dummy-tenant tests. Use `needs_validation` when external storage policy, retention, CDN behavior, replica lag, or backup access is unavailable.
```

### DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes

## Deletion, revocation, and lifecycle attack classes (subagent_type: `general`)

**Soft-delete and tombstone bypass**
Direct lookup, search, relation traversal, object link, background processor, or restore ignores the lifecycle predicate and returns or acts on a deleted/revoked record. Check whether soft-deleted identifiers can be re-registered before all references are gone.

**Stale authorization and derived copy use**
Membership removal, ACL update, consent withdrawal, secret revocation, or role downgrade does not invalidate sessions, caches, subscriptions, jobs, or materialized data that continue to authorize future operations.

**Retention and queued-work overrun**
Deletion completes in primary storage while queued processors, retries, exports, analytics, or generated artifacts recreate or retain the data beyond the promised boundary. Find idempotent deletion and tombstone propagation.

**Restore reintroduces invalid state**
Backup, undo, undelete, or replica recovery restores data, credentials, memberships, or permissions that current policy no longer allows. Re-authorize restored state and reapply lifecycle changes made after the snapshot.

### DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes

## Export, backup, restore, and migration attack classes (subagent_type: `general`)

**Export and backup scope expansion**
An export, snapshot, portability package, report, or backup includes other tenants, inaccessible object fields, soft-deleted data, secret values, or history above the requester's access. Check per-item authorization after selection and authorization to download the final artifact.

**Import and restore authority expansion**
Restore/import bypasses owner, schema, ACL, uniqueness, or validation rules, overwrites existing resources, or recreates records in a tenant the requester cannot write. Validate archive contents as untrusted and authorize the resulting operation rather than trusting prior provenance.

**Migration default and ownership confusion**
Old records lack tenant/ACL/lifecycle fields, incompatible IDs collide, or partial rollout makes new and old readers apply different defaults. Review backfill, dual-read/write, compatibility, rollback, and resumed-migration paths.

**Backup and replication boundary drift**
Encryption keys, storage accounts, cross-region replicas, restoration environments, or support snapshots have broader identity or tenant scope than primary data. Source can confirm only in-repo policy; hosted access and retention require `needs_validation`.

### DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes

## Tenant and object-isolation attack classes (subagent_type: `general`)

**Missing tenant or owner enforcement**
A read, update, delete, list, count, or bulk query identifies an object without binding it to the authenticated tenant/owner, or trusts body fields to supply that identity. Compare direct lookup, nested relationship, background, admin, import, and legacy paths.

**Composite-key and namespace collision**
Cache keys, object paths, database uniqueness, search document IDs, temporary files, or deduplication keys omit tenant or environment. Two principals can overwrite or retrieve the same logical key even though application records carry separate owners.

**Policy and query disagreement**
Row-level policy, ORM default scopes, authorization filters, and raw/bypass clients apply different predicates. Check joins, aggregates, aliases, views, transactions, `unscoped` or service clients, and error paths where context is missing.

**Blob and signed-reference overreach**
Object keys, attachment IDs, version IDs, shared links, or signed URLs permit operations or namespaces beyond the issuing principal's access, or remain valid after the underlying ACL changes. Bind operation, exact object/version, audience, expiry, and tenant.

### DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves

## Universal moves (apply across the above)

- Pick one protected record and draw primary write, query, cache, index, event, export, backup, deletion, and restore paths. Mark principal and tenant at every edge.
- Compare two dummy tenants through the same local service methods, then repeat after ACL change, deletion, account switch, and restore. Do not use real user data.
- Start at bypass clients, background jobs, migrations, global uniqueness, and cache keys. These paths commonly omit request-scoped identity that interactive endpoints carry.

### DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Name attacker or lower-trust principal, protected data/state, affected owner/tenant, alternate copy or operation, and unauthorized disclosure or mutation.
2. Cite both intended source-of-truth policy and the path that omits or disagrees with it. Confirm another layer does not enforce the same tenant/lifecycle condition.
3. Use local dummy tenants and non-sensitive fixtures to prove cross-scope access or stale lifecycle behavior. Stop at the minimum observable record or operation.
4. If external cache, object storage, replicas, analytics, backup, or retention policy is required, classify `needs_validation` and state the owner-observed check.
5. Return `confirmed` only with complete lineage and concrete boundary impact. Return `needs_validation` with the exact unresolved storage, ACL, invalidation, retention, or restore fact.

## Excluded blocks and reasons

[
  {
    "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
    "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
  },
  {
    "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
    "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
  },
  {
    "block": "ATTACK-CLASSES.md#Injection",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Resource and file handling",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Cryptography and secrets",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Business logic",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Wildcard",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  },
  {
    "block": "ATTACK-CLASSES.md#Obvious things",
    "reason": "Outside these assigned class units; any source-backed gap must be returned under uncovered."
  }
]

## Core hunting method and promotion procedure

#### Core hunting method — include in every hunter prompt

```text
## Defensive vulnerability-finding method

Your goal is to find source-grounded security invariant failures and the smallest fix,
not to expand harm beyond the boundary result. Stay within source review and bounded local execution.
Do not contact deployed endpoints, provider APIs, registries, identity systems,
message brokers, shared services, or other users. Use local dummy data only.

READ THE CODE AT DEPTH. Follow each assigned input through parsing, identity,
authorization, normalization, state, derived copies, and the final sink. Read sibling,
legacy, batch, retry, cancellation, migration, and error paths that produce the same
effect. Compare sibling controls for equivalence, not only presence, and compare what
one component guarantees with what the next component assumes.

WORK FROM A CONCRETE INVARIANT:
1. Name the lower-trust principal and starting capability.
2. Name the accepted value, action, state transition, or resource selector.
3. Locate the control that should reject, bind, isolate, limit, or revoke it.
4. Trace the exact source path after that decision.
5. Stop at the smallest affected dummy record, wrong return value, process-integrity
   effect, or locally observable shared-resource effect.
6. State a source-level change and regression case that enforce the invariant.

DEPTH BOUND: trace only paths that can reach your assigned boundary or whose
guarantees that boundary relies on. Stop a line of investigation as soon as the
invariant is settled either way, and record the result in your structured output —
a covered, candidate, or blocked disposition, or an `uncovered` entry — instead of
continuing to search.

TEST SAD PATHS AND DISAGREEMENTS. Check absent, empty, zero, negative, maximum,
over-limit, duplicate, mixed encoding, stale, revoked, reordered, concurrent,
partially migrated, failed dependency, and rollback state only where the interface
accepts them. Compare canonicalization and units at every parser or policy handoff.
For multi-step issues, treat each output as a prerequisite and do not assume a later
boundary. If any prerequisite is not established, record a blocker.

When a proposed high or critical candidate reveals a reusable root cause, search paths
owned by the assigned coverage IDs for lexical, structural, and logical variants.
Consolidate the same root cause, but establish each variant's conditions and impact
independently. Do not investigate peer-owned units. Return a variant with no current
coverage unit as `uncovered`.

USE THE NARROWEST LOCAL CHECK THAT SETTLES THE CLAIM. Target-controlled builds,
tests, processes, browsers, emulators, fuzzers, and fixture processing may run only
inside the parent-approved OS-enforced sandbox. It must disable external networking,
start from an empty allowlisted environment, expose target and tools read-only, permit
writes only to your scratch directory, and apply low CPU, memory, process, file-size,
disk, and wall-clock limits. Isolated loopback is allowed only for a local fixture.
If any control is unavailable, do not execute: return needs_validation with that exact
blocker. Prefer an existing unit test, minimal function harness, dummy-tenant service
call, small malformed fixture, deterministic race schedule, or locally rendered policy.
Do not install or fetch tools.

Record the exact input, command, limits, and minimum result. For the environment,
record only allowlisted variable names and safe non-secret values needed to reproduce
the check. Never capture the ambient environment, inherited variables, credentials,
authentication state, or unrelated host paths. The target-controlled process writes
only in scratch. After the sandbox and all its processes terminate, only trusted
parent-side code may promote predeclared scratch-relative files, following the
promotion procedure block included verbatim in this prompt. You and target code never
write retained artifacts. If promotion is unavailable or fails for decisive evidence,
return needs_validation with the exact promotion blocker.
Never stress availability, invoke a live target, use a real credential, publish an
artifact, or continue past the minimum observed effect.

A deployment, browser, provider, broker, OS, proxy, package, secret, or identity fact
outside source is not proof either way. If one such fact is decisive, return a
needs_validation record with the exact missing observation and safe owner-observed check.
```

#### Promotion procedure — copy this promotion procedure verbatim into every hunter prompt

```text
Artifact promotion procedure (trusted parent-side code only):
Reference only for you: the parent performs these steps; you never perform them.

Before execution, the parent opens and retains trusted, non-inheritable directory
descriptors for the agent's scratch/ and artifacts/ roots, and records an allowlist
of expected scratch-relative artifact files plus explicit per-file and cumulative
byte limits. Never pass those descriptors to the agent or sandbox. After the sandbox
and all its processes terminate, trusted parent-side code promotes each allowlisted
file separately:

1. Validate the declared relative path: reject absolute, empty, `.`, `..`, or
   symlinked components.
2. Walk each parent component from the retained scratch-root descriptor with
   no-follow directory-relative operations; never reopen by path.
3. Open the leaf no-follow and nonblocking.
4. Verify with `fstat` that it is a regular file with link count exactly one and
   within the recorded per-file and cumulative byte limits.
5. Enforce those limits again while reading from that descriptor.
6. Copy exactly the verified size, repeat `fstat`, and reject a changed identity,
   type, link count, or size.
7. For the destination, walk every parent component from the retained
   artifacts-root descriptor with no-follow directory-relative operations; require
   each existing component to be a real directory, and create any missing directory
   exclusively before reopening and verifying it no-follow.
8. Create the leaf exclusively without following links, verify that the opened
   destination is a regular file with link count exactly one, and copy from the
   verified source descriptor without reopening either path.
9. Use equivalent race-safe APIs on non-POSIX systems.
10. Never recursively copy or glob scratch, extract an archive into artifacts, or
    open or promote a symlink, FIFO, socket, device, directory, hard-linked file,
    changing file, or file that exceeds its bound.
11. If any check is unavailable, cannot be enforced, or fails, discard the scratch
    entry; if it is decisive evidence, retain `needs_validation` with the exact
    promotion blocker.
```



## Core validation rules and result contract

#### Core validation rules — include in every hunter prompt

```text
## Candidate gate

1. A candidate needs a complete repository-relative source trace and evidence for the
   claimed root cause, including the strongest source-visible control.
2. A proposed confirmed record needs a bounded local observed result, meaningful impact
   across a stated boundary, complete conditions, and no visible preventing layer.
3. Do not strengthen a crash into code execution, ordinary work into shared availability,
   or a same-principal action into privilege gain.
4. If a required fact is not source-visible or locally observable, use
   needs_validation. Name exact blockers; do not give it severity or speculative completion.
5. A missing best practice with no affected principal/resource is excluded or hardening,
   not a finding. A candidate disproved by source is not needs_validation.
6. Use the same source-derived fingerprint for the same root cause in every state.
   It must match `^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$` and must not include a line,
   wave, agent, severity, or verdict.
7. Return an empty candidate array when nothing survives these gates.
```

## Local validation boundaries

Local execution is for confirmation, not impact expansion:

- **Allowed only in the required OS sandbox:** offline builds with present dependencies; isolated-loopback processes using dummy state; unit and integration tests; small fixture processing; sanitizers; bounded fuzz/regression tests; deterministic concurrency checks; local browser/emulator tests with dummy accounts; rendered manifests and policy evaluation with dummy identities; mocked external or paid calls.
- **Disallowed:** live or deployed traffic; requests to services not started for this isolated check; network dependency installation; real accounts or credentials; production data; shared queues, cloud resources, runners, registries, signing or release services; publishing; stress, saturation, or cost generation; any work after the minimum dummy-data boundary result.

The sandbox starts with an empty environment, gives target code no external network or host writable path, and enforces explicit low resource and time limits for every check, not only checks expected to be expensive. Scratch output remains target-controlled after exit. Promote it only with the no-follow, path-confined, regular-file, bounded-size host procedure in `SKILL.md`. Missing any sandbox or promotion capability does not erase a source-grounded candidate; represent the exact blocker in `needs_validation`.

## Structured hunter result

Return exactly one JSON object, with no surrounding prose:

```json
{
  "units": [
    {
      "coverage_id": "one assigned ID",
      "disposition": "covered|candidate|blocked",
      "reviewed_paths": ["repo/relative/path"],
      "checks": [
        {
          "agent_id": "canonical owner of this check",
          "reviewed_paths": ["repo/relative/path owned by this check"],
          "invariant": "specific control checked for this unit",
          "method": "source|local",
          "result": "what source or the bounded check established",
          "artifact": "agents/<agent-id>/artifacts/file for local, null for source"
        }
      ],
      "candidate_fingerprints": [],
      "unresolved": []
    }
  ],
  "candidates": [],
  "hardening": ["concrete non-finding note"],
  "uncovered": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "reason": "why this needs its own deterministic coverage unit"
    }
  ]
}
```

Each `candidates` entry is schema-shaped except that it uses `proposed_verdict` in place of `verdict`:

- `proposed_verdict: "confirmed"`: include every field required by the `confirmed` branch of `report-schema.json` other than `verdict`: `fingerprint`, title, description, `root_cause`, `intended_behavior`, ordered `trace`, `evidence`, `conditions`, target-neutral `execution`, `remediation`, `severity`, and `confidence`. The execution instructions describe only the bounded local check already performed. `payloads` holds the minimum test input, fixture, or native invocation. `observed_result` records actual local output. Overall severity must not exceed observed impact.
- `proposed_verdict: "needs_validation"`: include every field required by that schema branch other than `verdict`: `fingerprint`, title, description, `claimed_root_cause`, ordered `trace`, `evidence`, nonempty `blockers`, and `validation_plan` with at least one applicable `local` or `deployment` step. Do not invent an inapplicable context. Do not include severity, execution, remediation, reason, or a confirmed `root_cause`. `deployment` is an owner-observed check, not a request to probe a live target.

Every assigned coverage ID appears exactly once in `units`. A `covered` unit needs an owner, nonempty `reviewed_paths` and `checks`, no unresolved fact, and no candidate. A `candidate` unit has the same owned evidence and is the only state that carries linked fingerprints. A `blocked` unit is an owned partial review with nonempty paths, checks, and unresolved facts but no fingerprint. All source paths are repository-relative, never absolute or traversal paths. A trace with several entries begins at `entrypoint`, ends at `sink`, and labels intermediate steps `propagation`. Every check has its own canonical lowercase `agent_id` and nonempty `reviewed_paths`; the unit-level list is exactly the union of those owned paths. A `source` check uses `artifact: null`. A `local` check uses one successfully parent-promoted regular file beneath `agents/<check.agent_id>/artifacts/`; this permits a verifier to add independently owned evidence without taking ownership from the hunter. Never link scratch, an output-root file, or another check owner's artifact.



## Prior and peer exclusions

No compatible prior runs or carried findings. Do not duplicate peer-owned coverage IDs; return unexpected boundaries in uncovered.

## Agent isolation

Agent ID: hunter_install. Scratch: /Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/agents/hunter_install/scratch. Parent-owned artifacts: /Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/agents/hunter_install/artifacts. Promotion allowlist: empty; per-file and cumulative bound: 0 bytes. The parent has not verified a disk-quota and race-safe promotion setup, so do not execute target-controlled code. Source-only checks use artifact null. Do not write any file.

## Schema branches (verbatim)

[
  {
    "type": "object",
    "description": "A source-grounded vulnerability that was independently demonstrated.",
    "properties": {
      "verdict": {
        "type": "string",
        "const": "confirmed"
      },
      "fingerprint": {
        "type": "string",
        "minLength": 1,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$",
        "description": "A stable source-derived identifier that does not change between validation states."
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "description": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "root_cause": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "intended_behavior": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "trace": {
        "type": "array",
        "minItems": 1,
        "uniqueItems": true,
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string",
              "enum": [
                "entrypoint",
                "propagation",
                "sink"
              ]
            },
            "file": {
              "type": "string",
              "minLength": 1
            },
            "line": {
              "type": "integer",
              "minimum": 1
            },
            "scope": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            },
            "description": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "kind",
            "file",
            "line",
            "scope",
            "description"
          ],
          "additionalProperties": false
        }
      },
      "evidence": {
        "type": "array",
        "minItems": 1,
        "uniqueItems": true,
        "items": {
          "type": "object",
          "properties": {
            "file": {
              "type": "string",
              "minLength": 1
            },
            "line": {
              "type": "integer",
              "minimum": 1
            },
            "description": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "file",
            "line",
            "description"
          ],
          "additionalProperties": false
        }
      },
      "conditions": {
        "type": "array",
        "uniqueItems": true,
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string",
              "enum": [
                "authentication_level",
                "authorization_role",
                "user_interaction",
                "system_configuration",
                "network_routing",
                "environmental_dependency",
                "data_state",
                "timing_dependency",
                "third_party_dependency"
              ]
            },
            "description": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "kind",
            "description"
          ],
          "additionalProperties": false
        }
      },
      "execution": {
        "type": "object",
        "description": "Target-neutral reproduction in the target's native interface.",
        "properties": {
          "attacker_perspective": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "payloads": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "string"
            }
          },
          "instructions": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "observed_result": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "attacker_perspective",
          "payloads",
          "instructions",
          "observed_result"
        ],
        "additionalProperties": false
      },
      "remediation": {
        "type": "object",
        "properties": {
          "strategy": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "code_changes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "file_name": {
                  "type": "string",
                  "minLength": 1
                },
                "fixed_code": {
                  "type": "string"
                }
              },
              "required": [
                "file_name",
                "fixed_code"
              ],
              "additionalProperties": false
            }
          }
        },
        "required": [
          "strategy"
        ],
        "additionalProperties": false
      },
      "severity": {
        "type": "object",
        "properties": {
          "likelihood": {
            "type": "object",
            "properties": {
              "score": {
                "type": "string",
                "enum": [
                  "informational",
                  "low",
                  "medium",
                  "high",
                  "critical"
                ]
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              }
            },
            "required": [
              "score",
              "reason"
            ],
            "additionalProperties": false
          },
          "impact": {
            "type": "object",
            "properties": {
              "score": {
                "type": "string",
                "enum": [
                  "informational",
                  "low",
                  "medium",
                  "high",
                  "critical"
                ]
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              }
            },
            "required": [
              "score",
              "reason"
            ],
            "additionalProperties": false
          },
          "overall_severity": {
            "type": "string",
            "enum": [
              "informational",
              "low",
              "medium",
              "high",
              "critical"
            ]
          }
        },
        "required": [
          "likelihood",
          "impact",
          "overall_severity"
        ],
        "additionalProperties": false
      },
      "confidence": {
        "type": "object",
        "properties": {
          "score": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ]
          },
          "reason": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": [
          "score",
          "reason"
        ],
        "additionalProperties": false
      }
    },
    "required": [
      "verdict",
      "fingerprint",
      "title",
      "description",
      "root_cause",
      "intended_behavior",
      "trace",
      "evidence",
      "conditions",
      "execution",
      "remediation",
      "severity",
      "confidence"
    ],
    "additionalProperties": false
  },
  {
    "type": "object",
    "description": "A source-grounded candidate whose decisive validation is blocked.",
    "properties": {
      "verdict": {
        "type": "string",
        "const": "needs_validation"
      },
      "fingerprint": {
        "type": "string",
        "minLength": 1,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "description": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "claimed_root_cause": {
        "type": "string",
        "minLength": 1,
        "visibleContent": true
      },
      "trace": {
        "type": "array",
        "minItems": 1,
        "uniqueItems": true,
        "items": {
          "type": "object",
          "properties": {
            "kind": {
              "type": "string",
              "enum": [
                "entrypoint",
                "propagation",
                "sink"
              ]
            },
            "file": {
              "type": "string",
              "minLength": 1
            },
            "line": {
              "type": "integer",
              "minimum": 1
            },
            "scope": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            },
            "description": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "kind",
            "file",
            "line",
            "scope",
            "description"
          ],
          "additionalProperties": false
        }
      },
      "evidence": {
        "type": "array",
        "minItems": 1,
        "uniqueItems": true,
        "items": {
          "type": "object",
          "properties": {
            "file": {
              "type": "string",
              "minLength": 1
            },
            "line": {
              "type": "integer",
              "minimum": 1
            },
            "description": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "required": [
            "file",
            "line",
            "description"
          ],
          "additionalProperties": false
        }
      },
      "blockers": {
        "type": "array",
        "minItems": 1,
        "uniqueItems": true,
        "items": {
          "type": "string",
          "minLength": 1,
          "visibleContent": true
        }
      },
      "validation_plan": {
        "type": "object",
        "properties": {
          "local": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "deployment": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "additionalProperties": false
      }
    },
    "required": [
      "verdict",
      "fingerprint",
      "title",
      "description",
      "claimed_root_cause",
      "trace",
      "evidence",
      "blockers",
      "validation_plan"
    ],
    "additionalProperties": false
  }
]
