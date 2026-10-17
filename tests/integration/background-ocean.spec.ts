import type { Page } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import type { PersonalView } from '../../src/shared/personal-view.js';
import { createHousehold, openMap, openSettings, setAllLabels, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';
import { createPreparedContext, expect, test } from '../support/test.js';

const space = (page: Page) => page.getByRole('region', { name: 'Rymdkarta', exact: true });
async function settings(page: Page) {
  await openSettings(page);
  await page
    .getByRole('link', { name: /^Rymdkartan/ })
    .first()
    .click();
}
async function back(page: Page) {
  await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
  await expect(space(page)).toBeVisible();
}
async function tint(page: Page) {
  const pixels = await sharp(await space(page).locator('canvas').screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  let warmth = 0;
  let samples = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    // The canvas capture includes overlaid labels and panels. Their white
    // cards must not dilute the background's sand/water colour comparison.
    if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 235) continue;
    warmth += pixels[i] - pixels[i + 2];
    samples++;
  }
  expect(samples).toBeGreaterThan(0);
  return warmth / samples;
}
async function captureViews(page: Page, reference: string) {
  await page.getByRole('button', { name: 'Navigera', exact: true }).click();
  const water = await tint(page);
  await page.screenshot({ path: test.info().outputPath(`${reference}-water.png`) });
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Luta uppåt', exact: true }).click();
  const sand = await tint(page);
  expect(sand).toBeGreaterThan(water + 8);
  await page.screenshot({ path: test.info().outputPath(`${reference}-sand.png`) });
  for (let i = 0; i < 12; i++)
    await page.getByRole('button', { name: 'Luta nedåt', exact: true }).click();
  expect(await tint(page)).toBeLessThan(sand - 8);
  await page.screenshot({ path: test.info().outputPath(`${reference}-surface.png`) });
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Luta uppåt', exact: true }).click();
  await page.getByRole('button', { name: 'Panorera vänster', exact: true }).click();
  await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
  await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
  await page.getByRole('button', { name: 'Zooma ut', exact: true }).click();
  return water;
}

async function arrangeMap(page: Page, origin: string, path: string, count: number) {
  const state: MapState = await (await page.request.get(path)).json();
  let version = state.draft.version;
  for (let index = state.objects.length; index < count; index++)
    expect(
      (
        await page.request.post(`${path}/draft`, {
          headers: { origin },
          data: {
            version: version++,
            id: `ocean-${index}`,
            baseRevision: null,
            value: { name: `Havsobjekt ${index}`, description: '', typeId: state.types[0].id },
          },
        })
      ).ok(),
    ).toBe(true);
  for (let index = state.objects.length; index < count - 1; index += 4)
    expect(
      (
        await page.request.post(`${path}/relationship`, {
          headers: { origin },
          data: {
            version: version++,
            id: `ocean-edge-${index}`,
            baseRevision: null,
            value: {
              typeId: state.relationshipTypes[0].id,
              sourceId: `ocean-${index}`,
              targetId: `ocean-${index + 1}`,
              knowledge: 'known',
            },
          },
        })
      ).ok(),
    ).toBe(true);
  expect(
    (
      await page.request.post(`${path}/save`, {
        headers: { origin },
        data: { version, operationId: `ocean-map-${count}` },
      })
    ).ok(),
  ).toBe(true);
}

test('BAKGRUND-03: light ocean persists and ordinary navigation reaches sand, water and surface', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(10_000);
  const installation = await createInstallation();
  const other = await createPreparedContext(browser);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<PersonalView> => (await page.request.get(`${path}/view`)).json();
    await arrangeMap(page, installation.origin, path, 16);
    expect(
      (
        await page.request.post(`${path}/view/position`, {
          headers: { origin: installation.origin },
          data: { id: 'ocean-0', version: 0, position: { x: 3, y: 2, z: -1 } },
        })
      ).ok(),
    ).toBe(true);
    await page.goto(installation.origin);
    await openMap(page);
    await setAllLabels(page, true);
    await expect(page.getByRole('button', { name: 'Alla etiketter', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const markers = space(page).getByRole('button', {
      name: 'Välj objekt: Havsobjekt 0',
      exact: true,
    });
    await markers.focus();
    await page.keyboard.press('Enter');
    await expect(markers).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
    const projection = await markers.getAttribute('style');
    const before = await read();
    await settings(page);
    const light = page.getByLabel('Bakgrund i ljust tema', { exact: true });
    await expect(light.locator('option[value="ocean"]')).toHaveCount(1);
    await light.focus();
    await light.selectOption({ label: 'Under världshavet' });
    await expect(light).toBeFocused();
    await expect(page.locator('.map-settings').getByRole('status')).toHaveText(
      'Din personliga vy är sparad.',
    );
    await expect.poll(async () => (await read()).settings.lightBackground).toBe('ocean');
    await expect(page.getByLabel('Bakgrund i mörkt tema', { exact: true })).toHaveValue(
      before.settings.darkBackground,
    );
    await back(page);
    await expect(markers).toHaveAttribute('aria-pressed', 'true');
    expect(await markers.getAttribute('style')).toBe(projection);
    const saved = await read();
    expect(saved.positions).toEqual(before.positions);
    expect(saved.settings).toEqual({
      ...before.settings,
      lightBackground: 'ocean',
      version: before.settings.version + 1,
    });
    const water = await captureViews(page, 'light-ocean-16-1440');
    const themeProjection = await markers.getAttribute('style');
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await tint(page);
    expect(Math.abs(dark - water)).toBeGreaterThan(5);
    expect(await markers.getAttribute('style')).toBe(themeProjection);
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await tint(page)).toBeCloseTo(water, 0);
    expect(await markers.getAttribute('style')).toBe(themeProjection);
    await installation.restart();
    await page.reload();
    await settings(page);
    await expect(light).toHaveValue('ocean');
    expect(await read()).toEqual(saved);
    await signIn(other.request, installation.origin);
    const second = await other.newPage();
    await second.goto(installation.origin);
    await settings(second);
    await expect(second.getByLabel('Bakgrund i ljust tema', { exact: true })).toHaveValue('ocean');
    await back(second);
    await expect(
      second.getByRole('button', { name: 'Alla etiketter', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await back(page);
    for (const count of [16, 80]) {
      if (count === 80) await arrangeMap(page, installation.origin, path, count);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
        await page.reload();
        await openMap(page);
        await expect(
          page.getByRole('button', { name: 'Alla etiketter', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(space(page).locator('button[data-object-id]')).toHaveCount(count);
        const marker = space(page).getByRole('button', {
          name: 'Välj objekt: Havsobjekt 0',
          exact: true,
        });
        await marker.focus();
        await marker.press('Shift+F10');
        await page
          .getByRole('button', { name: 'Visa uppgifter för Havsobjekt 0', exact: true })
          .click();
        const details = page.getByRole('region', { name: 'Havsobjekt 0', exact: true });
        await expect(details).toBeVisible();
        await page.screenshot({
          path: test.info().outputPath(`light-ocean-${count}-${width}-details.png`),
        });
        await details.getByRole('button', { name: 'Stäng uppgifterna', exact: true }).click();
        await captureViews(page, `light-ocean-${count}-${width}`);
        expect((await read()).positions).toEqual(saved.positions);
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await other.close();
    await installation.close();
  }
});

// Capture actual pixels and UI-controlled directions. Shape recognition and
// dense-map label overlap are assessed from these images, not shader internals.
async function captureDarkViews(page: Page, reference: string) {
  await page.getByRole('button', { name: 'Navigera', exact: true }).click();
  const canvas = space(page).locator('canvas');
  const still = await canvas.screenshot();
  const image = await sharp(still).stats();
  // This image includes the ordinary map and open panel over the dark water.
  expect(image.channels[0].mean).toBeLessThan(35);
  expect(image.channels[1].max).toBeGreaterThan(40);
  expect((await canvas.screenshot()).equals(still)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`${reference}-water.png`) });
  for (const [direction, inverse] of [
    ['Rotera vänster', 'Rotera höger'],
    ['Rotera höger', 'Rotera vänster'],
    ['Luta uppåt', 'Luta nedåt'],
    ['Luta nedåt', 'Luta uppåt'],
  ]) {
    for (let index = 0; index < 4; index++)
      await page.getByRole('button', { name: direction, exact: true }).click();
    await page.screenshot({
      path: test.info().outputPath(`${reference}-${direction.replaceAll(' ', '-')}.png`),
    });
    expect((await canvas.screenshot()).equals(still)).toBe(false);
    for (let index = 0; index < 4; index++)
      await page.getByRole('button', { name: inverse, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Panorera vänster', exact: true }).click();
  await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
  await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
  await page.getByRole('button', { name: 'Zooma ut', exact: true }).click();
  return tint(page);
}

test('BAKGRUND-04: complete dark ocean persists and stays still through ordinary map navigation', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(10_000);
  const installation = await createInstallation();
  const other = await createPreparedContext(browser);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<PersonalView> => (await page.request.get(`${path}/view`)).json();
    await arrangeMap(page, installation.origin, path, 16);
    expect(
      (
        await page.request.post(`${path}/view/position`, {
          headers: { origin: installation.origin },
          data: { id: 'ocean-0', version: 0, position: { x: 3, y: 2, z: -1 } },
        })
      ).ok(),
    ).toBe(true);
    await page.goto(installation.origin);
    await openMap(page);
    await expect(page.getByRole('button', { name: 'Alla etiketter', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const markers = space(page).getByRole('button', {
      name: 'Välj objekt: Havsobjekt 0',
      exact: true,
    });
    await markers.focus();
    await page.keyboard.press('Enter');
    await expect(markers).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
    const projection = await markers.getAttribute('style');
    const before = await read();
    await settings(page);
    const darkChoice = page.getByLabel('Bakgrund i mörkt tema', { exact: true });
    await expect(darkChoice.locator('option[value="ocean"]')).toHaveCount(1);
    await darkChoice.focus();
    await darkChoice.selectOption({ label: 'Under världshavet' });
    await expect(darkChoice).toBeFocused();
    await expect(page.locator('.map-settings').getByRole('status')).toHaveText(
      'Din personliga vy är sparad.',
    );
    await expect.poll(async () => (await read()).settings.darkBackground).toBe('ocean');
    await expect(page.getByLabel('Bakgrund i ljust tema', { exact: true })).toHaveValue(
      before.settings.lightBackground,
    );
    await back(page);
    await expect(markers).toHaveAttribute('aria-pressed', 'true');
    expect(await markers.getAttribute('style')).toBe(projection);
    const saved = await read();
    expect(saved.positions).toEqual(before.positions);
    expect(saved.settings).toEqual({ ...before.settings, darkBackground: 'ocean', version: 1 });
    const water = await captureDarkViews(page, 'dark-ocean-16-1440');
    const themeProjection = await markers.getAttribute('style');
    await page.emulateMedia({ colorScheme: 'light' });
    const dark = await tint(page);
    expect(Math.abs(dark - water)).toBeGreaterThan(5);
    expect(await markers.getAttribute('style')).toBe(themeProjection);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await tint(page)).toBeCloseTo(water, 0);
    expect(await markers.getAttribute('style')).toBe(themeProjection);
    await installation.restart();
    await page.reload();
    await settings(page);
    await expect(darkChoice).toHaveValue('ocean');
    expect(await read()).toEqual(saved);
    await signIn(other.request, installation.origin);
    const second = await other.newPage();
    await second.goto(installation.origin);
    await settings(second);
    await expect(second.getByLabel('Bakgrund i mörkt tema', { exact: true })).toHaveValue('ocean');
    await back(page);
    for (const count of [16, 80]) {
      if (count === 80) await arrangeMap(page, installation.origin, path, count);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
        await page.reload();
        await openMap(page);
        await expect(space(page).locator('button[data-object-id]')).toHaveCount(count);
        const marker = space(page).getByRole('button', {
          name: 'Välj objekt: Havsobjekt 0',
          exact: true,
        });
        await marker.focus();
        await marker.press('Shift+F10');
        await page
          .getByRole('button', { name: 'Visa uppgifter för Havsobjekt 0', exact: true })
          .click();
        const details = page.getByRole('region', { name: 'Havsobjekt 0', exact: true });
        await expect(details).toBeVisible();
        await page.screenshot({
          path: test.info().outputPath(`dark-ocean-${count}-${width}-details.png`),
        });
        await details.getByRole('button', { name: 'Stäng uppgifterna', exact: true }).click();
        await captureDarkViews(page, `dark-ocean-${count}-${width}`);
        expect((await read()).positions).toEqual(saved.positions);
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await other.close();
    await installation.close();
  }
});
