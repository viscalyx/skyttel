import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
specs = [
    ('src/server/database.ts#startup-migration', 'src/server/database.ts#migrate-and-preview-content-reset', 'src/server/installation', 'Startup database migration and preview reset', 'ATTACK-CLASSES.md#Business logic', ['src/server/database.ts', 'src/server/index.ts', 'docs/operations/operator-upgrade-notes.md'], ['DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline', 'DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules']),
    ('src/server/map-routes.ts#history-volume', 'src/server/map.ts#persistent-history-and-unbounded-read', 'src/server/map', 'Map save history and receipt accumulation', 'ATTACK-CLASSES.md#Resource and file handling', ['src/server/map-routes.ts', 'src/server/map.ts', 'migrations/004_map.sql'], ['RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules']),
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
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'The path uses the server and SQLite, not native app IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 9, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 8.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
