// Kör med npm run test:env -- tsx scripts/prototype-avbryt.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, request } from '@playwright/test';
import type { TextAssistantView } from '../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../tests/support/client.js';
import { approvedForVisit } from '../tests/support/conversation.js';
import { createInstallation } from '../tests/support/installation.js';
import { liveProvider, isVoiceAnswerRelease } from '../tests/support/live-provider.js';
import { modelMessage, textModel, readOnlyScope } from '../tests/support/text-model.js';

const html = new URL('../src/client/avbryt.prototype.html', import.meta.url);
const wav = await readFile(
  new URL('../scripts/model-evaluation/audio/marin/oklarheter-pris-foljdsvar.wav', import.meta.url),
);
const correction = 'Jag menar abonnemanget Molnlagring Plus.';
const engine = await chromium.launch();
try {
  for (const mode of ['renew', 'realtime', 'local']) await run(mode);
} finally {
  await engine.close();
}

async function run(mode: string) {
  const live = liveProvider();
  const model = textModel(() => [modelMessage('Jag har läst ditt utkast.')], readOnlyScope);
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  const browser = await request.newContext();
  const page = await engine.newPage();
  try {
    await signIn(browser, app.origin);
    const { household } = await (await createHousehold(browser, app.origin)).json();
    const root = app.origin + '/api/households/' + household.id + '/';
    async function get(route: string) {
      const response = await browser.get(root + route);
      assert.ok(response.ok(), await response.text());
      return response.json();
    }
    async function post(route: string, data: unknown) {
      const response = await browser.post(root + route, { headers: { origin: app.origin }, data });
      assert.ok(response.ok(), await response.text());
      return response.json();
    }
    async function propose(id: string, name: string) {
      const map = await get('map');
      await post('map/draft', {
        id,
        version: map.draft.version,
        contentVersion: map.contentVersion,
        baseRevision: null,
        value: { typeId: map.types[0].id, name },
      });
    }
    await propose('cykel', 'Blå cykel');
    const pending = await get('map');
    await post('map/save', {
      version: pending.draft.version,
      contentVersion: pending.contentVersion,
      operationId: 'cykel-sparad',
    });
    await propose('moln', 'Molnlagring Plus');
    const before = await get('map');
    const operation = 'map/operations/cykel-sparad';
    const receipt = await get(operation);
    assert.equal(receipt.operation.status, 'succeeded');
    const history = await get('map/history');
    const started: TextAssistantView = await post('text-assistant', approvedForVisit);
    const conversation = 'text-assistant/' + started.id;
    const voicePath = conversation + '/voice';
    async function open(view: TextAssistantView) {
      const result = await post(voicePath, {
        sdp: 'synthetic-offer',
        revision: view.revision,
        draftVersion: view.review.version,
        contentVersion: view.review.contentVersion,
      });
      return result.voice.id;
    }
    let voiceId = await open(started);
    let offset = 0;
    async function speak(text: string) {
      const id = [...live.channels.keys()].at(-1);
      assert.ok(id);
      const count = live.sent.length;
      offset += 1000;
      live.emit(id, {
        type: 'session.input_transcript.delta',
        event_id: crypto.randomUUID(),
        delta: text,
        start_ms: offset,
        end_ms: offset + 100,
      });
      live.emit(id, {
        type: 'session.delegation.created',
        event_id: crypto.randomUUID(),
        offset_ms: offset + 100,
        delegation: { id: crypto.randomUUID(), target: 'client' },
      });
      for (let attempt = 0; attempt < 150; attempt++) {
        if (live.sent.slice(count).some((x) => isVoiceAnswerRelease(x.event))) return;
        await delay(50);
      }
      throw Error('Servern lämnade inget svar till rösten');
    }
    await speak('Vad ligger i mitt utkast?');
    await page.goto(html.href);
    await page.locator('#modes button[value="' + mode + '"]').click();
    const step = () => page.locator('#next').click();
    await step(); // Avbryt, en vanlig påslagen mikrofon (inte håll-för-att-tala).
    const microphoneOpen = () =>
      page
        .locator('#state')
        .innerText()
        .then((s) => s.includes('Mikrofonen kan sända: ja'));
    const first = await microphoneOpen();
    await step(); // Början av inspelningen, direkt efter Avbryt.
    if (mode === 'renew') {
      await post(voicePath + '/' + voiceId + '/stop', {});
      voiceId = await open(await get(conversation));
    }
    await step(); // Ny anslutning klar, tömd Realtime-kö eller GPT-Lives instruktionskvitto.
    await step(); // Sent ljud från förra uppläsningen.
    const last = await microphoneOpen();
    await step();
    await step();
    const output = await page.locator('#state').innerText();
    assert.ok(!output.includes('Slutet av det gamla svaret'));
    assert.equal(output.includes('Nästa svar'), mode !== 'local');
    if (mode === 'local') {
      await page.locator('#free button[value=unsafe]').click();
      await page.locator('#free button[value=late]').click();
      assert.match(await page.locator('#state').innerText(), /Slutet av det gamla svaret/);
    }
    // Spela en köad ljudkälla och ett sent paket genom webbläsarens ljudgraf.
    // I Realtime-fallet ersätter vår lokala tjänst det gamla paketet med tystnad
    // efter tömningen. GPT-Live får samma sena paket även efter instruktionskvittot.
    const playback = async (unsafe: boolean) =>
      page.evaluate(
        async ({ mode, unsafe, encoded }) => {
          const rate = 24000;
          const block = 2400;
          const dt = block / rate;
          const ctx = new OfflineAudioContext(1, 4 * block, rate);
          const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
          const speech = await ctx.decodeAudioData(bytes.buffer);
          const speaker = ctx.createGain();
          speaker.connect(ctx.destination);
          speaker.gain.setValueAtTime(0, dt);
          if (mode !== 'local' || unsafe) speaker.gain.setValueAtTime(1, 2 * dt);
          for (const slot of (mode === 'local' ? [0, 2, 3] : [0, 3])) {
            const node = ctx.createBufferSource();
            node.buffer = speech;
            node.connect(speaker);
            node.start(slot * dt, 0.5, slot === 0 ? 4 * dt : dt);
            if (slot === 0) node.stop(dt); // Avbryt tar bort redan köat ljud.
          }
          const signal = (await ctx.startRendering()).getChannelData(0);
          return [0, 1, 2, 3].map((i) =>
            signal.subarray(i * block, (i + 1) * block).some((sample) => Math.abs(sample) > 0.001),
          );
        },
        { mode, unsafe, encoded: wav.toString('base64') },
      );
    assert.deepEqual(await playback(false), [true, false, false, mode !== 'local']);
    if (mode === 'local') assert.deepEqual(await playback(true), [true, false, true, true]);
    // Samma inspelning genom en riktig ljudgrind i Chromium. Halva klippet ligger
    // före klartecknet, halva efter. Avståndet är valt, aldrig en latensmätning.
    const capture = (first: boolean, last: boolean) =>
      page.evaluate(
        async ({ encoded, first, last }) => {
          const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
          const decoder = new OfflineAudioContext(1, 1, 24000);
          const clip = await decoder.decodeAudioData(bytes.buffer);
          const renderer = new OfflineAudioContext(1, clip.length, clip.sampleRate);
          const source = renderer.createBufferSource();
          source.buffer = clip;
          const gate = renderer.createGain();
          gate.gain.setValueAtTime(Number(first), 0);
          gate.gain.setValueAtTime(Number(last), Math.floor(clip.length / 2) / clip.sampleRate);
          source.connect(gate).connect(renderer.destination);
          source.start();
          const captured = (await renderer.startRendering()).getChannelData(0);
          const original = clip.getChannelData(0);
          let different = 0;
          for (let i = 0; i < original.length; i++) if (original[i] !== captured[i]) different++;
          return { samples: clip.length, different };
        },
        { encoded: wav.toString('base64'), first, last },
      );
    const audio = await capture(first, last);
    assert.equal(audio.samples, 81425);
    assert.equal(audio.different === 0, mode !== 'renew');
    // Endast ett helt klipp får sitt kända facit. Vid förlust får användaren
    // upprepa hela rättelsen efter återanslutning. Ingen taligenkänning körs.
    if (audio.different) {
      const open = await microphoneOpen();
      assert.equal((await capture(open, open)).different, 0);
    }
    await speak(correction);
    assert.ok(
      model.requests.some((r) =>
        r.input.some(
          (i) => i.role === 'user' && JSON.parse(String(i.content)).message === correction,
        ),
      ),
    );
    const after = await get(conversation);
    assert.equal(after.id, started.id);
    assert.deepEqual(after.review.changes, started.review.changes);
    assert.deepEqual((await get('map')).draft, before.draft);
    assert.deepEqual((await get('map')).objects, before.objects);
    assert.deepEqual(await get(operation), receipt);
    assert.deepEqual(await get('map/history'), history);
    console.log(mode, {
      ...audio,
      connections: live.requests.length,
      received: audio.different ? 'efter omtag' : 'direkt',
      sameReceipt: true,
      sameDraft: true,
    });
    await post(voicePath + '/' + voiceId + '/stop', {});
  } finally {
    await page.close();
    await browser.dispose();
    await app.close();
  }
}
