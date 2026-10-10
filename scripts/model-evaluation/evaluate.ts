import { createHash } from 'node:crypto';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import audioManifest from './audio/manifest.json' with { type: 'json' };
import { EvaluationBudget } from './budget.js';
import rawCatalog from './catalog.json' with { type: 'json' };
import { contentJudge, verifyJudge } from './judge.js';
import controls from './judge-controls.json' with { type: 'json' };
import { budgetedLive, type LiveEvaluationProfile } from './live.js';
import registry from './profiles.json' with { type: 'json' };
import {
  budgetedProvider,
  type ProviderCall,
  requestMaximum,
  verifiedProfile,
} from './provider.js';
import { compareProfiles, evaluationReporter, summarizeProfile } from './report.js';
import { runTextScenario } from './runner.js';
import { referenceSpeech } from './speech.js';
import type { Attempt, Catalog, Scenario } from './types.js';
import { runVoiceScenario } from './voice-runner.js';

export type EvaluationPlan = {
  issue: number;
  directory: string;
  apiKey: string;
  authorized: boolean;
  limitUsd: number;
  priorUsd: number;
  priorSource: string;
  commit: string;
  localVerification: { passed: boolean; commands: string[]; evidence: string };
  textProfiles?: string[];
  voice?: boolean;
  voiceProfile?: LiveEvaluationProfile;
  repetitions?: number[];
  // Exact counting, including its verified billing, is supplied only by an
  // agent after checking the official endpoint/model/pricing documentation.
  counting?: {
    source: string;
    feeUsd: number;
    count: (payload: Record<string, unknown>) => Promise<number>;
  };
};

/** Agent-callable support. Reports remain local until the agent publishes each
 * Markdown artifact on the already-created model-evaluation run issue. */
export async function evaluateModels(plan: EvaluationPlan) {
  if (
    !plan.authorized ||
    !plan.apiKey ||
    !plan.localVerification.passed ||
    !plan.localVerification.commands.length ||
    !plan.localVerification.evidence ||
    !Number.isSafeInteger(plan.issue) ||
    plan.issue <= 0
  )
    throw new Error('evaluation_prerequisites_missing');
  const catalog = rawCatalog as Catalog;
  const directory = plan.directory;
  await mkdir(directory, { recursive: true });
  const db = new Database(join(directory, 'budget.sqlite'));
  const budget = new EvaluationBudget(db, plan);
  const report = evaluationReporter(directory, plan.issue);
  const published: string[] = [];
  async function emit(...args: Parameters<typeof report>) {
    const path = await report(...args);
    published.push(path);
  }
  const calls = new Map<string, ProviderCall>();
  const raw: unknown[] = [];
  const record = (call: ProviderCall) => {
    calls.set(call.id, call);
    raw.push(call);
  };
  const cost = (kind: 'backend' | 'summary' | 'judge') => {
    const selected = [...calls.values()].filter((call) => call.kind === kind && call.endedAt);
    return selected.some((call) => call.costUsd === null)
      ? null
      : selected.reduce((sum, call) => sum + (call.costUsd ?? 0), 0);
  };
  const backendCost = () => {
    const a = cost('backend');
    const b = cost('summary');
    return a === null || b === null ? null : a + b;
  };
  const counted = plan.counting
    ? async (payload: Record<string, unknown>) => {
        const fee = plan.counting?.feeUsd;
        if (fee === undefined || !Number.isFinite(fee) || fee < 0 || !plan.counting?.source)
          throw new Error('evaluation_count_fee_unverified');
        const charge = budget.reserve('counting', fee);
        try {
          const tokens = await plan.counting.count(payload);
          budget.settle(charge, fee);
          return tokens;
        } catch (error) {
          budget.settle(charge, null);
          throw error;
        }
      }
    : undefined;
  const judgeProvider = budgetedProvider(verifiedProfile('judge-sol-high'), budget, {
    record,
    countInput: counted,
  });
  const judge = contentJudge(plan.apiKey, judgeProvider);
  const attempts: Attempt[] = [];
  const repetitions = plan.repetitions ?? [1];
  const profiles = plan.textProfiles ?? ['terra-low', 'luna-low', 'sol-low', 'astra-low'];
  const voiceProfile =
    plan.voiceProfile ??
    (registry.profiles.find((profile) => profile.role === 'voice') as LiveEvaluationProfile);
  if (![1, 3].includes(repetitions.length) || new Set(repetitions).size !== repetitions.length)
    throw new Error('evaluation_invalid_repetitions');
  try {
    const audio = await Promise.all(Object.keys(audioManifest.clips).map(referenceSpeech));
    await emit('manifest', 'Utvärderingskörning', {
      commit: plan.commit,
      catalog: {
        source: rawCatalog.source,
        decision: rawCatalog.decision,
        sha256: createHash('sha256').update(JSON.stringify(rawCatalog)).digest('hex'),
        scenarios: catalog.scenarios.map((scenario) => ({
          id: scenario.id,
          title: scenario.title,
          steps: scenario.steps.map((step) => step.id),
          voice: scenario.voice,
        })),
        fixtureObjects: catalog.base.objects.length,
        fixtureRelationships: catalog.base.relationships.length,
      },
      controls: controls.source,
      profiles: registry,
      repetitions,
      textProfiles: profiles,
      voice: plan.voice ?? true,
      voiceProfile,
      audio: audioManifest,
      frames: audio.reduce((sum, item) => sum + item.clip.frames, 0),
      budget: budget.snapshot(),
      priorSource: plan.priorSource,
      counting: plan.counting
        ? { source: plan.counting.source, feeUsd: plan.counting.feeUsd }
        : registry.counting,
      maxima: {
        backendPerStep: 48,
        backendOutput: 8192,
        summaryOutput: 4096,
        judgeOutput: 4096,
        stepSeconds: 180,
        judgeSeconds: 120,
        startupSeconds: 30,
        voicePaidSeconds: 3420,
      },
      estimates: Object.fromEntries(
        profiles.map((id) => [
          id,
          {
            singleBackendReservationUsd: requestMaximum(verifiedProfile(id), 8192),
            textTechnicalMaximumUsd:
              requestMaximum(verifiedProfile(id), 8192) * 913 +
              requestMaximum(verifiedProfile('judge-sol-high'), 4096) * 20,
          },
        ]),
      ),
    });
    await emit('local_verification', 'Lokal verifiering', plan.localVerification);
    const calibrated = await verifyJudge(judge, async (id, result, expected) => {
      await emit('judge_control', `Bedömarkontroll ${id}`, {
        id,
        result,
        expected,
        costUsd: cost('judge'),
      });
    });
    if (!calibrated) {
      budget.stop(budget.snapshot().reason ?? 'evaluation_judge_control_failed');
      await emit('diagnostic', 'Bedömaren är inte verifierad', {
        reason: budget.snapshot().reason,
        controls: controls.cases.map((item) => item.id),
        comparisonAllowed: false,
      });
    }
    for (const repetition of repetitions) {
      const order = repetition % 2 ? [...profiles] : [...profiles].reverse();
      for (const id of order) {
        // Escalate only after a complete lower-effort round with a confirmed
        // behavior failure. Errors/inconclusive rounds do not permit escalation.
        const model = id.replace(/-(low|medium|high)$/, '');
        const effort = id.split('-').at(-1);
        const previous =
          effort === 'medium' ? `${model}-low` : effort === 'high' ? `${model}-medium` : undefined;
        if (
          previous &&
          (!attempts.some((item) => item.profile === previous && item.outcome === 'fail') ||
            attempts
              .filter((item) => item.profile === previous)
              .some((item) =>
                ['error', 'inconclusive', 'not_run', 'aborted'].includes(item.outcome),
              ))
        )
          continue;
        const profile = verifiedProfile(id);
        const provider = budgetedProvider(profile, budget, { record, countInput: counted });
        for (const scenario of catalog.scenarios) {
          if (budget.snapshot().stopped) {
            await missing(scenario, id, repetition, 'text', budget.snapshot().reason as string);
            continue;
          }
          const run = await runTextScenario(
            scenario,
            { providerApiKey: plan.apiKey, modelProfile: profile, modelFetch: provider.fetch },
            {
              profile: id,
              repetition,
              judge,
              beginStep: provider.beginStep,
              summaryCountingVerified: Boolean(counted),
              costs: backendCost,
              judgeCosts: () => cost('judge'),
              stopped: () => budget.snapshot().stopped,
              record: async (attempt) => {
                attempts.push(attempt);
                await emit('attempt', `${scenario.title}: ${attempt.step}`, attempt);
              },
            },
          );
          raw.push({ scenario: scenario.id, profile: id, repetition, ...run });
        }
        const round = attempts.filter(
          (item) => item.profile === id && item.repetition === repetition,
        );
        if (
          !plan.textProfiles &&
          effort !== 'high' &&
          round.some((item) => item.outcome === 'fail') &&
          !round.some((item) =>
            ['error', 'aborted', 'inconclusive', 'not_run'].includes(item.outcome),
          )
        ) {
          const next = `${model}-${effort === 'low' ? 'medium' : 'high'}`;
          order.push(next);
          if (!profiles.includes(next)) profiles.push(next);
          await emit('diagnostic', 'Höjd resonemangsnivå', {
            previous: id,
            next,
            reason: 'Confirmed behavior failure in a complete round.',
          });
        }
      }
      if (plan.voice !== false)
        for (const scenario of catalog.scenarios.filter((item) => item.voice)) {
          const id = voiceProfile.id;
          if (budget.snapshot().stopped) {
            await missing(scenario, id, repetition, 'voice', budget.snapshot().reason as string);
            continue;
          }
          const frames = (
            await Promise.all(
              scenario.steps
                .filter((step) => !step.transition)
                .map((step) => referenceSpeech(step.id)),
            )
          ).reduce((sum, item) => sum + item.clip.frames, 0);
          const utterances = scenario.steps.filter((step) => !step.transition).length;
          const maximumSeconds = Math.ceil(
            frames / 22050 + utterances * 180 + 32 + (utterances - 1) * 120,
          );
          const liveUsage: unknown[] = [];
          const live = budgetedLive(
            budget,
            maximumSeconds,
            (usage) => liveUsage.push(usage),
            fetch,
            voiceProfile,
          );
          const profile = verifiedProfile(voiceProfile.backend);
          const provider = budgetedProvider(profile, budget, { record, countInput: counted });
          const run = await runVoiceScenario(
            scenario,
            {
              providerApiKey: plan.apiKey,
              modelProfile: profile,
              modelFetch: provider.fetch,
              liveFetch: live.fetch,
              liveUsage: live.usage,
              liveProfile: voiceProfile,
            },
            {
              profile: id,
              repetition,
              judge,
              beginStep: provider.beginStep,
              costs: backendCost,
              judgeCosts: () => cost('judge'),
              stopped: () => budget.snapshot().stopped,
              summaryCountingVerified: Boolean(counted),
              record: async (attempt) => {
                attempts.push(attempt);
                await emit('attempt', `${scenario.title}: ${attempt.step}`, attempt);
              },
            },
          );
          await emit('diagnostic', `Talkostnad: ${scenario.title}`, {
            sessions: liveUsage,
            maximumSeconds,
            stepCost: 'Estimated allocations are not used to rank models.',
            observation: 'Output transcript is observed; acoustic audibility is not measured.',
          });
          raw.push({ scenario: scenario.id, repetition, ...run, liveUsage });
        }
    }
    const summaries = profiles.map((id) =>
      summarizeProfile(attempts, catalog.scenarios, id, 'text', repetitions),
    );
    const voice = summarizeProfile(
      attempts,
      catalog.scenarios.filter((item) => item.voice),
      voiceProfile.id,
      'voice',
      repetitions,
    );
    const comparisons = summaries
      .slice(1)
      .map((candidate) => compareProfiles(summaries[0], candidate));
    await emit('comparison', 'Modelljämförelse', {
      profiles: summaries,
      voice,
      comparisons,
    });
    await emit('recommendation', 'Rekommendation', {
      recommendation:
        comparisons.find(
          (item) => item.recommendation !== 'Otillräckligt underlag för ett modellbyte.',
        )?.recommendation ?? 'Otillräckligt underlag för ett modellbyte.',
      preliminary: repetitions.length === 1,
      completeBaseline: attempts.every((item) => item.outcome !== 'not_run') && calibrated,
      missing: attempts
        .filter((item) => item.outcome !== 'pass')
        .map(({ scenario, step, profile, modality, outcome }) => ({
          scenario,
          step,
          profile,
          modality,
          outcome,
        })),
      budget: budget.snapshot(),
      remainingEstimate:
        'Recalculate exact complete-request reservations and counting fees before continuing.',
      remainingTechnicalMaximumUsd: attempts
        .filter((item) => item.outcome === 'not_run' && item.modality === 'text')
        .reduce(
          (sum, item) =>
            sum +
            requestMaximum(verifiedProfile(item.profile), item.step === 'summary' ? 4096 : 8192) *
              (item.step === 'summary' ? 1 : 48) +
            requestMaximum(verifiedProfile('judge-sol-high'), 4096),
          0,
        ),
      productionModelChanged: false,
    });
    return { paths: published, attempts, budget: budget.snapshot() };
  } catch (error) {
    budget.stop(error instanceof Error ? error.message : 'evaluation_failed');
    await emit('diagnostic', 'Körningen avbröts', { reason: budget.snapshot().reason });
    await emit('recommendation', 'Rekommendation efter avbrott', {
      recommendation: 'Otillräckligt underlag för ett modellbyte.',
      completeBaseline: false,
      budget: budget.snapshot(),
      completedAttempts: attempts.length,
      remaining:
        'All selected attempts absent from the attempt records remain not run. Recalculate full-request and voice reservations before resuming.',
    });
    return { paths: published, attempts, budget: budget.snapshot() };
  } finally {
    await writeFile(
      join(directory, 'private-observations.json'),
      `${JSON.stringify(raw, null, 2)}\n`,
    );
    await appendFile(
      join(directory, 'private-calls.jsonl'),
      `${[...calls.values()].map((call) => JSON.stringify(call)).join('\n')}\n`,
    );
    db.close();
  }
  async function missing(
    scenario: Scenario,
    profile: string,
    repetition: number,
    modality: 'text' | 'voice',
    reason: string,
  ) {
    for (const step of scenario.steps) {
      const attempt: Attempt = {
        scenario: scenario.id,
        step: step.id,
        profile,
        repetition,
        modality,
        outcome: 'not_run',
        fixed: [],
        elapsedMs: null,
        backendCostUsd: 0,
        reason,
      };
      attempts.push(attempt);
      await emit('attempt', `${scenario.title}: ${step.id}`, attempt);
    }
  }
}
