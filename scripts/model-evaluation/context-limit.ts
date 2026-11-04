import { createHash, randomUUID } from 'node:crypto';
import type { AssistantObservation } from '../../src/server/assistant-observation.js';
import type { TextAssistantView } from '../../src/shared/text-assistant.js';
import type { createInstallation } from '../../tests/support/installation.js';
import { evaluationEnvironment } from './environment.js';
import { modelActions } from './observations.js';
import type { RunOptions } from './runner.js';

export type ContextTurn = {
  outcome: 'pass' | 'fail' | 'error' | 'aborted' | 'inconclusive' | 'not_run';
  generation: number;
  inputTokens: number | null;
  summary: boolean;
  callIds?: string[];
  fixed?: string[];
};

/** Ordinary messages, each within the public 4,000-character input limit.
 * No injected history, output-limit reduction or forced summary is permitted.
 * Distinct numbered records prevent a repeated word from standing for realistic
 * context growth. The sentinel is deliberately outside the final short tail. */
export function contextLimitFixture(maximumTurns = 2048) {
  if (!Number.isSafeInteger(maximumTurns) || maximumTurns < 1 || maximumTurns > 4096)
    throw new Error('evaluation_context_growth_bound_invalid');
  const seed =
    'Vi diskuterar hushållets planering. Kodordet för denna diskussion är björklöv 731. ' +
    'Behåll kodordet i samtalet. Ändra inget och spara inget.';
  const growth = Array.from({ length: maximumTurns }, (_, index) => {
    const rows = Array.from(
      { length: 64 },
      (_, row) => `Planeringsrad ${index + 1}.${row + 1}: diskussion om vardag, tider och utrymme.`,
    ).join('\n');
    return `Detta är endast diskussionsunderlag. Ändra inget och spara inget.\n${rows}`.slice(
      0,
      3900,
    );
  });
  const recall =
    'Vilket kodord angav jag i början av diskussionen? Svara med hela kodordet. ' +
    'Ändra inget och spara inget.';
  const value = { format: 'skyttel-context-growth-v1', seed, growth, recall };
  return { ...value, sha256: createHash('sha256').update(JSON.stringify(value)).digest('hex') };
}

/** The concrete application adapter uses the normal authenticated message route,
 * real isolated SQLite/MCP and the selected committed application. It never
 * installs historical posts or invokes summarizeForEvaluation. Paid transports,
 * their shared ledger, calibration and private recording belong to the caller. */
export async function runApplicationContextLimit(
  installationOptions: Parameters<typeof createInstallation>[1],
  options: RunOptions & {
    origin: 'provider' | 'controlled';
    contextTokens: number;
    maximumTurns?: number;
  },
) {
  const fixture = contextLimitFixture(options.maximumTurns);
  const scenario = {
    id: 'actual-context-growth',
    title: 'Ordinary context growth',
    voice: false,
    group: 'long_conversation' as const,
    steps: [],
  };
  const events: AssistantObservation[] = [];
  const environment = await evaluationEnvironment(
    scenario,
    {
      ...installationOptions,
      observe: (event) => {
        events.push(event);
        options.recordObservation?.(event);
        installationOptions?.observe?.(event);
      },
    },
    options.application,
  );
  let sequence = 0;
  try {
    return await runContextLimit(fixture, {
      origin: options.origin,
      contextTokens: options.contextTokens,
      submit: async (text, stage) => {
        if (options.stopped?.())
          return { outcome: 'not_run', generation: 0, inputTokens: null, summary: false };
        const before = new Set(options.providerRecords?.().map((call) => call.id) ?? []);
        const offset = events.length;
        const step = {
          id: `context-${stage}-${sequence++}`,
          text,
          expected: {
            requirements: stage === 'recall' ? ['Svaret anger hela kodordet björklöv 731.'] : [],
          },
        };
        options.beginStep?.(0, {
          scenario: scenario.id,
          step: step.id,
          modality: 'text',
          repetition: options.repetition,
          applicationVersion: options.application?.id,
        });
        try {
          let view = await environment.get<TextAssistantView>(environment.path);
          const requestId = randomUUID();
          await environment.post(`${environment.path}/messages`, {
            requestId,
            revision: view.revision,
            draftVersion: view.review.version,
            contentVersion: view.review.contentVersion,
            text,
          });
          for (;;) {
            view = await environment.get<TextAssistantView>(
              `${environment.path}/messages/${requestId}`,
            );
            if (view.taskStatus === 'completed' || view.error) break;
            if (['canceled', 'expired'].includes(view.taskStatus ?? '') || options.stopped?.()) {
              await environment.post(`${environment.path}/cancel`, {
                revision: view.revision,
                all: true,
              });
              return {
                outcome: 'aborted',
                generation: view.contextGeneration ?? 0,
                inputTokens: null,
                summary: false,
              };
            }
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          const fixed = await environment.check(step, view, modelActions(events.slice(offset)));
          const calls = options.providerRecords?.().filter((call) => !before.has(call.id)) ?? [];
          const inputs = calls.flatMap((call) => {
            const input = (call.response?.usage as { input_tokens?: number } | undefined)
              ?.input_tokens;
            return Number.isSafeInteger(input) && Number(input) >= 0 ? [Number(input)] : [];
          });
          let outcome: ContextTurn['outcome'] = fixed.length || view.error ? 'fail' : 'pass';
          if (stage === 'recall' && outcome === 'pass') {
            const content = await options.judge?.({
              context: environment.judgeContext(step, fixed),
              sources: {
                backend: {
                  text: [view.reply, view.modelReply].filter(Boolean).join('\n'),
                  complete: true,
                },
              },
              requirements: [
                { id: 'context-recall', source: 'backend', text: step.expected.requirements[0] },
              ],
            });
            outcome =
              content?.length === 1 && content[0].id === 'context-recall'
                ? content[0].outcome === 'pass'
                  ? 'pass'
                  : content[0].outcome === 'fail'
                    ? 'fail'
                    : 'inconclusive'
                : 'inconclusive';
          }
          return {
            outcome,
            generation: view.contextGeneration ?? 0,
            inputTokens: inputs.length ? Math.max(...inputs) : null,
            summary: calls.some((call) => call.kind === 'summary'),
            callIds: calls.map((call) => call.id),
            fixed,
          };
        } catch {
          return {
            outcome: options.stopped?.() ? 'aborted' : 'error',
            generation: 0,
            inputTokens: null,
            summary: false,
          };
        }
      },
    });
  } finally {
    await environment.close();
  }
}

/** Bounded preparation seam. The adapter submits ordinary application input
 * and supplies observed completed-request usage and public context generation.
 * Growth stops at the first summary or generation increase, with at most one recall.
 * Low or missing usage identifies application configuration preemption only.
 * This detects the application's effective boundary; the physical provider
 * maximum remains a separate unverified claim. */
export async function runContextLimit(
  fixture: ReturnType<typeof contextLimitFixture>,
  options: {
    origin: 'provider' | 'controlled';
    contextTokens: number;
    submit: (text: string, stage: 'seed' | 'growth' | 'recall') => Promise<ContextTurn>;
  },
) {
  if (!Number.isSafeInteger(options.contextTokens) || options.contextTokens <= 0)
    throw new Error('evaluation_context_capacity_invalid');
  const turns: (ContextTurn & { stage: 'seed' | 'growth' | 'recall' })[] = [];
  let maximumInput = 0;
  let previousGeneration: number | undefined;
  let boundary = 'inconclusive';
  let reason = 'growth_bound_reached_without_measured_boundary';
  for (const [index, text] of [fixture.seed, ...fixture.growth].entries()) {
    const stage = index ? 'growth' : 'seed';
    const turn = await options.submit(text, stage);
    turns.push({ ...turn, stage });
    if (turn.outcome !== 'pass') {
      reason = `terminal_turn_${turn.outcome}`;
      break;
    }
    if (Number.isSafeInteger(turn.inputTokens) && Number(turn.inputTokens) >= 0)
      maximumInput = Math.max(maximumInput, Number(turn.inputTokens));
    const transitioned = previousGeneration !== undefined && turn.generation > previousGeneration;
    if (turn.summary || transitioned) {
      const recall = await options.submit(fixture.recall, 'recall');
      turns.push({ ...recall, stage: 'recall' });
      const measuredCapacity = maximumInput >= options.contextTokens * 0.95;
      boundary =
        recall.outcome === 'pass'
          ? measuredCapacity
            ? 'application_boundary'
            : 'configuration_limited'
          : 'inconclusive';
      reason =
        recall.outcome === 'pass'
          ? measuredCapacity
            ? 'natural_application_transition_after_measured_growth'
            : 'natural_application_transition_before_measured_capacity'
          : 'recall_not_verified_after_application_transition';
      break;
    }
    previousGeneration = turn.generation;
  }
  return {
    fixtureSha256: fixture.sha256,
    origin: options.origin,
    boundary,
    physicalProviderMaximum: 'unverified',
    reason,
    turns,
    successfulCompletionMs: null as number | null,
  };
}
