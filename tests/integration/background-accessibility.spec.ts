import type { Page } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import type { PersonalView } from '../../src/shared/personal-view.js';
import { contrast, measureContrast } from '../support/accessibility.js';
import { createHousehold, openMap, openSettings, openTable, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';
import { createPreparedContext, expect, test } from '../support/test.js';

const space = (page: Page) => page.getByRole('region', { name: 'Rymdkarta', exact: true });

async function settings(page: Page) {
  if (await page.getByRole('heading', { name: 'Rymdkartan', exact: true }).isVisible()) return;
  if (!(await page.locator('.settings-screen').isVisible())) await openSettings(page);
  await page
    .getByRole('link', { name: /^Rymdkartan/ })
    .first()
    .click();
}

async function back(page: Page) {
  await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
  await expect(space(page)).toBeVisible();
}

async function arrange(page: Page, origin: string, path: string, count: number) {
  const state: MapState = await (await page.request.get(path)).json();
  let version = state.draft.version;
  for (let index = state.objects.length; index < count; index++) {
    expect(
      (
        await page.request.post(`${path}/draft`, {
          headers: { origin },
          data: {
            version: version++,
            id: `readable-${index}`,
            baseRevision: null,
            value: {
              name: `Läsobjekt ${String(index).padStart(2, '0')}`,
              description: 'Hela beskrivningen går att läsa i tabellen.',
              typeId: state.types[0].id,
            },
          },
        })
      ).ok(),
    ).toBe(true);
    if (index > 0)
      expect(
        (
          await page.request.post(`${path}/relationship`, {
            headers: { origin },
            data: {
              version: version++,
              id: `readable-edge-${index}`,
              baseRevision: null,
              value: {
                sourceId: `readable-${index - 1}`,
                targetId: `readable-${index}`,
                typeId: state.relationshipTypes[0].id,
                knowledge: 'known',
              },
            },
          })
        ).ok(),
      ).toBe(true);
  }
  expect(
    (
      await page.request.post(`${path}/save`, {
        headers: { origin },
        data: { version, operationId: `readable-map-${count}` },
      })
    ).ok(),
  ).toBe(true);
}

function luminance(rgb: number[]) {
  const [red, green, blue] = rgb.map((value) => {
    const unit = value / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

// Measure the final compositor image, including SVG group opacity and the
// actual WebGL motif behind each line. Raw CSS colours miss that blending.
async function connectionContrast(page: Page, reference: string) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const samples = await space(page)
    .locator('line.connection')
    .evaluateAll((lines) => {
      const result: { x: number; y: number; nx: number; ny: number }[] = [];
      const obstacles = Array.from(
        document.querySelectorAll(
          '.spatial-orb, .personal-view-toast:popover-open, .workspace-label-feedback, .spatial-axis',
        ),
      ).map((element) => ({
        box: element.getBoundingClientRect(),
        margin: element.matches('.spatial-orb') ? 10 : 3,
      }));
      for (const element of lines) {
        const line = element as SVGLineElement;
        const matrix = line.getScreenCTM();
        if (!matrix) continue;
        const start = new DOMPoint(line.x1.baseVal.value, line.y1.baseVal.value).matrixTransform(
          matrix,
        );
        const end = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(
          matrix,
        );
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        if (length < 25) continue;
        for (const fraction of [0.15, 0.3, 0.5, 0.7, 0.85]) {
          if (length * (1 - fraction) < 16) continue; // The arrowhead has its own filled area.
          const x = start.x + (end.x - start.x) * fraction;
          const y = start.y + (end.y - start.y) * fraction;
          if (
            obstacles.some(
              ({ box, margin }) =>
                x > box.left - margin &&
                x < box.right + margin &&
                y > box.top - margin &&
                y < box.bottom + margin,
            )
          )
            continue;
          const top = document.elementFromPoint(x, y);
          if (
            x < 5 ||
            y < 5 ||
            x > innerWidth - 5 ||
            y > innerHeight - 5 ||
            !top?.matches('canvas, .connection-hit, .spatial-lines')
          )
            continue;
          result.push({ x, y, nx: -(end.y - start.y) / length, ny: (end.x - start.x) / length });
        }
      }
      return result;
    });
  const { data, info } = await sharp(
    await page.screenshot({
      path: test.info().outputPath(`${reference.replaceAll(' ', '-')}-contrast.png`),
    }),
  )
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => {
    const offset = (Math.round(y) * info.width + Math.round(x)) * 3;
    return Array.from(data.subarray(offset, offset + 3));
  };
  const ratios = samples.map(({ x, y, nx, ny }) => {
    const adjacent = [-1, 1].map((sign) =>
      luminance(pixel(x + sign * nx * 2.4, y + sign * ny * 2.4)),
    );
    // The central pixel of a diagonal stroke may be antialiased. Sample its
    // two closest neighbours rather than require every edge pixel to be opaque.
    return Math.max(
      ...[-0.6, 0, 0.6].flatMap((offset) => {
        const center = luminance(pixel(x + nx * offset, y + ny * offset));
        return adjacent.map(
          (background) =>
            (Math.max(center, background) + 0.05) / (Math.min(center, background) + 0.05),
        );
      }),
    );
  });
  expect(ratios.length, 'visible, unobscured connection samples').toBeGreaterThan(0);
  if (Math.min(...ratios) < 3)
    await test.info().attach('connection-samples', {
      body: JSON.stringify(
        samples.map((point, index) => ({ ...point, ratio: ratios[index] })),
        null,
        2,
      ),
      contentType: 'application/json',
    });
  expect(
    Math.min(...ratios),
    `${reference}: rendered connection contrast against its adjacent surface`,
  ).toBeGreaterThanOrEqual(3);
  return { samples: ratios.length, minimum: Math.min(...ratios) };
}

async function iconContrast(page: Page) {
  const measured = await space(page).evaluate((region) => {
    const canvas = new OffscreenCanvas(1, 1).getContext('2d');
    if (!canvas) throw new Error('Colour conversion needs a canvas');
    const color = (value: string) => {
      canvas.clearRect(0, 0, 1, 1);
      canvas.fillStyle = value;
      canvas.fillRect(0, 0, 1, 1);
      return Array.from(canvas.getImageData(0, 0, 1, 1).data);
    };
    const icons = Array.from(region.querySelectorAll('.spatial-orb')).map((orb) => {
      const style = getComputedStyle(orb);
      let opacity = 1;
      for (let parent: Element | null = orb; parent; parent = parent.parentElement)
        opacity *= Number(getComputedStyle(parent).opacity);
      return { foreground: color(style.color), surface: color(style.backgroundColor), opacity };
    });
    const backgrounds: { x: number; y: number }[] = [];
    const area = region.querySelector('canvas')?.getBoundingClientRect();
    if (!area) throw new Error('The real map must be rendered');
    for (const x of [0.02, 0.1, 0.3, 0.5, 0.7, 0.9, 0.98])
      for (const y of [0.02, 0.1, 0.5, 0.9, 0.98]) {
        const point = {
          x: Math.round(area.x + area.width * x),
          y: Math.round(area.y + area.height * y),
        };
        if (document.elementFromPoint(point.x, point.y)?.matches('canvas')) backgrounds.push(point);
      }
    return { icons, backgrounds };
  });
  expect(measured.icons.length).toBeGreaterThan(0);
  expect(measured.backgrounds.length).toBeGreaterThan(0);
  const { data, info } = await sharp(await page.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ratios = measured.icons.flatMap(({ foreground, surface, opacity }) =>
    measured.backgrounds.map(({ x, y }) => {
      const offset = (y * info.width + x) * 3;
      const background = Array.from(data.subarray(offset, offset + 3));
      // Group opacity fades the icon and its backing together onto the actual
      // motif. Checking their uncomposited CSS colours would miss that defect.
      const blend = (color: number[], behind: number[]) =>
        color
          .slice(0, 3)
          .map(
            (value, channel) => (value * color[3]) / 255 + behind[channel] * (1 - color[3] / 255),
          );
      const backing = blend(surface, background);
      const glyph = blend(foreground, backing);
      const composite = (color: number[]) =>
        luminance(
          color.map((value, channel) => value * opacity + background[channel] * (1 - opacity)),
        );
      const first = composite(glyph);
      const second = composite(backing);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    }),
  );
  const minimum = Math.min(...ratios);
  expect(minimum, 'composited object icon against its backing').toBeGreaterThanOrEqual(3);
  return minimum;
}

test('BAKGRUND-06: all backgrounds retain readable connections and an ordinary text alternative', async ({
  page,
}) => {
  test.setTimeout(480_000);
  page.setDefaultTimeout(10_000);
  const installation = await createInstallation();
  const measurements: unknown[] = [];
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    for (const count of [16, 80]) {
      await arrange(page, installation.origin, path, count);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
        await page.goto(installation.origin);
        await openMap(page);
        for (const [theme, appearance] of [
          ['light', 'pearl'],
          ['light', 'dawn'],
          ['light', 'ocean'],
          ['dark', 'atmosphere'],
          ['dark', 'mist'],
          ['dark', 'universe'],
          ['dark', 'ocean'],
        ] as const) {
          await page.emulateMedia({ colorScheme: theme });
          await settings(page);
          const choice = page.getByLabel(
            theme === 'light' ? 'Bakgrund i ljust tema' : 'Bakgrund i mörkt tema',
            { exact: true },
          );
          if ((await choice.inputValue()) !== appearance) {
            await choice.selectOption(appearance);
            await expect(page.locator('.map-settings').getByRole('status')).toHaveText(
              'Din personliga vy är sparad.',
            );
          }
          await back(page);
          const marker = space(page).getByRole('button', {
            name: 'Välj objekt: Läsobjekt 00',
            exact: true,
          });
          await marker.focus();
          await marker.press('Enter');
          await expect(marker).toHaveAttribute('aria-pressed', 'true');
          await marker.press('Shift+F10');
          await page
            .getByRole('button', { name: 'Visa uppgifter för Läsobjekt 00', exact: true })
            .click();
          const details = page.getByRole('region', { name: 'Läsobjekt 00', exact: true });
          await expect(details).toContainText('Hela beskrivningen går att läsa i tabellen.');
          await page.screenshot({
            path: test.info().outputPath(`${theme}-${appearance}-${count}-${width}-details.png`),
          });
          const navigate = page.getByRole('button', { name: 'Navigera', exact: true });
          // The details window can cover the toolbar on narrow screens. The
          // ordinary keyboard route raises the focused toolbar, without a forced click.
          await navigate.focus();
          await navigate.press('Enter');
          await page.screenshot({
            path: test.info().outputPath(`${theme}-${appearance}-${count}-${width}-panels.png`),
          });
          // Closing the frontmost window exposes the other window's header.
          await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
          await details.getByRole('button', { name: 'Stäng uppgifterna', exact: true }).click();
          expect(
            await space(page).evaluate((region) => region.contains(document.activeElement)),
          ).toBe(true);
          await marker.focus();
          await marker.press('Shift+F10');
          await page.getByRole('button', { name: 'Fokusera markering', exact: true }).click();
          await page.getByRole('button', { name: 'Navigera', exact: true }).click();
          for (const direction of ['middle', 'Rotera vänster', 'Luta uppåt', 'Luta nedåt']) {
            if (direction !== 'middle')
              for (
                let step = 0;
                step < (direction === 'Luta nedåt' ? 12 : direction === 'Luta uppåt' ? 6 : 4);
                step++
              )
                await page.getByRole('button', { name: direction, exact: true }).click();
            // A narrow Navigation window can cover the graph completely.
            // Keep that overlap in the panel images, then measure visible graph
            // pixels after using the ordinary close button.
            await page.getByRole('button', { name: 'Stäng navigering', exact: true }).click();
            measurements.push({
              theme,
              appearance,
              count,
              width,
              direction,
              ...(await connectionContrast(
                page,
                `${theme}-${appearance}-${count}-${width}-${direction}`,
              )),
              iconMinimum: await iconContrast(page),
            });
            if (direction !== 'Luta nedåt') await navigate.click();
          }
          const card = space(page)
            .locator('.spatial-name .spatial-caption')
            .filter({ hasText: 'Läsobjekt 00' });
          if (await card.isVisible()) expect(await contrast(card)).toBeGreaterThanOrEqual(4.5);
          const reset = page.getByRole('button', { name: 'Återställ vy', exact: true });
          if ((await reset.getAttribute('aria-disabled')) !== 'true') await reset.click();
        }
        await openTable(page);
        await page
          .getByRole('searchbox', { name: 'Sök objekt i tabellen', exact: true })
          .fill(`Läsobjekt ${count - 1}`);
        const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
        await table
          .getByRole('button', { name: `Läsobjekt ${count - 1}`, exact: true })
          .press('Enter');
        await expect(
          table.getByRole('region', { name: `Uppgifter för Läsobjekt ${count - 1}`, exact: true }),
        ).toContainText('Hela beskrivningen går att läsa i tabellen.');
      }
    }
  } finally {
    await test.info().attach('rendered-connection-contrast', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
    await installation.close();
  }
});

test('BAKGRUND-07: keyboard and touch settings reflow with honest disabled and saving states', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const installation = await createInstallation();
  const context = await createPreparedContext(browser, {
    hasTouch: true,
    viewport: { width: 320, height: 568 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  let release = () => {};
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async (): Promise<PersonalView> => (await page.request.get(`${path}/view`)).json();
    await arrange(page, installation.origin, path, 16);
    await page.goto(installation.origin);
    await openMap(page);
    await settings(page);
    const form = page.locator('.map-settings');
    const status = form.getByRole('status');
    const visible = page.getByRole('checkbox', { name: 'Visa bakgrund', exact: true });
    const light = page.getByRole('combobox', { name: 'Bakgrund i ljust tema', exact: true });
    const dark = page.getByRole('combobox', { name: 'Bakgrund i mörkt tema', exact: true });
    const ranges = ['Panoreringsstyrka', 'Zoomstyrka', 'Lageravstånd'].map((name) =>
      page.getByRole('slider', { name, exact: true }),
    );
    const reset = page.getByRole('button', { name: 'Återställ rörelse', exact: true });
    const refresh = page.getByRole('button', { name: 'Läs in min aktuella vy', exact: true });
    for (const control of [light, dark, ...ranges, reset, refresh]) {
      const target = await control.boundingBox();
      expect(target?.height, 'background control target height').toBeGreaterThanOrEqual(24);
      expect(target?.width, 'background control target width').toBeGreaterThanOrEqual(24);
    }
    await visible.focus();
    await visible.press('Tab');
    await expect(light).toBeFocused();
    await light.press('ArrowDown');
    await expect(status).toHaveText('Din personliga vy är sparad.');
    await light.press('Tab');
    await expect(dark).toBeFocused();
    await dark.press('End');
    await expect.poll(async () => (await read()).settings.darkBackground).toBe('ocean');
    await expect(status).toHaveText('Din personliga vy är sparad.');
    await dark.press('Tab');
    for (const range of ranges) {
      await expect(range).toBeFocused();
      expect(await range.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
        'none',
      );
      expect(await range.evaluate(measureContrast, 'outlineColor' as const)).toBeGreaterThanOrEqual(
        3,
      );
      await range.press('End');
      await expect(status).toHaveText('Din personliga vy är sparad.');
      await expect(range).toBeFocused();
      await range.press('Tab');
    }
    await expect(reset).toBeFocused();
    await reset.press('Enter');
    await expect.poll(async () => (await read()).settings.layerDistance).toBe(1);
    await expect(status).toHaveText('Din personliga vy är sparad.');
    await expect(reset).toBeFocused();
    // A tap on a native track is a single-pointer alternative to dragging.
    await ranges[0].scrollIntoViewIfNeeded();
    const track = await ranges[0].boundingBox();
    if (!track) throw new Error('The pan track must be visible');
    await page.touchscreen.tap(track.x + 3, track.y + track.height / 2);
    await expect.poll(async () => (await read()).settings.panStrength).toBe(0);
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`${path}/view/settings`, async (route) => {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    });
    await ranges[0].focus();
    await ranges[0].press('End');
    await expect(status).toHaveText('Din personliga vy sparas…');
    await expect(ranges[0]).toBeFocused();
    for (const control of [visible, light, dark, ...ranges, reset])
      await expect(control).toHaveAttribute('aria-disabled', 'true');
    await expect(refresh).toBeDisabled();
    await ranges[0].press('Home');
    await expect(ranges[0]).toHaveValue('100');
    release();
    await expect(status).toHaveText('Din personliga vy är sparad.');
    await expect(ranges[0]).toBeFocused();
    await page.unroute(`${path}/view/settings`);
    await visible.focus();
    await visible.press('Space');
    await expect(status).toHaveText('Din personliga vy är sparad.');
    for (const control of [light, dark, ...ranges, reset]) await expect(control).toBeDisabled();
    await visible.press('Tab');
    await expect(refresh).toBeFocused();
    await visible.focus();
    await visible.press('Space');
    await expect(status).toHaveText('Din personliga vy är sparad.');
    const saved = await read();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(form).toContainText('Bakgrunden är stilla eftersom minskad rörelse är aktiverad.');
    for (const control of [light, dark]) await expect(control).toBeEnabled();
    for (const control of [...ranges, reset]) await expect(control).toBeDisabled();
    await light.focus();
    await light.press('Tab');
    await expect(dark).toBeFocused();
    await dark.press('Tab');
    await expect(refresh).toBeFocused();
    expect(await read()).toEqual(saved);
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      expect(
        await contrast(form.getByText('Bakgrunden är dekorativ.', { exact: false })),
      ).toBeGreaterThanOrEqual(4.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320,
      );
      expect(await form.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(320);
      await page.screenshot({ path: test.info().outputPath(`settings-320-${theme}.png`) });
    }
    await page.reload();
    await settings(page);
    await expect(visible).toBeChecked();
    await expect(ranges[0]).toHaveValue('100');
    await expect(ranges[0]).toBeDisabled();
    expect(await read()).toEqual(saved);
    await back(page);
    await page.getByRole('button', { name: 'Navigera', exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Panorera vänster', exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Återställ vy', exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: 'Återställ vy', exact: true })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await page.getByRole('button', { name: 'Navigera', exact: true }).tap();
    const marker = space(page).getByRole('button', {
      name: 'Välj objekt: Läsobjekt 00',
      exact: true,
    });
    await marker.focus();
    await marker.press('Shift+F10');
    await page.getByRole('button', { name: 'Visa uppgifter för Läsobjekt 00', exact: true }).tap();
    const details = page.getByRole('region', { name: 'Läsobjekt 00', exact: true });
    await expect(details).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('320-touch-stacked-panels.png') });
    await details.getByRole('button', { name: 'Stäng uppgifterna', exact: true }).tap();
    await page.getByRole('button', { name: 'Stäng navigering', exact: true }).tap();
    await expect(details).not.toBeVisible();
    await expect(page.getByRole('region', { name: 'Navigation', exact: true })).not.toBeVisible();
    expect(await read()).toEqual(saved);
  } finally {
    release();
    await context.close();
    await installation.close();
  }
});
