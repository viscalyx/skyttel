import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, openMap, openWorkspace, signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';

async function expectSpatialPortrait(page: Page, imageId: string | null | undefined) {
  expect(imageId).toBeTruthy();
  const portrait = page
    .getByRole('region', { name: 'Rymdkarta', exact: true })
    .getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true })
    .getByAltText('Profilbild för Lo Exempel');
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute('src', new RegExp(`/profile-images/${imageId}$`));
  await expect
    .poll(() =>
      portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const { data, info } = await sharp(await portrait.screenshot())
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset =
    (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  const pixel = [...data.subarray(offset, offset + 3)];
  // The uploaded synthetic blue pixels must actually paint inside the node.
  for (const [index, expected] of [0, 136, 255].entries()) {
    expect(Math.abs(pixel[index] - expected)).toBeLessThan(15);
  }
}

test('BILD-01: profile image proposals preserve text, survive restart and expose historical replacements', async ({
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
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Redigera Lo Exempel', exact: true })
      .getByRole('button', { name: 'Livscykel och utseende', exact: true })
      .click();
    const details = page.getByRole('dialog', { name: 'Redigera Lo Exempel', exact: true });
    const source = await sharp({
      create: { width: 600, height: 400, channels: 3, background: '#0088ff' },
    })
      .png()
      .toBuffer();
    await details
      .getByLabel('Profilbild', { exact: true })
      .setInputFiles({ name: 'syntetisk.png', mimeType: 'image/png', buffer: source });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
