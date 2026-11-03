import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import audioManifest from '../../../scripts/model-evaluation/audio/manifest.json' with {
  type: 'json',
};
import catalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import { scenarioUtterances } from '../../../scripts/model-evaluation/follow-ups.js';
import {
  compareEvaluationProfiles,
  compareProfiles,
  evaluationReporter,
  summarizeProfile,
} from '../../../scripts/model-evaluation/report.js';
import { referenceSpeech } from '../../../scripts/model-evaluation/speech.js';
import type { Attempt, Catalog } from '../../../scripts/model-evaluation/types.js';

test('an everyday comparison keeps advanced costs visible without mixing them into its cost difference', {
  tags: ['technical'],
}, () => {
  const scenarios = [
    { id: 'daily', group: 'everyday' as const, steps: [{ id: 'a' }] },
    { id: 'complex', group: 'complex' as const, steps: [{ id: 'b' }] },
  ];
  const attempts: Attempt[] = [
    {
      scenario: 'daily',
      step: 'a',
      profile: 'reference',
      repetition: 1,
      modality: 'text',
      outcome: 'pass',
      fixed: [],
      elapsedMs: 1000,
      backendCostUsd: 0.01,
    },
    {
      scenario: 'complex',
      step: 'b',
      profile: 'reference',
      repetition: 1,
      modality: 'text',
      outcome: 'pass',
      fixed: [],
      elapsedMs: 10000,
      backendCostUsd: 1,
    },
  ];
  const reference = summarizeProfile(attempts, scenarios, 'reference', 'text', [1]);
  const candidate = summarizeProfile(
    attempts.map((attempt) => ({
      ...attempt,
      profile: 'candidate',
      backendCostUsd: attempt.scenario === 'complex' ? 100 : 0.01,
    })),
    scenarios,
    'candidate',
    'text',
    [1],
  );
  expect(candidate.groups.complex.backendCostUsd).toBe(100);
  expect(compareProfiles(reference, candidate)).toMatchObject({ costDifferenceUsd: 0 });
});

test('a failed reference can support a scoped correctness decision without timing comparison', {
  tags: ['technical'],
}, () => {
  const scenarios = [{ id: 'one', steps: [{ id: 'a' }] }];
  const base = {
    scenario: 'one',
    step: 'a',
    repetition: 1,
    modality: 'text' as const,
    backendCostUsd: 0,
  };
  const reference = summarizeProfile(
    [
      {
        ...base,
        profile: 'reference',
        outcome: 'fail',
        fixed: ['effective_objects'],
        elapsedMs: null,
      },
    ],
    scenarios,
    'reference',
    'text',
    [1],
  );
  const candidate = summarizeProfile(
    [{ ...base, profile: 'candidate', outcome: 'pass', fixed: [], elapsedMs: 1000 }],
    scenarios,
    'candidate',
    'text',
    [1],
  );
  expect(compareProfiles(reference, candidate)).toMatchObject({
    label: 'Ej jämförbart',
    recommendation: expect.stringContaining('kravuppfyllelse'),
  });
});

test('missing advanced retention evidence blocks a recommendation without inventing a correctness verdict', {
  tags: ['technical'],
}, () => {
  const scenarios = [
    { id: 'daily', group: 'everyday' as const, steps: [{ id: 'a' }] },
    { id: 'complex', group: 'complex' as const, steps: [{ id: 'b' }] },
  ];
  const base = {
    profile: 'local',
    repetition: 1,
    modality: 'text' as const,
    fixed: [],
    backendCostUsd: 0,
  };
  const summary = summarizeProfile(
    [
      { ...base, scenario: 'daily', step: 'a', outcome: 'pass', elapsedMs: 1000 },
      {
        ...base,
        scenario: 'complex',
        step: 'b',
        outcome: 'fail',
        elapsedMs: null,
        assessment: {
          kind: 'inconclusive',
          reason: 'Exact retained work cannot be observed.',
          stateFailures: ['unfinished_instructions'],
          evidence: [],
        },
      },
    ],
    scenarios,
    'local',
    'text',
    [1],
  );
  expect(summary).toMatchObject({
    finalQualified: false,
    correctnessFailures: [],
    unresolvedAssessments: [{ scenario: 'complex', step: 'b', repetition: 1 }],
  });
});

test.each(['everyday', 'long_conversation', 'complex'] as const)(
  'a correctness failure in %s blocks an otherwise qualified everyday result',
  { tags: ['technical'] },
  (group) => {
    const scenarios = [
      { id: 'daily', group: 'everyday' as const, steps: [{ id: 'a' }] },
      { id: 'fault', group, steps: [{ id: 'b' }] },
    ];
    const base = { profile: 'local', repetition: 1, modality: 'text' as const, backendCostUsd: 0 };
    expect(
      summarizeProfile(
        [
          { ...base, scenario: 'daily', step: 'a', outcome: 'pass', fixed: [], elapsedMs: 1000 },
          {
            ...base,
            scenario: 'fault',
            step: 'b',
            outcome: 'fail',
            fixed: ['unrequested_save_attempt'],
            elapsedMs: null,
          },
        ],
        scenarios,
        'local',
        'text',
        [1],
      ),
    ).toMatchObject({
      finalQualified: false,
      correctnessFailures: [{ scenario: 'fault', step: 'b', repetition: 1 }],
    });
  },
);

test('timing comparisons require the same qualification scope and everyday scenarios', {
  tags: ['technical'],
}, () => {
  const values: Attempt[] = [
    {
      scenario: 'one',
      step: 'a',
      profile: 'local',
      repetition: 1,
      modality: 'text',
      outcome: 'pass',
      fixed: [],
      elapsedMs: 1000,
      backendCostUsd: 0,
    },
  ];
  const summary = summarizeProfile(
    values,
    [{ id: 'one', steps: [{ id: 'a' }] }],
    'local',
    'text',
    [1],
  );
  expect(compareProfiles(summary, { ...summary, qualificationScope: undefined })).toMatchObject({
    label: 'Ej jämförbart',
  });
  expect(
    compareProfiles(summary, {
      ...summary,
      scenarioTimes: [{ scenario: 'other', medianMs: 1000, minMs: 1000, maxMs: 1000 }],
    }),
  ).toMatchObject({ label: 'Ej jämförbart' });
});

test('everyday qualification names its scope and retains safe advanced inability without a completion time', {
  tags: ['technical'],
}, () => {
  const scenarios = [
    { id: 'daily', group: 'everyday' as const, steps: [{ id: 'a' }] },
    { id: 'long', group: 'long_conversation' as const, steps: [{ id: 'b' }] },
    { id: 'complex', group: 'complex' as const, steps: [{ id: 'c' }] },
  ];
  const base = {
    profile: 'local',
    repetition: 1,
    modality: 'text' as const,
    fixed: [],
    backendCostUsd: 0,
  };
  const attempts = [
    { ...base, scenario: 'daily', step: 'a', outcome: 'pass' as const, elapsedMs: 1000 },
    ...['long', 'complex'].map((scenario) => ({
      ...base,
      scenario,
      step: scenario === 'long' ? 'b' : 'c',
      outcome: 'fail' as const,
      elapsedMs: null,
      assessment: {
        kind: 'safe_inability' as const,
        stateFailures: [],
        reason: 'Limitation explained; exact instructions and all data preserved.',
        evidence: [{ id: 'safe', outcome: 'pass' as const, reason: 'Verified.' }],
      },
    })),
  ];
  const original = structuredClone(attempts);
  expect(summarizeProfile(attempts, scenarios, 'local', 'text', [1])).toMatchObject({
    qualified: false,
    finalQualified: true,
    qualificationScope: 'everyday',
    fullCatalogQualified: false,
    meanScenarioMedianMs: 1000,
    groups: {
      everyday: { qualified: true, completedScenarios: 1 },
      long_conversation: { qualified: false, safeInabilities: 1, scenarioTimes: [] },
      complex: { qualified: false, safeInabilities: 1, scenarioTimes: [] },
    },
  });
  expect(attempts).toEqual(original);
});

test.each(['json', 'md'])(
  'reporter refuses to overwrite existing %s evidence in a reused directory',
  { tags: ['technical'] },
  async (extension) => {
    const directory = await mkdtemp(join(tmpdir(), 'skyttel-report-collision-'));
    const path = join(directory, `0001-diagnostic.${extension}`);
    const original = 'Original evaluation evidence.\n';
    try {
      await writeFile(path, original, { flag: 'wx' });
      await expect(
        evaluationReporter(directory, 368)('diagnostic', 'Replacement', { replacement: true }),
      ).rejects.toMatchObject({ code: 'EEXIST' });
      expect(await readFile(path, 'utf8')).toBe(original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('public report artifacts hash session IDs throughout JSON, titles and prose', {
  tags: ['technical'],
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-public-report-'));
  const sessionId = ['live', 'u1', 'A'.repeat(32)].join('_');
  const otherId = ['live', 'u1', 'B'.repeat(32)].join('_');
  const reference = (id: string) =>
    `session-sha256-${createHash('sha256').update(id).digest('hex')}`;
  const data = {
    sessions: [{ sessionId }, { sessionId }, { sessionId: otherId }, { sessionId: null }],
    details: { reason: `Session ${sessionId} ended.`, attemptId: 'voice-attempt' },
    seconds: 5,
    costUsd: 0.01,
  };
  const original = structuredClone(data);
  try {
    const path = await evaluationReporter(directory, 368)(
      'diagnostic',
      `Session ${sessionId}`,
      data,
      `Compared with ${otherId}.`,
    );
    const json = await readFile(join(directory, '0001-diagnostic.json'), 'utf8');
    const markdown = await readFile(path, 'utf8');
    expect(JSON.parse(json)).toEqual({
      format: 'skyttel-model-evaluation',
      version: 1,
      issue: 368,
      type: 'diagnostic',
      data: {
        ...data,
        sessions: [
          { sessionId: reference(sessionId) },
          { sessionId: reference(sessionId) },
          { sessionId: reference(otherId) },
          { sessionId: null },
        ],
        details: { ...data.details, reason: `Session ${reference(sessionId)} ended.` },
      },
    });
    expect(markdown).toBe(
      `## Session ${reference(sessionId)}\n\nCompared with ${reference(otherId)}.\n\n` +
        `\`\`\`json\n${json}\`\`\`\n`,
    );
    expect(json + markdown).not.toContain(sessionId);
    expect(json + markdown).not.toContain(otherId);
    expect(data).toEqual(original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('qualification needs every step and repetition, with equal scenario weighting', {
  tags: ['technical'],
}, () => {
  const scenarios = [
    { id: 'one', steps: [{ id: 'a' }] },
    { id: 'two', steps: [{ id: 'b' }, { id: 'c' }] },
  ];
  const values: Attempt[] = [1, 2, 3].flatMap((repetition) =>
    scenarios.flatMap((scenario) =>
      scenario.steps.map((step) => ({
        scenario: scenario.id,
        step: step.id,
        profile: 'reference',
        repetition,
        modality: 'text' as const,
        outcome: 'pass' as const,
        fixed: [],
        elapsedMs: 10_000,
        backendCostUsd: 0.01,
      })),
    ),
  );
  const reference = summarizeProfile(values, scenarios, 'reference', 'text', [1, 2, 3]);
  expect(reference.meanScenarioMedianMs).toBe(15_000);
  const faster: Attempt[] = values.map((item) => ({
    ...item,
    profile: 'candidate',
    elapsedMs: 8000,
  }));
  expect(
    compareProfiles(reference, summarizeProfile(faster, scenarios, 'candidate', 'text', [1, 2, 3])),
  ).toMatchObject({ faster: true, deltaSeconds: 3, percent: 20 });
  faster[0].outcome = 'fail';
  faster[0].elapsedMs = null;
  expect(
    compareProfiles(reference, summarizeProfile(faster, scenarios, 'candidate', 'text', [1, 2, 3]))
      .label,
  ).toBe('Ej jämförbart');
  const singleRound = values.filter((item) => item.repetition === 1);
  const singleReference = summarizeProfile(singleRound, scenarios, 'reference', 'text', [1]);
  expect(singleReference.finalQualified).toBe(true);
  const singleCandidate = summarizeProfile(
    singleRound.map((item) => ({ ...item, profile: 'candidate', elapsedMs: 8000 })),
    scenarios,
    'candidate',
    'text',
    [1],
  );
  expect(compareProfiles(singleReference, singleCandidate)).toMatchObject({ faster: true });
  const slightlyFaster = compareProfiles(singleReference, {
    ...singleCandidate,
    meanScenarioMedianMs: 14_900,
    totals: [29_800],
  });
  expect(slightlyFaster).toMatchObject({ faster: true, deltaSeconds: 0.1 });
  expect(slightlyFaster.recommendation).toContain('Bedöm redovisad svarstid och kostnad');
  expect(compareProfiles(reference, singleCandidate)).toMatchObject({ label: 'Ej jämförbart' });
  expect(summarizeProfile(singleRound.slice(1), scenarios, 'reference', 'text', [1])).toMatchObject(
    { qualified: false, finalQualified: false },
  );
  expect(summarizeProfile(singleRound, scenarios, 'reference', 'text', [1, 2])).toMatchObject({
    qualified: false,
    finalQualified: false,
  });
  expect(summarizeProfile([], scenarios, 'reference', 'text', [])).toMatchObject({
    qualified: false,
    finalQualified: false,
  });
});

test.each(['marin'] as const)(
  '%s has verified PCM matching every voice utterance',
  {
    tags: ['technical'],
  },
  async (voice) => {
    const steps = (catalog as Catalog).scenarios
      .filter((scenario) => scenario.voice)
      .flatMap((scenario) => scenarioUtterances(scenario, true));
    expect(steps).toHaveLength(21);
    const files = new Set<string>();
    for (const step of steps) {
      const reference = await referenceSpeech(step.id, step.text, voice);
      expect(reference.clip.sampleRate).toBe(24000);
      expect(reference.clip.file.startsWith(`${voice}/`)).toBe(true);
      files.add(reference.clip.file);
      expect(Buffer.from(reference.pcm, 'base64').length).toBe(reference.clip.frames * 2);
      expect(reference.clip.durationSeconds).toBe(
        reference.clip.frames / reference.clip.sampleRate,
      );
    }
    expect(Object.keys(audioManifest.voices[voice].clips).sort()).toEqual(
      steps.map((step) => step.id).sort(),
    );
    const installed = await readdir(
      new URL(`../../../scripts/model-evaluation/audio/${voice}/`, import.meta.url),
    );
    expect(installed.filter((file) => file.endsWith('.wav')).sort()).toEqual(
      [...files].map((file) => file.slice(voice.length + 1)).sort(),
    );
  },
);

test('voice references reject scenario wording that differs from their recorded text', {
  tags: ['technical'],
}, async () => {
  const id = 'kort-utan-sparande';
  const reference = await referenceSpeech(id);
  await expect(referenceSpeech(id, reference.clip.text)).resolves.toEqual(reference);
  await expect(referenceSpeech(id, `${reference.clip.text} Extra text.`)).rejects.toThrow(
    `evaluation_audio_reference_mismatch:${id}`,
  );
});

test('voice admission rejects unreviewed audio before any paid session', {
  tags: ['technical'],
}, async () => {
  const status = audioManifest.review.status;
  try {
    audioManifest.review.status = 'pending';
    await expect(referenceSpeech('kort-utan-sparande')).rejects.toThrow(
      'evaluation_audio_unreviewed',
    );
  } finally {
    audioManifest.review.status = status;
  }
});

test('one supplied candidate can be recommended using a recorded text or voice reference', {
  tags: ['technical'],
}, () => {
  const summary = {
    profile: 'reference',
    modality: 'text' as 'text' | 'voice',
    qualified: true,
    finalQualified: true,
    meanScenarioMedianMs: 10_000,
    totals: [10_000, 10_000, 10_000],
    scenarioTimes: [{ scenario: 'one', medianMs: 10_000, minMs: 10_000, maxMs: 10_000 }],
    outcomes: { pass: 3 },
    backendCostUsd: 0.03,
  };
  for (const modality of ['text', 'voice'] as const) {
    const reference = {
      issue: 300,
      url: 'https://github.com/viscalyx/skyttel/issues/300',
      commit: 'same',
      catalogSha256: 'catalog',
      judgeSha256: 'judge',
      summary: { ...summary, modality },
    };
    const candidate = {
      ...summary,
      profile: 'supplied',
      modality,
      meanScenarioMedianMs: 8000,
      totals: [8000, 8000, 8000],
    };
    const current = {
      commit: 'same',
      catalogSha256: 'catalog',
      judgeSha256: 'judge',
      baselineProfiles: { [modality]: 'reference' },
    };
    const result = compareEvaluationProfiles([candidate], [reference], current);
    const changedAssistance = compareEvaluationProfiles([candidate], [reference], {
      ...current,
      followUps: true,
    });
    expect(changedAssistance.recommendationBasis).toBeNull();
    expect(changedAssistance.historicalComparisons[0]).toMatchObject({
      label: 'Ej jämförbart',
      changed: { followUps: true },
    });
    expect(result.comparisons).toEqual([]);
    expect(result.historicalComparisons).toHaveLength(1);
    expect(result.recommendation).toContain('Bedöm redovisad svarstid och kostnad');
    expect(result.recommendationBasis).toMatchObject({
      reference: 'reference',
      referenceIssue: 300,
      candidate: 'supplied',
      faster: true,
    });
    expect(
      compareEvaluationProfiles(
        [{ ...candidate, totals: [8000], outcomes: { pass: 1 } }],
        [
          {
            ...reference,
            summary: {
              ...reference.summary,
              finalQualified: false,
              totals: [10_000],
              outcomes: { pass: 1 },
            },
          },
        ],
        current,
      ).recommendationBasis,
    ).toMatchObject({ referenceIssue: 300, faster: true });
    expect(
      compareEvaluationProfiles([candidate], [reference], {
        ...current,
        commit: 'changed',
      }).recommendationBasis,
    ).toBeNull();
    expect(
      compareEvaluationProfiles([{ ...candidate, finalQualified: false }], [reference], current)
        .recommendationBasis,
    ).toBeNull();
    expect(
      compareEvaluationProfiles(
        [candidate],
        [
          {
            ...reference,
            summary: {
              ...reference.summary,
              finalQualified: false,
              qualified: false,
              outcomes: { not_run: 3 },
            },
          },
        ],
        current,
      ).recommendationBasis,
    ).toBeNull();
    expect(
      compareEvaluationProfiles(
        [candidate],
        [
          {
            ...reference,
            summary: {
              ...reference.summary,
              finalQualified: false,
              qualified: false,
              outcomes: { fail: 1, pass: 2 },
            },
          },
        ],
        current,
      ).recommendationBasis,
    ).toMatchObject({ referenceIssue: 300, baseline: true });
    for (const judgeSha256 of ['different-judge', undefined]) {
      expect(
        compareEvaluationProfiles([candidate], [{ ...reference, judgeSha256 }], current)
          .recommendationBasis,
      ).toBeNull();
    }
    expect(
      compareEvaluationProfiles([candidate], [reference], {
        ...current,
        baselineProfiles: { [modality]: 'current-application-model' },
      }).recommendationBasis,
    ).toBeNull();
  }
});
