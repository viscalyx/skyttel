import { request } from '@playwright/test';
import { expect, test } from 'vitest';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import {
  lastToolResult,
  modelMessage,
  modelTool,
  pendingUpdate,
  readOnlyScope,
  textModel,
} from '../../support/text-model.js';

for (const situation of [
  'before requested changes',
  'after a partial batch',
  'after a partial batch beside an older waiting question',
  'with a ready pending change',
])
  test(`a report ${situation} keeps unfinished work active`, async () => {
    const olderWaiting = situation.includes('older waiting');
    const readyPart = situation === 'with a ready pending change';
    const partialBatch = situation !== 'before requested changes';
    const question = 'Vad heter kollegan?';
    let personType = '';
    let workStep = 0;
    let releaseWork = () => {};
    const workReady = new Promise<void>((resolve) => {
      releaseWork = resolve;
    });
    const model = textModel(
      async (body) => {
        const input = JSON.parse(
          String(body.input.findLast((item) => item.role === 'user')?.content),
        );
        if (input.message === 'Beskriv vilket år lampan köptes.')
          return [
            modelTool('ask_questions', {
              questions: [
                {
                  kind: 'information',
                  request: input.message,
                  question: 'Vilken lampa menar du?',
                  dependsOnDraft: false,
                },
              ],
            }),
          ];
        if (input.message === 'Beskriv hela utkastet.')
          return [modelTool('report_result', { source: 'draft' })];
        const step = workStep++ - (readyPart ? 2 : 0);
        if (step === -2)
          return [
            modelTool('ask_questions', {
              questions: [
                {
                  kind: 'change',
                  request: 'Lägg till kollegan som person.',
                  question,
                  dependsOnDraft: false,
                },
              ],
            }),
          ];
        if (step === -1)
          return [
            modelTool('ask_questions', {
              questions: [],
              updates: [pendingUpdate(body, question)],
              continueResponse: false,
            }),
          ];
        if (step === (partialBatch ? 1 : 0))
          return [modelTool('report_result', { source: 'draft' })];
        const remaining = step === (partialBatch ? 2 : 1);
        if (remaining) await workReady;
        const { draft } = input;
        return [
          modelTool('submit_changes', {
            version: draft.version,
            contentVersion: draft.contentVersion,
            completion: 'draft',
            resolves:
              readyPart && remaining
                ? input.pendingParts
                    .filter((part: { status: string }) => part.status === 'ready')
                    .map(({ id, revision }: { id: string; revision: number }) => ({ id, revision }))
                : [],
            operations: (remaining && !partialBatch
              ? ['Kim', 'Lo']
              : [remaining ? 'Lo' : 'Kim']
            ).map((name) => ({
              name: 'propose_object',
              arguments: {
                id: name.toLowerCase(),
                baseRevision: null,
                value: { typeId: personType, name },
              },
            })),
          }),
        ];
      },
      (body) => {
        const input = JSON.parse(String(body.input[0].content));
        if (
          body.instructions.startsWith('SKYTTEL_TURN_SCOPE') &&
          input.current === 'Beskriv hela utkastet.'
        )
          return readOnlyScope();
        return [
          modelMessage(
            JSON.stringify(
              body.instructions.startsWith('SKYTTEL_TURN_SCOPE')
                ? {
                    mode: 'work',
                    request: input.current,
                    responseRequired: false,
                  }
                : {
                    decision: 'allow',
                    complete: true,
                    fulfillsRequest:
                      readyPart ||
                      input.untrusted.operations.some(
                        (operation: { arguments: { id?: string } }) =>
                          operation.arguments.id === 'lo',
                      ),
                  },
            ),
          ),
        ];
      },
    );
    const app = await createInstallation(undefined, { modelFetch: model.provider });
    const browser = await request.newContext();
    try {
      await signIn(browser, app.origin);
      const { household } = await (await createHousehold(browser, app.origin)).json();
      const mapPath = `${app.origin}/api/households/${household.id}/map`;
      const before = await (await browser.get(mapPath)).json();
      personType = before.types.find((type: { name: string }) => type.name === 'Person').id;
      const path = `${app.origin}/api/households/${household.id}/text-assistant`;
      const started: TextAssistantView = await (
        await browser.post(path, { headers: { origin: app.origin }, data: approvedForVisit })
      ).json();
      async function send(view: TextAssistantView, text: string) {
        expect(
          (
            await browser.post(`${path}/${started.id}/messages`, {
              headers: { origin: app.origin },
              data: {
                requestId: crypto.randomUUID(),
                revision: view.revision,
                draftVersion: view.review.version,
                contentVersion: view.review.contentVersion,
                text,
              },
            })
          ).status(),
        ).toBe(202);
      }
      let starting = started;
      if (olderWaiting) {
        await send(started, 'Beskriv vilket år lampan köptes.');
        await expect
          .poll(async () => {
            starting = await (await browser.get(`${path}/${started.id}`)).json();
            return starting.phase;
          })
          .toBe('ready');
        expect(starting.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'waiting', question: 'Vilken lampa menar du?' }),
        );
      }
      await send(
        starting,
        readyPart
          ? 'Lägg till Kim och en kollega som personer utan att spara.'
          : 'Lägg till Kim och Lo som personer utan att spara.',
      );
      if (readyPart) {
        let waiting!: TextAssistantView;
        await expect
          .poll(async () => {
            waiting = await (await browser.get(`${path}/${started.id}`)).json();
            return waiting.questionPending;
          })
          .toBe(true);
        await send(waiting, 'Kollegan heter Lo. Lägg till Kim också utan att spara.');
        let clarified!: TextAssistantView;
        await expect
          .poll(async () => {
            clarified = await (await browser.get(`${path}/${started.id}`)).json();
            return clarified.phase;
          })
          .toBe('ready');
        expect(clarified.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'ready', question }),
        );
        const workBeforeRead = model.requests.length;
        await send(clarified, 'Beskriv hela utkastet.');
        let information!: TextAssistantView;
        await expect
          .poll(async () => {
            information = await (await browser.get(`${path}/${started.id}`)).json();
            return information.phase;
          })
          .toBe('ready');
        expect(information.error).toBeUndefined();
        expect(information.pendingParts).toEqual(clarified.pendingParts);
        expect(model.requests).toHaveLength(workBeforeRead + 1);
        expect(await (await browser.get(mapPath)).json()).toEqual(before);
        await send(information, 'Fortsätt med Kim och kollegan Lo utan att spara.');
      }
      const preceding = (olderWaiting ? 1 : 0) + (readyPart ? 3 : 0) + (partialBatch ? 2 : 1);
      await expect.poll(() => model.requests.length).toBeGreaterThanOrEqual(preceding);
      const reported: TextAssistantView = await (await browser.get(`${path}/${started.id}`)).json();
      expect(reported.error).toBeUndefined();
      expect(reported.receipt).toBeUndefined();
      if (readyPart)
        expect(reported.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'ready', question }),
        );
      const during = await (await browser.get(mapPath)).json();
      expect(during.objects).toEqual(before.objects);
      expect(
        during.draft.changes.map((change: { after: { name: string } }) => change.after.name),
      ).toEqual(partialBatch ? ['Kim'] : []);
      await expect.poll(() => model.requests.length).toBe(preceding + 1);
      const active: TextAssistantView = await (await browser.get(`${path}/${started.id}`)).json();
      expect(active.phase).toBe('working');
      if (readyPart)
        expect(active.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'ready', question }),
        );
      releaseWork();
      let finished!: TextAssistantView;
      await expect
        .poll(async () => {
          finished = await (await browser.get(`${path}/${started.id}`)).json();
          return finished.phase;
        })
        .toBe('ready');
      expect(finished.error).toBeUndefined();
      if (olderWaiting)
        expect(finished.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'waiting', question: 'Vilken lampa menar du?' }),
        );
      expect(finished.review.changes.map((change) => change.after?.name).sort()).toEqual([
        'Kim',
        'Lo',
      ]);
      expect(finished.receipt).toBeUndefined();
      if (readyPart)
        expect(finished.pendingParts).toContainEqual(
          expect.objectContaining({ status: 'completed', question }),
        );
      expect((await (await browser.get(`${mapPath}/operations`)).json()).operations).toEqual([]);
      expect((await (await browser.get(`${mapPath}/history`)).json()).history).toEqual([]);
      expect((await (await browser.get(mapPath)).json()).objects).toEqual(before.objects);
    } finally {
      releaseWork();
      await browser.dispose();
      await app.close();
    }
  });

for (const boundary of [
  'direct draft',
  'combined draft',
  'direct save',
  'combined save',
  'automatic save',
  'report',
])
  for (const certificate of boundary === 'report'
    ? ['missing scope', 'contradictory response']
    : boundary === 'direct save'
      ? ['missing scope', 'missing result', 'contradictory response', 'following catalog read']
      : ['missing scope', 'missing result', 'contradictory response'])
    test(`${boundary} continues requested explanation with ${certificate} certification`, async () => {
      const explanation = 'Person är en objekttyp. Förslagen hör till ditt utkast före sparande.';
      const saving = boundary.endsWith('save');
      const readAfterSave = certificate === 'following catalog read';
      const holdResponse = boundary === 'direct save' && certificate === 'contradictory response';
      let releaseResponse = () => {};
      const responseReady = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const model = textModel(
        async (body) => {
          const result = lastToolResult(body);
          const previousCall = body.input.findLast((item) => item.type === 'function_call');
          if (result && previousCall?.name !== 'read_my_draft') {
            if (holdResponse) await responseReady;
            return [modelMessage(explanation)];
          }
          const { draft: initialDraft } = JSON.parse(
            String(body.input.findLast((item) => item.role === 'user')?.content),
          );
          if (boundary === 'report') return [modelTool('report_result', { source: 'draft' })];
          if (boundary === 'direct save')
            return [
              modelTool('save_draft', {
                version: initialDraft.version,
                contentVersion: initialDraft.contentVersion,
                operationId: 'controlled-save',
              }),
              ...(readAfterSave ? [modelTool('read_type_catalog', {})] : []),
            ];
          if (!result) return [modelTool('read_my_draft', {})];
          const draft = result;
          const proposal = {
            name: 'propose_object',
            arguments: {
              id: 'kim',
              baseRevision: null,
              value: {
                typeId: draft.changes.find((change: { id: string }) => change.id === 'lo').after
                  .typeId,
                name: 'Kim',
              },
            },
          };
          return [
            boundary.startsWith('combined')
              ? modelTool('submit_changes', {
                  version: draft.version,
                  contentVersion: draft.contentVersion,
                  completion: saving ? 'save' : 'draft',
                  operations: [proposal],
                })
              : modelTool(proposal.name, {
                  version: draft.version,
                  contentVersion: draft.contentVersion,
                  ...proposal.arguments,
                }),
          ];
        },
        (body) => [
          modelMessage(
            JSON.stringify(
              body.instructions.startsWith('SKYTTEL_TURN_SCOPE')
                ? {
                    mode: boundary === 'report' ? 'read' : 'work',
                    request: JSON.parse(String(body.input[0].content)).current,
                    ...(certificate === 'missing scope'
                      ? {}
                      : {
                          responseRequired:
                            certificate === 'contradictory response' || readAfterSave,
                        }),
                  }
                : {
                    decision: 'allow',
                    complete: true,
                    ...(certificate === 'missing result' ? {} : { fulfillsRequest: true }),
                  },
            ),
          ),
        ],
      );
      const app = await createInstallation(undefined, { modelFetch: model.provider });
      const browser = await request.newContext();
      try {
        await signIn(browser, app.origin);
        const { household } = await (await createHousehold(browser, app.origin)).json();
        const mapPath = `${app.origin}/api/households/${household.id}/map`;
        const before = await (await browser.get(mapPath)).json();
        expect(
          (
            await browser.post(`${mapPath}/draft`, {
              headers: { origin: app.origin },
              data: {
                version: 0,
                contentVersion: 1,
                id: 'lo',
                baseRevision: null,
                value: { typeId: before.types[0].id, name: 'Lo Exempel' },
              },
            })
          ).status(),
        ).toBe(200);
        const path = `${app.origin}/api/households/${household.id}/text-assistant`;
        const started: TextAssistantView = await (
          await browser.post(path, { headers: { origin: app.origin }, data: approvedForVisit })
        ).json();
        expect(
          (
            await browser.post(`${path}/${started.id}/messages`, {
              headers: { origin: app.origin },
              data: {
                requestId: crypto.randomUUID(),
                revision: started.revision,
                draftVersion: started.review.version,
                contentVersion: started.review.contentVersion,
                text:
                  boundary === 'report'
                    ? 'Beskriv utkastet och förklara vad objekttypen Person betyder.'
                    : boundary === 'direct save'
                      ? 'Beskriv skillnaden mellan objekttypen Person och ett objekt. Spara hela utkastet.'
                      : saving
                        ? 'Lägg till Kim som person. Beskriv skillnaden mellan objekttypen Person och ett objekt. Spara hela utkastet.'
                        : 'Lägg till Kim och förklara vad objekttypen Person betyder. Spara inte.',
              },
            })
          ).status(),
        ).toBe(202);
        if (holdResponse) {
          let saved!: TextAssistantView;
          await expect
            .poll(async () => {
              saved = await (await browser.get(`${path}/${started.id}`)).json();
              return saved.receipt?.operationId;
            })
            .toBeTruthy();
          expect(saved.phase).toBe('working');
          expect(saved.modelReply).toBeUndefined();
          releaseResponse();
        }
        let finished!: TextAssistantView;
        await expect
          .poll(async () => {
            finished = await (await browser.get(`${path}/${started.id}`)).json();
            return finished.phase;
          })
          .not.toBe('working');
        expect(finished.error).toBeUndefined();
        expect(finished.modelReply).toBe(explanation);
        const setupReads = boundary === 'report' || boundary === 'direct save' ? 0 : 1;
        expect(model.requests).toHaveLength(setupReads + 2);
        if (saving) {
          expect(finished.receipt?.operationId).toBeTruthy();
          expect(finished.review.changes).toEqual([]);
          if (readAfterSave) {
            const followUp = model.requests[setupReads + 1];
            const calls = followUp.input.filter((item) => item.type === 'function_call');
            const outputs = followUp.input.filter((item) => item.type === 'function_call_output');
            expect(calls.map((call) => call.name)).toEqual(['save_draft', 'read_type_catalog']);
            expect(outputs.map((output) => output.call_id)).toEqual(
              calls.map((call) => call.call_id),
            );
            const catalog = JSON.parse(String(outputs.at(-1)?.output));
            expect(catalog.types).toContainEqual(expect.objectContaining({ name: 'Person' }));
          }
          expect((await (await browser.get(mapPath)).json()).objects).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: 'Lo Exempel' })]),
          );
        } else {
          expect(finished.receipt).toBeUndefined();
          expect(finished.review.changes).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                after: expect.objectContaining({
                  name: boundary === 'report' ? 'Lo Exempel' : 'Kim',
                }),
              }),
            ]),
          );
        }
      } finally {
        releaseResponse();
        await browser.dispose();
        await app.close();
      }
    });
