import { expect, test } from '@playwright/test';
import { closeReceiptSessions, liveSaveEvents } from '../../src/server/save-receipt.prototype.js';
import { createHousehold, signIn } from '../support/client.js';
import { approvedForVisit } from '../support/conversation.js';
import { createInstallation } from '../support/installation.js';
import { realModelKey } from '../support/model-mcp.js';

for (const sdk of ['openai', 'copilot']) {
  for (const scenario of [
    'spara',
    'bara text',
    'läs',
    sdk === 'copilot' ? 'påminnelse' : 'fritt verktygsval',
  ]) {
    test(sdk + ' / ' + scenario, async ({ request }) => {
      const readOnly = scenario === 'läs';
      const saves = !readOnly;
      const policy = scenario === 'påminnelse' ? 'native' : 'hook';
      const previous = { ...process.env };
      Object.assign(process.env, {
        NODE_ENV: 'test',
        SKYTTEL_RECEIPT_SDK: sdk,
        SKYTTEL_SAVE_LIVE: '1',
        SKYTTEL_SAVE_PROBE: policy,
        SKYTTEL_SAVE_FREE_CHOICE: scenario === 'fritt verktygsval' ? '1' : '0',
        SKYTTEL_SAVE_TEXT_FIRST: ['bara text', 'påminnelse', 'fritt verktygsval'].includes(scenario)
          ? '1'
          : '0',
      });
      liveSaveEvents.length = 0;
      const scopeStatuses: number[] = [];
      const writes: string[] = [];
      const app = await createInstallation(undefined, {
        providerApiKey: realModelKey(),
        modelFetch: async (input, init) => {
          const response = await fetch(input, init);
          scopeStatuses.push(response.status);
          return response;
        },
        assistantDispatch: async (req, dispatch) => {
          if (req.method === 'POST' && new URL(req.url).pathname === '/mcp') {
            const call = await req.clone().json();
            if (call.params?.name === 'save_draft') writes.push(call.params.arguments.operationId);
          }
          return dispatch(req);
        },
      });
      const browser = request;
      try {
        await signIn(browser, app.origin);
        const { household } = await (await createHousehold(browser, app.origin)).json();
        const root = app.origin + '/api/households/' + household.id;
        const get = async (suffix: string) => (await browser.get(root + suffix)).json();
        const post = (suffix: string, data: object) =>
          browser.post(root + suffix, { headers: { origin: app.origin }, data });
        const before = await get('/map');
        const id = 'provcykel';
        const name = 'Den blå provcykeln';
        expect(
          (
            await post('/map/draft', {
              id,
              value: { typeId: before.types[0].id, name },
              baseRevision: null,
              version: before.draft.version,
              contentVersion: before.contentVersion,
            })
          ).status(),
        ).toBe(200);
        const session = await (await post('/text-assistant', approvedForVisit)).json();
        const path = '/text-assistant/' + session.id;
        expect(session.review.readyToSave).toBe(true);
        const message = {
          revision: session.revision,
          draftVersion: session.review.version,
          contentVersion: session.review.contentVersion,
          requestId: crypto.randomUUID(),
          text: readOnly ? 'Vad finns i mitt utkast?' : 'Spara hela utkastet.',
        };
        expect((await post(path + '/messages', message)).status()).toBe(202);
        await expect
          .poll(async () => (await get(path)).phase, { timeout: 120000 })
          .not.toBe('working');
        const final = await get(path);
        const after = await get('/map');
        const { history } = await get('/map/history');
        console.info('API-SPARPROV', {
          sdk,
          policy,
          scenario,
          scopeStatuses,
          events: liveSaveEvents,
          writes: writes.length,
          phase: final.phase,
          reply: final.reply,
          error: final.error,
          draftChanges: after.draft.changes.length,
          receipts: history.length,
        });
        expect(scopeStatuses.length).toBeGreaterThan(0);
        expect(scopeStatuses.every((code) => code === 200)).toBe(true);
        expect(liveSaveEvents).toContain('modellsvar');
        expect(writes).toHaveLength(saves ? 1 : 0);
        expect(after.objects.some((object: { id: string }) => object.id === id)).toBe(saves);
        expect(after.draft.changes).toHaveLength(saves ? 0 : 1);
        expect(history).toHaveLength(saves ? 1 : 0);
        if (saves) {
          expect(final.phase).toBe('ready');
          expect(history[0]).toEqual(final.receipt);
          expect(final.receipt).toMatchObject({
            operationId: writes[0],
            changes: [{ after: { id, name } }],
          });
          const repeated = await (await post(path + '/messages', message)).json();
          expect(repeated.receipt).toEqual(final.receipt);
          expect(writes).toHaveLength(1);
          expect((await get('/map/history')).history).toEqual(history);
        } else if (readOnly) {
          expect(final.reply).toMatch(/cykel/i);
          expect(liveSaveEvents.filter((e) => e.endsWith(':spara_utkast'))).toEqual([]);
          expect(final.phase).toBe('ready');
        }
        if (saves) {
          expect(liveSaveEvents.filter((e) => e.endsWith(':spara_utkast'))).toHaveLength(1);
        }
      } finally {
        await closeReceiptSessions();
        await app.close();
        for (const key of [
          'NODE_ENV',
          'SKYTTEL_RECEIPT_SDK',
          'SKYTTEL_SAVE_LIVE',
          'SKYTTEL_SAVE_PROBE',
          'SKYTTEL_SAVE_TEXT_FIRST',
          'SKYTTEL_SAVE_FREE_CHOICE',
        ]) {
          if (previous[key] === undefined) delete process.env[key];
          else process.env[key] = previous[key];
        }
      }
    });
  }
}
