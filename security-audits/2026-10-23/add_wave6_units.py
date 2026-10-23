import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
refs = {
    'surface': 'src/server/voice-work.ts#spoken-answer',
    'boundary': 'src/server/voice-commentary.ts#provider-commentary-and-instructions',
    'subsystem': 'src/server/assistant',
    'attack_class': 'ATTACK-CLASSES.md#Feature abuse and data leakage',
}
coverage_id = '::'.join(quote(value, safe='-._~') for value in refs.values())
if coverage_id not in {u['coverage_id'] for u in ledger}:
    ledger.append({
        'coverage_id': coverage_id, 'canonical_refs': refs,
        'surface': 'Voice spoken answer and required notice ordering',
        'boundary': refs['boundary'], 'subsystem': refs['subsystem'],
        'attack_class': refs['attack_class'],
        'starting_paths': ['src/server/voice-work.ts', 'src/server/voice-commentary.ts', 'tests/unit/server/voice-commentary.test.ts'],
        'ordinary_attack_class_block': refs['attack_class'],
        'selected_companion_blocks': [
            'AI-AND-LLM.md#Core discipline', 'AI-AND-LLM.md#Output and disclosure attack classes',
            'AI-AND-LLM.md#Universal moves', 'AI-AND-LLM.md#Validation rules',
            'PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes',
        ],
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'The spoken-answer path uses a provider sideband, not native desktop or mobile IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 6, 'status': 'planned',
        'agent_id': None, 'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 5.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
