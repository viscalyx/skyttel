import { expect, test } from '@playwright/test';
import { prepareArchiveConflict } from '../support/conflict-archive.js';
import { saveReviewedConflictDraft } from '../support/conflict-special.js';

test('UTKAST-64: a missing object type keeps its proposal readable and discards only the explicitly confirmed object', async ({
  page,
  browser,
}) => {
  const administrator = await browser.newContext();
  const app = await prepareArchiveConflict(
    administrator.request,
    page.request,
    'missing-object-type',
  );
  try {
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(dialog).toContainText(
      'Den föreslagna objekttypen saknas i det aktuella underlaget.',
    );
    await expect(dialog).toContainText(
      'Objektet kan inte läggas till eftersom objekttypen saknas.',
    );
    await expect(dialog).toContainText(
      'Stäng konfliktfönstret och lägg till objekttypen under Inställningar → Typer och egna fält. Ditt förslag ligger kvar. Alternativt kan du ta bort objektet ur ditt utkast nedan.',
    );
    await expect(dialog.getByRole('region', { name: 'Ditt förslag' })).toContainText('Våren 2021');
    await expect(
      dialog.getByRole('region', { name: 'Ditt förslag' }).getByRole('button'),
    ).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Lägg valen i utkastet' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    expect((await app.read()).draft).toEqual(before.draft);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Ta bort objektet ur ditt utkast', exact: true })
      .click();
    await expect(dialog.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    await expect(
      dialog.getByRole('heading', {
        name: '✓ Objektet har tagits bort ur ditt utkast',
        exact: true,
      }),
    ).toBeVisible();
    const after = await app.read();
    expect(after.draft.changes).toEqual(
      before.draft.changes.filter((change) => change.id !== 'private-target'),
    );
    expect(after.objects).toEqual(before.objects);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
  } finally {
    await administrator.close();
    await app.installation.close();
  }
});

test('UTKAST-65: an incompatible historical field is corrected in the ordinary object form before fresh conflict assessment', async ({
  page,
  browser,
}) => {
  const administrator = await browser.newContext();
  const app = await prepareArchiveConflict(administrator.request, page.request, 'invalid-datatype');
  try {
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(dialog).toContainText(
      'Ett eget fält har ändrats från text till tal. Det föreslagna värdet passar inte den ändrade typen.',
    );
    await expect(dialog).toContainText('Det föreslagna värdet måste vara ett tal.');
    await expect(dialog.locator('.cp-warning [aria-hidden="true"]')).toHaveCount(0);
    await expect(dialog).toContainText(
      'Stäng konfliktfönstret och rätta uppgiften i den vanliga objektdialogen. Lägg ändringen i ditt utkast och kom sedan tillbaka hit. Ditt förslag ligger kvar under tiden.',
    );
    await expect(dialog.getByRole('region', { name: 'Ditt förslag' })).toContainText('Våren 2021');
    await expect(
      dialog.getByRole('region', { name: 'Ditt förslag' }).getByRole('button'),
    ).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Lägg valen i utkastet' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Stäng konfliktfönstret', exact: true }).click();
    expect((await app.read()).draft).toEqual(before.draft);
    await page
      .getByRole('navigation', { name: 'Kartans verktyg' })
      .getByRole('button', { name: 'Tabell', exact: true })
      .click();
    await page.getByRole('button', { name: 'Redigera Solcellsanläggningen', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Redigera Solcellsanläggningen', exact: true });
    await form.getByRole('button', { name: 'Egna fält', exact: true }).click();
    await form.getByLabel('Installationsår', { exact: true }).fill('2021');
    await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    await expect(form).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }),
    ).toHaveCount(0);
    const after = await app.read();
    expect(after.objects).toEqual(before.objects);
    expect(after.draft.changes.find((change) => change.id === 'private-target')).toMatchObject({
      after: { customValues: { year: 2021 } },
      type: { fields: [expect.objectContaining({ id: 'year', kind: 'number' })] },
    });
    expect(after.draft.changes.find((change) => change.id === 'independent')).toEqual(
      before.draft.changes.find((change) => change.id === 'independent'),
    );
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    await saveReviewedConflictDraft(page);
    expect(
      (await app.read()).objects.find((object) => object.id === 'private-target')?.customValues,
    ).toEqual({ year: 2021 });
  } finally {
    await administrator.close();
    await app.installation.close();
  }
});
