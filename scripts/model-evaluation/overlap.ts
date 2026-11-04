import type { LiveUsageAttempt } from '../../src/server/live-provider.js';
import type { ApplicationVersion } from './application.js';
import rawCatalog from './catalog.json' with { type: 'json' };
import type { ComparisonPlan, ComparisonRun } from './comparison.js';
import { validVoicePlayback } from './comparison.js';
import { scriptedDialogTiming } from './dialog-timing.js';
import type { EvaluationPlan } from './evaluate.js';
import plan from './overlap-comparison-plan.json' with { type: 'json' };
import type { ProviderCall } from './provider.js';
import type { Attempt, Catalog, Expected, Scenario } from './types.js';
import { validVoiceStopEvidence } from './user-stop.js';

export type ScenarioVoiceUsage = {
  scenario: string;
  applicationVersion?: string;
  repetition: number;
  sessions: LiveUsageAttempt[];
  costUsd: number | null;
};

const catalog = rawCatalog as Catalog;
const source = (id: string) => {
  const scenario = catalog.scenarios.find((item) => item.id === id);
  if (!scenario) throw new Error('evaluation_overlap_fixture_missing');
  return structuredClone(scenario);
};

/** Separate versioned experiment scope. Exact existing utterance IDs preserve
 * the approved audio/text binding; the ordinary catalog is never rewritten. */
export function overlapScenarios(): Scenario[] {
  const success = source('change-price-payment');
  success.id = 'overlap-success';
  const clarification = source('two-ambiguities');
  clarification.id = 'overlap-clarification';
  const stop = source('change-price-payment');
  stop.id = 'overlap-early-stop';
  stop.title = 'Tidigt stopp av pågående uppdrag';
  const step = stop.steps[0];
  const complete = structuredClone(step.expected);
  complete.requirements = [];
  const unchanged: Expected = { saveAttempts: 0, saves: 0, requirements: [] };
  step.expected = unchanged;
  delete step.followUps;
  step.userStop = {
    trigger: 'first-working-after-input',
    maximumObservationMs: 5000,
    allowedStates: [
      unchanged,
      { ...unchanged, objects: complete.objects },
      {
        ...unchanged,
        addRelationships: complete.addRelationships,
        removeRelationships: complete.removeRelationships,
      },
      complete,
    ],
  };
  return [success, clarification, stop];
}

export function overlapComparison(input: { directory: string; modality: 'text' | 'voice' }) {
  const version = (mode: 'sequential' | 'overlap'): ApplicationVersion => ({
    id: mode,
    directory: input.directory,
    commit: plan.applicationCommit,
    conversationWorkMode: mode,
  });
  return {
    baseline: version('sequential'),
    candidate: version('overlap'),
    plan: {
      ...plan,
      id: `${plan.id}-${input.modality}`,
      modality: input.modality,
    } as ComparisonPlan,
  };
}

/** Builds the concrete runner configuration from the common verified profiles.
 * The caller must supply the final clean evaluator identity and local evidence;
 * constructing this object starts no provider work and grants no authorization. */
export function overlapEvaluationPlan(input: {
  shared: Omit<
    EvaluationPlan,
    'applicationComparison' | 'scenarioSet' | 'repetitions' | 'followUps'
  >;
  applicationDirectory: string;
}): EvaluationPlan {
  return {
    ...input.shared,
    followUps: true,
    repetitions: [...plan.repetitions],
    scenarioSet: overlapScenarios(),
    applicationComparison: overlapComparison({
      directory: input.applicationDirectory,
      modality: input.shared.voice ? 'voice' : 'text',
    }),
  };
}

function distribution(values: (number | null | undefined)[]) {
  if (!values.length || values.some((value) => value == null || !Number.isFinite(value)))
    return null;
  const sorted = (values as number[]).toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    median,
    min: sorted[0],
    max: sorted.at(-1) as number,
    relativeRange: median > 0 ? ((sorted.at(-1) ?? 0) - sorted[0]) / median : null,
  };
}

/** Cancellation remains aborted in ordinary qualification. This report alone
 * assesses the separately declared Stop endpoint, retaining every raw attempt
 * and per-outcome cost. Extra work cannot be inferred from ordinary scope/work
 * calls or from cancellation; unknown attribution is explicit. */
export function compareOverlap(
  attempts: Attempt[],
  run: ComparisonRun,
  voiceUsage: ScenarioVoiceUsage[] = [],
  providerCalls: ProviderCall[] = [],
) {
  const rows = Object.entries(plan.outcomes).map(([scenario, outcome]) => {
    const versions = run.versions.map((version) => {
      const values = attempts.filter(
        (attempt) =>
          attempt.scenario === scenario &&
          attempt.applicationVersion === version.id &&
          attempt.profile === (run.voiceProfile?.id ?? run.profile.id) &&
          attempt.modality === run.plan.modality,
      );
      const repetitions = run.plan.repetitions.map((repetition) => {
        const selected = values.filter((attempt) => attempt.repetition === repetition);
        const scripted = outcome === 'early_stop';
        const expectedSteps = overlapScenarios().find((item) => item.id === scenario)?.steps ?? [];
        const correctnessValid = expectedSteps.every((step) => {
          const matches = selected.filter(
            (attempt) => attempt.step === step.id && !attempt.followUpFor,
          );
          return (
            matches.length === 1 &&
            matches[0].comparisonContract === run.contractId &&
            matches[0].applicationCommit === version.commit &&
            (scripted
              ? matches[0].outcome === 'aborted' &&
                matches[0].scriptedStop?.verdict === 'pass' &&
                matches[0].scriptedStop?.endpointMs !== null &&
                (run.plan.modality !== 'voice' || validVoiceStopEvidence(matches[0]))
              : matches[0].outcome === 'pass' &&
                matches[0].elapsedMs !== null &&
                matches[0].timing?.successfulCompletionMs === matches[0].elapsedMs &&
                (run.plan.modality === 'voice'
                  ? validVoicePlayback(matches[0])
                  : matches[0].timing?.contract === 'text-delivery-v2'))
          );
        });
        const ordered = expectedSteps.flatMap((step) =>
          selected.filter((attempt) => attempt.step === step.id && !attempt.followUpFor),
        );
        const dialogTiming = scripted ? undefined : scriptedDialogTiming(ordered);
        const valid = correctnessValid && (scripted || dialogTiming?.status === 'complete');
        const endpointMs = valid
          ? scripted
            ? (ordered[0]?.scriptedStop?.endpointMs ?? null)
            : (dialogTiming?.endpointMs ?? null)
          : null;
        return {
          repetition,
          valid,
          endpointMs,
          endpointBounds: valid
            ? scripted && endpointMs !== null
              ? (ordered[0]?.scriptedStop?.endpointBounds ??
                (run.plan.modality === 'text' ? { lower: endpointMs, upper: endpointMs } : null))
              : (dialogTiming?.applicationWaitMs ?? null)
            : null,
          dialogTiming,
          attempts: selected,
        };
      });
      const costs = (
        field: 'backendCostUsd' | 'judgeCostUsd' | 'voiceCostUsd' | 'playbackAssessmentCostUsd',
      ) =>
        values.length &&
        values.every((attempt) => attempt[field] !== null && attempt[field] !== undefined)
          ? values.reduce((sum, attempt) => sum + (attempt[field] ?? 0), 0)
          : null;
      const sessions = voiceUsage.filter(
        (entry) => entry.scenario === scenario && entry.applicationVersion === version.id,
      );
      const voiceCost =
        sessions.length === run.plan.repetitions.length &&
        sessions.every((entry) => entry.costUsd !== null)
          ? sessions.reduce((sum, entry) => sum + (entry.costUsd ?? 0), 0)
          : null;
      const workAccounting = values.flatMap((attempt) =>
        (attempt.diagnostics?.workResults ?? []).map((work) => {
          const matches = providerCalls.filter(
            (call) =>
              call.endedAt !== undefined &&
              ((work.providerRequestId !== null && work.providerRequestId === call.requestId) ||
                (work.responseId !== null && work.responseId === call.response?.id)),
          );
          const billing = matches.length === 1 ? matches[0] : undefined;
          return {
            repetition: attempt.repetition,
            step: attempt.step,
            ...work,
            billing: billing
              ? {
                  callId: billing.id,
                  profile: billing.profile,
                  costUsd: billing.costUsd,
                  reservationUsd: billing.reservationUsd,
                  outcome: billing.outcome,
                  usage: billing.response?.usage ?? null,
                }
              : null,
            billingLimitation: billing
              ? null
              : 'No unique terminal provider identity joins this work result to billing. Missing or canceled usage is unknown, never zero.',
          };
        }),
      );
      return {
        version: version.id,
        repetitions,
        timing: distribution(repetitions.map((item) => item.endpointMs)),
        timingBounds: {
          lower: distribution(repetitions.map((item) => item.endpointBounds?.lower)),
          upper: distribution(repetitions.map((item) => item.endpointBounds?.upper)),
        },
        costs: {
          backend: costs('backendCostUsd'),
          judge: costs('judgeCostUsd'),
          voice: run.plan.modality === 'text' ? 0 : voiceCost,
          recognition: run.plan.modality === 'text' ? 0 : costs('playbackAssessmentCostUsd'),
        },
        voiceSessions: sessions,
        workAccounting: {
          required: workAccounting.filter((work) => work.disposition === 'used'),
          unused: workAccounting.filter((work) => work.disposition === 'discarded'),
          unknown: workAccounting.filter(
            (work) => !['used', 'discarded'].includes(work.disposition),
          ),
          extra: null,
        },
        work: values.map((attempt) => ({
          repetition: attempt.repetition,
          step: attempt.step,
          results: attempt.diagnostics?.workResults ?? null,
          metrics: attempt.metrics ?? null,
          providerCalls: attempt.providerCalls ?? null,
        })),
        extraWorkAttribution: null,
        extraWorkLimitation:
          'Used work is required; discarded work is unused. Neither disposition alone proves speculative extra work. Compare actual same-endpoint counts and costs; unjoined billing and absent work observations stay unknown.',
      };
    });
    const [baseline, candidate] = versions;
    const maximumRatio =
      outcome === 'success'
        ? plan.targetMaximumRatio
        : outcome === 'early_stop'
          ? plan.stopMaximumRatio
          : plan.otherMaximumRatio;
    return {
      scenario,
      outcome,
      versions,
      maximumRatio,
      ratio:
        baseline.timing && candidate.timing && baseline.timing.median > 0
          ? candidate.timing.median / baseline.timing.median
          : null,
      ratioBounds:
        baseline.timingBounds.lower &&
        baseline.timingBounds.upper &&
        candidate.timingBounds.lower &&
        candidate.timingBounds.upper &&
        baseline.timingBounds.lower.median > 0 &&
        baseline.timingBounds.upper.median > 0
          ? {
              lower: candidate.timingBounds.lower.median / baseline.timingBounds.upper.median,
              upper: candidate.timingBounds.upper.median / baseline.timingBounds.lower.median,
            }
          : null,
    };
  });
  const failures = rows.flatMap((row) =>
    row.versions.flatMap((version) =>
      version.repetitions.flatMap((repetition) =>
        repetition.attempts.filter(
          (attempt) => attempt.outcome === 'fail' || attempt.scriptedStop?.verdict === 'fail',
        ),
      ),
    ),
  );
  const incomplete = rows.some(
    (row) =>
      row.ratio === null ||
      row.ratioBounds === null ||
      row.versions.some(
        (version) =>
          version.repetitions.some((repetition) => !repetition.valid) ||
          version.timing?.relativeRange == null ||
          version.timing.relativeRange > plan.maximumRelativeRange ||
          Object.values(version.costs).some((cost) => cost === null),
      ),
  );
  return {
    contract: 'overlap-outcomes-v1',
    comparisonContract: run.contractId,
    scope: 'three declared scenarios only; no full-catalog qualification',
    model: run.profile.model,
    effort: run.profile.effort,
    modality: run.plan.modality,
    status: failures.length ? 'rejected' : incomplete ? 'inconclusive' : 'collected',
    waitDecision: failures.length
      ? 'rejected'
      : incomplete
        ? 'inconclusive'
        : rows.every((row) => row.ratioBounds !== null && row.ratioBounds.upper <= row.maximumRatio)
          ? 'thresholds_met'
          : rows.some((row) => row.ratioBounds !== null && row.ratioBounds.lower > row.maximumRatio)
            ? 'thresholds_failed'
            : 'inconclusive',
    rows,
    defaultDecision: 'retain sequential',
    productionDefaultChanged: false,
    accountingScope:
      'Outcome rows keep scenario work separate. Judge calibration, optional counting fees and shared outstanding holds remain in the single run ledger and are additional to these rows, never omitted from actual total spending.',
    decision:
      'Executed correctness, outcome-specific timing and actual cost must support a separately reviewed default change. Collected measurements alone do not authorize it.',
  };
}
