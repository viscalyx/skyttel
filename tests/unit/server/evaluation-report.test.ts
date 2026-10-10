import { expect, test } from 'vitest';
import catalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import { compareProfiles, summarizeProfile } from '../../../scripts/model-evaluation/report.js';
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
