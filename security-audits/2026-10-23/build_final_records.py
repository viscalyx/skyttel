import json
from pathlib import Path

root = Path('/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel')
run = root / 'run-1'
skill = Path('/Users/johlju/source/skyttel/.agents/skills/security-audit')
sources = {
    'text-assistant/shared-map-to-private-draft-action-binding': root / 'candidate-ai.json',
    'installation.restore.reinstates-revoked-membership': root / 'candidate-restore.json',
    'text-assistant-completed-result-quadratic-retention': root / 'candidate-spend.json',
    'relationship-form-unbounded-attempt-retention': root / 'candidate-attempt-volume.json',
    'map-read.full-history-materialization': root / 'candidate-history-volume.json',
    'map.definition-removal.private-draft-type-oracle': root / 'candidate-definition-oracle.json',
}
records = {}
for fingerprint, path in sources.items():
    record = json.loads(path.read_text())
    assert record.pop('proposed_verdict') == 'needs_validation'
    assert record['fingerprint'] == fingerprint
    record['verdict'] = 'needs_validation'
    records[fingerprint] = record

def trace(kind, file, line, scope, description):
    return dict(kind=kind, file=file, line=line, scope=scope, description=description)

def ev(file, line, description):
    return dict(file=file, line=line, description=description)

ai = records['text-assistant/shared-map-to-private-draft-action-binding']
ai.update({
    'title': 'Shared map text may induce an unrequested change to another member’s private draft',
    'description': "An authenticated household member can save text in a shared map object. Another member’s assistant can read that object and pass its text to the model. If the model treats the text as an instruction and calls a proposal tool, the server can change the consuming member’s private draft without checking that the member requested that change. The source does not establish that a model actually makes such a call.",
    'claimed_root_cause': "Proposal dispatch validates the model’s tool arguments and the consuming member’s authority and draft version, but does not deterministically compare the proposed change with that member’s request.",
    'trace': [
        trace('entrypoint','src/server/map-routes.ts',101,'Household map draft route',"An authenticated member submits object text for their own draft."),
        trace('propagation','src/server/map.ts',687,'Object proposal',"The value enters that member’s draft after map validation."),
        trace('propagation','src/server/map-routes.ts',217,'Household map save route',"The member requests that their draft become shared map content."),
        trace('propagation','src/server/map.ts',905,'Saved object write',"The object’s text properties enter the shared map."),
        trace('propagation','src/server/assistant-routes.ts',243,'read_map tool',"Another member’s assistant retrieves the saved object under its household grant."),
        trace('propagation','src/server/text-assistant.ts',1438,'Tool result continuation',"The map read result is appended to the model conversation."),
        trace('propagation','src/server/text-assistant.ts',1098,'Model request',"The conversation is sent to the model with proposal tools available."),
        trace('propagation','src/server/text-assistant.ts',1413,'Model tool dispatch',"A model proposal passes authority and version checks without request-to-action comparison."),
        trace('propagation','src/server/assistant-work.ts',266,'propose_object handler',"The handler sends the proposal to the consuming member’s map domain."),
        trace('sink','src/server/map.ts',779,'Private draft write',"A valid proposal updates the consuming member’s private draft."),
    ],
    'evidence': [
        ev('src/shared/properties.ts',16,'A text property can contain up to 10,000 characters, including instruction-like text.'),
        ev('src/server/map.ts',104,'Draft writes are keyed by household and content owner.'),
        ev('src/server/text-assistant.ts',1164,'Batch operations are checked against tool schemas before mutation.'),
        ev('src/server/text-assistant.ts',1385,'Non-read-only calls check current draft and content versions without comparing to the member’s requested action.'),
        ev('src/server/text-assistant.ts',1377,'Saving requires separate explicit intent, limiting this lead to unsaved draft change.'),
        ev('src/server/assistant-instructions.ts',136,'The model is told map text and tool results are data, never instructions; actual model behavior is unobserved.'),
    ],
    'blockers': [
        'No observed model response shows map text causing a proposal unrelated to the consuming member’s request.',
        'The required sandbox, including bounded scratch disk and race-safe artifact promotion, was not verified, so no target fixture ran.',
        'A real provider call would be billable and lacks explicit user authorization.',
    ],
    'validation_plan': {
        'local': 'After verifying all required sandbox controls, use dummy members and a disposable database. Have member A save instruction-like object text and member B request only a summary. First use a deterministic model stub to verify that a proposal call would alter only B’s unsaved draft. Only with explicit billable authorization, capture a real model response and compare B’s draft before and after. Stop at the first unrequested mutation; do not save it.',
        'deployment': 'If local model behavior cannot reproduce the configured model, an authorized operator can perform the same dummy-household check in an isolated test installation and inspect the model tool call and member B’s unsaved draft.',
    },
})

restore = records['installation.restore.reinstates-revoked-membership']
restore.update({
    'title': 'An older database restore may reinstate a revoked household member',
    'description': 'A complete database restore can bring back a membership row removed after the copy was made. Skyttel invalidates old authentication artifacts, but keeps provider account links and restored memberships. If the later revocation is not reapplied before ingress opens, the former member could sign in again and read the map. The runbook requires authorization checks, but does not establish reconciliation of post-copy changes.',
    'claimed_root_cause': 'Authority rotation clears sessions and tokens but does not reconcile membership revocations after the restored snapshot; the operator check is not specified in the repository.',
    'trace': [
        trace('entrypoint','src/server/map-routes.ts',76,'GET /households/:id/map','A formerly revoked member with a fresh provider session requests the restored map.'),
        trace('propagation','src/server/map-routes.ts',16,'Map route authentication','The route obtains the current session and passes its user ID to householdMap.'),
        trace('propagation','src/server/households.ts',16,'householdAccess','Authorization accepts a restored membership row that predates revocation.'),
        trace('sink','src/server/map.ts',227,'Map readState','The map selects household objects for the response.'),
    ],
    'evidence': [
        ev('src/server/administration.ts',165,'Revoking a member deletes the membership row.'),
        ev('src/server/installation-authority.ts',34,'Restore invalidation deletes auth artifacts but leaves membership and account.'),
        ev('src/server/installation-authority.ts',106,'Declared generation change invokes invalidation before acknowledging restore.'),
        ev('docs/operations/database-restore.md',56,'Runbook says provider identity links and household content remain.'),
        ev('docs/operations/database-restore.md',75,'Runbook requires authorization checks before ingress but does not specify post-copy revocation reconciliation.'),
    ],
    'blockers': [
        'A dummy-identity restore and fresh sign-in check could not run because required sandbox and artifact controls were not verified.',
        'The repository does not establish whether the operator retains independent post-copy membership records and reapplies revocations before ingress opens.',
    ],
    'validation_plan': {
        'local': 'In the required isolated sandbox with synthetic provider identities, create a household and member, make a consistent copy, revoke that member, restore the copy under a new generation, sign in freshly, and issue one dummy map read. Record only whether access is denied or a dummy object is returned.',
        'deployment': 'Have the installation owner show the controlled restore checklist and independent post-copy membership records, then verify later revocations are reapplied before public ingress opens. Do not test a live household.',
    },
})

spend = records['text-assistant-completed-result-quadratic-retention']
spend.update({
    'title': 'Completed assistant turns retain growing session snapshots',
    'description': 'An authenticated member with conversation consent can complete serial assistant turns. The 200-item cap applies to pending work, while each completed turn stays in the accepted map with a fresh task list and shallow copy of the growing reply list. This creates quadratic retained list entries during a conversation. Shared-process effect is unmeasured.',
    'claimed_root_cause': 'Completed accepted-message records remain until conversation reset or stop, and each completion stores arrays that grow with prior turns.',
    'evidence': [
        ev('src/server/text-assistant.ts',314,'Session view creates task objects for every accepted message.'),
        ev('src/server/text-assistant.ts',1815,'Completed result stores a new array of reply references; reply objects and text are not deep-copied.'),
        ev('src/server/text-assistant.ts',843,'Explicit reset clears accepted records and replies.'),
        ev('src/server/text-assistant.ts',208,'Stopping a session clears accepted records.'),
        ev('src/server/text-assistant.ts',1930,'Timer schedules conversation expiry from the MCP deadline.'),
        ev('src/server/text-assistant-mcp.ts',159,'Initial MCP deadline is at most 30 minutes after connection.'),
    ],
    'blockers': [
        'No target fixture ran because scratch disk bounds and race-safe artifact promotion were not verified.',
        'Source shows quadratic retained list entries but no measured availability effect under a supported memory budget.',
    ],
    'validation_plan': {
        'local': 'In the required offline resource-limited sandbox, use dummy accounts and a mocked provider to complete bounded serial turns at 10, 20, and 40. Measure retained heap and latency after garbage collection, including an ordinary request from a second dummy user. Stop well before memory exhaustion; account for 30-minute expiry and reset cleanup.',
        'deployment': 'Have the owner identify production memory budget, expected concurrent conversations, and restart behavior, then compare bounded measurements with those limits.',
    },
})

attempt = records['relationship-form-unbounded-attempt-retention']
attempt.update({
    'title': 'Repeated duplicate relationship forms retain full submissions',
    'description': 'A member can submit valid relationship forms with fresh staging IDs that select an existing relationship. The duplicate path leaves the draft unchanged but stores each full JSON request in shared SQLite. Source shows a 2,000,000-byte per-request cap and no aggregate attempt limit or ordinary expiry. Service impact depends on deployed controls, storage limits, and recovery.',
    'trace': [
        trace('entrypoint','src/server/map-routes.ts',158,'POST relationship-form','An authenticated member supplies a form with a fresh stagingId.'),
        trace('propagation','src/server/relationships.ts',263,'Duplicate detection','A new relationship ID with existing endpoints selects the existing relationship without changing draft.'),
        trace('propagation','src/server/map.ts',677,'Duplicate outcome','The duplicate outcome still records the submission.'),
        trace('sink','src/server/relationship-form-attempts.ts',41,'Attempt insert','Complete JSON is serialized into a new SQLite row keyed by stagingId.'),
    ],
    'evidence': [
        ev('src/server/map-routes.ts',15,'Route requires session and POST requires configured Origin.'),
        ev('src/server/map.ts',69,'Transaction rechecks household access and content ownership.'),
        ev('src/server/map.ts',654,'Only reuse of an already recorded stagingId returns before recording.'),
        ev('src/server/relationships.ts',270,'Duplicate relationship returns unchanged draft and existing relationship ID.'),
        ev('src/server/relationship-form-attempts.ts',47,'Insert stores JSON.stringify(submission), including unused fields.'),
        ev('src/server/app.ts',155,'Route is subject to propertyWriteLimit body cap.'),
        ev('src/server/properties.ts',6,'Body cap is 2,000,000 bytes.'),
        ev('migrations/025_relationship_form_attempts.sql',3,'No count, byte, or age constraint; cleanup trigger runs on contentVersion change.'),
        ev('src/server/map.ts',951,'Ordinary map save resets draft without changing household contentVersion.'),
    ],
    'blockers': [
        'Safe local storage-growth check cannot run because required sandbox controls, including scratch disk quota and artifact promotion, were not verified.',
        'Source does not establish deployed ingress rate limits, persistent-volume quota, or service recovery when SQLite fills.',
    ],
    'validation_plan': {
        'local': 'In the required sandbox, use a small dummy household with an existing relationship. Submit several bounded duplicate forms with fresh stagingIds and unused top-level padding; compare attempt count and stored bytes while draft version stays fixed. Perform an ordinary save and check whether rows remain. Stop well below disk limit.',
        'deployment': 'Ask the owner to inspect ingress request limits and persistent-volume quota, then review documented or prior SQLite-full recovery. Do not load-test a live installation.',
    },
})

history = records['map-read.full-history-materialization']
history.update({
    'title': 'Ordinary map reads materialize retained save receipts',
    'description': 'Authorized saves accumulate receipts. If a household has a deleted object, each ordinary map read loads and parses every retained receipt, including unrelated ones. A draft conflict can trigger a second full-history pass. Availability impact is unmeasured.',
    'claimed_root_cause': 'The map state reader derives deleted-object metadata by scanning the entire household save history rather than a targeted lookup or persisted derived value.',
    'evidence': [
        ev('src/server/map-routes.ts',15,'Route middleware requires a session; householdMap checks membership.'),
        ev('src/server/map.ts',265,'Draft conflicts trigger a second full-history parse.'),
        ev('src/server/map.ts',939,'Each successful nonempty save appends map_history and map_save receipt rows.'),
        ev('src/server/map-operations.ts',141,'The 20-result cap applies to operation listing, not retained receipts.'),
        ev('migrations/015_content_maintenance.sql',158,'Current content-version cleanup trigger retires map_operation, but not map_save or map_history; it replaces earlier trigger.'),
        ev('src/server/app.ts',146,'Request body limit bounds individual uploads, not accumulated history or GET work.'),
    ],
    'blockers': [
        'Required sandbox disk bounds and race-safe artifact promotion were not verified, so no bounded growth measurement ran.',
        'Source does not establish deployed receipt counts, memory headroom, concurrency, ingress timeouts, or recovery behavior needed to determine shared availability impact.',
    ],
    'validation_plan': {
        'local': 'In the required sandbox, create dummy households with and without one deleted object and increasing bounded counts of small valid receipts. Measure GET /map latency and peak memory, inspect the SQLite query plan, and stop at minimum observable growth.',
        'deployment': 'Have the owner inspect private receipt counts, memory limits, concurrency and ingress controls, and recovery behavior to assess possible effect on other members.',
    },
})

oracle = records['map.definition-removal.private-draft-type-oracle']
oracle.update({
    'title': 'Type-removal response reveals whether another draft uses a shared type',
    'description': "A current household member can propose removing a shared type with no saved or own-draft use. The response changes to definition_in_use when another member’s draft references or edits that type. This reveals a type-specific use bit without exposing names or values.",
    'claimed_root_cause': "The deletion guard reads other members’ drafts and exposes use of a selected type through a distinguishable response. Whether that bit is confidential remains a product-policy question.",
    'trace': [
        trace('entrypoint','src/server/map-routes.ts',108,'Object-type proposal route','A member submits a type-removal proposal; relationship-type route at line 179 is analogous.'),
        trace('propagation','src/server/map.ts',617,'householdMap.proposeObjectType','Checks membership, editability, draft, and content version.'),
        trace('propagation','src/server/object-types.ts',104,'Object-type removal','Null value invokes type-use guard before caller draft update.'),
        trace('propagation','src/server/definition-usage.ts',45,'Cross-member type-use guard','After saved and caller-draft checks, other drafts are checked and definition_in_use can be thrown.'),
        trace('sink','src/server/app.ts',163,'HTTP error handler','Returns distinguishable MapError code to requesting member.'),
    ],
    'evidence': [
        ev('docs/adr/0001-gemensam-hushallskarta.md',8,'Product describes drafts as private in ordinary work, while administrators can inspect complete export.'),
        ev('src/server/map.ts',79,'Ordinary map reads select draft by household and caller content identity.'),
        ev('src/server/definition-usage.ts',10,'Guard selects same-household drafts whose userId differs from caller.'),
        ev('src/server/definition-usage.ts',45,'Object-type branch rejects use or edits in other drafts; relationship branch mirrors this.'),
        ev('src/client/SaveOperations.tsx',62,'User-facing rejection says type may be used in private drafts.'),
        ev('tests/unit/server/definition-removal.test.ts',333,'Existing test expects other member pending edit to produce 409 definition_in_use.'),
        ev('tests/integration/definition-removal.spec.ts',359,'Integration test expects warning but no private names or values.'),
    ],
    'blockers': [
        'Policy and tests establish private values and intentionally show a type-use rejection, but do not decide whether the type-specific use bit itself must be confidential.',
        'Independent two-member execution was unavailable because scratch disk and artifact promotion controls were not verified.',
    ],
    'validation_plan': {
        'local': 'In the required sandbox, use two dummy members and a shared type with no saved or caller-draft use. Compare first member’s type-removal response before and after second stages a private object or type edit using it; stop at the response-code difference.',
        'deployment': 'Ask the product owner whether ordinary members may learn that another private draft uses a specific shared type. If no, revise deletion flow to preserve referential safety without exposing the predicate.',
    },
})

# Read the current schema immediately before writing; the validator performs the
# structural and semantic checks in the next step.
schema = json.loads((skill / 'report-schema.json').read_text())
assert schema['type'] == 'array' and len(schema['items']['oneOf']) == 3
final = [records[key] for key in sorted(records)]
(run / 'findings.json').write_text(json.dumps(final, ensure_ascii=False, indent=2) + '\n')
