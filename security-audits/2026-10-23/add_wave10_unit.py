import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
refs = {
    'surface': 'src/server/map-routes.ts#object-type-and-relationship-type-deletion',
    'boundary': 'src/server/definition-usage.ts#otherDrafts',
    'subsystem': 'src/server/map',
    'attack_class': 'ATTACK-CLASSES.md#Feature abuse and data leakage',
}
coverage_id = '::'.join(quote(v, safe='-._~') for v in refs.values())
if coverage_id not in {u['coverage_id'] for u in ledger}:
    ledger.append({
        'coverage_id': coverage_id, 'canonical_refs': refs,
        'surface': 'Cross-member type deletion usage check', 'boundary': refs['boundary'],
        'subsystem': refs['subsystem'], 'attack_class': refs['attack_class'],
        'starting_paths': ['src/server/map-routes.ts', 'src/server/object-types.ts', 'src/server/relationship-types.ts', 'src/server/definition-usage.ts'],
        'ordinary_attack_class_block': refs['attack_class'],
        'selected_companion_blocks': ['DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline', 'DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules'],
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'The path uses HTTP and SQLite without native IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 10, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 9.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
