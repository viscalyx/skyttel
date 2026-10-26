import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import {
  modelActions,
  observationDiagnostics,
  retainedObservation,
} from '../../../scripts/model-evaluation/observations.js';
import type {
  AssistantObservation,
  ObserveAssistant,
} from '../../../src/server/assistant-observation.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { liveProvider } from '../../support/live-provider.js';
import { modelMessage, modelTool, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
afterEach(async () => {
  await client?.dispose();
  await app?.close();
});

async function setup(observe?: ObserveAssistant, modelFetch?: typeof fetch) {
  let turn = 0;
  app = await createInstallation(undefined, {
    modelFetch:
      modelFetch ??
      textModel(() =>
        turn++ === 0 ? [modelTool('read_map', { query: 'Lina' })] : [modelMessage('Lina är läst.')],
      ).provider,
    observe,
  });
  client = await request.newContext();
  await signIn(client, app.origin);
  const { household } = await (await createHousehold(client, app.origin)).json();
  const path = `${app.origin}/api/households/${household.id}`;
  const started = await client.post(`${path}/text-assistant`, {
    headers: { origin: app.origin },
    data: approvedForVisit,
  });
  expect(started.status(), await started.text()).toBe(201);
  const session = await started.json();
  return { path, session };
}

async function submit(path: string, session: Awaited<ReturnType<typeof setup>>['session']) {
  const sent = await client.post(`${path}/text-assistant/${session.id}/messages`, {
    headers: { origin: app.origin },
    data: {
      revision: session.revision,
      draftVersion: session.review.version,
      contentVersion: session.review.contentVersion,
      requestId: 'read-lina',
      text: 'Läs bara Lina.',
    },
  });
  expect(sent.status(), await sent.text()).toBe(202);
}
async function send(path: string, session: Awaited<ReturnType<typeof setup>>['session']) {
  await submit(path, session);
  const result = `${path}/text-assistant/${session.id}/messages/read-lina`;
  await expect
    .poll(async () => (await (await client.get(result)).json()).taskStatus)
    .toBe('completed');
  return (await client.get(result)).json();
}

test.each(['throwing', 'rejecting', 'mutating'])(
  'a %s observer leaves authenticated text work, the draft and cost accounting intact',
  async (behavior) => {
    const { path, session } = await setup((event) => {
      if (behavior === 'throwing') throw new Error('synthetic-observer-failure');
      if (behavior === 'rejecting')
        return Promise.reject(new Error('synthetic-async-observer-failure'));
      if (event.kind === 'mcp_completed') {
        const payload = event.data as { result: { content: { text: string }[] } };
        for (const item of payload.result.content)
          item.text = 'observer mutation is not application data';
      }
    });
    const before = await (await client.get(`${path}/map`)).json();
    expect(await send(path, session)).toMatchObject({
      phase: 'ready',
      modelReply: 'Lina är läst.',
    });
    expect(await (await client.get(`${path}/map`)).json()).toEqual(before);
    expect(await (await client.get(`${path}/map/history`)).json()).toEqual({ history: [] });
    const costs = await client.get(
      `${app.origin}/api/operator/costs?month=${new Date().toISOString().slice(0, 7)}`,
    );
    expect(costs.status()).toBe(200);
    expect(await costs.json()).toMatchObject({
      recordingUnavailable: false,
      terra: { attempts: 2, usage: { input: { known: 240 }, output: { known: 60 } } },
    });
  },
);

test('backend task and MCP observations keep explicit stable ownership and observed endings', async () => {
  const events: AssistantObservation[] = [];
  const { path, session } = await setup((event) => events.push(event));
  await send(path, session);
  const task = events.find((event) => event.kind === 'task_started');
  expect(task).toMatchObject({
    sessionId: session.id,
    taskId: 'read-lina',
    status: 'incomplete',
    context: { owner: 'backend', requestId: 'read-lina' },
  });
  expect(task?.context?.traceId).toBeTruthy();
  const ending = events.filter((event) => event.kind === 'task_completed');
  expect(ending).toHaveLength(1);
  expect(ending[0]).toMatchObject({ context: task?.context, status: 'completed' });
  const calls = events.filter(
    (event) => event.kind === 'mcp_started' && event.taskId === 'read-lina',
  );
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    expect(call).toMatchObject({
      status: 'incomplete',
      context: {
        owner: 'backend',
        traceId: task?.context?.traceId,
        parentSpanId: task?.context?.spanId,
      },
    });
    expect(call.context?.toolExecutionId).toBe(call.context?.spanId);
    expect(
      events.filter(
        (event) => event.kind === 'mcp_completed' && event.context?.spanId === call.context?.spanId,
      ),
    ).toHaveLength(1);
  }
  const mapRead = calls.find((event) => (event.data as { name: string }).name === 'read_map');
  expect(mapRead?.data).toEqual({ name: 'read_map', args: { query: 'Lina' } });
  const modelStarts = events.filter(
    (event) =>
      event.kind === 'model_attempt' && (event.data as { outcome?: string }).outcome === 'started',
  );
  expect(modelStarts).toHaveLength(2);
  for (const start of modelStarts) {
    expect(start.context).toMatchObject({
      owner: 'backend',
      traceId: task?.context?.traceId,
      parentSpanId: task?.context?.spanId,
      providerCallId: start.context?.spanId,
    });
    expect(
      events.filter(
        (event) =>
          event.kind === 'model_attempt' &&
          event.status === 'completed' &&
          event.context?.spanId === start.context?.spanId,
      ),
    ).toHaveLength(1);
  }
  expect(events.find((event) => event.kind === 'model_action')?.context?.providerCallId).toBe(
    modelStarts[0]?.context?.providerCallId,
  );
  expect(JSON.stringify(events)).not.toMatch(/Bearer|synthetic-model-key|Cookie/);
  const privateEvents: AssistantObservation[] = [];
  const retained = events.map((event) =>
    retainedObservation(event, (event) => privateEvents.push(event)),
  );
  expect(privateEvents).toEqual(events);
  expect(modelActions(retained)).toMatchObject([{ name: 'read_map' }]);
  expect(observationDiagnostics(retained, 0).mcp).toContainEqual(
    expect.objectContaining({ name: 'read_map', taskId: 'read-lina' }),
  );
});

test('a failed model task has a failed observed ending without its provider error body', async () => {
  const events: AssistantObservation[] = [];
  const { path, session } = await setup(
    (event) => events.push(event),
    async () => Response.json({ error: { message: 'synthetic-provider-secret' } }, { status: 503 }),
  );
  expect(await send(path, session)).toMatchObject({
    phase: 'error',
    error: 'assistant_provider_failed',
  });
  expect(events.filter((event) => event.kind === 'task_completed')).toMatchObject([
    { status: 'failed', data: { error: 'task_failed' } },
  ]);
  expect(JSON.stringify(events)).not.toContain('synthetic-provider-secret');
});

test('canceled work keeps its original incomplete start and never turns a late provider result into success', async () => {
  const events: AssistantObservation[] = [];
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered = false;
  const provider = textModel(async () => {
    entered = true;
    await waiting;
    return [modelMessage('Ett för sent svar.')];
  });
  const { path, session } = await setup((event) => events.push(event), provider.provider);
  await submit(path, session);
  await expect.poll(() => entered).toBe(true);
  const start = events.find((event) => event.kind === 'task_started');
  expect(start?.status).toBe('incomplete');
  expect(events.filter((event) => event.kind === 'task_completed')).toEqual([]);
  try {
    const stopped = await client.post(`${path}/text-assistant/${session.id}/cancel`, {
      headers: { origin: app.origin },
      data: { all: true },
    });
    expect(stopped.status()).toBe(200);
  } finally {
    release();
  }
  await expect.poll(() => events.filter((event) => event.kind === 'task_completed').length).toBe(1);
  expect(events.find((event) => event.kind === 'task_completed')).toMatchObject({
    status: 'canceled',
    context: start?.context,
  });
  const result = await (
    await client.get(`${path}/text-assistant/${session.id}/messages/read-lina`)
  ).json();
  expect(result).toMatchObject({ taskStatus: 'canceled', canceled: true });
  expect(JSON.stringify(result)).not.toContain('Ett för sent svar.');
});

test.each([
  { throws: false, ending: 'completed' },
  { throws: true, ending: 'completed' },
  { throws: false, ending: 'disconnected' },
  { throws: false, ending: 'incomplete' },
])(
  'voice observations exclude unreviewed provider fields with $ending ending and throwing sink $throws',
  async ({ throws, ending }) => {
    const events: AssistantObservation[] = [];
    const live = liveProvider();
    let turn = 0;
    app = await createInstallation(undefined, {
      modelFetch: textModel(() =>
        turn++ === 0 ? [modelTool('read_map', { query: 'cykel' })] : [modelMessage('Ett svar.')],
      ).provider,
      liveFetch: live.provider,
      liveSideband: live.attach,
      observe(event) {
        events.push(event);
        if (throws) throw new Error('synthetic-sink-secret');
      },
    });
    client = await request.newContext();
    await signIn(client, app.origin);
    const { household } = await (await createHousehold(client, app.origin)).json();
    const base = `${app.origin}/api/households/${household.id}/text-assistant`;
    const session = await (
      await client.post(base, { headers: { origin: app.origin }, data: approvedForVisit })
    ).json();
    const started = await client.post(`${base}/${session.id}/voice`, {
      headers: { origin: app.origin },
      data: { sdp: 'synthetic-offer', revision: 0, draftVersion: 0, contentVersion: 1 },
    });
    expect(started.status(), await started.text()).toBe(201);
    const { voice } = await started.json();
    const providerId = [...live.channels.keys()][0];
    live.emit(providerId, {
      type: 'session.input_transcript.delta',
      event_id: 'fragment-1',
      role: 'assistant',
      delta: 'Min blå cykel.',
      start_ms: 0,
      end_ms: 1,
      audio: 'synthetic-audio-secret',
      authorization: 'synthetic-auth-secret',
      headers: { cookie: 'synthetic-cookie-secret' },
      metadata: { environment: 'synthetic-environment-secret' },
    });
    const transcript = events.find(
      (event) =>
        event.kind === 'voice_event' &&
        (event.data as { event_id?: string }).event_id === 'fragment-1',
    );
    expect(transcript?.data).toEqual({
      type: 'session.input_transcript.delta',
      role: 'user',
      event_id: 'fragment-1',
      delta: 'Min blå cykel.',
      start_ms: 0,
      end_ms: 1,
    });
    expect(transcript?.context).toMatchObject({
      owner: 'voice',
      voiceSessionId: voice.id,
      traceId: voice.id,
      spanId: voice.id,
    });
    live.emit(providerId, {
      type: 'session.output_transcript.delta',
      event_id: 'output-fragment-1',
      role: 'user',
      delta: 'Jag lyssnar.',
      start_ms: 0,
      end_ms: 1,
    });
    const output = events.find(
      (event) =>
        event.kind === 'voice_event' &&
        (event.data as { event_id?: string }).event_id === 'output-fragment-1',
    );
    expect(output?.data).toEqual({
      type: 'session.output_transcript.delta',
      role: 'assistant',
      event_id: 'output-fragment-1',
      delta: 'Jag lyssnar.',
      start_ms: 0,
      end_ms: 1,
    });
    live.emit(providerId, {
      type: 'session.delegation.created',
      event_id: 'delegation-event-1',
      offset_ms: 1,
      delegation: {
        id: 'delegation-1',
        target: 'client',
        type: 'delegation',
        metadata: { credential: 'synthetic-nested-secret' },
      },
      metadata: { authorization: 'synthetic-delegation-secret' },
    });
    const delegation = events.find(
      (event) =>
        event.kind === 'voice_event' &&
        (event.data as { event_id?: string }).event_id === 'delegation-event-1',
    );
    expect((delegation?.data as { delegation?: unknown } | undefined)?.delegation).toEqual({
      id: 'delegation-1',
      target: 'client',
      type: 'delegation',
    });
    expect(JSON.stringify(events)).not.toMatch(/synthetic-(audio|auth|cookie|environment)-secret/);
    expect(JSON.stringify(events)).not.toMatch(/synthetic-(nested|delegation)-secret/);
    if (ending === 'completed') {
      await expect
        .poll(() => events.some((event) => event.kind === 'backend_result'), { timeout: 5000 })
        .toBe(true);
      const request = events.find((event) => event.kind === 'backend_request');
      const backend = events.find((event) => event.kind === 'task_started');
      const result = events.find((event) => event.kind === 'backend_result');
      expect(request?.context).toMatchObject({
        owner: 'voice',
        delegationId: 'delegation-1',
        links: [{ traceId: backend?.context?.traceId, spanId: backend?.context?.spanId }],
      });
      expect(result?.context?.requestId).toBe(request?.context?.requestId);
      expect(backend).toMatchObject({
        taskId: request?.context?.requestId,
        context: { owner: 'backend', requestId: request?.context?.requestId },
        data: { source: 'voice' },
      });
      expect(result?.data).toMatchObject({ view: { modelReply: 'Ett svar.' } });
      const mapReads = events.filter(
        (event) =>
          event.kind === 'mcp_started' && (event.data as { name?: string }).name === 'read_map',
      );
      expect(mapReads).toHaveLength(1);
      expect(mapReads[0]?.context?.owner).toBe('backend');
    }
    if (ending === 'disconnected') live.channels.get(providerId)?.emit('close');
    else {
      if (ending === 'incomplete') live.configure({ finalize: false });
      const stopped = await client.post(`${base}/${session.id}/voice/${voice.id}/stop`, {
        headers: { origin: app.origin },
        data: {},
      });
      expect(stopped.status()).toBe(200);
      expect(await stopped.json()).toMatchObject({ voice: { phase: 'closed' } });
    }
    await expect
      .poll(() => events.filter((event) => event.kind === 'voice_completed').length)
      .toBe(1);
    expect(events.filter((event) => event.kind === 'voice_completed')).toMatchObject([
      { status: ending, context: { traceId: voice.id, spanId: voice.id } },
    ]);
  },
);
