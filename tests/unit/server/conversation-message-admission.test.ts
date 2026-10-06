import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { modelMessage, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let browser: APIRequestContext;
let path: string;
let release = () => {};
const testBudget = 30_000;
type Delivery = {
  channel: 'MCP' | 'model';
  action: string;
  startedMs: number;
  endedMs?: number;
  elapsedMs?: number;
  status?: number;
};
const deliveries: Delivery[] = [];
let completionDiagnostic: (() => object) | undefined;
function observe(channel: Delivery['channel'], action: string) {
  const started = performance.now();
  const delivery: Delivery = { channel, action, startedMs: Math.round(started) };
  deliveries.push(delivery);
  if (deliveries.length > 16) deliveries.shift();
  return {
    delivered(response: Response) {
      delivery.status = response.status;
    },
    finish() {
      delivery.elapsedMs = Math.round(performance.now() - started);
      delivery.endedMs = Math.round(performance.now());
    },
  };
}
afterEach(async ({ task }) => {
  if (task.result?.state === 'fail' && completionDiagnostic)
    console.error(JSON.stringify(completionDiagnostic()));
  release();
  await browser?.dispose();
  await app?.close();
});
async function setup(modelFetch: typeof fetch): Promise<TextAssistantView> {
  deliveries.length = 0;
  completionDiagnostic = undefined;
  app = await createInstallation(undefined, {
    modelFetch: async (input, init) => {
      const body = JSON.parse(String(init?.body));
      const observation = observe('model', body.tools.length ? 'turn' : 'summary');
      try {
        const response = await modelFetch(input, init);
        observation.delivered(response);
        return response;
      } finally {
        observation.finish();
      }
    },
    assistantDispatch: async (incoming, dispatch) => {
      const rpc =
        incoming.method === 'POST' && new URL(incoming.url).pathname === '/mcp'
          ? await incoming.clone().json()
          : null;
      const action = rpc?.method === 'tools/call' ? rpc.params.name : rpc?.method;
      if (typeof action !== 'string') return dispatch(incoming);
      const observation = observe('MCP', action);
      try {
        const response = await dispatch(incoming);
        observation.delivered(response);
        return response;
      } finally {
        observation.finish();
      }
    },
  });
  browser = await request.newContext();
  await signIn(browser, app.origin);
  const { household } = await (await createHousehold(browser, app.origin)).json();
  path = `${app.origin}/api/households/${household.id}/text-assistant`;
  const response = await post(path, approvedForVisit);
  expect(response.status()).toBe(201);
  const session = await response.json();
  path = `${path}/${session.id}`;
  return session;
}
const post = (url: string, data: object = {}) =>
  browser.post(url, { headers: { origin: app.origin }, data });
function message(session: TextAssistantView, requestId: string) {
  return {
    revision: session.revision,
    draftVersion: session.review.version,
    contentVersion: session.review.contentVersion,
    requestId,
    text: `Förklara uppgift ${requestId}.`,
  };
}
async function completed(
  requestId: string,
  deadline: number,
  summarized = false,
): Promise<TextAssistantView> {
  let result!: TextAssistantView;
  let stage = 'GET pending';
  let httpStatus: number | undefined;
  const started = performance.now();
  completionDiagnostic = () => ({
    event: 'admission_completion_failed',
    requestId,
    summarized,
    stage,
    elapsedMs: Math.round(performance.now() - started),
    httpStatus,
    observed: result && {
      phase: result.phase,
      revision: result.revision,
      taskStatus: result.taskStatus,
      contextGeneration: result.contextGeneration,
      contextSummaryState: result.contextSummaryState,
      queuedMessages: result.queuedMessages,
      error: result.error,
    },
    deliveries,
  });
  try {
    await expect
      .poll(
        async () => {
          stage = 'GET pending';
          httpStatus = undefined;
          const response = await browser.get(`${path}/messages/${requestId}`);
          stage = 'JSON pending';
          httpStatus = response.status();
          result = await response.json();
          stage = 'JSON decoded';
          expect(httpStatus).toBe(200);
          return result.taskStatus;
        },
        // All 205 reads share the existing deadline, including real MCP delivery.
        { interval: 10, timeout: Math.max(1, Math.floor(deadline - performance.now())) },
      )
      .toBe('completed');
  } catch (cause) {
    throw new Error(JSON.stringify(completionDiagnostic()), { cause });
  }
  return result;
}

test.each([false, true])(
  'a conversation continues beyond 200 completed messages and retains request idempotency, summarized=%s',
  async (summarized) => {
    const deadline = performance.now() + testBudget;
    let turns = 0;
    const model = textModel((body) => {
      if (!body.tools.length) return [modelMessage('Tidigare uppgifter har diskuterats.')];
      turns++;
      return [modelMessage(`Förklaring ${turns}.`)];
    });
    let session = await setup(async (input, init) => {
      const response = await model.provider(input, init);
      if (!summarized || turns !== 100 || !JSON.parse(String(init?.body)).tools.length)
        return response;
      const body = await response.json();
      return Response.json({ ...body, usage: { ...body.usage, input_tokens: 1_040_000 } });
    });
    const first = message(session, 'first');
    const originalReview = session.review;
    for (let index = 0; index < 205; index++) {
      const body = index === 0 ? first : message(session, `turn-${index}`);
      const response = await post(`${path}/messages`, body);
      expect(response.status(), await response.text()).toBe(202);
      session = await completed(body.requestId, deadline, summarized);
      expect(session.modelReply).toBe(`Förklaring ${index + 1}.`);
    }
    expect(session.completedReplies).toHaveLength(205);
    expect(session.contextGeneration ?? 0).toBe(summarized ? 1 : 0);
    expect(session.review).toEqual(originalReview);
    expect((await post(`${path}/messages`, first)).status()).toBe(202);
    expect(
      (await post(`${path}/messages`, { ...first, text: 'Ett annat uppdrag.' })).status(),
    ).toBe(409);
    expect((await post(`${path}/messages`, message(session, 'first'))).status()).toBe(409);
    expect((await completed('first', deadline, summarized)).modelReply).toBe('Förklaring 1.');
    expect(turns).toBe(205);
  },
  testBudget,
);

test(
  'pending work stays bounded, duplicates keep one queue entry and cancellation releases capacity',
  async () => {
    const deadline = performance.now() + testBudget;
    let held = true;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const model = textModel(async () => {
      if (held) await waiting;
      return [modelMessage('Uppgiften är förklarad.')];
    });
    const session = await setup(model.provider);
    const first = message(session, 'held');
    expect((await post(`${path}/messages`, first)).status()).toBe(202);
    await expect.poll(() => model.requests.length).toBe(1);
    const working = await (await browser.get(path)).json();
    const queued = message(working, 'queued');
    expect((await post(`${path}/messages`, queued)).status()).toBe(202);
    expect((await post(`${path}/messages`, queued)).status()).toBe(202);
    expect(
      (await post(`${path}/messages`, { ...queued, text: 'Ett annat uppdrag.' })).status(),
    ).toBe(409);
    expect((await (await browser.get(path)).json()).queuedMessages).toBe(1);
    for (let index = 0; index < 198; index++)
      expect((await post(`${path}/messages`, message(working, `pending-${index}`))).status()).toBe(
        202,
      );
    const overflow = await post(`${path}/messages`, message(working, 'overflow'));
    expect(overflow.status()).toBe(409);
    expect(await overflow.json()).toEqual({ error: 'assistant_busy' });
    expect((await (await browser.get(path)).json()).queuedMessages).toBe(199);
    expect((await post(`${path}/messages`, first)).status()).toBe(202);
    expect((await post(`${path}/messages`, queued)).status()).toBe(202);
    const canceled = await (await post(`${path}/cancel`, { all: true })).json();
    expect(canceled.queuedMessages).toBe(0);
    expect((await (await browser.get(`${path}/messages/queued`)).json()).taskStatus).toBe(
      'canceled',
    );
    expect((await post(`${path}/messages`, queued)).status()).toBe(202);
    held = false;
    release();
    expect((await post(`${path}/messages`, message(canceled, 'after-cancel'))).status()).toBe(202);
    expect((await completed('after-cancel', deadline)).modelReply).toBe('Uppgiften är förklarad.');
    expect(model.requests).toHaveLength(2);
  },
  testBudget,
);
