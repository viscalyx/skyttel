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
    "coverage_id": ".github%2Fworkflows%2Fimage-monitor.yml%23schedule::scripts%2Fsecurity%2Fmonitor-images.mjs%23production-monitor::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": ".github/workflows/image-monitor.yml#schedule",
      "boundary": "scripts/security/monitor-images.mjs#production-monitor",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Production image monitoring authority",
    "boundary": "scripts/security/monitor-images.mjs#production-monitor",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      ".github/workflows/image-monitor.yml",
      "scripts/security/monitor-images.mjs",
      "scripts/security/container-policy.mjs"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules",
      "CLOUD-AND-DEPLOYMENT.md#Core discipline"
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
    "status": "covered",
    "agent_id": "hunter_ci",
    "reviewed_paths": [
      ".github/workflows/image-monitor.yml",
      ".github/workflows/release.yml",
      "scripts/security/monitor-images.mjs",
      "scripts/security/container-policy.mjs",
      "scripts/release/deploy.mjs",
      "docs/operations/security-monitoring.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_ci",
        "reviewed_paths": [
          ".github/workflows/image-monitor.yml",
          ".github/workflows/release.yml",
          "scripts/security/monitor-images.mjs",
          "scripts/security/container-policy.mjs",
          "scripts/release/deploy.mjs",
          "docs/operations/security-monitoring.md"
        ],
        "invariant": "Only current live and accepted rollback images may receive a passing scan status.",
        "method": "source",
        "result": "The monitor checks Render digest against accepted deployment, scans selected digests, rechecks deployment state, and treats missing evidence as unknown.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  },
  {
    "coverage_id": ".github%2Fworkflows%2Foperator-upgrade-gate.yml%23pull_request_target::scripts%2Frelease%2Foperator-upgrade-gate.mjs%23decision::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": ".github/workflows/operator-upgrade-gate.yml#pull_request_target",
      "boundary": "scripts/release/operator-upgrade-gate.mjs#decision",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Privileged pull request gates",
    "boundary": "scripts/release/operator-upgrade-gate.mjs#decision",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      ".github/workflows/operator-upgrade-gate.yml",
      ".github/workflows/ssdlc-gate.yml",
      "scripts/release/operator-upgrade-gate.mjs",
      "scripts/security/ssdlc-gate.mjs"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
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
    "wave": 2,
    "status": "covered",
    "agent_id": "hunter_ci",
    "reviewed_paths": [
      ".github/workflows/operator-upgrade-gate.yml",
      ".github/workflows/ssdlc-gate.yml",
      "scripts/release/operator-upgrade-gate.mjs",
      "scripts/release/operator-upgrade-notes.mjs",
      "scripts/security/ssdlc-gate.mjs"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_ci",
        "reviewed_paths": [
          ".github/workflows/operator-upgrade-gate.yml",
          ".github/workflows/ssdlc-gate.yml",
          "scripts/release/operator-upgrade-gate.mjs",
          "scripts/release/operator-upgrade-notes.mjs",
          "scripts/security/ssdlc-gate.mjs"
        ],
        "invariant": "Pull request content must not become executable or a privileged command in pull_request_target gates.",
        "method": "source",
        "result": "Both gates run trusted base code and treat PR body, file metadata, and commit-addressed notes as API data; identifiers are validated before use.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  },
  {
    "coverage_id": ".github%2Fworkflows%2Frelease-acceptance.yml%23workflow_dispatch::scripts%2Frelease%2Facceptance.mjs%23acceptance-report::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": ".github/workflows/release-acceptance.yml#workflow_dispatch",
      "boundary": "scripts/release/acceptance.mjs#acceptance-report",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Manual release acceptance evidence",
    "boundary": "scripts/release/acceptance.mjs#acceptance-report",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      ".github/workflows/release-acceptance.yml",
      "scripts/release/acceptance.mjs",
      "docs/operations/container-releases.md"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
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
    "wave": 3,
    "status": "covered",
    "agent_id": "hunter_operator_evidence",
    "reviewed_paths": [
      ".github/workflows/release-acceptance.yml",
      "scripts/release/acceptance.mjs",
      "scripts/release/candidate.mjs",
      "scripts/release/github-release.mjs",
      "scripts/release/plan.mjs",
      "docs/operations/container-releases.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_operator_evidence",
        "reviewed_paths": [
          ".github/workflows/release-acceptance.yml",
          "scripts/release/acceptance.mjs",
          "scripts/release/candidate.mjs",
          "scripts/release/github-release.mjs",
          "scripts/release/plan.mjs",
          "docs/operations/container-releases.md"
        ],
        "invariant": "A passed acceptance report must preserve the verified run, release identity, signed evidence, assets, and digest.",
        "method": "source",
        "result": "The workflow runs on main with read permissions; script constrains scenario input, checks run and signed release evidence, and compares retry snapshots.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
  },
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
    "coverage_id": "scripts%2Fmodel-evaluation%2Fevaluate.ts%23report-emission::scripts%2Fmodel-evaluation%2Freport.ts%23public-artifacts::scripts%2Fmodel-evaluation::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "scripts/model-evaluation/evaluate.ts#report-emission",
      "boundary": "scripts/model-evaluation/report.ts#public-artifacts",
      "subsystem": "scripts/model-evaluation",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Model evaluation public artifact disclosure",
    "boundary": "scripts/model-evaluation/report.ts#public-artifacts",
    "subsystem": "scripts/model-evaluation",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "scripts/model-evaluation/evaluate.ts",
      "scripts/model-evaluation/report.ts",
      "scripts/model-evaluation/public-output.ts",
      "scripts/model-evaluation/private-records.ts",
      "scripts/model-evaluation/publication.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Output and disclosure attack classes",
      "AI-AND-LLM.md#Validation rules",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 7,
    "status": "covered",
    "agent_id": "hunter_model_report",
    "reviewed_paths": [
      "scripts/model-evaluation/evaluate.ts",
      "scripts/model-evaluation/report.ts",
      "scripts/model-evaluation/public-output.ts",
      "scripts/model-evaluation/private-records.ts",
      "scripts/model-evaluation/publication.ts",
      "scripts/model-evaluation/observations.ts",
      "scripts/model-evaluation/types.ts",
      "scripts/model-evaluation/live.ts",
      "src/server/live-provider.ts",
      ".agents/skills/evaluate-models/references/run-support.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_model_report",
        "reviewed_paths": [
          "scripts/model-evaluation/evaluate.ts",
          "scripts/model-evaluation/report.ts",
          "scripts/model-evaluation/public-output.ts",
          "scripts/model-evaluation/private-records.ts",
          "scripts/model-evaluation/publication.ts",
          "scripts/model-evaluation/observations.ts",
          "scripts/model-evaluation/types.ts",
          "scripts/model-evaluation/live.ts",
          "src/server/live-provider.ts",
          ".agents/skills/evaluate-models/references/run-support.md"
        ],
        "invariant": "Raw provider requests, responses, transcripts, and live session identities stay outside shareable evaluation artifacts.",
        "method": "source",
        "result": "Private records are separate mode 0600 files; publishable paths list only reports. Public diagnostics reduce calls to metadata, transform text before JSON/Markdown, and reapply transformation before publication.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 6."
  },
  {
    "coverage_id": "scripts%2Fsecurity%2Fcheck-results.mjs%23scanner-results::scripts%2Fsecurity%2Fcheck-results.mjs%23security-gate::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "scripts/security/check-results.mjs#scanner-results",
      "boundary": "scripts/security/check-results.mjs#security-gate",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Security scanner policy and exceptions",
    "boundary": "scripts/security/check-results.mjs#security-gate",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      ".github/workflows/security.yml",
      ".github/workflows/ci.yml",
      "scripts/security/check-results.mjs",
      "scripts/security/container-policy.mjs",
      ".github/security-exceptions.json"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#Dependency and build-input attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
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
    "wave": 3,
    "status": "covered",
    "agent_id": "hunter_security_gates",
    "reviewed_paths": [
      ".github/grype.yaml",
      ".github/security-exceptions.json",
      ".github/workflows/ci.yml",
      ".github/workflows/release.yml",
      ".github/workflows/security.yml",
      "scripts/security/__tests__/check-results.test.mjs",
      "scripts/security/check-results.mjs",
      "scripts/security/container-policy.mjs",
      "scripts/security/scan-running-image.sh"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_security_gates",
        "reviewed_paths": [
          "scripts/security/check-results.mjs",
          "scripts/security/container-policy.mjs",
          "scripts/security/scan-running-image.sh",
          "scripts/security/__tests__/check-results.test.mjs",
          ".github/security-exceptions.json",
          ".github/grype.yaml"
        ],
        "invariant": "Missing scanner evidence and unexcepted High or Critical image findings must block policy success.",
        "method": "source",
        "result": "The policy requires named job success, validates CodeQL and Trivy evidence, blocks High ZAP alerts, and checks image identity, database age, and exceptions for Grype. Tests inspected but not executed.",
        "artifact": null
      },
      {
        "agent_id": "hunter_security_gates",
        "reviewed_paths": [
          ".github/workflows/security.yml",
          ".github/workflows/ci.yml",
          ".github/workflows/release.yml"
        ],
        "invariant": "A failed scanner job must propagate through aggregate CI before release publication.",
        "method": "source",
        "result": "Security gates require all scanner jobs; CI requires application, devcontainer, and security jobs; release checks retained Grype and ZAP evidence.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
  },
  {
    "coverage_id": "scripts%2Fsecurity%2Frepository-settings.mjs%23settings-check::scripts%2Fsecurity%2Frepository-settings.mjs%23ruleset-verification::release::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "scripts/security/repository-settings.mjs#settings-check",
      "boundary": "scripts/security/repository-settings.mjs#ruleset-verification",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Default-branch security configuration",
    "boundary": "scripts/security/repository-settings.mjs#ruleset-verification",
    "subsystem": "release",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "scripts/security/repository-settings.mjs",
      "docs/operations/security-checks.md",
      ".github/workflows/ci.yml"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules",
      "CLOUD-AND-DEPLOYMENT.md#Workload identity and IAM attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 3,
    "status": "covered",
    "agent_id": "hunter_security_gates",
    "reviewed_paths": [
      "scripts/security/repository-settings.mjs",
      "docs/operations/security-checks.md",
      ".github/workflows/ci.yml"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_security_gates",
        "reviewed_paths": [
          "scripts/security/repository-settings.mjs",
          "docs/operations/security-checks.md",
          ".github/workflows/ci.yml"
        ],
        "invariant": "The repository-settings check must reject a default-branch ruleset lacking pull requests or current GitHub Actions CI results.",
        "method": "source",
        "result": "It checks active enforcement, bypass actors, branch coverage, pull requests, strict status checks, and required GitHub Actions job IDs. Hosted settings were not inspected.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
  },
  {
    "coverage_id": "scripts%2Fsecurity%2Fverify-installation.mjs%23operator-check::scripts%2Fsecurity%2Fverify-installation.mjs%23evidence-decision::deployment::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "scripts/security/verify-installation.mjs#operator-check",
      "boundary": "scripts/security/verify-installation.mjs#evidence-decision",
      "subsystem": "deployment",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Operator verification of deployed image security",
    "boundary": "scripts/security/verify-installation.mjs#evidence-decision",
    "subsystem": "deployment",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "scripts/security/verify-installation.mjs",
      "scripts/security/monitor-images.mjs",
      "docs/operations/security-monitoring.md"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "CLOUD-AND-DEPLOYMENT.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Ingress, network, and control-plane attack classes",
      "CLOUD-AND-DEPLOYMENT.md#Universal moves",
      "CLOUD-AND-DEPLOYMENT.md#Validation rules",
      "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 3,
    "status": "covered",
    "agent_id": "hunter_operator_evidence",
    "reviewed_paths": [
      "scripts/security/verify-installation.mjs",
      "scripts/security/monitor-images.mjs",
      "scripts/security/__tests__/verify-installation.test.mjs",
      ".github/workflows/image-monitor.yml",
      "docs/operations/security-monitoring.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_operator_evidence",
        "reviewed_paths": [
          "scripts/security/verify-installation.mjs",
          "scripts/security/monitor-images.mjs",
          "scripts/security/__tests__/verify-installation.test.mjs",
          ".github/workflows/image-monitor.yml",
          "docs/operations/security-monitoring.md"
        ],
        "invariant": "Installation verification must fail for stale, unsuccessful, substituted, or inconsistent monitoring evidence.",
        "method": "source",
        "result": "The verifier binds artifact to latest successful scheduled run, compares Render and GitHub image identity, and checks stable observations. Notification delivery remains unverified.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
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
    "status": "covered",
    "agent_id": "hunter_install",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/households.ts",
      "src/server/auth.ts",
      "src/server/config.ts",
      "migrations/001_initial.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_install",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/households.ts",
          "src/server/auth.ts",
          "src/server/config.ts",
          "migrations/001_initial.sql"
        ],
        "invariant": "Only the configured provider subject may create the first household, atomically and once.",
        "method": "source",
        "result": "The route requires session, Origin, JSON, and normalized name; an immediate transaction checks provider subject and singleton installation before inserting household and administrator membership.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
  },
  {
    "coverage_id": "src%2Fserver%2Fapp.ts%23authentication-cleanup::src%2Fserver%2Fauthentication-cleanup.ts%23startup-and-periodic-revocation::src%2Fserver%2Fauth::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "src/server/app.ts#authentication-cleanup",
      "boundary": "src/server/authentication-cleanup.ts#startup-and-periodic-revocation",
      "subsystem": "src/server/auth",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Background authentication cleanup",
    "boundary": "src/server/authentication-cleanup.ts#startup-and-periodic-revocation",
    "subsystem": "src/server/auth",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "src/server/app.ts",
      "src/server/authentication-cleanup.ts",
      "src/server/browser-binding.ts",
      "src/server/assistant-auth.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 4,
    "status": "covered",
    "agent_id": "hunter_auth_cleanup",
    "reviewed_paths": [
      "docs/operations/authentication.md",
      "src/server/app.ts",
      "src/server/assistant-auth.ts",
      "src/server/assistant-routes.ts",
      "src/server/authentication-cleanup.ts",
      "src/server/browser-binding.ts",
      "src/server/text-assistant-mcp.ts",
      "src/server/text-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_auth_cleanup",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/authentication-cleanup.ts",
          "src/server/browser-binding.ts",
          "src/server/text-assistant.ts",
          "docs/operations/authentication.md"
        ],
        "invariant": "Expired sessions and bindings must stop authorizing requests and work, while finite tasks retain only their stop link until deadline.",
        "method": "source",
        "result": "Cleanup removes expired bindings unless a private task has a future deadline; session and text-work guards independently recheck session, binding, task, and membership.",
        "artifact": null
      },
      {
        "agent_id": "hunter_auth_cleanup",
        "reviewed_paths": [
          "src/server/authentication-cleanup.ts",
          "src/server/assistant-auth.ts",
          "src/server/assistant-routes.ts",
          "src/server/text-assistant-mcp.ts"
        ],
        "invariant": "Previous-process private grants and expired tasks must lose tokens and connection while external grants stay scoped.",
        "method": "source",
        "result": "Startup transactionally removes private connections, tokens, and consent before requests; periodic cleanup sweeps expired and orphaned records. MCP requires a positive connection and membership.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 3."
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
    "coverage_id": "src%2Fserver%2Fassistant-routes.ts%23oauth-consent::src%2Fserver%2Fassistant-auth.ts%23consentReferenceId::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/assistant-routes.ts#oauth-consent",
      "boundary": "src/server/assistant-auth.ts#consentReferenceId",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "OAuth client registration and assistant consent",
    "boundary": "src/server/assistant-auth.ts#consentReferenceId",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/app.ts",
      "src/server/assistant-auth.ts",
      "src/server/assistant-routes.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules",
      "AI-AND-LLM.md#MCP and sub-agent trust classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 3,
    "status": "blocked",
    "agent_id": "hunter_oauth",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/assistant-auth.ts",
      "src/server/assistant-routes.ts",
      "src/server/auth.ts",
      "src/server/browser-binding.ts",
      "src/server/households.ts",
      "tests/unit/server/assistants.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_oauth",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/auth.ts",
          "src/server/browser-binding.ts"
        ],
        "invariant": "OAuth authorization and consent must use a browser-bound session.",
        "method": "source",
        "result": "Authorization removes the cookie if browser binding rejects it; handlers receive session lookup that requires a confirmed binding.",
        "artifact": null
      },
      {
        "agent_id": "hunter_oauth",
        "reviewed_paths": [
          "src/server/assistant-auth.ts",
          "src/server/assistant-routes.ts",
          "src/server/households.ts",
          "tests/unit/server/assistants.test.ts"
        ],
        "invariant": "Assistant grant must bind user, household, client, scope, and later MCP use to the same consent.",
        "method": "source",
        "result": "Consent checks session, Origin, approvals, membership, and enabled client; grant ID reaches provider through AsyncLocalStorage. Token and MCP claims match grant, user, client, issuer, audience, read scope, and current membership. Installed provider internals were unavailable.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "The installed @better-auth/oauth-provider package is absent locally, so signed oauth_query, duplicate parameters, consent scope, and code binding internals were not inspected.",
      "The required sandbox and artifact promotion controls were not verified, so existing tests were not executed."
    ],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
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
    "status": "covered",
    "agent_id": "hunter_consent_spend",
    "reviewed_paths": [
      "docs/operations/installation.md",
      "docs/operations/render.md",
      "src/server/conversation-consent-routes.ts",
      "src/server/conversation-consent.ts",
      "src/server/text-assistant-mcp.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_consent_spend",
        "reviewed_paths": [
          "src/server/conversation-consent-routes.ts",
          "src/server/conversation-consent.ts",
          "src/server/text-assistant.ts",
          "src/server/text-assistant-mcp.ts",
          "src/server/voice-assistant.ts"
        ],
        "invariant": "Consent revocation must end active conversations and invalidate existing grants.",
        "method": "source",
        "result": "Revoke deletes consent and connections, ends matching in-process conversations, and message and voice guards recheck surviving connection state.",
        "artifact": null
      },
      {
        "agent_id": "hunter_consent_spend",
        "reviewed_paths": [
          "docs/operations/installation.md",
          "docs/operations/render.md"
        ],
        "invariant": "A cross-process revocation claim must apply to a supported deployment.",
        "method": "source",
        "result": "The documented installation has one Node application on local SQLite, and Render requires one instance without autoscaling.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
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
    "coverage_id": "src%2Fserver%2Fdatabase.ts%23startup-migration::src%2Fserver%2Fdatabase.ts%23migrate-and-preview-content-reset::src%2Fserver%2Finstallation::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/database.ts#startup-migration",
      "boundary": "src/server/database.ts#migrate-and-preview-content-reset",
      "subsystem": "src/server/installation",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Startup database migration and preview reset",
    "boundary": "src/server/database.ts#migrate-and-preview-content-reset",
    "subsystem": "src/server/installation",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/database.ts",
      "src/server/index.ts",
      "docs/operations/operator-upgrade-notes.md"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The path uses the server and SQLite, not native app IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 9,
    "status": "covered",
    "agent_id": "hunter_startup_migration",
    "reviewed_paths": [
      "docs/operations/operator-upgrade-notes.md",
      "migrations/015_content_maintenance.sql",
      "migrations/034_map_backgrounds.sql",
      "src/server/auth.ts",
      "src/server/database.ts",
      "src/server/index.ts",
      "src/server/installation-authority.ts",
      "tests/unit/server/preview-content-reset.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_startup_migration",
        "reviewed_paths": [
          "src/server/database.ts",
          "src/server/installation-authority.ts",
          "tests/unit/server/preview-content-reset.test.ts"
        ],
        "invariant": "Legacy preview reset requires exact eligible history, schema, keys, and authority.",
        "method": "source",
        "result": "Verification requires matching 33 or 34 migrations, reconstructed schema, generation, and foreign keys; writer rechecks under immediate transaction. Source tests inspected only.",
        "artifact": null
      },
      {
        "agent_id": "hunter_startup_migration",
        "reviewed_paths": [
          "src/server/database.ts",
          "migrations/015_content_maintenance.sql",
          "migrations/034_map_backgrounds.sql",
          "docs/operations/operator-upgrade-notes.md",
          "tests/unit/server/preview-content-reset.test.ts"
        ],
        "invariant": "Reset removes specified content atomically, retains intended settings, and cannot partially migrate.",
        "method": "source",
        "result": "Reset retires operations and advances generation; migrations, FK check, and format marker share transaction. Failure rolls back; marker prevents repeat.",
        "artifact": null
      },
      {
        "agent_id": "hunter_startup_migration",
        "reviewed_paths": [
          "src/server/index.ts",
          "src/server/auth.ts",
          "src/server/database.ts"
        ],
        "invariant": "Listener cannot serve before migration and authority preparation succeed.",
        "method": "source",
        "result": "index migrates before constructing auth or app and only starts listener after auth schema verification; startup failure exits.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 8."
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
    "status": "candidate",
    "agent_id": "hunter_install",
    "reviewed_paths": [
      "src/server/database.ts",
      "src/server/index.ts",
      "src/server/auth.ts",
      "src/server/config.ts",
      "src/server/installation-authority.ts",
      "src/server/legacy-login-upgrade.ts",
      "src/server/administration.ts",
      "src/server/administration-routes.ts",
      "src/server/households.ts",
      "src/server/map.ts",
      "migrations/001_initial.sql",
      "migrations/032_installation_authority.sql",
      "docs/operations/database-restore.md",
      "docs/operations/installation.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_install",
        "reviewed_paths": [
          "src/server/database.ts",
          "src/server/index.ts",
          "src/server/auth.ts",
          "src/server/config.ts",
          "src/server/installation-authority.ts",
          "src/server/legacy-login-upgrade.ts",
          "src/server/administration.ts",
          "src/server/administration-routes.ts",
          "src/server/households.ts",
          "src/server/map.ts",
          "migrations/001_initial.sql",
          "migrations/032_installation_authority.sql",
          "docs/operations/database-restore.md",
          "docs/operations/installation.md"
        ],
        "invariant": "A controlled database restore must not reinstate authority revoked after the backup.",
        "method": "source",
        "result": "Restore rotates sessions, tokens, bindings, and assistant connections but retains restored membership and account links; whether later revocations are reconciled before ingress is not source-established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "installation.restore.reinstates-revoked-membership"
    ],
    "unresolved": [
      "The required sandbox was unavailable for a dummy restore access check.",
      "Operator reconciliation of post-backup role and membership changes is not established by the repository."
    ],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1."
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
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23conversation-preferences-and-theme-preference::src%2Fserver%2Fconversation-preferences.ts%23per-user-settings::src%2Fserver%2Fpreferences::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#conversation-preferences-and-theme-preference",
      "boundary": "src/server/conversation-preferences.ts#per-user-settings",
      "subsystem": "src/server/preferences",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Member conversation and theme preferences",
    "boundary": "src/server/conversation-preferences.ts#per-user-settings",
    "subsystem": "src/server/preferences",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/map-routes.ts",
      "src/server/conversation-preferences.ts",
      "src/server/theme-preference-routes.ts",
      "src/server/app.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 4,
    "status": "covered",
    "agent_id": "hunter_settings",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/map-routes.ts",
      "src/server/conversation-preferences.ts",
      "src/server/theme-preference-routes.ts",
      "src/server/browser-binding.ts",
      "migrations/023_conversation_preferences.sql",
      "migrations/026_theme_preferences.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_settings",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/map-routes.ts",
          "src/server/conversation-preferences.ts",
          "src/server/theme-preference-routes.ts",
          "src/server/browser-binding.ts",
          "migrations/023_conversation_preferences.sql",
          "migrations/026_theme_preferences.sql"
        ],
        "invariant": "A member may read or change only their own preferences; removed members cannot use household conversation settings.",
        "method": "source",
        "result": "Browser-bound session supplies user ID; map preferences also require household access. Both POST routes check Origin; SQL binds user ID and schemas reject owner fields.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 3."
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23history-volume::src%2Fserver%2Fmap.ts%23persistent-history-and-unbounded-read::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#history-volume",
      "boundary": "src/server/map.ts#persistent-history-and-unbounded-read",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Map save history and receipt accumulation",
    "boundary": "src/server/map.ts#persistent-history-and-unbounded-read",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Resource and file handling",
    "starting_paths": [
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "migrations/004_map.sql"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The path uses the server and SQLite, not native app IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 9,
    "status": "candidate",
    "agent_id": "hunter_history_volume",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/map-operations.ts",
      "migrations/004_map.sql",
      "migrations/006_save_operations.sql"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_history_volume",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/map-operations.ts",
          "migrations/004_map.sql",
          "migrations/006_save_operations.sql"
        ],
        "invariant": "Ordinary map reads should have bounded server work as saved history grows.",
        "method": "source",
        "result": "Saves append receipts without aggregate retention. With a deleted object, ordinary map read loads and parses every receipt; conflicts add a second pass. Shared-process effect unmeasured.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "map-read.full-history-materialization"
    ],
    "unresolved": [
      "A bounded dummy-database growth check cannot run without the required sandbox and promotion controls.",
      "Actual receipt volume, concurrency, memory, and ingress limits are outside source."
    ],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 8."
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
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23object-type-and-relationship-type-deletion::src%2Fserver%2Fdefinition-usage.ts%23otherDrafts::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#object-type-and-relationship-type-deletion",
      "boundary": "src/server/definition-usage.ts#otherDrafts",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Cross-member type deletion usage check",
    "boundary": "src/server/definition-usage.ts#otherDrafts",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/map-routes.ts",
      "src/server/object-types.ts",
      "src/server/relationship-types.ts",
      "src/server/definition-usage.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The path uses HTTP and SQLite without native IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 10,
    "status": "candidate",
    "agent_id": "hunter_definition_usage",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/content-identities.ts",
      "src/server/definition-usage.ts",
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/object-types.ts",
      "src/server/relationship-types.ts",
      "tests/integration/definition-removal.spec.ts",
      "tests/unit/server/definition-removal.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_definition_usage",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/content-identities.ts"
        ],
        "invariant": "A member can submit a type-removal proposal only for their household and own private draft.",
        "method": "source",
        "result": "The route obtains the actor from the session; householdMap checks current membership, resolves the actor's content identity, and reads and writes the actor's draft under an immediate transaction.",
        "artifact": null
      },
      {
        "agent_id": "hunter_definition_usage",
        "reviewed_paths": [
          "src/server/definition-usage.ts",
          "src/server/object-types.ts",
          "src/server/relationship-types.ts",
          "src/server/app.ts",
          "tests/unit/server/definition-removal.test.ts",
          "tests/integration/definition-removal.spec.ts"
        ],
        "invariant": "A member's deletion response should not disclose another member's private draft state beyond the product's intended privacy policy.",
        "method": "source",
        "result": "For a shared type with no saved use, assertUnused reads every other household draft and returns definition_in_use when another draft references or edits that type; otherwise the proposal can succeed. The HTTP error code is returned to the caller. Existing tests deliberately assert this rejection and that private names and values are absent, but do not establish whether the type-use bit itself is permitted disclosure.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "map.definition-removal.private-draft-type-oracle"
    ],
    "unresolved": [
      "Product privacy contract does not establish whether another member's type-use bit is confidential.",
      "A bounded two-member observation is blocked by the unverified sandbox requirements."
    ],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 9.",
    "hardening": [
      "otherDrafts includes drafts retained after membership revocation; existing tests deliberately preserve these for rejoining, so no separate security claim was established."
    ]
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23personal-view::src%2Fserver%2Fpersonal-view.ts%23user-scoped-view::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#personal-view",
      "boundary": "src/server/personal-view.ts#user-scoped-view",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Member-specific map presentation",
    "boundary": "src/server/personal-view.ts#user-scoped-view",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/map-routes.ts",
      "src/server/personal-view.ts",
      "src/server/view-settings-schema.ts"
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
    "wave": 3,
    "status": "covered",
    "agent_id": "hunter_personal",
    "reviewed_paths": [
      "src/server/content-identities.ts",
      "src/server/households.ts",
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/personal-view.ts",
      "src/server/view-settings-schema.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_personal",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/households.ts",
          "src/server/content-identities.ts"
        ],
        "invariant": "Personal view identity must derive from the authenticated actor and current household membership.",
        "method": "source",
        "result": "The route derives user ID from the session; householdMap rechecks membership and content binding. No caller supplied identity is accepted.",
        "artifact": null
      },
      {
        "agent_id": "hunter_personal",
        "reviewed_paths": [
          "src/server/personal-view.ts",
          "src/server/view-settings-schema.ts",
          "src/server/map.ts"
        ],
        "invariant": "Positions and settings must be scoped to the actor and visible map objects.",
        "method": "source",
        "result": "The transaction resolves the owner through householdMap.read, binds household and user IDs, limits positions to shared or own drafts, and validates settings schema.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic."
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23relationship-form::src%2Fserver%2Frelationship-form-attempts.ts%23replay-and-outcome::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#relationship-form",
      "boundary": "src/server/relationship-form-attempts.ts#replay-and-outcome",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Relationship form attempt replay",
    "boundary": "src/server/relationship-form-attempts.ts#replay-and-outcome",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/relationship-form-attempts.ts",
      "migrations/025_relationship_form_attempts.sql"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The path uses HTTP, process state, and SQLite, with no native desktop or mobile IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 8,
    "status": "covered",
    "agent_id": "hunter_relationship_attempt",
    "reviewed_paths": [
      "migrations/025_relationship_form_attempts.sql",
      "src/client/RelationshipForm.tsx",
      "src/server/content-identities.ts",
      "src/server/households.ts",
      "src/server/map-operations.ts",
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/relationship-form-attempts.ts",
      "src/server/relationships.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_relationship_attempt",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/households.ts",
          "src/server/content-identities.ts",
          "src/server/relationship-form-attempts.ts"
        ],
        "invariant": "Replay and outcome lookup stay bound to actor, household, content generation, and exact submission.",
        "method": "source",
        "result": "Route derives actor and membership; lookup binds household, user, generation, and staging ID. Different submission under same ID rejects; matching replay returns prior outcome.",
        "artifact": null
      },
      {
        "agent_id": "hunter_relationship_attempt",
        "reviewed_paths": [
          "src/server/map.ts",
          "src/server/relationship-form-attempts.ts",
          "src/server/relationships.ts",
          "src/server/map-operations.ts",
          "migrations/025_relationship_form_attempts.sql"
        ],
        "invariant": "New form submission checks versions, endpoints, type, duplicates, and pending operation, with atomic draft and outcome.",
        "method": "source",
        "result": "Authorized immediate transaction performs checks and records draft effect with attempt; primary key blocks duplicate records and generation changes delete attempts.",
        "artifact": null
      },
      {
        "agent_id": "hunter_relationship_attempt",
        "reviewed_paths": [
          "src/client/RelationshipForm.tsx"
        ],
        "invariant": "Historic outcome is not presented as current draft success after draft changes.",
        "method": "source",
        "result": "Client compares attempt ID, user, generation, and current draft value before declaring completion; changed value yields review message.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 7."
  },
  {
    "coverage_id": "src%2Fserver%2Fmap-routes.ts%23relationship-form::src%2Fserver%2Frelationship-form-attempts.ts%23retained-submission-volume::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "src/server/map-routes.ts#relationship-form",
      "boundary": "src/server/relationship-form-attempts.ts#retained-submission-volume",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Relationship form retained submission volume",
    "boundary": "src/server/relationship-form-attempts.ts#retained-submission-volume",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Resource and file handling",
    "starting_paths": [
      "src/server/app.ts",
      "src/server/map-routes.ts",
      "src/server/relationship-form-attempts.ts",
      "migrations/025_relationship_form_attempts.sql"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The form uses HTTP and SQLite, not native app IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 9,
    "status": "candidate",
    "agent_id": "hunter_attempt_volume",
    "reviewed_paths": [
      "migrations/025_relationship_form_attempts.sql",
      "src/server/app.ts",
      "src/server/client-address.ts",
      "src/server/erase-household-content.ts",
      "src/server/import-replacement.ts",
      "src/server/map-routes.ts",
      "src/server/map.ts",
      "src/server/properties.ts",
      "src/server/relationship-form-attempts.ts",
      "src/server/relationships.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_attempt_volume",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/server/relationships.ts",
          "src/server/relationship-form-attempts.ts",
          "src/server/properties.ts",
          "src/server/client-address.ts"
        ],
        "invariant": "Repeated completed duplicate submissions should have bounded aggregate storage cost.",
        "method": "source",
        "result": "Fresh IDs reach duplicate branch without draft change, then retain full request including ignored top-level padding. Individual body cap is 2 MB; no aggregate quota or form rate limit is visible.",
        "artifact": null
      },
      {
        "agent_id": "hunter_attempt_volume",
        "reviewed_paths": [
          "migrations/025_relationship_form_attempts.sql",
          "src/server/import-replacement.ts",
          "src/server/erase-household-content.ts"
        ],
        "invariant": "Attempt evidence should be reclaimed in ordinary use before shared SQLite storage is consumed.",
        "method": "source",
        "result": "Table has no count, age, or byte constraint; cleanup follows content generation change, replacement, or erasure, not routine duplicate submissions.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "relationship-form-unbounded-attempt-retention"
    ],
    "unresolved": [
      "Deployed ingress and disk limits and service response to storage exhaustion are not established.",
      "Sandbox requirements block a bounded local dummy-data check."
    ],
    "discovery_reason": "Hunter uncovered a separate authenticated storage-volume boundary."
  },
  {
    "coverage_id": "src%2Fserver%2Fmap.ts%23removed-definition-restoration::src%2Fserver%2Fdefinition-restoration.ts%23grant-and-save::src%2Fserver%2Fmap::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/map.ts#removed-definition-restoration",
      "boundary": "src/server/definition-restoration.ts#grant-and-save",
      "subsystem": "src/server/map",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Removed definition restoration authority",
    "boundary": "src/server/definition-restoration.ts#grant-and-save",
    "subsystem": "src/server/map",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/definition-restoration.ts",
      "src/server/object-types.ts",
      "src/server/relationship-types.ts",
      "src/server/map-tombstones.ts",
      "src/server/map.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 5,
    "status": "covered",
    "agent_id": "hunter_definition_restore",
    "reviewed_paths": [
      "src/server/content-maintenance.ts",
      "src/server/definition-restoration.ts",
      "src/server/import-replacement.ts",
      "src/server/map-routes.ts",
      "src/server/map-tombstones.ts",
      "src/server/map.ts",
      "src/server/object-types.ts",
      "src/server/project-content-scope.ts",
      "src/server/relationship-types.ts",
      "src/shared/conflict-special.ts",
      "src/shared/definition-restoration.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_definition_restore",
        "reviewed_paths": [
          "src/server/map-routes.ts",
          "src/server/map.ts",
          "src/shared/conflict-special.ts",
          "src/shared/definition-restoration.ts",
          "src/server/object-types.ts",
          "src/server/relationship-types.ts",
          "src/server/definition-restoration.ts",
          "src/server/map-tombstones.ts"
        ],
        "invariant": "A member can grant restoration only for a current removed definition in that household and private draft.",
        "method": "source",
        "result": "Route derives actor; householdMap binds membership and draft owner. Conflict resolution checks basis and removed definition; grant checks tombstone, revision, and generation.",
        "artifact": null
      },
      {
        "agent_id": "hunter_definition_restore",
        "reviewed_paths": [
          "src/server/map.ts",
          "src/server/object-types.ts",
          "src/server/relationship-types.ts",
          "src/server/definition-restoration.ts",
          "src/server/map-tombstones.ts",
          "src/server/content-maintenance.ts",
          "src/server/project-content-scope.ts",
          "src/server/import-replacement.ts"
        ],
        "invariant": "Save must recheck tombstone and content generation; archive import cannot replay a grant.",
        "method": "source",
        "result": "Immediate save transaction reauthorizes actor and checks unchanged row, tombstone, revision, definition, household, and generation. Rejection rolls back, import strips restoration authority.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 4."
  },
  {
    "coverage_id": "src%2Fserver%2Fpolicy-contact-routes.ts%23operator-policy-contact::src%2Fserver%2Fhouseholds.ts%23isFirstAdmin::src%2Fserver%2Finstallation::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/policy-contact-routes.ts#operator-policy-contact",
      "boundary": "src/server/households.ts#isFirstAdmin",
      "subsystem": "src/server/installation",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Operator policy contact authority",
    "boundary": "src/server/households.ts#isFirstAdmin",
    "subsystem": "src/server/installation",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/app.ts",
      "src/server/policy-contact-routes.ts",
      "src/server/households.ts",
      "src/server/config.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 4,
    "status": "covered",
    "agent_id": "hunter_settings",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/policy-contact-routes.ts",
      "src/server/households.ts",
      "src/server/config.ts",
      "src/server/auth.ts",
      "src/server/browser-binding.ts",
      "src/server/login-methods.ts",
      "migrations/033_storage_consent.sql",
      "docs/operations/installation.md",
      "docs/operations/operator-upgrade-notes.md"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_settings",
        "reviewed_paths": [
          "src/server/app.ts",
          "src/server/policy-contact-routes.ts",
          "src/server/households.ts",
          "src/server/config.ts",
          "src/server/auth.ts",
          "src/server/browser-binding.ts",
          "src/server/login-methods.ts",
          "migrations/033_storage_consent.sql",
          "docs/operations/installation.md",
          "docs/operations/operator-upgrade-notes.md"
        ],
        "invariant": "Only configured installation provider and subject may change public policy contact.",
        "method": "source",
        "result": "POST requires browser-bound session, Origin, strict email, and isFirstAdmin match to configured provider and subject; public GET returns only singleton contact.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 3."
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
    "coverage_id": "src%2Fserver%2Ftext-assistant.ts%23cached-tool-read::src%2Fserver%2Fassistant-read-cache.ts%23reuse-and-invalidation::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "src/server/text-assistant.ts#cached-tool-read",
      "boundary": "src/server/assistant-read-cache.ts#reuse-and-invalidation",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Assistant read-cache reuse and invalidation",
    "boundary": "src/server/assistant-read-cache.ts#reuse-and-invalidation",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "src/server/assistant-read-cache.ts",
      "src/server/text-assistant.ts",
      "src/server/text-assistant-mcp.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Context, retrieval, and memory attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 4,
    "status": "covered",
    "agent_id": "hunter_assistant_cache",
    "reviewed_paths": [
      "src/server/assistant-read-cache.ts",
      "src/server/assistant-routes.ts",
      "src/server/assistant-work.ts",
      "src/server/content-maintenance.ts",
      "src/server/erase-household-content.ts",
      "src/server/map-operations.ts",
      "src/server/map.ts",
      "src/server/relationships.ts",
      "src/server/text-assistant-mcp.ts",
      "src/server/text-assistant.ts",
      "tests/unit/server/assistant-read-cache.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_assistant_cache",
        "reviewed_paths": [
          "src/server/assistant-read-cache.ts",
          "src/server/text-assistant.ts",
          "src/server/text-assistant-mcp.ts",
          "src/server/assistant-routes.ts"
        ],
        "invariant": "A cached read stays scoped to the household, content owner, conversation, and live MCP connection.",
        "method": "source",
        "result": "Cache is per conversation with fixed household and owner; call wrapper checks current connection, task, and owner before and after reuse. Reset clears cache.",
        "artifact": null
      },
      {
        "agent_id": "hunter_assistant_cache",
        "reviewed_paths": [
          "src/server/assistant-read-cache.ts",
          "src/server/assistant-work.ts",
          "src/server/map.ts",
          "src/server/map-operations.ts",
          "src/server/relationships.ts",
          "src/server/content-maintenance.ts",
          "src/server/erase-household-content.ts",
          "tests/unit/server/assistant-read-cache.test.ts"
        ],
        "invariant": "Changes to shared, draft, history, replacement, or erased data invalidate cached reads.",
        "method": "source",
        "result": "Read stamps bind content version, entity revisions, draft and operation versions/status, and history IDs; mutations update dependencies, and cache compares stamps around loads.",
        "artifact": null
      },
      {
        "agent_id": "hunter_assistant_cache",
        "reviewed_paths": [
          "src/server/assistant-read-cache.ts",
          "src/server/text-assistant.ts",
          "src/server/text-assistant-mcp.ts",
          "src/server/assistant-routes.ts"
        ],
        "invariant": "Cached content cannot bypass live authorization or become durable cross-session memory.",
        "method": "source",
        "result": "Only successful named reads are cached, under 128 entries and 4 MiB; live checks wrap hits and conversation reset clears entries.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 3."
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
    "status": "candidate",
    "agent_id": "hunter_consent_spend",
    "reviewed_paths": [
      "src/server/app.ts",
      "src/server/conversation-capacity.ts",
      "src/server/costs.ts",
      "src/server/model-client.ts",
      "src/server/text-assistant-mcp.ts",
      "src/server/text-assistant-model.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_consent_spend",
        "reviewed_paths": [
          "src/server/text-assistant.ts",
          "src/server/app.ts",
          "src/server/text-assistant-mcp.ts"
        ],
        "invariant": "Completed messages must have bounded retained memory in the shared server process.",
        "method": "source",
        "result": "The 200-item cap counts pending and active work only; completed accepted entries persist and each result copies growing task and reply lists.",
        "artifact": null
      },
      {
        "agent_id": "hunter_consent_spend",
        "reviewed_paths": [
          "src/server/text-assistant-model.ts",
          "src/server/model-client.ts",
          "src/server/voice-assistant.ts",
          "src/server/conversation-capacity.ts",
          "src/server/costs.ts"
        ],
        "invariant": "Provider work and spend accounting shape the shared-resource boundary.",
        "method": "source",
        "result": "Text turns have a 48-step bound and record attempts; context summaries do not evict completed entries. No demonstrated cost-budget violation was established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "text-assistant-completed-result-quadratic-retention"
    ],
    "unresolved": [
      "The required sandbox was unavailable for a bounded memory observation.",
      "The shared-process effect under a supported memory limit remains unknown."
    ],
    "discovery_reason": "Accepted source-backed missing unit from critic_post_1.",
    "hardening": [
      "No cumulative per-member provider spend cap is source-visible; no defined budget boundary or observed impact was established.",
      "A future multi-instance deployment would need durable consent revocation generation checks."
    ]
  },
  {
    "coverage_id": "src%2Fserver%2Ftext-assistant.ts%23conversation-summary::src%2Fserver%2Fconversation-summary.ts%23historicalSummary::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Chained%20vulnerabilities%20and%20trust%20boundaries",
    "canonical_refs": {
      "surface": "src/server/text-assistant.ts#conversation-summary",
      "boundary": "src/server/conversation-summary.ts#historicalSummary",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries"
    },
    "surface": "Historical assistant summary context",
    "boundary": "src/server/conversation-summary.ts#historicalSummary",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "starting_paths": [
      "src/server/conversation-summary.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Context, retrieval, and memory attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 5,
    "status": "covered",
    "agent_id": "hunter_summary",
    "reviewed_paths": [
      "src/server/conversation-summary.ts",
      "src/server/text-assistant-model.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_summary",
        "reviewed_paths": [
          "src/server/conversation-summary.ts",
          "src/server/text-assistant.ts",
          "src/server/text-assistant-model.ts"
        ],
        "invariant": "Historical summary stays in its conversation and cannot authorize a save or another member's draft.",
        "method": "source",
        "result": "Summarizer has no tools and store:false; installation checks session, revision, revocation, login, membership, and draft. Save intent derives from current admitted message.",
        "artifact": null
      },
      {
        "agent_id": "hunter_summary",
        "reviewed_paths": [
          "src/server/conversation-summary.ts",
          "src/server/text-assistant.ts",
          "src/server/voice-assistant.ts"
        ],
        "invariant": "Failed, canceled, or superseded summary cannot install stale context across voice handoff.",
        "method": "source",
        "result": "Incomplete, blank, oversized, or tool-call output is rejected. Guard checks follow responses; reset and stop abort work, while voice handoff waits for checked delegate work.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 4.",
    "hardening": [
      "historicalSummary puts model-generated text in an assistant-role message with an untrusted marker in JSON content; an explicit provenance label could reduce model confusion, but no separate boundary effect was established."
    ]
  },
  {
    "coverage_id": "src%2Fserver%2Ftext-assistant.ts%23recover-and-revoke::src%2Fserver%2Fsave-check.ts%23checkSaves::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "src/server/text-assistant.ts#recover-and-revoke",
      "boundary": "src/server/save-check.ts#checkSaves",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Assistant pending save recovery and revocation",
    "boundary": "src/server/save-check.ts#checkSaves",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Business logic",
    "starting_paths": [
      "src/server/text-assistant.ts",
      "src/server/save-check.ts",
      "src/server/map-operations.ts",
      "src/server/map.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "AI-AND-LLM.md#Tool and action attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The path uses HTTP, process state, and SQLite, with no native desktop or mobile IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 8,
    "status": "covered",
    "agent_id": "hunter_save_recovery",
    "reviewed_paths": [
      "src/server/assistant-work.ts",
      "src/server/conversation-consent-routes.ts",
      "src/server/conversation-consent.ts",
      "src/server/households.ts",
      "src/server/map-operations.ts",
      "src/server/map.ts",
      "src/server/save-check.ts",
      "src/server/text-assistant.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_save_recovery",
        "reviewed_paths": [
          "src/server/text-assistant.ts",
          "src/server/conversation-consent-routes.ts",
          "src/server/conversation-consent.ts",
          "src/server/assistant-work.ts"
        ],
        "invariant": "Consent revocation stops new assistant work while only an existing registered save attempt may complete.",
        "method": "source",
        "result": "Revocation removes consent and connection, then checks only pending save IDs before stop. Registration requires current explicit save intent and guard checks.",
        "artifact": null
      },
      {
        "agent_id": "hunter_save_recovery",
        "reviewed_paths": [
          "src/server/save-check.ts",
          "src/server/map-operations.ts",
          "src/server/map.ts",
          "src/server/households.ts"
        ],
        "invariant": "Recovery cannot select another actor's attempt, replay changed draft, or save after membership loss.",
        "method": "source",
        "result": "checkSaves reads actor's current-content operations. Lookup binds household, owner, ID, version; save checks draft hash and membership in immediate transactions and returns existing receipt on replay.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 7."
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
    "coverage_id": "src%2Fserver%2Fupgrade-legacy-login.ts%23maintenance-entry::src%2Fserver%2Flegacy-login-upgrade.ts%23adoptLegacyInstallationAuthority::src%2Fserver%2Finstallation::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "src/server/upgrade-legacy-login.ts#maintenance-entry",
      "boundary": "src/server/legacy-login-upgrade.ts#adoptLegacyInstallationAuthority",
      "subsystem": "src/server/installation",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Offline legacy-login authority upgrade",
    "boundary": "src/server/legacy-login-upgrade.ts#adoptLegacyInstallationAuthority",
    "subsystem": "src/server/installation",
    "attack_class": "ATTACK-CLASSES.md#Access control",
    "starting_paths": [
      "src/server/upgrade-legacy-login.ts",
      "src/server/legacy-login-upgrade.ts",
      "docs/operations/login-upgrade.md"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "No native desktop, mobile, or local IPC application entry is source visible."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 7,
    "status": "covered",
    "agent_id": "hunter_legacy_upgrade",
    "reviewed_paths": [
      "docs/operations/database-restore.md",
      "docs/operations/login-upgrade.md",
      "migrations/032_installation_authority.sql",
      "src/server/auth.ts",
      "src/server/config.ts",
      "src/server/database.ts",
      "src/server/index.ts",
      "src/server/installation-authority.ts",
      "src/server/legacy-login-upgrade.ts",
      "src/server/upgrade-legacy-login.ts",
      "tests/unit/server/legacy-login-upgrade-command.test.ts",
      "tests/unit/server/legacy-login-upgrade.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_legacy_upgrade",
        "reviewed_paths": [
          "src/server/upgrade-legacy-login.ts",
          "src/server/legacy-login-upgrade.ts",
          "src/server/database.ts",
          "src/server/config.ts",
          "migrations/032_installation_authority.sql",
          "docs/operations/login-upgrade.md",
          "docs/operations/database-restore.md",
          "tests/unit/server/legacy-login-upgrade-command.test.ts"
        ],
        "invariant": "Only declared offline transition of an existing unfenced installation can adopt generation; restore declaration and repeat adoption fail.",
        "method": "source",
        "result": "Command requires two flags, rejects restore declaration and missing database; exclusive transaction refuses existing authority and inserts singleton generation after invalidation. Service stop is a documented operator precondition.",
        "artifact": null
      },
      {
        "agent_id": "hunter_legacy_upgrade",
        "reviewed_paths": [
          "src/server/legacy-login-upgrade.ts",
          "src/server/installation-authority.ts",
          "src/server/auth.ts",
          "src/server/index.ts",
          "docs/operations/login-upgrade.md",
          "tests/unit/server/legacy-login-upgrade.test.ts"
        ],
        "invariant": "Old sessions, callbacks, tokens, grants, and signing keys lose authority after adoption while content survives fresh sign-in.",
        "method": "source",
        "result": "Adoption invalidates auth artifacts transactionally; normal startup prepares generation before serving. Source tests cover old cookies, callbacks and fresh sign-in; not executed.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 6."
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
  },
  {
    "coverage_id": "src%2Fserver%2Fvoice-work.ts%23spoken-answer::src%2Fserver%2Fvoice-commentary.ts%23provider-commentary-and-instructions::src%2Fserver%2Fassistant::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "src/server/voice-work.ts#spoken-answer",
      "boundary": "src/server/voice-commentary.ts#provider-commentary-and-instructions",
      "subsystem": "src/server/assistant",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Voice spoken answer and required notice ordering",
    "boundary": "src/server/voice-commentary.ts#provider-commentary-and-instructions",
    "subsystem": "src/server/assistant",
    "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "starting_paths": [
      "src/server/voice-work.ts",
      "src/server/voice-commentary.ts",
      "tests/unit/server/voice-commentary.test.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Output and disclosure attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
        "reason": "The spoken-answer path uses a provider sideband, not native desktop or mobile IPC."
      }
    ],
    "prior_status": "none",
    "attempts": [],
    "wave": 6,
    "status": "covered",
    "agent_id": "hunter_voice_commentary",
    "reviewed_paths": [
      "src/client/use-voice.ts",
      "src/server/assistant-instructions.ts",
      "src/server/text-assistant.ts",
      "src/server/voice-assistant.ts",
      "src/server/voice-commentary.ts",
      "src/server/voice-work.ts",
      "tests/unit/server/voice-commentary.test.ts",
      "tests/unit/server/voice-typed-delivery.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunter_voice_commentary",
        "reviewed_paths": [
          "src/server/voice-work.ts",
          "src/server/voice-commentary.ts",
          "src/server/text-assistant.ts",
          "src/server/assistant-instructions.ts",
          "tests/unit/server/voice-commentary.test.ts",
          "tests/unit/server/voice-typed-delivery.test.ts"
        ],
        "invariant": "Required notice and verified result remain distinct, and speech instruction waits for all part acknowledgments.",
        "method": "source",
        "result": "Notice is stored apart from model reply; completion orders notice, result, question. Commentary labels sections, quotes model text as data, registers parts before sending, and releases speech only after all acknowledgments. Source tests inspected, not executed.",
        "artifact": null
      },
      {
        "agent_id": "hunter_voice_commentary",
        "reviewed_paths": [
          "src/server/voice-work.ts",
          "src/server/voice-assistant.ts",
          "src/client/use-voice.ts"
        ],
        "invariant": "Spoken response stays bound to current authenticated conversation; transport acknowledgment is not proof of audible delivery.",
        "method": "source",
        "result": "Route and work guard access and generation; browser separately checks transcript against observed audio. Provider speech behavior is external.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "discovery_reason": "Accepted source-backed missing unit from post-wave critic 5."
  }
]

## Current candidate fingerprints and prior coverage

installation.restore.reinstates-revoked-membership
map-read.full-history-materialization
map.definition-removal.private-draft-type-oracle
relationship-form-unbounded-attempt-retention
text-assistant-completed-result-quadratic-retention
text-assistant/shared-map-to-private-draft-action-binding
No compatible prior ledger exists.

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


Explicitly inspect unmapped entry points, parallel paths, lifecycle states, selected companion classes, exclusions, checks and reviewed paths, and source paths not represented by the 47 units. Keep your returned missing_units source-backed with exact starting paths. A source-only check is sufficient to assess coverage. Do not duplicate a unit merely by renaming it.
