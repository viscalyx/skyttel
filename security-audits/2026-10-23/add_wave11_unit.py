import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
refs = {
    'surface': 'scripts/model-evaluation/evaluate.ts#evaluateModels',
    'boundary': 'scripts/model-evaluation/provider.ts#budgetedProvider',
    'subsystem': 'scripts/model-evaluation',
    'attack_class': 'ATTACK-CLASSES.md#Feature abuse and data leakage',
}
coverage_id = '::'.join(quote(v, safe='-._~') for v in refs.values())
if coverage_id not in {u['coverage_id'] for u in ledger}:
    ledger.append({
        'coverage_id': coverage_id, 'canonical_refs': refs,
        'surface': 'Model evaluation provider egress and budget',
        'boundary': refs['boundary'], 'subsystem': refs['subsystem'], 'attack_class': refs['attack_class'],
        'starting_paths': ['scripts/model-evaluation/evaluate.ts', 'scripts/model-evaluation/provider.ts', 'scripts/model-evaluation/live.ts', 'scripts/model-evaluation/budget.ts', 'scripts/model-evaluation/runner.ts', 'scripts/model-evaluation/voice-runner.ts'],
        'ordinary_attack_class_block': refs['attack_class'],
        'selected_companion_blocks': ['AI-AND-LLM.md#Core discipline', 'AI-AND-LLM.md#Output and disclosure attack classes', 'AI-AND-LLM.md#Validation rules', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes', 'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules'],
        'excluded_blocks': [{'block': 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline', 'reason': 'Evaluation provider calls use HTTP and WebRTC, without native app IPC.'}],
        'prior_status': 'none', 'attempts': [], 'wave': 11, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 10.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
