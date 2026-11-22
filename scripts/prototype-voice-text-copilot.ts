// Lokalt engångsprov med ett påhittat hushåll och simulerad röstanslutning.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { request } from '@playwright/test';
import { openVoiceTextPrototype } from '../src/server/voice-text-copilot.prototype.js';
import type { MapState } from '../src/shared/map.js';
import type { TextAssistantView } from '../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../tests/support/client.js';
import { approvedForVisit } from '../tests/support/conversation.js';
import { createInstallation } from '../tests/support/installation.js';
import {
  isVoiceAnswerRelease,
  liveProvider,
  voiceAnswerParts,
} from '../tests/support/live-provider.js';
import { readOnlyScope, textModel } from '../tests/support/text-model.js';

const real = process.argv.includes('--openai');
const apiKey = real ? process.env.OPENAI_API_KEY : undefined;
if (real && !apiKey) throw new Error('OPENAI_API_KEY krävs för --openai');
const live = liveProvider();
const scopeStatuses: number[] = [];
const localScope = textModel(() => {
  throw new Error('Arbetsmodellens anrop ska gå genom Copilot');
}, readOnlyScope);
const modelFetch: typeof fetch = async (input, init) => {
  if (!real) return localScope.provider(input, init);
  const url = input instanceof Request ? input.url : String(input);
  const body = JSON.parse(String(init?.body));
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.match(body.instructions, /^SKYTTEL_TURN_SCOPE/);
  assert.ok(scopeStatuses.length < 2);
  const response = await fetch(input, init);
  scopeStatuses.push(response.status);
  return response;
};
const app = await createInstallation(undefined, {
  modelFetch,
  providerApiKey: apiKey,
  liveFetch: live.provider,
  liveSideband: live.attach,
});
const browser = await request.newContext();
const name = 'Granbackens reservlykta';
const firstHeard = 'I ditt utkast finns ett förslag.';
let prototype: Awaited<ReturnType<typeof openVoiceTextPrototype>> | undefined;

async function until<T>(read: () => T | undefined | Promise<T | undefined>, label: string) {
  const end = Date.now() + (real ? 100_000 : 15_000);
  do {
    const value = await read();
    if (value !== undefined) return value;
    await delay(50);
  } while (Date.now() < end);
  throw new Error(label);
}

try {
  await signIn(browser, app.origin);
  const { household } = await (
    await createHousehold(browser, app.origin, 'Påhittat hushåll')
  ).json();
  const path = `${app.origin}/api/households/${household.id}`;
  async function get<T>(route: string): Promise<T> {
    const response = await browser.get(`${path}/${route}`);
    assert.ok(response.ok(), `GET ${route}: ${response.status()}`);
    return response.json();
  }
  async function post<T>(route: string, status: number, data: unknown): Promise<T> {
    const response = await browser.post(`${path}/${route}`, {
      headers: { origin: app.origin },
      data,
    });
    assert.equal(response.status(), status, await response.text());
    return response.json();
  }
  const before = await get<MapState>('map');
  await post('map/draft', 200, {
    version: before.draft.version,
    id: 'reservlykta',
    baseRevision: null,
    value: { typeId: before.types[0].id, name },
  });
  const started = await post<TextAssistantView>('text-assistant', 201, approvedForVisit);
  const conversation = `text-assistant/${started.id}`;
  const revision = (view: TextAssistantView) => ({
    revision: view.revision,
    draftVersion: view.review.version,
    contentVersion: view.review.contentVersion,
  });
  prototype = await openVoiceTextPrototype(started.id, apiKey);
  const { evidence } = prototype;
  await post(`${conversation}/voice`, 201, { sdp: 'synthetic-offer', ...revision(started) });
  const [providerId] = live.channels.keys();
  assert.ok(providerId);
  live.emit(providerId, {
    type: 'session.input_transcript.delta',
    event_id: 'voice-question',
    start_ms: 0,
    end_ms: 1000,
    delta: 'Läs mitt utkast och berätta vad förslaget gäller.',
  });
  live.emit(providerId, {
    type: 'session.delegation.created',
    event_id: 'delegation',
    offset_ms: 1000,
    delegation: { id: 'voice-draft-read', target: 'client' },
  });
  await until(() => {
    if (live.sent.some(({ event }) => isVoiceAnswerRelease(event)))
      return voiceAnswerParts(live.sent).join('');
  }, 'Röstläget fick inget svar att läsa upp');
  const toRead = voiceAnswerParts(live.sent).join('');
  assert.ok(toRead.includes(firstHeard), toRead);
  assert.ok(toRead.includes(name), toRead);
  assert.equal(evidence.verifiedName, name);
  console.info('Kartverktyget bekräftade', evidence.verifiedName);

  live.emit(providerId, {
    type: 'session.output_transcript.delta',
    event_id: 'voice-prefix',
    start_ms: 1100,
    end_ms: 1300,
    delta: firstHeard,
  });
  live.emit(providerId, { type: 'close' });
  await until(() => (live.channels.has(providerId) ? undefined : true), 'Rösten stängdes inte');
  console.info('I provet hann användaren höra', firstHeard);
  const afterVoice = await get<TextAssistantView>(conversation);
  assert.equal(afterVoice.id, started.id);
  assert.equal(afterVoice.review.version, started.review.version);
  assert.equal(afterVoice.contextRevision, started.contextRevision);
  const requestId = 'continue-in-text';
  await post(`${conversation}/messages`, 202, {
    ...revision(afterVoice),
    requestId,
    text: 'Vad heter objektet som du nyss hämtade uppgifter om?',
  });
  const answer = await until(async () => {
    const view = await get<TextAssistantView>(`${conversation}/messages/${requestId}`);
    if (view.taskStatus === 'working' || view.taskStatus === 'queued') return;
    return view;
  }, 'Textfrågan fick inget svar');
  const after = await get<MapState>('map');
  console.info('Textsvaret', answer.modelReply ?? answer.reply);
  console.info('Observationer', JSON.stringify({ ...evidence, scopeStatuses }));
  console.info('Utkastets version', after.draft.version, 'Sparade objekt', after.objects.length);
  assert.equal(answer.id, started.id);
  assert.equal(evidence.sdkSessionIds.length, 2);
  assert.equal(evidence.sdkSessionIds[0], evidence.sdkSessionIds[1]);
  assert.equal(evidence.textToolName, name);
  assert.equal(evidence.textToolCallId, evidence.toolCallId);
  assert.ok((answer.modelReply ?? answer.reply)?.includes(name));
  assert.equal(evidence.serverToolReads, 1);
  assert.equal(evidence.modelRounds, 3);
  assert.equal(after.draft.version, started.review.version);
  assert.deepEqual(after.objects, before.objects);
  if (real) {
    assert.deepEqual(evidence.openAIStatuses, [200, 200, 200]);
    assert.deepEqual(scopeStatuses, [200, 200]);
  }
} finally {
  await prototype?.close();
  await browser.dispose();
  await app.close();
}
