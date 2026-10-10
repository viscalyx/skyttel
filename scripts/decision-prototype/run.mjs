// Throwaway classifier experiment for #187; this does not execute application writes.
import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import OpenAI from 'openai';

const catalog = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
try {
  process.loadEnvFile(process.env.SKYTTEL_DEV_ENV_FILE ?? '.devcontainer/.env');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');
if (process.env.SKYTTEL_DECISIONS_EXPERIMENT_AUTHORIZED !== 'yes') {
  throw new Error('Set the authorization flag only after the user authorizes this experiment.');
}
const directory = resolve(process.argv[2] ?? '/tmp/skyttel-187-classifier-experiment');
await mkdir(directory, { mode: 0o700 });
const path = `${directory}/calls.jsonl`;
await writeFile(path, '', { mode: 0o600, flag: 'wx' });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 45000 });
const profiles = [
  { id: 'luna-decisions', model: 'gpt-6-luna', endpoint: 'decisions', effort: null },
  {
    id: 'luna-responses-high',
    model: 'gpt-6-luna',
    endpoint: 'responses',
    effort: 'high',
    prices: [0.1, 0.01, 0.125, 0.5],
  },
  {
    id: 'sol-responses-high',
    model: 'gpt-6.1-sol',
    endpoint: 'responses',
    effort: 'high',
    prices: [2, 0.1, 2.5, 10],
  },
];
const jobs = catalog.cases.flatMap((item) =>
  item.family === 'direction'
    ? ['generic', 'explicit'].map((policy) => ({ ...item, policy }))
    : [{ ...item, policy: 'explicit' }],
);
const source = await readFile(new URL('./run.mjs', import.meta.url), 'utf8');
const hash = (value) => createHash('sha256').update(value).digest('hex');
await writeFile(
  `${directory}/manifest.json`,
  JSON.stringify(
    {
      startedAt: new Date().toISOString(),
      profiles,
      cases: catalog,
      casesSha256: hash(JSON.stringify(catalog)),
      runnerSha256: hash(source),
      attemptsPlanned: jobs.length * profiles.length,
      repetitions: 1,
      authorization:
        'User authorized billable Decisions model tests in this session on 2026-10-10.',
      budgetUsd: null,
      scope: 'Exploratory classifier comparison; not application qualification.',
      pricingSources: [
        'https://developers.openai.com/api/docs/guides/decisions',
        'https://developers.openai.com/api/docs/pricing',
      ],
    },
    null,
    2,
  ),
  { mode: 0o600, flag: 'wx' },
);
const records = [];
let stop = false;
function price(usage, profile) {
  if (!Number.isSafeInteger(usage?.input_tokens) || !Number.isSafeInteger(usage?.output_tokens))
    return null;
  if (profile.endpoint === 'decisions') return (usage.input_tokens * 0.1) / 1_000_000;
  const cached = usage.input_tokens_details?.cached_tokens;
  const written = usage.input_tokens_details?.cache_write_tokens ?? 0;
  if (
    !Number.isSafeInteger(cached) ||
    !Number.isSafeInteger(written) ||
    usage.input_tokens - cached - written < 0
  )
    return null;
  const [inputPrice, cachedPrice, writePrice, outputPrice] = profile.prices;
  return (
    ((usage.input_tokens - cached - written) * inputPrice +
      cached * cachedPrice +
      written * writePrice +
      usage.output_tokens * outputPrice) /
    1_000_000
  );
}
for (const [index, job] of jobs.entries()) {
  if (stop) break;
  const choices = catalog[`${job.family}Choices`];
  const instructions =
    job.family === 'direction'
      ? catalog[job.policy === 'generic' ? 'directionGeneric' : 'directionExplicit']
      : catalog[`${job.family}Instructions`];
  const input = JSON.stringify({
    ...(job.family === 'direction'
      ? { objects: { A: 'Microsoft 365', B: 'Tenant Norrsken Bygg' } }
      : {}),
    ...job.input,
  });
  const ordered = [
    ...profiles.slice(index % profiles.length),
    ...profiles.slice(0, index % profiles.length),
  ];
  // Independent requests share one case; rotate admission order to reduce order effects.
  const settled = await Promise.allSettled(
    ordered.map(async (profile) => {
      const id = randomUUID();
      const request =
        profile.endpoint === 'decisions'
          ? {
              model: profile.model,
              input,
              questions: [{ type: 'choice', name: 'decision', instructions, choices }],
            }
          : {
              model: profile.model,
              reasoning: { effort: profile.effort },
              service_tier: 'default',
              store: false,
              tools: [],
              max_output_tokens: 4096,
              instructions: `${instructions}\nVälj exakt ett av följande alternativ enligt deras betydelse:\n${JSON.stringify(choices)}`,
              input: [{ role: 'user', content: input }],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'decision',
                  strict: true,
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      choice: { type: 'string', enum: choices.map((choice) => choice.value) },
                    },
                    required: ['choice'],
                  },
                },
              },
            };
      const startedAt = new Date().toISOString();
      await appendFile(
        path,
        `${JSON.stringify({
          id,
          phase: 'started',
          profile: profile.id,
          case: job.id,
          policy: job.policy,
          startedAt,
          request,
        })}\n`,
      );
      const start = performance.now();
      try {
        const result = await client[profile.endpoint].create(request).withResponse();
        const response = result.data;
        const costUsd = price(response.usage, profile);
        const answer =
          profile.endpoint === 'decisions'
            ? response.answers[0]
            : response.status === 'completed' && response.output_text
              ? JSON.parse(response.output_text)
              : null;
        const choice = answer?.choice ?? null;
        const record = {
          id,
          phase: 'completed',
          profile: profile.id,
          family: job.family,
          case: job.id,
          policy: job.policy,
          expected: job.expected,
          choice,
          matched: choice === job.expected,
          elapsedMs: performance.now() - start,
          endedAt: new Date().toISOString(),
          httpStatus: result.response.status,
          requestId: result.request_id,
          confidence: answer?.confidence ?? null,
          probabilities: answer?.probabilities ?? null,
          costUsd,
          usage: response.usage,
          response,
        };
        await appendFile(path, `${JSON.stringify(record)}\n`);
        if (costUsd === null) stop = true;
        return record;
      } catch (error) {
        stop = true;
        const record = {
          id,
          phase: 'error',
          profile: profile.id,
          family: job.family,
          case: job.id,
          policy: job.policy,
          expected: job.expected,
          choice: null,
          matched: false,
          elapsedMs: performance.now() - start,
          endedAt: new Date().toISOString(),
          httpStatus: error.status ?? null,
          errorCode: error.code ?? null,
          requestId: error.request_id ?? null,
          costUsd: null,
        };
        await appendFile(path, `${JSON.stringify(record)}\n`);
        return record;
      }
    }),
  );
  for (const item of settled) {
    if (item.status === 'fulfilled') records.push(item.value);
    else {
      stop = true;
      console.error(JSON.stringify({ localError: String(item.reason) }));
    }
  }
  console.log(
    JSON.stringify({
      completed: index + 1,
      total: jobs.length,
      case: job.id,
      policy: job.policy,
      outcomes: settled.map((item) =>
        item.status === 'fulfilled'
          ? {
              profile: item.value.profile,
              choice: item.value.choice,
              expected: job.expected,
              matched: item.value.matched,
            }
          : { localError: true },
      ),
    }),
  );
}
const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const groups = profiles.flatMap((profile) =>
  ['direction:generic', 'direction:explicit', 'save:explicit', 'route:explicit'].map((group) => {
    const items = records.filter(
      (record) => record.profile === profile.id && `${record.family}:${record.policy}` === group,
    );
    const times = items.map((item) => item.elapsedMs);
    return {
      profile: profile.id,
      group,
      attempts: items.length,
      passed: items.filter((item) => item.matched).length,
      failed: items
        .filter((item) => !item.matched)
        .map((item) => ({
          case: item.case,
          expected: item.expected,
          choice: item.choice,
          phase: item.phase,
          confidence: item.confidence,
        })),
      medianMs: times.length ? median(times) : null,
      totalMs: times.reduce((sum, value) => sum + value, 0),
      minMs: times.length ? Math.min(...times) : null,
      maxMs: times.length ? Math.max(...times) : null,
      costUsd: items.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
    };
  }),
);
const publicRecords = records.map(({ response, ...record }) => record);
const report = {
  finishedAt: new Date().toISOString(),
  stopped: stop,
  attemptsPlanned: jobs.length * profiles.length,
  attemptsObserved: records.length,
  missingCharges: records.filter((item) => item.costUsd === null).length,
  totalCostUsd: records.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
  groups,
  records: publicRecords,
  limitations: [
    'One preliminary repetition; synthetic hand-labelled cases; no held-out calibration.',
    'Independent parallel requests per case; shared account; latency is not end-to-end application time.',
    'Classifier only: no application writes, voice/audio, save receipts or full model qualification.',
    'Generic and explicit direction policies isolate prompt framing as well as endpoint/model differences.',
  ],
};
await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`, {
  mode: 0o600,
  flag: 'wx',
});
console.log(JSON.stringify({ directory, ...report, records: undefined }));
if (stop) process.exitCode = 1;
