// Focused browser evidence for a throwaway visual comparison, not a test suite.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { signIn } from '../tests/support/client.js';

export async function captureZeroPlaneDepth(origin: string, householdId: string) {
  const directory = 'prototypes/zero-reference-planes-live/evidence-depth-strong';
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const url = `${origin}/households/${householdId}?prototype-planes&plane-depth=strong`;
  const path = `${origin}/api/households/${householdId}/map`;
  const panel = page.locator('.zero-planes-prototype');
  const observations: unknown[] = [];
  async function capture(name: string) {
    const open = await panel.evaluate((element) => (element as HTMLDetailsElement).open);
    if (open) await panel.locator('summary').click();
    await page.screenshot({ path: `${directory}/${name}.png` });
    observations.push({
      name,
      tintedObjects: await page.locator('.zero-plane-marker-tint').count(),
      tintedConnections: await page
        .locator('.spatial-connection:has(.zero-plane-connection-tint)')
        .count(),
    });
    if (open) await panel.locator('summary').click();
  }
  try {
    await signIn(page.request, origin);
    await page.goto(url);
    await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
    await panel.getByRole('combobox', { name: 'Djupvisning', exact: true }).waitFor();
    const savedView = await (await page.request.get(`${path}/view`)).json();
    const savedMap = await (await page.request.get(path)).json();
    for (const theme of ['light', 'dark']) {
      await page.request.post(`${origin}/api/theme-preference`, {
        headers: { origin },
        data: { mode: theme },
      });
      await page.goto(url);
      for (const depth of ['overlay', 'tint', 'strong']) {
        await panel.getByRole('combobox', { name: 'Djupvisning', exact: true }).selectOption(depth);
        await capture(`${theme}-${depth}`);
      }
    }
    for (const shape of ['square', 'oval', 'circle', 'lines']) {
      await panel.getByRole('combobox', { name: 'Form', exact: true }).selectOption(shape);
      await capture(`dark-${shape}-strong`);
    }
    await panel.getByRole('combobox', { name: 'Form', exact: true }).selectOption('circle');
    for (const axis of ['X', 'Y', 'Z']) {
      const slider = panel.getByRole('slider', { name: `Provobjekt 00 ${axis}`, exact: true });
      await slider.focus();
      await slider.press('Home');
      await capture(`cross-${axis}-minus`);
      await slider.focus();
      await slider.press('End');
      await capture(`cross-${axis}-plus`);
    }
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    for (let step = 0; step < 10; step++)
      await page.getByRole('button', { name: 'Rotera höger', exact: true }).click();
    await capture('rotated-tint');
    for (let step = 0; step < 5; step++)
      await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
    await capture('near-camera-tint');
    await page.getByRole('button', { name: 'Återställ vy', exact: true }).click();
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 568 });
    await panel.getByRole('combobox', { name: 'Djupvisning', exact: true }).focus();
    await page.screenshot({ path: `${directory}/mobile-controls.png` });
    const report = {
      observations,
      savedViewUnchanged:
        JSON.stringify(savedView) ===
        JSON.stringify(await (await page.request.get(`${path}/view`)).json()),
      savedMapUnchanged:
        JSON.stringify(savedMap) === JSON.stringify(await (await page.request.get(path)).json()),
      errors,
      note: 'Browser capture only. Depth readability and the tint treatment require live human review.',
    };
    await writeFile(`${directory}/observations.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report));
  } catch (error) {
    console.log(JSON.stringify({ errors, body: await page.locator('body').textContent() }));
    await page.screenshot({ path: `${directory}/capture-failure.png` });
    throw error;
  } finally {
    await browser.close();
  }
}
