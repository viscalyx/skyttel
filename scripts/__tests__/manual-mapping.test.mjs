import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    `export default { testDir: ${JSON.stringify(directory)}, workers: 1, retries: 0 };\n`,
  );
  return {
    spec,
    manual,
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
          ...args,
        ],
        { encoding: 'utf8', timeout: 30_000 },
      );
    },
  };
}

function ordinary(id, spec, selector = { caseId: id }) {
  return `### ${id}: workflow\n\n\`\`\`manual-mapping\n${JSON.stringify(
    {
      counterpart: { spec, ...selector },
      reference: '1280px, light',
      outcomes: ['Saved data survives restart'],
    },
    null,
    2,
  )}\n\`\`\`\n`;
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
  const write = () =>
    f.write(
      'observations.md',
      `### AUDIO-01: observation\n\n\`\`\`manual-mapping\n${JSON.stringify(metadata)}\n\`\`\`\n`,
    );
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
  const write = () =>
    f.write(
      'workflows.md',
      `### CASE-01: workflow\n\n\`\`\`manual-mapping\n${JSON.stringify(metadata)}\n\`\`\`\n`,
    );
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
  f.write(
    'workflows.md',
    `### CASE-01: workflow\n\n\`\`\`manual-mapping\n${JSON.stringify(metadata)}\n\`\`\`\n`,
  );
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
