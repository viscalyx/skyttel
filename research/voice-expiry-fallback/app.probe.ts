import { join } from 'node:path';
import { request } from '@playwright/test';
import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { createHousehold, signIn } from '../../tests/support/client.js';
import { approvedForVisit } from '../../tests/support/conversation.js';
import { createInstallation } from '../../tests/support/installation.js';
import { liveProvider } from '../../tests/support/live-provider.js';
import { modelTool, textModel } from '../../tests/support/text-model.js';

async function fixture(hold = false) {
  let release: ((output: unknown[]) => void) | undefined;
  const save = [
    modelTool('save_draft', { version: 1, contentVersion: 1, operationId: 'synthetic-save' }),
  ];
  const model = textModel(() =>
    hold
      ? new Promise<unknown[]>((resolve) => {
          release = resolve;
        })
      : save,
  );
  const live = liveProvider();
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  const browser = await request.newContext();
  const db = new Database(join(app.directory, 'skyttel.db'));
  await signIn(browser, app.origin);
  const { household } = await (await createHousehold(browser, app.origin)).json();
  const root = `/api/households/${household.id}`;
  const post = (path: string, data: unknown) =>
    browser.post(`${app.origin}${path}`, { headers: { origin: app.origin }, data });
  const map = await (await browser.get(`${app.origin}${root}/map`)).json();
  expect(
    (
      await post(`${root}/map/draft`, {
        version: 0,
        contentVersion: 1,
        id: 'synthetic-durable',
        baseRevision: null,
        value: { typeId: map.types[0].id, name: 'Syntetisk cykel', description: '' },
      })
    ).status(),
  ).toBe(200);
  const session = await (await post(`${root}/text-assistant`, approvedForVisit)).json();
  const path = `${root}/text-assistant/${session.id}`;
  const started = await post(`${path}/voice`, {
    sdp: 'synthetic-offer',
    revision: 0,
    draftVersion: 1,
    contentVersion: 1,
  });
  expect(started.status()).toBe(201);
  const { voice } = await started.json();
  const providerId = [...live.channels.keys()][0];
  const fragment = (eventId: string, text: string) =>
    live.emit(providerId, {
      type: 'session.input_transcript.delta',
      event_id: eventId,
      delta: text,
      start_ms: 0,
      end_ms: 100,
    });
  const delegate = () =>
    live.emit(providerId, {
      type: 'session.delegation.created',
      offset_ms: 100,
      delegation: { id: 'synthetic-delegation', target: 'client' },
    });
  const current = async () => (await browser.get(`${app.origin}${root}/map`)).json();
  return {
    app,
    browser,
    db,
    model,
    live,
    root,
    path,
    post,
    voice,
    fragment,
    delegate,
    current,
    expire: () => db.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 1),
    release: () => release?.(save),
    close: async () => {
      release?.(save);
      db.close();
      await browser.dispose();
      await app.close();
    },
  };
}

test('current app commits prefix before expiry; late negation cannot undo durable save', async () => {
  const f = await fixture();
  try {
    f.fragment('prefix', 'Spara');
    f.delegate();
    await expect.poll(async () => (await f.current()).objects.length, { timeout: 7000 }).toBe(1);
    const saved = await (await f.browser.get(`${f.app.origin}${f.path}`)).json();
    expect(saved.receipt.operationId).toBeTruthy();
    expect(saved.operations).toContainEqual(expect.objectContaining({ status: 'succeeded' }));
    f.expire();
    f.fragment('late-negation', ' inte.');
    expect(
      (
        await f.post(`${f.path}/voice/${f.voice.id}/poll`, {
          revision: saved.revision,
          draftVersion: 2,
          contentVersion: 1,
          microphoneOn: true,
          microphoneActive: false,
        })
      ).status(),
    ).toBe(401);
    const before = f.model.requests.length;
    await signIn(f.browser, f.app.origin);
    const map = await f.current();
    expect(map.objects).toMatchObject([{ id: 'synthetic-durable' }]);
    expect(map.draft.changes).toEqual([]);
    await f.app.restart();
    await signIn(f.browser, f.app.origin);
    const fresh = await (await f.post(`${f.root}/text-assistant`, approvedForVisit)).json();
    expect(fresh.operations).toContainEqual(
      expect.objectContaining({
        operationId: saved.receipt.operationId,
        status: 'succeeded',
        receipt: saved.receipt,
      }),
    );
    expect(f.model.requests.length).toBe(before);
  } finally {
    await f.close();
  }
});

test('current in-flight prefix loses authority at expiry before model save tool returns', async () => {
  const f = await fixture(true);
  try {
    f.fragment('prefix', 'Spara');
    f.delegate();
    await expect.poll(() => f.model.requests.length, { timeout: 7000 }).toBe(1);
    f.expire();
    f.fragment('late-negation', ' inte.');
    f.release();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      (
        await f.post(`${f.path}/messages`, {
          revision: 0,
          draftVersion: 1,
          contentVersion: 1,
          requestId: 'new-after-expiry',
          text: 'Spara allt.',
        })
      ).status(),
    ).toBe(401);
    await signIn(f.browser, f.app.origin);
    expect((await f.current()).objects).toEqual([]);
    expect((await f.current()).draft.changes).toHaveLength(1);
    const fresh = await (await f.post(`${f.root}/text-assistant`, approvedForVisit)).json();
    expect(fresh.operations).toEqual([]);
    await f.app.restart();
    await signIn(f.browser, f.app.origin);
    expect((await f.current()).draft.changes).toHaveLength(1);
    expect(f.model.requests).toHaveLength(1);
  } finally {
    await f.close();
  }
});

test('expiry while collecting rejects delayed evidence, new save and duplicate delegation', async () => {
  const f = await fixture();
  try {
    f.fragment('prefix', 'Läs utkastet.');
    f.delegate();
    f.expire();
    f.fragment('late-save', ' Spara allt.');
    f.delegate();
    await new Promise((resolve) => setTimeout(resolve, 2400));
    expect(f.model.requests).toEqual([]);
    await signIn(f.browser, f.app.origin);
    expect((await f.current()).draft.changes).toHaveLength(1);
  } finally {
    await f.close();
  }
});
