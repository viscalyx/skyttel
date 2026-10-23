import json
from pathlib import Path

p=Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1/coverage-ledger.json')
ledger=json.loads(p.read_text())
for unit in ledger:
    if unit['canonical_refs']['surface'] != 'src/server/map-routes.ts#object-type-and-relationship-type-deletion':
        continue
    unit['local_checks']=[
        {
            'agent_id':'hunter_definition_usage',
            'reviewed_paths':['src/server/map-routes.ts','src/server/map.ts','src/server/content-identities.ts'],
            'invariant':"A member can submit a type-removal proposal only for their household and own private draft.",
            'method':'source',
            'result':"The route obtains the actor from the session; householdMap checks current membership, resolves the actor's content identity, and reads and writes the actor's draft under an immediate transaction.",
            'artifact':None,
        },
        {
            'agent_id':'hunter_definition_usage',
            'reviewed_paths':['src/server/definition-usage.ts','src/server/object-types.ts','src/server/relationship-types.ts','src/server/app.ts','tests/unit/server/definition-removal.test.ts','tests/integration/definition-removal.spec.ts'],
            'invariant':"A member's deletion response should not disclose another member's private draft state beyond the product's intended privacy policy.",
            'method':'source',
            'result':"For a shared type with no saved use, assertUnused reads every other household draft and returns definition_in_use when another draft references or edits that type; otherwise the proposal can succeed. The HTTP error code is returned to the caller. Existing tests deliberately assert this rejection and that private names and values are absent, but do not establish whether the type-use bit itself is permitted disclosure.",
            'artifact':None,
        },
    ]
    unit['reviewed_paths']=sorted({path for check in unit['local_checks'] for path in check['reviewed_paths']})
    break
p.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
