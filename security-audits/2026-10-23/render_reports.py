import json
from collections import Counter
from pathlib import Path

run = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1')
metadata = json.loads((run / 'run-metadata.json').read_text())
ledger = json.loads((run / 'coverage-ledger.json').read_text())
records = json.loads((run / 'findings.json').read_text())
counts = Counter(u['status'] for u in ledger)
assert counts == {'covered': 42, 'candidate': 6, 'blocked': 1}
assert all(r['verdict'] == 'needs_validation' for r in records)

def location(entry):
    return f"`{entry['file']}:{entry['line']}`"

def main_boundary(record):
    return location(record['trace'][-1])

def bullet_lines(values):
    return '\n'.join(f'- {v}' for v in values)

report = [
    '# Skyttel security audit',
    '',
    '## Run and result',
    '',
    f"- **Profile and scope:** {metadata['profile']} full-repository source audit of `{metadata['repo']}` at `{metadata['source_ref']['commit']}`. The worktree was already dirty in `{', '.join(metadata['source_ref']['dirty_paths_at_start'])}`. No target source was changed by this audit.",
    '- **Budget and review effort:** no user-set agent budget. Initial plan estimated 32 units, 14 hunter assignments, and four critic calls. The final ledger has 49 units; 30 focused hunter assignments, 14 critic passes, 12 candidate/final record reviews, and three delegated reconnaissance reviews were used (59 delegated calls total).',
    '- **Execution boundary:** source inspection only. No target builds, tests, provider calls, deployed probes, or billable voice/model suites ran. The required OS sandbox, including bounded scratch disk and race-safe artifact promotion, was not fully verified. Existing tests were inspected as source evidence only.',
    '- **Prior runs:** no compatible prior audit ledger or findings were available. No carried confirmations or changed-source revalidations.',
    '- **Coverage disposition:** 42 covered, 6 candidate, 1 blocked, 0 deferred, 0 out of scope. The final post-wave and distinct final-clean critics both returned no new units or reassignments.',
    '',
    '**No confirmed vulnerability was established.** Six source-grounded leads need bounded local or owner-observed validation. The source shows several strong controls: browser-bound sessions, current household membership checks inside map transactions, versioned draft/save operations, import bounds, authority rotation on restore, and release evidence gates. These controls do not resolve the six specific missing facts below.',
    '',
    '## Confirmed findings',
    '',
    '| Severity | Finding | Boundary | Observed result |',
    '| --- | --- | --- | --- |',
    '| — | None | — | No target behavior was executed or independently demonstrated. |',
    '',
    '## Needs validation',
    '',
    '| Lead | Source boundary | Decisive missing fact |',
    '| --- | --- | --- |',
]
short_blockers = {
    'installation.restore.reinstates-revoked-membership': 'Whether operators reconcile post-copy revocations before ingress opens.',
    'map-read.full-history-materialization': 'Whether full-history parsing materially affects shared service availability.',
    'map.definition-removal.private-draft-type-oracle': 'Whether a type-specific private-draft use bit is confidential by product policy.',
    'relationship-form-unbounded-attempt-retention': 'Whether deployed rate and disk limits allow shared-storage exhaustion.',
    'text-assistant-completed-result-quadratic-retention': 'Whether quadratic retained list entries affect shared-process memory or latency.',
    'text-assistant/shared-map-to-private-draft-action-binding': 'Whether saved map text actually induces an unrequested model proposal.',
}
for record in records:
    report.append(f"| {record['title']} | {main_boundary(record)} | {short_blockers[record['fingerprint']]} |")
report += [
    '',
    'Each lead has an exact source trace, blocker, and bounded validation plan in `NEEDS-VALIDATION.md`. None has a severity rating or is presented as a confirmed vulnerability.',
    '',
    '## Coverage limit',
    '',
    'The OAuth assistant-consent unit remains **blocked**: Skyttel’s source binds browser session, Origin, grant, client, scope, and current membership, but the installed `@better-auth/oauth-provider` package was absent. Its signed `oauth_query`, duplicate-parameter, consent-scope, and authorization-code internals could not be inspected. The existing tests could not run under the unverified sandbox. This is a review limit, not a finding.',
    '',
    'Important exclusions were native desktop/mobile IPC and memory-unsafe application code, neither of which is source-visible. Native dependencies were considered through image handling and supply-chain boundaries. Billable provider suites required explicit authorization and were not relevant to a source-only run.',
    '',
    '## Hardening notes',
    '',
    '- `scripts/install-repository-npm.mjs` fetches exact `npm@12.0.2` without a repository-held artifact digest. An independently pinned digest would strengthen toolchain provenance.',
    '- Historical model-generated summaries are installed in an assistant-role message with an untrusted marker inside JSON content. An explicit provenance label could reduce model confusion; source did not establish a separate effect.',
    '- No cumulative per-member provider spend cap is source-visible, but no defined budget boundary or observed violation was established. The documented single-process deployment makes multi-instance consent concerns prospective.',
    '- `src/server/definition-usage.ts` includes drafts retained after membership revocation; tests intentionally preserve those drafts for rejoining. No separate security result was established.',
    '- A possible functional SQL alias defect at `src/server/profile-images.ts:57` was observed during source review; no security impact was established.',
    '',
    '## Positive source patterns',
    '',
    '- Authentication routes require confirmed browser binding; privileged writes check Origin and current identity.',
    '- Map, membership, export, import, and erasure operations repeat authority checks in the domain transaction and bind household/content generations.',
    '- Imports bound archive entry counts, bytes, schema, references, and destination state before replacement.',
    '- Assistant MCP checks grant identity, user, client, audience, scope, and current membership; model save requires explicit current save intent.',
    '- Release publication depends on successful CI/security gates, image identity, signatures, and retained scanner evidence.',
    '',
    '## Audit artifacts',
    '',
    '- `architecture.md` — source-grounded architecture and trust boundaries.',
    '- `coverage-ledger.json` — 49 deterministic coverage units and independent checks.',
    '- `findings.json` — six independently reviewed `needs_validation` records.',
    '- `FINDINGS-DETAIL.md` — confirmed medium-or-higher detail (none).',
    '- `NEEDS-VALIDATION.md` — complete lead traces and safe next steps.',
]
(run / 'REPORT.md').write_text('\n'.join(report) + '\n')

details = [
    '# Confirmed finding details',
    '',
    'No medium, high, or critical finding was confirmed in this source-only audit. No target-controlled local execution met the required sandbox conditions, and no candidate has a demonstrated security outcome sufficient for severity or remediation claims.',
    '',
    'See `NEEDS-VALIDATION.md` for the six independently reviewed leads and their bounded validation plans.',
]
(run / 'FINDINGS-DETAIL.md').write_text('\n'.join(details) + '\n')

needs = [
    '# Needs validation',
    '',
    'These are source-grounded leads, not confirmed vulnerabilities. Source was independently checked twice. No target code, provider call, or deployment was exercised. Perform local steps only after all required OS sandbox controls are verified; owner-observed checks use existing records and no live probing.',
]
for index, record in enumerate(records, 1):
    needs += [
        '',
        f"## {index}. {record['title']}",
        '',
        f"**Fingerprint:** `{record['fingerprint']}`",
        '',
        f"**Boundary and possible result:** {record['description']}",
        '',
        f"**Claimed root cause:** {record['claimed_root_cause']}",
        '',
        '**Source trace:**',
        '',
    ]
    for step in record['trace']:
        needs.append(f"- {step['kind']} — {location(step)} ({step['scope']}): {step['description']}")
    needs += ['', '**Verified source evidence:**', '']
    for entry in record['evidence']:
        needs.append(f"- {location(entry)} — {entry['description']}")
    needs += ['', '**Exact blockers:**', '', bullet_lines(record['blockers']), '', '**Resolution plan:**', '']
    if record['validation_plan'].get('local'):
        needs.append(f"- **Bounded local:** {record['validation_plan']['local']}")
    if record['validation_plan'].get('deployment'):
        needs.append(f"- **Owner-observed:** {record['validation_plan']['deployment']}")

needs += [
    '',
    '## Blocked coverage review: OAuth provider internals',
    '',
    'The assistant-consent source path was partially reviewed, but the installed `@better-auth/oauth-provider` package was unavailable. Review the exact pinned provider source for signed `oauth_query`, duplicate parameters, consent-scope binding, and authorization-code binding in a safe environment. Run the existing tests only after the audit sandbox requirements are met. No source-grounded bypass was identified in Skyttel’s own route and grant checks.',
]
(run / 'NEEDS-VALIDATION.md').write_text('\n'.join(needs) + '\n')
