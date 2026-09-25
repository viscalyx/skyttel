"""Synthetic state used only inside the isolated devcontainer lifecycle test."""

import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import sys
import tomllib


HOME = Path.home()
BUNDLE = Path('/workspace/.devcontainer-test')
DATABASE = Path('/data/skyttel.sqlite')
CONFIG = HOME / '.codex/config.toml'
MARKERS = [
    HOME / path / 'persistence-sentinel.txt'
    for path in (
        '.codex/sqlite', '.codex/tmp', '.codex/sessions', '.codex/plugins',
        '.codex/skills', '.codex/rules', '.config', '.vscode-server', 'worktrees',
    )
] + [Path('/workspace/node_modules/persistence-sentinel.txt')]
PERSONAL = '''model = "personal-sentinel"
approval_policy = "on-request"
default_permissions = ":read-only"
[plugins.plugin-management]
enabled = true
[[skills.config]]
path = "/synthetic/skills/SKILL.md"
enabled = true
[shell_environment_policy.set]
SKYTTEL_PERSISTENCE_SENTINEL = "retained"
'''


def snapshot():
    with sqlite3.connect(DATABASE) as db:
        assert db.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        assert db.execute(
            "SELECT name FROM map_object WHERE id = 'persistence-object'"
        ).fetchone() == ('Saved synthetic object',)
        changes = json.loads(db.execute(
            "SELECT changes FROM map_draft JOIN content_identity "
            "ON map_draft.userId = content_identity.id "
            "WHERE content_identity.userId = 'persistence-user'"
        ).fetchone()[0])
        assert len(changes) == 1
        assert changes[0]['id'] == 'private-sentinel'
        assert changes[0]['after']['name'] == 'Private synthetic draft'
        return hashlib.sha256('\n'.join(db.iterdump()).encode()).hexdigest()


def verify(managed):
    assert snapshot() == (BUNDLE / 'database-digest.txt').read_text()
    for marker in MARKERS:
        assert marker.read_text() == 'retained\n', str(marker)
    parsed = tomllib.loads(CONFIG.read_text())
    for key, expected in tomllib.loads(PERSONAL).items():
        assert parsed[key] == expected, key
    assert CONFIG.stat().st_mode & 0o777 == 0o600
    if managed:
        assert parsed['cli_auth_credentials_store'] == 'file'
        assert parsed['projects']['/workspace']['trust_level'] == 'trusted'
        expected = tomllib.loads((BUNDLE / 'codex-config.toml').read_text())
        assert parsed['permissions'] == expected['permissions']
        assert (HOME / '.codex/persistence-sentinel.txt').read_text() == 'retained\n'
        auth = HOME / '.codex/auth.json'
        assert json.loads(auth.read_text()) == {'synthetic_marker': 'not-a-credential'}
        assert auth.stat().st_mode & 0o777 == 0o600


action = sys.argv[1]
if action == 'seed':
    shutil.copyfile(BUNDLE / 'fixture.sqlite', DATABASE)
    (BUNDLE / 'database-digest.txt').write_text(snapshot())
    CONFIG.write_text(PERSONAL)
    CONFIG.chmod(0o600)
    for marker in MARKERS:
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text('retained\n')
elif action == 'finish-transition':
    (HOME / '.codex/persistence-sentinel.txt').write_text('retained\n')
    auth = HOME / '.codex/auth.json'
    auth.write_text(json.dumps({'synthetic_marker': 'not-a-credential'}))
    auth.chmod(0o600)
    Path('/tmp/disposable-layer-sentinel.txt').write_text('must disappear')
elif action in ('verify', 'verify-legacy', 'verify-recreated'):
    verify(action != 'verify-legacy')
    if action == 'verify-recreated':
        assert not Path('/tmp/disposable-layer-sentinel.txt').exists()
    print('Synthetic data and settings retained.')
else:
    raise ValueError(f'Unknown fixture action: {action}')
