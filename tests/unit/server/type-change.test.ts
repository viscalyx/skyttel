import { afterEach, beforeEach, expect, test } from 'vitest';
import { draftConflicts } from '../../../src/shared/draft-conflicts.js';
import type { MapState, ObjectValue, SaveReceipt } from '../../../src/shared/map.js';
import { applicationFixture } from './fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
let client: ReturnType<typeof fixture.client>;
let path: string;
const read = async (actor = client): Promise<MapState> => (await actor.request(path)).json();
const post = (route: string, body: unknown, actor = client) => actor.json(`${path}/${route}`, body);
async function object(update: Partial<ObjectValue>, actor = client, id = 'bike') {
  const state = await read(actor);
  const before = state.objects.find((item) => item.id === id);
  return post(
    'draft',
    {
      version: state.draft.version,
      id,
      baseRevision: before?.revision ?? null,
      value: { typeId: 'cycle', name: 'Alex blå cykel', description: '', ...before, ...update },
    },
    actor,
  );
}
async function save(operationId: string, actor = client): Promise<SaveReceipt> {
  const response = await post(
    'save',
    { version: (await read(actor)).draft.version, operationId },
    actor,
  );
  const body = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(200);
  return body.receipt;
}
async function member() {
  fixture.setSubject('second-person');
  const actor = fixture.client();
  await actor.signIn();
  const { user } = await (await actor.request('/api/bootstrap')).json();
  const { code } = await (
    await client.json(`${path.replace('/map', '')}/invitations`, { userId: user.id })
  ).json();
  await actor.json('/api/invitations/accept', { code });
  return { actor, userId: user.id };
}
beforeEach(async () => {
  fixture = await applicationFixture();
  client = fixture.client();
  await client.signIn();
  const { household } = await (await client.json('/api/households', { name: 'Linden' })).json();
  path = `/api/households/${household.id}/map`;
  for (const [id, name] of [
    ['cycle', 'Cykel'],
    ['vehicle', 'Fordon'],
  ]) {
    expect(
      (
        await post('object-type', {
          version: (await read()).draft.version,
          id,
          baseRevision: null,
          value: {
            name,
            description: '',
            fields: [
              { id: 'number', name: 'Nummer', description: '', kind: 'number' },
              { id: 'other', name: 'Annat nummer', description: '', kind: 'number' },
              { id: 'insured', name: 'Försäkrad', description: '', kind: 'boolean' },
            ],
          },
        })
      ).status,
    ).toBe(200);
  }
  expect((await object({ customValues: { number: 5, insured: false } })).status).toBe(200);
  expect((await object({ name: 'Garaget', customValues: {} }, client, 'garage')).status).toBe(200);
  const state = await read();
  expect(
    (
      await post('relationship', {
        version: state.draft.version,
        id: 'parking',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes[0].id,
          sourceId: 'bike',
          targetId: 'garage',
          knowledge: 'known',
        },
      })
    ).status,
  ).toBe(200);
  await save('setup');
});
afterEach(() => fixture.close());

test('resolving a type change keeps target values separate from same-ID source fields and preserves independent edits', async () => {
  const { actor } = await member();
  const edges = (await read()).relationships;
  expect((await object({ typeId: 'vehicle', customValues: { number: 5 } })).status).toBe(200);
  expect(
    (await object({ name: 'Rättat namn', customValues: { number: 7, insured: false } }, actor))
      .status,
  ).toBe(200);
  await save('later-name-and-old-field', actor);
  const before = await read();
  expect(
    (await post('save', { version: before.draft.version, operationId: 'blocked' })).status,
  ).toBe(409);
  expect(await read()).toEqual(before);
  expect(
    (
      await post('resolve', {
        version: before.draft.version,
        conflict: draftConflicts(before)[0],
        choice: 'proposed',
      })
    ).status,
  ).toBe(200);
  const resolved = await read();
  expect(resolved.draft.changes[0].after).toMatchObject({
    typeId: 'vehicle',
    name: 'Rättat namn',
    customValues: { number: 5 },
  });
  expect(resolved.draft.changes[0].after?.customValues).not.toHaveProperty('insured');
  expect(
    (await post('save', { version: before.draft.version, operationId: 'stale-approval' })).status,
  ).toBe(409);
  await save('type-change');
  expect((await read()).relationships).toEqual(edges);
});

test('the durable type-change review retains the source definition when its catalog names change', async () => {
  await object({ typeId: 'vehicle', customValues: {} });
  const { actor } = await member();
  const source = (await read(actor)).types.find((type) => type.id === 'cycle');
  expect(
    (
      await post(
        'object-type',
        {
          version: 0,
          id: 'cycle',
          baseRevision: source?.revision,
          value: {
            ...source,
            name: 'Ny benämning',
            fields: source?.fields?.map((field) => ({ ...field, name: `Nytt ${field.name}` })),
          },
        },
        actor,
      )
    ).status,
  ).toBe(200);
  await save('rename-source', actor);
  const state = await read();
  expect(state.draft.changes[0].beforeType).toMatchObject({
    name: 'Cykel',
    fields: expect.arrayContaining([expect.objectContaining({ id: 'number', name: 'Nummer' })]),
  });
  expect((await object({ typeId: 'vehicle', customValues: { insured: false } })).status).toBe(200);
  expect((await read()).draft.changes[0].beforeType).toEqual(state.draft.changes[0].beforeType);
});

test('a name-only proposal follows the concurrently selected type but a field correction requires its own type', async () => {
  const { actor } = await member();
  await object({ name: 'Mitt namn' });
  await object({ typeId: 'vehicle', customValues: { other: 42 } }, actor);
  await save('other-type', actor);
  let state = await read();
  expect(
    (
      await post('resolve', {
        version: state.draft.version,
        conflict: draftConflicts(state)[0],
        choice: 'proposed',
      })
    ).status,
  ).toBe(200);
  expect((await read()).draft.changes[0].after).toMatchObject({
    name: 'Mitt namn',
    typeId: 'vehicle',
    customValues: { other: 42 },
  });
  await save('name-only');
  await object({ customValues: { other: 51 } });
  await object({ typeId: 'cycle', customValues: {} }, actor);
  await save('back-to-cycle', actor);
  state = await read();
  expect(
    (
      await post('resolve', {
        version: state.draft.version,
        conflict: draftConflicts(state)[0],
        choice: 'proposed',
      })
    ).status,
  ).toBe(200);
  expect((await read()).draft.changes[0].after).toMatchObject({
    typeId: 'vehicle',
    customValues: { other: 51 },
  });
});

test('invalid values and stale object, definition and draft versions leave the entire type-change draft intact', async () => {
  await object({ name: 'Oberoende förslag' }, client, 'garage');
  let before = await read();
  expect(
    (await object({ typeId: 'vehicle', customValues: { number: 'inte ett tal' } })).status,
  ).toBe(400);
  expect(await read()).toEqual(before);
  const value = {
    ...before.objects.find((item) => item.id === 'bike'),
    typeId: 'vehicle',
    customValues: { insured: false },
  };
  const proposal = {
    version: before.draft.version,
    id: 'bike',
    baseRevision: 1,
    typeRevision: 1,
    value,
  };
  for (const change of [{ baseRevision: 0 }, { typeRevision: 0 }, { version: 0 }]) {
    expect((await post('draft', { ...proposal, ...change })).status).toBe(409);
    expect(await read()).toEqual(before);
  }
  expect((await post('draft', proposal)).status).toBe(200);
  const { actor } = await member();
  const type = (await read(actor)).types.find((item) => item.id === 'vehicle');
  expect(
    (
      await post(
        'object-type',
        {
          version: 0,
          id: 'vehicle',
          baseRevision: 1,
          value: { ...type, description: 'Ny beskrivning' },
        },
        actor,
      )
    ).status,
  ).toBe(200);
  await save('changed-definition', actor);
  before = await read();
  expect(
    (await post('save', { version: before.draft.version, operationId: 'stale-type' })).status,
  ).toBe(409);
  expect(await read()).toEqual(before);
  expect(before.objects.find((item) => item.id === 'bike')?.typeId).toBe('cycle');
  expect(before.objects.find((item) => item.id === 'garage')?.name).toBe('Garaget');
});

test('type proposal, conflict resolution reject anonymous, foreign and revoked members without changing content', async () => {
  await object({ typeId: 'vehicle', customValues: {} });
  await save('change-type');
  const { actor, userId } = await member();
  await object({ typeId: 'cycle', customValues: { insured: false } }, actor);
  await object({ name: 'Nytt namn' });
  await save('name');
  const memberState = await read(actor);
  const conflict = draftConflicts(memberState)[0];
  const mutations = [
    [
      'draft',
      {
        version: memberState.draft.version,
        id: 'bike',
        baseRevision: 2,
        value: { typeId: 'cycle', name: 'Otillåtet', description: '' },
      },
    ],
    ['resolve', { version: memberState.draft.version, conflict, choice: 'proposed' }],
  ] as const;
  const anonymous = fixture.client();
  fixture.setSubject('outsider');
  const outsider = fixture.client();
  await outsider.signIn();
  await client.json(`${path.replace('/map', '')}/members/${userId}/revoke`, {});
  const before = await read();
  for (const [denied, status] of [
    [anonymous, 401],
    [outsider, 403],
    [actor, 403],
  ] as const)
    for (const [route, body] of mutations)
      expect((await post(route, body, denied)).status).toBe(status);
  expect(await read()).toEqual(before);
});
