import { createHousehold, signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { createInstallation } from '../../support/installation.js';

test('HTTP family objects and directed relationships save together and keep their identities', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  try {
    await signIn(request, installation.origin);
    const { household } = await (await createHousehold(request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}/map`;
    const read = async () => (await request.get(path)).json();
    const post = async (route: string, data: unknown) =>
      request.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
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
        },
      });
      expect(response.status()).toBe(200);
      state = await read();
    }
    const typeId = state.relationshipTypes.find(
      (item: { name: string }) => item.name === 'Gäller tjänstekontot',
    ).id;
    const value = { typeId, sourceId: 'subscription', targetId: 'account' };
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
    const history = await (await request.get(`${path}/history`)).json();
    expect(history.history[0]).toEqual(receipt);
  } finally {
    await installation.close();
  }
});
