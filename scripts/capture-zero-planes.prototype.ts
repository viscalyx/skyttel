// Disposable review evidence, not an integration-test suite.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { openSettings, signIn } from '../tests/support/client.js';

export async function captureZeroPlanesPrototype(
  origin: string,
  householdId: string,
  count: number,
) {
  const directory = `prototypes/zero-reference-planes-live/evidence-${count}`;
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const path = `${origin}/api/households/${householdId}/map`;
  const url = `${origin}/households/${householdId}?prototype-planes`;
  try {
    await signIn(page.request, origin);
    await page.goto(url);
    await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
    await page.locator('.zero-planes-prototype select').first().waitFor();
    await page.locator('.spatial-surface button[data-object-id]').first().waitFor();
    const surface = page.locator('.zero-planes-prototype');
    const summary = surface.locator('summary');
    async function expand(value: boolean) {
      if ((await surface.evaluate((element) => (element as HTMLDetailsElement).open)) !== value)
        await summary.click();
    }
    const projection = () =>
      page.locator('.spatial-surface button[data-object-id]').evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.getAttribute('data-object-id'),
          style: node.getAttribute('style'),
        })),
      );
    const baseline = JSON.stringify(await projection());
    const viewBefore = await (await page.request.get(`${path}/view`)).json();
    const mapBefore = await (await page.request.get(path)).json();
    const variants: { theme: string; shape: string; weight: string; sameProjection: boolean }[] =
      [];
    for (const theme of ['light', 'dark'] as const) {
      // Select the actual account theme, then reload through the application.
      await page.request.post(`${origin}/api/theme-preference`, {
        headers: { origin },
        data: { mode: theme },
      });
      await page.goto(url);
      await surface.waitFor();
      for (const shape of ['square', 'oval']) {
        for (const weight of ['subtle', 'original', 'prominent']) {
          await surface.getByRole('combobox', { name: 'Form', exact: true }).selectOption(shape);
          await surface
            .getByRole('combobox', { name: 'Visuell styrka', exact: true })
            .selectOption(weight);
          await expand(false);
          await page.screenshot({ path: `${directory}/${theme}-${shape}-${weight}.png` });
          variants.push({
            theme,
            shape,
            weight,
            sameProjection: JSON.stringify(await projection()) === baseline,
          });
          await expand(true);
        }
      }
    }
    const viewAfterVariants = await (await page.request.get(`${path}/view`)).json();
    const mapAfterVariants = await (await page.request.get(path)).json();
    // Actual decorative presets in both themes; keep the same oval/prominent planes.
    for (const theme of ['light', 'dark'] as const) {
      await page.request.post(`${origin}/api/theme-preference`, {
        headers: { origin },
        data: { mode: theme },
      });
      await page.goto(url);
      await surface.waitFor();
      await surface.getByRole('combobox', { name: 'Form', exact: true }).selectOption('oval');
      await surface
        .getByRole('combobox', { name: 'Visuell styrka', exact: true })
        .selectOption('prominent');
      await expand(false);
      const presets =
        theme === 'light'
          ? ['pearl', 'dawn', 'ocean']
          : ['atmosphere', 'mist', 'universe', 'ocean'];
      for (const preset of presets) {
        await openSettings(page);
        await page
          .locator('.settings-cards')
          .getByRole('link', { name: /^Rymdkartan/ })
          .click();
        await page
          .getByLabel(theme === 'light' ? 'Bakgrund i ljust tema' : 'Bakgrund i mörkt tema', {
            exact: true,
          })
          .selectOption(preset);
        await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
        await expand(false);
        await page.screenshot({ path: `${directory}/${theme}-${preset}.png` });
      }
      await openSettings(page);
      await page
        .locator('.settings-cards')
        .getByRole('link', { name: /^Rymdkartan/ })
        .click();
      await page.getByLabel('Visa bakgrund', { exact: true }).uncheck();
      await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
      await expand(false);
      await page.screenshot({ path: `${directory}/${theme}-plain.png` });
      await openSettings(page);
      await page
        .locator('.settings-cards')
        .getByRole('link', { name: /^Rymdkartan/ })
        .click();
      await page.getByLabel('Visa bakgrund', { exact: true }).check();
      await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
      await expand(false);
    }
    await page.getByRole('button', { name: 'Navigera', exact: true }).click();
    for (let index = 0; index < 6; index++)
      await page.getByRole('button', { name: 'Rotera höger', exact: true }).click();
    await page.screenshot({ path: `${directory}/rotated.png` });
    await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
    await page.screenshot({ path: `${directory}/zoomed.png` });
    for (let index = 0; index < 20; index++)
      await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    await page.screenshot({ path: `${directory}/off-screen-origin.png` });
    await page.getByRole('button', { name: 'Återställ vy', exact: true }).click();
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
    let localGuideReferenceStable: boolean | null = null;
    if (count === 9) {
      // Preview and drag retain the same local movement-start reference.
      const marker = page.locator('.spatial-surface button[data-object-id="background-0"]');
      await marker.click();
      await page.keyboard.down('Shift');
      const guide = page.locator('.spatial-height-guide');
      await guide.waitFor();
      const guideStart = () =>
        guide
          .locator(':scope > circle')
          .nth(2)
          .evaluate((circle) => [circle.getAttribute('cx'), circle.getAttribute('cy')]);
      const startBefore = await guideStart();
      await page.screenshot({ path: `${directory}/local-guide-preview.png` });
      const box = await marker.boundingBox();
      if (!box) throw new Error('Prototype marker is not visible');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 40, { steps: 5 });
      const startDuring = await guideStart();
      await page.screenshot({ path: `${directory}/local-guide-drag.png` });
      const moved = page.waitForResponse(
        (response) =>
          response.url().endsWith('/view/position') && response.request().method() === 'POST',
      );
      await page.mouse.up();
      await page.keyboard.up('Shift');
      await moved;
      localGuideReferenceStable = JSON.stringify(startBefore) === JSON.stringify(startDuring);
    }
    await expand(true);
    await page.setViewportSize({ width: 320, height: 568 });
    const shape = surface.getByRole('combobox', { name: 'Form', exact: true });
    await shape.focus();
    await shape.press('Home');
    await shape.press('ArrowDown');
    await shape.press('Tab');
    await page.screenshot({ path: `${directory}/mobile-keyboard.png` });
    const mobile = await surface.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      viewport: innerWidth,
      focused:
        document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
    }));
    const report = {
      count,
      variants,
      planeChoicesPreservePersonalView:
        JSON.stringify(viewBefore) === JSON.stringify(viewAfterVariants),
      planeChoicesPreserveHousehold: JSON.stringify(mapBefore) === JSON.stringify(mapAfterVariants),
      mobile,
      localGuideReferenceStable,
      errors,
      note: 'Agent capture only; retained options, accessibility and camera policy require human review.',
    };
    await writeFile(`${directory}/observations.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}
