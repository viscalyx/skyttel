import { expect, test } from '@playwright/test';
import { openTable } from '../support/client.js';
import { prepareHouseholdReading } from '../support/household-reading.js';
import { createInstallation } from '../support/installation.js';

test('LISTA-07: text object actions preserve cancellation and stage only the chosen removal without map graphics', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const app = await prepareHouseholdReading(page.request, installation.origin, false);
    const initial = await app.read();
    await app.post('draft', {
      id: 'independent',
      baseRevision: null,
      value: {
        typeId: initial.types[0].id,
        name: 'Behåll mig',
        description: 'Mitt oberoende förslag',
      },
    });
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function (kind: string, ...args: unknown[]) {
          return kind.startsWith('webgl') ? null : Reflect.apply(original, this, [kind, ...args]);
        },
      });
    });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(installation.origin);
    await expect(
      page.getByText('Rymdkartan kan inte visas. Använd Tabell för att fortsätta.', {
        exact: true,
      }),
    ).toBeVisible();
    await openTable(page);
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('button', { name: 'Cykel', exact: true }).click();
    const actions = table.getByRole('button', { name: 'Åtgärder för Cykel', exact: true });
    await actions.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('dialog', { name: 'Åtgärder för Cykel', exact: true });
    await expect(menu).toContainText(
      'Objektet och dess 4 samband läggs som borttagningar i ditt utkast.',
    );
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(actions).toBeFocused();
    expect(await app.read()).toEqual(before);
    await actions.click();
    await menu.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Redigera Cykel', exact: true });
    const description = editor.getByLabel('Beskrivning', { exact: true });
    await description.fill('Behåll mina oskickade uppgifter');
    await editor.getByRole('button', { name: 'Stäng objektdialogen', exact: true }).click();
    const loss = page.getByRole('dialog', { name: 'Lämna ändrade uppgifter?', exact: true });
    await expect(
      loss.getByRole('button', { name: 'Fortsätt redigera', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(description).toHaveValue('Behåll mina oskickade uppgifter');
    expect(await app.read()).toEqual(before);
    await editor.getByRole('button', { name: 'Stäng objektdialogen', exact: true }).click();
    await loss.getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true }).click();
    await expect(editor).not.toBeVisible();
    await expect(actions).toBeFocused();
    expect(await app.read()).toEqual(before);
    await actions.click();
    await page.screenshot({ path: test.info().outputPath('text-object-actions.png') });
    await menu.getByRole('button', { name: 'Ta bort objekt', exact: true }).click();
    await expect(menu).not.toBeVisible();
    const after = await app.read();
    expect(after.draft.changes.find((change) => change.id === 'bike')?.after).toBeNull();
    expect(after.draft.changes.find((change) => change.id === 'independent')).toEqual(
      before.draft.changes.find((change) => change.id === 'independent'),
    );
    expect(after.draft.relationships?.map((change) => change.id).sort()).toEqual([
      'alex-bike',
      'bike-garage',
      'bike-none',
      'bike-unknown',
    ]);
    expect(after.draft.relationships?.every((change) => change.after === null)).toBe(true);
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    await expect(actions).toBeFocused();
    await expect(table.getByRole('row', { name: /Cykel/ }).first()).toContainText(
      'Föreslagen borttagning',
    );
  } finally {
    await installation.close();
  }
});
