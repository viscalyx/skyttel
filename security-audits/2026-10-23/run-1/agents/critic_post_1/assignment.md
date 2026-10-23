You are a fresh source-only research coverage critic for a full standard Skyttel security audit. Read source but do not run target code, use network, or write files. Return exactly one JSON object using the contract below, without prose. Propose coverage gaps, not findings.

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


## Current full coverage ledger

[
  {
    "coverage_id": ".github%2Fworkflows%2Frelease.yml%23release::scripts%2Frelease%23promotion-gates::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": ".github/workflows/release.yml#release",
      "boundary": "scripts/release#promotion-gates",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "CI and release authority",
    "boundary": "scripts/release#promotion-gates",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      ".github/workflows/release.yml"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_release",
    "reviewed_paths": [
      ".dockerignore",
      ".github/workflows/ci.yml",
      ".github/workflows/release.yml",
      ".github/workflows/security.yml",
      "Dockerfile",
      "GitVersion.yml",
      "docs/operations/container-releases.md",
      "scripts/release/candidate.mjs",
      "scripts/release/deploy.mjs",
      "scripts/release/deployment-changes.mjs",
      "scripts/release/github-release.mjs",
      "scripts/release/plan.mjs",
      "scripts/release/production-inputs.mjs",
      "scripts/release/restore.mjs"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_release",
        "reviewed_paths": [
          ".github/workflows/release.yml",
          ".github/workflows/ci.yml",
          ".github/workflows/security.yml",
          "scripts/release/restore.mjs"
        ],
        "invariant": "Lower-trust workflow artifacts must not become privileged publication inputs.",
        "method": "source",
        "result": "Publish requires successful plan, checks, and candidate jobs; restored artifacts come from the same workflow run.",
        "artifact": null
      },
      {
        "agent_id": "hunter_release",
        "reviewed_paths": [
          "scripts/release/plan.mjs",
          "scripts/release/candidate.mjs",
          "scripts/release/github-release.mjs",
          "GitVersion.yml",
          "docs/operations/container-releases.md"
        ],
        "invariant": "Release evidence must bind checked source, version, digest, and attestation identity.",
        "method": "source",
        "result": "Plan binds version to triggering commit; OCI inspection checks blobs and labels; publication checks attestations and conflicting assets.",
        "artifact": null
      },
      {
        "agent_id": "hunter_release",
        "reviewed_paths": [
          "scripts/release/deploy.mjs",
          "scripts/release/deployment-changes.mjs",
          "scripts/release/production-inputs.mjs",
          "Dockerfile",
          ".dockerignore"
        ],
        "invariant": "Deployment must use the authorized published digest and verify the running result.",
        "method": "source",
        "result": "Main-branch deployment restores release evidence and checks commit, image digest, running identity, and readiness.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fclient%23rendered-household-data::src%2Fclient%23react-rendering::src%2Fclient::ATTACK-CLASSES.md%23Injection",
    "canonical_refs": {
      "surface": "src/client#rendered-household-data",
      "boundary": "src/client#react-rendering",
      "subsystem": "src/client",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": "Browser rendering and storage",
    "boundary": "src/client#react-rendering",
    "subsystem": "src/client",
    "attack_class": "ATTACK-CLASSES.md#Injection",
    "starting_paths": [
      "src/client/App.tsx"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#DOM and object-state attack classes",
      "CLIENT-SIDE.md#Service-worker and browser-storage attack classes",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_client",
    "reviewed_paths": [
      "src/client/App.tsx",
      "src/client/Assistants.tsx",
      "src/client/CookieStorage.tsx",
      "src/client/Costs.tsx",
      "src/client/HouseholdErasure.tsx",
      "src/client/HouseholdImport.tsx",
      "src/client/MapHistory.tsx",
      "src/client/ObjectDialog.tsx",
      "src/client/SpatialObjectGlyph.tsx",
      "src/client/browser-binding.ts",
      "src/client/login-offer.ts",
      "src/client/session-activity.ts",
      "src/client/storage-consent.ts",
      "src/client/task-delivery.tsx",
      "src/client/use-storage-preference.ts",
      "src/server/app.ts",
      "src/server/cost-estimates.ts",
      "src/server/policy-contact-routes.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_client",
        "reviewed_paths": [
          "src/client/App.tsx",
          "src/client/Assistants.tsx",
          "src/client/Costs.tsx",
          "src/client/CookieStorage.tsx",
          "src/client/MapHistory.tsx",
          "src/client/ObjectDialog.tsx",
          "src/client/SpatialObjectGlyph.tsx",
          "src/server/app.ts",
          "src/server/cost-estimates.ts",
          "src/server/policy-contact-routes.ts"
        ],
        "invariant": "Browser and household data must not reach an executable DOM or navigation sink.",
        "method": "source",
        "result": "Values render through React escaping; variable URL components are encoded, policy email is validated, and the server sets script CSP.",
        "artifact": null
      },
      {
        "agent_id": "hunter_client",
        "reviewed_paths": [
          "src/client/App.tsx",
          "src/client/HouseholdErasure.tsx",
          "src/client/HouseholdImport.tsx",
          "src/client/browser-binding.ts",
          "src/client/login-offer.ts",
          "src/client/storage-consent.ts",
          "src/client/use-storage-preference.ts"
        ],
        "invariant": "Browser storage must not grant authority or carry household data between accounts.",
        "method": "source",
        "result": "Persistent storage contains consent and login preferences; server state validates session references and account state resets on user change.",
        "artifact": null
      },
      {
        "agent_id": "hunter_client",
        "reviewed_paths": [
          "src/client/App.tsx",
          "src/client/browser-binding.ts",
          "src/client/session-activity.ts",
          "src/client/task-delivery.tsx",
          "src/client/use-storage-preference.ts"
        ],
        "invariant": "Cross-tab and delivery messages must not execute data or transfer authority.",
        "method": "source",
        "result": "Broadcast messages cause authenticated refreshes; delivery text renders as React text and account changes clear connections.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fadministration-routes.ts%23membership::src%2Fserver%2Fadministration.ts%23requireAdministrator::src%2Fserver%2Fadministration::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/administration-routes.ts#membership",
      "boundary": "src/server/administration.ts#requireAdministrator",
      "subsystem": "src/server/administration",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Invitation and role authority",
    "boundary": "src/server/administration.ts#requireAdministrator",
    "subsystem": "src/server/administration",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/administration.ts"
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_map",
    "reviewed_paths": [
      "src/server/administration-routes.ts",
      "src/server/administration.ts",
      "src/server/households.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_map",
        "reviewed_paths": [
          "src/server/administration-routes.ts",
          "src/server/administration.ts",
          "src/server/households.ts"
        ],
        "invariant": "Only a current administrator may manage roles and invitations, with acceptance bound to the named user.",
        "method": "source",
        "result": "Routes use authenticated sessions and Origin; domain operations recheck role in a transaction; invitations bind hash, user, status, and expiry.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fapp.ts%23public-routes::src%2Fserver%2Fapp.ts%23public-response-policy::src%2Fserver::ATTACK-CLASSES.md%23Obvious%20things",
    "canonical_refs": {
      "surface": "src/server/app.ts#public-routes",
      "boundary": "src/server/app.ts#public-response-policy",
      "subsystem": "src/server",
      "attack_class": "ATTACK-CLASSES.md#Obvious things"
    },
    "surface": "HTTP framing and cache",
    "boundary": "src/server/app.ts#public-response-policy",
    "subsystem": "src/server",
    "attack_class": "ATTACK-CLASSES.md#Obvious things",
    "starting_paths": [
      "src/server/app.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Obvious things",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_auth",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/index.ts",
      "compose.yaml",
      ".gitignore"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_auth",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/index.ts",
          "compose.yaml",
          ".gitignore"
        ],
        "invariant": "Public routes, errors, headers, and cache policy must not expose private state.",
        "method": "source",
        "result": "Health returns availability only; API responses are no-store, errors omit stacks, headers apply globally, and Compose publishes to loopback.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fapp.ts%23rate-limits::src%2Fserver%2Fapp.ts%23resource-limits::src%2Fserver::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/app.ts#rate-limits",
      "boundary": "src/server/app.ts#resource-limits",
      "subsystem": "src/server",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Unauthenticated work and shared availability",
    "boundary": "src/server/app.ts#resource-limits",
    "subsystem": "src/server",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/app.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_transport",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/auth.ts",
      "src/server/client-address.ts",
      "src/server/index.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_transport",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/auth.ts",
          "src/server/client-address.ts",
          "src/server/index.ts"
        ],
        "invariant": "Unauthenticated requests must not cause disproportionate shared work before input and authentication controls.",
        "method": "source",
        "result": "Node applies the address boundary before Hono; route-specific body limits apply, and health/version use bounded readiness queries.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fassistant-routes.ts%23mcp::src%2Fserver%2Fassistant-routes.ts%23token-tool-scope::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/assistant-routes.ts#mcp",
      "boundary": "src/server/assistant-routes.ts#token-tool-scope",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "MCP OAuth and tool authority",
    "boundary": "src/server/assistant-routes.ts#token-tool-scope",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/assistant-routes.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#MCP and sub-agent trust classes",
      "AI-AND-LLM.md#Tool and action attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_ai",
    "reviewed_paths": [
      "src/server/assistant-routes.ts",
      "src/server/assistant-auth.ts",
      "src/server/assistant-work.ts",
      "src/server/households.ts",
      "src/server/map.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_ai",
        "reviewed_paths": [
          "src/server/assistant-routes.ts",
          "src/server/assistant-auth.ts",
          "src/server/assistant-work.ts",
          "src/server/households.ts",
          "src/server/map.ts"
        ],
        "invariant": "MCP tools use token-bound user, client, household grant, current membership, and write scope.",
        "method": "source",
        "result": "The route verifies issuer, audience, read scope, grant, user, client, and membership; write tools require write scope and map operations recheck access.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fauth.ts%23oauth-callback::src%2Fserver%2Fauth.ts%23identity-linking::src%2Fserver%2Fauth::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/auth.ts#oauth-callback",
      "boundary": "src/server/auth.ts#identity-linking",
      "subsystem": "src/server/auth",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Federated sign-in and account linking",
    "boundary": "src/server/auth.ts#identity-linking",
    "subsystem": "src/server/auth",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/auth.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_auth",
    "reviewed_paths": [
      "src/server/auth.ts",
      "src/server/login-methods.ts",
      "src/server/auth-callback-transaction.ts",
      "src/server/browser-binding.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_auth",
        "reviewed_paths": [
          "src/server/auth.ts",
          "src/server/login-methods.ts",
          "src/server/auth-callback-transaction.ts",
          "src/server/browser-binding.ts"
        ],
        "invariant": "Account linking binds provider subject, initiating session, OAuth state, and browser binding.",
        "method": "source",
        "result": "Provider-subject identities prevent implicit linking; explicit linking and callback publication recheck state, provider, session, expiry, and binding revision.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fbrowser-binding.ts%23session-routes::src%2Fserver%2Fbrowser-binding.ts%23bound-session::src%2Fserver%2Fauth::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/browser-binding.ts#session-routes",
      "boundary": "src/server/browser-binding.ts#bound-session",
      "subsystem": "src/server/auth",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Browser session and binding",
    "boundary": "src/server/browser-binding.ts#bound-session",
    "subsystem": "src/server/auth",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/browser-binding.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_auth",
    "reviewed_paths": [
      "src/server/browser-binding.ts",
      "src/server/app.ts",
      "src/server/login-methods.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_auth",
        "reviewed_paths": [
          "src/server/browser-binding.ts",
          "src/server/app.ts",
          "src/server/login-methods.ts"
        ],
        "invariant": "Application access requires a matching confirmed unexpired browser binding.",
        "method": "source",
        "result": "Session lookup checks token, deadline, and binding; Origin and host checks guard mutations, with transactional replacement and revocation.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fconfig.ts%23runtime-config::src%2Fserver%2Fclient-address.ts%23proxy-trust::deployment::ATTACK-CLASSES.md%23Cryptography%20and%20secrets",
    "canonical_refs": {
      "surface": "src/server/config.ts#runtime-config",
      "boundary": "src/server/client-address.ts#proxy-trust",
      "subsystem": "deployment",
      "attack_class": "ATTACK-CLASSES.md#Cryptography and secrets"
    },
    "surface": "Origin, proxy, and secrets configuration",
    "boundary": "src/server/client-address.ts#proxy-trust",
    "subsystem": "deployment",
    "attack_class": "ATTACK-CLASSES.md#Cryptography and secrets",
    "starting_paths": [
      "src/server/config.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Cryptography and secrets",
    "selected_companion_blocks": [
      "CLOUD-AND-DEPLOYMENT.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Ingress, network, and control-plane attack classes",
      "CLOUD-AND-DEPLOYMENT.md#Configuration and secret lifecycle attack classes",
      "CLOUD-AND-DEPLOYMENT.md#Universal moves",
      "CLOUD-AND-DEPLOYMENT.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_auth",
    "reviewed_paths": [
      "src/server/config.ts",
      "src/server/client-address.ts",
      "src/server/index.ts",
      "compose.yaml",
      "Dockerfile",
      "docs/operations/installation.md",
      "docs/operations/render.md",
      ".env.example"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_auth",
        "reviewed_paths": [
          "src/server/config.ts",
          "src/server/client-address.ts",
          "src/server/index.ts",
          "compose.yaml",
          "Dockerfile",
          "docs/operations/installation.md",
          "docs/operations/render.md",
          ".env.example"
        ],
        "invariant": "Configuration rejects missing secrets and origin; proxy address trust is bound to the socket peer or protected ingress.",
        "method": "source",
        "result": "Auth secret and canonical origin are required; production client-address mode is explicit, internal headers are stripped, and missing addresses fail authentication routes closed.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fcontent-owner-routes.ts%23owner::src%2Fserver%2Fmap.ts%23content-maintenance::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/content-owner-routes.ts#owner",
      "boundary": "src/server/map.ts#content-maintenance",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Content owner maintenance",
    "boundary": "src/server/map.ts#content-maintenance",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/content-owner-routes.ts"
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_map",
    "reviewed_paths": [
      "src/server/content-owner-routes.ts",
      "src/server/content-owners.ts",
      "src/server/households.ts",
      "src/server/content-identities.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_map",
        "reviewed_paths": [
          "src/server/content-owner-routes.ts",
          "src/server/content-owners.ts",
          "src/server/households.ts",
          "src/server/content-identities.ts"
        ],
        "invariant": "Private-content recovery reassignment requires current administrator authority and a verified current member.",
        "method": "source",
        "result": "The transaction checks role, content version, household identity, and target membership; ordinary access resolves the actor's bound content identity.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fcost-routes.ts%23costs::src%2Fserver%2Fcosts.ts%23operator-budget::src%2Fserver%2Fcosts::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/cost-routes.ts#costs",
      "boundary": "src/server/costs.ts#operator-budget",
      "subsystem": "src/server/costs",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Provider cost and operator authority",
    "boundary": "src/server/costs.ts#operator-budget",
    "subsystem": "src/server/costs",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/cost-routes.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_transport",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/cost-routes.ts",
      "src/server/costs.ts",
      "src/server/households.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_transport",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/cost-routes.ts",
          "src/server/costs.ts",
          "src/server/households.ts"
        ],
        "invariant": "Only the installation operator may read or change provider cost assumptions.",
        "method": "source",
        "result": "Both routes require a bound session and configured operator identity; changes require Origin, strict bounded schema, and transactional version.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fhousehold-erasure-routes.ts%23erasure::src%2Fserver%2Fhousehold-erasure.ts%23execute::src%2Fserver%2Ferasure::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/household-erasure-routes.ts#erasure",
      "boundary": "src/server/household-erasure.ts#execute",
      "subsystem": "src/server/erasure",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Erasure approval and recovery",
    "boundary": "src/server/household-erasure.ts#execute",
    "subsystem": "src/server/erasure",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/household-erasure.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_import",
    "reviewed_paths": [
      "src/server/household-erasure-routes.ts",
      "src/server/household-erasure.ts",
      "src/server/erasure-content.ts",
      "src/server/erasure-projection.ts",
      "src/server/erase-household-content.ts",
      "src/server/content-maintenance.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_import",
        "reviewed_paths": [
          "src/server/household-erasure-routes.ts",
          "src/server/household-erasure.ts",
          "src/server/erasure-content.ts",
          "src/server/erasure-projection.ts",
          "src/server/erase-household-content.ts",
          "src/server/content-maintenance.ts"
        ],
        "invariant": "Erasure requires a current administrator and a review bound to the destination state.",
        "method": "source",
        "result": "The route checks session, role, Origin, phrase, operation ID, and token; execution recomputes review inside the maintenance transaction.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fhousehold-export-routes.ts%23export::src%2Fserver%2Fhousehold-export.ts%23administrator-export::src%2Fserver%2Fexport::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/household-export-routes.ts#export",
      "boundary": "src/server/household-export.ts#administrator-export",
      "subsystem": "src/server/export",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Full household export disclosure",
    "boundary": "src/server/household-export.ts#administrator-export",
    "subsystem": "src/server/export",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/household-export.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_import",
    "reviewed_paths": [
      "src/server/household-export-routes.ts",
      "src/server/household-export.ts",
      "src/server/administration-routes.ts",
      "src/server/administration.ts",
      "docs/operations/recovery.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_import",
        "reviewed_paths": [
          "src/server/household-export-routes.ts",
          "src/server/household-export.ts",
          "src/server/administration-routes.ts",
          "src/server/administration.ts",
          "docs/operations/recovery.md"
        ],
        "invariant": "Full export stays limited to current administrators and requesting actor through download and revocation.",
        "method": "source",
        "result": "Prepare, snapshot, cancel, and download check administrator role; download also checks actor, household, readiness, expiry, and generation.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fhousehold-import-routes.ts%23import::src%2Fserver%2Fhousehold-import.ts%23confirm-replacement::src%2Fserver%2Fimport::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "src/server/household-import-routes.ts#import",
      "boundary": "src/server/household-import.ts#confirm-replacement",
      "subsystem": "src/server/import",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Archive import integrity and file handling",
    "boundary": "src/server/household-import.ts#confirm-replacement",
    "subsystem": "src/server/import",
    "attack_class": "ATTACK-CLASSES.md#Resource and file handling",
    "starting_paths": [
      "src/server/household-import.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_import",
    "reviewed_paths": [
      "src/server/household-import-routes.ts",
      "src/server/household-import.ts",
      "src/server/import-archive.ts",
      "src/server/import-schema.ts",
      "src/server/import-references.ts",
      "src/server/import-replacement.ts",
      "src/server/content-maintenance.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_import",
        "reviewed_paths": [
          "src/server/household-import-routes.ts",
          "src/server/household-import.ts",
          "src/server/import-archive.ts",
          "src/server/import-schema.ts",
          "src/server/import-references.ts",
          "src/server/import-replacement.ts",
          "src/server/content-maintenance.ts"
        ],
        "invariant": "Only a current administrator may replace household content using a bounded valid archive and current review.",
        "method": "source",
        "result": "The path checks ZIP entry names, counts, bytes, hashes, JSON shape, references, collisions, image metadata, and destination fingerprint before transactional replacement.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23history::src%2Fserver%2Fmap.ts%23history-undo::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#history",
      "boundary": "src/server/map.ts#history-undo",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "History and undo authority",
    "boundary": "src/server/map.ts#history-undo",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/map.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_map",
    "reviewed_paths": [
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/map-operations.ts",
      "src/server/households.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_map",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/map-operations.ts",
          "src/server/households.ts"
        ],
        "invariant": "History reads and save replay remain within current membership, draft version, and operation state.",
        "method": "source",
        "result": "Household-filtered history and save paths recheck current authority, content generation, draft version and hash, and committed operation status.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23map-work::src%2Fserver%2Fmap.ts%23householdMap::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#map-work",
      "boundary": "src/server/map.ts#householdMap",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Household map draft and save isolation",
    "boundary": "src/server/map.ts#householdMap",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/map.ts"
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_map",
    "reviewed_paths": [
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/households.ts",
      "src/server/content-identities.ts",
      "src/server/map-tombstones.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_map",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/households.ts",
          "src/server/content-identities.ts",
          "src/server/map-tombstones.ts"
        ],
        "invariant": "Map methods require membership, private drafts bind to the actor, and saved IDs cannot cross households or reuse tombstones.",
        "method": "source",
        "result": "The domain transaction repeats membership and content binding; draft and shared queries include the household and appropriate actor scope.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Fprofile-image-routes.ts%23upload::src%2Fserver%2Fprofile-images.ts%23decode::src%2Fserver%2Fimages::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "src/server/profile-image-routes.ts#upload",
      "boundary": "src/server/profile-images.ts#decode",
      "subsystem": "src/server/images",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Image parser and storage",
    "boundary": "src/server/profile-images.ts#decode",
    "subsystem": "src/server/images",
    "attack_class": "ATTACK-CLASSES.md#Resource and file handling",
    "starting_paths": [
      "src/server/profile-images.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes",
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
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_import",
    "reviewed_paths": [
      "src/server/profile-image-routes.ts",
      "src/server/profile-images.ts",
      "src/server/app.ts",
      "src/server/map.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_import",
        "reviewed_paths": [
          "src/server/profile-image-routes.ts",
          "src/server/profile-images.ts",
          "src/server/app.ts",
          "src/server/map.ts"
        ],
        "invariant": "Member image input is bounded before decode and reduced to a small output format.",
        "method": "source",
        "result": "A 10 MB body limit, 40-million-pixel decode limit, JPEG/PNG/WebP allowlist, 300-by-300 resize, and 262144-byte output cap are source visible.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "hardening": [
      "Potential functional image-read defect at src/server/profile-images.ts:57: d.userId appears outside the subquery defining d; no security outcome established."
    ]
  },
  {
    "coverage_id": "src%2Fserver%2Ftask-delivery-transport.ts%23upgrade::src%2Fserver%2Ftext-assistant.ts%23delivery-handshake::src%2Fserver%2Ftask-delivery::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/task-delivery-transport.ts#upgrade",
      "boundary": "src/server/text-assistant.ts#delivery-handshake",
      "subsystem": "src/server/task-delivery",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "WebSocket upgrade and acknowledgment",
    "boundary": "src/server/text-assistant.ts#delivery-handshake",
    "subsystem": "src/server/task-delivery",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/task-delivery-transport.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline",
      "PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_transport",
    "reviewed_paths": [
      "src/server/index.ts",
      "src/server/task-delivery-transport.ts",
      "src/server/task-delivery.ts",
      "src/server/text-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_transport",
        "reviewed_paths": [
          "src/server/index.ts",
          "src/server/task-delivery-transport.ts",
          "src/server/task-delivery.ts",
          "src/server/text-assistant.ts"
        ],
        "invariant": "Delivery sockets and acknowledgments bind to browser session, household, conversation, and task.",
        "method": "source",
        "result": "Handshake rechecks Origin, session, household, binding, and access; acknowledgments apply only to the socket's task and compare state, text, guard, and deadline.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  },
  {
    "coverage_id": "src%2Fserver%2Ftext-assistant.ts%23text-message::src%2Fserver%2Ftext-assistant.ts%23model-tool-execution::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "src/server/text-assistant.ts#text-message",
      "boundary": "src/server/text-assistant.ts#model-tool-execution",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Model context and human action binding",
    "boundary": "src/server/text-assistant.ts#model-tool-execution",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "src/server/text-assistant.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Context, retrieval, and memory attack classes",
      "AI-AND-LLM.md#Tool and action attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "hunter_ai",
    "reviewed_paths": [
      "src/server/text-assistant.ts",
      "src/server/text-assistant-mcp.ts",
      "src/server/assistant-routes.ts",
      "src/server/assistant-work.ts",
      "src/server/map.ts",
      "src/server/map-routes.ts",
      "src/server/text-assistant-model.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_ai",
        "reviewed_paths": [
          "src/server/text-assistant.ts",
          "src/server/text-assistant-mcp.ts",
          "src/server/assistant-routes.ts",
          "src/server/assistant-work.ts",
          "src/server/map.ts",
          "src/server/map-routes.ts",
          "src/server/text-assistant-model.ts"
        ],
        "invariant": "Another member's shared text must not authorize an unrequested mutation of the consuming member's private draft.",
        "method": "source",
        "result": "Shared map values can enter model context; proposal dispatch checks schema, grant, membership and versions but no deterministic request-to-proposal binding. A separate save-intent gate limits this lead to draft changes.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "text-assistant/shared-map-to-private-draft-action-binding"
    ],
    "unresolved": [
      "Whether saved map text can induce an unrequested model proposal affecting another member's private draft.",
      "The required local execution sandbox and artifact promotion were not verified."
    ]
  },
  {
    "coverage_id": "src%2Fserver%2Fvoice-assistant.ts%23voice-session::src%2Fserver%2Fvoice-assistant.ts%23provider-sideband::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/voice-assistant.ts#voice-session",
      "boundary": "src/server/voice-assistant.ts#provider-sideband",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Voice session and provider boundary",
    "boundary": "src/server/voice-assistant.ts#provider-sideband",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/voice-assistant.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Output and disclosure attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunter_ai",
    "reviewed_paths": [
      "src/server/voice-assistant.ts",
      "src/server/voice-work.ts",
      "src/server/text-assistant.ts",
      "src/server/app.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_ai",
        "reviewed_paths": [
          "src/server/voice-assistant.ts",
          "src/server/voice-work.ts",
          "src/server/text-assistant.ts",
          "src/server/app.ts"
        ],
        "invariant": "Voice sessions bind to authenticated browser conversation and historical speech cannot become a fresh action.",
        "method": "source",
        "result": "Voice creation rechecks access across provider awaits; server-retained history replaces client history and only fresh user transcript fragments enter the pending action queue.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": []
  }
]

## Current candidate fingerprints and prior coverage

Candidate: text-assistant/shared-map-to-private-draft-action-binding. No compatible prior ledger exists.

## Critic contract and workflow (verbatim)

## Coverage-critic waves

Immediately after each hunter wave, spend the reserved invocation on one fresh `research` post-wave coverage critic. It receives `architecture.md`, the full coverage ledger including each assignment block map, current candidate fingerprints and states, and the prior-ledger gap summary. It reads source but does not write or run targets. Require exactly this JSON:

```json
{
  "missing_units": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "selected_companion_blocks": ["FILE.md#section"],
      "excluded_blocks": [{"block": "FILE.md#section", "reason": "..."}],
      "reason": "source-backed coverage gap"
    }
  ],
  "reassign_ids": ["existing-id-that-did-not-close"],
  "resolved_prior_leads": ["fingerprint"],
  "stop": false
}
```

The critic checks for unmapped entry points, unchecked parallel paths, missing lifecycle modes, selected companion classes without a unit, unjustified exclusions, units closed without paths/checks, and prior `needs_validation` or changed-source gaps that no unit addresses. It proposes coverage, not findings. `stop` is the critic's own assessment: `true` only when it accepts no `missing_units` and no `reassign_ids`; the parent's loop condition below, not `stop` alone, decides whether another wave runs. For each fingerprint in `resolved_prior_leads`, the parent marks the linked unit or prior-lead entry resolved and records the critic's source-backed reason.

The parent rejects proposed units outside the review scope or source/local boundary, derives canonical IDs for accepted units, and deduplicates them against current units. A prior same-source completed unit may supply evidence; prior `deferred`, `blocked`, `out_of_scope`, or changed-source units become current work and never suppress an accepted unit. Fail rather than merge a canonical ID collision. For each legitimate `reassign_id` with live `blocked`, `covered`, or `candidate` evidence, append that exact terminal record to the unit's `attempts` with the critic's source-backed `reassignment_reason`. Preserve its owner, checks, artifacts, fingerprints, and unresolved facts in that archive. Increment the live `wave`; the next hunter must be a fresh owner and receives an `in_progress` unit with empty live evidence. The hunter's terminal result writes only its new evidence into the live fields. Never copy an archived owner's checks or artifacts into the new live attempt. Sort IDs and validate the ledger before another assignment. In `standard` and `deep`, when the post-wave critic reports no accepted `missing_units` or legitimate `reassign_ids` and no `planned` units remain, spend the separately reserved invocation on a distinct final-clean critic. Complete coverage only when that critic also returns no accepted work. If it finds work, queue it and repeat the wave, post-wave critic, and final-clean process. If time or resources force an early stop, mark every untouched unit `deferred`, preserve the critic's reason, and disclose the gap in the report. Never use a silent wave or agent cap as evidence of complete coverage.

The run profile bounds this loop. A `quick` run has exactly one hunter wave followed by exactly one final critic pass. Add each accepted `missing_unit` to the current ledger and mark it `deferred` with reason `quick_profile_final_critic`. For each legitimate evidence-bearing `reassign_id`, archive the live terminal state in `attempts`, increment `wave`, and set the live state to unassigned `deferred` with empty evidence and reason `quick_profile_final_critic`. Do not launch a second hunter wave or another critic. In a scoped run, the critic still reports out-of-scope gaps it notices, but the parent records them as `out_of_scope` with the critic's reason instead of assigning them. The early-stop rule above is the same mechanism: `quick` is a pre-declared early stop, not evidence of complete coverage.

A budget bounds it the same way. Before assigning each wave, compare remaining budget against its hunter count, the validation reserve, the immediate post-wave critic, and the retained final-clean critic (`quick` reserves only its single final post-wave critic). Shrink the hunter wave to fit, taking units in priority order. If those mandatory reserves do not fit, launch no hunter from that wave and mark its planned units `deferred` with reason `budget_cannot_reserve_critics_and_validation`. Critic-proposed units enter the same ranked queue rather than extending the budget. If surviving candidates exceed the validation reserve, follow the incomplete-run rule in `SKILL.md`: stop hunting, validate in fingerprint order, retain unvalidated units as unresolved candidates, and never present them as findings.


Explicitly inspect unmapped entry points, parallel paths, lifecycle states, selected companion classes, exclusions, checks and reviewed paths, and source paths not represented by the 20 units. Keep your returned missing_units source-backed with exact starting paths. A source-only check is sufficient to assess coverage. Do not duplicate a unit merely by renaming it.
