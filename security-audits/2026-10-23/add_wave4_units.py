import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
specs = [
    ('src/server/app.ts#authentication-cleanup', 'src/server/authentication-cleanup.ts#startup-and-periodic-revocation', 'src/server/auth', 'Background authentication cleanup', 'ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries', ['src/server/app.ts', 'src/server/authentication-cleanup.ts', 'src/server/browser-binding.ts', 'src/server/assistant-auth.ts'], ['WEB-PROTOCOL-AND-AUTH.md#Core discipline', 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves', 'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules']),
    ('src/server/text-assistant.ts#cached-tool-read', 'src/server/assistant-read-cache.ts#reuse-and-invalidation', 'src/server/assistant', 'Assistant read-cache reuse and invalidation', 'ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries', ['src/server/assistant-read-cache.ts', 'src/server/text-assistant.ts', 'src/server/text-assistant-mcp.ts'], ['AI-AND-LLM.md#Core discipline', 'AI-AND-LLM.md#Context, retrieval, and memory attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes', 'AI-AND-LLM.md#Universal moves', 'AI-AND-LLM.md#Validation rules']),
    ('src/server/policy-contact-routes.ts#operator-policy-contact', 'src/server/households.ts#isFirstAdmin', 'src/server/installation', 'Operator policy contact authority', 'ATTACK-CLASSES.md#Access control', ['src/server/app.ts', 'src/server/policy-contact-routes.ts', 'src/server/households.ts', 'src/server/config.ts'], ['WEB-PROTOCOL-AND-AUTH.md#Core discipline', 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes', 'WEB-PROTOCOL-AND-AUTH.md#Universal moves', 'WEB-PROTOCOL-AND-AUTH.md#Validation rules']),
    ('src/server/map-routes.ts#conversation-preferences-and-theme-preference', 'src/server/conversation-preferences.ts#per-user-settings', 'src/server/preferences', 'Member conversation and theme preferences', 'ATTACK-CLASSES.md#Access control', ['src/server/map-routes.ts', 'src/server/conversation-preferences.ts', 'src/server/theme-preference-routes.ts', 'src/server/app.ts'], ['WEB-PROTOCOL-AND-AUTH.md#Core discipline', 'WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes', 'WEB-PROTOCOL-AND-AUTH.md#Universal moves', 'WEB-PROTOCOL-AND-AUTH.md#Validation rules']),
]
existing = {u['coverage_id'] for u in ledger}
for surface, boundary, subsystem, label, attack, paths, blocks in specs:
    refs = {'surface': surface, 'boundary': boundary, 'subsystem': subsystem, 'attack_class': attack}
    coverage_id = '::'.join(quote(value, safe='-._~') for value in refs.values())
    if coverage_id in existing:
        continue
    ledger.append({
        'coverage_id': coverage_id, 'canonical_refs': refs, 'surface': label, 'boundary': boundary,
        'subsystem': subsystem, 'attack_class': attack, 'starting_paths': paths,
        'ordinary_attack_class_block': attack, 'selected_companion_blocks': blocks,
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'No native desktop, mobile, or local IPC application entry is source visible.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 4, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 3.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
