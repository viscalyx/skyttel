import { expect, test } from '@playwright/test';
import type { MapState } from '../../src/shared/map.js';
import { createHousehold, signIn } from '../support/client.js';
import { startConversationWithText } from '../support/conversation-page.js';
import { prepareHouseholdReading } from '../support/household-reading.js';
import { createInstallation } from '../support/installation.js';

for (const fallback of ['previous', 'heading'] as const) {
  test(`LÄS-04: vanished read openers return to ${fallback} when no next row remains`, async ({
    page,
  }) => {
    const installation = await createInstallation(undefined, {
      modelFetch: async () => Response.json({ output: [] }),
    });
    try {
      await signIn(page.request, installation.origin);
      const { household } = await (await createHousehold(page.request, installation.origin)).json();
      const path = `${installation.origin}/api/households/${household.id}/map`;
      const read = async (): Promise<MapState> => (await page.request.get(path)).json();
      async function propose(id: string, name: string | null) {
        const state = await read();
        const result = await page.request.post(`${path}/draft`, {
          headers: { origin: installation.origin },
          data: {
            version: state.draft.version,
            contentVersion: state.contentVersion,
            id,
            baseRevision: null,
            value: name ? { name, typeId: state.types[0]?.id, description: '' } : null,
          },
        });
        expect(result.status(), await result.text()).toBe(200);
      }
      await propose('a', 'A');
      await propose('b', 'B');
      await page.goto(installation.origin);
      await startConversationWithText(page);
      await page.getByRole('button', { name: 'Stäng textvyn', exact: true }).click();
      await page.getByRole('button', { name: 'Tabell', exact: true }).click();
      await page.getByRole('button', { name: 'Samband för B', exact: true }).click();
      await propose('b', null);
      if (fallback === 'heading') await propose('a', null);
      await expect(
        page.getByRole('dialog', { name: 'Objektet finns inte längre', exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await page.keyboard.press('Escape');
      const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
      await expect(
        fallback === 'previous'
          ? table.getByRole('button', { name: 'Samband för A', exact: true })
          : table.getByRole('heading', { name: 'Hushållets tabell', exact: true }),
      ).toBeFocused();
    } finally {
      await installation.close();
    }
  });
}

test('LÄS-01: keyboard follows Alex to bicycle to garage and back without graphics or lost table state', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read } = await prepareHouseholdReading(page.request, installation.origin);
    const before = await read();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function (kind: string, ...args: unknown[]) {
          return kind.startsWith('webgl') ? null : Reflect.apply(original, this, [kind, ...args]);
        },
      });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('button', { name: 'A 1', exact: true }).click();
    await table.getByRole('button', { name: 'A 2', exact: true }).click();
    await table.getByRole('button', { name: 'Nästa', exact: true }).click();
    await table.getByRole('button', { name: 'Alex', exact: true }).click();
    await table.getByRole('button', { name: 'Cykel', exact: true }).click();
    const scroller = table.getByRole('region', { name: 'Rullbar objekttabell' });
    await scroller.evaluate((element) => {
      element.scrollTop = 100;
    });
    const scroll = await scroller.evaluate((element) => element.scrollTop);
    const opener = table.getByRole('button', { name: 'Samband för Alex', exact: true });
    await expect(opener).toHaveAccessibleDescription('1 samband');
    await opener.focus();
    await page.keyboard.press('Enter');
    let dialog = page.getByRole('dialog', { name: 'Samband för Alex', exact: true });
    await expect(
      dialog.getByRole('heading', { name: 'Samband för Alex', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Stäng samband', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Stäng dialogen', exact: true })).toBeFocused();
    await dialog.getByRole('heading', { name: 'Samband för Alex', exact: true }).focus();
    await page
      .getByRole('button', { name: 'Karta', exact: true })
      .evaluate((button) => (button as HTMLButtonElement).focus());
    await expect(
      dialog.getByRole('heading', { name: 'Samband för Alex', exact: true }),
    ).toBeFocused();
    await dialog.getByRole('button', { name: 'Cykel', exact: true }).focus();
    await page.keyboard.press('Enter');
    dialog = page.getByRole('dialog', { name: 'Uppgifter för Cykel', exact: true });
    await expect(
      dialog.getByRole('heading', { name: 'Uppgifter för Cykel', exact: true }),
    ).toBeFocused();
    await expect(dialog.getByText('Sparat: 2000 SEK', { exact: true })).toBeVisible();
    await expect(
      dialog.getByText('Ramens märkning är ett påhittat exempel', { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Samband för Cykel', exact: true }).focus();
    await page.keyboard.press('Enter');
    dialog = page.getByRole('dialog', { name: 'Samband för Cykel', exact: true });
    await expect(
      dialog.getByText('Sparat: Sparad dold sambandsuppgift', { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Garage', exact: true }).focus();
    await page.keyboard.press('Enter');
    dialog = page.getByRole('dialog', { name: 'Uppgifter för Garage', exact: true });
    await expect(dialog.getByText('Ospecificerat objekt', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Stäng', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Stäng dialogen', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Stäng', exact: true })).toBeFocused();
    for (const name of ['Samband för Cykel', 'Uppgifter för Cykel', 'Samband för Alex']) {
      await dialog.getByRole('button', { name: 'Tillbaka', exact: true }).focus();
      await page.keyboard.press('Enter');
      dialog = page.getByRole('dialog', { name, exact: true });
      await expect(dialog.getByRole('heading', { name, exact: true })).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    expect(await scroller.evaluate((element) => element.scrollTop)).toBe(scroll);
    await expect(table.getByText('Sida 2 av 2 · 50 objekt per sida')).toBeVisible();
    await expect(table.getByRole('button', { name: 'Alex', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(table.getByRole('button', { name: 'Cykel', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await table.getByRole('button', { name: 'Föregående', exact: true }).click();
    await expect(table.getByRole('button', { name: 'A 1', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(table.getByRole('button', { name: 'A 2', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(await read()).toEqual(before);
  } finally {
    await installation.close();
  }
});

test('LÄS-02: mobile full relationship reading separates absent targets, uncertainty and proposed removal', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read, post } = await prepareHouseholdReading(page.request, installation.origin, false);
    const before = await read();
    const removal = before.relationships.find((value) => value.id === 'alex-bike');
    if (!removal) throw new Error('Missing fixture link');
    await post('relationship', { id: removal.id, baseRevision: removal.revision, value: null });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    await page.getByRole('button', { name: 'Samband för Cykel', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Samband för Cykel', exact: true });
    await expect(
      dialog.getByRole('heading', { name: 'Samband för Cykel', exact: true }),
    ).toBeFocused();
    await expect(
      dialog.getByText('Aktuellt · ◇ Föreslagen borttagning', { exact: true }),
    ).toBeVisible();
    const links = dialog.locator('.household-read-relationships > li');
    await expect(links).toHaveCount(4);
    const none = links.filter({ has: page.getByRole('heading', { name: /Har ingen|har ingen/ }) });
    await expect(none.getByRole('button')).toHaveCount(0);
    await expect(none).toContainText('Uttryckligen inget');
    const unknown = links.filter({ has: page.getByRole('heading', { name: /okänd koppling/ }) });
    await expect(unknown.getByRole('button')).toHaveCount(0);
    await expect(unknown).toContainText('Okänt');
    const storage = links.filter({
      has: page.getByRole('button', { name: 'Garage', exact: true }),
    });
    await expect(storage).toContainText('Osäkert uppgivet');
    await expect(storage).toContainText('2024-12-31');
    await expect(storage).toContainText('Manuellt upphört');
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    expect(
      await dialog
        .locator('.household-read-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Stäng samband', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Samband för Cykel', exact: true }),
    ).toBeFocused();
  } finally {
    await installation.close();
  }
});

test('LÄS-03: a vanished table opener returns to the next equivalent control after a real background update', async ({
  page,
}) => {
  const installation = await createInstallation(undefined, {
    modelFetch: async () => Response.json({ output: [] }),
  });
  try {
    const { read, post } = await prepareHouseholdReading(page.request, installation.origin, false);
    await post('draft', {
      id: 'temporary',
      baseRevision: null,
      value: { name: 'B Tillfälligt objekt', typeId: 'read-type', description: '' },
    });
    await page.goto(installation.origin);
    await startConversationWithText(page);
    await page.getByRole('button', { name: 'Stäng textvyn', exact: true }).click();
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    await page
      .getByRole('button', { name: 'Samband för B Tillfälligt objekt', exact: true })
      .click();
    await post('draft', { id: 'temporary', baseRevision: null, value: null });
    await expect(
      page.getByRole('dialog', { name: 'Objektet finns inte längre', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Samband för Cykel', exact: true }),
    ).toBeFocused();
    expect((await read()).draft.changes.some((change) => change.id === 'temporary')).toBe(false);
  } finally {
    await installation.close();
  }
});
