import { EventEmitter } from 'node:events';
import { afterEach, expect, test, vi } from 'vitest';
import type { LiveSideband } from '../../../src/server/live-provider.js';
import { voiceWork } from '../../../src/server/voice-work.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';

afterEach(() => vi.useRealTimers());

test.each(['receipt', 'answer', 'stopped'])(
  'new speech during the delivery wait preserves only a current verified save: %s',
  { tags: ['technical'] },
  async (variant) => {
    vi.useFakeTimers();
    const initial: TextAssistantView = {
      id: 'save-delivery',
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
    const view: TextAssistantView = {
      ...initial,
      revision: 1,
      modelReply: 'Old answer',
      questionPending: true,
      saveCheck: { id: 'old-check', reply: 'Old save check', operations: [] },
      ...(variant === 'answer'
        ? {}
        : {
            receipt: {
              operationId: 'verified-operation',
              householdId: 'home',
              userId: 'alex',
              draftVersion: 1,
              contentVersion: 2,
              savedAt: '2026-10-11T10:00:00Z',
              changes: [],
            },
          }),
    };
    const send = vi.fn();
    const channel = Object.assign(new EventEmitter(), { send });
    const response = vi.fn();
    const update = vi.fn();
    const work = voiceWork({
      channel: channel as unknown as LiveSideband,
      initial,
      response,
      update,
      failed: vi.fn(),
      interrupt: vi.fn(),
      request: async (action) => (action === 'messages' ? view : initial),
    });
    const speech = (id: string) =>
      channel.emit('session.input_transcript.delta', {
        event_id: id,
        delta: id === 'first' ? 'Spara.' : 'Nästa fråga.',
        start_ms: 0,
        end_ms: 100,
      });
    speech('first');
    channel.emit('session.delegation.created', {
      offset_ms: 100,
      delegation: { id: 'save-task', target: 'client' },
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(send).not.toHaveBeenCalled();
    speech('next');
    if (variant === 'stopped') await work.stop();
    await vi.advanceTimersByTimeAsync(50);
    if (variant === 'receipt') {
      expect(send).toHaveBeenCalledExactlyOnceWith({
        type: 'session.commentary.append',
        delegation_id: 'save-task',
        content: 'Sparat.',
      });
      expect(response).toHaveBeenCalledExactlyOnceWith({
        id: 'save-delivery:1',
        revision: 1,
        text: 'Sparat.',
        questionPending: false,
        receiptOperationId: 'verified-operation',
      });
      expect(update).not.toHaveBeenCalled();
    } else {
      expect(send).not.toHaveBeenCalled();
      expect(response).not.toHaveBeenCalled();
    }
    expect(work.readyForSummary()).toBe(variant === 'stopped');
  },
);
