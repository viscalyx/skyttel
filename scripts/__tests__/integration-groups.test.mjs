import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

function plan(t, suites, weights) {
  const directory = mkdtempSync(join(tmpdir(), 'integration-groups-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const discovery = join(directory, 'discovery.json');
  const timings = join(directory, 'timings.json');
  writeFileSync(discovery, JSON.stringify({ config: { rootDir: resolve('tests/integration') }, errors: [], suites }));
  writeFileSync(timings, JSON.stringify({ version: 1, groups: 2, files: weights }));
  return spawnSync(process.execPath, ['scripts/testing/integration-groups.mjs', '--plan', '--discovery', discovery, '--timings', timings], { encoding: 'utf8' });
}
const file = (name, projects = ['chromium']) => ({ title: name, file: name, specs: [{ title: 'public journey', file: name, tests: projects.map((projectName) => ({ projectName })) }] });

test('group planning balances observed file durations and preserves every runtime identity exactly once', (t) => {
  const result = plan(t, [file('slow.spec.ts', ['chromium', 'mobile']), file('medium.spec.ts'), file('new.spec.ts')], {
    'tests/integration/slow.spec.ts': { seconds: 20, tests: 2 },
    'tests/integration/medium.spec.ts': { seconds: 12, tests: 1 },
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.discovered.length, 4);
  const union = report.groups.flatMap((group) => group.tests);
  assert.equal(new Set(union).size, 4);
  assert.deepEqual([...union].sort(), [...report.discovered].sort());
  assert.ok(report.groups.some((group) => group.files.includes('tests/integration/slow.spec.ts') && group.tests.length === 2));
  assert.ok(report.groups.every((group) => group.files.length > 0));
});
