import { expect, test } from 'vitest';
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import type { Scenario } from '../../../scripts/model-evaluation/types.js';
import type { MapState } from '../../../src/shared/map.js';
import { type ModelRequest, modelMessage, modelTool, textModel } from '../../support/text-model.js';

function descriptionChange(body: ModelRequest, description: string) {
  const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
  const proposal = turn.draft.changes.find((item: { id: string }) => item.id === 'lo');
  return modelTool('submit_changes', {
    version: turn.draft.version,
    contentVersion: turn.draft.contentVersion,
    completion: 'draft',
    questions: [],
    operations: [
      {
        name: 'propose_object',
        arguments: {
          id: 'lo',
          baseRevision: proposal.before.revision,
          value: {
            ...proposal.after,
            properties: [
              { id: 'description', label: 'Beskrivning', kind: 'text', value: description },
            ],
          },
        },
      },
    ],
  });
}

const stopScenario: Scenario = {
  id: 'controlled-stop',
  title: 'Stop through the public conversation control',
  voice: false,
  steps: [
    {
      id: 'held-question',
      text: 'Vad kostar Spotify Premium Family?',
      expected: { requirements: [] },
      userStop: {
        trigger: 'first-working-after-input',
        maximumObservationMs: 5000,
        allowedStates: [{ saves: 0, saveAttempts: 0, requirements: [] }],
      },
    },
  ],
};

test.each(['sequential', 'overlap'] as const)(
  'scripted user Stop in %s retains cancellation as an unsuccessful task and verifies its own endpoint',
  { tags: ['technical'] },
  async (conversationWorkMode) => {
    let aborted = 0;
    const model = textModel(async (request, signal) => {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1500);
        const finish = () => {
          clearTimeout(timer);
          aborted++;
          resolve();
        };
        if (signal?.aborted) finish();
        else signal?.addEventListener('abort', finish, { once: true });
      });
      return [descriptionChange(request, 'Fel efter stopp.')];
    });
    const run = await runTextScenario(
      stopScenario,
      {
        modelFetch: model.provider,
        conversationWorkMode,
      },
      { profile: 'controlled', repetition: 1 },
    );
    expect(run.attempts[0]).toMatchObject({
      outcome: 'aborted',
      reason: 'evaluation_scripted_user_stop',
      elapsedMs: null,
      scriptedStop: {
        contract: 'public-user-stop-v1',
        verdict: 'pass',
        matchedState: 0,
        terminalStatus: 'canceled',
        stateFailures: [],
      },
    });
    expect(run.attempts[0].scriptedStop?.endpointMs).toEqual(expect.any(Number));
    expect(run.attempts[0].timing?.successfulCompletionMs).toBeNull();
    expect(aborted).toBeGreaterThan(0);
  },
);

test('a task completed before the declared working boundary is inconclusive rather than a successful Stop', {
  tags: ['technical'],
}, async () => {
  const model = textModel(() => [modelMessage('Det färdiga svaret.')]);
  const run = await runTextScenario(
    stopScenario,
    {
      modelFetch: model.provider,
      deliverResponse: async (request, response) => {
        if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/messages'))
          await new Promise((resolve) => setTimeout(resolve, 150));
        return response;
      },
    },
    { profile: 'controlled', repetition: 1 },
  );
  expect(run.attempts[0]).toMatchObject({
    outcome: 'inconclusive',
    elapsedMs: null,
    scriptedStop: { verdict: 'inconclusive', endpointMs: null, reason: 'working_boundary_missed' },
  });
});

test('Stop preserves a previously completed checked draft batch while rejecting the stopped turn late result', {
  tags: ['technical'],
}, async () => {
  let work = 0;
  const model = textModel(async (request, signal) => {
    if (work++ === 0) return [descriptionChange(request, 'Läser poesi.')];
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1500);
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      if (signal?.aborted) finish();
      else signal?.addEventListener('abort', finish, { once: true });
    });
    return [descriptionChange(request, 'Fel efter stopp.')];
  });
  const run = await runTextScenario(
    {
      ...stopScenario,
      steps: [
        {
          id: 'complete-batch',
          text: 'Ändra Lo Bergs beskrivning till Läser poesi. Spara inte.',
          expected: {
            objects: {
              lo: {
                properties: [
                  {
                    id: 'description',
                    label: 'Beskrivning',
                    kind: 'text',
                    value: 'Läser poesi.',
                  },
                ],
              },
            },
            saves: 0,
            requirements: [],
          },
        },
        ...stopScenario.steps,
      ],
    },
    { modelFetch: model.provider },
    { profile: 'controlled', repetition: 1 },
  );
  expect(run.attempts.map((attempt) => attempt.outcome)).toEqual(['pass', 'aborted']);
  expect(run.attempts[1].scriptedStop).toMatchObject({ verdict: 'pass', stateFailures: [] });
  expect(
    run.finalMap.draft.changes.find((change) => change.id === 'lo')?.after?.properties,
  ).toEqual([{ id: 'description', label: 'Beskrivning', kind: 'text', value: 'Läser poesi.' }]);
});

test('an otherwise allowed state introduced after Stop acknowledgement is rejected', {
  tags: ['technical'],
}, async () => {
  let canceled = false;
  let changed = false;
  const model = textModel(async (_request, signal) => {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1500);
      const finish = () => {
        clearTimeout(timer);
        resolve();
      };
      if (signal?.aborted) finish();
      else signal?.addEventListener('abort', finish, { once: true });
    });
    return [modelMessage('Sent svar.')];
  });
  const scenario = structuredClone(stopScenario);
  scenario.steps[0].userStop?.allowedStates.push({
    objects: {
      lo: {
        properties: [
          {
            id: 'description',
            label: 'Beskrivning',
            kind: 'text',
            value: 'Fel efter stopp.',
          },
        ],
      },
    },
    saves: 0,
    requirements: [],
  });
  const run = await runTextScenario(
    scenario,
    {
      modelFetch: model.provider,
      deliverResponse: async (request, response) => {
        const path = new URL(request.url).pathname;
        if (request.method === 'POST' && path.endsWith('/cancel')) canceled = true;
        if (canceled && !changed && request.method === 'GET' && /\/messages\/[^/]+$/.test(path)) {
          changed = true;
          const base = request.url.split('/text-assistant/')[0];
          const headers = {
            cookie: request.headers.get('cookie') ?? '',
            origin: new URL(base).origin,
            'content-type': 'application/json',
          };
          const map = (await (await fetch(`${base}/map`, { headers })).json()) as MapState;
          const lo = map.objects.find((item) => item.id === 'lo');
          if (!lo) throw new Error('Missing Lo fixture');
          const { id, revision, householdId: _household, ...value } = lo;
          const mutation = await fetch(`${base}/map/draft`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              version: map.draft.version,
              contentVersion: map.contentVersion,
              id,
              baseRevision: revision,
              value: {
                ...value,
                properties: [
                  {
                    id: 'description',
                    label: 'Beskrivning',
                    kind: 'text',
                    value: 'Fel efter stopp.',
                  },
                ],
              },
            }),
          });
          expect(mutation.ok).toBe(true);
        }
        return response;
      },
    },
    { profile: 'controlled', repetition: 1 },
  );
  expect(changed).toBe(true);
  expect(run.attempts[0]).toMatchObject({
    outcome: 'fail',
    elapsedMs: null,
    scriptedStop: { verdict: 'fail', stateFailures: ['state_changed_after_stop_acknowledgment'] },
  });
});
