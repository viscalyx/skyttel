import json
from pathlib import Path
from urllib.parse import quote

ledger_path = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger = json.loads(ledger_path.read_text())
specs = [
    ('src/server/upgrade-legacy-login.ts#maintenance-entry', 'src/server/legacy-login-upgrade.ts#adoptLegacyInstallationAuthority', 'src/server/installation', 'Offline legacy-login authority upgrade', 'ATTACK-CLASSES.md#Access control', ['src/server/upgrade-legacy-login.ts', 'src/server/legacy-login-upgrade.ts', 'docs/operations/login-upgrade.md'], ['DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline', 'DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes', 'DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes', 'WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes']),
    ('scripts/model-evaluation/evaluate.ts#report-emission', 'scripts/model-evaluation/report.ts#public-artifacts', 'scripts/model-evaluation', 'Model evaluation public artifact disclosure', 'ATTACK-CLASSES.md#Feature abuse and data leakage', ['scripts/model-evaluation/evaluate.ts', 'scripts/model-evaluation/report.ts', 'scripts/model-evaluation/public-output.ts', 'scripts/model-evaluation/private-records.ts', 'scripts/model-evaluation/publication.ts'], ['AI-AND-LLM.md#Core discipline', 'AI-AND-LLM.md#Output and disclosure attack classes', 'AI-AND-LLM.md#Validation rules', 'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline']),
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
        'prior_status': 'none', 'attempts': [], 'wave': 7, 'status': 'planned', 'agent_id': None,
        'reviewed_paths': [], 'local_checks': [], 'result_fingerprints': [], 'unresolved': [],
        'discovery_reason': 'Accepted source-backed missing unit from post-wave critic 6.',
    })
ledger.sort(key=lambda u: u['coverage_id'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
