import json
from pathlib import Path
from urllib.parse import quote

RUN = Path("/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1")
LEDGER = RUN / "coverage-ledger.json"
C = lambda file, heading: f"{file}.md#{heading}"
A = "ATTACK-CLASSES.md#"
SPECS = [
    (
        "src/server/app.ts#POST /api/households",
        "src/server/households.ts#createHousehold",
        "src/server/installation",
        "Initial household creation",
        A + "Access control",
        ["src/server/app.ts", "src/server/households.ts", "src/server/config.ts"],
        [C("DATA-ISOLATION-AND-LIFECYCLE", x) for x in
         ["Core discipline", "Tenant and object-isolation attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        "src/server/database.ts#startup",
        "src/server/installation-authority.ts#prepareInstallationAuthority",
        "src/server/installation",
        "Database restore and authority rotation",
        A + "Access control",
        ["src/server/installation-authority.ts", "src/server/database.ts", "src/server/auth.ts", "src/server/legacy-login-upgrade.ts", "docs/operations/database-restore.md"],
        [C("DATA-ISOLATION-AND-LIFECYCLE", x) for x in
         ["Core discipline", "Export, backup, restore, and migration attack classes", "Deletion, revocation, and lifecycle attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        "src/server/conversation-consent-routes.ts#consent",
        "src/server/conversation-consent.ts#valid-and-revoke",
        "src/server/assistant",
        "Conversation consent and revocation",
        A + "Feature abuse and data leakage",
        ["src/server/conversation-consent-routes.ts", "src/server/conversation-consent.ts", "src/server/text-assistant.ts", "src/server/voice-assistant.ts"],
        [C("AI-AND-LLM", x) for x in ["Core discipline", "Output and disclosure attack classes", "Universal moves", "Validation rules"]] +
        [C("DATA-ISOLATION-AND-LIFECYCLE", "Deletion, revocation, and lifecycle attack classes")],
    ),
    (
        "src/server/text-assistant.ts#conversation-admission",
        "src/server/text-assistant.ts#queue-and-provider-work",
        "src/server/assistant",
        "Authenticated assistant work and provider spend",
        A + "Business logic",
        ["src/server/text-assistant.ts", "src/server/voice-assistant.ts", "src/server/conversation-capacity.ts", "src/server/model-client.ts", "src/server/costs.ts"],
        [C("RESOURCE-EXHAUSTION-AND-AVAILABILITY", x) for x in
         ["Core discipline", "Quota and scheduling attack classes", "Resource accumulation attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        ".github/workflows/operator-upgrade-gate.yml#pull_request_target",
        "scripts/release/operator-upgrade-gate.mjs#decision",
        "release",
        "Privileged pull request gates",
        A + "Chained vulnerabilities and trust boundaries",
        [".github/workflows/operator-upgrade-gate.yml", ".github/workflows/ssdlc-gate.yml", "scripts/release/operator-upgrade-gate.mjs", "scripts/security/ssdlc-gate.mjs"],
        [C("SUPPLY-CHAIN-AND-RELEASE", x) for x in
         ["Core discipline", "CI and automation attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        ".github/workflows/image-monitor.yml#schedule",
        "scripts/security/monitor-images.mjs#production-monitor",
        "release",
        "Production image monitoring authority",
        A + "Chained vulnerabilities and trust boundaries",
        [".github/workflows/image-monitor.yml", "scripts/security/monitor-images.mjs", "scripts/security/container-policy.mjs"],
        [C("SUPPLY-CHAIN-AND-RELEASE", x) for x in
         ["Core discipline", "CI and automation attack classes", "Universal moves", "Validation rules"]] +
        [C("CLOUD-AND-DEPLOYMENT", "Core discipline")],
    ),
    (
        "src/server/assistant-routes.ts#oauth-consent",
        "src/server/assistant-auth.ts#consentReferenceId",
        "src/server/assistant",
        "OAuth client registration and assistant consent",
        A + "Access control",
        ["src/server/app.ts", "src/server/assistant-auth.ts", "src/server/assistant-routes.ts"],
        [C("WEB-PROTOCOL-AND-AUTH", x) for x in
         ["Core discipline", "Federated-identity attack classes", "Universal moves", "Validation rules"]] +
        [C("AI-AND-LLM", "MCP and sub-agent trust classes")],
    ),
    (
        "src/server/map-routes.ts#personal-view",
        "src/server/personal-view.ts#user-scoped-view",
        "src/server/map",
        "Member-specific map presentation",
        A + "Access control",
        ["src/server/map-routes.ts", "src/server/personal-view.ts", "src/server/view-settings-schema.ts"],
        [C("DATA-ISOLATION-AND-LIFECYCLE", x) for x in
         ["Core discipline", "Tenant and object-isolation attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        "scripts/security/check-results.mjs#scanner-results",
        "scripts/security/check-results.mjs#security-gate",
        "release",
        "Security scanner policy and exceptions",
        A + "Chained vulnerabilities and trust boundaries",
        [".github/workflows/security.yml", ".github/workflows/ci.yml", "scripts/security/check-results.mjs", "scripts/security/container-policy.mjs", ".github/security-exceptions.json"],
        [C("SUPPLY-CHAIN-AND-RELEASE", x) for x in
         ["Core discipline", "Dependency and build-input attack classes", "CI and automation attack classes", "Universal moves", "Validation rules"]],
    ),
    (
        "scripts/security/repository-settings.mjs#settings-check",
        "scripts/security/repository-settings.mjs#ruleset-verification",
        "release",
        "Default-branch security configuration",
        A + "Chained vulnerabilities and trust boundaries",
        ["scripts/security/repository-settings.mjs", "docs/operations/security-checks.md", ".github/workflows/ci.yml"],
        [C("SUPPLY-CHAIN-AND-RELEASE", x) for x in
         ["Core discipline", "CI and automation attack classes", "Universal moves", "Validation rules"]] +
        [C("CLOUD-AND-DEPLOYMENT", "Workload identity and IAM attack classes")],
    ),
    (
        "scripts/security/verify-installation.mjs#operator-check",
        "scripts/security/verify-installation.mjs#evidence-decision",
        "deployment",
        "Operator verification of deployed image security",
        A + "Chained vulnerabilities and trust boundaries",
        ["scripts/security/verify-installation.mjs", "scripts/security/monitor-images.mjs", "docs/operations/security-monitoring.md"],
        [C("CLOUD-AND-DEPLOYMENT", x) for x in
         ["Core discipline", "Ingress, network, and control-plane attack classes", "Universal moves", "Validation rules"]] +
        [C("SUPPLY-CHAIN-AND-RELEASE", "Release and update attack classes")],
    ),
    (
        ".github/workflows/release-acceptance.yml#workflow_dispatch",
        "scripts/release/acceptance.mjs#acceptance-report",
        "release",
        "Manual release acceptance evidence",
        A + "Chained vulnerabilities and trust boundaries",
        [".github/workflows/release-acceptance.yml", "scripts/release/acceptance.mjs", "docs/operations/container-releases.md"],
        [C("SUPPLY-CHAIN-AND-RELEASE", x) for x in
         ["Core discipline", "Release and update attack classes", "Universal moves", "Validation rules"]],
    ),
]

ledger = json.loads(LEDGER.read_text())
existing = {unit["coverage_id"] for unit in ledger}
for surface_ref, boundary_ref, subsystem_ref, label, ordinary, paths, companions in SPECS:
    refs = {
        "surface": surface_ref,
        "boundary": boundary_ref,
        "subsystem": subsystem_ref,
        "attack_class": ordinary,
    }
    coverage_id = "::".join(quote(value, safe="-._~") for value in refs.values())
    if coverage_id in existing:
        continue
    ledger.append({
        "coverage_id": coverage_id,
        "canonical_refs": refs,
        "surface": label,
        "boundary": boundary_ref,
        "subsystem": subsystem_ref,
        "attack_class": ordinary,
        "starting_paths": paths,
        "ordinary_attack_class_block": ordinary,
        "selected_companion_blocks": companions,
        "excluded_blocks": [
            {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
             "reason": "No native desktop, mobile, or local IPC application entry is source visible for this unit."}
        ],
        "prior_status": "none",
        "attempts": [],
        "wave": 3,
        "status": "planned",
        "agent_id": None,
        "reviewed_paths": [],
        "local_checks": [],
        "result_fingerprints": [],
        "unresolved": [],
        "discovery_reason": "Accepted source-backed missing unit from the latest post-wave critic.",
    })
ledger.sort(key=lambda unit: unit["coverage_id"])
LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n")
