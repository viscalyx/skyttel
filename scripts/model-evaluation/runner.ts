import { randomUUID } from 'node:crypto';
import type { AssistantObservation } from '../../src/server/assistant-observation.js';
import type { TextAssistantView } from '../../src/shared/text-assistant.js';
import type { createInstallation } from '../../tests/support/installation.js';
import rawCatalog from './catalog.json' with { type: 'json' };
import { evaluationEnvironment } from './environment.js';
import type { Attempt, Catalog, JudgeInput, JudgeResult, Scenario } from './types.js';

const catalog = rawCatalog as Catalog;
export type RunOptions = {
  profile: string;
  repetition: number;
  judge?: (input: JudgeInput) => Promise<JudgeResult>;
  record?: (attempt: Attempt) => Promise<void>;
  beginStep?: (audioMs?: number) => void;
  costs?: () => number | null;
  judgeCosts?: () => number | null;
  stopped?: () => boolean;
  summaryCountingVerified?: boolean;
};

export async function runTextScenario(
  scenario: Scenario,
  installationOptions: Parameters<typeof createInstallation>[1],
  options: RunOptions,
) {
  const events: AssistantObservation[] = [];
  const environment = await evaluationEnvironment(scenario, {
    ...installationOptions,
    observe: (event) => {
      events.push(structuredClone(event));
      installationOptions?.observe?.(event);
    },
  });
  const attempts: Attempt[] = [];
  let blocked: string | undefined;
  let summaryText = '';
  const attempt = (step: string): Attempt => ({
    scenario: scenario.id,
    step,
    profile: options.profile,
    repetition: options.repetition,
    modality: 'text',
    outcome: 'not_run',
    fixed: [],
    elapsedMs: null,
    backendCostUsd: 0,
  });
  try {
    for (const step of scenario.steps) {
      const result = attempt(step.id);
      if (blocked) {
        result.reason = `Dependent step not run: ${blocked}`;
      } else if (step.transition === 'summary' && !options.summaryCountingVerified) {
        result.reason =
          'Exact token counting support and fee are not verified; dependent summary is not runnable.';
        blocked = result.reason;
      } else {
        options.beginStep?.();
        const offset = events.length;
        const startedAt = Date.now();
        const costBefore = options.costs?.() ?? 0;
        const judgeBefore = options.judgeCosts?.() ?? 0;
        try {
          let view: TextAssistantView;
          let responseText: string;
          if (step.transition === 'summary') {
            const summarized = await environment.installation.summarizeForEvaluation(
              environment.assistant.id,
              catalog.summaryHistory,
            );
            if (!summarized.installed || !summarized.summary)
              throw new Error('evaluation_summary_installation_failed');
            if (
              summarized.retained.length !== 8 ||
              summarized.retained.some(
                (row) => !catalog.summaryHistory.some((fixture) => fixture.text === row.text),
              )
            )
              throw new Error('evaluation_summary_tail_invalid');
            summaryText = summarized.summary;
            view = summarized.view;
            responseText = summaryText;
          } else {
            view = await environment.get<TextAssistantView>(environment.path);
            const requestId = randomUUID();
            await environment.post(`${environment.path}/messages`, {
              requestId,
              revision: view.revision,
              draftVersion: view.review.version,
              contentVersion: view.review.contentVersion,
              text: step.text,
            });
            const deadline = startedAt + 180_000;
            for (;;) {
              view = await environment.get<TextAssistantView>(
                `${environment.path}/messages/${requestId}`,
              );
              if (view.selection) {
                const matches =
                  view.selection.kind === 'object' && view.selection.id === scenario.selection;
                await environment.post(`${environment.path}/selection`, {
                  revision: view.revision,
                  kind: view.selection.kind,
                  id: view.selection.id,
                  draftVersion: view.selection.draftVersion,
                  contentVersion: view.selection.contentVersion,
                  displayed: matches,
                });
                if (!matches) result.fixed.push('unexpected_selection');
              }
              if (view.taskStatus === 'completed' || view.taskStatus === 'canceled') break;
              if (Date.now() >= deadline || options.stopped?.()) {
                await environment.post(`${environment.path}/cancel`, {
                  revision: view.revision,
                  all: true,
                });
                throw new Error('evaluation_step_timeout');
              }
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
            responseText = [view.reply, view.modelReply].filter(Boolean).join('\n');
            if (scenario.selection && view.displayedSelection !== scenario.selection)
              result.fixed.push('selection_unconfirmed');
          }
          const finishedAt = Date.now();
          const observed = events.slice(offset);
          const actions = observed
            .filter((event) => event.kind === 'model_action')
            .map((event) => {
              const data = event.data as { name: string; arguments: string };
              const args = JSON.parse(data.arguments) as { completion?: string };
              return { name: data.name, completion: args.completion };
            });
          result.fixed.push(...(await environment.check(step, view, actions)));
          if (step.expected.requirements.length) {
            result.content = options.judge
              ? await options.judge({
                  context: JSON.stringify({
                    scenario: scenario.title,
                    request: step.text,
                    summary: summaryText,
                    fixed: result.fixed,
                  }),
                  sources: {
                    backend: {
                      text: responseText,
                      complete: !view.error && view.taskStatus !== 'canceled',
                    },
                  },
                  requirements: step.expected.requirements.map((text, index) => ({
                    id: `backend-${index}`,
                    source: 'backend',
                    text,
                  })),
                })
              : step.expected.requirements.map((_text, index) => ({
                  id: `backend-${index}`,
                  outcome: 'inconclusive',
                  reason: 'No content judge supplied.',
                }));
          }
          result.outcome =
            result.fixed.length || result.content?.some((item) => item.outcome === 'fail')
              ? 'fail'
              : result.content?.some((item) => item.outcome === 'inconclusive')
                ? 'inconclusive'
                : 'pass';
          result.elapsedMs = result.outcome === 'pass' ? finishedAt - startedAt : null;
          result.observedEndMs = finishedAt - startedAt;
          result.backendCostUsd = options.costs
            ? options.costs() === null
              ? null
              : (options.costs() ?? 0) - costBefore
            : 0;
          result.judgeCostUsd = options.judgeCosts
            ? options.judgeCosts() === null
              ? null
              : (options.judgeCosts() ?? 0) - judgeBefore
            : 0;
        } catch (error) {
          result.outcome = 'error';
          result.reason = error instanceof Error ? error.message : 'evaluation_step_failed';
          result.observedEndMs = Date.now() - startedAt;
          const costAfter = options.costs?.();
          result.backendCostUsd = costAfter == null ? null : costAfter - costBefore;
        }
        if (result.outcome !== 'pass') blocked = `${step.id}: ${result.outcome}`;
      }
      attempts.push(result);
      await options.record?.(result);
    }
    return { attempts, events, finalMap: await environment.read() };
  } finally {
    await environment.close();
  }
}
