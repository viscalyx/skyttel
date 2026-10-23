import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
refs = {
    'surface': 'src/server/map-routes.ts#relationship-form',
    'boundary': 'src/server/relationship-form-attempts.ts#retained-submission-volume',
    'subsystem': 'src/server/map',
    'attack_class': 'ATTACK-CLASSES.md#Resource and file handling',
}
coverage_id = '::'.join(quote(v, safe='-._~') for v in refs.values())
if coverage_id not in {u['coverage_id'] for u in ledger}:
    ledger.append({
        'coverage_id': coverage_id, 'canonical_refs': refs,
        'surface': 'Relationship form retained submission volume',
        'boundary': refs['boundary'], 'subsystem': refs['subsystem'], 'attack_class': refs['attack_class'],
        'starting_paths': ['src/server/app.ts', 'src/server/map-routes.ts', 'src/server/relationship-form-attempts.ts', 'migrations/025_relationship_form_attempts.sql'],
        'ordinary_attack_class_block': refs['attack_class'],
        'selected_companion_blocks': ['RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules'],
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'The form uses HTTP and SQLite, not native app IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 9, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Hunter uncovered a separate authenticated storage-volume boundary.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
