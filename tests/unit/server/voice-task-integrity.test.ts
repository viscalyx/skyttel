import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { liveProvider } from '../../support/live-provider.js';
import { modelMessage, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let browser: APIRequestContext;
afterEach(async () => {
  await browser?.dispose();
  await app?.close();
});

test('overlapping final speech preserves the whole task and its full requested answer', {
  tags: ['technical'],
}, async () => {
  const answer = 'Alex arbete har en inloggningsadress och en separat kontaktadress. '.repeat(20);
  const model = textModel(() => [modelMessage(answer)]);
  const live = liveProvider();
  app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  browser = await request.newContext();
  await signIn(browser, app.origin);
  const { household } = await (await createHousehold(browser, app.origin)).json();
  const base = `${app.origin}/api/households/${household.id}`;
  const initial = await (
    await browser.post(`${base}/text-assistant`, {
      headers: { origin: app.origin },
      data: approvedForVisit,
    })
  ).json();
  const path = `${base}/text-assistant/${initial.id}`;
  const before = await (await browser.get(`${base}/map`)).json();
  const started = await browser.post(`${path}/voice`, {
    headers: { origin: app.origin },
    data: { sdp: 'synthetic-offer', revision: 0, draftVersion: 0, contentVersion: 1 },
  });
  expect(started.status()).toBe(201);
  const providerId = [...live.channels.keys()][0];
  live.emit(providerId, {
    type: 'session.input_transcript.delta',
    event_id: 'overlap',
    delta: 'Beskriv alla adressroller för Alex arbete.',
    start_ms: 0,
    end_ms: 2000,
  });
  live.emit(providerId, {
    type: 'session.delegation.created',
    offset_ms: 1000,
    delegation: { id: 'overlap-task', target: 'client' },
  });
  await expect.poll(() => model.requests.length).toBe(1);
  const turn = JSON.parse(
    String(model.requests[0].input.findLast((item) => item.role === 'user')?.content),
  );
  expect(turn.message).toBe('Beskriv alla adressroller för Alex arbete.');
  await expect
    .poll(
      () =>
        live.sent
          .filter(({ event }) => event.type === 'session.commentary.append')
          .map(({ event }) => ('content' in event ? event.content : ''))
          .join(''),
      { timeout: 5000 },
    )
    .toContain(JSON.stringify(answer));
  expect(await (await browser.get(`${base}/map`)).json()).toEqual(before);
  expect(await (await browser.get(`${base}/map/history`)).json()).toEqual({ history: [] });
});
