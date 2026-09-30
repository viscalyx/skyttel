import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import { activatePanel, createHousehold, openWorkspace, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('BILD-04: a delayed image error returns to its closed object without losing newer work', async ({
  page,
}) => {
  const installation = await createInstallation();
  let releaseResponse = () => {};
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    for (const [id, name] of [
      ['cycle', 'Cykeln'],
      ['garage', 'Garaget'],
    ]) {
      const state = await read();
      const response = await page.request.post(`${path}/draft`, {
        headers: { origin: installation.origin },
        data: {
          id,
          version: state.draft.version,
          contentVersion: state.contentVersion,
          baseRevision: null,
          value: {
            typeId: state.types[0].id,
            name,
            description: `Skickad text om ${name}`,
            iconId: 'bike',
          },
        },
      });
      expect(response.status()).toBe(200);
    }
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Garaget', exact: true }).click();
    const garage = page.getByRole('region', { name: 'Garaget', exact: true });
    await garage.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await garage.getByLabel('Beskrivning', { exact: true }).fill('Oskickat om Garaget');
    await garage.getByRole('button', { name: 'Stäng Garaget', exact: true }).click();
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Cykeln', exact: true }).click();
    const cycle = page.getByRole('region', { name: 'Cykeln', exact: true });
    await cycle.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    const imageInput = cycle.getByLabel('Välj profilbild');
    const images: string[] = [];
    for (const background of ['#0088ff', '#33aa44']) {
      await imageInput.setInputFiles({
        name: 'bild.png',
        mimeType: 'image/png',
        buffer: await sharp({ create: { width: 600, height: 400, channels: 3, background } })
          .png()
          .toBuffer(),
      });
      await expect(imageInput).toBeEnabled();
      const image = (await read()).draft.changes.find((change) => change.id === 'cycle')?.after
        ?.profileImageId;
      expect(image).toBeTruthy();
      images.push(image as string);
    }
    expect(images[1]).not.toBe(images[0]);
    const before = await read();
    let responseReady = () => {};
    const ready = new Promise<void>((resolve) => {
      responseReady = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route(`**/profile-images/cycle`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_image' });
      responseReady();
      await released;
      await route.fulfill({ response });
    });
    await imageInput.setInputFiles({
      name: 'fel.png',
      mimeType: 'image/png',
      buffer: Buffer.from('synthetic invalid pixels'),
    });
    await ready;
    await expect(imageInput).toBeDisabled();
    await cycle.getByRole('button', { name: 'Stäng Cykeln', exact: true }).click();
    await openWorkspace(page);
    const search = page.getByLabel('Sök objekt', { exact: true });
    await search.fill('Gar');
    releaseResponse();
    await expect(page.getByRole('alert')).toContainText('Bilden kunde inte behandlas');
    await expect(cycle).not.toBeVisible();
    await expect(search).toBeFocused();
    await page.keyboard.type('aget');
    await expect(search).toHaveValue('Garaget');
    expect(await read()).toEqual(before);
    const returnToImage = page.getByRole('button', {
      name: 'Återgå till bilden för Cykeln',
      exact: true,
    });
    await expect(returnToImage).toBeVisible();
    await returnToImage.click();
    await expect(cycle.getByRole('heading', { name: 'Cykeln', exact: true })).toBeFocused();
    await expect(cycle.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Skickad text om Cykeln',
    );
    await expect(cycle.getByAltText('Profilbild för Cykeln')).toHaveAttribute(
      'src',
      new RegExp(`/profile-images/${images[1]}$`),
    );
    expect(
      (await read()).draft.changes.find((change) => change.id === 'cycle')?.after,
    ).toMatchObject({
      name: 'Cykeln',
      description: 'Skickad text om Cykeln',
      iconId: 'bike',
      profileImageId: images[1],
    });
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Garaget', exact: true }).click();
    await activatePanel(page, 'Garaget');
    await expect(garage.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Oskickat om Garaget',
    );
    expect(await read()).toEqual(before);
  } finally {
    releaseResponse();
    await installation.close();
  }
});
