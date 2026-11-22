import { request } from '@playwright/test';
import { expect, test, vi } from 'vitest';
import { closeReceiptSessions } from '../../../src/server/save-receipt.prototype.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { localReceiptModel } from '../../support/receipt-model.prototype.js';
import { modelMessage, textModel } from '../../support/text-model.js';

const cases = [
  { policy: 'native', behavior: 'obey', saves: true },
  { policy: 'native', behavior: 'text', saves: false },
  { policy: 'hook', behavior: 'text', saves: true },
  { policy: 'hook', behavior: 'call', saves: true },
  { policy: 'hook', behavior: 'read', saves: false },
] as const;

test.each(['openai', 'copilot'].flatMap((sdk) => cases.map((c) => ({ sdk, ...c }))))(
  '$sdk / $policy / $behavior',
  async ({ sdk, policy, behavior, saves }) => {
    const readOnly = behavior === 'read';
    vi.stubEnv('NODE_ENV', 'test');
    const model = await localReceiptModel(false, behavior);
    vi.stubEnv('SKYTTEL_RECEIPT_PORT', model.port);
    vi.stubEnv('SKYTTEL_RECEIPT_SDK', sdk);
    vi.stubEnv('SKYTTEL_SAVE_PROBE', policy);
    const checks = textModel(
      () => {
        throw Error('Den gamla arbetsloopen anropades');
      },
      (req) => [
        modelMessage(
          JSON.stringify(
            req.instructions.startsWith('SKYTTEL_TURN_SCOPE')
              ? {
                  mode: readOnly ? 'read' : 'work',
                  request: 'Behandla frågan',
                  responseRequired: readOnly,
                }
              : { decision: 'allow', complete: true, fulfillsRequest: true },
          ),
        ),
      ],
    );
    const writes: string[] = [];
    const app = await createInstallation(undefined, {
      modelFetch: checks.provider,
      assistantDispatch: async (req, dispatch) => {
        if (req.method === 'POST' && new URL(req.url).pathname === '/mcp') {
          const call = await req.clone().json();
          if (call.params?.name === 'save_draft') writes.push(call.params.arguments.operationId);
        }
        return dispatch(req);
      },
    });
    const browser = await request.newContext();
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
        .poll(async () => (await get(path)).phase, { timeout: 25000 })
        .not.toBe('working');
      const final = await get(path);
      const after = await get('/map');
      const { history } = await get('/map/history');
      console.info('SPARPROV', {
        sdk,
        policy,
        behavior,
        choices: model.choices,
        requested: model.requested,
        writes: writes.length,
        phase: final.phase,
        reply: final.reply,
        error: final.error,
      });
      expect(model.choices.length).toBeGreaterThan(0);
      if (sdk === 'openai' && !readOnly)
        expect(model.choices[0]).toMatchObject({ function: { name: 'spara_utkast' } });
      if (sdk === 'copilot' && policy === 'native') expect(model.choices.length).toBeGreaterThan(1);
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
        expect(final.reply).toContain('Cykeln finns i utkastet');
        expect(final.phase).toBe('ready');
      }
      if (behavior !== 'obey' && behavior !== 'call') expect(model.requested).toEqual([]);
      if (behavior === 'call' || behavior === 'obey')
        expect(model.requested).toEqual(['spara_utkast']);
      if (behavior === 'text' && policy === 'hook') expect(model.choices).toHaveLength(1);
      if (behavior === 'text' && policy === 'native') {
        expect(final.receipt).toBeFalsy();
        expect(final.phase).toBe('error');
        expect(model.choices).toHaveLength(sdk === 'openai' ? 1 : 2);
      }
      expect(final.reply ?? '').not.toContain('Modellen påstår');
    } finally {
      await browser.dispose();
      await closeReceiptSessions();
      await app.close();
      await model.close();
      vi.unstubAllEnvs();
    }
  },
  40000,
);
