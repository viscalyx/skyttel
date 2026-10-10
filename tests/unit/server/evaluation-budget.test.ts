import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { EvaluationBudget } from '../../../scripts/model-evaluation/budget.js';
import {
  budgetedLive,
  type LiveEvaluationProfile,
} from '../../../scripts/model-evaluation/live.js';
import profiles from '../../../scripts/model-evaluation/profiles.json' with { type: 'json' };

test('shared reservations prevent concurrent calls from overspending and preserve uncertain charges', {
  tags: ['technical'],
}, () => {
  const db = new Database(':memory:');
  try {
    const budget = new EvaluationBudget(db, {
      limitUsd: 10,
      priorUsd: 1,
      priorSource: 'verified receipt',
      authorized: true,
    });
    const voice = budget.reserve('voice', 6);
    const backend = budget.reserve('backend', 2);
    expect(() => budget.reserve('judge', 1.01)).toThrow('evaluation_budget_exceeded');
    budget.settle(backend, 0.4);
    expect(budget.snapshot()).toMatchObject({ spentUsd: 1.4, reservedUsd: 6, availableUsd: 2.6 });
    budget.settle(voice, null);
    expect(budget.snapshot()).toMatchObject({ reservedUsd: 6, stopped: true });
    expect(() => budget.reserve('judge', 0.01)).toThrow('evaluation_budget_exceeded');
  } finally {
    db.close();
  }
});

test('a failed paid voice startup retains its hold and counts as dispatched execution', {
  tags: ['technical'],
}, async () => {
  const db = new Database(':memory:');
  try {
    const budget = new EvaluationBudget(db, {
      authorized: true,
      limitUsd: 10,
      priorUsd: 0,
      priorSource: 'Isolated non-billable test.',
    });
    const profile = profiles.profiles.find(
      (item) => item.role === 'voice',
    ) as LiveEvaluationProfile;
    const live = budgetedLive(
      budget,
      60,
      () => {},
      async () => {
        throw new Error('connection_failed_after_dispatch');
      },
      profile,
    );
    expect(budget.callsStarted).toBe(0);
    await expect(
      live.fetch('https://api.openai.com/v1/live/sessions', {
        body: JSON.stringify({ session: { model: profile.model } }),
      }),
    ).rejects.toThrow('connection_failed_after_dispatch');
    live.usage({
      attemptId: 'failed-start',
      sessionId: null,
      startedAt: '2026-10-10T00:00:00Z',
      endedAt: '2026-10-10T00:00:01Z',
      model: profile.model,
      seconds: null,
      final: false,
      outcome: 'failed',
    });
    expect(budget.callsStarted).toBe(1);
    expect(budget.snapshot()).toMatchObject({
      stopped: true,
      reason: 'evaluation_usage_unknown',
      reservedUsd: profile.usdPerMinute,
    });
    await expect(
      live.fetch('https://api.openai.com/v1/live/sessions', {
        body: JSON.stringify({ session: { model: profile.model } }),
      }),
    ).rejects.toThrow('evaluation_usage_unknown');
    expect(budget.callsStarted).toBe(1);
  } finally {
    db.close();
  }
});
