import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation, robin } from '../../support/installation.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
const clients: APIRequestContext[] = [];
const releases: (() => void)[] = [];
let base: string;
type Conversation = { client: APIRequestContext; path: string; initial: TextAssistantView };
afterEach(async () => {
  for (const release of releases.splice(0)) release();
  for (const client of clients.splice(0)) await client.dispose();
  await app?.close();
});
const post = (client: APIRequestContext, path: string, data: unknown) =>
  client.post(path, { headers: { origin: app.origin }, data });
async function conversation(
  client?: APIRequestContext,
  householdPath = base,
): Promise<Conversation> {
  if (!client) {
    client = await request.newContext();
    clients.push(client);
    await signIn(client, app.origin);
  }
  const response = await post(client, `${householdPath}/text-assistant`, approvedForVisit);
  expect(response.status()).toBe(201);
  const initial: TextAssistantView = await response.json();
  return { client, initial, path: `${householdPath}/text-assistant/${initial.id}` };
}
async function arrange(
  modelFetch: typeof fetch,
  assistantDispatch?: NonNullable<Parameters<typeof createInstallation>[1]>['assistantDispatch'],
) {
  app = await createInstallation(undefined, { modelFetch, assistantDispatch });
  const client = await request.newContext();
  clients.push(client);
  await signIn(client, app.origin);
  const { household } = await (await createHousehold(client, app.origin)).json();
  base = `${app.origin}/api/households/${household.id}`;
  return conversation(client);
}
async function read(value: Conversation): Promise<TextAssistantView> {
  return (await value.client.get(value.path)).json();
}
async function map(value: Conversation): Promise<MapState> {
  return (await value.client.get(`${value.path.split('/text-assistant/')[0]}/map`)).json();
}
async function send(value: Conversation, text: string, requestId = crypto.randomUUID()) {
  const current = await read(value);
  const response = await post(value.client, `${value.path}/messages`, {
    revision: current.revision,
    draftVersion: current.review.version,
    contentVersion: current.review.contentVersion,
    requestId,
    text,
  });
  expect(response.status(), await response.text()).toBe(202);
  return requestId;
}
async function completed(value: Conversation, id: string) {
  let result!: TextAssistantView;
  await expect
    .poll(async () => {
      result = await (await value.client.get(`${value.path}/messages/${id}`)).json();
      return result.taskStatus;
    })
    .toBe('completed');
  return result;
}
async function seed(value: Conversation) {
  const state = await map(value);
  const response = await post(value.client, `${base}/map/draft`, {
    version: state.draft.version,
    contentVersion: state.contentVersion,
    id: 'chair',
    baseRevision: null,
    value: { typeId: state.types[0].id, name: 'Stolen' },
  });
  expect(response.status()).toBe(200);
}

test('two devices serialize their conversations against one draft and dequeue current data', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  let typeId = '';
  const model = textModel(async (body) => {
    if (lastToolResult(body)) return [modelMessage('Utkastet är uppdaterat.')];
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Lägg till Stolen.') await held;
    return [
      modelTool('submit_changes', {
        version: input.draft.version,
        contentVersion: input.draft.contentVersion,
        completion: 'draft',
        operations: [
          {
            name: 'propose_object',
            arguments: {
              id: input.message === 'Lägg till Stolen.' ? 'chair' : 'lamp',
              baseRevision: null,
              value: { typeId, name: input.message === 'Lägg till Stolen.' ? 'Stolen' : 'Lampan' },
            },
          },
        ],
      }),
    ];
  });
  const first = await arrange(model.provider);
  typeId = (await map(first)).types[0].id;
  const second = await conversation();
  const firstId = await send(first, 'Lägg till Stolen.');
  await expect.poll(() => model.requests.length).toBe(1);
  const secondId = await send(second, 'Lägg till Lampan.');
  expect(await read(second)).toMatchObject({ queuedMessages: 1 });
  expect(model.requests).toHaveLength(1);
  release();
  await completed(first, firstId);
  await completed(second, secondId);
  expect((await map(first)).draft.changes).toMatchObject([
    { id: 'chair', after: { name: 'Stolen' } },
    { id: 'lamp', after: { name: 'Lampan' } },
  ]);
  const secondInput = JSON.parse(
    String(model.requests[1].input.findLast((item) => item.role === 'user')?.content),
  );
  expect(secondInput.draft.changes).toMatchObject([{ id: 'chair', after: { name: 'Stolen' } }]);
  expect((await read(first)).completedReplies?.map((reply) => reply.request)).toEqual([
    'Lägg till Stolen.',
  ]);
});

test('new input in another conversation revokes a save before registration', async () => {
  let release!: (output: unknown[]) => void;
  const held = new Promise<unknown[]>((resolve) => {
    release = resolve;
    releases.push(() => resolve([modelMessage('Avbrutet prov.')]));
  });
  const model = textModel((body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    return input.message === 'Spara hela utkastet.'
      ? held
      : [modelMessage('Stolen ligger kvar i ditt utkast.')];
  });
  const first = await arrange(model.provider);
  await seed(first);
  const second = await conversation();
  const firstId = await send(first, 'Spara hela utkastet.');
  await expect.poll(() => model.requests.length).toBe(1);
  const secondId = await send(second, 'Beskriv mitt utkast.');
  release([modelTool('save_draft', { version: 1, contentVersion: 1 })]);
  await completed(first, firstId);
  await completed(second, secondId);
  const history = await (await first.client.get(`${base}/map/history`)).json();
  expect(history.history).toEqual([]);
  expect((await map(first)).draft.changes).toMatchObject([
    { id: 'chair', after: { name: 'Stolen' } },
  ]);
  expect((await read(first)).operations).toEqual([]);
  expect((await read(first)).receipt).toBeUndefined();
  expect((await read(first)).phase).not.toBe('recovery');
  expect((await read(first)).reply).toContain('Be om sparande igen');
});

test('stopping one conversation releases other devices and preserves completed batches', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  let typeId = '';
  const model = textModel(async (body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Lägg till Lampan.') await held;
    const [id, name] =
      input.message === 'Lägg till Stolen.'
        ? ['chair', 'Stolen']
        : input.message === 'Lägg till Lampan.'
          ? ['lamp', 'Lampan']
          : ['table', 'Bordet'];
    return [
      modelTool('submit_changes', {
        version: input.draft.version,
        contentVersion: input.draft.contentVersion,
        completion: 'draft',
        operations: [
          {
            name: 'propose_object',
            arguments: { id, baseRevision: null, value: { typeId, name } },
          },
        ],
      }),
    ];
  });
  const first = await arrange(model.provider);
  typeId = (await map(first)).types[0].id;
  await completed(first, await send(first, 'Lägg till Stolen.'));
  const second = await conversation();
  const stoppedId = await send(first, 'Lägg till Lampan.');
  await expect.poll(() => model.requests.length).toBe(2);
  const canceledId = await send(first, 'Gör inte det köade uppdraget.');
  const otherId = await send(second, 'Lägg till Bordet.');
  const response = await post(first.client, `${first.path}/cancel`, { all: true });
  expect(response.status()).toBe(200);
  await completed(second, otherId);
  expect(
    (await read(first)).tasks?.filter((task) => [stoppedId, canceledId].includes(task.id)),
  ).toEqual([
    expect.objectContaining({ id: stoppedId, status: 'canceled' }),
    expect.objectContaining({ id: canceledId, status: 'canceled' }),
  ]);
  release();
  await expect.poll(() => model.requests.length).toBe(3);
  expect((await map(first)).draft.changes).toMatchObject([
    { id: 'chair', after: { name: 'Stolen' } },
    { id: 'table', after: { name: 'Bordet' } },
  ]);
  expect((await map(first)).draft.changes.some((change) => change.id === 'lamp')).toBe(false);
});

test('a stopped registered save is checked before another conversation can mutate the draft', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  let typeId = '';
  const model = textModel((body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Spara hela utkastet.')
      return [modelTool('save_draft', { version: input.draft.version, contentVersion: 1 })];
    return [
      modelTool('submit_changes', {
        version: input.draft.version,
        contentVersion: input.draft.contentVersion,
        completion: 'draft',
        operations: [
          {
            name: 'propose_object',
            arguments: {
              id: 'lamp',
              baseRevision: null,
              value: { typeId, name: 'Lampan' },
            },
          },
        ],
      }),
    ];
  });
  const first = await arrange(model.provider, async (incoming, dispatch) => {
    const rpc = await incoming
      .clone()
      .json()
      .catch(() => null);
    const response = await dispatch(incoming);
    if (rpc?.params?.name === 'prepare_save') await held;
    return response;
  });
  typeId = (await map(first)).types[0].id;
  await seed(first);
  const second = await conversation();
  await send(first, 'Spara hela utkastet.');
  await expect.poll(async () => (await read(first)).saving).toBe(true);
  const registered = (await read(first)).operations[0];
  const secondId = await send(second, 'Lägg till Lampan.');
  expect((await post(first.client, `${first.path}/cancel`, { all: true })).status()).toBe(200);
  await completed(second, secondId);
  expect((await read(first)).receipt?.operationId).toBe(registered.operationId);
  release();
  const state = await map(second);
  expect(state.objects).toMatchObject([{ id: 'chair', name: 'Stolen' }]);
  expect(state.draft.changes).toMatchObject([{ id: 'lamp', after: { name: 'Lampan' } }]);
  const history = await (await second.client.get(`${base}/map/history`)).json();
  expect(history.history).toMatchObject([{ operationId: registered.operationId }]);
  expect((await read(second)).operations).toHaveLength(1);
});

test('an older queued save cannot regain authority when its turn starts', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  const model = textModel(async (body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Förklara.') await held;
    return input.message === 'Spara hela utkastet.'
      ? [modelTool('save_draft', { version: input.draft.version, contentVersion: 1 })]
      : [modelMessage('Utkastet är oförändrat.')];
  });
  const first = await arrange(model.provider);
  await seed(first);
  await send(first, 'Förklara.');
  await expect.poll(() => model.requests.length).toBe(1);
  const oldSave = await send(first, 'Spara hela utkastet.');
  const newer = await send(first, 'Beskriv mitt utkast.');
  release();
  await completed(first, newer);
  expect((await completed(first, oldSave)).requiredNotice).toContain('Be om sparande igen');
  expect((await (await first.client.get(`${base}/map/history`)).json()).history).toEqual([]);
  expect((await map(first)).draft.changes).toHaveLength(1);
  const saved = await completed(first, await send(first, 'Spara hela utkastet.'));
  expect(saved.receipt).toBeDefined();
  expect((await (await first.client.get(`${base}/map/history`)).json()).history).toHaveLength(1);
});

test('another user and another household do not wait for or receive the occupied draft', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  const model = textModel(async (body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Håll min kö.') await held;
    return [modelMessage('Läsningen är klar.')];
  });
  const first = await arrange(model.provider);
  await seed(first);
  const { user } = await (await first.client.get(`${app.origin}/api/bootstrap`)).json();
  const anotherId = crypto.randomUUID();
  app.seedMembership(user.id, anotherId, 'Ett annat hushåll');
  const elsewhere = await conversation(first.client, `${app.origin}/api/households/${anotherId}`);
  const otherClient = await request.newContext();
  clients.push(otherClient);
  app.setIdentity(robin);
  await signIn(otherClient, app.origin, 'microsoft');
  const { user: otherUser } = await (await otherClient.get(`${app.origin}/api/bootstrap`)).json();
  const invitation = await post(first.client, `${base}/invitations`, { userId: otherUser.id });
  expect(invitation.status()).toBe(201);
  const accepted = await post(otherClient, `${app.origin}/api/invitations/accept`, {
    code: (await invitation.json()).code,
  });
  expect(accepted.status()).toBe(200);
  const otherUserConversation = await conversation(otherClient);
  const occupied = await send(first, 'Håll min kö.');
  await expect.poll(() => model.requests.length).toBe(1);
  await completed(elsewhere, await send(elsewhere, 'Läs det andra hushållet.'));
  await completed(
    otherUserConversation,
    await send(otherUserConversation, 'Läs mitt eget utkast.'),
  );
  expect((await read(first)).tasks).toContainEqual(
    expect.objectContaining({ id: occupied, status: 'working' }),
  );
  expect((await map(elsewhere)).draft.changes).toEqual([]);
  expect((await map(otherUserConversation)).draft.changes).toEqual([]);
  for (const body of model.requests.slice(1)) {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    expect(input.draft.changes).toEqual([]);
  }
  release();
  await completed(first, occupied);
  expect((await map(first)).draft.changes).toMatchObject([
    { id: 'chair', after: { name: 'Stolen' } },
  ]);
});

test('stop after the atomic batch commits reports the actual retained draft without undo', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  let typeId = '';
  const model = textModel((body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    return [
      modelTool('submit_changes', {
        version: input.draft.version,
        contentVersion: 1,
        completion: 'draft',
        operations: [
          {
            name: 'propose_object',
            arguments: { id: 'lamp', baseRevision: null, value: { typeId, name: 'Lampan' } },
          },
        ],
      }),
    ];
  });
  const first = await arrange(model.provider, async (incoming, dispatch) => {
    const rpc = await incoming
      .clone()
      .json()
      .catch(() => null);
    const response = await dispatch(incoming);
    if (rpc?.params?.name === 'apply_draft_batch') await held;
    return response;
  });
  typeId = (await map(first)).types[0].id;
  await send(first, 'Lägg till Lampan.');
  await expect.poll(async () => (await map(first)).draft.changes.length).toBe(1);
  const response = await post(first.client, `${first.path}/cancel`, { all: true });
  expect(response.status()).toBe(200);
  const stopped: TextAssistantView = await response.json();
  expect(stopped.review.changes).toMatchObject([{ id: 'lamp', after: { name: 'Lampan' } }]);
  expect(stopped.reply).toContain('ligger kvar i utkastet');
  expect(stopped.receipt).toBeUndefined();
  release();
  expect((await map(first)).draft).toMatchObject({ version: 1, changes: [{ id: 'lamp' }] });
  expect((await (await first.client.get(`${base}/map/history`)).json()).history).toEqual([]);
});

test('a queued save includes a verified predecessor batch in another conversation', async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
    releases.push(resolve);
  });
  let typeId = '';
  const model = textModel(async (body) => {
    const input = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    if (input.message === 'Spara hela utkastet.')
      return [modelTool('save_draft', { version: input.draft.version, contentVersion: 1 })];
    await held;
    return [
      modelTool('submit_changes', {
        version: input.draft.version,
        contentVersion: 1,
        completion: 'draft',
        operations: [
          {
            name: 'propose_object',
            arguments: { id: 'chair', baseRevision: null, value: { typeId, name: 'Stolen' } },
          },
        ],
      }),
    ];
  });
  const first = await arrange(model.provider);
  typeId = (await map(first)).types[0].id;
  const second = await conversation();
  await send(first, 'Lägg till Stolen.');
  await expect.poll(() => model.requests.length).toBe(1);
  const saveId = await send(second, 'Spara hela utkastet.');
  release();
  const saved = await completed(second, saveId);
  expect(saved.receipt).toBeDefined();
  expect((await map(second)).objects).toMatchObject([{ id: 'chair', name: 'Stolen' }]);
  expect((await map(second)).draft.changes).toEqual([]);
  expect((await (await second.client.get(`${base}/map/history`)).json()).history).toHaveLength(1);
});
