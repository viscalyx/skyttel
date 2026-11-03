import { expect, test } from 'vitest';
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import type { Scenario } from '../../../scripts/model-evaluation/types.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import {
  lastToolResult,
  modelMessage,
  modelTool,
  pendingUpdate,
  textModel,
} from '../../support/text-model.js';

test('intermediate prose is a response observation but cannot establish the first useful answer', {
  tags: ['technical'],
}, async () => {
  let statusDelivered!: () => void;
  const status = new Promise<void>((resolve) => {
    statusDelivered = resolve;
  });
  const model = textModel(async () => {
    await status;
    await new Promise((resolve) => setTimeout(resolve, 120));
    return [modelMessage('Det verifierade fullständiga svaret.')];
  });
  const run = await runTextScenario(
    {
      id: 'status-before-answer',
      title: 'Status before useful answer',
      voice: false,
      steps: [
        {
          id: 'answer',
          text: 'Besvara frågan.',
          expected: { requirements: ['Ge det fullständiga svaret.'] },
        },
      ],
    },
    {
      modelFetch: model.provider,
      deliverResponse: async (request, response) => {
        if (request.method === 'GET' && /\/messages\/[^/]+$/.test(new URL(request.url).pathname)) {
          const view = (await response.clone().json()) as TextAssistantView;
          if (view.taskStatus === 'working') {
            statusDelivered();
            const headers = new Headers(response.headers);
            headers.delete('content-length');
            return Response.json({ ...view, modelReply: 'Jag undersöker frågan.' }, { headers });
          }
        }
        return response;
      },
    },
    {
      profile: 'local',
      repetition: 1,
      judge: async (input) => {
        expect(input.sources.backend?.text).toContain('Det verifierade fullständiga svaret.');
        return input.requirements.map(({ id }) => ({
          id,
          outcome: 'pass',
          reason: 'Complete required answer delivered.',
        }));
      },
    },
  );
  expect(run.attempts[0]).toMatchObject({ outcome: 'pass' });
  expect(run.attempts[0].timing?.firstResponseMs).not.toBeNull();
  expect(run.attempts[0].timing?.firstUsefulMs).toBeNull();
  expect(
    (run.attempts[0].timing?.firstVerifiedUsefulMs ?? 0) -
      (run.attempts[0].timing?.firstResponseMs ?? 0),
  ).toBeGreaterThanOrEqual(100);
  expect(run.attempts[0].timing?.firstUsefulLimitation).toContain(
    'earlier delivered prose is unverified',
  );
});

test('text queue wait belongs to the submitted request and excludes the previous reply from first useful response', {
  tags: ['technical'],
}, async () => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let work = 0;
  const model = textModel(async (_body, signal) => {
    if (work++ === 0) {
      await Promise.race([
        held,
        new Promise<void>((resolve) =>
          signal?.addEventListener('abort', () => resolve(), { once: true }),
        ),
      ]);
      return [modelMessage('Det tidigare svaret.')];
    }
    return [modelMessage('Det nya fullständiga svaret.')];
  });
  try {
    const run = await runTextScenario(
      {
        id: 'queued',
        title: 'Queued text delivery',
        voice: false,
        steps: [{ id: 'read', text: 'En ny fråga.', expected: { requirements: [] } }],
      },
      {
        modelFetch: model.provider,
        deliverResponse: async (request, response) => {
          if (
            request.method === 'POST' &&
            /\/text-assistant$/.test(new URL(request.url).pathname)
          ) {
            const view = (await response.clone().json()) as TextAssistantView;
            const accepted = await fetch(`${request.url}/${view.id}/messages`, {
              method: 'POST',
              headers: {
                cookie: request.headers.get('cookie') ?? '',
                origin: new URL(request.url).origin,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                requestId: 'earlier-request',
                revision: view.revision,
                draftVersion: view.review.version,
                contentVersion: view.review.contentVersion,
                text: 'Håll den tidigare frågan.',
              }),
            });
            if (!accepted.ok) throw new Error('controlled_queue_admission_failed');
            timer = setTimeout(release, 150);
          }
          return response;
        },
      },
      { profile: 'local', repetition: 1 },
    );
    const result = run.attempts[0];
    expect(result).toMatchObject({ outcome: 'pass', timing: { contract: 'text-delivery-v2' } });
    expect(result.timing?.queueMs).toBeGreaterThanOrEqual(70);
    expect(result.timing?.firstUsefulMs).toBeGreaterThanOrEqual(result.timing?.queueMs ?? 0);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(result.timing?.queueMs ?? 0);
  } finally {
    release();
    clearTimeout(timer);
  }
});

test.each(['incomplete', 'canceled'] as const)(
  'text %s preserves its observed outcome without successful completion time',
  { tags: ['technical'] },
  async (mode) => {
    let stopped = false;
    const model = textModel(async (_body, signal) => {
      if (mode === 'canceled') {
        stopped = true;
        await new Promise<void>((resolve) => {
          if (signal?.aborted) resolve();
          else signal?.addEventListener('abort', () => resolve(), { once: true });
        });
      }
      return [modelMessage('Ett ofullständigt eller sent svar.')];
    });
    const run = await runTextScenario(
      {
        id: 'unfinished',
        title: 'Unfinished text',
        voice: false,
        steps: [
          { id: 'first', text: 'Svara på frågan.', expected: { requirements: [] } },
          { id: 'dependent', text: 'Fortsätt sedan.', expected: { requirements: [] } },
        ],
      },
      {
        modelFetch: async (url, init) => {
          const response = await model.provider(url, init);
          const body = JSON.parse(String(init?.body));
          if (mode === 'incomplete' && !body.instructions.startsWith('SKYTTEL_TURN_'))
            return Response.json(
              { ...(await response.json()), status: 'incomplete' },
              { headers: response.headers },
            );
          return response;
        },
      },
      {
        profile: 'local',
        repetition: 1,
        stopped: () => stopped,
        stopReason: () => 'controlled_cancel',
        providerCalls: () => model.requests.length + model.authorizationRequests.length,
      },
    );
    expect(run.attempts[0].outcome).toBe(mode === 'canceled' ? 'aborted' : 'fail');
    expect(run.attempts[0]).toMatchObject({
      elapsedMs: null,
      timing: { firstUsefulMs: null, successfulCompletionMs: null },
    });
    expect(run.attempts[0].observedEndMs).toBeGreaterThanOrEqual(0);
    expect(run.attempts[1]).toMatchObject({ outcome: 'not_run', elapsedMs: null });
    expect(model.requests).toHaveLength(1);
  },
);

test('assisted text retains the full exchange origin and treats a necessary question as useful but unfinished', {
  tags: ['technical'],
}, async () => {
  const question = 'Vilken person menar du?';
  const request = 'Ändra beskrivningen till Läser poesi. Spara inte.';
  const scenario: Scenario = {
    id: 'assisted-timing',
    title: 'Complete assisted text wait',
    voice: false,
    steps: [
      {
        id: 'description',
        text: request,
        expected: {
          objects: {
            lo: {
              properties: [
                { id: 'description', label: 'Beskrivning', kind: 'text', value: 'Läser poesi' },
              ],
            },
          },
          requirements: ['Bekräfta den färdiga ändringen.'],
        },
        followUps: [
          {
            id: 'identify-person',
            text: 'Jag menar Lo Berg.',
            when: 'Skyttel frågar vilken person som avses.',
            waiting: { requirements: ['Ställ den riktade frågan och bevara utkastet.'] },
            requirements: ['Bekräfta den färdiga ändringen.'],
          },
        ],
      },
    ],
  };
  const model = textModel(async (body) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    const parts = lastToolResult(body)?.pendingParts ?? turn.pendingParts;
    if (!parts.length)
      return [
        modelTool('ask_questions', {
          questions: [{ kind: 'change', request, question, dependsOnDraft: true }],
        }),
      ];
    if (parts[0].status === 'waiting')
      return [
        modelTool('ask_questions', {
          questions: [],
          updates: [pendingUpdate(body, question)],
          continueResponse: true,
        }),
      ];
    const change = turn.draft.changes.find((item: { id: string }) => item.id === 'lo');
    return [
      modelTool('submit_changes', {
        version: turn.draft.version,
        contentVersion: turn.draft.contentVersion,
        completion: 'draft',
        questions: [],
        resolves: [{ id: parts[0].id, revision: parts[0].revision }],
        operations: [
          {
            name: 'propose_object',
            arguments: {
              id: 'lo',
              baseRevision: change.before?.revision ?? null,
              value: {
                ...change.after,
                properties: scenario.steps[0].expected.objects?.lo.properties,
              },
            },
          },
        ],
      }),
    ];
  });
  const run = await runTextScenario(
    scenario,
    {
      modelFetch: model.provider,
      deliverResponse: async (request, response) => {
        if (request.method === 'GET' && /\/messages\/[^/]+$/.test(new URL(request.url).pathname)) {
          const view = (await response.clone().json()) as TextAssistantView;
          if (view.taskStatus === 'completed' && view.result)
            await new Promise((resolve) => setTimeout(resolve, 70));
        }
        return response;
      },
    },
    {
      profile: 'local',
      repetition: 1,
      followUps: true,
      judge: async (input) => {
        const clarification = input.requirements.some(({ id }) => id.endsWith('-necessary'));
        if (clarification) await new Promise((resolve) => setTimeout(resolve, 70));
        return input.requirements.map(({ id }) => ({
          id,
          outcome:
            !clarification && input.sources.backend?.text.includes(question) ? 'fail' : 'pass',
          reason: 'Controlled ambiguity and completed-state evidence.',
        }));
      },
    },
  );
  expect(run.attempts).toHaveLength(2);
  expect(run.attempts[0]).toMatchObject({
    outcome: 'fail',
    elapsedMs: null,
    assessment: { kind: 'necessary_clarification' },
    timing: { successfulCompletionMs: null },
  });
  expect(run.attempts[0].timing?.firstUsefulMs).toBeGreaterThan(0);
  expect(run.attempts[1], JSON.stringify(run.attempts[1])).toMatchObject({
    outcome: 'pass',
    followUpFor: 'description',
  });
  expect(run.attempts[1].elapsedMs).toBeGreaterThanOrEqual(70);
  expect(run.attempts[1].assistedElapsedMs).toBeGreaterThanOrEqual(110);
  expect(run.attempts[1].assistedEvaluationOverheadMs).toBeGreaterThanOrEqual(70);
  expect(run.attempts[1].assistedWallElapsedMs).toBe(
    (run.attempts[1].assistedElapsedMs ?? 0) + (run.attempts[1].assistedEvaluationOverheadMs ?? 0),
  );
});
