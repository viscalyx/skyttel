import { type APIRequestContext, expect } from '@playwright/test';
import type { MapState, SaveOperation } from '../../src/shared/map.js';
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

export async function registerPendingSave(
  client: APIRequestContext,
  path: string,
  operationId: string,
) {
  const current: MapState = await (await client.get(path)).json();
  const response = await client.post(`${path}/operations`, {
    headers: { origin: new URL(path).origin },
    data: {
      operationId,
      version: current.draft.version,
      contentVersion: current.contentVersion,
    },
  });
  expect(response.status()).toBe(200);
  const { operation }: { operation: SaveOperation } = await response.json();
  expect(operation).toMatchObject({
    operationId,
    draftVersion: current.draft.version,
    contentVersion: current.contentVersion,
    status: 'pending',
  });
  return operation;
}
