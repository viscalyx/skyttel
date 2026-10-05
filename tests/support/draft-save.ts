import { type APIRequestContext, expect } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from './client.js';

export async function prepareDraftSave(client: APIRequestContext, origin: string) {
  await signIn(client, origin);
  const { household } = await (await createHousehold(client, origin)).json();
  const path = `${origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await client.get(path)).json();
  const initial = await read();
  expect(
    (
      await client.post(`${path}/draft`, {
        headers: { origin },
        data: {
          version: initial.draft.version,
          id: 'bike',
          baseRevision: null,
          value: { typeId: initial.types[0].id, name: 'Alex blå cykel', description: '' },
        },
      })
    ).status(),
  ).toBe(200);
  return { path, read, household };
}
