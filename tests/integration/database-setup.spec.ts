import { openDraftReview, openTable, utilityButton } from '../support/client.js';
import { setupDatabase } from '../support/database-setup-steps.js';
import { alex, createInstallation } from '../support/installation.js';
import { expect, test } from '../support/test.js';

for (const provider of ['google', 'microsoft'] as const) {
  const caseId = provider === 'google' ? 'DEMO-01' : 'DEMO-02';
  test(`${caseId}: database setup gives only the configured ${provider} administrator a ready TestHousehold`, async ({
    page,
  }) => {
    const request = page.request;
    const firstAdmin = { provider, subject: alex.subject };
    const installation = await createInstallation(firstAdmin);
    try {
      const setup = await setupDatabase(installation, firstAdmin);
      expect(setup.code, setup.output).toBe(0);
      expect(
        await (await request.get(`${installation.origin}/api/bootstrap`)).json(),
      ).toMatchObject({
        status: 'anonymous',
      });
      const otherLabel = provider === 'google' ? 'Microsoft' : 'Google';
      const adminLabel = provider === 'google' ? 'Google' : 'Microsoft';
      await page.goto(installation.origin);
      await page.getByRole('button', { name: `Fortsätt med ${otherLabel}` }).click();
      const otherSignIn = page.waitForResponse(
        (response) =>
          response.url() === `${installation.origin}/api/auth/sign-in/social` &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: `Fortsätt till ${otherLabel}` }).click();
      expect((await otherSignIn).status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: 'Du har inte tillgång till hushållet' }),
      ).toBeVisible();
      expect(
        await (await request.get(`${installation.origin}/api/bootstrap`)).json(),
      ).toMatchObject({
        status: 'forbidden',
      });
      await page.getByRole('button', { name: 'Logga ut' }).click();
      await page.getByRole('button', { name: `Fortsätt med ${adminLabel}` }).click();
      const adminSignIn = page.waitForResponse(
        (response) =>
          response.url() === `${installation.origin}/api/auth/sign-in/social` &&
          response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: `Fortsätt till ${adminLabel}` }).click();
      expect((await adminSignIn).status()).toBe(200);
      await expect(page.getByRole('heading', { name: 'TestHousehold', exact: true })).toBeVisible();
      const { status, household } = await (
        await request.get(`${installation.origin}/api/bootstrap`)
      ).json();
      expect(status).toBe('ready');
      expect(household).toMatchObject({ name: 'TestHousehold', role: 'administrator' });
      const map = await (
        await request.get(`${installation.origin}/api/households/${household.id}/map`)
      ).json();
      expect(map.objects.map((object: { name: string }) => object.name).sort()).toEqual(
        [
          'Alex Exempel',
          'Alex blå cykel',
          'Familjens Molnmusik',
          'Familjens musikkonto',
          'Familjens musikkort',
          'Familjens garage',
          'Föreningens musikkonto',
          'Hushållets betalkonto',
          'Kim Exempel',
          'Kortets kontokoppling',
          'Lindens musikförening',
          'Lo Berg',
          'Molnmusik',
          'Molnmusik AB',
          'familjen@example.test',
          'musik@example.test',
        ].sort(),
      );
      expect(map.relationships).toHaveLength(21);
      const bicycle = map.objects.find(
        (object: { name: string }) => object.name === 'Alex blå cykel',
      );
      expect(bicycle).toMatchObject({
        iconId: 'bike',
        lifecycle: 'active',
        properties: [
          expect.objectContaining({
            label: 'Beskrivning',
            kind: 'text',
            value: 'En påhittad cykel som förvaras i garaget.',
          }),
          expect.objectContaining({ label: 'Ramfärg', kind: 'text', value: 'Blå' }),
          expect.objectContaining({ label: 'Extrahjul', kind: 'number', value: 0 }),
          expect.objectContaining({ label: 'Kontrolldatum', kind: 'date', value: '2026-04-03' }),
          expect.objectContaining({ label: 'Elcykel', kind: 'boolean', value: false }),
          expect.objectContaining({
            label: 'Dold rammärkning',
            kind: 'text',
            value: 'Syntetisk ram: DEMO-CYKEL',
          }),
          expect.objectContaining({ label: 'Pris', kind: 'number', value: 4995 }),
          expect.objectContaining({ label: 'Valuta', kind: 'text', value: 'SEK' }),
          expect.objectContaining({ label: 'Startdatum', kind: 'date', value: '2026-04-03' }),
        ],
      });
      expect(map.draft.relationships).toHaveLength(1);
      expect(map.draft.relationships[0].before.id).toBe(map.draft.relationships[0].id);
      expect(map.draft.relationships[0].after.sourceId).toBe(
        map.draft.relationships[0].before.sourceId,
      );
      expect(map.draft.relationships[0].after.targetId).not.toBe(
        map.draft.relationships[0].before.targetId,
      );
      expect(map.draft.changes).toEqual([
        expect.objectContaining({
          before: expect.objectContaining({ name: 'Lo Exempel' }),
          after: expect.objectContaining({ name: 'Lo Lind' }),
        }),
      ]);
      const savedLo = map.objects.find((object: { name: string }) => object.name === 'Lo Berg');
      expect(savedLo.revision).toBeGreaterThan(map.draft.changes[0].before.revision);
      expect(savedLo.properties).toMatchObject([
        { label: 'Beskrivning', value: 'Spelar piano i musikföreningen.' },
      ]);
      expect(map.draft.relationships[0].objectNames).toEqual(
        expect.objectContaining({
          [map.draft.relationships[0].before.targetId]: 'familjen@example.test',
          [map.draft.relationships[0].after.targetId]: 'musik@example.test',
        }),
      );
      const { history } = await (
        await request.get(`${installation.origin}/api/households/${household.id}/map/history`)
      ).json();
      expect(history).toHaveLength(2);
      expect(history[1].userId).not.toBe(history[0].userId);
      expect(history[1].userId).toBe(map.userId);
      expect(history[0].userId).not.toBe(map.userId);
      expect(history[0].changes[0]).toMatchObject({
        before: { name: 'Lo Exempel' },
        after: { name: 'Lo Berg' },
      });
      await page.goto(installation.origin);
      await openTable(page);
      const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
      await table.getByRole('button', { name: 'Alex blå cykel', exact: true }).click();
      const details = table.getByRole('row').filter({ hasText: 'Dold rammärkning' });
      await expect(details).toContainText('En påhittad cykel som förvaras i garaget.');
      await expect(details.getByText('Ikon', { exact: true }).locator('..')).toContainText('Cykel');
      await expect(details.getByText('Status', { exact: true }).locator('..')).toContainText(
        'Gäller fortfarande',
      );
      await expect(details).toContainText('Ramfärg');
      await expect(details).toContainText('Blå');
      await expect(details).toContainText('Kontrolldatum');
      await expect(details).toContainText('2026-04-03');
      await expect(details).toContainText('Syntetisk ram: DEMO-CYKEL');
      await expect(details).toContainText('Extrahjul');
      await expect(details).toContainText('0');
      await expect(details).toContainText('Elcykel');
      await expect(details).toContainText('Nej');
      await expect(details).toContainText('4995');
      await expect(details).toContainText('SEK');
      await table
        .getByRole('button', { name: 'Samband för Lindens musikförening', exact: true })
        .click();
      const standalone = page.getByRole('dialog', {
        name: 'Samband för Lindens musikförening',
        exact: true,
      });
      await expect(standalone).toContainText('Inga samband');
      await page.keyboard.press('Escape');
      await table.getByRole('button', { name: 'Samband för Molnmusik', exact: true }).click();
      const service = page.getByRole('dialog', { name: 'Samband för Molnmusik', exact: true });
      await expect(service).toContainText('Osäkert uppgivet');
      await expect(service).toContainText('Ja');
      await page.keyboard.press('Escape');
      await table.getByRole('button', { name: 'Samband för Alex Exempel', exact: true }).click();
      let dialog = page.getByRole('dialog', { name: 'Samband för Alex Exempel', exact: true });
      await dialog.getByRole('button', { name: 'Alex blå cykel', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Uppgifter för Alex blå cykel', exact: true });
      await expect(dialog).toContainText('Syntetisk ram: DEMO-CYKEL');
      await dialog.getByRole('button', { name: 'Samband för Alex blå cykel', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Samband för Alex blå cykel', exact: true });
      await dialog.getByRole('button', { name: 'Familjens garage', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Uppgifter för Familjens garage', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(
        conflict.getByRole('region', { name: 'Sparat i kartan nu', exact: true }),
      ).toContainText('Lo Berg');
      await expect(
        conflict.getByRole('region', { name: 'Ditt förslag', exact: true }),
      ).toContainText('Lo Lind');
      await page.keyboard.press('Escape');
      const draft = await openDraftReview(page);
      await expect(draft).toContainText('Lo Lind');
      await expect(draft).toContainText('musik@example.test');
      await (await utilityButton(page, 'Rapporter')).click();
      const report = page.getByRole('region', { name: 'Ändringshistorik', exact: true });
      await expect(report).toContainText('Robin Demo');
      await expect(report).toContainText('Development administrator');
      const preserved = await (
        await request.get(`${installation.origin}/api/households/${household.id}/map`)
      ).json();
      expect(preserved).toEqual(map);
      expect(
        (
          await request.get(`${installation.origin}/api/households/${household.id}/administration`)
        ).status(),
      ).toBe(200);
      await installation.restart();
      expect(
        await (await request.get(`${installation.origin}/api/bootstrap`)).json(),
      ).toMatchObject({
        status: 'ready',
        household,
      });
      expect(
        await (
          await request.get(`${installation.origin}/api/households/${household.id}/map`)
        ).json(),
      ).toEqual(map);
      await page.reload();
      await openTable(page);
      await expect(page.getByRole('button', { name: 'Alex blå cykel', exact: true })).toBeVisible();
      const restoredDraft = await openDraftReview(page);
      await expect(restoredDraft).toContainText('Lo Lind');
      await expect(restoredDraft).toContainText('musik@example.test');
    } finally {
      await installation.close();
    }
  });
}
