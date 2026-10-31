import { AsyncLocalStorage } from 'node:async_hooks';
import type { Provider } from './config.js';

// Proof belongs to one validated callback and only to sessions it creates.
// Looking up linked accounts on the restored user would grant excess authority.
const callbacks = new AsyncLocalStorage<{ provider?: Provider; subject?: string }>();

export function withProviderProof<T>(operation: () => T): T {
  return callbacks.run({}, operation);
}

export function recordProviderProof(provider: Provider, subject: string) {
  const proof = callbacks.getStore();
  if (proof) Object.assign(proof, { provider, subject });
}

export function sessionProviderProof() {
  const proof = callbacks.getStore();
  return { loginProvider: proof?.provider ?? null, loginSubject: proof?.subject ?? null };
}
