import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';

test('BILD-01: profile image proposals preserve text, survive restart and undo replacement', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    const state = await read();
    await page.request.post(`${path}/draft`, {
      headers: { origin: installation.origin },
      data: {
        id: 'person',
        version: 0,
        baseRevision: null,
        value: {
          typeId: state.types[0].id,
          name: 'Lo Exempel',
          description: 'Bevara beskrivningen',
        },
      },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    const details = page.getByRole('group', { name: 'Objektets detaljer' });
    const source = await sharp({
      create: { width: 600, height: 400, channels: 3, background: '#0088ff' },
    })
      .png()
      .toBuffer();
    await details
      .getByLabel('Välj profilbild')
      .setInputFiles({ name: 'syntetisk.png', mimeType: 'image/png', buffer: source });
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    const first = (await read()).draft.changes[0].after?.profileImageId;
    await expect(details.getByAltText('Profilbild för Lo Exempel')).toBeVisible();
    expect((await read()).objects).toEqual([]);
    await details.getByLabel('Beskrivning', { exact: true }).fill('Oskickad text');
    await expect(details.getByLabel('Välj profilbild')).toBeDisabled();
    await page.getByRole('button', { name: 'Öppna rymdkartan' }).click();
    await page.getByRole('button', { name: 'Visa detaljer och utkast' }).click();
    await expect(details.getByLabel('Beskrivning', { exact: true })).toHaveValue('Oskickad text');
    await details.getByRole('button', { name: 'Lägg i mitt utkast' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await installation.restart();
    await page.reload();
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    await expect(details.getByAltText('Profilbild för Lo Exempel')).toBeVisible();
    await details.getByLabel('Välj profilbild').setInputFiles({
      name: 'ny.webp',
      mimeType: 'image/webp',
      buffer: await sharp(source).negate().webp().toBuffer(),
    });
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    await page.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await page.getByRole('button', { name: 'Visa historik', exact: true }).click();
    const history = page.getByRole('region', { name: 'Ändringshistorik' });
    await expect(history.getByRole('article').first().getByRole('img')).toHaveCount(2);
    await history
      .getByRole('article')
      .first()
      .getByRole('button', { name: 'Ångra sparandet' })
      .click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await read()).objects[0]).toMatchObject({
      profileImageId: first,
      description: 'Oskickad text',
    });
  } finally {
    await installation.close();
  }
});

test('BILD-02: invalid images retain proposals and interrupted removal recovers its durable receipt', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    const state = await read();
    await page.request.post(`${path}/draft`, {
      headers: { origin: installation.origin },
      data: {
        id: 'person',
        version: 0,
        baseRevision: null,
        value: { typeId: state.types[0].id, name: 'Lo Exempel', description: 'Bevara texten' },
      },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    const details = page.getByRole('group', { name: 'Objektets detaljer' });
    const source = await sharp({
      create: { width: 450, height: 600, channels: 3, background: '#992233' },
    })
      .jpeg()
      .toBuffer();
    await details
      .getByLabel('Välj profilbild')
      .setInputFiles({ name: 'bild.jpg', mimeType: 'image/jpeg', buffer: source });
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    const before = await read();
    await details.getByLabel('Välj profilbild').setInputFiles({
      name: 'fel.png',
      mimeType: 'image/png',
      buffer: Buffer.from('synthetic invalid pixels'),
    });
    await expect(page.getByRole('alert')).toContainText('Bilden kunde inte behandlas');
    expect(await read()).toEqual(before);
    await details
      .getByLabel('Välj profilbild')
      .setInputFiles({ name: 'stor.png', mimeType: 'image/png', buffer: Buffer.alloc(10_000_001) });
    await expect(page.getByRole('alert')).toContainText('Bilden är för stor');
    expect(await read()).toEqual(before);
    await page.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    await details.getByRole('button', { name: 'Ta bort profilbild' }).click();
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    expect((await read()).objects[0].profileImageId).toBeDefined();
    await page.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page.route(
      '**/map/save',
      async (route) => {
        await route.fetch();
        await route.abort('failed');
      },
      { times: 1 },
    );
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('alert')).toContainText('Utfallet är okänt');
    await page.getByRole('button', { name: 'Hämta samma kvitto igen' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await read()).objects[0].profileImageId).toBeUndefined();
    const history = (await (await page.request.get(`${path}/history`)).json()).history;
    expect(history).toHaveLength(2);
    await page.getByRole('button', { name: 'Visa historik', exact: true }).click();
    await page
      .getByRole('region', { name: 'Ändringshistorik' })
      .getByRole('article')
      .first()
      .getByRole('button', { name: 'Ångra sparandet' })
      .click();
    expect((await read()).draft.changes[0].after?.profileImageId).toBe(
      before.draft.changes[0].after?.profileImageId,
    );
  } finally {
    await installation.close();
  }
});

test('BILD-03: private, historical and known image addresses enforce current household access', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const second = await browser.newContext();
  const anonymous = await browser.newContext();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const images = `${installation.origin}/api/households/${household.id}/profile-images`;
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    const state = await read();
    await page.request.post(`${path}/draft`, {
      headers: { origin: installation.origin },
      data: {
        id: 'person',
        version: 0,
        baseRevision: null,
        value: { typeId: state.types[0].id, name: 'Lo Exempel', description: '' },
      },
    });
    installation.setIdentity(robin);
    await signIn(second.request, installation.origin);
    const { user } = await (
      await second.request.get(`${installation.origin}/api/bootstrap`)
    ).json();
    const { code } = await (
      await page.request.post(`${path.replace('/map', '')}/invitations`, {
        headers: { origin: installation.origin },
        data: { userId: user.id },
      })
    ).json();
    await second.request.post(`${installation.origin}/api/invitations/accept`, {
      headers: { origin: installation.origin },
      data: { code },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    const input = page.getByLabel('Välj profilbild');
    const source = await sharp({
      create: { width: 300, height: 300, channels: 3, background: '#332244' },
    })
      .webp()
      .toBuffer();
    await input.setInputFiles({ name: 'bild.webp', mimeType: 'image/webp', buffer: source });
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    const first = (await read()).draft.changes[0].after?.profileImageId;
    expect((await second.request.get(`${images}/${first}`)).status()).toBe(404);
    expect((await anonymous.request.get(`${images}/${first}`)).status()).toBe(401);
    await page.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await second.request.get(`${images}/${first}`)).status()).toBe(200);
    await page.getByRole('button', { name: 'Lo Exempel', exact: true }).click();
    await input.setInputFiles({ name: 'andra.webp', mimeType: 'image/webp', buffer: source });
    await expect(page.getByRole('status')).toContainText('Bildförslaget finns');
    const privateId = (await read()).draft.changes[0].after?.profileImageId;
    expect((await second.request.get(`${images}/${privateId}`)).status()).toBe(404);
    await page.request.post(`${path.replace('/map', '')}/members/${user.id}/revoke`, {
      headers: { origin: installation.origin },
      data: {},
    });
    expect((await second.request.get(`${images}/${first}`)).status()).toBe(403);
    expect((await second.request.get(`${images}/${privateId}`)).status()).toBe(403);
    installation.seedMembership(user.id, 'elsewhere', 'Annat hushåll');
    expect(
      (
        await second.request.get(
          `${installation.origin}/api/households/elsewhere/profile-images/${first}`,
        )
      ).status(),
    ).toBe(404);
    const headers = {
      origin: installation.origin,
      'x-skyttel-draft-version': '0',
      'x-skyttel-content-version': String(state.contentVersion),
      'x-skyttel-object-revision': '1',
    };
    for (const actor of [second.request, anonymous.request]) {
      const status = actor === second.request ? 403 : 401;
      expect((await actor.post(`${images}/person`, { headers, data: source })).status()).toBe(
        status,
      );
      expect((await actor.delete(`${images}/person`, { headers })).status()).toBe(status);
    }
  } finally {
    await second.close();
    await anonymous.close();
    await installation.close();
  }
});
