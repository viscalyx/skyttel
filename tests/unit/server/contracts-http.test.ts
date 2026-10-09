import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, beforeEach, expect, test } from 'vitest';
import type { MapState, SaveReceipt } from '../../../src/shared/map.js';
import { createHousehold, restartWithSession, signIn } from '../../support/client.js';
import { createInstallation, robin } from '../../support/installation.js';

let installation: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
let path: string;
let contract: { typeId: string; name: string; description: string };
const read = async (context = client): Promise<MapState> => (await context.get(path)).json();
const post = (route: string, data: unknown, context = client) =>
  context.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
const propose = async (financialFacts: unknown) =>
  post('draft', {
    version: (await read()).draft.version,
    id: 'credit',
    baseRevision: null,
    value: { ...contract, financialFacts },
  });

beforeEach(async () => {
  installation = await createInstallation();
  client = await request.newContext();
  await signIn(client, installation.origin);
  const { household } = await (await createHousehold(client, installation.origin)).json();
  path = `${installation.origin}/api/households/${household.id}/map`;
  const type = (await read()).types.find((item) => item.name === 'Kreditavtal');
  expect(type).toBeDefined();
  contract = { typeId: type?.id ?? '', name: 'Exempelkredit', description: '' };
});
afterEach(async () => {
  await client.dispose();
  await installation.close();
});

test('financial requests accept descriptive values, valid leap days and explicit uncertainty', async () => {
  const financialFacts = {
    price: { knowledge: 'known', value: '1 250,50' },
    currency: { knowledge: 'known', value: 'SEK' },
    paymentInterval: { knowledge: 'known', value: 'Varje månad' },
    startDate: { knowledge: 'known', value: '2024-02-29' },
    endDate: { knowledge: 'known', value: '2028-02-29' },
    terms: { knowledge: 'known', value: 'Tre månaders uppsägningstid.' },
    debt: { knowledge: 'uncertain', value: '12 500', reportedOn: '2026-09-01' },
    creditLimit: { knowledge: 'unknown', reportedOn: '2026-09-02' },
    usedCredit: { knowledge: 'none', reportedOn: '2026-09-03' },
  };
  expect((await propose(financialFacts)).status()).toBe(200);
  const saved = await post('save', {
    version: (await read()).draft.version,
    operationId: 'initial',
  });
  expect(saved.status()).toBe(200);
  expect((await read()).objects[0].financialFacts).toEqual(financialFacts);
});

test('invalid financial requests preserve the complete draft and optional facts stay absent', async () => {
  expect((await propose({})).status()).toBe(200);
  const before = await read();
  for (const financialFacts of [
    null,
    [],
    'unknown',
    12,
    { interest: { knowledge: 'known', value: '3%' } },
    { debt: null },
    { debt: [] },
    { debt: 12 },
    { debt: { knowledge: 'guessed', value: '12' } },
    { debt: { knowledge: 'known', value: '' } },
    { debt: { knowledge: 'known', value: ' ' } },
    { debt: { knowledge: 'known', value: 12 } },
    { debt: { knowledge: 'known', value: '1'.repeat(201) } },
    { terms: { knowledge: 'known', value: 'x'.repeat(2001) } },
    { debt: { knowledge: 'unknown', value: '12' } },
    { debt: { knowledge: 'none', extra: 'unsupported' } },
    { price: { knowledge: 'known', value: '12', reportedOn: '2026-09-20' } },
    { debt: { knowledge: 'unknown', reportedOn: 2026 } },
    { debt: { knowledge: 'unknown', reportedOn: '2026-09-32' } },
    { startDate: { knowledge: 'known', value: '20/09/2026' } },
    { endDate: { knowledge: 'uncertain', value: '2026-02-29' } },
  ]) {
    const rejected = await propose(financialFacts);
    expect(rejected.status(), JSON.stringify(financialFacts)).toBe(400);
    expect(await rejected.json()).toEqual({ error: 'invalid_request' });
    expect(await read()).toEqual(before);
  }
  expect(
    (await post('save', { version: before.draft.version, operationId: 'empty' })).status(),
  ).toBe(200);
  expect((await read()).objects[0]).not.toHaveProperty('financialFacts');
});

test('HTTP: dated debt and credit facts survive draft recovery, correction and history', async () => {
  const initial = await read();
  const financialFacts = {
    debt: { knowledge: 'uncertain', value: '125 000,50', reportedOn: '2026-09-01' },
    creditLimit: { knowledge: 'known', value: '80 000', reportedOn: '2026-08-01' },
    usedCredit: { knowledge: 'known', value: '12 500', reportedOn: '2026-09-02' },
    currency: { knowledge: 'known', value: 'SEK' },
    price: { knowledge: 'unknown' },
    terms: { knowledge: 'none' },
  };
  const value = {
    typeId: initial.types.find((type) => type.name === 'Kreditavtal')?.id,
    name: 'Exempelkredit',
    description: '',
    financialFacts,
  };
  expect(
    (
      await post('draft', {
        version: initial.draft.version,
        id: 'credit',
        baseRevision: null,
        value,
      })
    ).status(),
  ).toBe(200);
  const proposed = await read();
  expect(proposed.objects).toEqual([]);
  expect(proposed.draft.changes[0].after).toEqual(value);
  client = await restartWithSession(client, () => installation.restart());
  expect((await read()).draft).toEqual(proposed.draft);
  const response = await post('save', { version: proposed.draft.version, operationId: 'credit' });
  expect(response.status()).toBe(200);
  const { receipt } = await response.json();
  expect(receipt.userId).toBe(initial.userId);
  expect(Number.isNaN(Date.parse(receipt.savedAt))).toBe(false);
  expect(receipt.changes[0].after).toMatchObject(value);
  const saved = await read();
  expect(saved.objects[0]).toEqual(receipt.changes[0].after);
  const corrected = {
    ...value,
    financialFacts: {
      ...financialFacts,
      usedCredit: { knowledge: 'known', value: '0', reportedOn: '2026-09-20' },
    },
  };
  expect(
    (
      await post('draft', {
        version: saved.draft.version,
        id: 'credit',
        baseRevision: 1,
        value: corrected,
      })
    ).status(),
  ).toBe(200);
  const correction = await read();
  expect(correction.draft.changes[0].before).toEqual(saved.objects[0]);
  expect(
    (
      await post('save', { version: correction.draft.version, operationId: 'correct-credit' })
    ).status(),
  ).toBe(200);
  client = await restartWithSession(client, () => installation.restart());
  expect((await read()).objects[0]).toMatchObject({ ...corrected, id: 'credit', revision: 2 });
  const { history }: { history: SaveReceipt[] } = await (
    await client.get(`${path}/history`)
  ).json();
  expect(history).toHaveLength(2);
  expect(history[1]).toEqual(receipt);
  expect(history[0]).toMatchObject({
    userId: initial.userId,
    changes: [{ before: saved.objects[0], after: corrected }],
  });
});

test('HTTP: resolving financial conflicts preserves independent facts and requires a whole new save', async () => {
  const other = await request.newContext();
  try {
    installation.setIdentity(robin);
    await signIn(other, installation.origin);
    const { user } = await (await other.get(`${installation.origin}/api/bootstrap`)).json();
    const { code } = await (
      await client.post(`${path.replace('/map', '')}/invitations`, {
        headers: { origin: installation.origin },
        data: { userId: user.id },
      })
    ).json();
    expect(
      (
        await other.post(`${installation.origin}/api/invitations/accept`, {
          headers: { origin: installation.origin },
          data: { code },
        })
      ).status(),
    ).toBe(200);
    const state = await read();
    const value = {
      typeId: state.types.find((type) => type.name === 'Låneavtal')?.id,
      name: 'Exempellån',
      description: '',
      financialFacts: {
        debt: { knowledge: 'uncertain', value: '150000', reportedOn: '2026-08-01' },
        creditLimit: { knowledge: 'known', value: '200000' },
        terms: { knowledge: 'known', value: 'Preliminära villkor' },
      },
    };
    expect(
      (await post('draft', { version: 0, id: 'loan', baseRevision: null, value })).status(),
    ).toBe(200);
    expect((await post('save', { version: 1, operationId: 'initial' })).status()).toBe(200);
    const proposedFacts = {
      debt: { knowledge: 'known', value: '140000', reportedOn: '2026-09-01' },
      creditLimit: value.financialFacts.creditLimit,
    };
    expect(
      (
        await post('draft', {
          version: (await read()).draft.version,
          id: 'loan',
          baseRevision: 1,
          value: { ...value, financialFacts: proposedFacts },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await post('draft', {
          version: (await read()).draft.version,
          id: 'unrelated',
          baseRevision: null,
          value: { typeId: state.types[0].id, name: 'Lo', description: '' },
        })
      ).status(),
    ).toBe(200);
    expect((await read(other)).draft.changes).toEqual([]);
    const otherFacts = {
      ...value.financialFacts,
      creditLimit: { knowledge: 'known', value: '250000' },
      currency: { knowledge: 'known', value: 'SEK' },
    };
    expect(
      (
        await post(
          'draft',
          {
            version: 0,
            id: 'loan',
            baseRevision: 1,
            value: { ...value, financialFacts: otherFacts },
          },
          other,
        )
      ).status(),
    ).toBe(200);
    expect((await post('save', { version: 1, operationId: 'other' }, other)).status()).toBe(200);
    const before = await read();
    expect(
      (await post('save', { version: before.draft.version, operationId: 'conflict' })).status(),
    ).toBe(409);
    expect((await read()).objects).toEqual(before.objects);
    expect((await read()).objects).toHaveLength(1);
    expect((await read()).draft).toEqual(before.draft);
    expect(
      (
        await post('resolve', {
          version: before.draft.version,
          choice: 'proposed',
          conflict: { kind: 'object', id: 'loan', current: before.objects[0] },
        })
      ).status(),
    ).toBe(200);
    const resolved = await read();
    const expectedFacts = {
      debt: proposedFacts.debt,
      creditLimit: otherFacts.creditLimit,
      currency: otherFacts.currency,
    };
    expect(resolved.draft.changes.find((change) => change.id === 'loan')?.after).toMatchObject({
      financialFacts: expectedFacts,
    });
    expect(
      resolved.draft.changes.find((change) => change.id === 'loan')?.after?.financialFacts,
    ).not.toHaveProperty('terms');
    expect(resolved.objects).toEqual(before.objects);
    expect(
      (await post('save', { version: resolved.draft.version, operationId: 'resolved' })).status(),
    ).toBe(200);
    client = await restartWithSession(client, () => installation.restart());
    const saved = await read();
    expect(saved.objects).toHaveLength(2);
    expect(saved.objects.find((object) => object.id === 'loan')?.financialFacts).toEqual(
      expectedFacts,
    );
    const { history }: { history: SaveReceipt[] } = await (
      await client.get(`${path}/history`)
    ).json();
    expect(history).toHaveLength(3);
    expect(history[1].userId).toBe(user.id);
    expect(history[0].userId).toBe(state.userId);
    expect(history[2]).toMatchObject({ userId: state.userId, operationId: 'initial' });
    expect(
      history[0].changes.find((change) => change.after?.id === 'loan')?.before?.financialFacts,
    ).toEqual(otherFacts);
  } finally {
    await other.dispose();
  }
});

test('HTTP: invalid financial facts preserve the entire current draft and saved map', async () => {
  const initial = await read();
  const value = { typeId: initial.types[0].id, name: 'Ofullständigt åtagande', description: '' };
  expect(
    (await post('draft', { version: 0, id: 'partial', baseRevision: null, value })).status(),
  ).toBe(200);
  const unchanged = await read();
  const response = await post('draft', {
    version: unchanged.draft.version,
    id: 'invalid',
    baseRevision: null,
    value: {
      ...value,
      financialFacts: { debt: { knowledge: 'known', value: '100', reportedOn: '2026-02-30' } },
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'invalid_request' });
  expect(await read()).toEqual(unchanged);
  expect((await (await client.get(`${path}/history`)).json()).history).toEqual([]);
  expect(
    (await post('save', { version: unchanged.draft.version, operationId: 'partial' })).status(),
  ).toBe(200);
  expect((await read()).objects[0]).toMatchObject(value);
  expect((await read()).objects[0]).not.toHaveProperty('financialFacts');
});
