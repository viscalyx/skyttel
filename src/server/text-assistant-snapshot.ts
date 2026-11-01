import type { TextAssistantView } from '../shared/text-assistant.js';

/** Task status is always current; completed turns retain only a reply-prefix index. */
export type AssistantResultSnapshot = {
  view: Omit<TextAssistantView, 'tasks' | 'completedReplies'>;
  completedReplyCount: number | undefined;
};

export function captureAssistantResult(
  current: TextAssistantView,
  history: 'prefix' | 'live',
): AssistantResultSnapshot {
  const { tasks: _tasks, completedReplies, ...view } = current;
  return {
    view,
    // Timer expiry and cancellation historically observe the live reply array.
    completedReplyCount: history === 'prefix' ? (completedReplies?.length ?? 0) : undefined,
  };
}

export function restoreAssistantResult(
  snapshot: AssistantResultSnapshot,
  current: Pick<TextAssistantView, 'tasks' | 'completedReplies'>,
): TextAssistantView {
  return {
    ...snapshot.view,
    tasks: current.tasks,
    completedReplies:
      snapshot.completedReplyCount === undefined
        ? current.completedReplies
        : (current.completedReplies ?? []).slice(0, snapshot.completedReplyCount),
  };
}
