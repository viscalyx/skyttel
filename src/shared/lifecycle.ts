import type { FinancialFact, FinancialFacts } from './financial-facts.js';

export type Lifecycle = 'active' | 'ended';

export interface LifecycleValue {
  lifecycle?: Lifecycle;
  financialFacts?: FinancialFacts;
  endDate?: FinancialFact;
}

export function hasEnded(value: LifecycleValue) {
  return value.lifecycle === 'ended';
}
