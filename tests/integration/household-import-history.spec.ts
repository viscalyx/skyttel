import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState, SaveReceipt } from '../../src/shared/map.js';
import { createHousehold, openDraftReview, openTable, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('IMPORT-06: replacement preserves image history and private work, rejects old save attempts and permits ordinary corrections after restart', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const householdPath = `${installation.origin}/api/households/${household.id}`;
    const path = `${householdPath}/map`;
    const headers = { origin: installation.origin };
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    const post = (route: string, data: unknown) =>
      page.request.post(`${path}/${route}`, { headers, data });
    const save = async (operationId: string): Promise<SaveReceipt> => {
      const state = await read();
      const response = await post('save', {
        version: state.draft.version,
        contentVersion: state.contentVersion,
        operationId,
      });
      expect(response.status()).toBe(200);
      return (await response.json()).receipt;
    };
    for (const id of ['first', 'second']) {
      const state = await read();
      expect(
        (
          await post('draft', {
            version: state.draft.version,
            id,
            baseRevision: null,
            value: { typeId: state.types[0].id, name: 'Lo Exempel', description: '' },
          })
        ).status(),
      ).toBe(200);
    }
    let state = await read();
    expect(
      (
        await post('relationship', {
          version: state.draft.version,
          id: 'unknown-endpoint',
          baseRevision: null,
          value: {
            typeId: state.relationshipTypes[0].id,
            sourceId: 'second',
            targetId: null,
            knowledge: 'unknown',
          },
        })
      ).status(),
    ).toBe(200);
    await save('initial');
    for (const [id, x] of [
      ['first', 45],
      ['second', -23],
    ] as const)
      expect(
        (await post('view/position', { id, version: 0, position: { x, y: 8, z: 3 } })).status(),
      ).toBe(200);

    const upload = async (id: string, color: string) => {
      const current = await read();
      const png = await sharp({
        create: { width: 24, height: 18, channels: 3, background: color },
      })
        .png()
        .toBuffer();
      const response = await page.request.post(`${householdPath}/profile-images/${id}`, {
        headers: {
          ...headers,
          'content-type': 'image/png',
          'x-skyttel-draft-version': String(current.draft.version),
          'x-skyttel-content-version': String(current.contentVersion),
          'x-skyttel-object-revision': String(
            current.objects.find((object) => object.id === id)?.revision,
          ),
        },
        data: png,
      });
      expect(response.status()).toBe(200);
      const imageId = (await read()).draft.changes.find((change) => change.id === id)?.after
        ?.profileImageId;
      expect(imageId).toEqual(expect.any(String));
      return imageId as string;
    };
    const imageBytes = async (id: string) => {
      const response = await page.request.get(`${householdPath}/profile-images/${id}`);
      expect(response.status()).toBe(200);
      return response.body();
    };
    const originalImage = await upload('second', '#2255aa');
    await save('source-image');
    const originalBytes = await imageBytes(originalImage);
    const copiedImage = await upload('first', '#2255aa');
    const historicalSave = await save('image-with-history');
    expect(copiedImage).not.toBe(originalImage);
    const privateImage = await upload('first', '#aa5522');
    const privateBytes = await imageBytes(privateImage);
    const archivedState = await read();
    const archivedHistory = (await (await page.request.get(`${path}/history`)).json()).history;
    const prepared = await page.request.post(`${householdPath}/exports`, { headers, data: {} });
    expect(prepared.status()).toBe(201);
    const download = await page.request.get(
      `${householdPath}/exports/${(await prepared.json()).id}`,
    );
    expect(download.status()).toBe(200);
    const archive = await download.body();

    expect(
      (
        await post('draft', {
          version: archivedState.draft.version,
          id: 'not-in-archive',
          baseRevision: null,
          value: { typeId: archivedState.types[0].id, name: 'Senare objekt', description: '' },
        })
      ).status(),
    ).toBe(200);
    await page.goto(installation.origin);
    await openTable(page);
    const draft = await openDraftReview(page);
    let lostReceipt: SaveReceipt | undefined;
    await page.route('**/map/save', async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      lostReceipt = (await response.json()).receipt;
      await route.abort();
    });
    await draft.getByRole('button', { name: 'Spara hela utkastet' }).click();
    const unknownSave = page.getByRole('dialog', { name: 'Spara utkastet' });
    await expect(unknownSave.getByRole('status')).toContainText('Sparandet kunde inte bekräftas.');
    await expect(
      unknownSave.getByRole('button', { name: 'Kontrollera sparandet igen' }),
    ).toBeEnabled();
    await expect(draft.getByRole('button', { name: 'Spara hela utkastet' })).toBeDisabled();
    await expect(draft.getByRole('button', { name: 'Kasta hela utkastet' })).toBeDisabled();
    if (!lostReceipt) throw new Error('The later save must commit before its response is lost');
    expect((await read()).objects.some((object) => object.id === 'not-in-archive')).toBe(true);

    const imported = await page.request.post(`${householdPath}/imports`, {
      headers: {
        ...headers,
        'content-type': 'application/zip',
        'x-skyttel-content-version': String(archivedState.contentVersion),
      },
      data: archive,
    });
    expect(imported.status(), await imported.text()).toBe(201);
    const ready = await imported.json();
    expect(ready).toMatchObject({ status: 'ready', sourceHouseholdId: household.id });
    const confirmed = await page.request.post(`${householdPath}/imports/${ready.id}/confirm`, {
      headers,
      data: { contentVersion: archivedState.contentVersion, confirmed: true },
    });
    expect(confirmed.status()).toBe(200);
    const completed = await confirmed.json();
    expect(completed.status).toBe('completed');
    expect(completed.contentVersion).not.toBe(archivedState.contentVersion);
    await installation.restart();
    expect(
      (await (await page.request.get(`${householdPath}/imports/${ready.id}`)).json()).status,
    ).toBe('completed');
    state = await read();
    expect(state.contentVersion).toBe(completed.contentVersion);
    expect(state.objects).toEqual(archivedState.objects);
    expect(state.relationships).toEqual(archivedState.relationships);
    expect(state.draft).toEqual(archivedState.draft);
    expect((await (await page.request.get(`${path}/history`)).json()).history).toEqual(
      archivedHistory,
    );
    expect(await imageBytes(originalImage)).toEqual(originalBytes);
    expect(await imageBytes(copiedImage)).toEqual(originalBytes);
    expect(await imageBytes(privateImage)).toEqual(privateBytes);

    for (const oldReceipt of [lostReceipt, historicalSave]) {
      const retried = await post('save', {
        operationId: oldReceipt.operationId,
        version: oldReceipt.draftVersion,
        contentVersion: oldReceipt.contentVersion,
      });
      expect(retried.status()).toBe(409);
    }
    expect(
      (
        await post('draft', {
          version: archivedState.draft.version,
          contentVersion: archivedState.contentVersion,
          id: 'stale-proposal',
          baseRevision: null,
          value: { typeId: archivedState.types[0].id, name: 'Gammalt underlag', description: '' },
        })
      ).status(),
    ).toBe(409);
    expect(await read()).toEqual(state);
    expect((await (await page.request.get(`${path}/history`)).json()).history).toEqual(
      archivedHistory,
    );

    // A fresh client can continue ordinary draft work with the current generation.
    expect(
      (
        await post('discard', {
          version: state.draft.version,
          contentVersion: state.contentVersion,
        })
      ).status(),
    ).toBe(200);
    state = await read();
    const current = state.objects.find((object) => object.id === 'second');
    if (!current) throw new Error('The restored object must exist');
    expect(
      (
        await post('draft', {
          version: state.draft.version,
          contentVersion: state.contentVersion,
          id: current.id,
          baseRevision: current.revision,
          value: { ...current, description: 'Ny vanlig rättelse' },
        })
      ).status(),
    ).toBe(200);
    const corrected = await save('correction-after-import');
    expect(corrected.contentVersion).toBe(completed.contentVersion);
    await installation.restart();
    state = await read();
    expect(state.objects.map((object) => object.id).sort()).toEqual(['first', 'second']);
    expect(state.objects.find((object) => object.id === 'second')?.profileImageId).toBe(
      originalImage,
    );
    expect(state.relationships).toEqual([
      expect.objectContaining({
        id: 'unknown-endpoint',
        sourceId: 'second',
        targetId: null,
        knowledge: 'unknown',
      }),
    ]);
    expect(await imageBytes(originalImage)).toEqual(originalBytes);
    const view = await (await page.request.get(`${path}/view`)).json();
    expect(view.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'first', x: 45, y: 8, z: 3 }),
        expect.objectContaining({ id: 'second', x: -23, y: 8, z: 3 }),
      ]),
    );
    const history: SaveReceipt[] = (await (await page.request.get(`${path}/history`)).json())
      .history;
    expect(history.find((receipt) => receipt.operationId === historicalSave.operationId)).toEqual(
      historicalSave,
    );
    expect(history).toContainEqual(corrected);
    expect(state.objects.find((object) => object.id === 'second')?.description).toBe(
      'Ny vanlig rättelse',
    );
  } finally {
    await installation.close();
  }
});
