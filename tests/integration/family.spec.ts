import { expect, test } from '@playwright/test';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { applyProposedConflictChanges } from '../support/conflict-properties.js';
import { createInstallation } from '../support/installation.js';

test('KARTA-07: family objects and directed relationships save together and keep their identities', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async () => (await page.request.get(path)).json();
    const post = async (route: string, data: unknown) =>
      page.request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
    let state = await read();
    for (const [id, type, name] of [
      ['service', 'Tjänst', 'Molnmusik'],
      ['account', 'Tjänstekonto', 'Familjens konto'],
      ['subscription', 'Abonnemang', 'Familjemusik'],
      ['person', 'Person', 'Lo'],
      ['email', 'E-postadress', 'familj@example.test'],
      ['card', 'Kort', 'Familjekort'],
      ['bank', 'Bankkonto', 'Hushållskonto'],
      ['company', 'Företag', 'Moln AB'],
    ]) {
      const response = await post('draft', {
        version: state.draft.version,
        id,
        baseRevision: null,
        value: {
          typeId: state.types.find((item: { name: string }) => item.name === type).id,
          name,
          description: '',
        },
      });
      expect(response.status()).toBe(200);
      state = await read();
    }
    const typeId = state.relationshipTypes.find(
      (item: { name: string }) => item.name === 'Gäller tjänstekontot',
    ).id;
    const value = { typeId, sourceId: 'subscription', targetId: 'account', knowledge: 'known' };
    let response = await post('relationship', {
      version: state.draft.version,
      id: 'subscription-account',
      baseRevision: null,
      value,
    });
    expect(response.status()).toBe(200);
    state = await read();
    expect(state.objects).toEqual([]);
    expect(state.relationships).toEqual([]);
    expect(state.draft.relationships).toHaveLength(1);
    response = await post('relationship', {
      version: state.draft.version,
      id: 'duplicate',
      baseRevision: null,
      value,
    });
    expect(response.status()).toBe(200);
    state = await read();
    expect(state.draft.relationships).toHaveLength(1);
    response = await post('save', { version: state.draft.version, operationId: 'family-save' });
    expect(response.status()).toBe(200);
    const { receipt } = await response.json();
    expect(receipt.changes).toHaveLength(8);
    expect(receipt.relationships[0].after).toMatchObject({ id: 'subscription-account', ...value });
    await installation.restart();
    state = await read();
    expect(state.objects).toHaveLength(8);
    expect(state.relationships).toEqual([receipt.relationships[0].after]);
    const history = await (await page.request.get(`${path}/history`)).json();
    expect(history.history[0]).toEqual(receipt);
  } finally {
    await installation.close();
  }
});

test('KARTA-05: manual forms preserve incomplete meanings and block an unanswered identity question', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    await createHousehold(page.request, installation.origin);
    await page.goto(installation.origin);
    await openWorkspace(page);
    for (const [name, type, identity] of [
      ['Familjemusik', 'Abonnemang', 'identified'],
      ['Betalkonto', 'Bankkonto', 'unspecified'],
    ]) {
      await page
        .getByRole('region', { name: 'Lista och utkast', exact: true })
        .getByRole('button', { name: 'Nytt objekt', exact: true })
        .click();
      await page.getByLabel('Namn', { exact: true }).fill(name);
      await page.getByLabel('Objekttyp', { exact: true }).selectOption({ label: type });
      await page.getByLabel('Identitet').selectOption(identity);
      await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Nytt samband', exact: true }).click();
    await page.getByLabel('Från objekt').selectOption({ label: 'Familjemusik (Abonnemang)' });
    await page.getByLabel('Sambandstyp', { exact: true }).selectOption({ label: 'Betalas med' });
    await page.getByLabel('Uppgiftens säkerhet', { exact: true }).selectOption('unresolved');
    await page.getByRole('button', { name: 'Lägg sambandet i mitt utkast' }).click();
    await page.reload();
    await openWorkspace(page);
    await expect(page.getByRole('region', { name: 'Hela mitt utkast' })).toContainText(
      'Obesvarad identitetsfråga',
    );
    await expect(page.getByRole('button', { name: 'Spara hela utkastet' })).toBeDisabled();
    await page
      .getByRole('list', { name: 'Samband', exact: true })
      .getByRole('button', { name: /Familjemusik → Betalas med → Obesvarad/ })
      .click();
    await page.getByRole('button', { name: 'Redigera valt samband', exact: true }).click();
    await page.getByLabel('Uppgiftens säkerhet', { exact: true }).selectOption('uncertain');
    await page.getByLabel('Till objekt').selectOption({ label: 'Betalkonto (Bankkonto)' });
    await page.getByRole('button', { name: 'Lägg sambandet i mitt utkast' }).click();
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    await expect(
      page.getByRole('status', { name: 'Hushållsarbetets status', exact: true }),
    ).toContainText('Sparat');
