import { createInstallation } from '../support/installation.js';
import { createRelationshipFixture } from '../support/relationship-fixture.js';
import { expect, test } from '../support/test.js';

test('SAMBAND-20: unavailable confirmation preserves input and requires current-state review before an explicit new submission', async ({
  page,
}) => {
  for (const mode of ['add', 'duplicate', 'remove']) {
    const duplicate = mode === 'duplicate';
    const installation = await createInstallation();
    try {
      const { path, read, post, household } = await createRelationshipFixture(
        page.request,
        installation.origin,
      );
      if (mode !== 'add') {
        await post('relationship', {
          id: 'existing',
          baseRevision: null,
          value: {
            typeId: (await read()).relationshipTypes.find((type) => type.name === 'Använder')?.id,
            sourceId: 'alex',
            targetId: 'bicycle',
            lifecycle: 'active',
          },
        });
      }
      if (mode !== 'add') await post('save', { operationId: 'save-before-review' });
      await page.goto(`${installation.origin}/households/${household.id}`);
      await page.getByRole('button', { name: 'Tabell', exact: true }).click();
      await page.getByRole('button', { name: 'Samband för Alex', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Samband för Alex', exact: true });
      await dialog
        .getByRole('button', {
          name: mode === 'remove' ? 'Redigera samband' : 'Nytt samband',
          exact: true,
        })
        .click();
      await dialog.getByLabel('Sambandstyp', { exact: true }).selectOption({ label: 'Använder' });
      await dialog.getByLabel('Till objekt', { exact: true }).selectOption('bicycle');
      if (mode !== 'remove')
        await dialog.getByLabel('Sambandets status', { exact: true }).selectOption('ended');
      await page.route(
        `${path}/relationship-form`,
        async (route) => {
          await route.fetch();
          await route.abort();
        },
        { times: 1 },
      );
      await dialog
        .getByRole('button', {
          name: mode === 'remove' ? 'Föreslå borttagning' : 'Lägg i utkastet',
          exact: true,
        })
        .click();
      const check = dialog.getByRole('button', {
        name: 'Kontrollera om ändringen lades i utkastet',
        exact: true,
      });
      await expect(check).toBeVisible();
      // Controlled expiry response tests the visible journey; server tests prove deadlines.
      await page.route(
        `${path}/relationship-form/*`,
        (route) =>
          route.fulfill({ status: 409, json: { error: 'relationship_confirmation_unavailable' } }),
        { times: 1 },
      );
      await check.click();
      await expect(dialog.getByRole('alert')).toContainText(
        'Bekräftelsen är inte längre tillgänglig',
      );
      await expect(dialog.getByRole('alert')).toContainText(
        'Det betyder inte att ändringen aldrig lades i utkastet',
      );
      await expect(dialog.getByLabel('Sambandets status', { exact: true })).toHaveValue(
        mode === 'remove' ? 'active' : 'ended',
      );
      const submit = dialog.getByRole('button', { name: 'Lägg i utkastet', exact: true });
      await expect(submit).toBeDisabled();
      await expect(
        dialog.getByRole('button', { name: 'Granska aktuellt underlag', exact: true }),
      ).toBeFocused();
      await dialog.getByRole('button', { name: 'Granska aktuellt underlag', exact: true }).click();
      const review = dialog.getByRole('region', {
        name: 'Aktuellt underlag för nytt försök',
        exact: true,
      });
      await expect(
        review.getByRole('heading', { name: 'Aktuellt underlag för nytt försök', exact: true }),
      ).toBeFocused();
      await expect(review).toContainText(
        mode !== 'add' ? 'Gäller fortfarande' : 'Manuellt upphört',
      );
      if (mode === 'remove')
        await expect(review).toContainText('Ditt utkast föreslår att sambandet tas bort');
      await expect(submit).toBeDisabled();
      await review
        .getByRole('button', { name: 'Fortsätt med bevarade uppgifter', exact: true })
        .click();
      await expect(submit).toBeEnabled();
      await expect(dialog.getByLabel('Sambandstyp', { exact: true })).toBeFocused();
      await expect(dialog.getByLabel('Sambandets status', { exact: true })).toHaveValue(
        mode === 'remove' ? 'active' : 'ended',
      );
      await expect(dialog.getByRole('alert')).toContainText('Du granskar ett nytt försök');
      if (mode === 'remove')
        await dialog.getByRole('button', { name: 'Föreslå borttagning', exact: true }).click();
      else await submit.click();
      if (duplicate) await expect(dialog.getByRole('alert')).toContainText('Sambandet finns redan');
      else
        await expect(
          dialog.getByRole('status').filter({
            hasText:
              mode === 'remove'
                ? 'Föreslagen borttagning lades i ditt utkast'
                : 'Sambandet lades i ditt utkast',
          }),
        ).toBeVisible();
    } finally {
      await installation.close();
    }
  }
});

test('SAMBAND-21: temporary confirmation capacity keeps the whole form editable until the user retries', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { path, household } = await createRelationshipFixture(page.request, installation.origin);
    await page.goto(`${installation.origin}/households/${household.id}`);
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    await page.getByRole('button', { name: 'Samband för Alex', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Samband för Alex', exact: true });
    await dialog.getByRole('button', { name: 'Nytt samband', exact: true }).click();
    await dialog.getByLabel('Sambandstyp', { exact: true }).selectOption({ label: 'Använder' });
    await dialog.getByLabel('Till objekt', { exact: true }).selectOption('bicycle');
    await dialog.getByLabel('Sambandets status', { exact: true }).selectOption('ended');
    await page.route(
      `${path}/relationship-form`,
      (route) =>
        route.fulfill({ status: 409, json: { error: 'relationship_confirmation_capacity' } }),
      { times: 1 },
    );
    await dialog.getByRole('button', { name: 'Lägg i utkastet', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Tillfälligt fullt');
    await expect(dialog.getByRole('alert')).toContainText('Inget ändrades av detta försök');
    await expect(dialog.getByLabel('Sambandets status', { exact: true })).toBeEnabled();
    await expect(dialog.getByLabel('Sambandets status', { exact: true })).toHaveValue('ended');
    await expect(dialog.getByLabel('Till objekt', { exact: true })).toHaveValue('bicycle');
    await dialog.getByLabel('Sambandets status', { exact: true }).selectOption('active');
    await dialog.getByRole('button', { name: 'Lägg i utkastet', exact: true }).click();
    await expect(
      dialog.getByRole('status').filter({ hasText: 'Sambandet lades i ditt utkast' }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Redigera samband', exact: true }).click();
    await expect(dialog.getByLabel('Sambandets status', { exact: true })).toHaveValue('active');
  } finally {
    await installation.close();
  }
});
