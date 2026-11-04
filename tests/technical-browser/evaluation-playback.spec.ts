import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  commonLiveSession,
  type LiveEvaluationProfile,
} from '../../scripts/model-evaluation/live.js';
import type { PlaybackRecording } from '../../scripts/model-evaluation/playback.js';
import profiles from '../../scripts/model-evaluation/profiles.json' with { type: 'json' };
import { verifiedProfile } from '../../scripts/model-evaluation/provider.js';
import { runVoiceScenario } from '../../scripts/model-evaluation/voice-runner.js';
import { evaluationVoiceApplication } from '../support/evaluation-voice-application.js';
import { evaluationVoiceProvider } from '../support/evaluation-voice-provider.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../support/text-model.js';

for (const mode of [
  'full',
  'delayed',
  'assessment-tail',
  'interrupt',
  'mute',
  'pause',
  'error',
  'uncertain',
] as const) {
  test(`voice completion requires rendered complete output (${mode})`, {
    tag: '@technical',
  }, async () => {
    const live = await evaluationVoiceProvider(mode === 'full' ? 0.5 : 3);
    const application =
      mode === 'full' || mode === 'delayed'
        ? await evaluationVoiceApplication(mode === 'full' ? 'Baseline' : 'Candidate')
        : undefined;
    let stopped = false;
    let control: Promise<void> | undefined;
    let controlTimer: ReturnType<typeof setTimeout> | undefined;
    const recordings: PlaybackRecording[] = [];
    try {
      const model = textModel((body) => {
        if (lastToolResult(body)) return [modelMessage('Sparat.')];
        const input = JSON.parse(
          String(body.input.findLast((item) => item.role === 'user')?.content),
        );
        return [
          modelTool('save_draft', {
            version: input.draft.version,
            contentVersion: input.draft.contentVersion,
          }),
        ];
      });
      const liveProfile = {
        ...profiles.profiles.find((profile) => profile.role === 'voice'),
        id: 'controlled-live-sol',
        backend: 'sol-high',
      } as LiveEvaluationProfile;
      const result = await runVoiceScenario(
        {
          id: 'rendered-output',
          title: 'Save with a delayed final spoken result',
          voice: true,
          steps: [
            {
              id: 'spara-hela-utkastet',
              text: 'Spara hela utkastet.',
              expected: {
                saves: 1,
                saveAttempts: 1,
                requirements: ['Bekräfta att utkastet sparats.'],
              },
            },
          ],
        },
        {
          modelFetch: async (url, init) => {
            const response = await model.provider(url, init);
            return Response.json(
              { ...(await response.json()), service_tier: 'default' },
              { headers: response.headers },
            );
          },
          modelProfile: verifiedProfile('sol-high'),
          liveFetch: async (url, init) => {
            const { input: _history, ...session } = JSON.parse(String(init?.body)).session;
            expect(session).toEqual(commonLiveSession(liveProfile));
            return live.provider(url, init);
          },
          liveProfile,
          liveSideband: live.attach,
        },
        {
          profile: liveProfile.id,
          application,
          repetition: 1,
          maximumSeconds: mode === 'assessment-tail' ? 20 : 16,
          stopped: () => stopped,
          sessionTimeLimit: () => {
            stopped = true;
          },
          recordPlayback: (recording) => {
            recordings.push(recording);
          },
          playbackReady: (connection) => {
            if (mode === 'interrupt' || mode === 'mute' || mode === 'pause' || mode === 'error') {
              control = live.outputStarted.then(
                () =>
                  new Promise<void>((resolve, reject) => {
                    controlTimer = setTimeout(() => {
                      void connection.control(mode).then(resolve, reject);
                    }, 800);
                  }),
              );
            }
          },
          assessPlayback: async (recording) => {
            // This external controlled recognizer reads the REAL rendered WAV.
            // 400Hz is a status utterance; the required final result is 880Hz.
            const final = hasFinalTone(recording);
            await new Promise((resolve) =>
              setTimeout(resolve, mode === 'assessment-tail' ? 1500 : 300),
            );
            return {
              outcome: mode === 'uncertain' ? 'inconclusive' : 'recognized',
              // A misleading assessment must not override actual output faults.
              text:
                final || ['interrupt', 'mute', 'pause', 'error', 'assessment-tail'].includes(mode)
                  ? 'Sparat.'
                  : 'Jag arbetar.',
              lastWordEndSeconds:
                recording.lastActiveFrame === null
                  ? null
                  : (recording.lastActiveFrame + 1 - recording.firstFrame) / recording.sampleRate,
              alignmentMarginMs: 100,
              profile: 'controlled-wave-assessor',
              callId: `candidate-${recording.frames}`,
              costUsd: 0,
            };
          },
          judge: async (input) => {
            if (application && input.sources.backend)
              expect(input.sources.backend.text).toContain(application.id);
            return input.requirements.map((requirement) => ({
              id: requirement.id,
              outcome: input.sources.voice?.text === 'Sparat.' ? 'pass' : 'inconclusive',
              reason:
                'Controlled semantic interpretation of the independently recognized rendered tones.',
            }));
          },
        },
      );
      expect(live.outputStartedAt).toBeDefined();
      if (control) await control;
      const evidence = test.info().outputPath('rendered-playback-evidence.json');
      await mkdir(dirname(evidence), { recursive: true });
      await writeFile(evidence, JSON.stringify(result.attempts[0], null, 2));
      await test
        .info()
        .attach('rendered-playback-evidence', { path: evidence, contentType: 'application/json' });
      if (mode !== 'full' && mode !== 'delayed' && mode !== 'assessment-tail') {
        expect(result.attempts[0].outcome).not.toBe('pass');
        expect(result.attempts[0].elapsedMs).toBeNull();
        expect(result.attempts[0].timing?.successfulCompletionMs).toBeNull();
        expect(recordings.length).toBeGreaterThan(0);
        if (mode !== 'uncertain') {
          expect(recordings.some(hasFinalTone)).toBe(false);
          expect(
            result.attempts[0].playback?.interruption ?? result.attempts[0].playback?.error,
          ).toBeTruthy();
        }
        return;
      }
      expect(result.attempts[0].outcome, JSON.stringify(result.attempts[0])).toBe('pass');
      expect(live.finalAudioSentAt).toBeDefined();
      expect(result.attempts[0].elapsedMs).not.toBeNull();
      const attempt = result.attempts[0];
      const input = attempt.playback?.input;
      const elapsed = attempt.elapsedMs;
      const observed = attempt.observedEndMs;
      const sentAt = live.finalAudioSentAt;
      if (!input || elapsed === null || observed === undefined || sentAt === undefined)
        throw new Error('Missing source/rendered completion evidence.');
      if (application)
        expect(result.attempts[0]).toMatchObject({
          applicationVersion: application.id,
          applicationCommit: application.commit,
        });
      if (mode === 'assessment-tail') {
        expect(result.attempts[0].playback?.candidates.length).toBeGreaterThanOrEqual(2);
        expect(elapsed).toBeGreaterThanOrEqual(sentAt - input.ended.upper);
      }
      expect(
        model.requests.every(
          (request) => request.model === 'gpt-6.1-sol' && request.reasoning.effort === 'high',
        ),
      ).toBe(true);
      expect(recordings.some(hasFinalTone)).toBe(true);
      expect(result.attempts[0].playback?.renderedEnd).toBeDefined();
      expect(result.attempts[0].playback?.lastActiveFrame).toBeGreaterThan(0);
      expect(result.attempts[0].timing?.contract).toBe('voice-rendered-v1');
      expect(observed - elapsed).toBeGreaterThan(300);
    } finally {
      clearTimeout(controlTimer);
      await live.close();
      if (application) await rm(application.directory, { recursive: true, force: true });
    }
  });
}

function hasFinalTone(recording: PlaybackRecording) {
  const pcm = recording.wav.subarray(44);
  const window = Math.round(recording.sampleRate / 10);
  for (let start = 0; start + window < recording.frames; start += window) {
    let crossings = 0;
    let peak = 0;
    for (let frame = start + 1; frame < start + window; frame++) {
      const value = pcm.readInt16LE(frame * 2);
      peak = Math.max(peak, Math.abs(value));
      if (value > 0 && pcm.readInt16LE((frame - 1) * 2) <= 0) crossings++;
    }
    if (peak > 100 && crossings > 65) return true;
  }
  return false;
}
