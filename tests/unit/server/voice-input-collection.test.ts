import { EventEmitter } from 'node:events';
import { afterEach, expect, test, vi } from 'vitest';
import type { LiveSideband } from '../../../src/server/live-provider.js';
import { voiceWork } from '../../../src/server/voice-work.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';

afterEach(() => {
  vi.useRealTimers();
});

function arrange(confirmBrowserInput = false) {
  vi.useFakeTimers();
  const initial: TextAssistantView = {
    id: 'collect-voice',
    revision: 0,
    phase: 'ready',
    operations: [],
    review: {
      version: 1,
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
    action === 'messages' ? { ...initial, revision: 1, modelReply: 'Hela svaret.' } : initial,
  );
  const response = vi.fn();
  const delivered = vi.fn();
  const work = voiceWork({
    channel: channel as unknown as LiveSideband,
    initial,
    request,
    response,
    confirmBrowserInput,
    delivered,
    update: vi.fn(),
    interrupt: vi.fn(),
    failed: vi.fn(),
  });
  const fragment = (id: string, delta: string, start: number, end: number) =>
    channel.emit('session.input_transcript.delta', {
      event_id: id,
      delta,
      start_ms: start,
      end_ms: end,
    });
  const delegate = (id = 'task', offset = 9400) =>
    channel.emit('session.delegation.created', {
      offset_ms: offset,
      delegation: { id, target: 'client' },
    });
  const messages = () => request.mock.calls.filter(([action]) => action === 'messages');
  return { work, fragment, delegate, messages, response, channel, initial, delivered };
}

test.each(['timeout', 'error'] as const)(
  'typed reply survives thinking %s and unblocks only its context handoff',
  {
    tags: ['technical'],
  },
  (failure) => {
    const { work, channel, initial, delivered } = arrange();
    const reply = { id: 'typed', text: 'Hela textsvaret.', source: 'text' as const, revision: 1 };
    const view = { ...initial, revision: 1, completedReplies: [reply] };
    work.answer(view);
    expect(delivered).not.toHaveBeenCalled();
    expect(work.readyForSummary()).toBe(false);
    const parts = channel.send.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'session.thinking.append');
    work.activity(true);
    if (failure === 'timeout') vi.advanceTimersByTime(10_000);
    else channel.emit('error', { error: { client_event_id: parts[0].event_id } });
    expect(delivered).toHaveBeenCalledExactlyOnceWith({ id: reply.id, voiced: false });
    expect(view.completedReplies).toEqual([reply]);
    // A failed transport wait cannot bypass active microphone/input safeguards.
    expect(work.readyForSummary()).toBe(false);
    work.activity(false);
    expect(work.readyForSummary()).toBe(true);
    for (const part of parts)
      channel.emit('session.thinking.appended', { client_event_id: part.event_id });
    work.answer(view);
    expect(delivered).toHaveBeenCalledTimes(1);
    expect(
      channel.send.mock.calls.every(([event]) => event.type === 'session.thinking.append'),
    ).toBe(true);
    work.retire();
  },
);

test('a typed reply becomes voiced only after acknowledgement and preceding speech finish', {
  tags: ['technical'],
}, () => {
  const { work, channel, initial, delivered } = arrange();
  work.speaker(true);
  work.answer({
    ...initial,
    revision: 1,
    completedReplies: [{ id: 'typed', text: 'Svar.', source: 'text', revision: 1 }],
  });
  for (const [event] of [...channel.send.mock.calls])
    if (event.type === 'session.thinking.append')
      channel.emit('session.thinking.appended', { client_event_id: event.event_id });
  expect(delivered).not.toHaveBeenCalled();
  expect(work.readyForSummary()).toBe(false);
  work.speaker(false);
  expect(channel.send.mock.lastCall?.[0].type).toBe('session.instructions.append');
  expect(delivered).toHaveBeenCalledExactlyOnceWith({ id: 'typed', voiced: true });
  expect(work.readyForSummary()).toBe(true);
  work.retire();
});

test('a delegation inside a word waits for the late suffix and delivers the complete answer', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages, response, channel } = arrange();
  work.activity(true);
  fragment('prefix', 'Betala med hushållsk', 9400, 9600);
  delegate();
  await vi.advanceTimersByTimeAsync(323);
  expect(messages()).toEqual([]);
  fragment('suffix', 'ortet.', 9600, 9800);
  await vi.advanceTimersByTimeAsync(2500);
  expect(messages()).toEqual([]);
  expect(work.readyForSummary()).toBe(false);
  work.rendered({ revision: 0, draftVersion: 2, contentVersion: 1 });
  work.activity(false);
  await vi.advanceTimersByTimeAsync(1999);
  expect(messages()).toEqual([]);
  await vi.advanceTimersByTimeAsync(101);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({
    text: 'Betala med hushållskortet.',
    revision: 0,
    draftVersion: 1,
    contentVersion: 1,
  });
  expect(response).toHaveBeenCalledOnce();
  expect(response.mock.calls[0][0].text).toBe('Utkast: 0 osparade förslag.\nHela svaret.');
  expect(work.readyForSummary()).toBe(false);
  const parts = channel.send.mock.calls
    .map(([event]) => event)
    .filter((event) => event.type === 'session.thinking.append');
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts)
    channel.emit('session.thinking.appended', { client_event_id: part.event_id });
  expect(work.readyForSummary()).toBe(true);
});

test('a delayed browser interruption preserves the first words and delegation of the correction', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages } = arrange(true);
  fragment('old', 'Rätta namnet.', 0, 100);
  delegate('old', 100);
  fragment('first-word', 'Jag ', 1200, 1300);
  fragment('correction', 'menar Lo.', 1300, 1500);
  delegate('corrected', 1500);
  expect(work.confirmInput(1)).toBe(3);
  await vi.advanceTimersByTimeAsync(3500);
  expect(messages()).toEqual([]);
  await work.interruptSpeech(100);
  work.confirmInput(3);
  await vi.advanceTimersByTimeAsync(100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Jag menar Lo.' });
  work.retire();
});

test.each([true, false])(
  'interruption restarts collection after filtering every fragment: correction=%s',
  { tags: ['technical'] },
  async (correction) => {
    const { work, fragment, delegate, messages } = arrange();
    fragment('old', 'Spara.', 0, 100);
    delegate('correction', 190);
    await work.interruptSpeech(100);
    if (correction) fragment('new', 'Läs bara.', 120, 190);
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages().map(([, body]) => body)).toEqual(
      correction ? [expect.objectContaining({ text: 'Läs bara.' })] : [],
    );
    work.retire();
  },
);

test.each([
  { delegatedAt: 1500, delayedOld: false, dispatched: true },
  { delegatedAt: 1500, delayedOld: true, dispatched: true },
  { delegatedAt: 100, delayedOld: false, dispatched: false },
  { delegatedAt: 1100, delayedOld: false, dispatched: false },
])(
  'a delegation reaches the sideband before interruption (offset $delegatedAt, delayed old delegation $delayedOld)',
  { tags: ['technical'] },
  async ({ delegatedAt, delayedOld, dispatched }) => {
    const { work, fragment, delegate, messages, channel } = arrange(true);
    fragment('old', 'Spara hela utkastet.', 0, 100);
    delegate('old-task', 100);
    delegate('before-transcript', delegatedAt);
    if (delayedOld) delegate('delayed-old-task', 100);
    delegate('before-transcript', delegatedAt);
    await work.interruptSpeech(100);
    fragment('first-word', 'Jag ', 1200, 1300);
    fragment('correction', 'menar Lo.', 1300, 1500);
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages()).toEqual([]);
    work.confirmInput(3);
    await vi.advanceTimersByTimeAsync(100);
    if (!dispatched) {
      expect(messages()).toEqual([]);
      delegate('corrected', 1500);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(messages()).toHaveLength(1);
    expect(messages()[0][1]).toMatchObject({ text: 'Jag menar Lo.' });
    expect(channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session.thinking.append',
        delegation_id: dispatched ? 'before-transcript' : 'corrected',
      }),
    );
    work.retire();
  },
);

test('a delegation for a correction can arrive before any of its transcript deltas', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages } = arrange(true);
  await work.interruptSpeech(100);
  delegate('corrected', 1500);
  await vi.advanceTimersByTimeAsync(300);
  expect(messages()).toEqual([]);
  expect(work.readyForSummary()).toBe(false);
  fragment('first-word', 'Jag ', 1200, 1300);
  fragment('correction', 'menar Lo.', 1300, 1500);
  work.confirmInput(2);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Jag menar Lo.' });
  work.retire();
});

test.each([
  { order: 'interrupt first', offset: 1500, delay: 300, forwarded: true },
  { order: 'transcript first', offset: 1500, delay: 1500, forwarded: true },
  { order: 'transcript first', offset: 1500, delay: 3500, forwarded: true },
  { order: 'transcript first', offset: 1100, delay: 3500, forwarded: false },
  { order: 'interrupt first', offset: 100, delay: 300, forwarded: false },
  { order: 'no interruption', offset: 1500, delay: 300, forwarded: false },
  { order: 'interrupt first', offset: 1500, delay: 2100, forwarded: false },
] as const)(
  'an empty delegation can collect a correction only after its interruption (order $order, offset $offset, delay $delay)',
  { tags: ['technical'] },
  async ({ order, offset, delay, forwarded }) => {
    const { work, fragment, delegate, messages, channel } = arrange(true);
    fragment('old', 'Läs kartan.', 0, 100);
    delegate('old-task', 100);
    work.confirmInput(1);
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages()).toHaveLength(1);
    delegate('early', offset);
    const correction = () => {
      fragment('first-word', 'Jag ', 1200, 1300);
      fragment('correction', 'menar Lo.', 1300, 1500);
    };
    if (order === 'transcript first') correction();
    await vi.advanceTimersByTimeAsync(delay);
    if (order !== 'no interruption') await work.interruptSpeech(100);
    if (order !== 'transcript first') correction();
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages()).toHaveLength(1);
    work.confirmInput(3);
    await vi.advanceTimersByTimeAsync(100);
    if (!forwarded) {
      expect(messages()).toHaveLength(1);
      delegate('proper', 1500);
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(messages()).toHaveLength(2);
    expect(messages()[1][1]).toMatchObject({ text: 'Jag menar Lo.' });
    if (forwarded) {
      expect(channel.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'session.commentary.append', delegation_id: 'early' }),
      );
    }
    work.retire();
  },
);

test.each(['next interrupt', 'normal speech', 'replayed cutoff'] as const)(
  'a new empty delegation after a correction is not activated by the prior cutoff: %s',
  { tags: ['technical'] },
  async (next) => {
    const { work, fragment, delegate, messages, response, channel } = arrange(true);
    await work.interruptSpeech(100);
    delegate('first-delegation', 500);
    fragment('first-correction', 'Jag menar Lo.', 200, 500);
    work.confirmInput(1);
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages()).toHaveLength(1);
    delegate('second-delegation', 4000);
    delegate('old-duplicate', 100);
    fragment('second-correction', 'Jag menar Alex.', 3200, 4000);
    await vi.advanceTimersByTimeAsync(3500);
    expect(messages()).toHaveLength(1);
    if (next === 'next interrupt') await work.interruptSpeech(3000);
    if (next === 'replayed cutoff') await work.interruptSpeech(100);
    work.confirmInput(2);
    await vi.advanceTimersByTimeAsync(100);
    if (next !== 'next interrupt') {
      expect(messages()).toHaveLength(1);
      delegate('proper', 4000);
      await vi.advanceTimersByTimeAsync(100);
    }
    delegate('second-delegation', 4000);
    await vi.advanceTimersByTimeAsync(2100);
    expect(messages().map(([, body]) => body)).toEqual([
      expect.objectContaining({ text: 'Jag menar Lo.' }),
      expect.objectContaining({ text: 'Jag menar Alex.' }),
    ]);
    const interruptions = next === 'next interrupt' ? 2 : 1;
    expect(response.mock.calls.filter(([value]) => value === undefined)).toHaveLength(
      interruptions,
    );
    expect(
      channel.send.mock.calls.filter(([event]) => event.content?.startsWith('Stop speaking')),
    ).toHaveLength(interruptions);
    work.retire();
  },
);

test('a written correction also ends the previous early voice correction window', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages, initial } = arrange(true);
  await work.interruptSpeech(100);
  work.answer({
    ...initial,
    revision: 1,
    completedReplies: [
      { id: 'typed-correction', revision: 1, source: 'text', text: 'Jag förstår.' },
    ],
  });
  delegate('later-empty-delegation', 4000);
  fragment('later-speech', 'Vad finns i utkastet?', 3200, 4000);
  work.confirmInput(1);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toEqual([]);
  delegate('proper', 4000);
  await vi.advanceTimersByTimeAsync(100);
  expect(messages()[0][1]).toMatchObject({ text: 'Vad finns i utkastet?' });
  work.retire();
});

test('an empty browser delegation requests fresh speech once without collecting work', {
  tags: ['technical'],
}, async () => {
  const { work, delegate, messages, channel } = arrange(true);
  delegate('empty', 100);
  delegate('empty', 100);
  expect(work.readyForSummary()).toBe(true);
  expect(channel.send).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toEqual([]);
  expect(channel.send).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      type: 'session.commentary.append',
      delegation_id: 'empty',
      content: expect.stringContaining('Be om ett nytt tydligt uppdrag.'),
    }),
  );
  work.retire();
});

test('a correction delegation expires when its transcript does not arrive', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages } = arrange(true);
  fragment('old', 'Rätta namnet.', 0, 100);
  delegate('before-transcript', 1500);
  await work.interruptSpeech(100);
  expect(work.readyForSummary()).toBe(false);
  await vi.advanceTimersByTimeAsync(2100);
  expect(work.readyForSummary()).toBe(true);
  fragment('new', 'Vad finns i utkastet?', 4000, 4600);
  work.confirmInput(2);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toEqual([]);
  delegate('new-question', 4600);
  await vi.advanceTimersByTimeAsync(100);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Vad finns i utkastet?' });
  work.retire();
});

test('continued speech and repeated delegations form one complete task without reusing its approval', {
  tags: ['technical'],
}, async () => {
  const { fragment, delegate, messages, response } = arrange();
  fragment('first', 'Spara', 0, 200);
  delegate('first', 200);
  await vi.advanceTimersByTimeAsync(1500);
  fragment('correction', ' inte. Läs bara utkastet.', 200, 1200);
  delegate('second', 1200);
  delegate('second', 1200);
  await vi.advanceTimersByTimeAsync(1999);
  expect(messages()).toEqual([]);
  await vi.advanceTimersByTimeAsync(101);
  expect(messages()).toHaveLength(1);
  expect(messages()[0][1]).toMatchObject({ text: 'Spara inte. Läs bara utkastet.' });
  expect(response).toHaveBeenCalledOnce();
  delegate('empty', 1200);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toHaveLength(1);
});

test('an empty delegation consumes whitespace without creating work or blocking a summary', {
  tags: ['technical'],
}, async () => {
  const { work, fragment, delegate, messages } = arrange();
  fragment('empty', ' ', 0, 100);
  delegate('empty', 100);
  await vi.advanceTimersByTimeAsync(2100);
  expect(messages()).toEqual([]);
  expect(work.readyForSummary()).toBe(true);
});

test.each(['stop', 'retire'] as const)(
  '%s while collecting speech prevents any backend task or late answer',
  { tags: ['technical'] },
  async (action) => {
    const { work, fragment, delegate, messages, response } = arrange();
    fragment('first', 'Spara', 0, 200);
    delegate('first', 200);
    await vi.advanceTimersByTimeAsync(323);
    await work[action]();
    fragment('late', ' allt.', 200, 400);
    await vi.advanceTimersByTimeAsync(2500);
    expect(messages()).toEqual([]);
    expect(response).not.toHaveBeenCalled();
    expect(work.readyForSummary()).toBe(true);
  },
);
