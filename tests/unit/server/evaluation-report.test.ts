import { expect, test } from 'vitest';
import catalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import {
  compareEvaluationProfiles,
  compareProfiles,
  summarizeProfile,
} from '../../../scripts/model-evaluation/report.js';
import { referenceSpeech } from '../../../scripts/model-evaluation/speech.js';
import type { Attempt } from '../../../scripts/model-evaluation/types.js';

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
  ).toMatchObject({ rule: true, deltaSeconds: 3, percent: 20 });
  faster[0].outcome = 'fail';
  faster[0].elapsedMs = null;
  expect(
    compareProfiles(reference, summarizeProfile(faster, scenarios, 'candidate', 'text', [1, 2, 3]))
      .label,
  ).toBe('Ej jämförbart');
  expect(summarizeProfile(values, scenarios, 'reference', 'text', [1]).finalQualified).toBe(false);
});

test('the eight voice scenarios use all thirteen original verified PCM clips', {
  tags: ['technical'],
}, async () => {
  const steps = catalog.scenarios
    .filter((scenario) => scenario.voice)
    .flatMap((scenario) => scenario.steps.filter((step) => 'text' in step));
  expect(steps).toHaveLength(13);
  let frames = 0;
  for (const step of steps) {
    const reference = await referenceSpeech(step.id);
    expect(reference.clip.text).toBe(step.text);
    frames += reference.clip.frames;
  }
  expect(frames).toBe(6_849_024);
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
    expect(result.comparisons).toEqual([]);
    expect(result.historicalComparisons).toHaveLength(1);
    expect(result.recommendation).toContain('motiverar ett byte');
    expect(result.recommendationBasis).toMatchObject({
      reference: 'reference',
      referenceIssue: 300,
      candidate: 'supplied',
      rule: true,
    });
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
