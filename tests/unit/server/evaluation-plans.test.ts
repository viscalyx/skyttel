import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import catalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import { type EvaluationPlan, evaluateModels } from '../../../scripts/model-evaluation/evaluate.js';
import type { LiveEvaluationProfile } from '../../../scripts/model-evaluation/live.js';
import profiles from '../../../scripts/model-evaluation/profiles.json' with { type: 'json' };
import { verifiedProfile } from '../../../scripts/model-evaluation/provider.js';

test('an explicitly selected high-effort model is accounted for without adding prior models', {
  tags: ['technical'],
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-evaluation-plan-'));
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected_network'));
  try {
    const plan: EvaluationPlan = {
      issue: 341,
      directory,
      apiKey: 'not-a-real-key',
      authorized: true,
      // This ceiling cannot cover the first conservative judge reservation.
      limitUsd: 0.001,
      priorUsd: 0,
      priorSource: 'Isolated test with no previous spending.',
      commit: 'test',
      textProfiles: ['sol-high'],
      judgeProfile: verifiedProfile('judge-sol-high'),
      baselineProfiles: { text: 'terra-low' },
      repetitions: [1],
      localVerification: {
        passed: true,
        commands: ['npm run test:unit'],
        evidence: 'Isolated non-billable plan regression.',
      },
    };
    const run = await evaluateModels(plan);
    expect(network).not.toHaveBeenCalled();
    expect(run.budget.stopped).toBe(true);
    expect(run.attempts).toHaveLength(
      catalog.scenarios.reduce((sum, item) => sum + item.steps.length, 0),
    );
    expect(
      run.attempts.every((item) => item.profile === 'sol-high' && item.outcome === 'not_run'),
    ).toBe(true);
    await expect(
      evaluateModels({ ...plan, textProfiles: ['sol-high', 'sol-high'] }),
    ).rejects.toThrow('evaluation_duplicate_profiles');
    await expect(evaluateModels({ ...plan, apiKey: '' })).rejects.toThrow(
      'evaluation_prerequisites_missing',
    );
    await expect(
      evaluateModels({ ...plan, textProfiles: ['unavailable-profile'] }),
    ).rejects.toThrow('evaluation_invalid_profile');
    const voiceProfile = profiles.profiles.find(
      (item) => item.role === 'voice',
    ) as LiveEvaluationProfile;
    await expect(
      evaluateModels({
        ...plan,
        voice: true,
        voiceProfile: { ...voiceProfile, backend: 'judge-sol-high' },
      }),
    ).rejects.toThrow('evaluation_backend_profile_required');
    await expect(
      evaluateModels({
        ...plan,
        voice: true,
        voiceProfile: {
          ...voiceProfile,
          provider: 'unavailable',
        } as unknown as LiveEvaluationProfile,
      }),
    ).rejects.toThrow('evaluation_provider_unsupported');
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
    await rm(directory, { recursive: true, force: true });
  }
});
