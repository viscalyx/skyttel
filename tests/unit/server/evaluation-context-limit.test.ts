import { expect, test } from 'vitest';
import {
  contextLimitFixture,
  runApplicationContextLimit,
  runContextLimit,
} from '../../../scripts/model-evaluation/context-limit.js';
import { modelMessage, pricedProvider, textModel } from '../../support/text-model.js';

test('ordinary bounded conversation growth cannot claim a model boundary from a forced or low-usage summary', {
  tags: ['technical'],
}, async () => {
  const fixture = contextLimitFixture(3);
  const submitted: string[] = [];
  const result = await runContextLimit(fixture, {
    origin: 'provider',
    contextTokens: 1_050_000,
    submit: async (text) => {
      submitted.push(text);
      return { outcome: 'pass', generation: 1, inputTokens: 120, summary: true };
    },
  });
  expect(result.boundary).toBe('inconclusive');
  expect(result.reason).toBe('growth_bound_reached_without_measured_boundary');
  expect(submitted).toHaveLength(4);
  expect(result.turns).toHaveLength(4);
  expect(result.successfulCompletionMs).toBeNull();
  expect(fixture.growth.every((text) => text.length <= 4000)).toBe(true);
});

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

test('growth stops at its first terminal failure without inventing successful time or dependent turns', {
  tags: ['technical'],
}, async () => {
  let calls = 0;
  const result = await runContextLimit(contextLimitFixture(4), {
    origin: 'controlled',
    contextTokens: 1_050_000,
    submit: async () => {
      calls++;
      return { outcome: 'error', generation: 0, inputTokens: null, summary: false };
    },
  });
  expect(calls).toBe(1);
  expect(result.turns).toHaveLength(1);
  expect(result.reason).toBe('terminal_turn_error');
  expect(result.successfulCompletionMs).toBeNull();
});

test('measured natural application boundary still requires verified recall and cannot prove the provider maximum', {
  tags: ['technical'],
}, async () => {
  const stages: string[] = [];
  const result = await runContextLimit(contextLimitFixture(4), {
    origin: 'provider',
    contextTokens: 1_050_000,
    submit: async (_text, stage) => {
      stages.push(stage);
      return {
        outcome: 'pass',
        generation: stage === 'seed' ? 0 : 1,
        inputTokens: stage === 'seed' ? 1_000_000 : 500,
        summary: stage === 'growth',
      };
    },
  });
  expect(stages).toEqual(['seed', 'growth', 'recall']);
  expect(result.boundary).toBe('application_boundary');
  expect(result.physicalProviderMaximum).toBe('unverified');
  expect(result.reason).toBe('natural_application_transition_after_measured_growth');
});
