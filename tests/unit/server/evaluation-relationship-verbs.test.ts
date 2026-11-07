import { expect, test } from 'vitest';
import { evaluationEnvironment } from '../../../scripts/model-evaluation/environment.js';
import { concludeAttempt } from '../../../scripts/model-evaluation/observations.js';
import {
  checkedContentVerdicts,
  contentRequirements,
} from '../../../scripts/model-evaluation/retained-work.js';
import type { Attempt, Scenario } from '../../../scripts/model-evaluation/types.js';
import { textModel } from '../../support/text-model.js';

test.each([
  ['forward phrase', 'account', 'email', 'har kontaktadressen', 'pass'],
  ['reverse phrase', 'email', 'account', 'är kontaktadress för', 'pass'],
  ['wrong role', 'account', 'email', 'har inloggningsadressen', 'fail'],
  ['wrong phrase direction', 'email', 'account', 'har kontaktadressen', 'fail'],
  ['wrong endpoint', 'account', 'company', 'har kontaktadressen', 'fail'],
] as const)(
  'semantic relationship wording requires independent judgment: %s',
  { tags: ['technical'] },
  async (_name, sourceId, targetId, verb, outcome) => {
    const scenario: Scenario = {
      id: 'semantic-role',
      title: 'Record the specified contact role',
      voice: false,
      fixture: {
        objects: [
          { id: 'account', type: 'Tjänstekonto', name: 'Familjekontot' },
          { id: 'email', type: 'E-postadress', name: 'kontakt@example.com' },
          { id: 'company', type: 'Företag', name: 'Annan leverantör' },
        ],
        relationships: [],
        relationshipTypes: [],
        draft: { objects: {} },
      },
      steps: [
        {
          id: 'contact',
          text: 'På Familjekontot är kontakt@example.com kontaktadress.',
          expected: {
            addRelationships: [
              {
                source: 'account',
                target: 'email',
                type: 'Kontaktadress',
                verbMeaning: 'email är kontaktadress för account.',
                direction: 'either',
              },
            ],
            requirements: ['Familjekontots kontaktadress är kontakt@example.com.'],
          },
        },
      ],
    };
    const model = textModel(() => {
      throw new Error('This oracle test must not call a provider');
    });
    const environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
    try {
      const state = await environment.read();
      await environment.post('map/relationship', {
        id: 'contact',
        baseRevision: null,
        version: state.draft.version,
        contentVersion: state.contentVersion,
        value: { sourceId, targetId, verb },
      });
      const fixed = await environment.check(scenario.steps[0], environment.assistant, []);
      expect(fixed).toEqual(targetId === 'company' ? ['effective_relationships'] : []);
      const sources = { backend: { text: 'Utkastet är uppdaterat.', complete: true } };
      const evidence = environment.stateEvidence();
      if (!evidence) throw new Error('Missing state evidence');
      const requirements = contentRequirements(
        sources,
        scenario.steps[0].expected.requirements,
        scenario.steps[0].expected,
        evidence,
      );
      expect(requirements.some(({ id }) => id === 'backend-relationship-words')).toBe(true);
      const missing = checkedContentVerdicts(requirements, []);
      expect(missing.every(({ outcome }) => outcome === 'inconclusive')).toBe(true);
      // A controlled judge checks the complete observed state, including phrase
      // direction. This tests the wiring, not a paid model's linguistic ability.
      const observed = (
        evidence.effective as { relationships: { source: string; target: string; verb: string }[] }
      ).relationships[0];
      const correct =
        (observed.source === 'account' &&
          observed.target === 'email' &&
          observed.verb === 'har kontaktadressen') ||
        (observed.source === 'email' &&
          observed.target === 'account' &&
          observed.verb === 'är kontaktadress för');
      const content = checkedContentVerdicts(
        requirements,
        requirements.map(({ id }) => ({
          id,
          outcome: correct ? 'pass' : 'fail',
          reason: 'Controlled role oracle.',
        })),
      );
      const result: Attempt = {
        scenario: scenario.id,
        step: 'contact',
        profile: 'controlled',
        repetition: 1,
        modality: 'text',
        outcome: 'inconclusive',
        fixed,
        content,
        elapsedMs: null,
        backendCostUsd: null,
      };
      concludeAttempt(result, 1);
      expect(result.outcome).toBe(outcome);
      expect(model.requests).toEqual([]);
    } finally {
      await environment.close();
    }
  },
);

test('an explicitly chosen verb remains a strict word contract independent of category', {
  tags: ['technical'],
}, async () => {
  const scenario: Scenario = {
    id: 'explicit-verb',
    title: 'Keep the chosen verb',
    voice: false,
    fixture: {
      objects: [
        { id: 'source', type: 'Tjänst', name: 'Familjewebben' },
        { id: 'target', type: 'Företag', name: 'Leverantören' },
      ],
      relationships: [],
      relationshipTypes: [],
      draft: { objects: {} },
    },
    steps: [
      {
        id: 'connect',
        text: 'Familjewebben körs hos Leverantören.',
        expected: {
          addRelationships: [
            { source: 'source', type: 'Använder', verb: 'körs hos', target: 'target' },
          ],
          requirements: [],
        },
      },
    ],
  };
  const environment = await evaluationEnvironment(scenario, {
    modelFetch: textModel(() => {
      throw new Error('No provider');
    }).provider,
  });
  try {
    for (const verb of ['använder', 'körs hos']) {
      const state = await environment.read();
      await environment.post('map/relationship', {
        id: 'edge',
        baseRevision: null,
        version: state.draft.version,
        contentVersion: state.contentVersion,
        value: { sourceId: 'source', targetId: 'target', verb },
      });
      expect(await environment.check(scenario.steps[0], environment.assistant, [])).toEqual(
        verb === 'körs hos' ? [] : ['effective_relationships'],
      );
    }
  } finally {
    await environment.close();
  }
});
