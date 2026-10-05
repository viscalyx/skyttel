import { expect, test } from '@playwright/test';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { applyProposedConflictChanges } from '../support/conflict-properties.js';
import { createInstallation } from '../support/installation.js';

test('TYP-01: custom definitions and four optional fields share one durable save and history', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const post = (route: string, data: unknown) =>
      page.request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
    const fields = [
      { id: 'supplier', name: 'Leverantör', description: 'Namn', kind: 'text' },
      { id: 'power', name: 'Effekt', description: 'kW', kind: 'number' },
      { id: 'installed', name: 'Installationsdatum', description: '', kind: 'date' },
      { id: 'battery', name: 'Batteri', description: '', kind: 'boolean' },
    ];
    expect(
      (
        await post('object-type', {
          version: 0,
          id: 'solar',
          baseRevision: null,
          value: { name: 'Solcellsanläggning', description: 'Hushållets elproduktion', fields },
        })
      ).status(),
    ).toBe(200);
    const value = {
      typeId: 'solar',
      name: 'Paneler på taket',
      description: '',
      customValues: { supplier: 'Exempelsol', power: 12.5, installed: '2026-09-01' },
    };
    expect(
      (await post('draft', { version: 1, id: 'panels', baseRevision: null, value })).status(),
    ).toBe(200);
    await installation.restart();
    const proposed = await (await page.request.get(path)).json();
    expect(proposed.types.some((type: { id: string }) => type.id === 'solar')).toBe(false);
    expect(proposed.objects).toEqual([]);
    expect(proposed.draft.changes[0].after).toEqual(value);
    expect(proposed.draft.objectTypes[0].after.fields).toEqual(fields);
    const saved = await post('save', { version: 2, operationId: 'solar-save' });
    expect(saved.status()).toBe(200);
    const { receipt } = await saved.json();
    expect(receipt.objectTypes[0].after).toMatchObject({ id: 'solar', revision: 1, fields });
    expect(receipt.changes[0].after).toMatchObject(value);
    await installation.restart();
    const current = await (await page.request.get(path)).json();
    expect(current.objects[0].customValues).not.toHaveProperty('battery');
    expect(current.types.find((type: { id: string }) => type.id === 'solar')).toEqual(
      receipt.objectTypes[0].after,
    );
    expect((await (await page.request.get(`${path}/history`)).json()).history).toEqual([receipt]);
    expect(await (await post('save', { version: 2, operationId: 'solar-save' })).json()).toEqual({
      receipt,
    });
  } finally {
    await installation.close();
  }
});

test('TYP-02: forms create, review and correct optional custom fields without confusing unanswered and no', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Ny objekttyp', exact: true }).click();
    await page.getByLabel('Typens namn').fill('Solcellsanläggning');
    await page.getByLabel('Typens beskrivning').fill('Hushållets elproduktion');
    for (const [name, kind] of [
      ['Leverantör', 'text'],
      ['Effekt', 'number'],
      ['Installationsdatum', 'date'],
      ['Batteri', 'boolean'],
    ]) {
      await page.getByRole('button', { name: 'Lägg till fält', exact: true }).click();
      const fields = page.getByRole('group', { name: /^Eget fält/ });
      const last = fields.last();
      await last.getByLabel('Fältets namn').fill(name);
      await last.getByLabel('Värdeslag').selectOption(kind);
    }
    await page.getByRole('button', { name: 'Lägg typförslaget i mitt utkast' }).click();
    await page
      .getByRole('region', { name: 'Lista och utkast', exact: true })
      .getByRole('button', { name: 'Nytt objekt', exact: true })
      .click();
    await page.getByLabel('Namn', { exact: true }).fill('Paneler på taket');
    await page
      .getByLabel('Objekttyp', { exact: true })
      .selectOption({ label: 'Solcellsanläggning' });
    await page.getByRole('button', { name: 'Egna fält', exact: true }).click();
    await expect(page.getByLabel('Batteri', { exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    const review = page.getByRole('region', { name: 'Hela mitt utkast' });
    await expect(review).toContainText('Batteri: Obesvarat');
    await expect(review).toContainText('Objekttyp: Solcellsanläggning');
    await page.reload();
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Uppgifter för Paneler på taket', exact: true }).click();
    await page.getByRole('button', { name: 'Redigera valt objekt', exact: true }).click();
    await page.getByRole('button', { name: 'Egna fält', exact: true }).click();
    await expect(page.getByLabel('Leverantör', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Effekt', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Installationsdatum', { exact: true })).toHaveValue('');
    await page
      .getByRole('dialog', { name: 'Redigera Paneler på taket', exact: true })
      .getByRole('button', { name: 'Avbryt', exact: true })
      .click();
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(
      page.getByRole('status', { name: 'Hushållsarbetets status', exact: true }),
    ).toContainText('Sparat');
