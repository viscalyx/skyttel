import { expect, test } from '@playwright/test';
import type { MapState, SaveReceipt } from '../../src/shared/map.js';
import { createHousehold, openSettings, openWorkspace, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

for (const { width, height } of [
  { width: 1280, height: 900 },
  { width: 390, height: 900 },
  { width: 320, height: 900 },
  { width: 640, height: 456 },
]) {
  test(`TYP-10: canonical properties retain meaning through sections, hiding, type changes, historical reading at ${width}px`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      await page.setViewportSize({ width, height });
      await signIn(page.request, installation.origin);
      const { household } = await (await createHousehold(page.request, installation.origin)).json();
      const path = `${installation.origin}/api/households/${household.id}/map`;
      const read = async (): Promise<MapState> => (await page.request.get(path)).json();
      const post = (route: string, data: unknown) =>
        page.request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
      await post('object-type', {
        version: 0,
        id: 'other',
        baseRevision: null,
        value: {
          name: 'Annan typ',
          description: '',
          fields: [],
          sections: [],
          builtins: [],
          propertyOrder: [],
        },
      });
      await post('save', { version: 1, operationId: 'target' });
      await page.goto(installation.origin);
      const settings = async () => {
        await openSettings(page);
        const nav = page.getByRole('navigation', { name: 'Inställningarnas sidor' });
        if (width <= 800) await nav.getByText('Välj inställning', { exact: true }).click();
        await nav.getByRole('link', { name: 'Typer och egna fält', exact: true }).click();
      };
      const returnToWork = async () => {
        await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
        await openWorkspace(page);
      };
      const save = async (): Promise<SaveReceipt> => {
        await openWorkspace(page);
        const response = page.waitForResponse(
          (response) => response.url() === `${path}/save` && response.request().method() === 'POST',
        );
        await page
          .getByRole('region', { name: 'Hela mitt utkast' })
          .getByRole('button', { name: 'Spara hela utkastet', exact: true })
          .click();
        const result = await response;
        expect(result.status()).toBe(200);
        const { receipt } = await result.json();
        await expect(page.getByText(/sparat/i).first()).toBeVisible();
        return receipt;
      };
      await settings();
      await page.getByRole('button', { name: 'Ny objekttyp', exact: true }).click();
      await page.getByLabel('Typens namn').fill('Husavtal');
      await page.getByLabel('Avsnitt 1', { exact: true }).fill('Avtalet');
      await page.getByLabel('Lägg till gemensam egenskap').selectOption('description');
      await page.getByRole('button', { name: 'Lägg till fält', exact: true }).click();
      const note = page.getByRole('group', { name: 'Eget fält 2', exact: true });
      await note.getByLabel('Fältets namn').fill('Anteckning');
      await page.getByLabel('Lägg till gemensam egenskap').selectOption('debt');
      const debt = page.getByRole('group', {
        name: 'Gemensam egenskap: Senast uppgiven skuld',
        exact: true,
      });
      await expect(debt.getByLabel('Fältets namn')).toBeFocused();
      await debt.getByLabel('Fältets namn').fill('Skuld');
      await page.getByRole('button', { name: 'Flytta fältet Skuld upp', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(debt.getByLabel('Fältets namn')).toBeFocused();
      await page.getByRole('button', { name: 'Dölj Skuld, behåll värden', exact: true }).click();
      await expect(debt.getByLabel('Visa i avsnitt')).toBeFocused();
      await debt.getByLabel('Visa i avsnitt').selectOption({ label: 'Avtalet' });
      await page.getByLabel('Lägg till gemensam egenskap').selectOption('startDate');
      await page.getByRole('button', { name: 'Lägg till avsnitt', exact: true }).click();
      await page.getByLabel('Avsnitt 2', { exact: true }).fill('Datum');
      await page
        .getByRole('group', { name: 'Gemensam egenskap: Startdatum', exact: true })
        .getByLabel('Visa i avsnitt')
        .selectOption({ label: 'Datum' });
      for (const theme of ['light', 'dark']) {
        await page.getByRole('button', { name: /^Tema:/ }).click();
        await page
          .getByRole('radio', { name: theme === 'light' ? 'Ljust' : 'Mörkt', exact: true })
          .click();
        await page.keyboard.press('Escape');
        await page.screenshot({
          path: test.info().outputPath(`builtins-${width}-${theme}.png`),
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      await page.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }).click();
      await returnToWork();
      await page
        .getByRole('region', { name: 'Lista och utkast', exact: true })
        .getByRole('button', { name: 'Nytt objekt', exact: true })
        .click();
      const form = page.getByRole('dialog', { name: /^(Nytt objekt|Redigera Husets lån)$/ });
      await form.getByLabel('Objekttyp', { exact: true }).selectOption({ label: 'Husavtal' });
      await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
      await expect(form.getByRole('alert', { name: 'Formuläret innehåller fel' })).toBeFocused();
      await form.getByRole('link', { name: /^Namn:/ }).click();
      await expect(form.getByLabel('Namn', { exact: true })).toBeFocused();
      await form.getByLabel('Namn', { exact: true }).fill('Husets lån');
      await form.getByRole('button', { name: 'Avtalet', exact: true }).click();
      const section = form;
      await section.getByLabel('Beskrivning', { exact: true }).fill('Gemensam avtalstext');
      await section.getByLabel('Anteckning', { exact: true }).fill('Eget värde');
      await section.getByLabel('Skuld: uppgiftens säkerhet').selectOption('uncertain');
      await section.getByLabel('Skuld', { exact: true }).fill('12 300');
      await section.getByLabel('Skuld: datum för uppgiften').fill('2026-09-01');
      await form.getByRole('button', { name: 'Datum', exact: true }).click();
      await form.getByLabel('Startdatum: uppgiftens säkerhet').selectOption('known');
      await form.getByLabel('Startdatum', { exact: true }).fill('2026-08-01');
      const common = form.getByRole('button', { name: 'Ekonomiska uppgifter', exact: true });
      await common.click();
      await form.getByLabel('Pris: uppgiftens säkerhet').selectOption('unknown');
      await form.getByLabel('Valuta: uppgiftens säkerhet').selectOption('none');
      await form.getByLabel('Beviljat kreditutrymme: uppgiftens säkerhet').selectOption('known');
      await form.getByRole('button', { name: 'Grunduppgifter', exact: true }).click();
      await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
      await expect(form.getByRole('alert', { name: 'Formuläret innehåller fel' })).toBeFocused();
      await form.getByRole('link', { name: /^Beviljat kreditutrymme:/ }).click();
      await expect(form.getByLabel('Beviljat kreditutrymme', { exact: true })).toBeFocused();
      await expect(form.getByLabel('Beviljat kreditutrymme', { exact: true })).toBeVisible();
      await form.getByLabel('Beviljat kreditutrymme: uppgiftens säkerhet').selectOption('');
      await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
      const proposed = await read();
      expect(proposed.objects).toEqual([]);
      const original = proposed.draft.changes[0].after;
      expect(original?.financialFacts).toEqual({
        debt: { knowledge: 'uncertain', value: '12 300', reportedOn: '2026-09-01' },
        startDate: { knowledge: 'known', value: '2026-08-01' },
        price: { knowledge: 'unknown' },
        currency: { knowledge: 'none' },
      });
      const receipt = await save();
      expect(receipt.objectTypes).toHaveLength(1);
      expect(receipt.changes[0].after?.financialFacts).toEqual(original?.financialFacts);
      await installation.restart();
      await page.reload();
      await settings();
      await page.getByText('Objekttyper och egna fält', { exact: true }).click();
      await page.getByRole('button', { name: 'Ändra typ: Husavtal', exact: true }).click();
      await page.getByRole('button', { name: 'Dölj Skuld, behåll värden', exact: true }).click();
      await page.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }).click();
      await returnToWork();
      await page
        .getByRole('list', { name: 'Objekt', exact: true })
        .getByRole('button', { name: 'Uppgifter för Husets lån', exact: true })
        .click();
      const details = page.getByRole('region', { name: 'Husets lån', exact: true });
      await expect(
        details.getByRole('region', { name: 'Uppgifter utanför typens avsnitt' }),
      ).toContainText(
        'Senast uppgiven skuld: 12 300 (Osäkert uppgivet) — datum för uppgiften: 2026-09-01',
      );
      await save();
      await page
        .getByRole('list', { name: 'Objekt', exact: true })
        .getByRole('button', { name: 'Uppgifter för Husets lån', exact: true })
        .click();
      await details.getByRole('button', { name: 'Redigera valt objekt' }).click();
      await form.getByLabel('Objekttyp', { exact: true }).selectOption('other');
      await page
        .getByRole('dialog', { name: 'Ta bort tidigare egna fält?', exact: true })
        .getByRole('button', { name: 'Ta bort fältvärdena och byt typ', exact: true })
        .click();
      await expect(form.getByLabel('Beskrivning', { exact: true })).toHaveValue(
        'Gemensam avtalstext',
      );
      await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
      const changed = await save();
      expect(changed.changes[0].after?.financialFacts).toEqual(original?.financialFacts);
      expect(changed.changes[0].after?.description).toBe('Gemensam avtalstext');
      await page.getByRole('button', { name: 'Rapporter' }).click();
      const history = page
        .getByRole('region', { name: 'Ändringshistorik' })
        .getByRole('article')
        .filter({ hasText: `Sparande: ${changed.operationId}` });
      await history.getByText('Visa ändringarna', { exact: true }).click();
      await expect(history).toContainText(
        'Senast uppgiven skuld: 12 300 (Osäkert uppgivet) — datum för uppgiften: 2026-09-01',
      );
      await expect(history).toContainText('Anteckning: Eget värde');
      await expect(
        history
          .getByText(
            'Senast uppgiven skuld: 12 300 (Osäkert uppgivet) — datum för uppgiften: 2026-09-01',
            { exact: true },
          )
          .first(),
      ).toBeVisible();
      await expect(history.getByText('Anteckning: Eget värde', { exact: true })).toBeVisible();
      await installation.restart();
      expect((await read()).objects[0]).toMatchObject({ ...changed.changes[0].after });
    } finally {
      await installation.close();
    }
  });
}
