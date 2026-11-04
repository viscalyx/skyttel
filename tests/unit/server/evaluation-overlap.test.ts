import { expect, test } from 'vitest';
import { prepareComparison } from '../../../scripts/model-evaluation/comparison.js';
import { observationDiagnostics } from '../../../scripts/model-evaluation/observations.js';
import {
  compareOverlap,
  overlapComparison,
  overlapScenarios,
} from '../../../scripts/model-evaluation/overlap.js';
import type { ProviderCall } from '../../../scripts/model-evaluation/provider.js';
import { verifiedProfile } from '../../../scripts/model-evaluation/provider.js';
import {
  type OverlapExecution,
  prepareOverlapExecution,
} from '../../../scripts/model-evaluation/run-overlap.js';
import { referenceSpeech } from '../../../scripts/model-evaluation/speech.js';
import type { Attempt } from '../../../scripts/model-evaluation/types.js';

test('overlap plan binds the same committed application and all reviewed audio to separate declared outcomes', {
  tags: ['technical'],
}, async () => {
  const scenarios = overlapScenarios();
  expect(scenarios.map((scenario) => scenario.id)).toEqual([
    'overlap-success',
    'overlap-clarification',
    'overlap-early-stop',
  ]);
  for (const scenario of scenarios)
    for (const step of scenario.steps)
      await expect(referenceSpeech(step.id, step.text, 'marin')).resolves.toHaveProperty(
        'clip.sha256',
      );
  const selection = overlapComparison({ directory: '/controlled-clean-app', modality: 'text' });
  expect(selection.baseline.commit).toBe('2f4dd4ad694aa0030ef2b1d6f64b00e8abacc073');
  expect(selection.candidate.commit).toBe(selection.baseline.commit);
  expect(selection.baseline.conversationWorkMode).toBe('sequential');
  expect(selection.candidate.conversationWorkMode).toBe('overlap');
  const comparison = prepareComparison(selection, scenarios, verifiedProfile('sol-high'), {
    catalog: scenarios,
    audio: 'reviewed Marin',
    judge: 'controlled',
    followUps: true,
  });
  expect(comparison.order.map((entry) => entry.application.id)).toEqual([
    'sequential',
    'overlap',
    'overlap',
    'sequential',
    'sequential',
    'overlap',
    'overlap',
    'sequential',
    'sequential',
    'overlap',
  ]);
  expect(compareOverlap([], comparison)).toMatchObject({
    status: 'inconclusive',
    waitDecision: 'inconclusive',
    defaultDecision: 'retain sequential',
    rows: [
      { outcome: 'success', ratio: null },
      { outcome: 'clarification', ratio: null },
      { outcome: 'early_stop', ratio: null },
    ],
  });
});

test('the composed overlap driver prepares exact profiles without authorization or provider work', {
  tags: ['technical'],
}, () => {
  const backend = { ...verifiedProfile('sol-high'), id: 'sol-6.1-high-668' };
  const campaign = {
    optimizationProfiles: { judgeProfile: verifiedProfile('judge-sol-high') },
    optimizationBackend: () => backend,
    optimizationVoice: () => {
      throw new Error('Voice is not selected.');
    },
    optimizationPlaybackAssessor: () => {
      throw new Error('Voice is blocked.');
    },
  };
  const config: OverlapExecution = {
    format: 'skyttel-overlap-execution-v1',
    evaluatorCommit: 'a'.repeat(40),
    applicationDirectory: '/controlled/accepted-app',
    directory: '/controlled/results',
    profile: 'sol-6.1-high-668',
    modality: 'text',
    issue: null,
    authorization: { explicit: false, reference: 'No authorization exists.' },
    priorUsd: 0,
    priorSource: 'New controlled configuration.',
    localVerification: { passed: false, commands: [], evidence: 'Unrun.' },
  };
  expect(prepareOverlapExecution(config, campaign)).toMatchObject({
    authorized: false,
    apiKey: '',
    issue: 0,
    textProfiles: ['sol-6.1-high-668'],
    applicationComparison: {
      baseline: { conversationWorkMode: 'sequential' },
      candidate: { conversationWorkMode: 'overlap' },
    },
  });
  expect(() => prepareOverlapExecution({ ...config, modality: 'voice' }, campaign)).toThrow(
    'Voice is blocked.',
  );
  expect(() =>
    prepareOverlapExecution(config, {
      ...campaign,
      optimizationBackend: () => ({ ...backend, model: 'gpt-5.6-terra' }),
    }),
  ).toThrow('evaluation_overlap_exact_profile_required');
});

test('unused work joins only unique terminal provider identities and preserves unknown charges', {
  tags: ['technical'],
}, () => {
  const run = prepareComparison(
    overlapComparison({ directory: '/controlled/app', modality: 'text' }),
    overlapScenarios(),
    verifiedProfile('sol-high'),
    {
      catalog: 'controlled',
      audio: 'controlled',
      judge: 'controlled',
      followUps: true,
    },
  );
  const diagnostics = observationDiagnostics(
    [
      {
        at: 1,
        sessionId: 'local',
        kind: 'model_attempt',
        data: {
          attemptId: 'work-1',
          endedAt: 1,
          responseId: 'response-1',
          providerRequestId: 'request-1',
        },
      },
      {
        at: 2,
        sessionId: 'local',
        kind: 'work_result',
        data: {
          providerCallId: 'work-1',
          executionMode: 'overlap',
          disposition: 'discarded',
          reason: 'stopped',
        },
      },
    ],
    0,
  );
  const attempt: Attempt = {
    scenario: 'overlap-early-stop',
    step: 'kort-utan-sparande',
    profile: 'sol-high',
    repetition: 1,
    applicationVersion: 'overlap',
    modality: 'text',
    outcome: 'aborted',
    elapsedMs: null,
    fixed: [],
    backendCostUsd: null,
    diagnostics,
  };
  const call: ProviderCall = {
    id: 'billing-1',
    startedAt: 0,
    endedAt: 1,
    kind: 'backend',
    model: 'gpt-6.1-sol',
    profile: 'sol-high',
    request: {},
    requestId: 'request-1',
    response: { id: 'response-1' },
    costUsd: null,
    reservationUsd: 6.53,
    outcome: 'aborted',
  };
  const report = compareOverlap([attempt], run, [], [call]);
  expect(report.rows[2].versions[1].workAccounting.unused[0]).toMatchObject({
    disposition: 'discarded',
    billing: { costUsd: null, reservationUsd: 6.53 },
  });
  const ambiguous = compareOverlap([attempt], run, [], [call, { ...call, id: 'billing-2' }]);
  expect(ambiguous.rows[2].versions[1].workAccounting.unused[0].billing).toBeNull();
  expect(report.status).toBe('inconclusive');
});
