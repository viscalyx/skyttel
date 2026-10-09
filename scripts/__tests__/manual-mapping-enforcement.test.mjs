import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('development validation stops on a failed manual mapping before build and coverage', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  const result = spawnSync(
    'sh',
    [
      '-c',
      `npm() {
        printf '%s\\n' "$*"
        if [ "$*" = 'run test:manual-mapping' ]; then return 23; fi
      }
      ${scripts.check}`,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 23, result.stdout + result.stderr);
  assert.match(result.stdout, /^run test:manual-mapping$/mu);
  assert.doesNotMatch(result.stdout, /^run (?:build|test:unit:coverage)$/mu);
});
