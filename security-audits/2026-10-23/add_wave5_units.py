import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
specs = [
    ('src/server/text-assistant.ts#conversation-summary', 'src/server/conversation-summary.ts#historicalSummary', 'src/server/assistant', 'Historical assistant summary context', 'ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries', ['src/server/conversation-summary.ts', 'src/server/text-assistant.ts', 'src/server/voice-assistant.ts'], ['AI-AND-LLM.md#Core discipline', 'AI-AND-LLM.md#Context, retrieval, and memory attack classes', 'AI-AND-LLM.md#Universal moves', 'AI-AND-LLM.md#Validation rules']),
    ('src/server/map.ts#removed-definition-restoration', 'src/server/definition-restoration.ts#grant-and-save', 'src/server/map', 'Removed definition restoration authority', 'ATTACK-CLASSES.md#Access control', ['src/server/definition-restoration.ts', 'src/server/object-types.ts', 'src/server/relationship-types.ts', 'src/server/map-tombstones.ts', 'src/server/map.ts'], ['DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline', 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves', 'DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules']),
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
        'prior_status': 'none', 'attempts': [], 'wave': 5, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 4.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
