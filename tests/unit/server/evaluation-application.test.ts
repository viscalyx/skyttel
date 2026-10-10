import { expect, test } from 'vitest';
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import { modelMessage, modelTool, textModel } from '../../support/text-model.js';

test('evaluation uses real save gates, receipts and history and records rejected unsolicited saves', {
  tags: ['technical'],
}, async () => {
  const scenario = {
    id: 'local-save',
    title: 'Local application verification',
    voice: false,
    steps: [
      {
        id: 'save',
        text: 'Spara hela utkastet.',
        expected: { saves: 1, saveAttempts: 1, requirements: [] },
      },
    ],
  };
  const allowed = textModel((body) => {
    const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    return [
      modelTool('save_draft', {
        version: turn.draft.version,
        contentVersion: turn.draft.contentVersion,
      }),
    ];
  });
  const success = await runTextScenario(
    scenario,
    { modelFetch: allowed.provider },
    { profile: 'local', repetition: 1 },
  );
  expect(success.attempts[0]).toMatchObject({ outcome: 'pass', fixed: [] });
  expect(
    success.events.some(
      (event) => event.kind === 'mcp_completed' && JSON.stringify(event.data).includes('receipt'),
    ),
  ).toBe(true);
  const unwanted = await runTextScenario(
    {
      ...scenario,
      steps: [
        {
          id: 'withdrawn',
          text: 'Spara inte.',
          expected: { saves: 0, saveAttempts: 0, requirements: [] },
        },
      ],
    },
    {
      modelFetch: textModel(() => [modelTool('save_draft', { version: 24, contentVersion: 1 })])
        .provider,
    },
    { profile: 'local', repetition: 1 },
  );
  expect(unwanted.attempts[0].outcome).toBe('fail');
  expect(unwanted.attempts[0].fixed).toContain('unrequested_save_attempt');
  expect(
    unwanted.events.some(
      (event) => event.kind === 'model_action' && JSON.stringify(event.data).includes('save_draft'),
    ),
  ).toBe(true);
  expect(unwanted.finalMap.objects).toHaveLength(22);
  expect(unwanted.finalMap.draft.changes).toHaveLength(2);
});

test('a clarification after a real draft proposal expires save intent while preserving the clear change', {
  tags: ['technical'],
}, async () => {
  const model = textModel((body) => {
    if (body.input.at(-1)?.type === 'function_call_output')
      return [modelMessage('Vilken Alex menar du?')];
    const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    const change = turn.draft.changes.find((item: { id: string }) => item.id === 'lo');
    return [
      modelTool('propose_object', {
        version: turn.draft.version,
        contentVersion: turn.draft.contentVersion,
        id: 'lo',
        baseRevision: change.before.revision,
        value: { ...change.after, description: 'Klar ändring' },
      }),
    ];
  });
  const run = await runTextScenario(
    {
      id: 'proposal-question',
      title: 'Clarification expires authority',
      voice: false,
      steps: [
        {
          id: 'clarify',
          text: 'Ändra Lo Bergs beskrivning till Klar ändring. Alex använder Microsoft 365. Spara hela utkastet.',
          expected: {
            objects: { lo: { description: 'Klar ändring' } },
            saves: 0,
            saveAttempts: 0,
            requirements: [],
          },
        },
      ],
    },
    { modelFetch: model.provider },
    { profile: 'local', repetition: 1 },
  );
  expect(run.attempts[0]).toMatchObject({ outcome: 'pass', fixed: [] });
  expect(
    run.events.some(
      (event) => event.kind === 'mcp_started' && JSON.stringify(event.data).includes('save_draft'),
    ),
  ).toBe(false);
  expect(run.finalMap.draft.changes.find((change) => change.id === 'lo')?.after?.description).toBe(
    'Klar ändring',
  );
});
