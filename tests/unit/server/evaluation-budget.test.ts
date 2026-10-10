import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { EvaluationBudget } from '../../../scripts/model-evaluation/budget.js';

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
