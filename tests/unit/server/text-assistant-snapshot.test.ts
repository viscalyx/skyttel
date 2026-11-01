import { expect, test } from 'vitest';
import {
  captureAssistantResult,
  restoreAssistantResult,
} from '../../../src/server/text-assistant-snapshot.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';

function view(): TextAssistantView {
  return {
    id: 'conversation',
    revision: 0,
    phase: 'ready',
    review: {
      version: 0,
      contentVersion: 1,
      changes: [],
      readyToSave: false,
      conflicts: [],
      unresolvedIdentities: [],
      pendingOperations: [],
    },
    operations: [],
    tasks: [],
    completedReplies: [],
  };
}

/** Count actual reachable array slots, sharing each container only once. */
function retainedArrayEntries(roots: object[]) {
  const seen = new Set<object>();
  let entries = 0;
  function visit(value: unknown) {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) entries += value.length;
    for (const child of Object.values(value)) visit(child);
  }
  for (const root of roots) visit(root);
  return entries;
}

test('retained completion metadata stays linear at 10, 20 and 40 turns, including repeated old reads', () => {
  const current = view();
  const results: ReturnType<typeof captureAssistantResult>[] = [];
  const counts: number[] = [];
  for (let turn = 1; turn <= 40; turn++) {
    current.revision = turn;
    current.modelReply = `Answer ${turn}`;
    current.tasks?.push({ id: `turn-${turn}`, receivedAt: 0, deadline: 1, status: 'completed' });
    current.completedReplies?.push({ id: `turn-${turn}`, text: `Answer ${turn}` });
    results.push(captureAssistantResult(current, 'prefix'));
    if ([10, 20, 40].includes(turn)) {
      const roots = [results, current.completedReplies ?? []];
      const before = retainedArrayEntries(roots);
      for (let read = 0; read < 3; read++) {
        const first = restoreAssistantResult(results[0], current);
        expect(first.completedReplies).toEqual([{ id: 'turn-1', text: 'Answer 1' }]);
        expect(first.modelReply).toBe('Answer 1');
        expect(first.tasks).toHaveLength(turn);
      }
      expect(retainedArrayEntries(roots)).toBe(before);
      counts.push(before);
    }
  }
  // One shared reply array and one fixed-size result per turn; no triangular histories.
  expect(counts).toEqual([20, 40, 80]);
});

test.each(['canceled', 'expired'] as const)(
  '%s snapshots preserve their outcome and live reply history without retaining history containers',
  (status) => {
    const current = view();
    current.taskStatus = status;
    current.phase = 'error';
    current.error = status === 'expired' ? 'assistant_task_expired' : undefined;
    current.canceled = status === 'canceled';
    current.reply = 'Original outcome';
    const snapshot = captureAssistantResult(current, 'live');
    const before = retainedArrayEntries([snapshot]);
    current.completedReplies?.push({ id: 'later', text: 'Later answer' });
    current.tasks?.push({ id: 'later', receivedAt: 0, deadline: 1, status: 'working' });
    current.reply = 'Changed outcome';
    const restored = restoreAssistantResult(snapshot, current);
    expect(restored).toMatchObject({
      taskStatus: status,
      phase: 'error',
      reply: 'Original outcome',
      completedReplies: [{ id: 'later', text: 'Later answer' }],
      tasks: [{ id: 'later', status: 'working' }],
    });
    expect(retainedArrayEntries([snapshot])).toBe(before);
  },
);
