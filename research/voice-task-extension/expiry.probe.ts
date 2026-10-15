import { join } from 'node:path';
import { request } from '@playwright/test';
import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { createHousehold, signIn } from '../../tests/support/client.js';
import { approvedForVisit } from '../../tests/support/conversation.js';
import { createInstallation } from '../../tests/support/installation.js';
import { liveProvider } from '../../tests/support/live-provider.js';
import { modelMessage, textModel } from '../../tests/support/text-model.js';

test('speech before expiry with late suffix has no current completion exception', async () => {
  const model = textModel(() => [modelMessage('Syntetiskt svar.')]);
  const live = liveProvider();
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  const browser = await request.newContext();
  const db = new Database(join(app.directory, 'skyttel.db'));
  try {
    await signIn(browser, app.origin);
    const { household } = await (await createHousehold(browser, app.origin)).json();
    const base = `${app.origin}/api/households/${household.id}`;
    const post = (path: string, data: unknown) =>
      browser.post(path, {
        headers: { origin: app.origin },
        data,
      });
    const map = await (await browser.get(`${base}/map`)).json();
    expect(
      (
        await post(`${base}/map/draft`, {
          version: 0,
          contentVersion: 1,
          id: 'synthetic-durable',
          baseRevision: null,
          value: { typeId: map.types[0].id, name: 'Syntetisk cykel', description: '' },
        })
      ).status(),
    ).toBe(200);
    const durable = (await (await browser.get(`${base}/map`)).json()).draft;
    const session = await (await post(`${base}/text-assistant`, approvedForVisit)).json();
    const path = `${base}/text-assistant/${session.id}`;
    const started = await post(`${path}/voice`, {
      sdp: 'synthetic-offer',
      revision: 0,
      draftVersion: 1,
      contentVersion: 1,
    });
    expect(started.status()).toBe(201);
    const voice = (await started.json()).voice;
    const providerId = [...live.channels.keys()][0];
    live.emit(providerId, {
      type: 'session.input_transcript.delta',
      event_id: 'prefix',
      delta: 'Läs ut',
      start_ms: 0,
      end_ms: 100,
    });
    live.emit(providerId, {
      type: 'session.delegation.created',
      offset_ms: 100,
      delegation: { id: 'task-before-expiry', target: 'client' },
    });
    expect(model.requests).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) n FROM session').get()).toEqual({ n: 1 });
    db.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 1);
    live.emit(providerId, {
      type: 'session.input_transcript.delta',
      event_id: 'suffix',
      delta: 'kastet.',
      start_ms: 100,
      end_ms: 500,
    });
    await new Promise((resolve) => setTimeout(resolve, 2400));
    expect(model.requests).toHaveLength(0);
    expect(
      (
        await post(`${path}/messages`, {
          revision: 0,
          draftVersion: 1,
          contentVersion: 1,
          requestId: 'new-after-expiry',
          text: 'Ny instruktion.',
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await post(`${path}/voice/${voice.id}/poll`, {
          revision: 0,
          draftVersion: 1,
          contentVersion: 1,
          microphoneOn: true,
          microphoneActive: false,
        })
      ).status(),
    ).toBe(401);
    await signIn(browser, app.origin);
    expect((await (await browser.get(`${base}/map`)).json()).draft).toEqual(durable);
    await app.restart();
    // The installed application's origin can change on restart; authenticate anew.
    await signIn(browser, app.origin);
    expect(
      (await (await browser.get(`${app.origin}/api/households/${household.id}/map`)).json()).draft,
    ).toEqual(durable);
  } finally {
    db.close();
    await browser.dispose();
    await app.close();
  }
});
