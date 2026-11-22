// Kör i prototypgrenen med npm run test:env -- tsx scripts/prototype-nasta-svar-live.ts --betalt-prov <ny katalog>.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, request } from '@playwright/test';
import OpenAI, { toFile } from 'openai';
import { SidebandWS } from 'openai/resources/live/sideband/ws';
import { createHousehold, signIn } from '../tests/support/client.js';
import { approvedForVisit } from '../tests/support/conversation.js';
import { createInstallation } from '../tests/support/installation.js';

type Measurement = {
  trackCount: number;
  sampleRate: number;
  interrupted: boolean;
  clickMs: number | null;
  openMs: number | null;
  inputAfter: string;
  trace: { ms: number; kind: string; text?: string }[];
  audio: Record<string, string>;
};

const [flag, directory] = process.argv.slice(2);
const key = process.env.OPENAI_API_KEY;
assert.ok(flag === '--betalt-prov' && key && directory);
await mkdir(directory); // Varje körning har egna originalinspelningar.
const openai = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 30000 });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const api = await request.newContext();
let side: SidebandWS | undefined;
const usage: { model: string; seconds: number | null; final: boolean }[] = [];
const app = await createInstallation(undefined, {
  providerApiKey: key,
  liveUsage: ({ model, seconds, final }) => usage.push({ model, seconds, final }),
  liveSideband(client, id) {
    side = new SidebandWS(client, { session_id: id, graceful_close: true });
    side.on('error', (e) => console.error(e.message));
    return side;
  },
});
let stopPath: string | undefined;
async function post(path: string, data: unknown) {
  const r = await api.post(path, { headers: { origin: app.origin }, data });
  assert.ok(r.ok(), 'HTTP ' + r.status() + ' ' + (r.ok() ? '' : await r.text()));
  return r.json();
}
async function stop() {
  if (stopPath) {
    await post(stopPath, {});
    stopPath = undefined;
  }
}
try {
  await signIn(api, app.origin);
  const { household } = await (await createHousehold(api, app.origin)).json();
  const root = app.origin + '/api/households/' + household.id;
  const get = async (path: string) => (await api.get(root + path)).json();
  for (const [id, name, price] of [
    ['musik', 'Spotify Premium Family', '179'],
    ['moln', 'Molnlagring Plus', '199'],
  ]) {
    const m = await get('/map');
    await post(root + '/map/draft', {
      id,
      baseRevision: null,
      version: m.draft.version,
      contentVersion: m.contentVersion,
      value: {
        typeId: m.types.find((t: { name: string }) => t.name === 'Abonnemang').id,
        name,
        properties: [
          { id: 'price', kind: 'text', label: 'Pris', value: price + ' kronor per månad' },
        ],
      },
    });
  }
  const m = await get('/map');
  await post(root + '/map/save', {
    operationId: 'provkarta',
    version: m.draft.version,
    contentVersion: m.contentVersion,
  });
  const view = await post(root + '/text-assistant', approvedForVisit);
  const voicePath = root + '/text-assistant/' + view.id + '/voice';
  let current = view;
  await page.exposeFunction(
    'pollVoice',
    async (microphoneActive: boolean, speakerActive: boolean) => {
      if (!stopPath) return;
      const result = await post(stopPath.replace(/stop$/, 'poll'), {
        revision: current.revision,
        draftVersion: current.review.version,
        contentVersion: current.review.contentVersion,
        microphoneOn: true,
        microphoneActive,
        speakerActive,
      });
      current = result.assistant;
      return {
        phase: result.voice.phase,
        text: current.modelReply ?? current.result ?? current.reply,
      };
    },
  );
  let started = false;
  await page.exposeFunction('exchangeOffer', async (sdp: string) => {
    assert.ok(!started);
    started = true;
    const v = await post(voicePath, {
      sdp,
      revision: view.revision,
      draftVersion: view.review.version,
      contentVersion: view.review.contentVersion,
    });
    stopPath = voicePath + '/' + v.voice.id + '/stop';
    return v.sdp;
  });
  await page.exposeFunction('stopSpeech', () => {
    assert.ok(side);
    side.send({
      type: 'session.instructions.append',
      delegation_id: null,
      content:
        'Stop speaking immediately. Listen to the correction and handle it normally in Swedish.',
    });
  });
  const input = await Promise.all(
    ['everyday-25-request', 'oklarheter-pris-foljdsvar'].map(async (name) =>
      (
        await readFile(new URL('./model-evaluation/audio/marin/' + name + '.wav', import.meta.url))
      ).toString('base64'),
    ),
  );
  await page.goto(new URL('../src/client/nasta-svar.prototype.html', import.meta.url).href);
  await page.addScriptTag({
    path: new URL('./prototype-nasta-svar-browser.js', import.meta.url).pathname,
  });
  const deadline = setTimeout(() => void page.close().catch(() => {}), 100000);
  let run: Measurement;
  try {
    run = await page.evaluate((input) => {
      const probe = window as unknown as { measureLive: (input: string[]) => Promise<Measurement> };
      return probe.measureLive(input);
    }, input);
  } finally {
    clearTimeout(deadline);
    await stop();
  }
  const { audio, ...measurement } = run;
  const report = { ...measurement, usage };
  await writeFile(join(directory, 'forlopp.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  // Oberoende av GPT-Lives egna textfragment. Spela aldrig upp transkriberingen i samtalet.
  for (const [name, value] of Object.entries(audio)) {
    const data = Buffer.from(value, 'base64');
    await writeFile(join(directory, name + '.wav'), data);
  }
  for (const name of ['hela-ljudsparet', 'efter-avbryt']) {
    if (!audio[name]) continue;
    const result = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      language: 'sv',
      file: await toFile(await readFile(join(directory, name + '.wav')), name + '.wav', {
        type: 'audio/wav',
      }),
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    });
    const asr = {
      text: result.text,
      words: result.words,
      segments: result.segments?.map(({ start, end, no_speech_prob }) => ({
        start,
        end,
        no_speech_prob,
      })),
    };
    await writeFile(join(directory, name + '.json'), JSON.stringify(asr, null, 2));
    console.log(name, asr.text);
  }
} finally {
  try {
    await stop();
  } finally {
    await browser.close();
    await api.dispose();
    await app.close();
  }
}
