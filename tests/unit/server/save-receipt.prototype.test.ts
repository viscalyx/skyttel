import { chromium } from '@playwright/test';
import { expect, test, vi } from 'vitest';
import type { SaveReceipt } from '../../../src/shared/map.js';
import { closeReceiptSessions } from '../../../src/server/save-receipt.prototype.js';
import { createHousehold, signIn } from '../../support/client.js';
import { startConversationWithText } from '../../support/conversation-page.js';
import { createInstallation } from '../../support/installation.js';
import { localReceiptModel } from '../../support/receipt-model.prototype.js';
import { modelMessage, textModel } from '../../support/text-model.js';

test.each(
  ['openai', 'copilot'].flatMap((sdk) =>
    ['verktygssvar', 'webbläsarsvar', 'uteblivet uppslag', 'felhanterare'].map((avbrott) => ({
      sdk,
      avbrott,
    })),
  ),
)(
  'sparkvitto med $sdk efter brutet $avbrott',
  async ({ sdk, avbrott }) => {
    vi.stubEnv('NODE_ENV', 'test');
    const skipLookup = avbrott === 'uteblivet uppslag';
    const hook = avbrott === 'felhanterare';
    vi.stubEnv('SKYTTEL_RECEIPT_HOOK', String(hook));
    const model = await localReceiptModel(skipLookup || hook);
    vi.stubEnv('SKYTTEL_RECEIPT_PORT', model.port);
    vi.stubEnv('SKYTTEL_RECEIPT_SDK', sdk);
    const writes: string[] = [];
    const lookups: string[] = [];
    let original: SaveReceipt | undefined;
    let saveLaterDraft: () => Promise<void>;
    const checks = textModel(
      () => {
        throw Error('Arbetsloopen ska vara borttagen');
      },
      (req) => [
        modelMessage(
          JSON.stringify(
            req.instructions.startsWith('SKYTTEL_TURN_SCOPE')
              ? {
                  mode: JSON.stringify(req.input).includes('Vilket kvitto') ? 'read' : 'work',
                  request: 'Behandla användarens aktuella begäran',
                  responseRequired: false,
                }
              : { decision: 'allow', complete: true, fulfillsRequest: true },
          ),
        ),
      ],
    );
    const app = await createInstallation(undefined, {
      modelFetch: checks.provider,
      assistantDispatch: async (req, dispatch) => {
        const rpc =
          req.method === 'POST' && new URL(req.url).pathname === '/mcp'
            ? await req.clone().json()
            : undefined;
        const result = await dispatch(req);
        if (rpc?.params?.name === 'save_draft') {
          writes.push(rpc.params.arguments.operationId);
          original = JSON.parse((await result.clone().json()).result.content[0].text).receipt;
          await saveLaterDraft();
          if (avbrott !== 'webbläsarsvar')
            throw new TypeError('Svaret bröts efter att servern hade sparat');
        }
        if (rpc?.params?.name === 'read_save_operation')
          lookups.push(rpc.params.arguments.operationId);
        return result;
      },
    });
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.setDefaultTimeout(7000);
      await signIn(page.request, app.origin);
      const { household } = await (await createHousehold(page.request, app.origin)).json();
      const path = app.origin + '/api/households/' + household.id + '/map';
      const read = async (suffix = '') => (await page.request.get(path + suffix)).json();
      const state = await read();
      const headers = { origin: app.origin };
      const proposal = async (id: string, name: string, version: number) => {
        const response = await page.request.post(path + '/draft', {
          headers,
          data: {
            id,
            value: { typeId: state.types[0].id, name },
            baseRevision: null,
            version,
            contentVersion: state.contentVersion,
          },
        });
        expect(response.status()).toBe(200);
      };
      const name = 'Den blå provcykeln';
      await proposal('cykeln', name, state.draft.version);
      saveLaterDraft = async () => {
        expect((await read('/history')).history).toEqual([original]);
        // Ett annat sparande gör "senaste kvittot" till ett felaktigt svar.
        const after = await read();
        expect(after.draft.changes).toEqual([]);
        await proposal('lampan', 'Nyare lampa', after.draft.version);
        const next = await read();
        const other = await page.request.post(path + '/save', {
          headers,
          data: {
            operationId: 'senare-sparande',
            version: next.draft.version,
            contentVersion: next.contentVersion,
          },
        });
        expect(other.status()).toBe(200);
      };
      await page.goto(app.origin);
      await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
      await startConversationWithText(page);
      const object = page.getByRole('button', { name: 'Välj objekt: ' + name, exact: true });
      const kind = () => object.getAttribute('class', { timeout: 2000 });
      expect(await kind()).toContain('added');
      const send = async (text: string) => {
        await page.getByLabel('Meddelande till Skyttel').fill(text);
        await page.getByRole('button', { name: 'Skicka', exact: true }).click();
      };
      let dropped = false;
      let checkedReceipt: SaveReceipt | undefined;
      if (avbrott === 'webbläsarsvar') {
        await page.route('**/text-assistant/*', async (route) => {
          const response = await route.fetch();
          const view = await response.json();
          if (!dropped && view.receipt) {
            dropped = true;
            await route.abort();
          } else await route.fulfill({ response });
        });
      }
      if (avbrott === 'webbläsarsvar' || skipLookup) {
        page.on('response', async (response) => {
          if (response.url().endsWith('/recover') && response.ok())
            checkedReceipt = (await response.json()).receipt;
        });
      }
      const accepted = page.waitForRequest(
        (req) => req.method() === 'POST' && req.url().endsWith('/messages'),
      );
      await send('Spara hela utkastet.');
      const first = await accepted;
      await expect.poll(kind, { timeout: 20000 }).toContain('existing');
      expect(original?.changes[0].after?.name).toBe(name);
      expect(writes).toEqual([original!.operationId]);
      expect(lookups).toEqual(avbrott === 'verktygssvar' || hook ? writes : []);
      if (avbrott === 'webbläsarsvar') {
        expect(dropped).toBe(true);
        await expect.poll(() => checkedReceipt, { timeout: 10000 }).toEqual(original);
      }
      if (skipLookup) {
        // Kontrollera ett redan registrerat sparande genom Skyttels vanliga återhämtning.
        const control = page.getByRole('button', {
          name: 'Kontrollera om utkastet sparades',
          exact: true,
        });
        if (await control.isVisible()) await control.click();
        const recovered = await page.request.post(first.url().replace(/messages$/, 'recover'), {
          headers,
          data: {},
        });
        expect(recovered.status()).toBe(200);
        const recovery = await recovered.json();
        expect(recovery.receipt).toEqual(original);
        expect(JSON.stringify(recovery)).not.toContain('Modellen påstår');
      }
      const repeated = await page.request.post(first.url(), {
        headers,
        data: first.postDataJSON(),
      });
      expect(repeated.status()).toBe(202);
      expect((await repeated.json()).receipt).toEqual(original);
      if (skipLookup) {
        expect(model.requested).toEqual(['spara_utkast']);
        expect(model.receipts).toEqual([undefined, undefined]);
        const transcript = await page.getByRole('log', { name: 'Samtalstext' }).textContent();
        expect(transcript).not.toContain('Modellen påstår');
        expect(writes).toEqual([original!.operationId]);
        expect((await read('/history')).history).toHaveLength(2);
        return;
      }
      await send('Vilket kvitto fick jag för cykeln?');
      const transcript = page.getByRole('log', { name: 'Samtalstext' });
      await expect
        .poll(() => transcript.textContent(), { timeout: 20000 })
        .toContain(original!.operationId + ' ' + name);
      expect(model.receipts).toEqual(
        avbrott === 'verktygssvar'
          ? [undefined, undefined, original, original]
          : [undefined, original, original],
      );
      expect(model.requested).toEqual(
        avbrott === 'verktygssvar' ? ['spara_utkast', 'kontrollera_sparandet'] : ['spara_utkast'],
      );
      expect(writes).toHaveLength(1);
      expect(lookups).toEqual(avbrott === 'verktygssvar' || hook ? writes : []);
      expect(
        (await read('/history')).history.map((r: SaveReceipt) => r.operationId).sort(),
      ).toEqual([original!.operationId, 'senare-sparande'].sort());
      console.info(
        'SPARKVITTO',
        JSON.stringify({
          sdk,
          avbrott,
          operationId: original!.operationId,
          writes,
          lookups,
          objekt: name,
          karta: 'added → existing',
          modellomgångar: model.receipts.length,
          senareKvitto: 'senare-sparande',
        }),
      );
    } finally {
      await browser.close();
      await closeReceiptSessions();
      await app.close();
      await model.close();
      vi.unstubAllEnvs();
    }
  },
  60000,
);
