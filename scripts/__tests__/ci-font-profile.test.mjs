import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('CI fonts select the bundled regular and bold faces and reject fallback selection', {
  skip: process.platform !== 'linux' && 'The CI font profile requires Linux',
}, (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-ci-font-profile-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const runner = resolve('scripts/testing/run-with-test-environment.py');
  const env = { ...process.env, SKYTTEL_TEST_LOCK_FILE: join(directory, 'tests.lock') };
  const result = spawnSync(
    'python3',
    [
      runner,
      '--ci-fonts',
      process.execPath,
      '-e',
      `
    const {execFileSync} = require('node:child_process');
    console.log(JSON.stringify({faces:['system-ui', 'system-ui:style=Bold'].map(family =>
      execFileSync('fc-match', ['-f', '%{file}', family], {encoding:'utf8'})),
      cache:process.env.XDG_CACHE_HOME ?? null}));
  `,
    ],
    { env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const selected = JSON.parse(result.stdout.trim().split('\n').at(-1));
  assert.equal(selected.cache, process.env.XDG_CACHE_HOME ?? null);
  assert.deepEqual(selected.faces, [
    resolve('scripts/testing/fonts/DejaVuSans.ttf'),
    resolve('scripts/testing/fonts/DejaVuSans-Bold.ttf'),
  ]);
  assert.doesNotMatch(result.stderr, /No writable cache/);

  const bin = join(directory, 'bin');
  mkdirSync(bin);
  const matcher = join(bin, 'fc-match');
  writeFileSync(matcher, '#!/bin/sh\nprintf "%s" "/usr/share/fonts/fallback.ttf"\n');
  chmodSync(matcher, 0o755);
  const marker = join(directory, 'started');
  const rejected = spawnSync(
    'python3',
    [
      runner,
      '--ci-fonts',
      process.execPath,
      '-e',
      'require("node:fs").writeFileSync(process.argv[1], "ran")',
      marker,
    ],
    {
      env: { ...env, PATH: `${bin}:${process.env.PATH}` },
      encoding: 'utf8',
    },
  );
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /CI font profile selected/);
  assert.equal(existsSync(marker), false);
});
