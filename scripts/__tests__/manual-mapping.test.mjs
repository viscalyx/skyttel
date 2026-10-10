import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

function fixture(t, definitions) {
  const directory = mkdtempSync(join(tmpdir(), 'skyttel-manual-mapping-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const manual = join(directory, 'manual');
  mkdirSync(manual);
  const spec = join(directory, 'workflow.spec.mjs');
  writeFileSync(
    spec,
    `import { test } from ${JSON.stringify(resolve('node_modules/@playwright/test/index.mjs'))};\n${definitions}\n`,
  );
  const config = join(directory, 'playwright.config.mjs');
  writeFileSync(
    config,
    `export default { testDir: ${JSON.stringify(directory)}, testMatch: 'workflow.spec.mjs', workers: 1, retries: 0 };\n`,
  );
  symlinkSync(resolve('node_modules'), join(directory, 'node_modules'));
  const vitestConfig = join(directory, 'vitest.config.mjs');
  writeFileSync(
    vitestConfig,
    `import { playwright } from '@vitest/browser-playwright';
    export default { root: ${JSON.stringify(directory)}, test: { tags: [{ name: 'technical' }], projects: [
      { test: { name: 'graphics', include: ['browser.test.mjs'], browser: {
        enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }]
      } } },
      { test: { name: 'server', environment: 'node', include: ['server.test.mjs'] } },
      { test: { name: 'paid-provider', environment: 'node', include: ['provider.test.mjs'] } }
    ] } };\n`,
  );
  return {
    spec,
    manual,
    suite(suite, definitions) {
      const file = join(directory, `${suite}.test.mjs`);
      writeFileSync(file, `import { test, beforeAll } from 'vitest';\n${definitions}\n`);
      return file;
    },
    write(name, cases) {
      writeFileSync(join(manual, name), cases);
    },
    run(...args) {
      return spawnSync(
        process.execPath,
        [
          resolve('scripts/check-manual-mapping.mjs'),
          '--manual-dir',
          manual,
          '--config',
          config,
          '--vitest-config',
          vitestConfig,
          ...args,
        ],
        { encoding: 'utf8', timeout: 60_000 },
      );
    },
  };
}

test('explicit browser counterparts and server evidence collect without executing hooks or workflows', (t) => {
  const f = fixture(t, "test('legacy support', { tag: '@technical' }, async () => {});");
  const browser = f.suite(
    'browser',
    `
    beforeAll(() => { throw new Error('Hooks must not execute'); });
    test('CASE-01: moved UI workflow', () => { throw new Error('Workflow must not execute'); });
  `,
  );
  const server = f.suite(
    'server',
    `
    beforeAll(() => { throw new Error('Server setup must not execute'); });
    test('HTTP evidence', () => { throw new Error('HTTP calls must not execute'); });
  `,
  );
  f.suite('provider', "throw new Error('Paid-provider modules must not be loaded');");
  f.write(
    'workflows.md',
    manualCase('CASE-01', {
      counterpart: { runner: 'vitest', suite: 'browser', spec: browser, caseId: 'CASE-01' },
      evidence: [
        {
          runner: 'vitest',
          suite: 'server',
          spec: server,
          title: 'HTTP evidence',
          kind: 'technical',
          purpose: 'Real process protocol evidence',
        },
      ],
      reference: 'Chromium with controlled responses; separate real server process',
      outcomes: ['User can complete the moved workflow'],
    }),
  );
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 manual case.*3 discovered tests/);
});

test('technical browser evidence stays separate from ordinary workflows and human observations', (t) => {
  const f = fixture(t, "test('legacy support', { tag: '@technical' }, async () => {});");
  const browser = f.suite(
    'browser',
    "test('technical measurement', { tags: ['technical'] }, () => {});",
  );
  const metadata = {
    humanObservation: {
      kind: 'physical-input',
      observation: 'Perform the gesture on a physical touch screen',
    },
    reference: 'Physical device, supported gesture',
    outcomes: ['The intended view remains reachable'],
    evidence: [
      {
        runner: 'vitest',
        suite: 'browser',
        spec: browser,
        title: 'technical measurement',
        kind: 'technical',
        purpose: 'Separate synthetic input measurement',
      },
    ],
  };
  f.write('observations.md', manualCase('CASE-01', metadata));
  let result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  delete metadata.humanObservation;
  metadata.counterpart = {
    runner: 'vitest',
    suite: 'browser',
    spec: browser,
    title: 'technical measurement',
  };
  f.write('observations.md', manualCase('CASE-01', metadata));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /technical test cannot be an ordinary counterpart/);
});

test('browser generated variants resolve exact titles and preserve moved identities', (t) => {
  const f = fixture(t, "test('legacy support', { tag: '@technical' }, async () => {});");
  const browser = f.suite(
    'browser',
    `
    test.each([['CASE-01', 320], ['CASE-02', 1280]])('%s: workflow %ipx', () => {});
  `,
  );
  const mapping = (id, selector = { caseId: id }) =>
    manualCase(id, {
      counterpart: { runner: 'vitest', suite: 'browser', spec: browser, ...selector },
      reference: 'Controlled browser responses at the named width',
      outcomes: ['User can read and complete the workflow'],
    });
  f.write(
    'moved.md',
    mapping('CASE-01', { title: 'CASE-01: workflow 320px' }) + mapping('CASE-02'),
  );
  let result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  f.write(
    'moved.md',
    mapping('CASE-01', { title: 'CASE-01: workflow 1280px' }) + mapping('CASE-02'),
  );
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing counterpart.*CASE-01: workflow 1280px/);
  f.write('moved.md', mapping('CASE-01'));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-02: workflow 1280px.*no ordinary manual counterpart/);
  f.suite(
    'browser',
    `
    test.each([320, 1280])('CASE-01: workflow %ipx', () => {});
  `,
  );
  result = f.run('--area', join(f.manual, 'moved.md'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous counterpart.*2 discovered tests/);
  assert.match(result.stderr, /duplicate functional case identity/);
});

test('browser describe paths disambiguate supporting evidence independently of its suite', (t) => {
  const f = fixture(t, "test('legacy support', { tag: '@technical' }, async () => {});");
  const browser = f.suite(
    'browser',
    `
    const { describe } = await import('vitest');
    for (const mode of ['text', 'voice']) describe(mode, () => test('measurement', { tags: ['technical'] }, () => {}));
  `,
  );
  const metadata = {
    humanObservation: { kind: 'screen-reader', observation: 'Listen to the announced status' },
    reference: 'Physical screen reader',
    outcomes: ['The status is spoken'],
    evidence: [
      {
        kind: 'technical',
        runner: 'vitest',
        suite: 'browser',
        spec: browser,
        title: 'measurement',
        purpose: 'Separate content assertion',
      },
    ],
  };
  const run = () => {
    f.write('observations.md', manualCase('CASE-01', metadata));
    return f.run();
  };
  let result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous technical evidence.*2 discovered tests/);
  metadata.evidence[0].title = 'text > measurement';
  result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  metadata.evidence[0].suite = 'server';
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing technical evidence/);
});

test('runner and suite identity reject incomplete, unsupported and wrong-suite references', (t) => {
  const f = fixture(t, "test('CASE-01: workflow', async () => {});");
  const server = f.suite('server', "test('CASE-02: HTTP protocol', () => {});");
  const metadata = {
    counterpart: { runner: 'playwright', suite: 'integration', spec: f.spec, caseId: 'CASE-01' },
    reference: 'Real application and server',
    outcomes: ['Saved data survives restart'],
  };
  const run = () => {
    f.write('workflows.md', manualCase('CASE-01', metadata));
    return f.run();
  };
  let result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const identity of [
    { runner: 'playwright' },
    { suite: 'integration' },
    { runner: 'vitest', suite: 'integration' },
    { runner: 'playwright', suite: 'server' },
  ]) {
    metadata.counterpart = { spec: f.spec, caseId: 'CASE-01', ...identity };
    result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /reference runner\/suite must be/);
  }
  metadata.counterpart = { runner: 'vitest', suite: 'browser', spec: f.spec, caseId: 'CASE-01' };
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing counterpart/);
  metadata.counterpart = { runner: 'vitest', suite: 'server', spec: server, caseId: 'CASE-02' };
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /server test cannot be an ordinary counterpart/);
});

test('stable functional IDs stay globally unique across integration and browser suites', (t) => {
  const f = fixture(t, "test('CASE-01: integration workflow', async () => {});");
  f.suite('browser', "test('CASE-01: moved workflow', () => {});");
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  let result = f.run('--area', join(f.manual, 'workflows.md'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*duplicate functional case identity/);
  const browser = f.suite('browser', "test('component support without an ID', () => {});");
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  f.write(
    'workflows.md',
    manualCase('CASE-01', {
      counterpart: {
        runner: 'vitest',
        suite: 'browser',
        spec: browser,
        title: 'component support without an ID',
      },
      reference: 'Browser',
      outcomes: ['User can complete the workflow'],
    }),
  );
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /browser counterpart must have a stable case identity/);
});

test('collection failures identify the suite file instead of accepting partial discovery', (t) => {
  const f = fixture(t, "test('CASE-01: workflow', async () => {});");
  const server = f.suite('server', "throw new Error('Invalid evidence collection');");
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Vitest discovery failed/);
  assert.ok(result.stderr.includes(server), result.stderr);
  assert.match(result.stderr, /Invalid evidence collection/);
});

function manualCase(id, metadata) {
  return `### ${id}: workflow\n\n\`\`\`manual-mapping\n${JSON.stringify(
    metadata,
    null,
    2,
  )}\n\`\`\`\n`;
}

function ordinary(id, spec, selector = { caseId: id }) {
  return manualCase(id, {
    counterpart: { spec, ...selector },
    reference: '1280px, light',
    outcomes: ['Saved data survives restart'],
  });
}

test('the command accepts one ordinary counterpart discovered by Playwright', (t) => {
  const f = fixture(t, "test('CASE-01: save and restart', async () => {});");
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 manual case.*1 discovered test/);
});

test('human observations and separate technical tests need no invented counterpart', (t) => {
  const f = fixture(
    t,
    "test('request-only archive evidence', { tag: '@technical' }, async () => {});",
  );
  f.write(
    'observations.md',
    `### AUDIO-01: physical microphone\n\n\`\`\`manual-mapping
${JSON.stringify(
  {
    humanObservation: {
      kind: 'physical-microphone-audio',
      observation: 'Listen to captured speech with a physical microphone',
    },
    reference: 'Physical microphone and speakers',
    outcomes: ['Speech is audible'],
    evidence: [
      {
        kind: 'technical',
        spec: f.spec,
        title: 'request-only archive evidence',
        purpose: 'Separate archive check',
      },
    ],
  },
  null,
  2,
)}
\`\`\`\n`,
  );
  const result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /1 manual case.*1 discovered test/);
});

test('missing metadata and unclaimed functional tests fail with actionable identities', (t) => {
  const f = fixture(
    t,
    "test('CASE-01: save and restart', async () => {}); test('CASE-02: edit', async () => {});",
  );
  f.write('workflows.md', '### CASE-01: workflow\n\nManual steps only.\n');
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /workflows.md.*CASE-01.*missing manual-mapping/);
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-02: edit.*no ordinary manual counterpart/);
});

test('generated definitions expand before resolving case IDs and exact titles', (t) => {
  const f = fixture(
    t,
    `for (const width of [320, 1280]) test(\`CASE-01: workflow \${width}px\`, async () => {});`,
  );
  f.write('workflows.md', ordinary('CASE-01', f.spec));
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*ambiguous counterpart.*2 discovered tests/);
  assert.match(result.stderr, /320px/);
  assert.match(result.stderr, /1280px/);
  f.write(
    'workflows.md',
    ordinary('CASE-01', f.spec, { title: 'CASE-01: workflow 320px' }) +
      ordinary('CASE-02', f.spec, { title: 'CASE-01: workflow 1280px' }),
  );
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*duplicate functional case identity/);
  writeFileSync(
    f.spec,
    `import { test } from ${JSON.stringify(resolve('node_modules/@playwright/test/index.mjs'))};
    for (const [id, width] of [['CASE-01', 320], ['CASE-02', 1280]]) test(\`\${id}: workflow \${width}px\`, async () => {});\n`,
  );
  f.write(
    'workflows.md',
    ordinary('CASE-01', f.spec, { title: 'CASE-01: workflow 320px' }) +
      ordinary('CASE-02', f.spec, { title: 'CASE-02: workflow 1280px' }),
  );
  result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /2 manual cases.*2 discovered tests/);
  f.write('workflows.md', ordinary('CASE-01', f.spec, { title: 'missing workflow' }));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*missing counterpart.*missing workflow/);
});

test('duplicate case identities and multiple ordinary counterparts fail', (t) => {
  const f = fixture(t, "test('CASE-01: save and restart', async () => {});");
  f.write('first.md', ordinary('CASE-01', f.spec));
  f.write('second.md', ordinary('CASE-01', f.spec));
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*duplicate case identity.*first.md/);
  f.write('second.md', ordinary('CASE-02', f.spec, { caseId: 'CASE-01' }));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-02.*already the ordinary counterpart.*CASE-01/);
  f.write('second.md', '');
  f.write(
    'first.md',
    `### CASE-01: workflow\n\n\`\`\`manual-mapping\n${JSON.stringify({
      counterpart: [
        { spec: f.spec, caseId: 'CASE-01' },
        { spec: f.spec, caseId: 'CASE-01' },
      ],
      reference: 'Desktop',
      outcomes: ['Saved'],
    })}\n\`\`\`\n`,
  );
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*exactly one counterpart object/);
});

test('exceptions name a real human observation and retain reference and outcomes', (t) => {
  const f = fixture(t, "test('request-only evidence', { tag: '@technical' }, async () => {});");
  const metadata = {
    humanObservation: { kind: 'paid-provider', observation: 'Run a paid API call' },
    reference: 'External provider',
    outcomes: ['Provider replies'],
  };
  const write = () => f.write('observations.md', manualCase('AUDIO-01', metadata));
  write();
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AUDIO-01.*humanObservation.kind/);
  metadata.humanObservation = { kind: 'screen-reader', observation: '' };
  write();
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AUDIO-01.*required observation/);
  metadata.humanObservation.observation = 'Listen to the live spoken announcement';
  metadata.reference = '';
  metadata.outcomes = [];
  write();
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AUDIO-01.*reference/);
  assert.match(result.stderr, /AUDIO-01.*outcomes/);
});

test('area validation permits staged migration while the full command stays strict', (t) => {
  const f = fixture(
    t,
    "test('CASE-01: save', async () => {}); test('CASE-02: edit', async () => {});",
  );
  f.write('first.md', ordinary('CASE-01', f.spec));
  f.write('second.md', '### CASE-02: unmigrated workflow\n\nManual steps.\n');
  let result = f.run('--area', join(f.manual, 'first.md'));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-02.*missing manual-mapping/);
  f.write('second.md', '### CASE-01: duplicate workflow\n\nManual steps.\n');
  result = f.run('--area', join(f.manual, 'first.md'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*duplicate case identity/);
});

test('additional evidence resolves separately and real-provider references are never executed', (t) => {
  const f = fixture(
    t,
    "test('CASE-01: save', async () => {}); test('archive bytes', { tag: '@technical' }, async () => {});",
  );
  const providerSpec = join(f.manual, 'provider.spec.mjs');
  writeFileSync(providerSpec, "throw new Error('Provider suite must not be loaded');\n");
  const metadata = {
    counterpart: { spec: f.spec, caseId: 'CASE-01' },
    reference: 'Desktop',
    outcomes: ['Saved'],
    evidence: [
      { kind: 'technical', spec: f.spec, title: 'archive bytes', purpose: 'Archive identity' },
      {
        kind: 'real-provider',
        spec: providerSpec,
        title: 'provider reply',
        purpose: 'Separate billable provider verification',
      },
    ],
  };
  const write = () => f.write('workflows.md', manualCase('CASE-01', metadata));
  write();
  // Exclude the separate provider suite from the integration fixture config.
  writeFileSync(
    join(f.manual, '..', 'playwright.config.mjs'),
    `export default { testDir: ${JSON.stringify(join(f.manual, '..'))}, testMatch: 'workflow.spec.mjs', workers: 1, retries: 0 };\n`,
  );
  let result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  metadata.evidence[0].title = 'missing archive evidence';
  write();
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*missing technical evidence.*missing archive evidence/);
});

test('metadata syntax, exclusive branches and selectors fail without stack traces', (t) => {
  const f = fixture(t, "test('CASE-01: save', async () => {});");
  f.write('workflows.md', '### CASE-01: workflow\n\n```manual-mapping\n{invalid}\n```\n');
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /workflows.md.*CASE-01.*invalid manual-mapping JSON/);
  assert.doesNotMatch(result.stderr, /at JSON.parse/);
  const metadata = {
    counterpart: { spec: f.spec, caseId: 'CASE-01', title: 'CASE-01: save' },
    humanObservation: { kind: 'screen-reader', observation: 'Listen to the status' },
    reference: 'Desktop',
    outcomes: ['Saved'],
  };
  f.write('workflows.md', manualCase('CASE-01', metadata));
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*exactly one counterpart or humanObservation/);
  assert.match(result.stderr, /CASE-01.*exactly one title or caseId/);
});

test('describe paths disambiguate identical names and selected areas must exist', (t) => {
  const f = fixture(
    t,
    "for (const mode of ['text', 'voice']) test.describe(mode, () => test('same workflow', async () => {}));",
  );
  f.write('workflows.md', ordinary('CASE-01', f.spec, { title: 'same workflow' }));
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ambiguous counterpart/);
  f.write(
    'workflows.md',
    ordinary('CASE-01', f.spec, { title: 'text > same workflow' }) +
      ordinary('CASE-02', f.spec, { title: 'voice > same workflow' }),
  );
  result = f.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  result = f.run('--area', join(f.manual, 'absent.md'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /selected area.*absent.md.*not found/);
});

test('a case has one metadata block and technical evidence cannot substitute for its workflow', (t) => {
  const f = fixture(t, "test('CASE-01: HTTP-only check', { tag: '@technical' }, async () => {});");
  const section = ordinary('CASE-01', f.spec);
  const block = section.slice(section.indexOf('```manual-mapping'));
  f.write('workflows.md', section + block);
  let result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*exactly one manual-mapping block/);
  f.write('workflows.md', section);
  result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CASE-01.*technical test cannot be an ordinary counterpart/);
});
