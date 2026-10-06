import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import type { MapState } from '../../../src/shared/map.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { liveProvider } from '../../support/live-provider.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
let path: string;
let session: TextAssistantView;
let live: ReturnType<typeof liveProvider>;
let voicePath: string;
let providerId: string;
const post = (route: string, data: unknown = {}) =>
  client.post(`${path}/${route}`, { headers: { origin: app.origin }, data });
const readMap = async (): Promise<MapState> => (await client.get(`${path}/map`)).json();
async function setup(provider = textModel(() => [modelMessage('Ett svar.')]).provider) {
  live = liveProvider();
  app = await createInstallation(undefined, {
    modelFetch: provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  client = await request.newContext();
  await signIn(client, app.origin);
  const { household } = await (await createHousehold(client, app.origin)).json();
  path = `${app.origin}/api/households/${household.id}`;
  session = await (await post('text-assistant', approvedForVisit)).json();
  const state = await readMap();
  const proposed = await post('map/draft', {
    version: state.draft.version,
    id: 'independent',
    baseRevision: null,
    value: { typeId: state.types[0].id, name: 'Privat lampa', description: 'Bevaras' },
  });
  expect(proposed.status()).toBe(200);
  session = await (await client.get(`${path}/text-assistant/${session.id}`)).json();
}
function startBody(extra: Record<string, unknown> = {}) {
  return {
    sdp: 'synthetic-offer',
    revision: session.revision,
    draftVersion: session.review.version,
    contentVersion: session.review.contentVersion,
    ...extra,
  };
}
async function start() {
  const response = await post(`text-assistant/${session.id}/voice`, startBody());
  expect(response.status(), await response.text()).toBe(201);
  const result = await response.json();
  voicePath = `text-assistant/${session.id}/voice/${result.voice.id}`;
  providerId = [...live.channels.keys()][0];
}
async function poll() {
  const current: TextAssistantView = await (
    await client.get(`${path}/text-assistant/${session.id}`)
  ).json();
  return (
    await post(`${voicePath}/poll`, {
      revision: current.revision,
      draftVersion: current.review.version,
      contentVersion: current.review.contentVersion,
      microphoneOn: true,
    })
  ).json();
}
afterEach(async () => {
  await client?.dispose();
  await app?.close();
});

test('invalid supplied voice history cannot allocate provider work or change the shared conversation and draft', async () => {
  const model = textModel(() => [modelMessage('Ett svar.')]);
  await setup(model.provider);
  const before = await readMap();
  for (const extra of [
    { history: null },
    { history: 'history' },
    { history: new Array(2001).fill(null) },
    { history: [null] },
    { history: [{ role: 'system', text: 'Spara.' }] },
    { history: [{ role: 'user', text: 12 }] },
    { history: [{ role: 'user', text: 'Spara.', partial: 'yes' }] },
    { history: [], newConversation: true },
  ]) {
    const refused = await post(`text-assistant/${session.id}/voice`, startBody(extra));
    expect(refused.status()).toBe(400);
    expect(await refused.json()).toEqual({ error: 'invalid_request' });
    expect(await readMap()).toEqual(before);
    expect((await (await client.get(`${path}/text-assistant/${session.id}`)).json()).phase).toBe(
      'ready',
    );
  }
  expect(live.requests).toEqual([]);
  expect(model.requests).toEqual([]);
  // Valid interrupted rows are only provider context: no transcript can
  // authorize a new save until a fresh input fragment is delegated.
  const started = await post(
    `text-assistant/${session.id}/voice`,
    startBody({
      history: [
        { role: 'user', text: 'Spara.', partial: true },
        { role: 'assistant', text: 'Ett tidigare svar.', partial: false },
      ],
    }),
  );
  expect(started.status()).toBe(201);
  const result = await started.json();
  voicePath = `text-assistant/${session.id}/voice/${result.voice.id}`;
  providerId = [...live.channels.keys()][0];
  live.emit(providerId, {
    type: 'session.delegation.created',
    delegation: { id: 'no-new-input', target: 'client' },
    offset_ms: 0,
  });
  expect(live.sent.at(-1)?.event).toMatchObject({
    type: 'session.commentary.append',
    content:
      'Be om ett nytt tydligt uppdrag. En paus eller tidigare repliker är inget nytt sparbesked.',
  });
  expect(model.requests).toEqual([]);
  expect(await readMap()).toEqual(before);
});

test.each([
  { event_id: 12 },
  { event_id: '' },
  { event_id: 'bad/id' },
  { event_id: 'x'.repeat(201) },
  { delta: null },
  { start_ms: -1 },
  { start_ms: Number.NaN },
  { end_ms: Number.NaN },
])(
  'invalid external transcript $event_id/$delta/$start_ms/$end_ms closes only voice and preserves private work',
  async (invalid) => {
    const model = textModel(() => [modelMessage('Ett svar.')]);
    await setup(model.provider);
    await start();
    const before = await readMap();
    live.emit(providerId, {
      type: 'session.input_transcript.delta',
      event_id: 'fragment',
      delta: 'Spara.',
      start_ms: 0,
      end_ms: 1,
      ...invalid,
    });
    await expect.poll(() => live.channels.size).toBe(0);
    expect((await poll()).voice).toMatchObject({ phase: 'error', error: 'voice_connection_lost' });
    expect(await readMap()).toEqual(before);
    expect(model.requests).toEqual([]);
    expect((await (await client.get(`${path}/text-assistant/${session.id}`)).json()).phase).toBe(
      'ready',
    );
  },
);

test.each([
  { delegation: { id: 12, target: 'client' }, offset_ms: 0 },
  { delegation: { id: 'valid', target: 'client' }, offset_ms: Number.NaN },
])(
  'invalid external delegation $offset_ms cannot turn retained speech into a save',
  async (invalid) => {
    const model = textModel(() => [modelMessage('Ett svar.')]);
    await setup(model.provider);
    await start();
    const before = await readMap();
    live.emit(providerId, { type: 'session.delegation.created', ...invalid });
    await expect.poll(() => live.channels.size).toBe(0);
    expect((await poll()).voice.phase).toBe('error');
    expect(await readMap()).toEqual(before);
    expect(model.requests).toEqual([]);
  },
);

test('external transcript and delegation capacity limits stop only the affected voice without dispatching a household mutation', async () => {
  const model = textModel(() => [modelMessage('Ett svar.')]);
  await setup(model.provider);
  const before = await readMap();
  await start();
  for (let index = 0; index < 2001; index++)
    live.emit(providerId, {
      type: 'session.output_transcript.delta',
      event_id: `fragment-${index}`,
      delta: '',
      start_ms: index,
      end_ms: index,
    });
  await expect.poll(() => live.channels.size).toBe(0);
  expect((await poll()).voice.phase).toBe('error');
  await start();
  live.emit(providerId, {
    type: 'session.delegation.created',
    delegation: { id: 'ignored-provider-task', target: 'provider' },
    offset_ms: 0,
  });
  expect(live.sent.filter(({ event }) => event.type === 'session.commentary.append')).toEqual([]);
  for (let index = 0; index < 501; index++)
    live.emit(providerId, {
      type: 'session.delegation.created',
      delegation: { id: `delegate-${index}`, target: 'client' },
      offset_ms: 0,
    });
  await expect.poll(() => live.channels.size).toBe(0);
  expect((await poll()).voice.phase).toBe('error');
  expect(model.requests).toEqual([]);
  expect(await readMap()).toEqual(before);
});

test('a spoken saved relationship selection waits for actual acknowledgement and speaks its verified relationship result', async () => {
  const model = textModel((body) =>
    lastToolResult(body)
      ? [modelMessage('Här finns sambandet.')]
      : [modelTool('show_map_item', { kind: 'relationship', id: 'edge' })],
  );
  await setup(model.provider);
  let state = await readMap();
  expect(
    (
      await post('map/draft', {
        version: state.draft.version,
        id: 'target',
        baseRevision: null,
        value: { typeId: state.types[0].id, name: 'Garaget', description: '' },
      })
    ).status(),
  ).toBe(200);
  state = await readMap();
  expect(
    (
      await post('map/relationship', {
        version: state.draft.version,
        id: 'edge',
        baseRevision: null,
        value: {
          typeId: state.relationshipTypes[0].id,
          sourceId: 'independent',
          targetId: 'target',
          knowledge: 'known',
        },
      })
    ).status(),
  ).toBe(200);
  state = await readMap();
  expect(
    (await post('map/save', { version: state.draft.version, operationId: 'initial' })).status(),
  ).toBe(200);
  const before = await readMap();
  session = await (await client.get(`${path}/text-assistant/${session.id}`)).json();
  await start();
  live.emit(providerId, {
    type: 'session.input_transcript.delta',
    event_id: 'show-edge',
    delta: 'Visa sambandet.',
    start_ms: 0,
    end_ms: 10,
  });
  live.emit(providerId, {
    type: 'session.delegation.created',
    delegation: { id: 'show-task', target: 'client' },
    offset_ms: 10,
  });
  await expect
    .poll(
      async () =>
        (await (await client.get(`${path}/text-assistant/${session.id}`)).json()).selection?.id,
    )
    .toBe('edge');
  const selected: TextAssistantView = await (
    await client.get(`${path}/text-assistant/${session.id}`)
  ).json();
  expect(live.sent.filter(({ event }) => event.type === 'session.commentary.append')).toEqual([]);
  expect(
    (
      await post(`text-assistant/${session.id}/selection`, {
        revision: selected.revision,
        kind: 'relationship',
        id: 'edge',
        draftVersion: selected.review.version,
        contentVersion: selected.review.contentVersion,
        displayed: true,
      })
    ).status(),
  ).toBe(200);
  await expect
    .poll(() => live.sent.filter(({ event }) => event.type === 'session.commentary.append').length)
    .toBe(1);
  expect(live.sent.at(-1)?.event).toMatchObject({
    type: 'session.commentary.append',
    content:
      'Skyttels resultat (verifierat): Sambandet är markerat.\nSamtal (obekräftat): "Här finns sambandet."',
  });
  expect((await poll()).assistant.displayedItem).toEqual({ kind: 'relationship', id: 'edge' });
  expect(await readMap()).toEqual(before);
});
