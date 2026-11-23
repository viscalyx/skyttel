import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dependencyFixture } from './helpers/dependency-fixture.mjs';

const runner = fileURLToPath(new URL('../testing/run-with-test-environment.py', import.meta.url));

test('competing worktrees cannot verify or prepare until the active process stops', {
  timeout: 15_000,
}, async (t) => {
  const { directory, env } = dependencyFixture(t);
  delete env.SKYTTEL_TEST_LOCK_WAIT_SECONDS;
  const { directory: otherWorktree } = dependencyFixture(t);
  const owner = spawn(
    'python3',
    [runner, process.execPath, '-e', 'console.log("ready"); setInterval(() => {}, 1000)'],
    { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const exited = once(owner, 'exit');
  t.after(() => owner.kill('SIGTERM'));
  await once(owner.stdout, 'data');
  const marker = join(otherWorktree, 'started');
  const competing = spawnSync(
    'python3',
    [
      runner,
      process.execPath,
      '-e',
      'require("node:fs").writeFileSync(process.argv[1], "ran")',
      marker,
    ],
    { cwd: otherWorktree, env, encoding: 'utf8' },
  );
  assert.equal(competing.status, 75);
  assert.match(competing.stderr, /test lock is busy/);
  assert.equal(existsSync(marker), false);
  const before = readFileSync(join(otherWorktree, 'node_modules/vitest/package.json'));
  const start = performance.now();
  const preparation = spawnSync('python3', [runner, '--wait-seconds', '0.2', '--prepare'], {
    cwd: otherWorktree,
    env,
    encoding: 'utf8',
  });
  assert.equal(preparation.status, 75, preparation.stderr);
  assert.ok(performance.now() - start >= 200);
  assert.equal(preparation.stderr.match(/test lock is busy/g)?.length, 1);
  assert.deepEqual(readFileSync(join(otherWorktree, 'node_modules/vitest/package.json')), before);

  const waiting = spawn('python3', [runner, process.execPath, '-e', 'process.exit(42)'], {
    cwd: otherWorktree,
    env: { ...env, SKYTTEL_TEST_LOCK_WAIT_SECONDS: '5' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const finished = once(waiting, 'exit');
  t.after(() => waiting.kill('SIGTERM'));
  const [notice] = await once(waiting.stderr, 'data');
  assert.ok(notice.toString().includes(directory), 'identifies the current owner');
  owner.kill('SIGTERM');
  assert.deepEqual(await exited, [143, null]);
  assert.deepEqual(await finished, [42, null], 'waiter acquires the lock and returns child status');
});

test('a surviving test child holds the lock after its wrapper is killed', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-inherited-lock-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, SKYTTEL_TEST_LOCK_FILE: join(directory, 'tests.lock') };
  delete env.SKYTTEL_TEST_LOCK_WAIT_SECONDS;
  const owner = spawn(
    'python3',
    [runner, process.execPath, '-e', 'console.log(process.pid); setInterval(() => {}, 1000)'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const exited = once(owner, 'exit');
  const [ready] = await once(owner.stdout, 'data');
  const childPid = Number(ready.toString().trim());
  t.after(() => {
    owner.kill('SIGTERM');
    try {
      process.kill(-childPid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  });
  owner.kill('SIGKILL');
  await exited;
  const competing = spawnSync('python3', [runner, process.execPath, '-e', ''], {
    env,
    encoding: 'utf8',
  });
  assert.equal(competing.status, 75);
});
