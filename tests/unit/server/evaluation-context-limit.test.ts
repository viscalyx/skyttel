import { expect, test } from 'vitest';
import {
  contextLimitFixture,
  runApplicationContextLimit,
  runContextLimit,
} from '../../../scripts/model-evaluation/context-limit.js';
import { modelMessage, pricedProvider, textModel } from '../../support/text-model.js';

test.each(['pass', 'fail', 'error', 'aborted', 'inconclusive', 'not_run'] as const)(
  'ordinary growth stops at its first low-usage transition after one %s recall',
  {
    tags: ['technical'],
  },
  async (recallOutcome) => {
    const fixture = contextLimitFixture(3);
    const submitted: string[] = [];
    const result = await runContextLimit(fixture, {
      origin: 'provider',
      contextTokens: 1_050_000,
      submit: async (text, stage) => {
        submitted.push(text);
        return {
          outcome: stage === 'recall' ? recallOutcome : 'pass',
          generation: stage === 'seed' ? 0 : 1,
          inputTokens: stage === 'seed' ? 120 : stage === 'growth' ? 140 : 160,
          summary: stage === 'growth',
          callIds: stage === 'growth' ? ['summary', 'growth'] : [stage],
        };
      },
    });
    expect(submitted).toEqual([fixture.seed, fixture.growth[0], fixture.recall]);
    expect(result.boundary).toBe(
      recallOutcome === 'pass' ? 'configuration_limited' : 'inconclusive',
    );
    expect(result.reason).toBe(
      recallOutcome === 'pass'
        ? 'natural_application_transition_before_measured_capacity'
        : 'recall_not_verified_after_application_transition',
    );
    expect(result.physicalProviderMaximum).toBe('unverified');
    expect(result.turns).toEqual([
      {
        stage: 'seed',
        outcome: 'pass',
        generation: 0,
        inputTokens: 120,
        summary: false,
        callIds: ['seed'],
      },
      {
        stage: 'growth',
        outcome: 'pass',
        generation: 1,
        inputTokens: 140,
        summary: true,
        callIds: ['summary', 'growth'],
      },
      {
        stage: 'recall',
        outcome: recallOutcome,
        generation: 1,
        inputTokens: 160,
        summary: false,
        callIds: ['recall'],
      },
    ]);
    expect(result.successfulCompletionMs).toBeNull();
    expect(fixture.growth.every((text) => text.length <= 4000)).toBe(true);
  },
);

test.each(['seed-summary', 'generation-only'] as const)(
  'an observed %s transition stops growth even without both transition signals',
  { tags: ['technical'] },
  async (signal) => {
    const stages: string[] = [];
    const result = await runContextLimit(contextLimitFixture(4), {
      origin: 'provider',
      contextTokens: 1_050_000,
      submit: async (_text, stage) => {
        stages.push(stage);
        return {
          outcome: 'pass',
          generation: signal === 'generation-only' && stage !== 'seed' ? 1 : 0,
          inputTokens: null,
          summary: signal === 'seed-summary' && stage === 'seed',
        };
      },
    });
    expect(stages).toEqual(
      signal === 'seed-summary' ? ['seed', 'recall'] : ['seed', 'growth', 'recall'],
    );
    expect(result.boundary).toBe('configuration_limited');
    expect(result.physicalProviderMaximum).toBe('unverified');
  },
);

test('bounded growth uses ordinary authenticated application messages and real state checks without a summary hook', {
  tags: ['technical'],
  timeout: 30_000,
}, async () => {
  const model = textModel(
    () => [modelMessage('Diskussionsunderlaget är mottaget.')],
    () => [
      modelMessage(
        JSON.stringify({ mode: 'read', request: 'Diskutera utan ändringar eller sparande.' }),
      ),
    ],
  );
  const result = await runApplicationContextLimit(
    { modelFetch: pricedProvider(model.provider) },
    {
      origin: 'controlled',
      contextTokens: 1_050_000,
      maximumTurns: 2,
      profile: 'controlled',
      repetition: 1,
    },
  );
  expect(result.boundary).toBe('inconclusive');
  expect(result.physicalProviderMaximum).toBe('unverified');
  expect(result.turns).toHaveLength(3);
  expect(result.turns.every((turn) => turn.outcome === 'pass' && turn.fixed?.length === 0)).toBe(
    true,
  );
  expect(model.requests).toHaveLength(3);
  expect(
    model.requests[1].input.some((item) => JSON.stringify(item).includes('björklöv 731')),
  ).toBe(true);
  expect(
    model.requests.every((request) => !request.instructions.startsWith('Sammanfatta avslutad')),
  ).toBe(true);
});

test.each(['fail', 'error', 'aborted', 'inconclusive', 'not_run'] as const)(
  'a terminal %s growth turn prevents recall even when it observes a transition',
  {
    tags: ['technical'],
  },
  async (outcome) => {
    const stages: string[] = [];
    const result = await runContextLimit(contextLimitFixture(4), {
      origin: 'controlled',
      contextTokens: 1_050_000,
      submit: async (_text, stage) => {
        stages.push(stage);
        return {
          outcome: stage === 'seed' ? 'pass' : outcome,
          generation: stage === 'seed' ? 0 : 1,
          inputTokens: 120,
          summary: stage === 'growth',
          callIds: [stage],
        };
      },
    });
    expect(stages).toEqual(['seed', 'growth']);
    expect(result.turns).toHaveLength(2);
    expect(result.turns[1]).toEqual({
      stage: 'growth',
      outcome,
      generation: 1,
      inputTokens: 120,
      summary: true,
      callIds: ['growth'],
    });
    expect(result.reason).toBe(`terminal_turn_${outcome}`);
    expect(result.boundary).toBe('inconclusive');
    expect(result.physicalProviderMaximum).toBe('unverified');
    expect(result.successfulCompletionMs).toBeNull();
  },
);

test.each(['seed', 'growth'] as const)(
  'measured %s usage can establish only an application boundary after verified recall',
  {
    tags: ['technical'],
  },
  async (measuredStage) => {
    const stages: string[] = [];
    const result = await runContextLimit(contextLimitFixture(4), {
      origin: 'provider',
      contextTokens: 1_050_000,
      submit: async (_text, stage) => {
        stages.push(stage);
        return {
          outcome: 'pass',
          generation: stage === 'seed' ? 0 : 1,
          inputTokens: stage === measuredStage ? 1_000_000 : 500,
          summary: stage === 'growth',
        };
      },
    });
    expect(stages).toEqual(['seed', 'growth', 'recall']);
    expect(result.boundary).toBe('application_boundary');
    expect(result.physicalProviderMaximum).toBe('unverified');
    expect(result.reason).toBe('natural_application_transition_after_measured_growth');
  },
);
