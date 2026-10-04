import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useConversation } from '../../../src/client/use-conversation.js';
import type { SaveReceipt } from '../../../src/shared/map.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('conversation receipt notifications skip historical saves and notify once for a fresh confirmed operation across replies and polls', async () => {
  vi.useFakeTimers();
  const receipt = (operationId: string): SaveReceipt => ({
    operationId,
    householdId: 'linden',
    userId: 'alex',
    draftVersion: 1,
    contentVersion: 1,
    savedAt: '2026-10-03T10:00:00Z',
    changes: [],
  });
  let current: TextAssistantView = {
    id: 'conversation',
    revision: 0,
    phase: 'ready',
    operations: [],
    receipt: receipt('historical'),
    review: {
      version: 1,
      contentVersion: 1,
      changes: [],
      conflicts: [],
      unresolvedIdentities: [],
      pendingOperations: [],
      readyToSave: true,
    },
  };
  const confirmed = vi.fn();
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url === '/api/households/linden/text-assistant' && init?.method !== 'POST')
      return Response.json({ available: true });
    if (url.endsWith('/conversation-consent')) return Response.json({ saved: null });
    return Response.json(current);
  });
  const { result } = renderHook(() =>
    useConversation({
      householdId: 'linden',
      onMapChange: () => {},
      onSaveConfirmed: confirmed,
      onAccessLost: () => {},
      onSelectItem: async () => false,
    }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.begin('text'));
  await act(async () => result.current.approve(false));
  expect(result.current.session?.receipt?.operationId).toBe('historical');
  expect(confirmed).not.toHaveBeenCalled();

  current = {
    ...current,
    revision: 1,
    phase: 'working',
    receipt: receipt('fresh'),
    completedReplies: [
      { id: 'old', source: 'text', text: '', receipt: receipt('historical') },
      { id: 'new', source: 'text', text: '', receipt: receipt('fresh') },
    ],
  };
  act(() => result.current.setText('Spara hela utkastet.'));
  await act(async () => result.current.send());
  expect(confirmed).toHaveBeenCalledExactlyOnceWith('fresh');
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(confirmed).toHaveBeenCalledExactlyOnceWith('fresh');
});
