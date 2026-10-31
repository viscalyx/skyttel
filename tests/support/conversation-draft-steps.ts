import type { Page } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from './client.js';
import { createInstallation } from './installation.js';
import { expect } from './test.js';
import { lastToolResult, modelMessage, modelTool, textModel } from './text-model.js';

export async function installation(page: Page, proposals = true) {
  let typeId = '';
  const app = await createInstallation(undefined, {
    modelFetch: textModel((body) => {
      const current = JSON.parse(
        String(body.input.findLast((item) => item.role === 'user')?.content),
      );
      if (!current?.draft?.changes?.length && !lastToolResult(body))
        return [
          modelTool('propose_object', {
            version: current.draft.version,
            contentVersion: current.draft.contentVersion,
            id: 'lo',
            baseRevision: null,
            value: { typeId, name: 'Lo Exempel' },
          }),
        ];
      return [modelMessage(proposals ? 'Ett provsvar.' : 'Lo ligger i utkastet.')];
    }).provider,
  });
  await signIn(page.request, app.origin);
  const { household } = await (
    await createHousehold(page.request, app.origin, 'Utkastprov')
  ).json();
  const path = `${app.origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await page.request.get(path)).json();
  const post = async (route: string, data: object) => {
    const state = await read();
    const response = await page.request.post(`${path}/${route}`, {
      headers: { origin: app.origin },
      data: { version: state.draft.version, contentVersion: state.contentVersion, ...data },
    });
    expect(response.status(), await response.text()).toBe(200);
  };
  typeId = (await read()).types[0].id;
  if (proposals) {
    const state = await read();
    await post('draft', {
      id: 'lo',
      baseRevision: null,
      value: { typeId: state.types[0].id, name: 'Lo Exempel' },
    });
  }
  await page.goto(`${app.origin}/households/${household.id}`);
  return { app, path, household, read, post };
}
