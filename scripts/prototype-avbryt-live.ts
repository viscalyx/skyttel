// Kräver uttryckligt godkännande av ett betalt jämförelseprov.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, request } from '@playwright/test';
import OpenAI from 'openai';
import { SidebandWS } from 'openai/resources/live/sideband/ws';
import { createHousehold, signIn } from '../tests/support/client.js';
import { approvedForVisit } from '../tests/support/conversation.js';
import { createInstallation } from '../tests/support/installation.js';
import { modelMessage, readOnlyScope, textModel } from '../tests/support/text-model.js';
import type { TextAssistantView } from '../src/shared/text-assistant.js';

const key = process.env.OPENAI_API_KEY;
assert.ok(key && process.argv.includes('--betalt-prov'));
const openai = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 15000 });
const spoken =
  'I ditt utkast finns en cykel, en hjälm och ett lås. Cykeln står i förrådet och hjälmen ligger på hyllan bredvid låset.';
const clip = (
  await readFile(
    new URL(
      '../scripts/model-evaluation/audio/marin/oklarheter-pris-foljdsvar.wav',
      import.meta.url,
    ),
  )
).toString('base64');
const prompt = (
  await readFile(
    new URL('../scripts/model-evaluation/audio/marin/everyday-25-request.wav', import.meta.url),
  )
).toString('base64');
const inspectTranscription = process.argv.includes('--bara-realtime');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const mode of inspectTranscription ? ['realtime'] : ['renew', 'realtime', 'local']) {
    try {
      await run(mode);
    } catch (error) {
      console.error(mode, error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
} finally {
  await browser.close();
}

async function run(mode: string) {
  let side: SidebandWS | undefined;
  let liveId: string | undefined;
  let realtimeId: string | undefined;
  let starts = 0;
  const app = await createInstallation(undefined, {
    providerApiKey: key,
    modelFetch: textModel(() => [modelMessage(spoken)], readOnlyScope).provider,
    liveSideband(client, id) {
      side = new SidebandWS(client, { session_id: id, graceful_close: true });
      side.on('error', (e) => console.error('Live-protokollet', String(e.message).slice(0, 300)));
      return side;
    },
  });
  const api = await request.newContext();
  const page = await browser.newPage();
  // Hård tidsgräns även om en tjänst slutar svara.
  const timer = setTimeout(() => void page.close().catch(() => {}), 55000);
  try {
    await signIn(api, app.origin);
    const { household } = await (await createHousehold(api, app.origin)).json();
    const base = app.origin + '/api/households/' + household.id + '/text-assistant';
    async function post(url: string, data: unknown) {
      const r = await api.post(url, { headers: { origin: app.origin }, data });
      assert.ok(
        r.ok(),
        'Skyttels server svarade ' + r.status() + ' ' + (r.ok() ? '' : await r.text()),
      );
      return r.json();
    }
    const view: TextAssistantView = await post(base, approvedForVisit);
    const conversation = base + '/' + view.id;
    async function retire() {
      if (!liveId) return;
      await post(conversation + '/voice/' + liveId + '/stop', {});
      liveId = undefined;
    }
    try {
      await page.exposeFunction('exchangeOffer', async (sdp: string) => {
        assert.ok(++starts <= (mode === 'renew' ? 2 : 1));
        if (mode === 'realtime') {
          const res = await openai.realtime.calls.create({
            sdp,
            session: {
              type: 'realtime',
              model: 'gpt-realtime-2.1',
              max_output_tokens: 240,
              audio: {
                output: { voice: 'marin' },
                input: {
                  turn_detection: {
                    type: 'server_vad',
                    create_response: false,
                    interrupt_response: false,
                  },
                  transcription: { model: 'gpt-4o-mini-transcribe', language: 'sv' },
                },
              },
            },
          });
          realtimeId = res.headers.get('location')?.split('/').at(-1);
          return res.text();
        }
        const fresh = await (await api.get(conversation)).json();
        const v = await post(conversation + '/voice', {
          sdp,
          revision: fresh.revision,
          draftVersion: fresh.review.version,
          contentVersion: fresh.review.contentVersion,
        });
        liveId = v.voice.id;
        return v.sdp;
      });
      await page.exposeFunction('stopSpeech', () =>
        side?.send({
          type: 'session.instructions.append',
          delegation_id: null,
          content: 'Stop speaking immediately. Listen to the correction.',
        }),
      );
      await page.exposeFunction('retireVoice', retire);
      await page.goto(new URL('../src/client/avbryt.prototype.html', import.meta.url).href);
      await page.addScriptTag({
        path: new URL('prototype-avbryt-browser.js', import.meta.url).pathname,
      });
      const result = await page.evaluate(
        async ({ mode, clip, spoken, prompt, inspectTranscription }) => {
          const w = window as unknown as {
            provaAvbrott: (
              mode: string,
              clip: string,
              spoken: string,
              prompt: string,
              inspectTranscription: boolean,
            ) => Promise<unknown>;
          };
          return w.provaAvbrott(mode, clip, spoken, prompt, inspectTranscription);
        },
        { mode, clip, spoken, prompt, inspectTranscription },
      );
      console.log(JSON.stringify(result));
    } finally {
      await retire();
      if (realtimeId) await openai.realtime.calls.hangup(realtimeId).catch(() => {});
    }
  } finally {
    clearTimeout(timer);
    await page.close();
    await api.dispose();
    await app.close();
  }
}
