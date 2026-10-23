"""Read-only prototype preflight. A passing read is NOT a server-side merge lock."""
import json
from pathlib import Path
import subprocess
import sys

snapshot = json.loads(Path(sys.argv[1]).read_text())
repo = snapshot['repository']

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', 'repos/' + repo + '/' + path], text=True))

stack = api('stacks/' + str(snapshot['stack']))
issues = stack['pull_requests']
problems = []
if [p['number'] for p in issues] != [p['number'] for p in snapshot['pull_requests']]:
    problems.append('Stack membership or order changed')
target = api('git/ref/heads/' + snapshot['target']['ref'])['object']['sha']
if target != snapshot['target']['sha']:
    problems.append('Target commit changed')
for expected in snapshot['pull_requests']:
    current = api('pulls/' + str(expected['number']))
    for side in ['head', 'base']:
        for field in ['ref', 'sha']:
            if current[side][field] != expected[side][field]:
                problems.append(f"{expected['title']}: {side}.{field} changed")
    membership = current.get('stack') or {}
    if membership.get('number') != snapshot['stack'] or membership.get('size') != len(issues):
        problems.append(expected['title'] + ': stack membership differs')
    if current['state'] != 'open' or current['draft']:
        problems.append(expected['title'] + ': not an open, ready PR')
    if current.get('mergeable') is not True:
        problems.append(expected['title'] + ': mergeability not established')
print(json.dumps({'accepted_at_read_time': not problems, 'problems': problems,
                  'server_merge_lock': False, 'merge_requested': False}, indent=2))
sys.exit(bool(problems))
