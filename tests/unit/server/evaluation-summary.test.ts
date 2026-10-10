import { expect, test } from 'vitest';
import rawCatalog from '../../../scripts/model-evaluation/catalog.json' with { type: 'json' };
import { evaluationEnvironment } from '../../../scripts/model-evaluation/environment.js';
import type { Catalog } from '../../../scripts/model-evaluation/types.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { modelMessage, modelTool, textModel } from '../../support/text-model.js';

test('the evaluation summary uses real price turns and atomically installs ordinary generated context', {
  tags: ['technical'],
}, async () => {
  const catalog = rawCatalog as Catalog;
  const scenario = catalog.scenarios.find((item) => item.id === 'summary-last-price');
  if (!scenario) throw new Error('Missing summary scenario');
  let environment: Awaited<ReturnType<typeof evaluationEnvironment>>;
  let source = '';
  const model = textModel(async (body) => {
    if (!body.tools.length) {
      source = JSON.parse(String(body.input[0].content)).source;
      return [
        modelMessage(
          'Spotify ändrades först till 189 kronor per månad. Den senaste ändringen är Molnlagring Plus 2 TB till 229 kronor per månad. Allt är osparat.',
        ),
      ];
    }
    if (body.input.at(-1)?.type === 'function_call_output')
      return [modelMessage('Utkastet är uppdaterat.')];
    const turn = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content));
    const first = turn.message.includes('Spotify');
    const id = first ? 'spotify-sub' : 'cloud-sub';
    const state = await environment.read();
    const original = state.objects.find((item) => item.id === id);
    if (!original) throw new Error('Missing price object');
    const { id: _id, householdId: _household, revision, ...value } = original;
    return [
      modelTool('propose_object', {
        version: state.draft.version,
        contentVersion: state.contentVersion,
        id,
        baseRevision: revision,
        value: {
          ...value,
          financialFacts: {
            ...value.financialFacts,
            price: { knowledge: 'known', value: first ? '189' : '229' },
          },
        },
      }),
    ];
  });
  environment = await evaluationEnvironment(scenario, { modelFetch: model.provider });
  try {
    for (const step of scenario.steps.slice(0, 2)) {
      const view = await environment.get<TextAssistantView>(environment.path);
      await environment.post(`${environment.path}/messages`, {
        requestId: step.id,
        text: step.text,
        revision: view.revision,
        draftVersion: view.review.version,
        contentVersion: view.review.contentVersion,
      });
      await expect
        .poll(
          async () =>
            (await environment.get<TextAssistantView>(`${environment.path}/messages/${step.id}`))
              .taskStatus,
        )
        .toBe('completed');
      const finished = await environment.get<TextAssistantView>(environment.path);
      expect(await environment.check(step, finished, [])).toEqual([]);
    }
    const before = await environment.read();
    const summary = await environment.installation.summarizeForEvaluation(
      environment.assistant.id,
      catalog.summaryHistory,
    );
    expect(summary.installed).toBe(true);
    expect(summary.retained).toEqual(catalog.summaryHistory);
    expect(summary.source).toBe(source);
    expect(source).toContain('Spotify Premium Family till 189');
    expect(source).toContain('Molnlagring Plus 2 TB till 229');
    expect(source.length).toBeLessThanOrEqual(240_000);
    expect(model.requests.filter((body) => !body.tools.length)).toHaveLength(1);
    expect(summary.view.contextGeneration).toBe(1);
    expect(await environment.read()).toEqual(before);
  } finally {
    await environment.close();
  }
});
