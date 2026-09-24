import { expect, type Page, test } from '@playwright/test';
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
    await space.getByLabel('Alla etiketter', { exact: true }).check();
    await space.getByLabel('Alla etiketter', { exact: true }).uncheck();
    await space.getByLabel('Alla etiketter', { exact: true }).check();
    await expect(
      space.getByText('Närmare utsnitt. Panorera för att se fler etiketter.', { exact: true }),
    ).toBeVisible();
    await space.getByRole('button', { name: 'Återställ vy', exact: true }).click();
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
