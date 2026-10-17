import {
  backgrounds,
  chooseBackground,
  prepareBackgroundMap,
} from '../../scripts/measure-backgrounds.js';
import {
  captureBackground,
  backgroundDifference as difference,
} from '../support/background-pixels.js';
import { openSettings } from '../support/client.js';
import { createInstallation } from '../support/installation.js';
import { expect, test } from '../support/test.js';

test('BAKGRUND-05: every background retains navigation, placement and stability through repeated changes', async ({
  page,
}) => {
  // Seven complete semantic workloads include more than a thousand ordinary
  // control actions; local response/frame limits are enforced by the profiler.
  test.setTimeout(600_000);
  const installation = await createInstallation();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    const path = await prepareBackgroundMap(page, installation.origin, 16);
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    const marker = space.getByRole('button', { name: 'Välj objekt: Provobjekt 00', exact: true });
    const command = async (name: string, times = 1) => {
      const button = page.getByRole('button', { name, exact: true });
      if (name === 'Återställ vy' && (await button.getAttribute('aria-disabled')) === 'true')
        return;
      for (let index = 0; index < times; index++) await button.click();
    };
    // Observe only background pixels unobscured in both ordinary captures.
    let captureIndex = 0;
    const pixels = () =>
      captureBackground(page, test.info().outputPath(`canvas-${captureIndex++}.png`));
    const read = async () => (await page.request.get(`${path}/view`)).json();
    const setMotion = async (pan: string, zoom: string, depth: string) => {
      await openSettings(page);
      await page
        .getByRole('link', { name: /^Rymdkartan/ })
        .first()
        .click();
      for (const [name, value, key] of [
        ['Panoreringsstyrka', pan, 'panStrength'],
        ['Zoomstyrka', zoom, 'zoomStrength'],
        ['Lageravstånd', depth, 'layerDistance'],
      ] as const) {
        await page.getByRole('slider', { name, exact: true }).fill(value);
        await expect
          .poll(async () => (await read()).settings[key])
          .toBe(Number(value) / (key === 'layerDistance' ? 1 : 100));
      }
      await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
    };
    for (const [theme, appearance] of backgrounds) {
      if (appearance === 'off') continue;
      await chooseBackground(page, theme, appearance);
      await command('Återställ vy');
      const original = await pixels();
      await page.waitForTimeout(250);
      expect(difference(original, await pixels()) === 0).toBe(true);
      await command('Rotera vänster', 42);
      await command('Rotera höger', 42);
      expect(difference(original, await pixels()) === 0).toBe(true);
      await command('Panorera höger', 30);
      await command('Zooma in', 30);
      await page.screenshot({ path: test.info().outputPath(`${theme}-${appearance}-near.png`) });
      await command('Zooma ut', 60);
      await page.screenshot({ path: test.info().outputPath(`${theme}-${appearance}-far.png`) });
      await command('Återställ vy');
      expect(difference(original, await pixels()) === 0).toBe(true);
      const position = await marker.getAttribute('style');
      const saved = await read();
      for (let repeat = 0; repeat < 3; repeat++) {
        await chooseBackground(page, theme, 'off');
        expect(await marker.getAttribute('style')).toBe(position);
        await chooseBackground(page, theme, appearance);
        expect(await marker.getAttribute('style')).toBe(position);
        expect(difference(original, await pixels()) === 0).toBe(true);
        expect((await read()).positions).toEqual(saved.positions);
      }
      await setMotion('0', '0', '1');
      const zero = await pixels();
      await command('Panorera höger', 5);
      await command('Zooma in', 5);
      expect(difference(zero, await pixels()) === 0).toBe(true);
      await command('Återställ vy');
      const distances: Map<string, Buffer>[] = [];
      for (const depth of ['0.5', '2']) {
        await setMotion('100', '100', depth);
        await command('Återställ vy');
        const before = await pixels();
        await command('Panorera höger', 5);
        const panned = await pixels();
        expect(difference(before, panned) === 0).toBe(false);
        distances.push(panned);
        await command('Zooma in', 5);
        expect(difference(panned, await pixels()) === 0).toBe(false);
      }
      expect(difference(distances[0], distances[1]) === 0).toBe(false);
      await command('Återställ vy');
      await openSettings(page);
      await page
        .getByRole('link', { name: /^Rymdkartan/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Återställ rörelse', exact: true }).click();
      await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
      await marker.focus();
      await marker.press('Enter');
      const arrange = page.getByText('Ordna min vy', { exact: true });
      if (
        !(await arrange.evaluate((element) => (element.parentElement as HTMLDetailsElement).open))
      )
        await arrange.click();
      const beforeMove = await pixels();
      const previousPositions = (await read()).positions;
      await page.getByRole('button', { name: 'Flytta Provobjekt 00: uppåt', exact: true }).click();
      await expect.poll(async () => (await read()).positions).not.toEqual(previousPositions);
      expect(difference(beforeMove, await pixels()) === 0).toBe(true);
      await marker.focus();
      await marker.press('Enter');
    }
    expect(errors).toEqual([]);
  } finally {
    await installation.close();
  }
});
