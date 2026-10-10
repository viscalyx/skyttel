import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Attempt } from './types.js';

export type RecordType =
  | 'manifest'
  | 'local_verification'
  | 'judge_control'
  | 'attempt'
  | 'diagnostic'
  | 'comparison'
  | 'recommendation';
export function evaluationReporter(directory: string, issue: number) {
  if (!Number.isSafeInteger(issue) || issue <= 0) throw new Error('evaluation_run_issue_required');
  let sequence = 0;
  return async (type: RecordType, title: string, data: unknown, prose = '') => {
    await mkdir(directory, { recursive: true });
    const record = { format: 'skyttel-model-evaluation', version: 1, issue, type, data };
    const stem = `${String(++sequence).padStart(4, '0')}-${type}`;
    await writeFile(join(directory, `${stem}.json`), `${JSON.stringify(record, null, 2)}\n`);
    await writeFile(
      join(directory, `${stem}.md`),
      `## ${title}\n\n${prose ? `${prose}\n\n` : ''}\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`,
    );
    return join(directory, `${stem}.md`);
  };
}

const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
/** Scenario medians have equal weight; repetitions retain their own summed
 * times. A missing or unsuccessful attempt has no successful completion time. */
export function summarizeProfile(
  attempts: Attempt[],
  scenarios: { id: string; steps: { id: string }[] }[],
  profile: string,
  modality: 'text' | 'voice',
  repetitions: number[],
) {
  const values = attempts.filter(
    (attempt) => attempt.profile === profile && attempt.modality === modality,
  );
  const totals: number[] = [];
  const scenarioTimes: { scenario: string; medianMs: number; minMs: number; maxMs: number }[] = [];
  let qualified = true;
  for (const scenario of scenarios) {
    const times: number[] = [];
    for (const repetition of repetitions) {
      const steps = scenario.steps.map((step) =>
        values.filter(
          (attempt) =>
            attempt.scenario === scenario.id &&
            attempt.step === step.id &&
            attempt.repetition === repetition,
        ),
      );
      if (
        steps.some(
          (matches) =>
            matches.length !== 1 || matches[0].outcome !== 'pass' || matches[0].elapsedMs === null,
        )
      ) {
        qualified = false;
        continue;
      }
      const time = steps.reduce((sum, matches) => sum + (matches[0].elapsedMs ?? 0), 0);
      times.push(time);
      const index = repetitions.indexOf(repetition);
      totals[index] = (totals[index] ?? 0) + time;
    }
    if (times.length === repetitions.length)
      scenarioTimes.push({
        scenario: scenario.id,
        medianMs: median(times),
        minMs: Math.min(...times),
        maxMs: Math.max(...times),
      });
  }
  return {
    profile,
    modality,
    qualified,
    finalQualified: qualified && repetitions.length === 3,
    meanScenarioMedianMs:
      qualified && scenarioTimes.length
        ? scenarioTimes.reduce((sum, item) => sum + item.medianMs, 0) / scenarioTimes.length
        : null,
    totals,
    scenarioTimes,
    outcomes: Object.fromEntries(
      ['pass', 'fail', 'inconclusive', 'error', 'aborted', 'not_run'].map((outcome) => [
        outcome,
        values.filter((attempt) => attempt.outcome === outcome).length,
      ]),
    ),
    backendCostUsd: values.every((attempt) => attempt.backendCostUsd !== null)
      ? values.reduce((sum, attempt) => sum + (attempt.backendCostUsd ?? 0), 0)
      : null,
  };
}
export function compareProfiles(
  reference: ReturnType<typeof summarizeProfile>,
  candidate: ReturnType<typeof summarizeProfile>,
) {
  if (!reference.finalQualified && candidate.finalQualified)
    return {
      label: 'Ej jämförbart',
      recommendation:
        'Den kvalificerade kandidaten kan väljas för kravuppfyllelse; hastigheten kan inte jämföras med den underkända referensen.',
    };
  if (
    !reference.finalQualified ||
    !candidate.finalQualified ||
    reference.meanScenarioMedianMs === null ||
    candidate.meanScenarioMedianMs === null
  )
    return { label: 'Ej jämförbart', recommendation: 'Otillräckligt underlag för ett modellbyte.' };
  const deltaMs = reference.meanScenarioMedianMs - candidate.meanScenarioMedianMs;
  const percent = (100 * deltaMs) / reference.meanScenarioMedianMs;
  const consistent = reference.totals.every((total, index) => candidate.totals[index] < total);
  const rule = deltaMs >= 1000 && percent >= 10 && consistent;
  const label =
    deltaMs < 0
      ? '🔴 Röd: sämre'
      : rule
        ? '🟢 Grön: bättre, tidsvinstregeln uppfylld'
        : deltaMs > 0
          ? '🟡 Gul: bättre, tidsvinstregeln ej uppfylld'
          : 'Oförändrat';
  return {
    label,
    deltaSeconds: deltaMs / 1000,
    percent,
    consistent,
    rule,
    recommendation: rule
      ? 'Tidsunderlaget motiverar ett byte; bedöm merkostnaden separat.'
      : 'Behåll modellen enligt tidsvinstregeln.',
    costDifferenceUsd:
      reference.backendCostUsd !== null && candidate.backendCostUsd !== null
        ? candidate.backendCostUsd - reference.backendCostUsd
        : null,
    limitations: 'Tre upprepningar ger ingen statistiskt säker rangordning.',
    regressions: candidate.scenarioTimes.flatMap((item) => {
      const old = reference.scenarioTimes.find((value) => value.scenario === item.scenario);
      return old && item.medianMs > old.medianMs
        ? [{ scenario: item.scenario, deltaSeconds: (item.medianMs - old.medianMs) / 1000 }]
        : [];
    }),
  };
}
