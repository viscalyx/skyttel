import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const merge = new URL('../../.devcontainer/merge-codex-config.py', import.meta.url).pathname;
const managed = new URL('../../.devcontainer/codex-config.toml', import.meta.url).pathname;

async function fixture(t, contents) {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-config-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'config.toml');
  if (contents !== undefined) await writeFile(path, contents, { mode: 0o640 });
  return {
    path,
    run: () => spawnSync('python3', [merge, managed, path], { encoding: 'utf8' }),
    read: () => readFile(path, 'utf8'),
    parse: () => {
      const result = spawnSync(
        'python3',
        [
          '-c',
          'import json,sys,tomllib; print(json.dumps(tomllib.load(open(sys.argv[1], "rb"))))',
          path,
        ],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    },
  };
}

test('first creation supplies defaults and private file permissions', async (t) => {
  const config = await fixture(t);
  const result = config.run();
  assert.equal(result.status, 0, result.stderr);
  const parsed = config.parse();
  assert.equal(parsed.cli_auth_credentials_store, undefined);
  assert.equal(parsed.default_permissions, 'skyttel-development');
  assert.equal(parsed.projects['/workspace'].trust_level, 'trusted');
  assert.equal(parsed.permissions['skyttel-development'].filesystem['~/.codex/skills'], 'write');
  assert.equal((await stat(config.path)).mode & 0o777, 0o600);
});

test('repeated setup preserves personal choices, other projects and file permissions', async (t) => {
  const config = await fixture(
    t,
    `# Personal choices survive rebuilding.
approval_policy = "on-request"
default_permissions = ":read-only"
cli_auth_credentials_store = "keyring"
model = "personal-sentinel"
[plugins.plugin-management]
enabled = true
[[skills.config]]
path = "/synthetic/skills/SKILL.md"
enabled = true
[projects."/other-project"]
trust_level = "untrusted"
[projects."/workspace"]
trust_level = "untrusted"
personal_sentinel = "preserved"
[shell_environment_policy.set]
SKYTTEL_PERSISTENCE_SENTINEL = "retained"
[permissions.personal]
extends = ":read-only"
`,
  );
  const expected = config.parse();
  expected.projects['/workspace'].trust_level = 'trusted';
  const first = config.run();
  assert.equal(first.status, 0, first.stderr);
  const once = await config.read();
  const second = config.run();
  assert.equal(second.status, 0, second.stderr);
  assert.equal(await config.read(), once, 'Repeated setup must be byte-for-byte idempotent');
  const actual = config.parse();
  delete actual.permissions['skyttel-development'];
  assert.deepEqual(actual, expected);
  assert.match(once, /# Personal choices survive rebuilding\./);
  assert.equal((await stat(config.path)).mode & 0o777, 0o640);
});

test('first transition retains personal values inside legacy managed blocks', async (t) => {
  const config = await fixture(
    t,
    `# >>> skyttel azure dev managed root
model = "legacy-personal-model"
approval_policy = "on-request"
default_permissions = ":read-only"
# <<< skyttel azure dev managed root
# >>> skyttel azure dev managed profile
[permissions.skyttel-development]
extends = ":read-only"
# <<< skyttel azure dev managed profile
`,
  );
  const result = config.run();
  assert.equal(result.status, 0, result.stderr);
  const actual = config.parse();
  assert.equal(actual.model, 'legacy-personal-model');
  assert.equal(actual.approval_policy, 'on-request');
  assert.equal(actual.default_permissions, ':read-only');
  assert.equal(actual.permissions['skyttel-development'].extends, ':workspace');
});

for (const contents of [
  'model = "unterminated\n',
  '# >>> skyttel azure dev managed root\nmodel = "personal"\n',
]) {
  test(`invalid configuration is reported without overwriting the original: ${contents.split('\n')[0]}`, async (t) => {
    const config = await fixture(t, contents);
    await chmod(config.path, 0o600);
    assert.notEqual(config.run().status, 0);
    assert.equal(await config.read(), contents);
    assert.equal((await stat(config.path)).mode & 0o777, 0o600);
  });
}
