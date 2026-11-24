import { request } from '@playwright/test';
import { expect, test } from 'vitest';
import type {
  RetainedConversation,
  TextAssistantView,
} from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { modelMessage, textModel } from '../../support/text-model.js';

test('only an accepted request lists a conversation and a delayed title follows its original ID', async () => {
  const instruction = 'Var finns cykeln?';
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const titleInputs: unknown[] = [];
  const model = textModel(() => [modelMessage('I garaget.')]);
  const title = textModel(async (body) => {
    titleInputs.push(body.input);
    await held;
    return [modelMessage('Cykelns plats')];
  });
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    titleFetch: title.provider,
  });
  const client = await request.newContext();
  try {
    await signIn(client, app.origin);
    const { household } = await (await createHousehold(client, app.origin)).json();
    const path = `${app.origin}/api/households/${household.id}/text-assistant`;
    const post = (url: string, data: object) =>
      client.post(url, { headers: { origin: app.origin }, data });
    const list = async (): Promise<RetainedConversation[]> =>
      (await (await client.get(`${path}/retained`)).json()).conversations;
    const first: TextAssistantView = await (await post(path, approvedForVisit)).json();
    expect(await list()).toEqual([]);
    const sent = await post(`${path}/${first.id}/messages`, {
      text: instruction,
      revision: first.revision,
      requestId: crypto.randomUUID(),
      draftVersion: first.review.version,
      contentVersion: first.review.contentVersion,
    });
    expect(sent.status(), await sent.text()).toBe(202);
    await expect.poll(async () => (await list()).map((row) => row.title)).toEqual([instruction]);
    await expect
      .poll(async () => (await (await client.get(`${path}/${first.id}`)).json()).modelReply)
      .toBe('I garaget.');
    const [before] = await list();
    const second = await (await post(path, approvedForVisit)).json();
    expect(second.id).not.toBe(first.id);
    expect(await list()).toHaveLength(1);
    release();
    await expect
      .poll(async () => (await list()).map((row) => row.title))
      .toEqual(['Cykelns plats']);
    expect(titleInputs).toEqual([[{ role: 'user', content: instruction }]]);
    expect((await list())[0]).toMatchObject({ id: first.id, expiresAt: before.expiresAt });
  } finally {
    release();
    await client.dispose();
    await app.close();
  }
});

test('reading from another device leaves admitted work in place and a late title cannot revive a removed conversation', async () => {
  let finishWork!: () => void;
  let finishTitle!: () => void;
  const work = new Promise<void>((resolve) => {
    finishWork = resolve;
  });
  const pendingTitle = new Promise<void>((resolve) => {
    finishTitle = resolve;
  });
  const dialogue = textModel(async () => {
    await work;
    return [modelMessage('Klart.')];
  });
  const title = textModel(async () => {
    await pendingTitle;
    return [modelMessage('Sen titel')];
  });
  const app = await createInstallation(undefined, {
    modelFetch: dialogue.provider,
    titleFetch: title.provider,
  });
  const writer = await request.newContext();
  const reader = await request.newContext();
  try {
    await signIn(writer, app.origin);
    const { household } = await (await createHousehold(writer, app.origin)).json();
    await signIn(reader, app.origin);
    const path = `${app.origin}/api/households/${household.id}/text-assistant`;
    const headers = { origin: app.origin };
    const session: TextAssistantView = await (
      await writer.post(path, { headers, data: approvedForVisit })
    ).json();
    const endpoint = `${path}/${session.id}`;
    const opened = `${path}/retained/${session.id}/open`;
    const admitted = await writer.post(`${endpoint}/messages`, {
      headers,
      data: {
        text: 'Beskriv garaget.',
        requestId: crypto.randomUUID(),
        revision: session.revision,
        draftVersion: session.review.version,
        contentVersion: session.review.contentVersion,
      },
    });
    expect(admitted.status()).toBe(202);
    await expect.poll(() => dialogue.requests.length).toBe(1);
    expect(await (await reader.get(opened)).json()).toMatchObject({
      id: session.id,
      requiresActivation: true,
      phase: 'working',
    });
    const busy = await reader.post(opened, {
      headers,
      data: { ...approvedForVisit, activate: true },
    });
    expect(busy.status()).toBe(409);
    const stillWorking = await (await writer.get(endpoint)).json();
    expect(stillWorking).toMatchObject({ id: session.id, phase: 'working' });
    expect(stillWorking.paused).not.toBe(true);
    finishWork();
    await expect
      .poll(async () => (await (await writer.get(endpoint)).json()).modelReply)
      .toBe('Klart.');
    expect((await writer.post(`${endpoint}/stop`, { headers, data: {} })).status()).toBe(200);
    finishTitle();
    expect((await reader.get(opened)).status()).toBe(404);
    expect(await (await reader.get(`${path}/retained`)).json()).toEqual({ conversations: [] });
    expect(title.requests).toHaveLength(1);
  } finally {
    finishWork();
    finishTitle();
    await writer.dispose();
    await reader.dispose();
    await app.close();
  }
});
