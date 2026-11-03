import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import { verifiedProfile } from '../../../scripts/model-evaluation/provider.js';
import { modelMessage, textModel } from '../../support/text-model.js';

async function applicationVersion(label: string) {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-evaluation-version-'));
  const archive = execFileSync(
    'git',
    ['archive', 'HEAD', '.gitignore', 'package.json', 'src', 'migrations', 'scripts/seeds', 'tests/support'],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  execFileSync('tar', ['-x', '-C', directory], { input: archive });
  await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
  const path = join(directory, 'src/server/text-assistant.ts');
  const source = await readFile(path, 'utf8');
  const needle = "session.state.modelReply = turnReply(session, response.output_text, '\\n');";
  if (!source.includes(needle)) throw new Error('version_fixture_source_missing');
  await writeFile(path, source.replace(needle, `session.state.modelReply = ${JSON.stringify(label)} + ' ' + turnReply(session, response.output_text, '\\n');`));
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Evaluation', '-c', 'user.email=evaluation@example.test', '-c', 'commit.gpgSign=false', 'commit', '-qm', 'Controlled application version');
  return { id: label, directory, commit: git('rev-parse', 'HEAD') };
}

test('explicit application versions execute their own committed server with the same scenario', {
  tags: ['technical'], timeout: 30_000,
}, async () => {
  const versions = [await applicationVersion('Baseline'), await applicationVersion('Candidate')];
  try {
    for (const application of versions) {
      const model = textModel(() => [modelMessage('Svar.')]);
      const run = await runTextScenario(
        {
          id: 'same-contract', title: 'Same controlled request', voice: false,
          steps: [{ id: 'read', text: 'Vad vet du?', expected: { requirements: ['Ge hela svaret.'] } }],
        },
        {
          modelProfile: verifiedProfile('sol-high'),
          modelFetch: async (url, init) => {
            const response = await model.provider(url, init);
            return Response.json({ ...await response.json(), service_tier: 'default' }, { headers: response.headers });
          },
        },
        {
          profile: 'local', repetition: 1, application,
          judge: async (input) => {
            expect(input.sources.backend?.text).toBe(`${application.id} Svar.`);
            return input.requirements.map(({ id }) => ({ id, outcome: 'pass', reason: 'Full selected application response.' }));
          },
        },
      );
      expect(run.attempts[0]).toMatchObject({
        outcome: 'pass', applicationVersion: application.id, applicationCommit: application.commit,
      });
      expect(model.requests).toHaveLength(1);
      expect(model.requests[0]).toMatchObject({ model: 'gpt-6.1-sol', reasoning: { effort: 'high' } });
    }
  } finally {
    await Promise.all(versions.map(({ directory }) => rm(directory, { recursive: true, force: true })));
  }
});
