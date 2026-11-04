import { expect, test } from 'vitest';
import { prepareComparison } from '../../../scripts/model-evaluation/comparison.js';
import type { LiveEvaluationProfile } from '../../../scripts/model-evaluation/live.js';
import {
  compareOverlap,
  overlapComparison,
  overlapScenarios,
} from '../../../scripts/model-evaluation/overlap.js';
import profiles from '../../../scripts/model-evaluation/profiles.json' with { type: 'json' };
import { verifiedProfile } from '../../../scripts/model-evaluation/provider.js';
import type { Attempt } from '../../../scripts/model-evaluation/types.js';

function dialog(uncertainty = 0) {
  const voice = {
    ...profiles.profiles.find((profile) => profile.role === 'voice'),
    backend: 'sol-high',
  } as LiveEvaluationProfile;
  const comparison = prepareComparison(
    overlapComparison({ directory: '/controlled/app', modality: 'voice' }),
    overlapScenarios(),
    verifiedProfile('sol-high'),
    {
      catalog: 'controlled',
      audio: 'controlled',
      judge: 'controlled',
      followUps: true,
      voice,
    },
  );
  const interval = (point: number) => ({ lower: point - uncertainty, upper: point + uncertainty });
  const steps = overlapScenarios()[1].steps;
  const clocks = [
    [0, 100, 200],
    [500, 900, 1000],
    [1300, 1700, 1800],
  ];
  const attempts: Attempt[] = steps.map((step, index) => {
    const [start, end, completed] = clocks[index];
    return {
      scenario: 'overlap-clarification',
      step: step.id,
      profile: voice.id,
      applicationVersion: 'sequential',
      applicationCommit: comparison.versions[0].commit,
      comparisonContract: comparison.contractId,
      modality: 'voice',
      repetition: 1,
      outcome: 'pass',
      fixed: [],
      elapsedMs: 100,
      backendCostUsd: 0,
      judgeCostUsd: 0,
      playbackAssessmentCostUsd: 0,
      timing: {
        contract: 'voice-rendered-v1',
        submittedAt: end + uncertainty,
        queueMs: 0,
        firstResponseMs: null,
        firstUsefulMs: null,
        observedResponseEndMs: 100,
        successfulCompletionMs: 100,
      },
      playback: {
        contract: 'voice-rendered-v1',
        input: {
          sha256: 'a'.repeat(64),
          frames: (end - start) * 48,
          speechFrames: (end - start) * 48,
          sampleRate: 48000,
          drainedAt: end + uncertainty,
          started: interval(start),
          ended: interval(end),
        },
        recordingSha256: 'b'.repeat(64),
        frames: 48000,
        firstFrame: 0,
        sampleRate: 48000,
        lastActiveFrame: 4800,
        renderedEnd: interval(completed),
        candidates: [
          {
            callId: `candidate-${index}`,
            profile: 'controlled',
            outcome: 'recognized',
            costUsd: 0,
            recordingSha256: 'b'.repeat(64),
            alignmentMarginMs: 0,
            lastWordEndSeconds: 0.1,
            requiredResponse: [
              { id: 'voice-rendered-response', outcome: 'pass', reason: 'Worked fixture.' },
            ],
          },
        ],
        limitation: 'Independent worked device-clock fixture.',
      },
    };
  });
  return {
    comparison,
    attempts,
    row: () => compareOverlap(attempts, comparison).rows[1].versions[0].repetitions[0],
  };
}

test('clarification reports whole scripted-dialog wait with required reply speech and measured harness gaps', {
  tags: ['technical'],
}, () => {
  const fixture = dialog();
  expect(fixture.row()).toMatchObject({
    valid: true,
    endpointMs: 1100,
    dialogTiming: {
      contract: 'scripted-dialog-wait-v1',
      status: 'complete',
      wallMs: { lower: 1700, upper: 1700 },
      harnessGapMs: { lower: 600, upper: 600 },
      replyInputMs: { lower: 800, upper: 800 },
      cumulativeResponseWaitMs: 300,
      applicationWaitMs: { lower: 1100, upper: 1100 },
    },
  });
});

test('valid nonzero device-clock intervals retain conservative dialog wait bounds', {
  tags: ['technical'],
}, () => {
  const fixture = dialog(5);
  expect(fixture.row()).toMatchObject({
    valid: true,
    endpointMs: 1130,
    dialogTiming: {
      wallMs: { lower: 1690, upper: 1710 },
      harnessGapMs: { lower: 580, upper: 620 },
      replyInputMs: { lower: 780, upper: 820 },
      applicationWaitMs: { lower: 1070, upper: 1130 },
    },
  });
});

test.each(['missing-start', 'incompatible-clock', 'out-of-order'] as const)(
  'clarification with %s is inconclusive rather than substituting cumulative turn waits',
  { tags: ['technical'] },
  (fault) => {
    const fixture = dialog();
    const input = fixture.attempts[1].playback?.input;
    if (!input) throw new Error('Missing worked input');
    if (fault === 'missing-start') delete input.started;
    else if (fault === 'incompatible-clock') fixture.attempts[1].timing!.submittedAt = 100000;
    else input.started = { lower: 10, upper: 10 };
    expect(fixture.row()).toMatchObject({
      valid: false,
      endpointMs: null,
      dialogTiming: { status: 'inconclusive', endpointMs: null },
    });
  },
);
