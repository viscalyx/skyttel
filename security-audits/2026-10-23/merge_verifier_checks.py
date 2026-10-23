import json
from pathlib import Path

run = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1')
ledger_path = run / 'coverage-ledger.json'
ledger = json.loads(ledger_path.read_text())
records = json.loads((run / 'findings.json').read_text())
agents = {
    'text-assistant/shared-map-to-private-draft-action-binding': 'verifier_ai',
    'installation.restore.reinstates-revoked-membership': 'verifier_restore',
    'text-assistant-completed-result-quadratic-retention': 'verifier_spend',
    'relationship-form-unbounded-attempt-retention': 'verifier_attempt_volume',
    'map-read.full-history-materialization': 'verifier_history_volume',
    'map.definition-removal.private-draft-type-oracle': 'verifier_definition_oracle',
}
for record in records:
    fingerprint = record['fingerprint']
    agent_id = agents[fingerprint]
    paths = sorted({entry['file'] for entry in [*record['trace'], *record['evidence']]})
    linked = [u for u in ledger if fingerprint in u['result_fingerprints']]
    assert linked
    for unit in linked:
        assert unit['status'] == 'candidate'
        assert all(c['agent_id'] != agent_id for c in unit['local_checks'])
        unit['local_checks'].append({
            'agent_id': agent_id,
            'reviewed_paths': paths,
            'invariant': f'Independently verify and try to refute candidate {fingerprint}.',
            'method': 'source',
            'result': f"Independent candidate verdict: {record['verdict']}. Source trace supports the hypothesis; decisive blockers remain: {'; '.join(record['blockers'])}",
            'artifact': None,
        })
        unit['reviewed_paths'] = sorted({p for check in unit['local_checks'] for p in check['reviewed_paths']})
        unit['unresolved'] = record['blockers']
        unit['candidate_decision'] = record['verdict']
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
