import { expect, type Locator, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

async function arrange(page: Page, origin: string) {
  await signIn(page.request, origin);
  const { household } = await (await createHousehold(page.request, origin)).json();
  const path = `${origin}/api/households/${household.id}/map`;
  const read = async (): Promise<MapState> => (await page.request.get(path)).json();
  const state = await read();
  for (const [id, name, type] of [
    ['lo', 'Lo Exempel', 'Person'],
    ['music', 'Molnmusik', 'Tjänst'],
  ]) {
    expect(
      (
        await page.request.post(`${path}/draft`, {
          headers: { origin: origin },
          data: {
            version: (await read()).draft.version,
            id,
            baseRevision: null,
            value: {
              name,
              description: '',
              typeId: state.types.find((item) => item.name === type)?.id,
            },
          },
        })
      ).ok(),
    ).toBe(true);
  }
  return { read, path };
}

async function expectVisibleDirection(space: Locator) {
  const line = space.locator('line.connection');
  const arrow = await line.evaluate((element: SVGLineElement) => ({
    start: { x: element.x1.baseVal.value, y: element.y1.baseVal.value },
    tip: { x: element.x2.baseVal.value, y: element.y2.baseVal.value },
  }));
  const svg = space.locator('svg.spatial-lines');
  const surface = await svg.boundingBox();
  const target = await space
    .getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true })
    .boundingBox();
  expect(surface).not.toBeNull();
  expect(target).not.toBeNull();
  if (!surface || !target) throw new Error('The map and target must be visible');
  const tip = { x: arrow.tip.x + surface.x, y: arrow.tip.y + surface.y };
  expect(
    tip.x < target.x ||
      tip.x > target.x + target.width ||
      tip.y < target.y ||
      tip.y > target.y + target.height,
    'The directional tip must be outside the opaque target label',
  ).toBe(true);
  const dx = arrow.tip.x - arrow.start.x;
  const dy = arrow.tip.y - arrow.start.y;
  const length = Math.hypot(dx, dy);
  expect(length).toBeGreaterThan(25);
  const towardTarget =
    dx * (target.x + target.width / 2 - tip.x) + dy * (target.y + target.height / 2 - tip.y);
  expect(towardTarget, 'The visible arrow must point toward the target').toBeGreaterThan(0);
  const { data, info } = await sharp(await svg.screenshot())
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Check painted wings, away from the narrow line: the arrow must survive
  // compositing with HTML labels, not merely exist as an SVG marker.
  for (const side of [-1, 1]) {
    const x = Math.round(arrow.tip.x - (dx / length) * 8 - (dy / length) * side * 2.5);
    const y = Math.round(arrow.tip.y - (dy / length) * 8 + (dx / length) * side * 2.5);
    const offset = (y * info.width + x) * info.channels;
    const [red, green, blue] = data.subarray(offset, offset + 3);
    // Permit antialiasing and a leader crossing a wing, but reject the space
    // background and the opaque light/dark label backgrounds.
    expect(red).toBeGreaterThan(30);
    expect(red).toBeLessThan(150);
    expect(green).toBeGreaterThan(70);
    expect(green).toBeLessThan(200);
    expect(blue - red).toBeGreaterThan(20);
  }
}

test('RYMD-01: spatial and list editing share private proposals and one durable save', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read } = await arrange(page, installation.origin);
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    await space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }).click();
    await page.getByLabel('Objektets namn').fill('Molnmusik familj');
    await page.getByRole('button', { name: 'Lista och detaljer', exact: true }).click();
    await expect(page.getByLabel('Objektets namn')).toHaveValue('Molnmusik familj');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    expect((await read()).objects).toHaveLength(0);
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await installation.restart();
    await page.reload();
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    await expect(
      space.getByRole('button', { name: 'Välj objekt: Molnmusik familj', exact: true }),
    ).toBeVisible();
    expect((await read()).objects.map((item) => item.name).sort()).toEqual([
      'Lo Exempel',
      'Molnmusik familj',
    ]);
  } finally {
    await installation.close();
  }
});

test('RYMD-02: focus, filters and camera navigation preserve the shared selection', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { path, read } = await arrange(page, installation.origin);
    const state = await read();
    await page.request.post(`${path}/relationship`, {
      headers: { origin: installation.origin },
      data: {
        version: state.draft.version,
        id: 'use',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes.find((item) => item.name === 'Använder')?.id,
          sourceId: 'lo',
          targetId: 'music',
          knowledge: 'known',
        },
      },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const fullMap = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    await expect(
      fullMap.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }),
    ).toBeVisible();
    await expectVisibleDirection(fullMap);
    await fullMap.getByText('Navigera rymden', { exact: true }).click();
    await fullMap.getByRole('button', { name: 'Rotera vänster', exact: true }).click();
    await fullMap.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    await expectVisibleDirection(fullMap);
    await fullMap.getByText('Navigera rymden', { exact: true }).click();
    await page.getByRole('button', { name: 'Lista och detaljer', exact: true }).click();
    await page.getByRole('button', { name: 'Samlad vy', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    await expect(
      space.getByRole('button', {
        name: 'Välj samband: Lo Exempel → Använder → Molnmusik',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel('Filtrera objekttyp').selectOption({ label: 'Person' });
    await expect(
      space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Visa hela rymden', exact: true }).click();
    await space
      .getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true })
      .click({ modifiers: ['Control'] });
    await expect(page.getByText('Fokus: Lo Exempel', { exact: true })).toBeVisible();
    await page.getByText('Navigera rymden', { exact: true }).click();
    await page.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    const position = async () => {
      const label = await space
        .getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true })
        .boundingBox();
      const surface = await space.locator('canvas').boundingBox();
      return { x: (label?.x ?? 0) - (surface?.x ?? 0), y: (label?.y ?? 0) - (surface?.y ?? 0) };
    };
    const beforeClear = await position();
    await page.getByRole('button', { name: 'Visa hela rymden', exact: true }).click();
    expect(await position()).toEqual(beforeClear);
    await page.getByLabel('Sök objekt').fill('Lo');
    await space.getByRole('button', { name: 'Zooma in', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Sök objekt')).toHaveValue('');
    await expect(
      space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }),
    ).toBeVisible();
    await space
      .getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true })
      .click({ modifiers: ['Control'] });
    await page.getByLabel('Sök objekt').fill('Lo');
    await page.getByLabel('Filtrera objekttyp').selectOption({ label: 'Person' });
    await space.getByRole('button', { name: 'Återställ vy', exact: true }).click();
    await expect(page.getByLabel('Sök objekt')).toHaveValue('');
    await expect(page.getByLabel('Filtrera objekttyp')).toHaveValue('');
    await expect(page.getByText('Fokus: Lo Exempel', { exact: true })).toHaveCount(0);
    await expect(
      space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }),
    ).toBeVisible();
    await space
      .getByRole('button', { name: 'Välj samband: Lo Exempel → Använder → Molnmusik', exact: true })
      .click();
    await expect(page.getByLabel('Till objekt')).toHaveValue('music');
  } finally {
    await installation.close();
  }
});

test('RYMD-03: context actions and draft symbols distinguish proposals from saved content', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { path, read } = await arrange(page, installation.origin);
    let state = await read();
    await page.request.post(`${path}/relationship`, {
      headers: { origin: installation.origin },
      data: {
        version: state.draft.version,
        id: 'use',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes.find((item) => item.name === 'Använder')?.id,
          sourceId: 'lo',
          targetId: 'music',
          knowledge: 'known',
        },
      },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    const music = space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true });
    await expect(music).toContainText('+');
    await page.getByRole('button', { name: 'Visa detaljer och utkast' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await page.getByRole('button', { name: 'Till kartan', exact: true }).click();
    await music.click({ button: 'right' });
    await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
    await page.getByLabel('Beskrivning', { exact: true }).fill('Syntetiskt musikexempel');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Till kartan', exact: true }).click();
    await expect(music).toContainText('~');
    await music.click({ button: 'right' });
    await page.getByRole('button', { name: 'Ta bort objekt', exact: true }).click();
    await expect(music).toContainText('×');
    await expect(
      space.getByRole('button', {
        name: 'Välj samband: Lo Exempel → Använder → Molnmusik',
        exact: true,
      }),
    ).toContainText('×');
    state = await read();
    expect(state.objects).toHaveLength(2);
    expect(state.relationships).toHaveLength(1);
    expect(state.draft.changes.map((change) => [change.id, change.after])).toEqual([
      ['music', null],
    ]);
    await page.getByRole('button', { name: 'Visa detaljer och utkast' }).click();
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Borttagning av samband',
    );
    await page.getByRole('button', { name: 'Kasta hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Kartan är inte ändrad');
  } finally {
    await installation.close();
  }
});

test('RYMD-04: touch menus, viewport changes and graphics recovery retain unsent editing', async ({
  browser,
}) => {
  const installation = await createInstallation();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    const { read } = await arrange(page, installation.origin);
    await page.goto(installation.origin);
    await expect(
      page.getByRole('button', { name: 'Lista och detaljer', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    const music = space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true });
    const box = await music.boundingBox();
    expect(box).not.toBeNull();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 },
      ],
    });
    await expect(page.getByRole('button', { name: 'Redigera objekt', exact: true })).toBeVisible();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
    await page.getByLabel('Beskrivning', { exact: true }).fill('Oskickad mobiltext');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: 'Lista och detaljer', exact: true }).click();
    await expect(page.getByLabel('Beskrivning', { exact: true })).toHaveValue('Oskickad mobiltext');
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const surface = await space.locator('canvas').boundingBox();
    expect(surface?.height).toBeGreaterThan(200);
    expect((surface?.y ?? 0) + (surface?.height ?? 0)).toBeLessThanOrEqual(390);
    await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('The test browser must support context loss');
      extension.loseContext();
      window.setTimeout(() => extension.restoreContext(), 400);
    });
    await expect(
      page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.', { exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Visa detaljer och utkast' }).click();
    await expect(page.getByLabel('Beskrivning', { exact: true })).toHaveValue('Oskickad mobiltext');
    expect(
      (await read()).draft.changes.find((change) => change.id === 'music')?.after?.description,
    ).toBe('');
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await read()).objects.find((object) => object.id === 'music')?.description).toBe(
      'Oskickad mobiltext',
    );
  } finally {
    await context.close();
    await installation.close();
  }
});

test('RYMD-05: labels, keyboard editing and relationship text survive view changes', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { path, read } = await arrange(page, installation.origin);
    const state = await read();
    await page.request.post(`${path}/relationship`, {
      headers: { origin: installation.origin },
      data: {
        version: state.draft.version,
        id: 'use',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes.find((item) => item.name === 'Använder')?.id,
          sourceId: 'lo',
          targetId: 'music',
          knowledge: 'known',
        },
      },
    });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Samlad vy', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    const geometry = () =>
      space.evaluate((region) => {
        const surface = region.querySelector('svg')?.getBoundingClientRect();
        if (!surface) throw new Error('The map surface must be visible');
        const leaders = [...region.querySelectorAll<SVGLineElement>('.label-leader')];
        return [...region.querySelectorAll<HTMLButtonElement>('.spatial-labels button')].map(
          (label) => {
            const box = label.getBoundingClientRect();
            const x = box.x + box.width / 2 - surface.x;
            const y = box.y + box.height / 2 - surface.y;
            const leader = leaders.find(
              (line) => Math.hypot(line.x2.baseVal.value - x, line.y2.baseVal.value - y) < 1,
            );
            if (!leader) throw new Error(`Missing attachment for ${label.ariaLabel}`);
            const anchor = { x: leader.x1.baseVal.value, y: leader.y1.baseVal.value };
            return {
              name: label.ariaLabel,
              anchor,
              x,
              y,
              left: box.left,
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              distance: Math.hypot(x - anchor.x, y - anchor.y),
              dash: getComputedStyle(leader).strokeDasharray,
              stroke: getComputedStyle(leader).stroke,
            };
          },
        );
      });
    await expect(
      space.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }),
    ).toBeVisible();
    const overview = await geometry();
    const objectPoints = (items: typeof overview) =>
      items.filter((item) => item.name?.startsWith('Välj objekt:'));
    const separation = (items: typeof overview) => {
      const [first, second] = objectPoints(items);
      return Math.hypot(first.anchor.x - second.anchor.x, first.anchor.y - second.anchor.y);
    };
    // At this bounded size the first object keeps its position and the
    // relationship label yields space to the object labels.
    expect(objectPoints(overview)[0].distance).toBeLessThan(1);
    const edgeLabel = overview.find((item) => item.name?.startsWith('Välj samband:'));
    expect(edgeLabel?.distance).toBeGreaterThan(35);
    for (const label of objectPoints(overview)) {
      expect(edgeLabel).toBeDefined();
      if (!edgeLabel) throw new Error('The relationship label must be visible');
      expect(
        label.right <= edgeLabel.left ||
          label.left >= edgeLabel.right ||
          label.bottom <= edgeLabel.top ||
          label.top >= edgeLabel.bottom,
      ).toBe(true);
    }
    for (const label of overview) {
      expect(label.stroke).not.toBe('none');
      if (label.distance > 100) expect(label.dash).not.toBe('none');
      if (label.distance < 20) expect(label.dash).toBe('none');
    }
    await space.getByLabel('Alla etiketter', { exact: true }).check();
    await expect
      .poll(async () => separation(await geometry()))
      .toBeGreaterThan(separation(overview) * 1.2);
    await space.getByLabel('Alla etiketter', { exact: true }).uncheck();
    await space.getByLabel('Alla etiketter', { exact: true }).check();
    await expect(
      space.getByText('Närmare utsnitt. Panorera för att se fler etiketter.', { exact: true }),
    ).toBeVisible();
    const beforePan = await geometry();
    await space.getByText('Navigera rymden', { exact: true }).click();
    await space.getByRole('button', { name: 'Panorera höger', exact: true }).click();
    await expect
      .poll(async () =>
        Math.abs(objectPoints(await geometry())[0].anchor.x - objectPoints(beforePan)[0].anchor.x),
      )
      .toBeGreaterThan(25);
    await space.getByRole('button', { name: 'Återställ vy', exact: true }).click();
    await expect(space.getByLabel('Alla etiketter', { exact: true })).not.toBeChecked();
    await expect
      .poll(async () => Math.abs(separation(await geometry()) - separation(overview)))
      .toBeLessThan(2);
    for (const [index, object] of objectPoints(await geometry()).entries()) {
      expect(
        Math.hypot(
          object.anchor.x - objectPoints(overview)[index].anchor.x,
          object.anchor.y - objectPoints(overview)[index].anchor.y,
        ),
      ).toBeLessThan(2);
    }
    const relationship = page
      .getByRole('list', { name: 'Samband', exact: true })
      .getByRole('button', { name: 'Lo Exempel → Använder → Molnmusik', exact: true });
    await relationship.focus();
    await page.keyboard.press('Enter');
    await page
      .getByLabel('Sambandets slutdatum: uppgiftens säkerhet', { exact: true })
      .selectOption('known');
    await page.getByLabel('Sambandets slutdatum', { exact: true }).fill('2026-12-31');
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    await page.setViewportSize({ width: 900, height: 600 });
    await page.getByRole('button', { name: 'Visa detaljer och utkast', exact: true }).click();
    await expect(page.getByLabel('Sambandets slutdatum', { exact: true })).toHaveValue(
      '2026-12-31',
    );
    await page.getByRole('button', { name: 'Lägg sambandet i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    expect((await read()).relationships[0].endDate?.value).toBe('2026-12-31');
  } finally {
    await installation.close();
  }
});

test('RYMD-06: losing household access in fullscreen restores login navigation', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read } = await arrange(page, installation.origin);
    const state = await read();
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    await page.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true }).click();
    await page.getByLabel('Beskrivning', { exact: true }).fill('Syntetisk text före åtkomstbyte');
    installation.revokeMembership(state.userId);
    await page.getByRole('button', { name: 'Lägg i mitt utkast', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Du har inte längre tillgång');
    await expect(page.getByRole('button', { name: 'Logga ut', exact: true })).toBeVisible({
      timeout: 1000,
    });
    await page.getByRole('button', { name: 'Logga ut', exact: true }).click({ timeout: 1000 });
    await expect(page.getByRole('heading', { name: 'Välkommen till Skyttel' })).toBeVisible();
    await expect(page.getByText('Syntetisk text före åtkomstbyte', { exact: true })).toHaveCount(0);
  } finally {
    await installation.close();
  }
});

test('RYMD-07: ended objects and relationships retain status beside draft symbols', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { path, read } = await arrange(page, installation.origin);
    const post = (route: string, data: unknown) =>
      page.request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
    const state = await read();
    for (const change of state.draft.changes) {
      expect(
        (
          await post('draft', {
            version: (await read()).draft.version,
            id: change.id,
            baseRevision: null,
            value: {
              ...change.after,
              lifecycle: change.id === 'music' ? 'ended' : 'active',
              financialFacts: { endDate: { knowledge: 'known', value: '2000-01-01' } },
            },
          })
        ).ok(),
      ).toBe(true);
    }
    expect(
      (
        await post('relationship', {
          version: (await read()).draft.version,
          id: 'use',
          baseRevision: null,
          value: {
            typeId: state.relationshipTypes.find((item) => item.name === 'Använder')?.id,
            sourceId: 'lo',
            targetId: 'music',
            knowledge: 'known',
            endDate: { knowledge: 'known', value: '2000-01-01' },
          },
        })
      ).ok(),
    ).toBe(true);
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    const space = page.getByRole('region', { name: 'Rymdkarta', exact: true });
    const music = space.getByRole('button', { name: 'Välj objekt: Molnmusik', exact: true });
    const lo = space.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
    const edge = space.getByRole('button', {
      name: 'Välj samband: Lo Exempel → Använder → Molnmusik',
      exact: true,
    });
    for (const label of [music, edge]) {
      await expect(label.getByText('Upphört', { exact: true })).toBeVisible();
      await expect(label).toContainText('+');
      const endedColor = await label
        .getByText('Upphört')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      const proposalColor = await label
        .getByTitle('Nytt förslag')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(endedColor).not.toBe(proposalColor);
    }
    await expect(lo).not.toContainText('Upphört');
    await page.getByRole('button', { name: 'Visa detaljer och utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Sparat');
    await installation.restart();
    await page.reload();
    await page.getByRole('button', { name: 'Öppna rymdkartan', exact: true }).click();
    await expect(music.getByText('Upphört', { exact: true })).toBeVisible();
    await expect(edge.getByText('Upphört', { exact: true })).toBeVisible();
    await expect(lo).not.toContainText('Upphört');
    await expect(space.getByTitle('Nytt förslag')).toHaveCount(0);
    await edge.click();
    await page.getByLabel('Sambandets status').selectOption('active');
    await page.getByRole('button', { name: 'Lägg sambandet i mitt utkast', exact: true }).click();
    await page.getByRole('button', { name: 'Till kartan', exact: true }).click();
    await expect(edge).not.toContainText('Upphört');
    await expect(edge).toContainText('~');
    await expect(music.getByText('Upphört', { exact: true })).toBeVisible();
  } finally {
    await installation.close();
  }
});
