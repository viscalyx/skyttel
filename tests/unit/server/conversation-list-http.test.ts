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
    const path = app.origin + '/api/households/' + household.id + '/text-assistant';
    const post = (url: string, data: object) =>
      client.post(url, { headers: { origin: app.origin }, data });
    const list = async (): Promise<RetainedConversation[]> =>
      (await (await client.get(path + '/retained')).json()).conversations;
    const first: TextAssistantView = await (await post(path, approvedForVisit)).json();
    expect(await list()).toEqual([]);
    const sent = await post(path + '/' + first.id + '/messages', {
      text: instruction,
      revision: first.revision,
      requestId: crypto.randomUUID(),
      draftVersion: first.review.version,
      contentVersion: first.review.contentVersion,
    });
    expect(sent.status(), await sent.text()).toBe(202);
    await expect.poll(async () => (await list()).map((row) => row.title)).toEqual([instruction]);
    await expect
      .poll(async () => (await (await client.get(path + '/' + first.id)).json()).modelReply)
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
