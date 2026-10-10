// Throwaway prompt experiment: unchanged #354 scenario through the real application.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';

if (process.env.SKYTTEL_DECISIONS_EXPERIMENT_AUTHORIZED !== 'yes') {
  throw new Error('Set the flag only after explicit authorization for paid experiments.');
}
const source = resolve(process.env.SKYTTEL_EVALUATION_SOURCE_ROOT ?? '/workspace');
try {
  process.loadEnvFile(process.env.SKYTTEL_DEV_ENV_FILE ?? `${source}/.devcontainer/.env`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is missing');
const moduleAt = (name) =>
  import(pathToFileURL(`${source}/scripts/model-evaluation/${name}.ts`).href);
const { EvaluationBudget } = await moduleAt('budget');
const { budgetedProvider, verifiedProfile } = await moduleAt('provider');
const { contentJudge, verifyJudge } = await moduleAt('judge');
const { runTextScenario } = await moduleAt('runner');
const { privateEvaluationRecords } = await moduleAt('private-records');
const directory = resolve(process.argv[2] ?? '/tmp/skyttel-187-application-experiment');
await mkdir(directory, { mode: 0o700 });
const privateRecords = privateEvaluationRecords(directory);
const database = new Database(`${directory}/ledger.sqlite`);
const budget = new EvaluationBudget(database, {
  authorized: true,
  priorUsd: 0,
  priorSource:
    'Separate #187 prompt experiment authorized by the user; previous experiment spending is recorded separately. No user budget specified.',
});
const rule =
  'När ett riktat samband beställs mellan två objekt eller genom en uppräkning, ' +
  'är bara ändpunkterna givna. Objektens ordning och vad som verkar rimligt ' +
  'fastställer inte riktningen. Läs samtalets uttryckliga uppgifter; om riktningen ' +
  'saknas, skapa inget sådant samband. Ställ en riktad fråga med de två namngivna ' +
  'riktningarna via ask_questions eller submit_changes.questions, och gör samtidigt ' +
  'bara oberoende entydiga ändringar. Fråga inte om redan given sambandstyp. ' +
  'Ett tydligt följdsvar fastställer riktningen; föreslå då sambandet i utkastet, ' +
  'utan att spara eller fråga om sparande.';
const rawCatalog = await readFile(`${source}/scripts/model-evaluation/catalog.json`);
const scenario = JSON.parse(rawCatalog).scenarios.find(
  (item) => item.id === 'relationship-direction',
);
const hash = (data) => createHash('sha256').update(data).digest('hex');
const calls = new Map();
const controls = [];
const results = [];
const record = (call) => {
  privateRecords.call(call);
  calls.set(call.id, call);
};
const costs = (id) => {
  const ended = [...calls.values()].filter((call) => call.profile === id && call.endedAt);
  return ended.some((call) => call.costUsd === null)
    ? null
    : ended.reduce((total, call) => total + call.costUsd, 0);
};
await writeFile(
  `${directory}/manifest.json`,
  JSON.stringify(
    {
      startedAt: new Date().toISOString(),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: source,
        encoding: 'utf8',
      }).trim(),
      runnerSha256: hash(await readFile(new URL('./application.mjs', import.meta.url))),
      catalogSha256: hash(rawCatalog),
      scenario,
      rule,
      profiles: ['sol-high', 'luna-high'],
      repetitions: 1,
      modality: 'text',
      authorization: 'User explicitly authorized the #187 model experiment.',
      budgetUsd: null,
      productionChanges: false,
    },
    null,
    2,
  ),
  { mode: 0o600, flag: 'wx' },
);
let calibration = false;
try {
  const judgeProvider = budgetedProvider(verifiedProfile('judge-sol-high'), budget, { record });
  const judge = contentJudge(apiKey, judgeProvider);
  calibration = await verifyJudge(judge, async (id, verdicts, expected) => {
    controls.push({ id, verdicts, expected });
    privateRecords.observation({ kind: 'judge-control', id, verdicts, expected });
    console.log(
      JSON.stringify({
        control: id,
        matched: verdicts.every((item) => item.outcome === expected[item.id]),
      }),
    );
  });
  if (!calibration)
    throw new Error('Judge controls did not match; no application attempt admitted.');
  for (const id of ['sol-high', 'luna-high']) {
    if (budget.snapshot().stopped) break;
    const profile = verifiedProfile(id);
    const provider = budgetedProvider(profile, budget, { record });
    const modelFetch = async (url, init) => {
      const payload = JSON.parse(String(init?.body));
      if (typeof payload.instructions !== 'string') throw new Error('Expected string instructions');
      // Preserve input, tools, results and oracle. Provider records the augmented payload.
      payload.instructions += `\n\n${rule}`;
      return provider.fetch(url, { ...init, body: JSON.stringify(payload) });
    };
    const run = await runTextScenario(
      scenario,
      {
        providerApiKey: apiKey,
        modelProfile: profile,
        modelFetch,
      },
      {
        profile: id,
        repetition: 1,
        judge,
        beginStep: provider.beginStep,
        costs: () => costs(id),
        judgeCosts: () => costs('judge-sol-high'),
        stopped: () => budget.snapshot().stopped,
        stopReason: () => budget.snapshot().reason,
        providerCalls: () => budget.callsStarted,
        recordObservation: (event) => privateRecords.observation({ profile: id, event }),
        record: async (attempt) => {
          results.push(attempt);
          await writeFile(
            `${directory}/${id}-${attempt.step}.json`,
            JSON.stringify(attempt, null, 2),
            { mode: 0o600, flag: 'wx' },
          );
          console.log(
            JSON.stringify({
              profile: id,
              step: attempt.step,
              outcome: attempt.outcome,
              fixed: attempt.fixed,
              content: attempt.content,
              cost: attempt.backendCostUsd,
            }),
          );
        },
      },
    );
    privateRecords.observation({ profile: id, finalMap: run.finalMap });
  }
} finally {
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        calibration,
        controls,
        attempts: results,
        calls: [...calls.values()].map(
          ({ request: _request, response: _response, ...call }) => call,
        ),
        actualCostUsd: [...calls.values()].reduce((total, call) => total + (call.costUsd ?? 0), 0),
        ledger: budget.snapshot(),
      },
      null,
      2,
    ),
    { mode: 0o600, flag: 'wx' },
  );
  privateRecords.close();
  database.close();
}
