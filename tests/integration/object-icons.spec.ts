import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import {
  activatePanel,
  createHousehold,
  openMap,
  openWorkspace,
  signIn,
} from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('IKON-01: icon choice survives type and image changes, save and restart before explicit reset', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<MapState> => (await page.request.get(path)).json();
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    const details = page.getByRole('group', { name: 'Objektets detaljer', exact: true });
    const picker = details.getByRole('region', { name: 'Ikon', exact: true });
    await details.getByLabel('Objektets namn', { exact: true }).fill('Min cykel');
    await details.getByLabel('Beskrivning', { exact: true }).fill('Bevara texten');
    await picker.getByRole('button', { name: 'Lägg uppgifterna i utkastet först' }).click();
    await picker.getByRole('searchbox', { name: 'Sök ikon' }).fill('cykel');
    await picker.getByRole('button', { name: 'Välj Cykel', exact: true }).click();
    await expect.poll(async () => (await read()).draft.changes[0].after?.iconId).toBe('bike');
    await details.getByLabel('Objekttyp', { exact: true }).selectOption({ label: 'Fordon' });
    await expect(picker.getByRole('searchbox')).toBeDisabled();
    await picker.getByRole('button', { name: 'Lägg uppgifterna i utkastet först' }).click();
    await expect(picker.getByRole('searchbox')).toBeEnabled();
    const source = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#0088ff' },
    })
      .png()
      .toBuffer();
    await details
      .getByLabel('Välj profilbild')
      .setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: source });
    await expect(details.getByAltText('Profilbild för Min cykel')).toBeVisible();
    await openMap(page);
    const node = page.getByRole('button', { name: 'Välj objekt: Min cykel', exact: true });
    await expect(node.getByAltText('Profilbild för Min cykel')).toBeVisible();
    await expect(node.locator('[data-icon-id="bike"]')).toHaveCount(0);
    await openWorkspace(page);
    await activatePanel(page, 'Min cykel');
    await details.getByRole('button', { name: 'Ta bort profilbild' }).click();
    await expect(details.getByText('Ikon: Cykel', { exact: true })).toBeVisible();
    await openMap(page);
    await expect(node.locator('[data-icon-id="bike"]')).toBeVisible();
    await openWorkspace(page);
    await activatePanel(page, 'Min cykel');
    await details.getByLabel('Beskrivning', { exact: true }).fill('Bevara mer text');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await installation.restart();
    await page.reload();
    expect((await read()).objects[0]).toMatchObject({
      iconId: 'bike',
      description: 'Bevara mer text',
    });
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Min cykel', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await picker.getByRole('button', { name: 'Typens standardikon', exact: true }).click();
    await expect.poll(async () => (await read()).draft.changes[0].after?.iconId).toBeUndefined();
    await page.getByRole('button', { name: 'Stäng utan att skicka texten' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await read()).objects[0]).not.toHaveProperty('iconId');
  } finally {
    await installation.close();
  }
});

test('IKON-02: full catalog search, empty results and keyboard pagination work in narrow themes', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const state: MapState = await (await page.request.get(path)).json();
    await page.request.post(`${path}/draft`, {
      headers: { origin: installation.origin },
      data: {
        id: 'object',
        version: 0,
        baseRevision: null,
        value: { typeId: state.types[0].id, name: 'Lo', description: '' },
      },
    });
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Lo', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    const picker = page.getByRole('region', { name: 'Ikon', exact: true });
    const search = picker.getByRole('searchbox', { name: 'Sök ikon' });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await search.fill('telescope');
        const telescope = picker.getByRole('button', { name: 'Välj telescope', exact: true });
        await telescope.focus();
        await page.keyboard.press('Enter');
        await expect(telescope).toHaveAttribute('aria-pressed', 'true');
        await search.fill('ingen-symbol-xyz');
        await expect(picker.getByText(/Inga ikoner matchar/)).toBeVisible();
        await picker.getByRole('button', { name: 'Rensa sökningen' }).click();
        await expect(search).toBeFocused();
        await picker.getByRole('button', { name: 'Nästa', exact: true }).click();
        await expect(
          picker.getByRole('group', { name: 'Välj ikon för Lo' }).getByRole('button').first(),
        ).toBeFocused();
        await search.fill('bike');
        await expect(picker.getByRole('button', { name: 'Välj Cykel', exact: true })).toBeVisible();
        const box = await picker.boundingBox();
        expect(box).not.toBeNull();
        expect(box?.width).toBeLessThanOrEqual(width);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
      }
    }
  } finally {
    await installation.close();
  }
});
