import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
specs = [
    ('src/server/map-routes.ts#relationship-form', 'src/server/relationship-form-attempts.ts#replay-and-outcome', 'src/server/map', 'Relationship form attempt replay', 'ATTACK-CLASSES.md#Business logic', ['src/server/map-routes.ts', 'src/server/map.ts', 'src/server/relationship-form-attempts.ts', 'migrations/025_relationship_form_attempts.sql'], ['PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes']),
    ('src/server/text-assistant.ts#recover-and-revoke', 'src/server/save-check.ts#checkSaves', 'src/server/assistant', 'Assistant pending save recovery and revocation', 'ATTACK-CLASSES.md#Business logic', ['src/server/text-assistant.ts', 'src/server/save-check.ts', 'src/server/map-operations.ts', 'src/server/map.ts'], ['PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes', 'AI-AND-LLM.md#Tool and action attack classes']),
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
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'The path uses HTTP, process state, and SQLite, with no native desktop or mobile IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 8, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 7.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
