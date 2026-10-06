import { type APIRequestContext, expect } from '@playwright/test';
import { conflictCollaborators } from './conflict-properties.js';

export async function prepareRemovedObjectConflict(
  first: APIRequestContext,
  second: APIRequestContext,
) {
  const app = await conflictCollaborators(first, second);
  const original = (await app.read()).objects.find((object) => object.id === 'lo');
  if (!original) throw new Error('Missing fixture object');
  await app.propose(first, 'draft', 'lo', {
    ...original,
    name: 'Lo Lind',
    description: 'Mitt förslag',
  });
  await app.propose(first, 'draft', 'independent', {
    typeId: original.typeId,
    name: 'Oberoende förslag',
    description: '',
  });
  await app.propose(second, 'draft', 'lo', null);
  expect((await app.save(second, 'removed-object')).status()).toBe(200);
  return app;
}
