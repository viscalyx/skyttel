"""Read-only reconciliation. Does not retry a merge or delete any branches."""
import json
from pathlib import Path
import subprocess
import sys

snapshot = json.loads(Path(sys.argv[1]).read_text())
repo = snapshot['repository']

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', 'repos/' + repo + '/' + path], text=True))

prs = [api('pulls/' + str(p['number'])) for p in snapshot['pull_requests']]
result = {'repository': repo, 'all_merged': all(p['merged'] for p in prs),
          'merged_count': sum(bool(p['merged']) for p in prs),
          'pull_requests': [{k: p[k] for k in ['number', 'title', 'state', 'merged', 'merged_at', 'merge_commit_sha']} for p in prs],
          'cleanup_performed': False, 'merge_requested': False}
if result['all_merged']:
    top = api('git/commits/' + prs[-1]['merge_commit_sha'])
    target = api('git/ref/heads/' + snapshot['target']['ref'])['object']['sha']
    comparison = api('compare/' + top['sha'] + '...' + target)
    result.update(merged_tree=top['tree']['sha'], expected_tree=snapshot['verified_tree'],
                  same_tree=top['tree']['sha'] == snapshot['verified_tree'],
                  target=target, merge_reachable_from_target=comparison['status'] in ['identical', 'ahead'])
    chain = api('compare/' + snapshot['target']['sha'] + '...' + top['sha'])
    result['commits_since_reviewed_target'] = chain['total_commits']
    result['commit_messages'] = [c['commit']['message'] for c in chain['commits']]
    result['ready_for_cleanup_review'] = result['same_tree'] and result['merge_reachable_from_target']
else:
    result['ready_for_cleanup_review'] = False
    result['next_step'] = 'Read pending request/PR state; do not infer failure from a missing response or retry blindly.'
print(json.dumps(result, ensure_ascii=False, indent=2))
