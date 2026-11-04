import { request } from '@playwright/test';
import { expect, test } from 'vitest';
import type { TextAssistantView } from '../../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../../support/text-model.js';

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
    : ['missing scope', 'missing result', 'contradictory response'])
    test(`${boundary} continues requested explanation with ${certificate} certification`, async () => {
      const explanation = 'Person är en objekttyp. Förslagen hör till ditt utkast före sparande.';
      const saving = boundary.endsWith('save');
      const holdResponse = boundary === 'direct save' && certificate === 'contradictory response';
      let releaseResponse = () => {};
      const responseReady = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      const model = textModel(
        async (body) => {
          if (lastToolResult(body)) {
            if (holdResponse) await responseReady;
            return [modelMessage(explanation)];
          }
          const { draft } = JSON.parse(
            String(body.input.findLast((item) => item.role === 'user')?.content),
          );
          if (boundary === 'report') return [modelTool('report_result', { source: 'draft' })];
          const proposal = {
            name: 'propose_object',
            arguments: {
              id: 'kim',
              baseRevision: null,
              value: { typeId: draft.changes[0].after.typeId, name: 'Kim' },
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
              : modelTool(boundary === 'direct save' ? 'save_draft' : proposal.name, {
                  version: draft.version,
                  contentVersion: draft.contentVersion,
                  ...(boundary === 'direct save'
                    ? { operationId: 'controlled-save' }
                    : proposal.arguments),
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
                      : { responseRequired: certificate === 'contradictory response' }),
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
        expect(model.requests).toHaveLength(2);
        if (saving) {
          expect(finished.receipt?.operationId).toBeTruthy();
          expect(finished.review.changes).toEqual([]);
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
