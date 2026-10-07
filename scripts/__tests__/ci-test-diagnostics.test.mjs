import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('CI retains test output without turning failing commands into successful tee pipelines', (t) => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-ci-test-logs-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of [
    'Workflow gate tests',
    'Unit coverage with CI fonts',
    'Integration tests with CI fonts',
    'Container checks',
  ]) {
    const step = workflow.match(new RegExp(`- name: ${name}\\n {8}run: \\|\\n((?: {10}.*\\n)+)`));
    assert.ok(step, `Missing ${name}`);
    const script = step[1].replace(/^ {10}/gmu, '');
    const result = spawnSync(
      'bash',
      [
        '--noprofile',
        '--norc',
        '-eo',
        'pipefail',
        '-c',
        `mkdir -p logs/tests\nnpm() { echo synthetic-fixture-error >&2; return 13; }\n${script}`,
      ],
      { cwd: directory, encoding: 'utf8' },
    );
    assert.equal(result.status, 13, name);
    const path = script.match(/tee (\S+)/)[1];
    assert.match(readFileSync(join(directory, path), 'utf8'), /synthetic-fixture-error/);
  }
});
