import { afterEach, expect, test, vi } from 'vitest';
import manifest from '../../../scripts/model-evaluation/audio/manifest.json' with { type: 'json' };
import { recordedPlayback } from '../../../scripts/model-evaluation/playback.js';
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import * as speech from '../../../scripts/model-evaluation/speech.js';
import type { JudgeInput, JudgeResult, Scenario } from '../../../scripts/model-evaluation/types.js';
import { runVoiceScenario } from '../../../scripts/model-evaluation/voice-runner.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { liveProvider, voiceAnswerParts } from '../../support/live-provider.js';
import { modelMessage, modelTool, pendingUpdate, textModel } from '../../support/text-model.js';

afterEach(() => vi.restoreAllMocks());

test('ordinary retained work cannot pass when its independent semantic verdict rejects lost constraints', {
  tags: ['technical'],
}, async () => {
  const original = 'Ändra avgiften till 325 SEK per år. Behåll betalaren och spara inte.';
  const scenario: Scenario = {
    id: 'ordinary-retained-fee',
    title: 'Retain unresolved fee work through the ordinary runner path',
    voice: false,
    fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
    steps: [
      {
        id: 'request',
        text: original,
        expected: { requirements: [], preservedRequests: [original] },
      },
    ],
  };
  const inputs: JudgeInput[] = [];
  const model = textModel(() => [
    modelTool('ask_questions', {
      questions: [
        {
          kind: 'change',
          request: 'Ändra avgiften.',
          question: 'Vilket abonnemang avser du?',
          dependsOnDraft: true,
        },
      ],
    }),
  ]);
  const run = await runTextScenario(
    scenario,
    { modelFetch: model.provider },
    {
      profile: 'controlled',
      repetition: 1,
      judge: async (input) => {
        inputs.push(input);
        return input.requirements.map(({ id }) => ({
          id,
          outcome: 'fail' as const,
          reason: 'The active work omits amount, currency, interval and save prohibition.',
        }));
      },
    },
  );
  expect(run.attempts[0]).toMatchObject({
    outcome: 'fail',
    elapsedMs: null,
    timing: { successfulCompletionMs: null },
  });
  expect(
    inputs.some((input) => input.requirements.some(({ id }) => id.endsWith('-retention'))),
  ).toBe(true);
});

test.each([
  {
    name: 'paraphrased fee with empty requirements',
    pending: 'Sätt biblioteksavgiften till 325 SEK årsvis, behåll betalaren. Spara inte.',
    requirements: [],
    verdict: 'pass',
    outcome: 'pass',
  },
  {
    name: 'lost value with explicit response requirement',
    pending: 'Ändra avgiften. Behåll betalaren och spara inte.',
    requirements: ['Ställ en riktad fråga.'],
    verdict: 'fail',
    outcome: 'fail',
  },
  {
    name: 'lost target',
    pending: 'Sätt gymavgiften till 325 SEK per år. Spara inte.',
    requirements: [],
    verdict: 'fail',
    outcome: 'fail',
  },
  {
    name: 'lost save restriction',
    pending: 'Sätt årsavgiften till 325 SEK och behåll betalaren.',
    requirements: [],
    verdict: 'fail',
    outcome: 'fail',
  },
  {
    name: 'missing judge',
    pending: 'Sätt årsavgiften till 325 SEK. Behåll betalaren och spara inte.',
    requirements: [],
    verdict: 'no-judge',
    outcome: 'inconclusive',
  },
  {
    name: 'missing verdict',
    pending: 'Sätt årsavgiften till 325 SEK. Behåll betalaren och spara inte.',
    requirements: ['Ställ en riktad fråga.'],
    verdict: 'missing',
    outcome: 'inconclusive',
  },
  {
    name: 'duplicated verdict',
    pending: 'Sätt årsavgiften till 325 SEK. Behåll betalaren och spara inte.',
    requirements: [],
    verdict: 'duplicate',
    outcome: 'inconclusive',
  },
  {
    name: 'unexpected verdict',
    pending: 'Sätt årsavgiften till 325 SEK. Behåll betalaren och spara inte.',
    requirements: [],
    verdict: 'extra',
    outcome: 'inconclusive',
  },
  {
    name: 'inconclusive verdict',
    pending: 'Sätt årsavgiften till 325 SEK. Behåll betalaren och spara inte.',
    requirements: [],
    verdict: 'inconclusive',
    outcome: 'inconclusive',
  },
] as const)(
  'ordinary retention handles $name without declaring unfinished work complete',
  { tags: ['technical'] },
  async ({ pending, requirements, verdict, outcome }) => {
    const original =
      'Ändra biblioteksavgiften till 325 SEK per år. Behåll betalaren och spara inte.';
    const scenario: Scenario = {
      id: 'ordinary-retained-library',
      title: 'Retain actual unresolved work',
      voice: false,
      fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
      steps: [
        {
          id: 'request',
          text: original,
          expected: { requirements: [...requirements], preservedRequests: [original] },
        },
      ],
    };
    const inputs: JudgeInput[] = [];
    const model = textModel(() => [
      modelTool('ask_questions', {
        questions: [
          {
            kind: 'change',
            request: pending,
            question: 'Vilket biblioteksabonnemang avser du?',
            dependsOnDraft: true,
          },
        ],
      }),
    ]);
    const run = await runTextScenario(
      scenario,
      { modelFetch: model.provider },
      {
        profile: 'controlled',
        repetition: 1,
        ...(verdict === 'no-judge'
          ? {}
          : {
              judge: async (input: JudgeInput): Promise<JudgeResult> => {
                inputs.push(input);
                const all = input.requirements.map(({ id }) => ({
                  id,
                  outcome:
                    id.endsWith('-retention') && (verdict === 'fail' || verdict === 'inconclusive')
                      ? verdict
                      : ('pass' as const),
                  reason: 'Independent controlled semantic result.',
                }));
                if (verdict === 'missing')
                  return all.filter(({ id }) => !id.endsWith('-retention'));
                if (verdict === 'duplicate')
                  return [...all, ...all.filter(({ id }) => id.endsWith('-retention'))];
                if (verdict === 'extra')
                  return [...all, { id: 'unexpected', outcome: 'pass', reason: 'Not requested.' }];
                return all;
              },
            }),
      },
    );
    expect(run.attempts[0]).toMatchObject({
      outcome,
      elapsedMs: null,
      timing: { successfulCompletionMs: null },
    });
    if (verdict !== 'no-judge') {
      expect(inputs).toHaveLength(1);
      const context = JSON.parse(inputs[0].context);
      expect(context.observedState.expected.preservedRequests).toEqual([original]);
      expect(context.observedState.pendingParts[0].request).toBe(pending);
    }
  },
);

test('retaining an older request does not remove a completed current information response time', {
  tags: ['technical'],
}, async () => {
  const older = 'Ändra avgiften till 325 SEK per år. Behåll betalaren och spara inte.';
  const scenario: Scenario = {
    id: 'older-retained-work',
    title: 'Answer a current question while earlier work waits',
    voice: false,
    fixture: {
      objects: [
        {
          id: 'library',
          type: 'Tjänst',
          name: 'Biblioteksappen',
          properties: [
            { id: 'monthly-fee', label: 'Månadsavgift (SEK)', kind: 'number', value: 79 },
          ],
        },
      ],
      relationships: [],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [
      { id: 'older', text: older, expected: { requirements: [] } },
      {
        id: 'current',
        text: 'Vad kostar Biblioteksappen?',
        expected: {
          requirements: ['Besvara den aktuella prisfrågan och behåll tidigare väntande arbete.'],
          preservedRequests: [older],
        },
      },
    ],
  };
  let turn = 0;
  const model = textModel(() =>
    turn++ === 0
      ? [
          modelTool('ask_questions', {
            questions: [
              {
                kind: 'change',
                request: 'Sätt årsavgiften till 325 SEK, behåll betalaren. Spara inte.',
                question: 'Vilket abonnemang avser du?',
                dependsOnDraft: true,
              },
            ],
          }),
        ]
      : [modelMessage('Biblioteksappen kostar 79 SEK per månad.')],
  );
  const run = await runTextScenario(
    scenario,
    { modelFetch: model.provider },
    {
      profile: 'controlled',
      repetition: 1,
      judge: async (input) =>
        input.requirements.map(({ id }) => ({
          id,
          outcome: 'pass',
          reason: 'Current answer and older retained work independently verified in this fixture.',
        })),
    },
  );
  expect(run.attempts[1]).toMatchObject({
    outcome: 'pass',
    elapsedMs: expect.any(Number),
    timing: { successfulCompletionMs: expect.any(Number) },
  });
});

test('a short follow-up retains the original target contract semantic obligation', {
  tags: ['technical'],
}, async () => {
  const original = 'Ändra biblioteksavgiften till 325 SEK per år. Behåll betalaren och spara inte.';
  const question = 'Vilket abonnemang avser du?';
  const scenario: Scenario = {
    id: 'retained-follow-up-target',
    title: 'Preserve the target contract after clarification',
    voice: false,
    fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
    steps: [
      {
        id: 'request',
        text: original,
        expected: {
          requirements: ['Bekräfta ändringen av avgiften.'],
          preservedRequests: [original],
        },
        followUps: [
          {
            id: 'answer',
            text: 'Jag menar Bibliotek Plus.',
            when: 'Frågan ber om abonnemangets identitet.',
            waiting: {
              requirements: ['Fråga vilket abonnemang som avses utan ändringar.'],
              preservedRequests: [original],
            },
            requirements: [],
          },
        ],
      },
    ],
  };
  let turn = 0;
  const inputs: JudgeInput[] = [];
  const model = textModel((body) =>
    turn++ === 0
      ? [
          modelTool('ask_questions', {
            questions: [
              {
                kind: 'change',
                request:
                  'Sätt biblioteksavgiften till 325 SEK årsvis. Behåll betalaren och spara inte.',
                question,
                dependsOnDraft: true,
              },
            ],
          }),
        ]
      : [
          modelTool('ask_questions', {
            questions: [],
            updates: [
              pendingUpdate(body, question, {
                action: 'replace',
                replacement: {
                  kind: 'change',
                  request: 'Ändra avgiften för Bibliotek Plus.',
                  question: 'Ska jag ändra avgiften?',
                  dependsOnDraft: true,
                },
              }),
            ],
          }),
        ],
  );
  const run = await runTextScenario(
    scenario,
    { modelFetch: model.provider },
    {
      profile: 'controlled',
      repetition: 1,
      followUps: true,
      judge: async (input) => {
        inputs.push(input);
        const currentReply =
          JSON.parse(input.context.split('\n').find((line) => line.startsWith('{')) ?? '{}')
            .request === 'Jag menar Bibliotek Plus.';
        return input.requirements.map(({ id }) => ({
          id,
          outcome:
            id === 'backend-0' || (currentReply && id.endsWith('-retention')) ? 'fail' : 'pass',
          reason: 'Controlled original completion and subsequent lost target constraints.',
        }));
      },
    },
  );
  expect(run.attempts).toHaveLength(2);
  expect(run.attempts[1]).toMatchObject({
    outcome: 'fail',
    elapsedMs: null,
    content: [expect.objectContaining({ id: 'backend-retention', outcome: 'fail' })],
  });
  expect(
    inputs.some(
      (input) =>
        JSON.parse(input.context.split('\n').find((line) => line.startsWith('{')) ?? '{}')
          .request === 'Jag menar Bibliotek Plus.' &&
        input.requirements.some(({ id }) => id === 'backend-retention'),
    ),
  ).toBe(true);
});

test.each(['pass', 'fail', 'missing'] as const)(
  'ordinary voice retention verifies both sources with empty content requirements (%s)',
  { tags: ['technical'] },
  async (verdict) => {
    const original = manifest.voices.marin.clips['kontext-forsta-andring'].text;
    const scenario: Scenario = {
      id: 'ordinary-voice-retention',
      title: 'Voice and text share declared retention obligations',
      voice: true,
      steps: [
        {
          id: 'kontext-forsta-andring',
          text: original,
          expected: { requirements: [], preservedRequests: [original] },
        },
      ],
    };
    const model = textModel(() => [
      modelTool('ask_questions', {
        questions: [
          {
            kind: 'change',
            request:
              verdict === 'pass'
                ? 'Sätt Spotify Premium Familys månadspris till 189 kronor.'
                : 'Ändra priset.',
            question: 'Vilket abonnemang avser du?',
            dependsOnDraft: true,
          },
        ],
      }),
    ]);
    const live = liveProvider();
    let offset = 0;
    // This substitutes only the external media adapter. The authenticated voice
    // routes, application state, work model transport and retention check are real.
    // It supplies controlled recording evidence, not an acoustic-quality claim.
    vi.spyOn(speech, 'speechConnection').mockImplementation(
      async (environment) =>
        ({
          async start() {
            const view = await environment.get<TextAssistantView>(environment.path);
            const result = await environment.post<{ voice: { id: string } }>(
              `${environment.path}/voice`,
              {
                sdp: 'synthetic-offer',
                revision: view.revision,
                draftVersion: view.review.version,
                contentVersion: view.review.contentVersion,
              },
            );
            return result.voice.id;
          },
          async play() {
            const id = [...live.channels.keys()][0];
            const startedAt = Date.now();
            live.emit(id, {
              type: 'session.input_transcript.delta',
              event_id: crypto.randomUUID(),
              delta: original,
              start_ms: offset,
              end_ms: ++offset,
            });
            live.emit(id, {
              type: 'session.delegation.created',
              event_id: crypto.randomUUID(),
              offset_ms: offset,
              delegation: { id: crypto.randomUUID(), type: 'delegation', target: 'client' },
            });
            return { startedAt, endedAt: Date.now(), frames: 24000, sha256: 'controlled-input' };
          },
          retire: async () => {},
          close: async () => {},
          observedAt: async () => Date.now(),
          recording: async () =>
            recordedPlayback(
              {
                sampleRate: 48000,
                firstFrame: 0,
                frames: 48000,
                lastActiveFrame: 4800,
                observedAt: Date.now(),
                clocks: [
                  { position: 0, at: Date.now() - 3000 },
                  { position: 1, at: Date.now() - 2000 },
                ],
              },
              Buffer.alloc(96000),
            ),
        }) as unknown as Awaited<ReturnType<typeof speech.speechConnection>>,
    );
    const inputs: JudgeInput[] = [];
    const run = await runVoiceScenario(
      scenario,
      {
        modelFetch: model.provider,
        liveFetch: live.provider,
        liveSideband: (...args) => {
          const sideband = live.attach(...args);
          const send = sideband.send.bind(sideband);
          sideband.send = (event) => {
            send(event);
            for (const text of voiceAnswerParts(live.sent.slice(-1)))
              queueMicrotask(() =>
                live.emit(args[1], {
                  type: 'session.output_transcript.delta',
                  event_id: crypto.randomUUID(),
                  delta: text,
                  start_ms: offset,
                  end_ms: ++offset,
                }),
              );
          };
          return sideband;
        },
      },
      {
        profile: 'controlled',
        repetition: 1,
        assessPlayback: async () => ({
          outcome: 'recognized',
          text: 'Vilket abonnemang avser du?',
          lastWordEndSeconds: 0.1,
          alignmentMarginMs: 100,
          profile: 'controlled-state-only',
          callId: 'ordinary-retention-recording',
          costUsd: 0,
        }),
        judge: async (input) => {
          inputs.push(input);
          return input.requirements
            .filter(({ id }) => verdict !== 'missing' || !id.endsWith('-retention'))
            .map(({ id }) => ({
              id,
              outcome: verdict === 'fail' && id.endsWith('-retention') ? 'fail' : 'pass',
              reason: 'Independent controlled rendering and retention evidence.',
            }));
        },
      },
    );
    expect(run.attempts[0]).toMatchObject({
      outcome: verdict === 'missing' ? 'inconclusive' : verdict,
      elapsedMs: null,
      timing: { successfulCompletionMs: null },
    });
    const final = inputs.find((input) =>
      input.requirements.some(({ id }) => id === 'backend-retention'),
    );
    expect(final?.requirements.map(({ id }) => id)).toEqual([
      'backend-retention',
      'voice-retention',
    ]);
  },
);
