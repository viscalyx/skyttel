import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { EvaluationBudget } from '../../../scripts/model-evaluation/budget.js';
import {
  budgetedProvider,
  type ProviderCall,
  requestMaximum,
  verifiedProfile,
} from '../../../scripts/model-evaluation/provider.js';
import { summarizeConversation } from '../../../src/server/conversation-summary.js';
import { textModel } from '../../../src/server/text-assistant-model.js';

test('backend and historical summary use the selected model limit and settle separate costs', {
  tags: ['technical'],
}, async () => {
  const db = new Database(':memory:');
  try {
    const profile = verifiedProfile('luna-high');
    const budget = new EvaluationBudget(db, {
      authorized: true,
      priorUsd: 0,
      priorSource: 'Non-billable output-limit regression.',
    });
    const calls: ProviderCall[] = [];
    const provider = budgetedProvider(profile, budget, {
      record: (call) => calls.push({ ...call }),
      transport: async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        expect(request.max_output_tokens).toBe(profile.modelMaxOutputTokens);
        return Response.json({
          model: profile.model,
          service_tier: 'default',
          status: 'completed',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'Historiska uppgifter med osäkerhet.' }],
            },
          ],
          usage: {
            input_tokens: 20,
            output_tokens: 9000,
            input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
            output_tokens_details: { reasoning_tokens: 8900 },
          },
        });
      },
    });
    const model = textModel('synthetic-key', provider.fetch, undefined, profile);
    const signal = new AbortController().signal;
    provider.beginStep(0, { scenario: 'limits', step: 'change', modality: 'text', repetition: 1 });
    await model('Utför uppdraget.', [], [], signal);
    provider.beginStep(0, { scenario: 'limits', step: 'summary', modality: 'text', repetition: 1 });
    expect(await summarizeConversation(model, 'Historisk källa.', signal, () => {})).toBe(
      'Historiska uppgifter med osäkerhet.',
    );
    const settled = calls.filter((call) => call.endedAt);
    expect(settled.map((call) => call.kind)).toEqual(['backend', 'summary']);
    expect(settled.every((call) => call.reservationUsd === requestMaximum(profile, 128000))).toBe(
      true,
    );
    expect(settled.every((call) => call.costUsd !== null)).toBe(true);
    expect(budget.snapshot()).toMatchObject({ stopped: false, reservedUsd: 0 });
    expect(budget.callsStarted).toBe(2);
  } finally {
    db.close();
  }
});

test('invalid profile and explicit request limits cannot reach the provider', {
  tags: ['technical'],
}, async () => {
  const profile = verifiedProfile('luna-low');
  const model = textModel(
    'synthetic-key',
    async () => {
      throw new Error('unexpected_network');
    },
    undefined,
    profile,
  );
  for (const limit of [0, -1, 1.5, profile.maxOutputTokens + 1]) {
    expect(() => verifiedProfile(profile.id, { ...profile, maxOutputTokens: limit })).toThrow(
      'evaluation_invalid_profile',
    );
    await expect(
      model('Instruktion.', [], [], new AbortController().signal, limit),
    ).rejects.toThrow('invalid_model_output_limit');
  }
});
