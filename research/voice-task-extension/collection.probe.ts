import { EventEmitter } from 'node:events';
import { afterEach, expect, test, vi } from 'vitest';
import type { LiveSideband } from '../../src/server/live-provider.js';
import { voiceWork } from '../../src/server/voice-work.js';
import type { TextAssistantView } from '../../src/shared/text-assistant.js';

afterEach(() => vi.useRealTimers());

function arrange() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  const initial: TextAssistantView = {
    id: 'synthetic-voice',
    revision: 0,
    phase: 'ready',
    operations: [],
    review: {
      version: 0,
      contentVersion: 1,
      changes: [],
      readyToSave: true,
      conflicts: [],
      unresolvedIdentities: [],
      pendingOperations: [],
    },
  };
  const channel = Object.assign(new EventEmitter(), { send: vi.fn() });
  const request = vi.fn(async (action?: string, _body?: unknown) =>
    action === 'messages' ? { ...initial, revision: 1, modelReply: 'Syntetiskt svar.' } : initial,
  );
  const work = voiceWork({
    channel: channel as unknown as LiveSideband,
    initial,
    request,
    response: vi.fn(),
    interrupt: vi.fn(),
    update: vi.fn(),
    failed: vi.fn(),
  });
  const fragment = (id: string, delta: string, start = 0, end = 100) =>
    channel.emit('session.input_transcript.delta', {
      event_id: id,
      delta,
      start_ms: start,
      end_ms: end,
    });
  const delegate = (id = 'delegation', offset = 100) =>
    channel.emit('session.delegation.created', {
      offset_ms: offset,
      delegation: { id, target: 'client' },
    });
  const messages = () => request.mock.calls.filter(([action]) => action === 'messages');
  return { work, fragment, delegate, messages };
}

test('late correction after quiet threshold arrives after prefix dispatch', async () => {
  const { fragment, delegate, messages, work } = arrange();
  fragment('prefix', 'Spara');
  delegate();
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Spara' });
  fragment('late-correction', ' inte. Läs bara utkastet.', 100, 1500);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Spara' });
  work.retire();
});

test('new post-expiry instruction can join old pending instruction', async () => {
  const { fragment, delegate, messages, work } = arrange();
  // Ordinary expiry is conceptually +500ms. voiceWork has no such input.
  fragment('before-expiry', 'Läs utkastet.');
  delegate();
  await vi.advanceTimersByTimeAsync(1000);
  fragment('after-expiry', ' Spara sedan allt.', 1000, 1500);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Läs utkastet. Spara sedan allt.' });
  work.retire();
});

test('same event and delegation IDs deduplicate while collecting', async () => {
  const { fragment, delegate, messages, work } = arrange();
  fragment('same-event', 'Läs utkastet.');
  fragment('same-event', 'Läs utkastet.');
  delegate();
  delegate();
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Läs utkastet.' });
  work.retire();
});

test('identical text with a different event ID is fresh input', async () => {
  const { fragment, delegate, messages, work } = arrange();
  fragment('first-id', 'Läs.');
  fragment('different-id', 'Läs.');
  delegate();
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()[0][1]).toMatchObject({ text: 'Läs.Läs.' });
  work.retire();
});

test('active microphone without any transcript creates no backend task', async () => {
  const { delegate, messages, work } = arrange();
  work.activity(true);
  delegate();
  await vi.advanceTimersByTimeAsync(5000);
  expect(messages()).toEqual([]);
  work.retire();
});

test('delegation offset does not exclude later pending fragments', async () => {
  const { fragment, delegate, messages, work } = arrange();
  fragment('first', 'Läs.', 0, 100);
  fragment('later', ' Spara.', 5000, 5500);
  delegate('early-offset', 100);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()[0][1]).toMatchObject({ text: 'Läs. Spara.' });
  work.retire();
});

test('retirement stops collecting and prevents later task creation', async () => {
  const { fragment, delegate, messages, work } = arrange();
  fragment('prefix', 'Spara');
  delegate();
  await vi.advanceTimersByTimeAsync(500);
  work.retire();
  fragment('late', ' allt.', 100, 500);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toEqual([]);
});
