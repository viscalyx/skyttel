import { expect, test } from '@playwright/test';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('refreshing after a conflict preserves text without authorizing a stale form', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const second = await browser.newContext();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Namn', { exact: true }).fill('Lo Exempel');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
    await signIn(second.request, installation.origin);
    const tab = await second.newPage();
    await tab.goto(installation.origin);
    await openWorkspace(tab);
    for (const editor of [page, tab]) {
      await editor.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
      await editor.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    }
    await page.getByLabel('Namn', { exact: true }).fill('Lo gammalt förslag');
    await tab.getByLabel('Namn', { exact: true }).fill('Lo nytt förslag');
    await tab.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
    const form = page.locator('dialog.object-dialog');
    await expect(form.getByRole('alert')).toContainText('Dina uppgifter finns kvar');
    await expect(form.getByLabel('Namn', { exact: true })).toHaveValue('Lo gammalt förslag');
    await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await page.getByRole('button', { name: 'Fortsätt redigera', exact: true }).click();
    await expect(form.getByLabel('Namn', { exact: true })).toHaveValue('Lo gammalt förslag');
    await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await page.getByRole('button', { name: 'Kasta ändringarna och fortsätt', exact: true }).click();
    await page.reload();
    await openWorkspace(page);
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Lo nytt förslag',
    );
    await page.getByRole('button', { name: 'Uppgifter för Lo nytt förslag', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await expect(page.getByLabel('Namn', { exact: true })).toHaveValue('Lo nytt förslag');
    await expect(page.getByRole('button', { name: 'Lägg i utkastet och stäng' })).toBeEnabled();
  } finally {
    await second.close();
    await installation.close();
  }
});

test('an uncertain save recovers its receipt and stale tabs cannot save newer drafts', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const other = await browser.newContext();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Namn', { exact: true }).fill('Lo Exempel');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
    await signIn(other.request, installation.origin);
    const tab = await other.newPage();
    await tab.goto(installation.origin);
    await openWorkspace(tab);
    await expect(tab.getByRole('region', { name: 'Hela mitt utkast' })).toContainText('Lo Exempel');
    await page.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await page.getByLabel('Namn', { exact: true }).fill('Lo Lind');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
    await tab.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(tab.getByRole('alert')).toContainText('Inget sparades');
    await expect(tab.getByRole('button', { name: 'Spara hela utkastet' })).toBeDisabled();
    await tab.getByRole('button', { name: 'Hämta aktuellt underlag' }).click();
    await expect(tab.getByRole('region', { name: 'Hela mitt utkast' })).toContainText('Lo Lind');
    await tab.route('**/map/save', async (route) => {
      await route.fetch();
      await route.abort();
    });
    await tab.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(tab.getByRole('alert')).toContainText('Utfallet är okänt');
    await tab.unroute('**/map/save');
    await tab.getByRole('button', { name: 'Hämta samma kvitto igen' }).click();
    await expect(
      tab.getByRole('status', { name: 'Hushållsarbetets status', exact: true }),
    ).toContainText('Sparat: Lo Lind');
    await expect(tab.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Inga förslag',
    );
  } finally {
    await other.close();
    await installation.close();
  }
});

test('KARTA-06: objects move from a persistent private proposal to the shared map after review', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Namn', { exact: true }).fill('Lo Exempel');
    await page.getByLabel('Beskrivning', { exact: true }).fill('En påhittad person');
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(page.getByLabel('Namn', { exact: true })).toHaveValue('Lo Exempel');
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByLabel('Beskrivning', { exact: true })).toHaveValue('En påhittad person');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Lo Exempel',
    );
    await page.reload();
    await openWorkspace(page);
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'En påhittad person',
    );
    await installation.restart();
    const second = await browser.newContext();
    try {
      await signIn(second.request, installation.origin);
      const reopened = await second.newPage();
      await reopened.goto(installation.origin);
      await openWorkspace(reopened);
      await expect(reopened.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
        'Lo Exempel',
      );
      await reopened.getByRole('button', { name: 'Spara hela utkastet' }).click();
      await expect(
        reopened.getByRole('status', { name: 'Hushållsarbetets status', exact: true }),
      ).toContainText('Sparat');
      await expect(reopened.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
        'Inga förslag',
      );
      await reopened.getByLabel('Sök objekt', { exact: true }).fill('Lo');
      await reopened.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
      await reopened.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
      await reopened.getByLabel('Namn', { exact: true }).fill('Lo Lind');
      await reopened.getByRole('button', { name: 'Lägg i utkastet och stäng' }).click();
      const review = reopened.getByRole('region', { name: 'Hela mitt utkast' });
      await expect(review).toContainText('Lo Exempel');
      await expect(review).toContainText('Lo Lind');
      await reopened.getByRole('button', { name: 'Kasta hela utkastet' }).click();
      await reopened.getByRole('button', { name: 'Uppgifter för Lo Exempel', exact: true }).click();
      await reopened.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
      await reopened
        .locator('dialog.object-dialog')
        .getByRole('button', { name: 'Avbryt', exact: true })
        .click();
      await openWorkspace(reopened);
      await reopened.getByRole('button', { name: 'Ta bort Lo Exempel', exact: true }).click();
      await expect(review).toContainText('Borttagning');
      await reopened.getByRole('button', { name: 'Spara hela utkastet' }).click();
      await expect(reopened.getByRole('list', { name: 'Objekt' })).not.toContainText('Lo Exempel');
    } finally {
      await second.close();
    }
  } finally {
    await installation.close();
  }
});
