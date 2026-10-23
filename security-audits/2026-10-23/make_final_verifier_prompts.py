import json
from pathlib import Path

run = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1')
skill = Path('/Users/johlju/source/skyttel/.agents/skills/security-audit')
ledger = json.loads((run / 'coverage-ledger.json').read_text())
records = json.loads((run / 'findings.json').read_text())
schema = json.loads((skill / 'report-schema.json').read_text())
validation = (skill / 'VALIDATION-AND-REPORTING.md').read_text()
phase5 = validation[validation.index('### Phase 5:'):validation.index('### Phase 6:')]

def section(contents, heading):
    lines = contents.splitlines(keepends=True)
    start = next(i for i, line in enumerate(lines) if line.startswith('## ') and line[3:].split(' (', 1)[0].strip() == heading)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith('## ')), len(lines))
    return ''.join(lines[start:end]).rstrip()

ids = {
    'text-assistant/shared-map-to-private-draft-action-binding': 'final_verify_ai',
    'installation.restore.reinstates-revoked-membership': 'final_verify_restore',
    'text-assistant-completed-result-quadratic-retention': 'final_verify_spend',
    'relationship-form-unbounded-attempt-retention': 'final_verify_attempt',
    'map-read.full-history-materialization': 'final_verify_history',
    'map.definition-removal.private-draft-type-oracle': 'final_verify_oracle',
}
for record in records:
    fingerprint = record['fingerprint']
    agent_id = ids[fingerprint]
    linked = [u for u in ledger if fingerprint in u['result_fingerprints']]
    assert linked
    agent_root = run / 'agents' / agent_id
    (agent_root / 'scratch').mkdir(parents=True, exist_ok=False)
    (agent_root / 'artifacts').mkdir(parents=True, exist_ok=False)
    blocks = []
    for block in sorted({b for u in linked for b in u['selected_companion_blocks'] if b.endswith('#Validation rules')}):
        file_name, heading = block.split('#', 1)
        blocks.append(section((skill / file_name).read_text(), heading))
    parts = [
        'You are a fresh independent final-record verifier. You did not hunt this lead or perform Phase 3 validation. Review the structured record from current source, not a hunter write-up. Source only: the parent has not verified all required OS sandbox and promotion controls. Do not execute target code, contact services, or write files. Return exactly one JSON object with either {"decision":"verified","fingerprint":"..."} or {"decision":"replace","reason":"...","record":{...}}, no prose.',
        '## Structured final record\n\n' + json.dumps(record, ensure_ascii=False, indent=2),
        '## Linked coverage map\n\n' + json.dumps([{'coverage_id':u['coverage_id'],'canonical_refs':u['canonical_refs'],'selected_companion_blocks':u['selected_companion_blocks']} for u in linked], ensure_ascii=False, indent=2),
        '## Relevant companion validation rules\n\n' + '\n\n'.join(blocks),
        '## Phase 5 method (verbatim)\n\n' + phase5,
        '## Exact schema branches\n\n' + json.dumps(schema['items']['oneOf'], ensure_ascii=False, indent=2),
        f'## Isolation\n\nAgent ID: {agent_id}. Scratch: {agent_root / "scratch"}. Parent-owned artifacts: {agent_root / "artifacts"}. Empty promotion allowlist. No target execution. Do not read other final verifier conclusions.',
    ]
    (agent_root / 'assignment.md').write_text('\n\n'.join(parts) + '\n')
