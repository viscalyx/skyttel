import { afterEach, beforeEach, expect, test } from 'vitest';
import type { MapState, ObjectValue, SaveReceipt } from '../../../src/shared/map.js';
import { applicationFixture } from './fixture.js';

let fixture: Awaited<ReturnType<typeof applicationFixture>>;
let client: ReturnType<typeof fixture.client>;
let path: string;
const read = async (actor = client): Promise<MapState> => (await actor.request(path)).json();
const post = (route: string, body: unknown, actor = client) => actor.json(`${path}/${route}`, body);
async function object(id: string, update: Partial<ObjectValue> | null, actor = client) {
  const state = await read(actor);
  const before = state.objects.find((item) => item.id === id);
  const response = await post(
    'draft',
    {
      version: state.draft.version,
      id,
      baseRevision: before?.revision ?? null,
      value:
        update === null
          ? null
          : { name: id, description: '', typeId: state.types[0].id, ...before, ...update },
    },
    actor,
  );
  expect(response.status).toBe(200);
}
async function save(operationId: string, actor = client): Promise<SaveReceipt> {
  const response = await post(
    'save',
    { version: (await read(actor)).draft.version, operationId },
    actor,
  );
  const result = await response.json();
  expect(response.status, JSON.stringify(result)).toBe(200);
  return result.receipt;
}

async function edge(id: string, sourceId: string, targetId: string) {
  const state = await read();
  expect(
    (
      await post('relationship', {
        version: state.draft.version,
        id,
        baseRevision: null,
        value: {
          sourceId,
          targetId,
          typeId: state.relationshipTypes[0].id,
          knowledge: 'known',
          lifecycle: 'ended',
        },
      })
    ).status,
  ).toBe(200);
}
async function member(subject = 'second-person') {
  fixture.setSubject(subject);
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
});

test('the whole save includes definitions and their dependent content with historical snapshots', async () => {
  expect(
    (
      await post('object-type', {
        version: 0,
        id: 'own-type',
        baseRevision: null,
        value: {
          name: 'Växt',
          description: '',
          fields: [{ id: 'color', name: 'Färg', description: '', kind: 'text' }],
        },
      })
    ).status,
  ).toBe(200);
  await object('plant', { typeId: 'own-type', name: 'Växten', customValues: { color: 'grön' } });
  expect(
    (
      await post('relationship-type', {
        version: (await read()).draft.version,
        id: 'own-edge-type',
        baseRevision: null,
        value: {
          name: 'Stödjer',
          description: '',
          forwardLabel: 'stödjer',
          reverseLabel: 'stöds av',
        },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post('relationship', {
        version: (await read()).draft.version,
        id: 'self',
        baseRevision: null,
        value: {
          sourceId: 'plant',
          targetId: 'plant',
          typeId: 'own-edge-type',
          knowledge: 'known',
        },
      })
    ).status,
  ).toBe(200);
  const selected = await save('definitions-and-content');
  const state = await read();
  expect(state.draft).toMatchObject({
    changes: [],
  });
  expect(state.draft.relationships ?? []).toEqual([]);
  expect(state.draft.objectTypes ?? []).toEqual([]);
  expect(state.draft.relationshipTypes ?? []).toEqual([]);
  expect(state.objects).toMatchObject([
    { id: 'plant', typeId: 'own-type', customValues: { color: 'grön' } },
  ]);
  expect(state.relationships).toMatchObject([
    { id: 'self', sourceId: 'plant', targetId: 'plant', typeId: 'own-edge-type' },
  ]);
  expect(selected.changes[0]).toMatchObject({
    before: null,
    after: state.objects[0],
    type: { name: 'Växt', fields: [{ id: 'color', name: 'Färg' }] },
  });
  expect(selected.relationships?.[0]).toMatchObject({
    before: null,
    after: state.relationships[0],
    type: { name: 'Stödjer' },
    objectNames: { plant: 'Växten' },
  });
  expect(selected.objectTypes?.[0].after).toMatchObject({ id: 'own-type', name: 'Växt' });
  expect(selected.relationshipTypes?.[0].after).toMatchObject({
    id: 'own-edge-type',
    name: 'Stödjer',
  });
  expect((await (await client.request(`${path}/history`)).json()).history).toEqual([selected]);
});

test('history requires current household access and does not expose private proposals', async () => {
  await object('person', { name: 'Lo' });
  const selected = await save('initial');
  const { actor, userId } = await member();
  await object('private', { name: 'Hemligt eget förslag' });
  const history = await actor.request(`${path}/history`);
  expect(history.status).toBe(200);
  expect(await history.text()).not.toContain('Hemligt eget förslag');
  expect(selected.actorName).toBe('Alex Exempel');
  const stranger = fixture.client();
  expect((await stranger.request(`${path}/history`)).status).toBe(401);

  fixture.setSubject('outsider');
  await stranger.signIn();
  expect((await stranger.request(`${path}/history`)).status).toBe(403);

  expect(
    (await client.json(`${path.replace('/map', '')}/members/${userId}/revoke`, {})).status,
  ).toBe(200);
  expect((await actor.request(`${path}/history`)).status).toBe(403);
});

test('per-proposal discard requires current household access and preserves every private draft when denied', async () => {
  await object('person', { name: 'Lo Exempel' });
  await save('initial');
  const { actor, userId } = await member();
  await object('person', { name: 'Administratörens privata förslag' });
  await object('person', { name: 'Medlemmens privata förslag' }, actor);
  const ownerBefore = await read();
  const memberBefore = await read(actor);
  const historyBefore = await (await client.request(`${path}/history`)).json();
  const body = { version: memberBefore.draft.version, kind: 'object', id: 'person' };
  const anonymous = fixture.client();
  expect((await post('discard-change', body, anonymous)).status).toBe(401);

  fixture.setSubject('another-household-member');
  const outsider = fixture.client();
  await outsider.signIn();
  const { user } = await (await outsider.request('/api/bootstrap')).json();
  // Arrange a separate household, then create its private proposal through HTTP.
  fixture.database
    .prepare('INSERT INTO household (id, name, createdAt) VALUES (?, ?, ?)')
    .run('other-household', 'Annat hushåll', '2026-01-01');
  fixture.database
    .prepare('INSERT INTO membership (householdId, userId, role) VALUES (?, ?, ?)')
    .run('other-household', user.id, 'member');
  const otherPath = '/api/households/other-household/map';
  const other = (await (await outsider.request(otherPath)).json()) as MapState;
  expect(
    (
      await outsider.json(`${otherPath}/draft`, {
        version: other.draft.version,
        id: 'other-person',
        baseRevision: null,
        value: { name: 'Robin Exempel', description: '', typeId: other.types[0].id },
      })
    ).status,
  ).toBe(200);
  const otherBefore = await (await outsider.request(otherPath)).json();
  const otherHistoryBefore = await (await outsider.request(`${otherPath}/history`)).json();
  expect((await post('discard-change', body, outsider)).status).toBe(403);

  expect(
    (await client.json(`${path.replace('/map', '')}/members/${userId}/revoke`, {})).status,
  ).toBe(200);
  expect((await post('discard-change', body, actor)).status).toBe(403);
  expect(await read()).toEqual(ownerBefore);
  expect(await (await client.request(`${path}/history`)).json()).toEqual(historyBefore);
  expect(await (await outsider.request(otherPath)).json()).toEqual(otherBefore);
  expect(await (await outsider.request(`${otherPath}/history`)).json()).toEqual(otherHistoryBefore);

  // Restore access through the API to inspect the private draft and prove the
  // same request is valid for an ordinary member with current access.
  const invitation = await client.json(`${path.replace('/map', '')}/invitations`, { userId });
  expect(invitation.status).toBe(201);
  const { code } = await invitation.json();
  expect((await actor.json('/api/invitations/accept', { code })).status).toBe(200);
  expect(await read(actor)).toEqual(memberBefore);
  expect((await post('discard-change', body, actor)).status).toBe(200);
  const discarded = await read(actor);
  expect(discarded.draft.changes).toEqual([]);
  expect(discarded.objects).toEqual(memberBefore.objects);
  expect(await read()).toEqual(ownerBefore);
  expect(await (await client.request(`${path}/history`)).json()).toEqual(historyBefore);
});

test('discarding an unsaved object drops only its incident proposals and all proposal kinds are individually removable', async () => {
  await object('person', {});
  await object('card', {});
  await edge('private-edge', 'person', 'card');
  let state = await read();
  expect(
    (await post('discard-change', { version: state.draft.version, kind: 'object', id: 'person' }))
      .status,
  ).toBe(200);
  state = await read();
  expect(state.draft.changes.map((change) => change.id)).toEqual(['card']);
  expect(state.draft.relationships ?? []).toEqual([]);
  expect(
    (
      await post('object-type', {
        version: state.draft.version,
        id: 'new-type',
        baseRevision: null,
        value: { name: 'Ny typ', description: '', fields: [] },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await post('relationship-type', {
        version: (await read()).draft.version,
        id: 'new-edge-type',
        baseRevision: null,
        value: { name: 'Ny typ', description: '', forwardLabel: 'hör till', reverseLabel: 'har' },
      })
    ).status,
  ).toBe(200);
  for (const [kind, id] of [
    ['objectType', 'new-type'],
    ['relationshipType', 'new-edge-type'],
    ['relationship', 'private-edge'],
  ]) {
    expect(
      (await post('discard-change', { version: (await read()).draft.version, kind, id })).status,
    ).toBe(200);
  }
  expect((await read()).draft.changes.map((change) => change.id)).toEqual(['card']);
});

afterEach(() => fixture.close());
