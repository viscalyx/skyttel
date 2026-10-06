import { expect, test } from '@playwright/test';
import { prepareRemovedObjectConflict } from '../support/conflict-special.js';

test('UTKAST-57: accepting a removed object discards only its proposal and preserves the saved removal', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await prepareRemovedObjectConflict(page.request, other.request);
  try {
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      dialog.getByText('Objektet togs bort från den gemensamma kartan medan du redigerade det.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.', {
        exact: true,
      }),
    ).toBeVisible();
    const saved = dialog.getByRole('region', { name: 'Sparat i kartan nu', exact: true });
    const proposed = dialog.getByRole('region', { name: 'Ditt förslag', exact: true });
    await expect(saved).toContainText('Borttaget');
    await expect(saved).toContainText('✓ Förvalt');
    await expect(proposed).toContainText('Mitt förslag');
    await expect(proposed.getByRole('button')).toHaveCount(0);
    await page.keyboard.press('Escape');
    expect((await app.read()).draft).toEqual(before.draft);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Acceptera borttagningen och kasta ditt förslag', exact: true })
      .click();
    await expect(dialog.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
      'Lo Lind',
    );
    await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
      'Vald lösning',
    );
    const after = await app.read();
    expect(after.draft.changes).toEqual(
      before.draft.changes.filter((change) => change.id !== 'lo'),
    );
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
  } finally {
    await other.close();
    await app.installation.close();
  }
});
