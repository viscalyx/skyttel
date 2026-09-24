import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, beforeEach, expect, test } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import { createHousehold, signIn } from '../../support/client.js';
import { createInstallation, robin } from '../../support/installation.js';

let installation: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
let other: APIRequestContext;
let path: string;
const read = async (actor = client): Promise<MapState> => (await actor.get(path)).json();
const post = (route: string, data: unknown, actor = client) =>
  actor.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
const fields = [
  { id: 'text', name: 'Anteckning', description: '', kind: 'text' },
  { id: 'number', name: 'Effekt', description: '', kind: 'number' },
  { id: 'date', name: 'Datum', description: '', kind: 'date' },
  { id: 'boolean', name: 'Batteri', description: '', kind: 'boolean' },
];
const definition = { name: 'Solcellsanläggning', description: 'Elproduktion', fields };
const define = async (
  value: unknown = definition,
  baseRevision: number | null = null,
  actor = client,
) =>
  post(
    'object-type',
    { version: (await read(actor)).draft.version, id: 'solar', baseRevision, value },
    actor,
  );
const propose = async (
  customValues: unknown = undefined,
  actor = client,
  revision: number | null = null,
  extra = {},
) =>
  post(
    'draft',
    {
      version: (await read(actor)).draft.version,
      id: 'panels',
      baseRevision: revision,
      value: { typeId: 'solar', name: 'Paneler', description: '', customValues },
      ...extra,
    },
    actor,
  );
const save = async (operationId: string, actor = client) =>
  post('save', { version: (await read(actor)).draft.version, operationId }, actor);

beforeEach(async () => {
  installation = await createInstallation();
  client = await request.newContext();
  other = await request.newContext();
  await signIn(client, installation.origin);
  const { household } = await (await createHousehold(client, installation.origin)).json();
  path = `${installation.origin}/api/households/${household.id}/map`;
  installation.setIdentity(robin);
  await signIn(other, installation.origin);
  const { user } = await (await other.get(`${installation.origin}/api/bootstrap`)).json();
  const { code } = await (
    await client.post(`${path.replace('/map', '')}/invitations`, {
      headers: { origin: installation.origin },
      data: { userId: user.id },
    })
  ).json();
  await other.post(`${installation.origin}/api/invitations/accept`, {
    headers: { origin: installation.origin },
    data: { code },
  });
});
afterEach(async () => {
  await client.dispose();
  await other.dispose();
  await installation.close();
});

test('invalid type definitions and malformed values do not change the private draft', async () => {
  const unchanged = await read();
  for (const value of [
    null,
    [],
    { ...definition, name: null },
    { ...definition, name: ' ' },
    { ...definition, name: 'x'.repeat(201) },
    { ...definition, description: null },
    { ...definition, description: 'x'.repeat(2001) },
    { ...definition, fields: null },
    {
      ...definition,
      fields: Array.from({ length: 101 }, (_, i) => ({ ...fields[0], id: String(i) })),
    },
    ...[
      null,
      {},
      { ...fields[0], id: '' },
      { ...fields[0], id: 'a'.repeat(129) },
      { ...fields[0], name: null },
      { ...fields[0], name: ' ' },
      { ...fields[0], name: 'x'.repeat(201) },
      { ...fields[0], description: null },
      { ...fields[0], description: 'x'.repeat(2001) },
      { ...fields[0], kind: 'money' },
      { ...fields[0], id: '__proto__' },
      { ...fields[0], id: 'constructor' },
    ].map((field) => ({ ...definition, fields: [field] })),
    { ...definition, fields: [fields[0], fields[0]] },
  ]) {
    const response = await define(value);
    expect(response.status(), JSON.stringify(value)).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_type_definition' });
    expect(await read()).toEqual(unchanged);
  }
  for (const id of [null, 'bad id'])
    expect(
      (
        await post('object-type', { version: 0, id, baseRevision: null, value: definition })
      ).status(),
    ).toBe(400);
  expect((await define()).status()).toBe(200);
  expect((await propose({})).status()).toBe(200);
  const draft = await read();
  for (const values of [
    null,
    [],
    'bad',
    { missing: 1 },
    { text: true },
    { text: 'x'.repeat(2001) },
    { number: '1' },
    { boolean: 0 },
    { date: true },
    { date: '2026-02-30' },
    { date: '2026-99-01' },
    { date: '2026-1-1' },
  ]) {
    const response = await propose(values);
    expect(response.status(), JSON.stringify(values)).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_custom_value' });
    expect(await read()).toEqual(draft);
  }
  expect(
    (
      await propose({ text: '', number: -1.25, date: '2024-02-29', boolean: false }, client, null, {
        typeRevision: 99,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await propose({ text: '', number: -1.25, date: '2024-02-29', boolean: false }, client, null, {
        typeRevision: 1,
      })
    ).status(),
  ).toBe(200);
  expect((await save('all-values')).status()).toBe(200);
  expect((await read()).objects[0].customValues).toEqual({
    text: '',
    number: -1.25,
    date: '2024-02-29',
    boolean: false,
  });
});

test('used kinds stay fixed across saved and private values and are rechecked at save', async () => {
  expect((await define()).status()).toBe(200);
  expect((await save('define')).status()).toBe(200);
  const changeKind = {
    ...definition,
    fields: fields.map((field) => (field.id === 'number' ? { ...field, kind: 'text' } : field)),
  };
  expect((await define(changeKind, 1)).status()).toBe(200);
  expect((await propose({ number: 12 }, other)).status()).toBe(200);
  const rejected = await save('late-use');
  expect(rejected.status()).toBe(409);
  expect(await rejected.json()).toEqual({ error: 'field_kind_in_use' });
  expect((await read()).types.find((type) => type.id === 'solar')?.revision).toBe(1);
  expect((await read()).objects).toEqual([]);
  expect((await define(changeKind, 1)).status()).toBe(409);
  expect((await save('other-object', other)).status()).toBe(200);
  expect((await define(changeKind, 1)).status()).toBe(409);
  expect((await define({ ...definition, fields: [] }, 1)).status()).toBe(400);
  const corrected = {
    ...definition,
    name: 'Solkraft',
    fields: fields.map((field) => ({
      ...field,
      name: `${field.name} rättad`,
      description: 'Förklaring',
    })),
  };
  expect((await define(corrected, 1)).status()).toBe(200);
  expect((await save('rename')).status()).toBe(200);
  expect((await read()).objects[0].customValues).toEqual({ number: 12 });
  const unusedKind = {
    ...corrected,
    fields: corrected.fields.map((field) =>
      field.id === 'text' ? { ...field, kind: 'boolean' } : field,
    ),
  };
  expect((await define(unusedKind, 2)).status()).toBe(200);
  expect((await save('unused-kind')).status()).toBe(200);
  expect((await read()).types.find((type) => type.id === 'solar')?.fields?.[0].kind).toBe(
    'boolean',
  );
});

test('definition conflict choices preserve atomic history and update dependent object snapshots', async () => {
  expect((await define()).status()).toBe(200);
  expect((await propose({ boolean: false })).status()).toBe(200);
  expect(
    (await define({ ...definition, description: 'Rättad före första sparandet' })).status(),
  ).toBe(200);
  expect((await save('initial')).status()).toBe(200);
  expect((await define({ ...definition, name: 'Eget namn' }, 1)).status()).toBe(200);
  expect((await propose({ boolean: true }, client, 1)).status()).toBe(200);
  expect((await define({ ...definition, name: 'Annans namn' }, 1, other)).status()).toBe(200);
  expect((await save('other-definition', other)).status()).toBe(200);
  expect((await save('stale')).status()).toBe(409);
  const state = await read();
  const current = state.types.find((type) => type.id === 'solar');
  const conflict = { kind: 'objectType', id: 'solar', current };
  expect(
    (await post('resolve', { version: state.draft.version, choice: 'saved', conflict })).status(),
  ).toBe(200);
  expect((await read()).draft.objectTypes).toBeUndefined();
  expect((await read()).draft.changes[0].type.name).toBe('Annans namn');
  expect((await save('chosen')).status()).toBe(200);
  expect((await read()).objects[0].customValues).toEqual({ boolean: true });
  expect((await define({ ...definition, name: 'Mitt namn igen' }, 2)).status()).toBe(200);
  expect((await define({ ...definition, name: 'Annans andra namn' }, 2, other)).status()).toBe(200);
  expect((await save('other-again', other)).status()).toBe(200);
  const latest = await read();
  expect(
    (
      await post('resolve', {
        version: latest.draft.version,
        choice: 'proposed',
        conflict: { ...conflict, current: latest.types.find((type) => type.id === 'solar') },
      })
    ).status(),
  ).toBe(200);
  expect((await save('rebased')).status()).toBe(200);
  expect((await read()).types.find((type) => type.id === 'solar')?.revision).toBe(4);
  const { history } = await (await client.get(`${path}/history`)).json();
  expect(history.at(-1).objectTypes[0].before.name).toBe('Annans andra namn');
  expect(history.at(-1).objectTypes[0].after.name).toBe('Mitt namn igen');
});

test('overlapping object corrections retain independently changed custom values', async () => {
  await define();
  await propose({ text: 'Först', number: 12, boolean: false });
  await save('initial');
  await propose({ text: 'Mitt', number: 12 }, client, 1);
  await propose({ text: 'Först', number: 14, date: '2026-09-01', boolean: false }, other, 1);
  await save('other', other);
  const state = await read();
  expect(
    (
      await post('resolve', {
        version: state.draft.version,
        choice: 'proposed',
        conflict: { kind: 'object', id: 'panels', current: state.objects[0] },
      })
    ).status(),
  ).toBe(200);
  expect((await read()).draft.changes[0].after?.customValues).toEqual({
    text: 'Mitt',
    number: 14,
    date: '2026-09-01',
  });
  expect((await save('resolved')).status()).toBe(200);
});

test('definition writes roll back when a later object conflict rejects the same whole save', async () => {
  await define();
  await propose({ text: 'Först' });
  await save('initial');
  await define({ ...definition, name: 'Föreslaget namn' }, 1);
  await propose({ text: 'Mitt värde' }, client, 1);
  await propose({ text: 'Sparat av annan' }, other, 1);
  await save('other', other);
  const before = await read();
  const response = await save('rollback');
  expect(response.status()).toBe(409);
  expect(await response.json()).toEqual({ error: 'object_conflict' });
  expect(await read()).toEqual(before);
  expect((await read()).types.find((type) => type.id === 'solar')?.name).toBe('Solcellsanläggning');
  expect((await (await client.get(`${path}/history`)).json()).history).toHaveLength(2);
});
