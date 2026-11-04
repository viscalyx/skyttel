import { isDeepStrictEqual } from 'node:util';
import type { AssistantObservation } from '../../src/server/assistant-observation.js';
import type { TextAssistantView } from '../../src/shared/text-assistant.js';
import type { Attempt, Expected, ScenarioStep } from './types.js';

export function validateUserStop(step: ScenarioStep) {
  if (!step.userStop) return;
  if (
    step.transition ||
    !step.text ||
    step.userStop.trigger !== 'first-working-after-input' ||
    !Number.isSafeInteger(step.userStop.maximumObservationMs) ||
    step.userStop.maximumObservationMs < 1 ||
    step.userStop.maximumObservationMs > 10000 ||
    !step.userStop.allowedStates.length ||
    step.userStop.allowedStates.some((state) => state.requirements.length > 0)
  )
    throw new Error('evaluation_user_stop_contract_invalid');
}

export function missedUserStop(): NonNullable<Attempt['scriptedStop']> {
  return {
    contract: 'public-user-stop-v1',
    verdict: 'inconclusive',
    trigger: 'first-working-after-input',
    stateFailures: [],
    endpointMs: null,
    reason: 'working_boundary_missed',
    limitation: 'A completed task cannot establish the declared early Stop boundary.',
  };
}

/** Only public conversation controls can stop the app. The finite bound applies
 * to this scripted control observation, never to ordinary model processing.
 * Providers may keep unknown usage after cancellation; this function neither
 * settles charges nor clears the shared ledger stop. */
export async function executeUserStop(input: {
  step: ScenarioStep;
  view: TextAssistantView;
  origin: number;
  now?: () => number;
  cancel: () => Promise<TextAssistantView>;
  status: () => Promise<TextAssistantView>;
  check: (view: TextAssistantView, expected: Expected) => Promise<string[]>;
  events: () => AssistantObservation[];
  readState: () => Promise<unknown>;
  quiesceAudio?: () => Promise<void>;
}) {
  validateUserStop(input.step);
  const contract = input.step.userStop;
  if (!contract) throw new Error('evaluation_user_stop_contract_missing');
  const now = input.now ?? Date.now;
  const proof = missedUserStop();
  delete proof.reason;
  proof.requestedAt = now();
  proof.pendingAtStop = {
    batch: Boolean(input.view.batchPending),
    save: Boolean(input.view.saving),
    operationIds: input.view.operations.map((operation) => operation.operationId),
  };
  proof.limitation =
    'First observed working status after full input drain; polling can race with completed authorized batches. Only enumerated whole states are allowed. Provider settlement is observed, never inferred from cancellation; unknown billing retains its ledger hold. Renderer retirement establishes this instrumented output is closed, not physical audibility.';
  let view = await input.cancel();
  proof.acknowledgedAt = now();
  const acknowledgedEvents = input.events();
  const acknowledgmentOffset = acknowledgedEvents.length;
  const isMutation = (event: AssistantObservation) =>
    event.kind === 'mcp_started' && !/^(read_|search_)/.test((event.data as { name: string }).name);
  proof.admittedMutationSpans = acknowledgedEvents.filter(isMutation).map((event) => ({
    spanId: event.context?.toolExecutionId ?? event.context?.spanId ?? null,
    tool: (event.data as { name: string }).name,
    endedBeforeAcknowledgment: acknowledgedEvents.some(
      (end) =>
        Boolean(event.context?.spanId) &&
        end.context?.spanId === event.context?.spanId &&
        ['mcp_completed', 'mcp_failed'].includes(end.kind),
    ),
  }));
  proof.pendingAtAcknowledgment = { batch: Boolean(view.batchPending), save: Boolean(view.saving) };
  const acknowledgedState = await input.readState();
  proof.stateCapturedAt = now();
  if (input.quiesceAudio) {
    await input.quiesceAudio();
    proof.audioQuiescedAt = now();
  }
  const deadline = proof.requestedAt + contract.maximumObservationMs;
  for (;;) {
    view = await input.status();
    proof.terminalStatus = view.taskStatus;
    if (view.taskStatus === 'canceled') proof.terminalAt ??= now();
    const attempts = new Map<string, boolean>();
    for (const event of input.events()) {
      if (event.kind !== 'model_attempt') continue;
      const data = event.data as { attemptId?: string; endedAt?: number };
      if (data.attemptId) attempts.set(data.attemptId, data.endedAt !== undefined);
    }
    if (
      proof.terminalAt &&
      !view.saving &&
      !view.batchPending &&
      [...attempts.values()].every(Boolean)
    ) {
      proof.settledAt = now();
      break;
    }
    if (now() >= deadline) {
      proof.reason = 'stop_endpoint_observation_incomplete';
      return { proof, view };
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const checks = await Promise.all(
    contract.allowedStates.map((expected) => input.check(view, expected)),
  );
  const matched = checks.findIndex((failures) => failures.length === 0);
  if (matched < 0) {
    proof.verdict = 'fail';
    proof.stateFailures = [...new Set(checks.flat())];
    proof.reason = 'stop_state_outside_declared_atomic_outcomes';
  } else {
    proof.matchedState = matched;
    // A final independent public read after provider termination must preserve
    // that exact allowed endpoint; a late result cannot choose a different one.
    view = await input.status();
    proof.stateFailures = await input.check(view, contract.allowedStates[matched]);
    const finalState = await input.readState();
    const lateWork = input
      .events()
      .slice(acknowledgmentOffset)
      .some(
        (event) =>
          Boolean(event.taskId) &&
          (isMutation(event) ||
            (event.kind === 'model_attempt' &&
              (event.data as { endedAt?: number }).endedAt === undefined)),
      );
    if (lateWork) proof.stateFailures.push('new_task_work_after_stop_acknowledgment');
    if (!isDeepStrictEqual(finalState, acknowledgedState)) {
      if (proof.pendingAtAcknowledgment.batch || proof.pendingAtAcknowledgment.save) {
        proof.reason = 'registered_outcome_attribution_incomplete';
        return { proof, view };
      }
      proof.stateFailures.push('state_changed_after_stop_acknowledgment');
    }
    if (!view.canceled || view.queuedMessages || view.taskStatus !== 'canceled')
      proof.stateFailures.push('stop_not_terminal_or_queue_not_empty');
    proof.verdict = proof.stateFailures.length ? 'fail' : 'pass';
    proof.settledAt = now();
    if (proof.verdict === 'pass') {
      const end = Math.max(
        proof.settledAt,
        proof.acknowledgedAt,
        proof.terminalAt ?? 0,
        proof.audioQuiescedAt ?? 0,
      );
      proof.endpointMs = Math.max(0, end - input.origin);
      proof.controlMs = Math.max(0, end - proof.requestedAt);
    }
  }
  return { proof, view };
}
