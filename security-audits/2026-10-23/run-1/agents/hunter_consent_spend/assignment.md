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
    "coverage_id": "src%2Fserver%2Fconversation-consent-routes.ts%23consent::src%2Fserver%2Fconversation-consent.ts%23valid-and-revoke::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/conversation-consent-routes.ts#consent",
      "boundary": "src/server/conversation-consent.ts#valid-and-revoke",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Conversation consent and revocation",
    "boundary": "src/server/conversation-consent.ts#valid-and-revoke",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/conversation-consent-routes.ts",
      "src/server/conversation-consent.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Output and disclosure attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes"
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
    "agent_id": "hunter_consent_spend",
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  },
  {
    "coverage_id": "src%2Fserver%2Ftext-assistant.ts%23conversation-admission::src%2Fserver%2Ftext-assistant.ts%23queue-and-provider-work::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/text-assistant.ts#conversation-admission",
      "boundary": "src/server/text-assistant.ts#queue-and-provider-work",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Authenticated assistant work and provider spend",
    "boundary": "src/server/text-assistant.ts#queue-and-provider-work",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts",
      "src/server/conversation-capacity.ts",
      "src/server/model-client.ts",
      "src/server/costs.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
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
    "agent_id": "hunter_consent_spend",
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  }
]

## Selected source guidance (verbatim blocks)

### AI-AND-LLM.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- Prompt injection alone is not a finding. Require a code-level boundary failure: content reaches another principal's context, invokes authority the requester lacks, discloses data they cannot read, or drives a sink they cannot reach directly.
- Model output, memory, tool descriptions, and MCP responses are untrusted inputs. Point to the code that grants authority, trusts output, writes durable state, or feeds a sink.
- A guardrail prompt is not a security boundary. Count only deterministic checks, resource-scoped authorization, isolation, binding, and constrained credentials.
- State the attacker, affected principal, effective execution identity, resource, exact action, authority used, and observable impact. An intentional direct request to use the requester's existing authority is not a delegation defect merely because a model executes it.
- Authorization and action binding are separate controls. Attacker-controlled content that causes an action under an affected principal's valid authority is an action-binding failure when that principal did not intentionally request or approve the exact action.
- Classify every candidate as `confirmed` only after source evidence and bounded local validation establish the boundary and result. Use `needs_validation` when a required provider, deployment, model, renderer, or identity behavior is not observable locally.
```

### AI-AND-LLM.md#Output and disclosure attack classes

## Output and disclosure attack classes (subagent_type: `general`)

**Insecure output rendering**
Model output reaches an executing HTML, Markdown, template, URL, or command sink without the sink's required encoding and policy. For browser rendering, verify auto-loaded resources and CSP or sanitization in `CLIENT-SIDE.md`; renderer behavior outside the repository makes the candidate `needs_validation`.

**Sensitive context extraction**
The assembled context contains credentials, another user's data, private source, or policy values that themselves grant access, and user-influenced output exposes them. Read prompt assembly and data-fetch code. Disclosure of generic instructions or behavior that does not cross a data boundary is not a finding.

### AI-AND-LLM.md#Universal moves

## Universal moves (apply across the above)

- Draw four maps first: each execution identity, each capability, every writable context or memory source, and each output destination. Then connect the principal at the start to the authority at the end.
- Start at side-effecting tools and work backward through dispatcher, schema, confirmation, model context, retrieval, and ingestion. Start at durable memory reads and trace every writer.
- Compare direct, queued, retry, resume, batch, and delegated paths for the same action. The strongest gate must apply after arguments are final and before every side effect.

### AI-AND-LLM.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Name the crossed boundary and observable result: attacker, affected principal or shared resource, execution identity, target, and unauthorized or unrequested action or disclosure.
2. For confused-deputy authority claims, prove the tool lacks requester-and-resource authorization and that the attacker cannot perform the same action normally. For action-binding claims, instead prove attacker-controlled content caused an action under the affected principal's authority that the principal did not intentionally request or approve. Valid generic authorization does not establish that intent.
3. For memory or retrieval claims, cite both the attacker-controlled write and the later cross-principal read or privileged decision. A shared record without a reachable consumer is not enough.
4. For action binding, establish the intentional request or normalized approved object, if any, and compare it with the object the handler uses. Confirm a locally observable unrequested action, mutation, duplicate, or authority change without extending the test into harmful execution. For schema disagreement, compare the normalized validated object with the handler's object.
5. For MCP identity claims, verify the authenticated connection, request correlation, tool namespace, and effective credential. Mark `needs_validation` if external server identity or deployment routing is required.
6. Return `confirmed` findings only with a complete source trace and meaningful result. Return `needs_validation` for a specific unresolved boundary fact and state the bounded local or owner-observed check needed to resolve it.

### ATTACK-CLASSES.md#Business logic

**Business logic** (subagent_type: `general`)
Hunt logic errors by hand: standard scanners cannot find them, and they yield high-impact findings. For each major workflow:
- **State machine violations**: Can you skip steps? Go backwards? Reach an invalid state? What happens if you replay a completed flow? What about partial failure — if step 2 of 3 fails, is step 1 rolled back?
- **Race conditions with business impact**: Concurrent operations that produce invalid states (double-spend, double-approve, lost updates). Focus on operations that check-then-act non-atomically.
- **Numeric/quantity manipulation**: Negative values, zero values, overflow, precision loss, type coercion between string and number.
- **Access boundary violations**: Not "does the permission check exist" but "is it the right check for the business rule?" Can input to one operation bypass a restriction enforced on a different operation for the same effect?
- **Implicit trust assumptions**: Data from storage, config, other components, or plugins assumed safe because "we validated it on the way in." What if a different code path wrote it?
- **Time-based logic**: Expiry checks, scheduling, rate windows, clock skew. What happens at exact boundary moments? What about timezone differences between components?
- **Default and fallback behavior**: What is the security posture when config is missing? When a feature flag is off? When a dependency is unavailable? When the system is mid-migration?

### ATTACK-CLASSES.md#Feature abuse and data leakage

**Feature abuse and data leakage** (subagent_type: `general`)
Legitimate features used for unintended purposes. Look for bugs in the design, not only in the code:
- **Export/backup as exfiltration**: Can a low-privilege user trigger an export, snapshot, or backup that includes data above their access level? Can they export other users' data? Does the export include deleted/draft/private content? Revision history that was supposed to be pruned?
- **Import/restore as injection**: Can import overwrite existing data? Can it create records that bypass normal validation? Can it inject content into collections the user has no write access to? Does it respect the same permission model as the UI?
- **Search/filter/sort as oracle**: Can search queries reveal whether content exists that the user cannot directly access? Do filter parameters let users probe statuses, roles, or fields they should not know about? Does sorting by a hidden field reveal its values through result ordering?
- **Enumeration through side effects**: Do error messages differ between "does not exist" and "no access"? Do response times differ? Response sizes? HTTP status codes? Can you enumerate users through password reset, invite, or registration flows?
- **Preview/draft/staging leakage**: Are preview tokens scoped to one item or do they unlock broader access? Can draft content be discovered through search, RSS feeds, sitemaps, or API listing endpoints? Can cache headers cause a CDN to serve private content publicly?
- **Notification/webhook as SSRF**: Can a user set a notification URL, webhook URL, or callback URL that the server fetches? Is it validated against internal networks? What about after a redirect?

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

### RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline

## Core discipline (include in every agent prompt for this domain)

```
- Require an input-to-cost path, a missing effective bound, and impact on another user, shared service, safety function, or operator-owned spend. Self-limiting work in the requester's own process is not a service vulnerability.
- A missing rate limit is not enough. Check body/message/file caps, concurrency, queues, deadlines, database constraints, upstream gateways, and per-tenant quotas before calling a path unbounded.
- Do not run stress, saturation, or production tests. Use asymptotic analysis, small boundary fixtures, mocked paid calls, strict local resource limits, and deterministic cancellation tests.
- State attacker cost, service work, persistence, scope, and recovery. One bounded input with superlinear or persistent shared effect is materially different from sustained volume.
- Use `confirmed` for source-visible bounds failures demonstrated safely. Use `needs_validation` when upstream caps, deployed topology, autoscaling, paid quota, or recovery behavior is outside the repository.
```

### RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes

## Quota and scheduling attack classes (subagent_type: `general`)

**Pre-authentication work imbalance**
Expensive parsing, key lookup, cryptography, decompression, or external requests happen before authentication and the earliest size/rate gate. Compare minimal requester effort to shared service cost and check upstream limits.

**Quota-accounting scope and reset gaps**
Accounting uses attacker-influenceable IP, route, tenant, key prefix, task ID, or other dimension, allowing one principal's work to escape its intended budget or consume another principal's allocation. Review integer overflow, distributed races, retries, reconnects, and account switching.

**Worker, pool, and priority starvation**
Low-priority or attacker-controlled jobs hold shared locks, workers, database pools, event-loop turns, or scheduler priority needed by unrelated users. Require a path that bypasses queue/concurrency fairness or retains a slot beyond its deadline.

### RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes

## Resource accumulation attack classes (subagent_type: `general`)

**Unbounded buffering and cardinality**
Bodies, out-of-order streams, uploads, sessions, unique cache keys, metrics labels, log fields, subscriptions, or pending jobs accumulate without per-item and aggregate limits. Find cleanup and expiration on disconnect, timeout, cancellation, and partial parse.

**File descriptor, handle, and temporary-resource leaks**
Malformed or canceled work misses cleanup and retains sockets, files, database cursors, timers, subprocesses, temporary files, or object references. Confirm the leak repeats through bounded local iterations and affects a shared pool.

**Detached work after cancellation**
Client timeout, disconnect, canceled job, or failed authorization returns control but leaves database, model, network, or worker work running. Trace cancellation and deadline propagation through every layer.

### RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves

## Universal moves (apply across the above)

- Build an input-to-resource table: earliest accepted size/cardinality, work before auth, downstream fan-out, persistence, shared pool, limit and cleanup owner, recovery.
- Compare aggregate limits with per-object limits. Ten thousand valid one-byte items may evade a per-message cap while exhausting tenant-wide or process-wide state.
- Validate only in an isolated fixture with strict CPU/memory/time limits and small growth points. Mock external and paid calls and stop once the missing bound or cancellation is observable.

### RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules

## Validation rules (apply before reporting ANY finding here)

1. Name untrusted input, requester work, service amplification or retained resource, shared blast radius, and recovery. Missing limits without concrete shared impact are hardening.
2. Confirm no source-visible upstream, parser, queue, tenant, or framework bound prevents the path. Unknown deployed controls require `needs_validation`.
3. For superlinear behavior, establish the accepted complexity and bounded local growth. For leaks, show repeatable retention after cleanup should occur. For fatal paths, identify process/supervisor isolation.
4. Prioritize by low requester work, unauthenticated reachability, cross-tenant scope, persistence, and poor recovery; do not validate with availability impact.
5. Return `confirmed` only with safe local proof and meaningful shared effect. Return `needs_validation` with the exact upstream limit, topology, quota, or recovery observation an owner must check.

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
    "block": "ATTACK-CLASSES.md#Access control",
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

Agent ID: hunter_consent_spend. Scratch: /Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/agents/hunter_consent_spend/scratch. Parent-owned artifacts: /Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/agents/hunter_consent_spend/artifacts. Promotion allowlist: empty; per-file and cumulative bound: 0 bytes. The parent has not verified a disk-quota and race-safe promotion setup, so do not execute target-controlled code. Source-only checks use artifact null. Do not write any file.

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
