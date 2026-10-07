import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('a failed browser run retains its trace, screenshot, fixture output and assertion', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-browser-diagnostics-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const reporter = resolve('tests/support/diagnostics-reporter.ts');
  const config = join(directory, 'playwright.config.mjs');
  writeFileSync(
    config,
    `export default {
    testDir: ${JSON.stringify(directory)},
    outputDir: ${JSON.stringify(join(directory, 'artifacts'))},
    workers: 1,
    reporter: [['line'], [${JSON.stringify(reporter)}]],
    use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' }
  };\n`,
  );
  const playwright = resolve('node_modules/@playwright/test/index.mjs');
  writeFileSync(
    join(directory, 'failure.spec.mjs'),
    `import { test, expect } from ${JSON.stringify(playwright)};
    test('synthetic diagnostic failure', async ({ page }) => {
      console.error('synthetic fixture-server failure');
      await page.setContent('<p>Synthetic fixture</p>');
      expect(1, 'synthetic failing assertion').toBe(2);
    });\n`,
  );
  const result = spawnSync(
    process.execPath,
    [resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', config],
    { encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(result.status, 1, result.stderr);
  const output = join(directory, 'artifacts');
  const log = readFileSync(join(output, 'diagnostics', 'runner.log'), 'utf8');
  assert.match(log, /synthetic fixture-server failure/);
  assert.match(log, /synthetic failing assertion/);
  assert.match(log, /Run status: failed/);
  const artifacts = readdirSync(output, { recursive: true });
  assert.ok(artifacts.some((path) => path.endsWith('trace.zip')));
  assert.ok(artifacts.some((path) => path.endsWith('.png')));
  const noTests = spawnSync(
    process.execPath,
    [
      resolve('node_modules/@playwright/test/cli.js'),
      'test',
      '--config',
      config,
      '--grep',
      'absent',
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(noTests.status, 1);
  assert.match(noTests.stdout + noTests.stderr, /No tests found/);
  assert.doesNotMatch(noTests.stdout + noTests.stderr, /ENOENT|appendFileSync/);
});
