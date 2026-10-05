import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { beginAssistant, callAssistant } from '../../support/assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation, robin } from '../../support/installation.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let browser: APIRequestContext;
let householdId: string;
let token: string;
let path: string;
beforeEach(async () => {
  app = await createInstallation();
  browser = await request.newContext();
  await signIn(browser, app.origin);
  ({
    household: { id: householdId },
  } = await (await createHousehold(browser, app.origin)).json());
  path = `${app.origin}/api/households/${householdId}/map`;
  const flow = await beginAssistant(browser, app.origin, 'skyttel:read skyttel:write');
  const consent = await flow.consent(householdId);
  expect(consent.status()).toBe(200);
  const response = await flow.exchange((await consent.json()).url);
  expect(response.status).toBe(200);
  token = (await response.json()).access_token;
});
afterEach(async () => {
  await browser.dispose();
  await app.close();
});

async function tool(name: string, args = {}, expectedError?: string) {
  const response = await callAssistant(app.origin, token, name, args);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.error).toBeUndefined();
  const value = JSON.parse(body.result.content[0].text);
  if (expectedError) {
    expect(body.result.isError).toBe(true);
    expect(value.error).toBe(expectedError);
  } else expect(body.result.isError, JSON.stringify(body.result)).not.toBe(true);
  return value;
}
function version(review: { version: number; contentVersion: number }) {
  return { version: review.version, contentVersion: review.contentVersion };
}

async function object(id: string, updates: Record<string, unknown>) {
  const state = await (await browser.get(path)).json();
  const saved = state.objects.find((item: { id: string }) => item.id === id);
  const { id: _id, householdId: _household, revision: _revision, ...value } = saved ?? {};
  return tool('propose_object', {
    ...version({ ...state.draft, contentVersion: state.contentVersion }),
    id,
    baseRevision: saved?.revision ?? null,
    value: { typeId: state.types[0].id, name: id, description: '', ...value, ...updates },
  });
}

async function save(operationId: string) {
  const review = await tool('read_my_draft');
  return (await tool('save_draft', { ...version(review), operationId })).receipt;
}

async function definition(id: string, value: unknown, expectedError?: string) {
  const state = await (await browser.get(path)).json();
  return tool(
    'propose_object_type',
    {
      ...version({ ...state.draft, contentVersion: state.contentVersion }),
      id,
      baseRevision: state.types.find((type: { id: string }) => type.id === id)?.revision ?? null,
      value,
    },
    expectedError,
  );
}

async function member() {
  const other = await request.newContext();
  app.setIdentity(robin);
  await signIn(other, app.origin);
  const { user } = await (await other.get(`${app.origin}/api/bootstrap`)).json();
  const invitation = await browser.post(`${path.replace('/map', '')}/invitations`, {
    headers: { origin: app.origin },
    data: { userId: user.id },
  });
  const accepted = await other.post(`${app.origin}/api/invitations/accept`, {
    headers: { origin: app.origin },
    data: { code: (await invitation.json()).code },
  });
  expect(accepted.status()).toBe(200);
  return other;
}

test('advanced tools use actual SDK contracts, preserve old read grants and current revocation', async () => {
  const client = new Client({ name: 'Avancerad provklient', version: '1' });
  const readClient = new Client({ name: 'Äldre läsande klient', version: '1' });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${app.origin}/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${token}` } },
      }),
    );
    const catalog = (await client.listTools()).tools;
    const newMutations = ['propose_object_type', 'propose_relationship_type'];
    for (const name of newMutations) {
      const tool = catalog.find((item) => item.name === name);
      expect(tool?.annotations?.readOnlyHint).toBe(false);
      expect(tool?.inputSchema.required).toEqual(
        expect.arrayContaining(['version', 'contentVersion']),
      );
    }
    expect(catalog.map(({ name }) => name).join(' ')).not.toMatch(
      /export|import|erase|member|admin/,
    );
    const flow = await beginAssistant(browser, app.origin, 'skyttel:read');
    const accepted = await flow.consent(householdId);
    const readToken = (await (await flow.exchange((await accepted.json()).url)).json())
      .access_token;
    await readClient.connect(
      new StreamableHTTPClientTransport(new URL(`${app.origin}/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${readToken}` } },
      }),
    );
    expect((await readClient.listTools()).tools.map(({ name }) => name)).toEqual([
      'read_map',
      'read_my_draft',
    ]);
    expect(
      (
        await readClient.callTool({
          name: 'propose_object_type',
          arguments: {
            version: 0,
            contentVersion: 1,
            id: 'forbidden',
            baseRevision: null,
            value: { name: 'Ej tillåten', description: '', fields: [] },
          },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: 'propose_relationship_type',
          arguments: {
            version: 0,
            contentVersion: 1,
            id: 'fields',
            baseRevision: null,
            value: {
              name: 'Fel',
              description: '',
              forwardLabel: 'framåt',
              reverseLabel: 'bakåt',
              fields: [{ id: 'invalid', name: 'Fel', description: '', kind: 'money' }],
            },
          },
        })
      ).isError,
    ).toBe(true);
    await tool('read_history', { operationId: 'missing-owner' }, 'invalid_request');
    await tool('read_history', { userId: 'missing-operation' }, 'invalid_request');
    await tool(
      'read_history',
      { operationId: 'missing', userId: 'missing', objectId: 'extra' },
      'invalid_request',
    );
    await tool(
      'read_history',
      { operationId: 'missing', userId: 'missing' },
      'history_unavailable',
    );
    expect((await tool('read_history', { offset: 20 })).history).toEqual([]);
    const context = await (await browser.get(`${app.origin}/api/assistants/context`)).json();
    for (const connection of context.connections)
      expect(
        (
          await browser.post(`${app.origin}/api/assistants/${connection.id}/revoke`, {
            headers: { origin: app.origin },
            data: {},
          })
        ).status(),
      ).toBe(200);
    await expect(client.callTool({ name: 'read_history', arguments: {} })).rejects.toThrow();
  } finally {
    await client.close();
    await readClient.close();
  }
});

test('MCP uses fresh content versions to read imported historical authorship and rejects every old advanced mutation', async () => {
  await object('lamp', { name: 'Historisk lampa' });
  const original = await save('source-save');
  const householdPath = path.replace('/map', '');
  const prepared = await browser.post(`${householdPath}/exports`, {
    headers: { origin: app.origin },
    data: {},
  });
  expect(prepared.status()).toBe(201);
  const archive = await (
    await browser.get(`${householdPath}/exports/${(await prepared.json()).id}`)
  ).body();
  const source = { app, browser };
  app = await createInstallation();
  browser = await request.newContext();
  try {
    await signIn(browser, app.origin);
    const { household } = await (
      await createHousehold(browser, app.origin, 'Återställt hushåll')
    ).json();
    const targetPath = `${app.origin}/api/households/${household.id}`;
    const uploaded = await browser.post(`${targetPath}/imports`, {
      headers: {
        origin: app.origin,
        'content-type': 'application/zip',
        'x-skyttel-content-version': '1',
      },
      data: archive,
    });
    expect(uploaded.status(), await uploaded.text()).toBe(201);
    const ready = await uploaded.json();
    const confirmed = await browser.post(`${targetPath}/imports/${ready.id}/confirm`, {
      headers: { origin: app.origin },
      data: { contentVersion: 1, confirmed: true },
    });
    expect((await confirmed.json()).status).toBe('completed');
    const flow = await beginAssistant(browser, app.origin, 'skyttel:read skyttel:write');
    const consent = await flow.consent(household.id);
    token = (await (await flow.exchange((await consent.json()).url)).json()).access_token;
    path = `${targetPath}/map`;
    await app.restart();
    const review = await tool('read_my_draft');
    expect(review.contentVersion).toBe(2);
    const selected = await tool('read_history', {
      operationId: original.operationId,
      userId: original.userId,
    });
    expect(selected.receipt).toMatchObject({
      userId: original.userId,
      contentVersion: 1,
      actorName: 'Alex Exempel',
    });
    const currentOwner = (await (await browser.get(path)).json()).userId;
    expect(currentOwner).not.toBe(original.userId);
    for (const [name, args] of [
      [
        'propose_object_type',
        {
          id: 'stale-type',
          baseRevision: null,
          value: { name: 'Gammal typ', description: '', fields: [] },
        },
      ],
      [
        'propose_relationship_type',
        {
          id: 'stale-edge-type',
          baseRevision: null,
          value: {
            name: 'Gammal typ',
            description: '',
            forwardLabel: 'framåt',
            reverseLabel: 'bakåt',
          },
        },
      ],
    ] as const) {
      await tool(name, { ...args, version: review.version, contentVersion: 1 }, 'content_conflict');
    }
    expect(await tool('read_my_draft')).toEqual(review);
  } finally {
    await browser.dispose();
    await app.close();
    app = source.app;
    browser = source.browser;
  }
});

test('MCP rental, loan, credit and installment cases preserve dated uncertainty and correct facts without inventing missing information', async () => {
  const catalog = await tool('read_type_catalog');
  const type = (name: string) =>
    catalog.types.find((entry: { name: string }) => entry.name === name).id;
  const cases = [
    [
      'home-rent',
      'Hyresavtal',
      'Hyra för Linden 4',
      {
        price: { knowledge: 'known', value: '9 500' },
        currency: { knowledge: 'known', value: 'SEK' },
        paymentInterval: { knowledge: 'known', value: 'månad' },
        terms: { knowledge: 'unknown' },
      },
    ],
    [
      'garage-rent',
      'Hyresavtal',
      'Hyra för garaget',
      { price: { knowledge: 'uncertain', value: '650' }, endDate: { knowledge: 'none' } },
    ],
    [
      'loan',
      'Låneavtal',
      'Exempellån',
      { debt: { knowledge: 'uncertain', value: '125 000,50', reportedOn: '2026-09-01' } },
    ],
    [
      'credit',
      'Kreditavtal',
      'Exempelkredit',
      {
        creditLimit: { knowledge: 'known', value: '80 000', reportedOn: '2026-08-01' },
        usedCredit: { knowledge: 'known', value: '12 500', reportedOn: '2026-09-02' },
        terms: { knowledge: 'none' },
      },
    ],
    [
      'installment',
      'Avbetalningsavtal',
      'Bilens avbetalning',
      { debt: { knowledge: 'unknown', reportedOn: '2026-09-03' } },
    ],
  ] as const;
  for (const [id, kind, name, financialFacts] of cases)
    await object(id, { typeId: type(kind), name, financialFacts });
  await object('car', { typeId: type('Fordon'), name: 'Familjens bil', identity: 'unspecified' });
  let review = await tool('read_my_draft');
  for (const [id, typeName, sourceId, targetId, knowledge] of [
    ['finance-car', 'Finansierar', 'installment', 'car', 'known'],
    ['unknown-landlord', 'Hyresvärd', 'home-rent', null, 'unknown'],
    ['no-payer', 'Betalar', 'garage-rent', null, 'none'],
    ['uncertain-collateral', 'Finansierar', 'loan', 'car', 'uncertain'],
  ] as const)
    review = await tool('propose_relationship', {
      ...version(review),
      id,
      baseRevision: null,
      value: {
        typeId: catalog.relationshipTypes.find((entry: { name: string }) => entry.name === typeName)
          .id,
        sourceId,
        targetId,
        knowledge,
      },
    });
  await save('extended-household');
  await app.restart();
  for (const [id, kind, name, financialFacts] of cases) {
    const found = await tool('read_map', { query: name });
    expect(found.objects).toHaveLength(1);
    expect(found.objects[0]).toMatchObject({ id, typeId: type(kind), financialFacts });
    expect(found.objects[0].financialFacts).toEqual(financialFacts);
  }
  expect((await tool('read_map', { objectId: 'car' })).objects[0].identity).toBe('unspecified');
  const credit = (await tool('read_map', { objectId: 'credit' })).objects[0];
  await object('credit', {
    financialFacts: {
      ...credit.financialFacts,
      usedCredit: { knowledge: 'known', value: '0', reportedOn: '2026-09-20' },
    },
  });
  const receipt = await save('credit-correction');
  const history = await tool('read_history', {
    operationId: receipt.operationId,
    userId: receipt.userId,
  });
  expect(history.receipt.changes[0]).toMatchObject({
    before: { financialFacts: { usedCredit: { value: '12 500', reportedOn: '2026-09-02' } } },
    after: { financialFacts: { usedCredit: { value: '0', reportedOn: '2026-09-20' } } },
  });
  const saved = await tool('read_map');
  expect(saved.relationships.map((edge: { knowledge: string }) => edge.knowledge).sort()).toEqual([
    'known',
    'none',
    'uncertain',
    'unknown',
  ]);
});

test('MCP type change preserves object and edges without field conversion', async () => {
  for (const [id, name, kind] of [
    ['cycle', 'Cykel', 'text'],
    ['vehicle', 'Motorfordon', 'number'],
  ]) {
    await definition(id, {
      name,
      description: '',
      fields: [
        { id: 'serial', name: 'Nummer', description: '', kind },
        { id: 'insured', name: 'Försäkrad', description: '', kind: 'boolean' },
      ],
    });
  }
  await object('bike', {
    typeId: 'cycle',
    name: 'Alex blå cykel',
    customValues: { serial: 'SYNTH-42', insured: false },
  });
  let review = await object('garage', { name: 'Garaget' });
  review = await tool('propose_relationship_type', {
    ...version(review),
    id: 'parking-type',
    baseRevision: null,
    value: {
      name: 'Förvaring',
      description: '',
      forwardLabel: 'förvaras i',
      reverseLabel: 'innehåller',
    },
  });
  await tool('propose_relationship', {
    ...version(review),
    id: 'parking',
    baseRevision: null,
    value: { typeId: 'parking-type', sourceId: 'bike', targetId: 'garage', knowledge: 'known' },
  });
  await save('before-type-change');
  const initial = await tool('read_map', { objectId: 'bike' });
  review = await object('bike', { typeId: 'vehicle', customValues: { serial: 42 } });
  expect(review.changes[0]).toMatchObject({
    before: { typeId: 'cycle', customValues: { serial: 'SYNTH-42', insured: false } },
    after: { typeId: 'vehicle', customValues: { serial: 42 } },
    beforeType: { name: 'Cykel' },
    type: { name: 'Motorfordon' },
  });
  await save('type-change');
  expect((await tool('read_map', { objectId: 'bike' })).relationships).toEqual(
    initial.relationships,
  );
  expect((await tool('read_map', { objectId: 'bike' })).objects[0].customValues).toEqual({
    serial: 42,
  });
});

test('MCP protects used fields and ended definitions, explains private-use blocks without leaking content, and rechecks concurrent use at whole save', async () => {
  const field = { id: 'serial', name: 'Nummer', description: '', kind: 'text' };
  const type = { name: 'Cykel', description: '', fields: [field] };
  await definition('cycle', type);
  await object('bike', {
    typeId: 'cycle',
    name: 'Alex blå cykel',
    customValues: { serial: 'SYNTH-42' },
    lifecycle: 'ended',
  });
  await save('used-field');
  const blockedKind = await definition(
    'cycle',
    { ...type, fields: [{ ...field, kind: 'number' }] },
    'field_kind_in_use',
  );
  expect(blockedKind.message).toContain('nytt fält');
  const blockedField = await definition('cycle', { ...type, fields: [] }, 'field_in_use');
  expect(blockedField.message).toContain('fältvärden');
  const blockedType = await definition('cycle', null, 'definition_in_use');
  expect(blockedType.message).toContain('upphört');
  expect((await tool('read_map', { objectId: 'bike' })).objects[0].customValues).toEqual({
    serial: 'SYNTH-42',
  });
  await definition('cycle', {
    ...type,
    name: 'Trampcykel',
    fields: [field, { ...field, id: 'numeric', name: 'Numeriskt nummer', kind: 'number' }],
  });
  await save('new-field');
  expect((await tool('read_map', { objectId: 'bike' })).objects[0].customValues).toEqual({
    serial: 'SYNTH-42',
  });
  await definition('private-type', { name: 'Privat använd typ', description: '', fields: [] });
  await definition('race-type', { name: 'Samtidig använd typ', description: '', fields: [] });
  await save('available-types');
  const other = await member();
  try {
    const propose = async (id: string, typeId: string, name: string) => {
      const state = await (await other.get(path)).json();
      const response = await other.post(`${path}/draft`, {
        headers: { origin: app.origin },
        data: {
          version: state.draft.version,
          contentVersion: state.contentVersion,
          id,
          baseRevision: null,
          value: { typeId, name, description: 'Privat hemlig anteckning' },
        },
      });
      expect(response.status()).toBe(200);
    };
    await propose('secret', 'private-type', 'Andras privata namn');
    const denied = await definition('private-type', null, 'definition_in_use');
    expect(JSON.stringify(denied)).not.toMatch(
      /Andras privata namn|Privat hemlig anteckning|"secret"/,
    );
    const review = await definition('race-type', null);
    await propose('racer', 'race-type', 'Nytt privat bruk');
    await tool(
      'save_draft',
      { ...version(review), operationId: 'racing-removal' },
      'definition_in_use',
    );
    expect(
      (await tool('read_type_catalog')).types.some(
        (item: { id: string }) => item.id === 'private-type',
      ),
    ).toBe(true);
    const saved = await (await browser.get(path)).json();
    expect(saved.types.some((item: { id: string }) => item.id === 'race-type')).toBe(true);
    expect(saved.objects.some((item: { id: string }) => item.id === 'secret')).toBe(false);
    expect((await (await other.get(path)).json()).draft.changes).toHaveLength(2);
  } finally {
    await other.dispose();
  }
});

test('MCP history discovery is bounded and scoped while a selected save exposes historical facts', async () => {
  await object('bike', { name: 'Alex blå cykel', description: 'Blå ram' });
  await save('initial-bike');
  await object('unrelated', {
    name: 'Orelaterat konto',
    description: 'Unik orelaterad anteckning',
  });
  await save('unrelated-save');
  await object('bike', { description: 'Grön ram' });
  const corrected = await save('repaint');
  await object('bike', { name: 'Alex stadscykel' });
  await save('independent-name');
  const summaries = await tool('read_history', { objectId: 'bike', limit: 2 });
  expect(summaries.history.map((item: { operationId: string }) => item.operationId)).toEqual([
    'independent-name',
    'repaint',
  ]);
  expect(summaries.hasMore).toBe(true);
  expect(JSON.stringify(summaries)).not.toMatch(/Unik orelaterad|Blå ram|Grön ram|unrelated-save/);
  const selected = await tool('read_history', {
    operationId: corrected.operationId,
    userId: corrected.userId,
  });
  expect(selected.receipt).toMatchObject({
    actorName: 'Alex Exempel',
    savedAt: expect.stringMatching(/T/),
    changes: [{ before: { description: 'Blå ram' }, after: { description: 'Grön ram' } }],
  });
});

test('MCP creates a household solar type with four field kinds and preserves unanswered and false values', async () => {
  let review = await tool('read_my_draft');
  expect((await tool('read_map')).objects).toEqual([]);
  expect((await tool('read_type_catalog')).types.length).toBeGreaterThan(0);
  review = await tool('propose_object_type', {
    ...version(review),
    id: 'solar',
    baseRevision: null,
    value: {
      name: 'Solcellsanläggning',
      description: 'Hushållets egen anläggning',
      fields: [
        { id: 'model', name: 'Modell', description: '', kind: 'text' },
        { id: 'power', name: 'Effekt', description: 'kW', kind: 'number' },
        { id: 'installed', name: 'Installerad', description: '', kind: 'date' },
        { id: 'battery', name: 'Batteri', description: '', kind: 'boolean' },
      ],
    },
  });
  const catalog = await tool('read_type_catalog');
  expect(catalog.types.find((type: { id: string }) => type.id === 'solar').fields).toHaveLength(4);
  for (const [id, customValues] of [
    ['roof', { model: 'Takpanelen', power: 7.5, installed: '2026-09-01' }],
    ['garage', { battery: false }],
  ] as const) {
    review = await tool('propose_object', {
      ...version(review),
      id,
      baseRevision: null,
      typeRevision: 1,
      value: {
        typeId: 'solar',
        name: id === 'roof' ? 'Takets solceller' : 'Garagets solceller',
        description: '',
        customValues,
      },
    });
  }
  expect((await (await browser.get(path)).json()).objects).toEqual([]);
  const { receipt } = await tool('save_draft', { ...version(review), operationId: 'solar-save' });
  expect(receipt.objectTypes).toHaveLength(1);
  expect(receipt.changes).toHaveLength(2);
  await app.restart();
  const state = await tool('read_map');
  expect(state.objects.find((object: { id: string }) => object.id === 'roof').customValues).toEqual(
    { model: 'Takpanelen', power: 7.5, installed: '2026-09-01' },
  );
  expect(
    state.objects.find((object: { id: string }) => object.id === 'garage').customValues,
  ).toEqual({ battery: false });
  expect(
    (await (await browser.get(path)).json()).types.find(
      (type: { id: string }) => type.id === 'solar',
    ).fields,
  ).toHaveLength(4);
});

test('MCP catalog and proposals retain ordered sections, hidden fields and negative values', async () => {
  const value = {
    name: 'Solkraft',
    description: '',
    sections: [
      { id: 'service', name: 'Service' },
      { id: 'facts', name: 'Uppgifter' },
    ],
    fields: [
      { id: 'power', name: 'Effekt', description: '', kind: 'number', sectionId: 'facts' },
      { id: 'battery', name: 'Batteri', description: '', kind: 'boolean', sectionId: '' },
    ],
  };
  let review = await definition('solar-sections', value);
  expect(
    (await tool('read_type_catalog')).types.find(
      (type: { id: string }) => type.id === 'solar-sections',
    ),
  ).toMatchObject(value);
  review = await tool('propose_object', {
    ...version(review),
    id: 'panels',
    baseRevision: null,
    value: {
      typeId: 'solar-sections',
      name: 'Paneler',
      description: '',
      customValues: { power: 0, battery: false },
    },
  });
  await definition(
    'solar-sections',
    { ...value, fields: [{ ...value.fields[0], sectionId: 'missing' }] },
    'invalid_type_definition',
  );
  expect((await tool('read_my_draft')).version).toBe(review.version);
  const receipt = await save('sections');
  expect(receipt.objectTypes[0].after).toMatchObject(value);
  expect(receipt.changes[0].type).toMatchObject(value);
  await app.restart();
  expect(
    (await tool('read_type_catalog')).types.find(
      (type: { id: string }) => type.id === 'solar-sections',
    ),
  ).toMatchObject(value);
  expect((await tool('read_map')).objects[0].customValues).toEqual({ power: 0, battery: false });
});

test('MCP custom relationship types retain both labels, direction, duplicate reuse and whole definition review', async () => {
  const sections = [
    { id: 'facts', name: 'Uppgifter' },
    { id: 'service', name: 'Service' },
  ];
  const fields = ['text', 'number', 'date', 'boolean'].map((kind) => ({
    id: kind,
    name: kind,
    description: '',
    kind,
    sectionId: kind === 'boolean' ? '' : 'facts',
  }));
  const customValues = { text: 'Övre hyllan', number: 0, date: '2026-09-27', boolean: false };
  let review = await tool('read_my_draft');
  review = await tool('propose_relationship_type', {
    ...version(review),
    id: 'stored',
    baseRevision: null,
    value: {
      name: 'Förvaring',
      description: 'Var saken förvaras',
      forwardLabel: 'förvaras i',
      reverseLabel: 'innehåller',
      fields,
      sections,
    },
  });
  const catalog = await tool('read_type_catalog');
  for (const [id, name] of [
    ['bike', 'Alex blå cykel'],
    ['garage', 'Garaget'],
  ]) {
    review = await tool('propose_object', {
      ...version(review),
      id,
      baseRevision: null,
      value: { typeId: catalog.types[0].id, name, description: '' },
    });
  }
  const edge = {
    customValues,
    typeId: 'stored',
    sourceId: 'bike',
    targetId: 'garage',
    knowledge: 'known',
  };
  review = await tool('propose_relationship', {
    ...version(review),
    id: 'parking',
    baseRevision: null,
    value: edge,
  });
  const repeated = await tool('propose_relationship', {
    ...version(review),
    id: 'duplicate',
    baseRevision: null,
    value: edge,
  });
  expect(repeated.existingId).toBe('parking');
  expect(repeated.relationships).toHaveLength(1);
  review = await tool('propose_relationship', {
    ...version(repeated),
    id: 'other-kind',
    baseRevision: null,
    value: { ...edge, customValues: {}, typeId: catalog.relationshipTypes[0].id },
  });
  const { receipt } = await tool('save_draft', { ...version(review), operationId: 'custom-edges' });
  expect(receipt.relationshipTypes[0].after).toMatchObject({
    forwardLabel: 'förvaras i',
    reverseLabel: 'innehåller',
    sections,
    fields,
  });
  await app.restart();
  const state = await tool('read_map', { objectId: 'garage' });
  expect(state.relationships).toHaveLength(2);
  expect(state.relationships.find((item: { id: string }) => item.id === 'parking')).toMatchObject({
    sourceId: 'bike',
    targetId: 'garage',
    typeId: 'stored',
    customValues,
  });
  expect(
    state.relationshipTypes.find((item: { id: string }) => item.id === 'stored'),
  ).toMatchObject({ forwardLabel: 'förvaras i', reverseLabel: 'innehåller', sections, fields });
});

test('MCP catalogs and proposals keep canonical property layout separate from complete object facts', async () => {
  const sdk = new Client({ name: 'Gemensamma egenskaper', version: '1' });
  try {
    await sdk.connect(
      new StreamableHTTPClientTransport(new URL(`${app.origin}/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${token}` } },
      }),
    );
    const catalog = (await sdk.listTools()).tools;
    const objectSchema = JSON.stringify(
      catalog.find(({ name }) => name === 'propose_object_type')?.inputSchema,
    );
    expect(objectSchema).toContain('"builtins"');
    expect(objectSchema).toContain('"propertyOrder"');
    expect(
      JSON.stringify(catalog.find(({ name }) => name === 'propose_relationship_type')?.inputSchema),
    ).not.toContain('"builtins"');
    let review = await tool('read_my_draft');
    const value = {
      name: 'Avtalsuppgifter',
      description: '',
      fields: [],
      sections: [{ id: 'facts', name: 'Uppgifter' }],
      builtins: [{ key: 'debt', name: 'Återstående skuld', sectionId: 'facts' }],
      propertyOrder: ['builtin:debt'],
    };
    const { fields: _fields, ...stored } = value;
    for (const invalid of [
      { ...value, builtins: [{ key: 'name', name: 'Namn', sectionId: 'facts' }] },
      { ...value, builtins: [{ key: 'debt', name: 'Skuld', sectionId: 'facts', kind: 'number' }] },
    ]) {
      const result = await sdk.callTool({
        name: 'propose_object_type',
        arguments: { ...version(review), id: 'canonical', baseRevision: null, value: invalid },
      });
      expect(result.isError).toBe(true);
      expect(await tool('read_my_draft')).toEqual(review);
    }
    review = await definition('canonical', value);
    const types = await tool('read_type_catalog');
    expect(types.types.find((type: { id: string }) => type.id === 'canonical')).toMatchObject(
      stored,
    );
    const financialFacts = {
      debt: { knowledge: 'uncertain', value: '12 300', reportedOn: '2026-09-01' },
      price: { knowledge: 'unknown' },
      currency: { knowledge: 'none' },
    };
    review = await tool('propose_object', {
      ...version(review),
      id: 'loan',
      baseRevision: null,
      typeRevision: 1,
      value: { typeId: 'canonical', name: 'Lånet', description: 'Gemensam text', financialFacts },
    });
    const receipt = await save('canonical');
    expect(receipt.objectTypes[0].after).toMatchObject(stored);
    expect(receipt.changes[0]).toMatchObject({ type: stored, after: { financialFacts } });
    await app.restart();
    expect((await tool('read_map')).objects[0].financialFacts).toEqual(financialFacts);
    expect(
      (await tool('read_type_catalog')).types.find(
        (type: { id: string }) => type.id === 'canonical',
      ),
    ).toMatchObject(stored);
  } finally {
    await sdk.close();
  }
});
