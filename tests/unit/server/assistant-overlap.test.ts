import { type APIRequestContext, request } from '@playwright/test';
import { afterEach, expect, test } from 'vitest';
import type { AssistantObservation } from '../../../src/server/assistant-observation.js';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { liveProvider, voiceAnswerParts } from '../../support/live-provider.js';
import { type ModelRequest, modelMessage, modelTool, textModel } from '../../support/text-model.js';

let app: Awaited<ReturnType<typeof createInstallation>>;
let client: APIRequestContext;
const releases: (() => void)[] = [];
afterEach(async () => {
  for (const release of releases.splice(0)) release();
  await client?.dispose();
  await app?.close();
});
function held() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.push(release);
  return { wait, release };
}

function proposeKim(request: ModelRequest, typeId: string, objectId: string) {
  const { draft } = JSON.parse(
    String(request.input.findLast((item) => item.role === 'user')?.content),
  );
  return [
    modelTool('submit_changes', {
      version: draft.version,
      contentVersion: draft.contentVersion,
      completion: 'draft',
      operations: [
        {
          name: 'propose_object',
          arguments: {
            id: objectId,
            baseRevision: null,
            value: { typeId, name: 'Kim Lind', properties: [] },
          },
        },
      ],
    }),
  ];
}

async function start(
  modelFetch: typeof fetch,
  mode: 'sequential' | 'overlap',
  events: AssistantObservation[],
  live?: ReturnType<typeof liveProvider>,
  assistantDispatch?: NonNullable<Parameters<typeof createInstallation>[1]>['assistantDispatch'],
) {
  app = await createInstallation(undefined, {
    modelFetch,
    conversationWorkMode: mode,
    liveFetch: live?.provider,
    liveSideband: live?.attach,
    observe: (event) => events.push(event),
    assistantDispatch,
  });
  client = await request.newContext();
  await signIn(client, app.origin);
  const { household } = await (await createHousehold(client, app.origin)).json();
  const path = `${app.origin}/api/households/${household.id}`;
  const map = await (await client.get(`${path}/map`)).json();
  const session: TextAssistantView = await (
    await client.post(`${path}/text-assistant`, {
      headers: { origin: app.origin },
      data: approvedForVisit,
    })
  ).json();
  async function submit(text: string, current = session, requestId = 'controlled') {
    expect(
      (
        await client.post(`${path}/text-assistant/${session.id}/messages`, {
          headers: { origin: app.origin },
          data: {
            requestId,
            revision: current.revision,
            draftVersion: current.review.version,
            contentVersion: current.review.contentVersion,
            text,
          },
        })
      ).status(),
    ).toBe(202);
  }
  async function current() {
    return (await (
      await client.get(`${path}/text-assistant/${session.id}`)
    ).json()) as TextAssistantView;
  }
  async function completed(requestId = 'controlled') {
    const result = `${path}/text-assistant/${session.id}/messages/${requestId}`;
    await expect
      .poll(async () => (await (await client.get(result)).json()).taskStatus)
      .toBe('completed');
    return (await (await client.get(result)).json()) as TextAssistantView;
  }
  return { path, map, session, submit, current, completed };
}

for (const mode of ['sequential', 'overlap'] as const) {
  test(`${mode} keeps a registered save used when Stop precedes its transport reply`, async () => {
    const registration = held();
    const events: AssistantObservation[] = [];
    let registered = false;
    const model = textModel((body) => {
      const { draft } = JSON.parse(
        String(body.input.findLast((item) => item.role === 'user')?.content),
      );
      return [
        modelTool('save_draft', {
          version: draft.version,
          contentVersion: draft.contentVersion,
        }),
      ];
    });
    const flow = await start(
      model.provider,
      mode,
      events,
      undefined,
      async (incoming, dispatch) => {
        const rpc = await incoming
          .clone()
          .json()
          .catch(() => null);
        const response = await dispatch(incoming);
        if (rpc?.params?.name === 'prepare_save') {
          registered = true;
          await registration.wait;
        }
        return response;
      },
    );
    expect(
      (
        await client.post(`${flow.path}/map/draft`, {
          headers: { origin: app.origin },
          data: {
            version: flow.map.draft.version,
            contentVersion: flow.map.contentVersion,
            id: 'registered-person',
            baseRevision: null,
            value: { typeId: flow.map.types[0].id, name: 'Kim Lind', properties: [] },
          },
        })
      ).status(),
    ).toBe(200);
    await flow.submit('Spara hela utkastet.', await flow.current());
    await expect.poll(() => registered).toBe(true);
    const pending = await flow.current();
    expect(pending.saving).toBe(true);
    expect(pending.operations).toMatchObject([{ status: 'pending' }]);
    const operationId = pending.operations[0].operationId;
    expect(pending.receipt).toBeUndefined();
    expect((await (await client.get(`${flow.path}/map`)).json()).objects).toEqual([]);
    expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual({ history: [] });
    expect(
      (
        await client.post(`${flow.path}/text-assistant/${flow.session.id}/cancel`, {
          headers: { origin: app.origin },
          data: { all: true },
        })
      ).status(),
    ).toBe(200);
    const stopped = await flow.current();
    expect(stopped.canceled).toBe(true);
    expect(stopped.operations).toMatchObject([{ operationId, status: 'pending' }]);
    const recovery = await client.post(`${flow.path}/text-assistant/${flow.session.id}/recover`, {
      headers: { origin: app.origin },
      data: {},
    });
    expect(recovery.status()).toBe(200);
    const recovered: TextAssistantView = await recovery.json();
    expect(recovered.receipt?.operationId).toBe(operationId);
    expect(recovered.review.changes).toEqual([]);
    const map = await (await client.get(`${flow.path}/map`)).json();
    expect(map.objects).toContainEqual(
      expect.objectContaining({ id: 'registered-person', name: 'Kim Lind' }),
    );
    const history = await (await client.get(`${flow.path}/map/history`)).json();
    expect(history.history).toMatchObject([{ operationId }]);
    registration.release();
    await expect.poll(() => events.filter((event) => event.kind === 'work_result').length).toBe(1);
    const saving = events.find(
      (event) =>
        event.kind === 'model_action' && (event.data as { name: string }).name === 'save_draft',
    );
    expect(saving?.context?.providerCallId).toBeTruthy();
    expect(events.find((event) => event.kind === 'work_result')?.data).toMatchObject({
      providerCallId: saving?.context?.providerCallId,
      executionMode: mode,
      disposition: 'used',
    });
    expect((await flow.current()).receipt).toEqual(recovered.receipt);
    expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(map);
    expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual(history);
    expect(model.requests).toHaveLength(1);
    expect(model.authorizationRequests).toHaveLength(2);
  });

  for (const ending of ['error', 'stop'] as const) {
    test(`${mode} keeps a verified existing-draft save used after explanation ${ending}`, async () => {
      const interpretation = held();
      const explanation = held();
      const events: AssistantObservation[] = [];
      let checkedWholeDraft = false;
      const model = textModel(
        async (body) => {
          const { draft } = JSON.parse(
            String(body.input.findLast((item) => item.role === 'user')?.content),
          );
          if (model.requests.length === 1)
            return [
              modelTool('save_draft', {
                version: draft.version,
                contentVersion: draft.contentVersion,
              }),
            ];
          if (model.requests.length === 2) return [modelTool('read_type_catalog', {})];
          await explanation.wait;
          throw new Error('controlled_explanation_failure');
        },
        async (body) => {
          if (body.instructions.startsWith('SKYTTEL_TURN_SCOPE')) {
            await interpretation.wait;
            return [
              modelMessage(
                JSON.stringify({
                  mode: 'work',
                  request:
                    'Beskriv skillnaden mellan objekttypen Person och ett objekt. Spara hela utkastet.',
                  responseRequired: true,
                }),
              ),
            ];
          }
          const { untrusted } = JSON.parse(String(body.input[0].content));
          expect(untrusted.operations).toEqual([expect.objectContaining({ name: 'save_draft' })]);
          expect(untrusted.data).toMatchObject({
            wholeDraft: true,
            draft: { changes: [{ id: 'existing-person', after: { name: 'Kim Lind' } }] },
          });
          checkedWholeDraft = true;
          return [
            modelMessage(
              JSON.stringify({ decision: 'allow', complete: true, fulfillsRequest: true }),
            ),
          ];
        },
      );
      const flow = await start(
        async (url, init) => {
          const response = await model.provider(url, init);
          return Response.json(
            { ...(await response.json()), service_tier: 'default' },
            { headers: response.headers },
          );
        },
        mode,
        events,
      );
      // Sol has a verified rate card; the later failed/aborted request must
      // retain unknown usage alongside the completed calls' known cost.
      expect(
        (
          await client.post(`${flow.path}/text-assistant/${flow.session.id}/model-choice`, {
            headers: { origin: app.origin },
            data: { model: 'gpt-6.1-sol', effort: 'high' },
          })
        ).status(),
      ).toBe(200);
      const staged = await client.post(`${flow.path}/map/draft`, {
        headers: { origin: app.origin },
        data: {
          version: flow.map.draft.version,
          contentVersion: flow.map.contentVersion,
          id: 'existing-person',
          baseRevision: null,
          value: { typeId: flow.map.types[0].id, name: 'Kim Lind', properties: [] },
        },
      });
      expect(staged.status()).toBe(200);
      const current = await flow.current();
      await flow.submit(
        'Beskriv skillnaden mellan objekttypen Person och ett objekt. Spara hela utkastet.',
        current,
      );
      await expect.poll(() => model.authorizationRequests.length).toBe(1);
      if (mode === 'overlap') await expect.poll(() => model.requests.length).toBe(1);
      else expect(model.requests).toHaveLength(0);
      expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual({ history: [] });
      interpretation.release();
      await expect.poll(() => model.requests.length).toBe(3);
      const saved = await flow.current();
      expect(checkedWholeDraft).toBe(true);
      expect(saved.phase).toBe('working');
      expect(saved.receipt?.operationId).toBeTruthy();
      expect(saved.review.changes).toEqual([]);
      const map = await (await client.get(`${flow.path}/map`)).json();
      expect(map.objects).toContainEqual(
        expect.objectContaining({ id: 'existing-person', name: 'Kim Lind' }),
      );
      const history = await (await client.get(`${flow.path}/map/history`)).json();
      expect(history.history).toHaveLength(1);
      if (ending === 'stop')
        expect(
          (
            await client.post(`${flow.path}/text-assistant/${flow.session.id}/cancel`, {
              headers: { origin: app.origin },
              data: { all: true },
            })
          ).status(),
        ).toBe(200);
      explanation.release();
      await expect
        .poll(() => events.filter((event) => event.kind === 'work_result').length)
        .toBe(3);
      const final = ending === 'error' ? await flow.completed() : await flow.current();
      if (ending === 'error') expect(final.error).toBe('assistant_model_temporary');
      else expect(final.canceled).toBe(true);
      expect(final.receipt).toEqual(saved.receipt);
      expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(map);
      expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual(history);
      const results = events.filter((event) => event.kind === 'work_result');
      const saving = events.find(
        (event) =>
          event.kind === 'model_action' && (event.data as { name: string }).name === 'save_draft',
      );
      expect(saving?.context?.providerCallId).toBeTruthy();
      expect(results[0].data).toMatchObject({
        providerCallId: saving?.context?.providerCallId,
        executionMode: mode,
        disposition: 'used',
      });
      for (const result of results.slice(1))
        expect(result.data).toMatchObject({ executionMode: mode, disposition: 'discarded' });
      const attempts = results.map((result) =>
        events.find(
          (event) =>
            event.kind === 'model_attempt' &&
            (event.data as { attemptId: string }).attemptId ===
              (result.data as { providerCallId: string }).providerCallId &&
            (event.data as { outcome: string }).outcome !== 'started',
        ),
      );
      expect(attempts.map((event) => event?.data)).toMatchObject([
        { outcome: 'completed', usage: { input: 120, output: 30 } },
        { outcome: 'completed', usage: { input: 120, output: 30 } },
        { outcome: ending === 'stop' ? 'aborted' : 'failed', usage: { input: null, output: null } },
      ]);
      const cost = await (
        await client.get(
          `${app.origin}/api/operator/costs?month=${new Date().toISOString().slice(0, 7)}`,
        )
      ).json();
      expect(cost.terra).toMatchObject({
        attempts: 5,
        uncertainAttempts: 1,
        unpricedAttempts: 1,
        usage: { input: { known: 480, missing: 1 }, output: { known: 120, missing: 1 } },
      });
      expect(cost.terra.estimatedUsd).toBeGreaterThan(0);
      expect(cost.total.incomplete).toBe(true);
    });
  }

  for (const ending of ['worker-error', 'inflight-clarification'] as const) {
    test(`${mode} ${ending} retires the other branch without reviving late work`, async () => {
      const interpretation = held();
      const worker = held();
      const events: AssistantObservation[] = [];
      const model = textModel(
        async () => {
          if (ending === 'worker-error') throw new Error('controlled_early_work_failure');
          await worker.wait;
          return [modelMessage('För sent.')];
        },
        async () => {
          await interpretation.wait;
          return [
            modelMessage(
              JSON.stringify(
                ending === 'inflight-clarification'
                  ? { mode: 'clarify', request: 'Vem menar du?' }
                  : {
                      mode: 'work',
                      request: 'Lägg till Kim Lind utan att spara.',
                      responseRequired: false,
                    },
              ),
            ),
          ];
        },
      );
      const flow = await start(model.provider, mode, events);
      await flow.submit('Lägg till Kim Lind utan att spara.');
      await expect.poll(() => model.authorizationRequests.length).toBe(1);
      if (mode === 'overlap') await expect.poll(() => model.requests.length).toBe(1);
      interpretation.release();
      // Controlled providers expose cancellation, while late responses remain
      // releasable. They cannot publish an incompatible answer or mutate a draft.
      worker.release();
      const result = await flow.completed();
      if (ending === 'worker-error') expect(result.error).toBe('assistant_model_temporary');
      else expect(result.reply).toBe('Vem menar du?');
      expect(result.modelReply ?? '').not.toContain('För sent.');
      expect(result.review).toEqual(flow.session.review);
      expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
      const records = events.filter((event) => event.kind === 'work_result');
      if (mode === 'overlap') expect(records[0].data).toMatchObject({ disposition: 'discarded' });
    });
  }

  for (const outcome of ['allowed', 'clarify', 'rejected', 'stop'] as const) {
    test(`${mode} spoken ${outcome} shares the guarded draft and real delivery flow`, async () => {
      const interpretation = held();
      const events: AssistantObservation[] = [];
      const live = liveProvider();
      let typeId = '';
      const model = textModel(
        (body) => proposeKim(body, typeId, 'spoken-person'),
        async (body) => {
          if (body.instructions.startsWith('SKYTTEL_TURN_SCOPE')) {
            await interpretation.wait;
            return [
              modelMessage(
                JSON.stringify(
                  outcome === 'clarify'
                    ? { mode: 'clarify', request: 'Vem menar du?' }
                    : {
                        mode: 'work',
                        request: 'Lägg till Kim Lind utan att spara.',
                        responseRequired: false,
                      },
                ),
              ),
            ];
          }
          return [
            modelMessage(
              JSON.stringify(
                outcome === 'rejected'
                  ? { decision: 'clarify' }
                  : { decision: 'allow', complete: true, fulfillsRequest: true },
              ),
            ),
          ];
        },
      );
      const flow = await start(model.provider, mode, events, live);
      typeId = flow.map.types[0].id;
      const response = await client.post(`${flow.path}/text-assistant/${flow.session.id}/voice`, {
        headers: { origin: app.origin },
        data: {
          sdp: 'synthetic-offer',
          revision: flow.session.revision,
          draftVersion: flow.session.review.version,
          contentVersion: flow.session.review.contentVersion,
        },
      });
      expect(response.status()).toBe(201);
      const providerId = [...live.channels.keys()][0];
      live.emit(providerId, {
        type: 'session.input_transcript.delta',
        event_id: crypto.randomUUID(),
        delta: 'Lägg till Kim Lind utan att spara.',
        start_ms: 0,
        end_ms: 1,
      });
      live.emit(providerId, {
        type: 'session.delegation.created',
        event_id: crypto.randomUUID(),
        offset_ms: 1,
        delegation: { id: crypto.randomUUID(), type: 'delegation', target: 'client' },
      });
      // Voice intentionally waits for two quiet seconds before admitting a spoken task.
      await expect
        .poll(() => events.some((event) => event.kind === 'task_started'), { timeout: 5000 })
        .toBe(true);
      if (mode === 'overlap') await expect.poll(() => model.requests.length).toBe(1);
      expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
      if (outcome === 'stop')
        expect(
          (
            await client.post(`${flow.path}/text-assistant/${flow.session.id}/cancel`, {
              headers: { origin: app.origin },
              data: { all: true },
            })
          ).status(),
        ).toBe(200);
      interpretation.release();
      await expect.poll(() => events.some((event) => event.kind === 'task_completed')).toBe(true);
      const current = await flow.current();
      if (outcome === 'allowed') {
        expect(current.review.changes).toMatchObject([
          { id: 'spoken-person', after: { name: 'Kim Lind' } },
        ]);
        await expect
          .poll(() => voiceAnswerParts(live.sent).join(' '))
          .toContain('Utkastet är uppdaterat.');
        expect(model.requests).toHaveLength(1);
        expect(model.authorizationRequests).toHaveLength(2);
      } else {
        expect(current.review).toEqual(flow.session.review);
        if (outcome === 'clarify')
          await expect.poll(() => voiceAnswerParts(live.sent).join(' ')).toContain('Vem menar du?');
        if (outcome === 'rejected') expect(current.error).toBe('assistant_scope_unclear');
        if (outcome === 'stop') expect(current.canceled).toBe(true);
      }
      expect(current.receipt).toBeUndefined();
      expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual({ history: [] });
    }, 10_000);
  }

  test(`${mode} preserves actual unused work and costs on clarification before a fresh read`, async () => {
    const interpretation = held();
    const events: AssistantObservation[] = [];
    let typeId = '';
    let first = true;
    const model = textModel(
      (body) => {
        const current = JSON.parse(
          String(body.input.findLast((item) => item.role === 'user')?.content),
        );
        if (current.message === 'Läs bara utkastet.') return [modelMessage('Utkastet är tomt.')];
        return [
          modelTool('propose_object', {
            version: current.draft.version,
            contentVersion: current.draft.contentVersion,
            id: 'unused-person',
            baseRevision: null,
            value: { typeId, name: 'Fel person', properties: [] },
          }),
        ];
      },
      async () => {
        if (!first)
          return [modelMessage(JSON.stringify({ mode: 'read', request: 'Läs bara utkastet.' }))];
        first = false;
        await interpretation.wait;
        return [modelMessage(JSON.stringify({ mode: 'clarify', request: 'Vem menar du?' }))];
      },
    );
    const flow = await start(model.provider, mode, events);
    typeId = flow.map.types[0].id;
    await flow.submit('Lägg till personen.');
    await expect.poll(() => model.authorizationRequests.length).toBe(1);
    if (mode === 'overlap') await expect.poll(() => model.requests.length).toBe(1);
    else expect(model.requests).toHaveLength(0);
    interpretation.release();
    const result = await flow.completed();
    expect(result.reply).toBe('Vem menar du?');
    expect(result.review).toEqual(flow.session.review);
    expect(model.authorizationRequests).toHaveLength(1);
    const dispositions = events.filter((event) => event.kind === 'work_result');
    expect(dispositions).toHaveLength(mode === 'overlap' ? 1 : 0);
    if (mode === 'overlap') {
      expect(dispositions[0].data).toMatchObject({
        disposition: 'discarded',
        reason: 'clarification',
        executionMode: mode,
      });
      const id = (dispositions[0].data as { providerCallId: string }).providerCallId;
      expect(
        events.some(
          (event) =>
            event.kind === 'model_attempt' &&
            (event.data as { attemptId: string; outcome: string }).attemptId === id &&
            (event.data as { outcome: string }).outcome === 'completed',
        ),
      ).toBe(true);
    }
    const task = events.find((event) => event.kind === 'task_started');
    const ending = events.find((event) => event.kind === 'task_completed');
    expect(task?.data).toMatchObject({ executionMode: mode });
    if (!task) throw new Error('Missing task start.');
    expect(ending?.at).toBeGreaterThanOrEqual(task.at);
    const cost = await (
      await client.get(
        `${app.origin}/api/operator/costs?month=${new Date().toISOString().slice(0, 7)}`,
      )
    ).json();
    expect(cost.terra).toMatchObject({
      attempts: mode === 'overlap' ? 2 : 1,
      usage: {
        input: { known: mode === 'overlap' ? 240 : 120 },
        output: { known: mode === 'overlap' ? 60 : 30 },
      },
    });
    await flow.submit('Läs bara utkastet.', await flow.current(), 'fresh-read');
    const read = await flow.completed('fresh-read');
    expect(read.modelReply).toContain('Utkastet är tomt.');
    expect(read.review).toEqual(flow.session.review);
    expect(JSON.stringify(model.requests.at(-1)?.input)).not.toContain('unused-person');
    expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
  });

  for (const ending of ['stop', 'scope-error', 'stale', 'rejected', 'allowed'] as const) {
    test(`${mode} ${ending} cannot bypass interpretation and independent checking`, async () => {
      const interpretation = held();
      const checking = held();
      let checked = false;
      let typeId = '';
      const events: AssistantObservation[] = [];
      const model = textModel(
        (body) => proposeKim(body, typeId, 'controlled-person'),
        async (body) => {
          if (body.instructions.startsWith('SKYTTEL_TURN_SCOPE')) {
            await interpretation.wait;
            return [
              modelMessage(
                ending === 'scope-error'
                  ? 'malformed'
                  : JSON.stringify({
                      mode: 'work',
                      request: 'Lägg till Kim Lind utan att spara.',
                      responseRequired: false,
                    }),
              ),
            ];
          }
          checked = true;
          await checking.wait;
          return [
            modelMessage(
              JSON.stringify(
                ending === 'rejected'
                  ? { decision: 'clarify' }
                  : { decision: 'allow', complete: true, fulfillsRequest: true },
              ),
            ),
          ];
        },
      );
      const flow = await start(model.provider, mode, events);
      typeId = flow.map.types[0].id;
      await flow.submit('Lägg till Kim Lind utan att spara.');
      await expect.poll(() => model.authorizationRequests.length).toBe(1);
      if (mode === 'overlap') await expect.poll(() => model.requests.length).toBe(1);
      expect(checked).toBe(false);
      expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
      if (ending === 'stop') {
        expect(
          (
            await client.post(`${flow.path}/text-assistant/${flow.session.id}/cancel`, {
              headers: { origin: app.origin },
              data: { revision: (await flow.current()).revision },
            })
          ).status(),
        ).toBe(200);
      }
      if (ending === 'stale') {
        expect(
          (
            await client.post(`${flow.path}/map/draft`, {
              headers: { origin: app.origin },
              data: {
                id: 'manual',
                version: flow.map.draft.version,
                contentVersion: flow.map.contentVersion,
                baseRevision: null,
                value: { typeId, name: 'Manuellt tillägg', properties: [] },
              },
            })
          ).status(),
        ).toBe(200);
      }
      interpretation.release();
      if (ending === 'allowed' || ending === 'rejected') {
        await expect.poll(() => checked).toBe(true);
        expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
      }
      checking.release();
      if (ending === 'stop') {
        await expect
          .poll(() => events.filter((event) => event.kind === 'task_completed').length)
          .toBe(1);
        expect((await flow.current()).canceled).toBe(true);
      } else {
        const result = await flow.completed();
        if (ending === 'allowed') {
          expect(result.review.changes).toMatchObject([
            { id: 'controlled-person', after: { name: 'Kim Lind' } },
          ]);
          expect(model.requests).toHaveLength(1);
          expect(model.authorizationRequests).toHaveLength(2);
        } else
          expect(result.error).toBe(
            ending === 'scope-error'
              ? 'assistant_scope_unavailable'
              : ending === 'stale'
                ? 'assistant_draft_changed'
                : 'assistant_scope_unclear',
          );
      }
      const map = await (await client.get(`${flow.path}/map`)).json();
      if (ending === 'stale')
        expect(map.draft.changes).toMatchObject([
          { id: 'manual', after: { name: 'Manuellt tillägg' } },
        ]);
      else if (ending !== 'allowed') expect(map).toEqual(flow.map);
      expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual({ history: [] });
    });
  }
}

test('overlap reads current facts while interpretation is held but changes await independent checking', async () => {
  const interpretation = held();
  const checking = held();
  let checkingEntered = false;
  let typeId = '';
  const model = textModel(
    (input) => {
      if (!input.input.some((item) => item.type === 'function_call_output'))
        return [modelTool('read_map', {})];
      return proposeKim(input, typeId, 'overlap-person');
    },
    async (input) => {
      if (input.instructions.startsWith('SKYTTEL_TURN_SCOPE')) {
        await interpretation.wait;
        return [
          modelMessage(
            JSON.stringify({
              mode: 'work',
              request: 'Lägg till Kim Lind.',
              responseRequired: false,
            }),
          ),
        ];
      }
      checkingEntered = true;
      await checking.wait;
      return [
        modelMessage(JSON.stringify({ decision: 'allow', complete: true, fulfillsRequest: true })),
      ];
    },
  );
  const flow = await start(model.provider, 'overlap', []);
  typeId = flow.map.types[0].id;
  await flow.submit('Lägg till Kim Lind som person. Spara inte.');
  await expect.poll(() => model.requests.length).toBe(2);
  expect(checkingEntered).toBe(false);
  expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
  interpretation.release();
  await expect.poll(() => checkingEntered).toBe(true);
  expect(await (await client.get(`${flow.path}/map`)).json()).toEqual(flow.map);
  checking.release();
  const ended = await flow.completed();
  expect(ended.review.changes).toMatchObject([
    { id: 'overlap-person', after: { name: 'Kim Lind' } },
  ]);
  expect(ended.receipt).toBeUndefined();
  expect(await (await client.get(`${flow.path}/map/history`)).json()).toEqual({ history: [] });
  expect(model.authorizationRequests).toHaveLength(2);
  expect(
    model.requests.every(
      (input) =>
        input.model === model.authorizationRequests[0].model &&
        input.reasoning.effort === model.authorizationRequests[0].reasoning.effort,
    ),
  ).toBe(true);
});
