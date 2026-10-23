import json
from pathlib import Path

RUN = Path("/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1")
LEDGER = RUN / "coverage-ledger.json"

# Parent transcription of structured source-only hunter results. No target code
# or agent scratch artifact is executed or promoted.
RESULTS = {
    "src/server/app.ts#public-routes": (
        "hunter_auth",
        ["src/server/app.ts", "src/server/index.ts", "compose.yaml", ".gitignore"],
        "Public routes, errors, headers, and cache policy must not expose private state.",
        "Health returns availability only; API responses are no-store, errors omit stacks, headers apply globally, and Compose publishes to loopback."
    ),
    "src/server/auth.ts#oauth-callback": (
        "hunter_auth",
        ["src/server/auth.ts", "src/server/login-methods.ts", "src/server/auth-callback-transaction.ts", "src/server/browser-binding.ts"],
        "Account linking binds provider subject, initiating session, OAuth state, and browser binding.",
        "Provider-subject identities prevent implicit linking; explicit linking and callback publication recheck state, provider, session, expiry, and binding revision."
    ),
    "src/server/browser-binding.ts#session-routes": (
        "hunter_auth",
        ["src/server/browser-binding.ts", "src/server/app.ts", "src/server/login-methods.ts"],
        "Application access requires a matching confirmed unexpired browser binding.",
        "Session lookup checks token, deadline, and binding; Origin and host checks guard mutations, with transactional replacement and revocation."
    ),
    "src/server/config.ts#runtime-config": (
        "hunter_auth",
        ["src/server/config.ts", "src/server/client-address.ts", "src/server/index.ts", "compose.yaml", "Dockerfile", "docs/operations/installation.md", "docs/operations/render.md", ".env.example"],
        "Configuration rejects missing secrets and origin; proxy address trust is bound to the socket peer or protected ingress.",
        "Auth secret and canonical origin are required; production client-address mode is explicit, internal headers are stripped, and missing addresses fail authentication routes closed."
    ),
    "src/server/administration-routes.ts#membership": (
        "hunter_map",
        ["src/server/administration-routes.ts", "src/server/administration.ts", "src/server/households.ts"],
        "Only a current administrator may manage roles and invitations, with acceptance bound to the named user.",
        "Routes use authenticated sessions and Origin; domain operations recheck role in a transaction; invitations bind hash, user, status, and expiry."
    ),
    "src/server/content-owner-routes.ts#owner": (
        "hunter_map",
        ["src/server/content-owner-routes.ts", "src/server/content-owners.ts", "src/server/households.ts", "src/server/content-identities.ts"],
        "Private-content recovery reassignment requires current administrator authority and a verified current member.",
        "The transaction checks role, content version, household identity, and target membership; ordinary access resolves the actor's bound content identity."
    ),
    "src/server/map-routes.ts#history": (
        "hunter_map",
        ["src/server/map-routes.ts", "src/server/map.ts", "src/server/map-operations.ts", "src/server/households.ts"],
        "History reads and save replay remain within current membership, draft version, and operation state.",
        "Household-filtered history and save paths recheck current authority, content generation, draft version and hash, and committed operation status."
    ),
    "src/server/map-routes.ts#map-work": (
        "hunter_map",
        ["src/server/map-routes.ts", "src/server/map.ts", "src/server/households.ts", "src/server/content-identities.ts", "src/server/map-tombstones.ts"],
        "Map methods require membership, private drafts bind to the actor, and saved IDs cannot cross households or reuse tombstones.",
        "The domain transaction repeats membership and content binding; draft and shared queries include the household and appropriate actor scope."
    ),
    "src/server/household-erasure-routes.ts#erasure": (
        "hunter_import",
        ["src/server/household-erasure-routes.ts", "src/server/household-erasure.ts", "src/server/erasure-content.ts", "src/server/erasure-projection.ts", "src/server/erase-household-content.ts", "src/server/content-maintenance.ts"],
        "Erasure requires a current administrator and a review bound to the destination state.",
        "The route checks session, role, Origin, phrase, operation ID, and token; execution recomputes review inside the maintenance transaction."
    ),
    "src/server/household-export-routes.ts#export": (
        "hunter_import",
        ["src/server/household-export-routes.ts", "src/server/household-export.ts", "src/server/administration-routes.ts", "src/server/administration.ts", "docs/operations/recovery.md"],
        "Full export stays limited to current administrators and requesting actor through download and revocation.",
        "Prepare, snapshot, cancel, and download check administrator role; download also checks actor, household, readiness, expiry, and generation."
    ),
    "src/server/household-import-routes.ts#import": (
        "hunter_import",
        ["src/server/household-import-routes.ts", "src/server/household-import.ts", "src/server/import-archive.ts", "src/server/import-schema.ts", "src/server/import-references.ts", "src/server/import-replacement.ts", "src/server/content-maintenance.ts"],
        "Only a current administrator may replace household content using a bounded valid archive and current review.",
        "The path checks ZIP entry names, counts, bytes, hashes, JSON shape, references, collisions, image metadata, and destination fingerprint before transactional replacement."
    ),
    "src/server/profile-image-routes.ts#upload": (
        "hunter_import",
        ["src/server/profile-image-routes.ts", "src/server/profile-images.ts", "src/server/app.ts", "src/server/map.ts"],
        "Member image input is bounded before decode and reduced to a small output format.",
        "A 10 MB body limit, 40-million-pixel decode limit, JPEG/PNG/WebP allowlist, 300-by-300 resize, and 262144-byte output cap are source visible."
    ),
    "src/server/app.ts#rate-limits": (
        "hunter_transport",
        ["src/server/app.ts", "src/server/auth.ts", "src/server/client-address.ts", "src/server/index.ts"],
        "Unauthenticated requests must not cause disproportionate shared work before input and authentication controls.",
        "Node applies the address boundary before Hono; route-specific body limits apply, and health/version use bounded readiness queries."
    ),
    "src/server/cost-routes.ts#costs": (
        "hunter_transport",
        ["src/server/app.ts", "src/server/cost-routes.ts", "src/server/costs.ts", "src/server/households.ts"],
        "Only the installation operator may read or change provider cost assumptions.",
        "Both routes require a bound session and configured operator identity; changes require Origin, strict bounded schema, and transactional version."
    ),
    "src/server/task-delivery-transport.ts#upgrade": (
        "hunter_transport",
        ["src/server/index.ts", "src/server/task-delivery-transport.ts", "src/server/task-delivery.ts", "src/server/text-assistant.ts"],
        "Delivery sockets and acknowledgments bind to browser session, household, conversation, and task.",
        "Handshake rechecks Origin, session, household, binding, and access; acknowledgments apply only to the socket's task and compare state, text, guard, and deadline."
    ),
    "src/server/assistant-routes.ts#mcp": (
        "hunter_ai",
        ["src/server/assistant-routes.ts", "src/server/assistant-auth.ts", "src/server/assistant-work.ts", "src/server/households.ts", "src/server/map.ts"],
        "MCP tools use token-bound user, client, household grant, current membership, and write scope.",
        "The route verifies issuer, audience, read scope, grant, user, client, and membership; write tools require write scope and map operations recheck access."
    ),
    "src/server/text-assistant.ts#text-message": (
        "hunter_ai",
        ["src/server/text-assistant.ts", "src/server/text-assistant-mcp.ts", "src/server/assistant-routes.ts", "src/server/assistant-work.ts", "src/server/map.ts", "src/server/map-routes.ts", "src/server/text-assistant-model.ts"],
        "Another member's shared text must not authorize an unrequested mutation of the consuming member's private draft.",
        "Shared map values can enter model context; proposal dispatch checks schema, grant, membership and versions but no deterministic request-to-proposal binding. A separate save-intent gate limits this lead to draft changes."
    ),
    "src/server/voice-assistant.ts#voice-session": (
        "hunter_ai",
        ["src/server/voice-assistant.ts", "src/server/voice-work.ts", "src/server/text-assistant.ts", "src/server/app.ts"],
        "Voice sessions bind to authenticated browser conversation and historical speech cannot become a fresh action.",
        "Voice creation rechecks access across provider awaits; server-retained history replaces client history and only fresh user transcript fragments enter the pending action queue."
    ),
    "src/server/app.ts#POST /api/households": (
        "hunter_install",
        ["src/server/app.ts", "src/server/households.ts", "src/server/auth.ts", "src/server/config.ts", "migrations/001_initial.sql"],
        "Only the configured provider subject may create the first household, atomically and once.",
        "The route requires session, Origin, JSON, and normalized name; an immediate transaction checks provider subject and singleton installation before inserting household and administrator membership."
    ),
    "src/server/database.ts#startup": (
        "hunter_install",
        ["src/server/database.ts", "src/server/index.ts", "src/server/auth.ts", "src/server/config.ts", "src/server/installation-authority.ts", "src/server/legacy-login-upgrade.ts", "src/server/administration.ts", "src/server/administration-routes.ts", "src/server/households.ts", "src/server/map.ts", "migrations/001_initial.sql", "migrations/032_installation_authority.sql", "docs/operations/database-restore.md", "docs/operations/installation.md"],
        "A controlled database restore must not reinstate authority revoked after the backup.",
        "Restore rotates sessions, tokens, bindings, and assistant connections but retains restored membership and account links; whether later revocations are reconciled before ingress is not source-established."
    ),
    ".github/workflows/image-monitor.yml#schedule": (
        "hunter_ci",
        [".github/workflows/image-monitor.yml", ".github/workflows/release.yml", "scripts/security/monitor-images.mjs", "scripts/security/container-policy.mjs", "scripts/release/deploy.mjs", "docs/operations/security-monitoring.md"],
        "Only current live and accepted rollback images may receive a passing scan status.",
        "The monitor checks Render digest against accepted deployment, scans selected digests, rechecks deployment state, and treats missing evidence as unknown."
    ),
    ".github/workflows/operator-upgrade-gate.yml#pull_request_target": (
        "hunter_ci",
        [".github/workflows/operator-upgrade-gate.yml", ".github/workflows/ssdlc-gate.yml", "scripts/release/operator-upgrade-gate.mjs", "scripts/release/operator-upgrade-notes.mjs", "scripts/security/ssdlc-gate.mjs"],
        "Pull request content must not become executable or a privileged command in pull_request_target gates.",
        "Both gates run trusted base code and treat PR body, file metadata, and commit-addressed notes as API data; identifiers are validated before use."
    ),
    "scripts/security/repository-settings.mjs#settings-check": (
        "hunter_security_gates",
        ["scripts/security/repository-settings.mjs", "docs/operations/security-checks.md", ".github/workflows/ci.yml"],
        "The repository-settings check must reject a default-branch ruleset lacking pull requests or current GitHub Actions CI results.",
        "It checks active enforcement, bypass actors, branch coverage, pull requests, strict status checks, and required GitHub Actions job IDs. Hosted settings were not inspected."
    ),
    ".github/workflows/release-acceptance.yml#workflow_dispatch": (
        "hunter_operator_evidence",
        [".github/workflows/release-acceptance.yml", "scripts/release/acceptance.mjs", "scripts/release/candidate.mjs", "scripts/release/github-release.mjs", "scripts/release/plan.mjs", "docs/operations/container-releases.md"],
        "A passed acceptance report must preserve the verified run, release identity, signed evidence, assets, and digest.",
        "The workflow runs on main with read permissions; script constrains scenario input, checks run and signed release evidence, and compares retry snapshots."
    ),
    "scripts/security/verify-installation.mjs#operator-check": (
        "hunter_operator_evidence",
        ["scripts/security/verify-installation.mjs", "scripts/security/monitor-images.mjs", "scripts/security/__tests__/verify-installation.test.mjs", ".github/workflows/image-monitor.yml", "docs/operations/security-monitoring.md"],
        "Installation verification must fail for stale, unsuccessful, substituted, or inconsistent monitoring evidence.",
        "The verifier binds artifact to latest successful scheduled run, compares Render and GitHub image identity, and checks stable observations. Notification delivery remains unverified."
    ),
    "src/server/map-routes.ts#conversation-preferences-and-theme-preference": (
        "hunter_settings",
        ["src/server/app.ts", "src/server/map-routes.ts", "src/server/conversation-preferences.ts", "src/server/theme-preference-routes.ts", "src/server/browser-binding.ts", "migrations/023_conversation_preferences.sql", "migrations/026_theme_preferences.sql"],
        "A member may read or change only their own preferences; removed members cannot use household conversation settings.",
        "Browser-bound session supplies user ID; map preferences also require household access. Both POST routes check Origin; SQL binds user ID and schemas reject owner fields."
    ),
    "src/server/policy-contact-routes.ts#operator-policy-contact": (
        "hunter_settings",
        ["src/server/app.ts", "src/server/policy-contact-routes.ts", "src/server/households.ts", "src/server/config.ts", "src/server/auth.ts", "src/server/browser-binding.ts", "src/server/login-methods.ts", "migrations/033_storage_consent.sql", "docs/operations/installation.md", "docs/operations/operator-upgrade-notes.md"],
        "Only configured installation provider and subject may change public policy contact.",
        "POST requires browser-bound session, Origin, strict email, and isFirstAdmin match to configured provider and subject; public GET returns only singleton contact."
    ),
    "scripts/model-evaluation/evaluate.ts#report-emission": (
        "hunter_model_report",
        ["scripts/model-evaluation/evaluate.ts", "scripts/model-evaluation/report.ts", "scripts/model-evaluation/public-output.ts", "scripts/model-evaluation/private-records.ts", "scripts/model-evaluation/publication.ts", "scripts/model-evaluation/observations.ts", "scripts/model-evaluation/types.ts", "scripts/model-evaluation/live.ts", "src/server/live-provider.ts", ".agents/skills/evaluate-models/references/run-support.md"],
        "Raw provider requests, responses, transcripts, and live session identities stay outside shareable evaluation artifacts.",
        "Private records are separate mode 0600 files; publishable paths list only reports. Public diagnostics reduce calls to metadata, transform text before JSON/Markdown, and reapply transformation before publication."
    ),
    "src/server/map-routes.ts#history-volume": (
        "hunter_history_volume",
        ["src/server/app.ts", "src/server/map-routes.ts", "src/server/map.ts", "src/server/map-operations.ts", "migrations/004_map.sql", "migrations/006_save_operations.sql"],
        "Ordinary map reads should have bounded server work as saved history grows.",
        "Saves append receipts without aggregate retention. With a deleted object, ordinary map read loads and parses every receipt; conflicts add a second pass. Shared-process effect unmeasured."
    ),
    "src/server/map-routes.ts#object-type-and-relationship-type-deletion": (
        "hunter_definition_usage",
        ["src/server/map-routes.ts", "src/server/map.ts", "src/server/content-identities.ts", "src/server/definition-usage.ts", "src/server/object-types.ts", "src/server/relationship-types.ts", "src/server/app.ts", "tests/unit/server/definition-removal.test.ts", "tests/integration/definition-removal.spec.ts"],
        "Type-removal response should not disclose another member's private draft state beyond product policy.",
        "Guard reads other household drafts and emits definition_in_use if one references or edits the type. Tests assert rejection and no private names, but policy for the type-use bit is unspecified."
    ),
    "scripts/install-repository-npm.mjs#bootstrap": (
        "hunter_npm_bootstrap",
        ["scripts/install-repository-npm.mjs", "package.json", "package-lock.json", ".npmrc", "Dockerfile", ".dockerignore", ".github/workflows/ci.yml", ".github/workflows/security.yml", ".github/workflows/release.yml", ".devcontainer/Dockerfile", "scripts/release/production-inputs.mjs"],
        "npm bootstrap selects reviewed exact version before dependency install and lower-trust input cannot redirect privileged toolchain.",
        "Bootstrap accepts exact npm version from package.json and checks installed version; Docker and CI invoke before npm ci, and release tracks script. npm itself is fetched outside project lockfile; no source-visible lower-trust redirect was established."
    ),
}

MULTI = {
    "src/client#rendered-household-data": (
        "hunter_client",
        [
            (
                ["src/client/App.tsx", "src/client/Assistants.tsx", "src/client/Costs.tsx", "src/client/CookieStorage.tsx", "src/client/MapHistory.tsx", "src/client/ObjectDialog.tsx", "src/client/SpatialObjectGlyph.tsx", "src/server/app.ts", "src/server/cost-estimates.ts", "src/server/policy-contact-routes.ts"],
                "Browser and household data must not reach an executable DOM or navigation sink.",
                "Values render through React escaping; variable URL components are encoded, policy email is validated, and the server sets script CSP."
            ),
            (
                ["src/client/App.tsx", "src/client/HouseholdErasure.tsx", "src/client/HouseholdImport.tsx", "src/client/browser-binding.ts", "src/client/login-offer.ts", "src/client/storage-consent.ts", "src/client/use-storage-preference.ts"],
                "Browser storage must not grant authority or carry household data between accounts.",
                "Persistent storage contains consent and login preferences; server state validates session references and account state resets on user change."
            ),
            (
                ["src/client/App.tsx", "src/client/browser-binding.ts", "src/client/session-activity.ts", "src/client/task-delivery.tsx", "src/client/use-storage-preference.ts"],
                "Cross-tab and delivery messages must not execute data or transfer authority.",
                "Broadcast messages cause authenticated refreshes; delivery text renders as React text and account changes clear connections."
            )
        ]
    ),
    ".github/workflows/release.yml#release": (
        "hunter_release",
        [
            (
                [".github/workflows/release.yml", ".github/workflows/ci.yml", ".github/workflows/security.yml", "scripts/release/restore.mjs"],
                "Lower-trust workflow artifacts must not become privileged publication inputs.",
                "Publish requires successful plan, checks, and candidate jobs; restored artifacts come from the same workflow run."
            ),
            (
                ["scripts/release/plan.mjs", "scripts/release/candidate.mjs", "scripts/release/github-release.mjs", "GitVersion.yml", "docs/operations/container-releases.md"],
                "Release evidence must bind checked source, version, digest, and attestation identity.",
                "Plan binds version to triggering commit; OCI inspection checks blobs and labels; publication checks attestations and conflicting assets."
            ),
            (
                ["scripts/release/deploy.mjs", "scripts/release/deployment-changes.mjs", "scripts/release/production-inputs.mjs", "Dockerfile", ".dockerignore"],
                "Deployment must use the authorized published digest and verify the running result.",
                "Main-branch deployment restores release evidence and checks commit, image digest, running identity, and readiness."
            )
        ]
    ),
    "src/server/conversation-consent-routes.ts#consent": (
        "hunter_consent_spend",
        [
            (
                ["src/server/conversation-consent-routes.ts", "src/server/conversation-consent.ts", "src/server/text-assistant.ts", "src/server/text-assistant-mcp.ts", "src/server/voice-assistant.ts"],
                "Consent revocation must end active conversations and invalidate existing grants.",
                "Revoke deletes consent and connections, ends matching in-process conversations, and message and voice guards recheck surviving connection state."
            ),
            (
                ["docs/operations/installation.md", "docs/operations/render.md"],
                "A cross-process revocation claim must apply to a supported deployment.",
                "The documented installation has one Node application on local SQLite, and Render requires one instance without autoscaling."
            )
        ]
    ),
    "src/server/text-assistant.ts#conversation-admission": (
        "hunter_consent_spend",
        [
            (
                ["src/server/text-assistant.ts", "src/server/app.ts", "src/server/text-assistant-mcp.ts"],
                "Completed messages must have bounded retained memory in the shared server process.",
                "The 200-item cap counts pending and active work only; completed accepted entries persist and each result copies growing task and reply lists."
            ),
            (
                ["src/server/text-assistant-model.ts", "src/server/model-client.ts", "src/server/voice-assistant.ts", "src/server/conversation-capacity.ts", "src/server/costs.ts"],
                "Provider work and spend accounting shape the shared-resource boundary.",
                "Text turns have a 48-step bound and record attempts; context summaries do not evict completed entries. No demonstrated cost-budget violation was established."
            )
        ]
    )
    ,
    "src/server/map-routes.ts#personal-view": (
        "hunter_personal",
        [
            (
                ["src/server/map-routes.ts", "src/server/map.ts", "src/server/households.ts", "src/server/content-identities.ts"],
                "Personal view identity must derive from the authenticated actor and current household membership.",
                "The route derives user ID from the session; householdMap rechecks membership and content binding. No caller supplied identity is accepted."
            ),
            (
                ["src/server/personal-view.ts", "src/server/view-settings-schema.ts", "src/server/map.ts"],
                "Positions and settings must be scoped to the actor and visible map objects.",
                "The transaction resolves the owner through householdMap.read, binds household and user IDs, limits positions to shared or own drafts, and validates settings schema."
            )
        ]
    ),
    "scripts/security/check-results.mjs#scanner-results": (
        "hunter_security_gates",
        [
            (
                ["scripts/security/check-results.mjs", "scripts/security/container-policy.mjs", "scripts/security/scan-running-image.sh", "scripts/security/__tests__/check-results.test.mjs", ".github/security-exceptions.json", ".github/grype.yaml"],
                "Missing scanner evidence and unexcepted High or Critical image findings must block policy success.",
                "The policy requires named job success, validates CodeQL and Trivy evidence, blocks High ZAP alerts, and checks image identity, database age, and exceptions for Grype. Tests inspected but not executed."
            ),
            (
                [".github/workflows/security.yml", ".github/workflows/ci.yml", ".github/workflows/release.yml"],
                "A failed scanner job must propagate through aggregate CI before release publication.",
                "Security gates require all scanner jobs; CI requires application, devcontainer, and security jobs; release checks retained Grype and ZAP evidence."
            )
        ]
    ),
    "src/server/assistant-routes.ts#oauth-consent": (
        "hunter_oauth",
        [
            (
                ["src/server/app.ts", "src/server/auth.ts", "src/server/browser-binding.ts"],
                "OAuth authorization and consent must use a browser-bound session.",
                "Authorization removes the cookie if browser binding rejects it; handlers receive session lookup that requires a confirmed binding."
            ),
            (
                ["src/server/assistant-auth.ts", "src/server/assistant-routes.ts", "src/server/households.ts", "tests/unit/server/assistants.test.ts"],
                "Assistant grant must bind user, household, client, scope, and later MCP use to the same consent.",
                "Consent checks session, Origin, approvals, membership, and enabled client; grant ID reaches provider through AsyncLocalStorage. Token and MCP claims match grant, user, client, issuer, audience, read scope, and current membership. Installed provider internals were unavailable."
            )
        ]
    ),
    "src/server/app.ts#authentication-cleanup": (
        "hunter_auth_cleanup",
        [
            (
                ["src/server/app.ts", "src/server/authentication-cleanup.ts", "src/server/browser-binding.ts", "src/server/text-assistant.ts", "docs/operations/authentication.md"],
                "Expired sessions and bindings must stop authorizing requests and work, while finite tasks retain only their stop link until deadline.",
                "Cleanup removes expired bindings unless a private task has a future deadline; session and text-work guards independently recheck session, binding, task, and membership."
            ),
            (
                ["src/server/authentication-cleanup.ts", "src/server/assistant-auth.ts", "src/server/assistant-routes.ts", "src/server/text-assistant-mcp.ts"],
                "Previous-process private grants and expired tasks must lose tokens and connection while external grants stay scoped.",
                "Startup transactionally removes private connections, tokens, and consent before requests; periodic cleanup sweeps expired and orphaned records. MCP requires a positive connection and membership."
            )
        ]
    ),
    "src/server/text-assistant.ts#cached-tool-read": (
        "hunter_assistant_cache",
        [
            (
                ["src/server/assistant-read-cache.ts", "src/server/text-assistant.ts", "src/server/text-assistant-mcp.ts", "src/server/assistant-routes.ts"],
                "A cached read stays scoped to the household, content owner, conversation, and live MCP connection.",
                "Cache is per conversation with fixed household and owner; call wrapper checks current connection, task, and owner before and after reuse. Reset clears cache."
            ),
            (
                ["src/server/assistant-read-cache.ts", "src/server/assistant-work.ts", "src/server/map.ts", "src/server/map-operations.ts", "src/server/relationships.ts", "src/server/content-maintenance.ts", "src/server/erase-household-content.ts", "tests/unit/server/assistant-read-cache.test.ts"],
                "Changes to shared, draft, history, replacement, or erased data invalidate cached reads.",
                "Read stamps bind content version, entity revisions, draft and operation versions/status, and history IDs; mutations update dependencies, and cache compares stamps around loads."
            ),
            (
                ["src/server/assistant-read-cache.ts", "src/server/text-assistant.ts", "src/server/text-assistant-mcp.ts", "src/server/assistant-routes.ts"],
                "Cached content cannot bypass live authorization or become durable cross-session memory.",
                "Only successful named reads are cached, under 128 entries and 4 MiB; live checks wrap hits and conversation reset clears entries."
            )
        ]
    ),
    "src/server/map.ts#removed-definition-restoration": (
        "hunter_definition_restore",
        [
            (
                ["src/server/map-routes.ts", "src/server/map.ts", "src/shared/conflict-special.ts", "src/shared/definition-restoration.ts", "src/server/object-types.ts", "src/server/relationship-types.ts", "src/server/definition-restoration.ts", "src/server/map-tombstones.ts"],
                "A member can grant restoration only for a current removed definition in that household and private draft.",
                "Route derives actor; householdMap binds membership and draft owner. Conflict resolution checks basis and removed definition; grant checks tombstone, revision, and generation."
            ),
            (
                ["src/server/map.ts", "src/server/object-types.ts", "src/server/relationship-types.ts", "src/server/definition-restoration.ts", "src/server/map-tombstones.ts", "src/server/content-maintenance.ts", "src/server/project-content-scope.ts", "src/server/import-replacement.ts"],
                "Save must recheck tombstone and content generation; archive import cannot replay a grant.",
                "Immediate save transaction reauthorizes actor and checks unchanged row, tombstone, revision, definition, household, and generation. Rejection rolls back, import strips restoration authority."
            )
        ]
    ),
    "src/server/text-assistant.ts#conversation-summary": (
        "hunter_summary",
        [
            (
                ["src/server/conversation-summary.ts", "src/server/text-assistant.ts", "src/server/text-assistant-model.ts"],
                "Historical summary stays in its conversation and cannot authorize a save or another member's draft.",
                "Summarizer has no tools and store:false; installation checks session, revision, revocation, login, membership, and draft. Save intent derives from current admitted message."
            ),
            (
                ["src/server/conversation-summary.ts", "src/server/text-assistant.ts", "src/server/voice-assistant.ts"],
                "Failed, canceled, or superseded summary cannot install stale context across voice handoff.",
                "Incomplete, blank, oversized, or tool-call output is rejected. Guard checks follow responses; reset and stop abort work, while voice handoff waits for checked delegate work."
            )
        ]
    ),
    "src/server/voice-work.ts#spoken-answer": (
        "hunter_voice_commentary",
        [
            (
                ["src/server/voice-work.ts", "src/server/voice-commentary.ts", "src/server/text-assistant.ts", "src/server/assistant-instructions.ts", "tests/unit/server/voice-commentary.test.ts", "tests/unit/server/voice-typed-delivery.test.ts"],
                "Required notice and verified result remain distinct, and speech instruction waits for all part acknowledgments.",
                "Notice is stored apart from model reply; completion orders notice, result, question. Commentary labels sections, quotes model text as data, registers parts before sending, and releases speech only after all acknowledgments. Source tests inspected, not executed."
            ),
            (
                ["src/server/voice-work.ts", "src/server/voice-assistant.ts", "src/client/use-voice.ts"],
                "Spoken response stays bound to current authenticated conversation; transport acknowledgment is not proof of audible delivery.",
                "Route and work guard access and generation; browser separately checks transcript against observed audio. Provider speech behavior is external."
            )
        ]
    ),
    "src/server/upgrade-legacy-login.ts#maintenance-entry": (
        "hunter_legacy_upgrade",
        [
            (
                ["src/server/upgrade-legacy-login.ts", "src/server/legacy-login-upgrade.ts", "src/server/database.ts", "src/server/config.ts", "migrations/032_installation_authority.sql", "docs/operations/login-upgrade.md", "docs/operations/database-restore.md", "tests/unit/server/legacy-login-upgrade-command.test.ts"],
                "Only declared offline transition of an existing unfenced installation can adopt generation; restore declaration and repeat adoption fail.",
                "Command requires two flags, rejects restore declaration and missing database; exclusive transaction refuses existing authority and inserts singleton generation after invalidation. Service stop is a documented operator precondition."
            ),
            (
                ["src/server/legacy-login-upgrade.ts", "src/server/installation-authority.ts", "src/server/auth.ts", "src/server/index.ts", "docs/operations/login-upgrade.md", "tests/unit/server/legacy-login-upgrade.test.ts"],
                "Old sessions, callbacks, tokens, grants, and signing keys lose authority after adoption while content survives fresh sign-in.",
                "Adoption invalidates auth artifacts transactionally; normal startup prepares generation before serving. Source tests cover old cookies, callbacks and fresh sign-in; not executed."
            )
        ]
    ),
    "src/server/text-assistant.ts#recover-and-revoke": (
        "hunter_save_recovery",
        [
            (
                ["src/server/text-assistant.ts", "src/server/conversation-consent-routes.ts", "src/server/conversation-consent.ts", "src/server/assistant-work.ts"],
                "Consent revocation stops new assistant work while only an existing registered save attempt may complete.",
                "Revocation removes consent and connection, then checks only pending save IDs before stop. Registration requires current explicit save intent and guard checks."
            ),
            (
                ["src/server/save-check.ts", "src/server/map-operations.ts", "src/server/map.ts", "src/server/households.ts"],
                "Recovery cannot select another actor's attempt, replay changed draft, or save after membership loss.",
                "checkSaves reads actor's current-content operations. Lookup binds household, owner, ID, version; save checks draft hash and membership in immediate transactions and returns existing receipt on replay."
            )
        ]
    ),
    "src/server/map-routes.ts#relationship-form": (
        "hunter_relationship_attempt",
        [
            (
                ["src/server/map-routes.ts", "src/server/map.ts", "src/server/households.ts", "src/server/content-identities.ts", "src/server/relationship-form-attempts.ts"],
                "Replay and outcome lookup stay bound to actor, household, content generation, and exact submission.",
                "Route derives actor and membership; lookup binds household, user, generation, and staging ID. Different submission under same ID rejects; matching replay returns prior outcome."
            ),
            (
                ["src/server/map.ts", "src/server/relationship-form-attempts.ts", "src/server/relationships.ts", "src/server/map-operations.ts", "migrations/025_relationship_form_attempts.sql"],
                "New form submission checks versions, endpoints, type, duplicates, and pending operation, with atomic draft and outcome.",
                "Authorized immediate transaction performs checks and records draft effect with attempt; primary key blocks duplicate records and generation changes delete attempts."
            ),
            (
                ["src/client/RelationshipForm.tsx"],
                "Historic outcome is not presented as current draft success after draft changes.",
                "Client compares attempt ID, user, generation, and current draft value before declaring completion; changed value yields review message."
            )
        ]
    ),
    "src/server/database.ts#startup-migration": (
        "hunter_startup_migration",
        [
            (
                ["src/server/database.ts", "src/server/installation-authority.ts", "tests/unit/server/preview-content-reset.test.ts"],
                "Legacy preview reset requires exact eligible history, schema, keys, and authority.",
                "Verification requires matching 33 or 34 migrations, reconstructed schema, generation, and foreign keys; writer rechecks under immediate transaction. Source tests inspected only."
            ),
            (
                ["src/server/database.ts", "migrations/015_content_maintenance.sql", "migrations/034_map_backgrounds.sql", "docs/operations/operator-upgrade-notes.md", "tests/unit/server/preview-content-reset.test.ts"],
                "Reset removes specified content atomically, retains intended settings, and cannot partially migrate.",
                "Reset retires operations and advances generation; migrations, FK check, and format marker share transaction. Failure rolls back; marker prevents repeat."
            ),
            (
                ["src/server/index.ts", "src/server/auth.ts", "src/server/database.ts"],
                "Listener cannot serve before migration and authority preparation succeed.",
                "index migrates before constructing auth or app and only starts listener after auth schema verification; startup failure exits."
            )
        ]
    ),
    "scripts/model-evaluation/evaluate.ts#evaluateModels": (
        "hunter_eval_budget",
        [
            (
                ["scripts/model-evaluation/evaluate.ts", "scripts/model-evaluation/environment.ts", "scripts/model-evaluation/judge.ts", "scripts/model-evaluation/runner.ts", "scripts/model-evaluation/voice-runner.ts", "src/server/text-assistant-model.ts", "docs/development/testing.md", ".agents/skills/evaluate-models/references/run-support.md"],
                "Billable evaluation requires authorized agent plan and synthetic scenarios, without private application data crossing to provider.",
                "evaluateModels requires authorization, credential, local evidence, model/profile; fresh installation uses checked-in fixtures. Judge receives scenario state and response; calls use store:false."
            ),
            (
                ["scripts/model-evaluation/evaluate.ts", "scripts/model-evaluation/provider.ts", "scripts/model-evaluation/budget.ts", "scripts/model-evaluation/live.ts", "scripts/model-evaluation/voice-runner.ts", "src/server/voice-assistant.ts"],
                "Provider dispatch reserves maximum charge persistently and unknown usage cannot release hold.",
                "Adapter validates endpoint, model, tier, effort, output and count before reservation; SQLite transactionally inserts holds. Unknown usage stops ledger; voice sessions and startup are time bounded."
            ),
            (
                ["scripts/model-evaluation/evaluate.ts", "scripts/model-evaluation/private-records.ts", "scripts/model-evaluation/report.ts"],
                "Raw payloads and observations stay local while shareable reports exclude them.",
                "Recorder writes private compressed files; report copy drops request and response text, keeping selected metadata and tool-call IDs."
            )
        ]
    ),
}

SPECIAL = {
    "src/server/relationship-form-attempts.ts#retained-submission-volume": (
        "hunter_attempt_volume",
        [
            (
                ["src/server/app.ts", "src/server/map-routes.ts", "src/server/map.ts", "src/server/relationships.ts", "src/server/relationship-form-attempts.ts", "src/server/properties.ts", "src/server/client-address.ts"],
                "Repeated completed duplicate submissions should have bounded aggregate storage cost.",
                "Fresh IDs reach duplicate branch without draft change, then retain full request including ignored top-level padding. Individual body cap is 2 MB; no aggregate quota or form rate limit is visible."
            ),
            (
                ["migrations/025_relationship_form_attempts.sql", "src/server/import-replacement.ts", "src/server/erase-household-content.ts"],
                "Attempt evidence should be reclaimed in ordinary use before shared SQLite storage is consumed.",
                "Table has no count, age, or byte constraint; cleanup follows content generation change, replacement, or erasure, not routine duplicate submissions."
            )
        ],
        "relationship-form-unbounded-attempt-retention"
    ),
}

ledger = json.loads(LEDGER.read_text())
for unit in ledger:
    surface = unit["canonical_refs"]["surface"]
    boundary = unit["canonical_refs"]["boundary"]
    if boundary in SPECIAL:
        if unit["status"] in ("covered", "candidate", "blocked"):
            continue
        agent_id, items, fingerprint = SPECIAL[boundary]
        assert unit["status"] == "in_progress" and unit["agent_id"] == agent_id
        checks = [{"agent_id": agent_id, "reviewed_paths": paths, "invariant": invariant, "method": "source", "result": result, "artifact": None} for paths, invariant, result in items]
        unit["status"] = "candidate"
        unit["local_checks"] = checks
        unit["reviewed_paths"] = sorted({path for check in checks for path in check["reviewed_paths"]})
        unit["result_fingerprints"] = [fingerprint]
        unit["unresolved"] = ["Deployed ingress and disk limits and service response to storage exhaustion are not established.", "Sandbox requirements block a bounded local dummy-data check."]
        continue
    if surface in MULTI:
        if unit["status"] in ("covered", "candidate", "blocked"):
            continue
        agent_id, items = MULTI[surface]
        assert unit["status"] == "in_progress" and unit["agent_id"] == agent_id
        checks = [{
            "agent_id": agent_id,
            "reviewed_paths": paths,
            "invariant": invariant,
            "method": "source",
            "result": result,
            "artifact": None
        } for paths, invariant, result in items]
        unit["status"] = "candidate" if surface == "src/server/text-assistant.ts#conversation-admission" else "blocked" if surface == "src/server/assistant-routes.ts#oauth-consent" else "covered"
        unit["local_checks"] = checks
        unit["reviewed_paths"] = sorted({path for check in checks for path in check["reviewed_paths"]})
        if surface == "src/server/text-assistant.ts#conversation-admission":
            unit["result_fingerprints"] = ["text-assistant-completed-result-quadratic-retention"]
            unit["unresolved"] = [
                "The required sandbox was unavailable for a bounded memory observation.",
                "The shared-process effect under a supported memory limit remains unknown."
            ]
            unit["hardening"] = [
                "No cumulative per-member provider spend cap is source-visible; no defined budget boundary or observed impact was established.",
                "A future multi-instance deployment would need durable consent revocation generation checks."
            ]
        if surface == "src/server/assistant-routes.ts#oauth-consent":
            unit["unresolved"] = [
                "The installed @better-auth/oauth-provider package is absent locally, so signed oauth_query, duplicate parameters, consent scope, and code binding internals were not inspected.",
                "The required sandbox and artifact promotion controls were not verified, so existing tests were not executed."
            ]
        if surface == "src/server/text-assistant.ts#conversation-summary":
            unit["hardening"] = [
                "historicalSummary puts model-generated text in an assistant-role message with an untrusted marker in JSON content; an explicit provenance label could reduce model confusion, but no separate boundary effect was established."
            ]
        continue
    if surface not in RESULTS:
        continue
    agent_id, paths, invariant, result = RESULTS[surface]
    if unit["status"] in ("covered", "candidate"):
        continue
    assert unit["status"] == "in_progress" and unit["agent_id"] == agent_id
    unit["status"] = "candidate" if surface in ("src/server/text-assistant.ts#text-message", "src/server/database.ts#startup", "src/server/map-routes.ts#history-volume", "src/server/map-routes.ts#object-type-and-relationship-type-deletion") else "covered"
    unit["reviewed_paths"] = paths
    unit["local_checks"] = [{
        "agent_id": agent_id,
        "reviewed_paths": paths,
        "invariant": invariant,
        "method": "source",
        "result": result,
        "artifact": None
    }]
    if surface == "src/server/text-assistant.ts#text-message":
        unit["result_fingerprints"] = ["text-assistant/shared-map-to-private-draft-action-binding"]
        unit["unresolved"] = [
            "Whether saved map text can induce an unrequested model proposal affecting another member's private draft.",
            "The required local execution sandbox and artifact promotion were not verified."
        ]
    if surface == "src/server/database.ts#startup":
        unit["result_fingerprints"] = ["installation.restore.reinstates-revoked-membership"]
        unit["unresolved"] = [
            "The required sandbox was unavailable for a dummy restore access check.",
            "Operator reconciliation of post-backup role and membership changes is not established by the repository."
        ]
    if surface == "src/server/map-routes.ts#history-volume":
        unit["result_fingerprints"] = ["map-read.full-history-materialization"]
        unit["unresolved"] = [
            "A bounded dummy-database growth check cannot run without the required sandbox and promotion controls.",
            "Actual receipt volume, concurrency, memory, and ingress limits are outside source."
        ]
    if surface == "src/server/map-routes.ts#object-type-and-relationship-type-deletion":
        unit["result_fingerprints"] = ["map.definition-removal.private-draft-type-oracle"]
        unit["unresolved"] = [
            "Product privacy contract does not establish whether another member's type-use bit is confidential.",
            "A bounded two-member observation is blocked by the unverified sandbox requirements."
        ]
        unit["hardening"] = [
            "otherDrafts includes drafts retained after membership revocation; existing tests deliberately preserve these for rejoining, so no separate security claim was established."
        ]
    if surface == "scripts/install-repository-npm.mjs#bootstrap":
        unit["hardening"] = [
            "The npm bootstrap fetches npm@12.0.2 without a repository-held artifact digest; pinning an independent digest would strengthen provenance, though no exploitable source-visible handoff was established."
        ]
    if surface == "src/server/profile-image-routes.ts#upload":
        unit["hardening"] = [
            "Potential functional image-read defect at src/server/profile-images.ts:57: d.userId appears outside the subquery defining d; no security outcome established."
        ]

LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n")
