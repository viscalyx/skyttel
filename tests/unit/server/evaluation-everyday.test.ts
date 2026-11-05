import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import rawCatalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import { evaluationEnvironment } from '../../../scripts/model-evaluation/environment.js';
import approvedSource from '../../../scripts/model-evaluation/everyday-source.json' with {
  type: 'json',
};
import { runTextScenario } from '../../../scripts/model-evaluation/runner.js';
import type { Scenario } from '../../../scripts/model-evaluation/types.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../../support/text-model.js';

test('every approved everyday entry keeps its own scenario and exact utterances', () => {
  const approvedPromptHash = '84f76eaef4a3112027a9248cd7b6b3c206ec77ac32838d2ad8c00b7bd4bfa924';
  const promptSnapshot = approvedSource.entries.map((entry) => ({
    number: entry.number,
    prompts: entry.prompts,
    ...('conditionalPrompts' in entry ? { conditionalPrompts: entry.conditionalPrompts } : {}),
  }));
  expect(approvedSource.approvedPromptTextSha256).toBe(approvedPromptHash);
  expect(createHash('sha256').update(JSON.stringify(promptSnapshot)).digest('hex')).toBe(
    approvedPromptHash,
  );
  expect(
    createHash('sha256')
      .update(
        readFileSync(
          new URL('../../../scripts/model-evaluation/everyday-source.json', import.meta.url),
        ),
      )
      .digest('hex'),
  ).toBe(rawCatalog.everydaySource.sha256);
  expect(rawCatalog.everydaySource.entries).toEqual(
    approvedSource.entries.map(({ number, scenario }) => ({ number, scenario })),
  );
  const scenarios = rawCatalog.scenarios as Scenario[];
  expect(approvedSource.entries.map((entry) => entry.number)).toEqual(
    Array.from({ length: 60 }, (_value, index) => index + 1),
  );
  expect(new Set(approvedSource.entries.map((entry) => entry.scenario)).size).toBe(60);
  expect(scenarios.filter((scenario) => scenario.group === 'everyday')).toHaveLength(60);
  expect(scenarios.filter((scenario) => scenario.group === 'complex')).toHaveLength(8);
  expect(scenarios.filter((scenario) => scenario.group === 'long_conversation')).toHaveLength(2);
  for (const entry of approvedSource.entries) {
    const scenario = scenarios.find((scenario) => scenario.id === entry.scenario);
    expect(scenario?.steps.map((step) => step.text)).toEqual(entry.prompts);
    if ('conditionalPrompts' in entry)
      expect(
        scenario?.steps.flatMap((step) => step.followUps?.map((reply) => reply.text) ?? []),
      ).toEqual(entry.conditionalPrompts);
    if (entry.number === 60) expect(scenario?.steps[0].userStop).toBeDefined();
  }
});

test.each(rawCatalog.scenarios as Scenario[])(
  'the independent fixture for $id is realizable and unchanged through public map checks',
  { tags: ['technical'] },
  async (scenario) => {
    const model = textModel(() => {
      throw new Error('Fixture preflight must never call a model.');
    });
    const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
    try {
      expect(
        await environment.check(
          { id: 'fixture-preflight', expected: { requirements: [] } },
          environment.assistant,
          [],
        ),
      ).toEqual([]);
      expect(model.requests).toEqual([]);
      expect(model.authorizationRequests).toEqual([]);
    } finally {
      await environment.close();
    }
  },
);

test('an everyday scenario starts from its own saved household facts and draft', {
  tags: ['technical'],
}, async () => {
  const scenario = {
    id: 'isolated-everyday',
    title: 'An independently prepared household',
    voice: false,
    fixture: {
      objects: [{ id: 'nora', type: 'Person', name: 'Nora' }],
      relationships: [],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [{ id: 'read', text: 'Finns Nora?', expected: { requirements: [] } }],
  } as Scenario;
  const model = textModel(() => [modelMessage('Nora finns i kartan.')]);
  const run = await runTextScenario(
    scenario,
    { modelFetch: model.provider },
    { profile: 'controlled', repetition: 1 },
  );
  expect(run.attempts[0]).toMatchObject({ outcome: 'pass', fixed: [] });
  expect(run.finalMap.objects.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: 'nora', name: 'Nora' },
  ]);
  expect(run.finalMap.draft.changes).toEqual([]);
});

test('overlapping whole-state representations stay inconclusive without completion time', {
  tags: ['technical'],
}, async () => {
  const model = textModel(() => [modelMessage('Klart.')]);
  const run = await runTextScenario(
    {
      id: 'ambiguous-state',
      title: 'Ambiguous independent expectations',
      voice: false,
      fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
      steps: [
        {
          id: 'question',
          text: 'Finns det något?',
          expected: {
            anyOf: [{ requirements: [] }, { requirements: [] }],
            requirements: [],
          },
        },
      ],
    },
    { modelFetch: model.provider },
    { profile: 'controlled', repetition: 1 },
  );
  expect(run.attempts[0]).toMatchObject({
    outcome: 'inconclusive',
    reason: 'evaluation_state_identity_ambiguous',
    elapsedMs: null,
    timing: { successfulCompletionMs: null },
  });
});

test('deletion removes only its declared object and incident relationship', {
  tags: ['technical'],
}, async () => {
  const scenario: Scenario = {
    id: 'delete-account',
    title: 'Remove old account',
    voice: false,
    fixture: {
      objects: [
        { id: 'account', type: 'Tjänstekonto', name: 'Gammalt konto' },
        { id: 'service', type: 'Tjänst', name: 'Dropbox' },
      ],
      relationships: [{ source: 'account', type: 'Tillhör tjänsten', target: 'service' }],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [
      {
        id: 'delete',
        text: 'Ta bort mitt gamla konto.',
        expected: {
          removeObjects: ['account'],
          removeRelationships: [{ source: 'account', type: 'Tillhör tjänsten', target: 'service' }],
          requirements: [],
        },
      },
    ],
  };
  const model = textModel(() => [modelMessage('Kontrollerad leverantör.')]);
  const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    for (const id of ['account', 'service']) {
      const map = await environment.read();
      await environment.post('map/draft', {
        version: map.draft.version,
        contentVersion: map.contentVersion,
        id,
        baseRevision: map.objects.find((item) => item.id === id)?.revision,
        value: null,
      });
      const failures = await environment.check(scenario.steps[0], environment.assistant, []);
      if (id === 'account') expect(failures).toEqual([]);
      else expect(failures).toContain('effective_objects');
    }
  } finally {
    await environment.close();
  }
});

test('ordinary stopped usage can retain its ended relationship without ending the service', {
  tags: ['technical'],
}, async () => {
  const scenario = (rawCatalog.scenarios as Scenario[]).find(
    (scenario) => scenario.id === 'everyday-08',
  );
  if (!scenario) throw new Error('Missing approved stopped-usage scenario.');
  const model = textModel(() => [modelMessage('Kontrollerad leverantör.')]);
  const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    const map = await environment.read();
    const relationship = map.relationships[0];
    await environment.post('map/relationship', {
      version: map.draft.version,
      contentVersion: map.contentVersion,
      id: relationship.id,
      baseRevision: relationship.revision,
      value: {
        typeId: relationship.typeId,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        lifecycle: 'ended',
      },
    });
    expect(await environment.check(scenario.steps[0], environment.assistant, [])).toEqual([]);
    const endedMap = await environment.read();
    await environment.post('map/relationship', {
      version: endedMap.draft.version,
      contentVersion: endedMap.contentVersion,
      id: relationship.id,
      baseRevision: relationship.revision,
      value: null,
    });
    const removedMap = await environment.read();
    await environment.post('map/relationship', {
      version: removedMap.draft.version,
      contentVersion: removedMap.contentVersion,
      id: 'replacement-link',
      baseRevision: null,
      value: {
        typeId: relationship.typeId,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        lifecycle: 'ended',
      },
    });
    expect(await environment.check(scenario.steps[0], environment.assistant, [])).toContain(
      'relationship_identity',
    );
  } finally {
    await environment.close();
  }
});

test('uncertainty contracts reject confident links, reversed links and unauthorized saving', {
  tags: ['technical'],
}, async () => {
  const scenario: Scenario = {
    id: 'uncertain-usage',
    title: 'Uncertain usage',
    voice: false,
    fixture: {
      objects: [
        { id: 'mira', type: 'Person', name: 'Mira' },
        { id: 'dropbox', type: 'Tjänst', name: 'Dropbox' },
      ],
      relationships: [],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [
      {
        id: 'use',
        text: 'Jag tror att Mira använder Dropbox.',
        expected: {
          addRelationships: [{ source: 'mira', type: 'Använder', target: 'dropbox' }],
          semanticRelationships: [
            {
              source: 'mira',
              type: 'Använder',
              target: 'dropbox',
              properties: {
                preserve: [],
                additions: [{ kinds: ['boolean', 'text'], values: { boolean: true } }],
              },
            },
          ],
          requirements: ['The complete map records uncertain usage, never confident usage.'],
        },
      },
    ],
  };
  const model = textModel(() => [modelMessage('Kontrollerad leverantör.')]);
  const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    for (const variant of ['uncertain', 'confident', 'false-marker', 'reversed', 'saved']) {
      const map = await environment.read();
      await environment.post('map/relationship', {
        version: map.draft.version,
        contentVersion: map.contentVersion,
        id: 'generated-link',
        baseRevision: null,
        value: {
          typeId: map.relationshipTypes.find((type) => type.name === 'Använder')?.id,
          sourceId: variant === 'reversed' ? 'dropbox' : 'mira',
          targetId: variant === 'reversed' ? 'mira' : 'dropbox',
          properties:
            variant === 'confident'
              ? []
              : [
                  {
                    id: 'generated-marker',
                    label: 'Uppgiften är osäker',
                    kind: 'boolean',
                    value: variant !== 'false-marker',
                  },
                ],
        },
      });
      if (variant === 'saved') {
        const current = await environment.read();
        await environment.post('map/save', {
          version: current.draft.version,
          contentVersion: current.contentVersion,
          operationId: 'unauthorized-save',
        });
      }
      const view = await environment.get<TextAssistantView>(environment.path);
      const failures = await environment.check(scenario.steps[0], view, []);
      if (variant === 'uncertain') expect(failures).toEqual([]);
      else if (variant === 'saved') expect(failures).toContain('saved_map_changed');
      else expect(failures).toContain('effective_relationships');
    }
  } finally {
    await environment.close();
  }
});

test('bounded representations preserve their actual branch across the next request', {
  tags: ['technical'],
}, async () => {
  const scenario = {
    id: 'bounded-household',
    title: 'Bounded representations',
    voice: false,
    fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
    steps: [
      {
        id: 'add',
        text: 'Lägg till Disney+.',
        expected: {
          objects: { service: { type: 'Tjänst', name: 'Disney+' } },
          anyOf: [
            { requirements: [] },
            {
              objects: { subscription: { type: 'Abonnemang', name: 'Disney+ abonnemang' } },
              requirements: [],
            },
          ],
          requirements: [
            'Only Disney+ and its optional subscription are present, without invented facts.',
          ],
        },
      },
      { id: 'keep', text: 'Tack.', expected: { requirements: [] } },
    ],
  } as Scenario;
  const model = textModel(() => [modelMessage('Kontrollerad leverantör.')]);
  const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    for (const [id, type, name] of [
      ['random-service', 'Tjänst', 'Disney+'],
      ['random-subscription', 'Abonnemang', 'Disney+ abonnemang'],
    ]) {
      const map = await environment.read();
      await environment.post('map/draft', {
        version: map.draft.version,
        contentVersion: map.contentVersion,
        id,
        baseRevision: null,
        value: { typeId: map.types.find((item) => item.name === type)?.id, name },
      });
    }
    expect(await environment.check(scenario.steps[0], environment.assistant, [])).toEqual([]);
    expect(await environment.check(scenario.steps[1], environment.assistant, [])).toEqual([]);
  } finally {
    await environment.close();
  }
});

test('semantic property labels preserve fixed values, untouched facts and the complete delta', {
  tags: ['technical'],
}, async () => {
  const scenario = {
    id: 'contract-end',
    title: 'Contract end date',
    voice: false,
    fixture: {
      objects: [
        {
          id: 'broadband',
          type: 'Abonnemang',
          name: 'Telias bredband',
          properties: [{ id: 'description', label: 'Beskrivning', kind: 'text', value: 'Behåll.' }],
        },
      ],
      relationships: [],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [
      {
        id: 'date',
        text: 'Bindningstiden går ut den 31 mars 2027.',
        expected: {
          semanticObjects: {
            broadband: {
              properties: {
                preserve: ['description'],
                additions: [{ kinds: ['date'], value: '2027-03-31' }],
              },
            },
          },
          requirements: [
            'The complete map records only the requested contract end date and preserves the description.',
          ],
        },
      },
    ],
  } as Scenario;
  const model = textModel(() => [modelMessage('Kontrollerad leverantör.')]);
  const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    for (const variant of [
      'equivalent-label',
      'wrong-date',
      'extra-property',
      'lost-description',
    ]) {
      const map = await environment.read();
      const object = map.objects[0];
      await environment.post('map/draft', {
        version: map.draft.version,
        contentVersion: map.contentVersion,
        id: object.id,
        baseRevision: object.revision,
        value: {
          typeId: object.typeId,
          name: object.name,
          properties: [
            ...(variant === 'lost-description' ? [] : (object.properties ?? [])),
            {
              id: 'generated-date',
              label: 'Bindningstidens slut',
              kind: 'date',
              value: variant === 'wrong-date' ? '2027-03-30' : '2027-03-31',
            },
            ...(variant === 'extra-property'
              ? [{ id: 'unauthorized', label: 'Ort', kind: 'text', value: 'Uppsala' }]
              : []),
          ],
        },
      });
      const failures = await environment.check(scenario.steps[0], environment.assistant, []);
      if (variant === 'equivalent-label') expect(failures).toEqual([]);
      else expect(failures).toContain('effective_objects');
    }
  } finally {
    await environment.close();
  }
});

test('new identities are matched by declared content and cannot disguise extra objects', {
  tags: ['technical'],
}, async () => {
  for (const extra of [false, true]) {
    const scenario = {
      id: 'new-service',
      title: 'Add the requested service',
      voice: false,
      fixture: { objects: [], relationships: [], relationshipTypes: [], draft: { objects: {} } },
      steps: [
        {
          id: 'add',
          text: 'Lägg till Disney+.',
          expected: {
            objects: { disney: { type: 'Tjänst', name: 'Disney+' } },
            semanticObjects: { disney: { name: true } },
            requirements: ['The effective map contains only the requested Disney+ service.'],
          },
        },
      ],
    } as Scenario;
    const model = textModel((body) => {
      if (model.requests.length === 1) return [modelTool('read_type_catalog', {})];
      const types = lastToolResult(body).types;
      const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
      return [
        modelTool('submit_changes', {
          version: turn.draft.version,
          contentVersion: turn.draft.contentVersion,
          completion: 'draft',
          questions: [],
          operations: [
            {
              name: 'propose_object',
              arguments: {
                id: 'generated-disney-identity',
                baseRevision: null,
                value: {
                  typeId: types.find((item: { name: string }) => item.name === 'Tjänst').id,
                  name: 'Disney Plus',
                },
              },
            },
            ...(extra
              ? [
                  {
                    name: 'propose_object',
                    arguments: {
                      id: 'unrequested-identity',
                      baseRevision: null,
                      value: {
                        typeId: types.find((item: { name: string }) => item.name === 'Tjänst').id,
                        name: 'HBO',
                      },
                    },
                  },
                ]
              : []),
          ],
        }),
      ];
    });
    const run = await runTextScenario(
      scenario,
      { modelFetch: model.provider },
      {
        profile: 'controlled',
        repetition: 1,
        judge: async ({ context, requirements }) => {
          expect(JSON.parse(context).observedState.effective.objects).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ name: 'Disney Plus', type: 'Tjänst' }),
            ]),
          );
          return requirements.map(({ id }) => ({
            id,
            outcome: 'pass',
            reason: 'Independent controlled verdict.',
          }));
        },
      },
    );
    expect(run.attempts[0].outcome).toBe(extra ? 'fail' : 'pass');
    if (extra) expect(run.attempts[0].fixed).toContain('effective_objects');
  }
});
