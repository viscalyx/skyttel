import { expect, type Page, test } from '@playwright/test';
import type { TextAssistantReview, TextAssistantView } from '../../src/shared/text-assistant.js';
import { closeTextView, createHousehold, openMap, openTable, signIn } from '../support/client.js';
import {
  openConversationText,
  openSavedHistory,
  startConversationWithText,
} from '../support/conversation-page.js';
import { editTableObject } from '../support/domain-work.js';
import { createInstallation } from '../support/installation.js';
import { verifyObjectDepartureAndDiscard } from '../support/object-form-departure.js';
import { lastToolResult, modelMessage, modelTool, textModel } from '../support/text-model.js';

const assistant = (page: Page) => page.getByRole('region', { name: 'Arbetsyta', exact: true });
const transcript = (page: Page) => page.getByRole('log', { name: 'Samtalstext', exact: true });
const notice = (page: Page) => page.getByRole('region', { name: 'Samtalsnotis', exact: true });
async function consent(page: Page) {
  const started = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().endsWith('/text-assistant'),
  );
  await startConversationWithText(page);
  await expect(assistant(page).getByLabel('Meddelande till Skyttel')).toBeVisible();
  return (await (await started).json()) as TextAssistantView;
}
async function send(page: Page, text: string) {
  await openConversationText(page);
  await assistant(page).getByLabel('Meddelande till Skyttel').fill(text);
  await assistant(page).getByRole('button', { name: 'Skicka', exact: true }).click();
}
async function showDraft(page: Page) {
  await openConversationText(page);
  const toggle = page.getByRole('button', { name: /^Visa utkastet/ });
  if (await toggle.isVisible()) await toggle.click();
  return assistant(page).getByRole('region', { name: 'Utkastet', exact: true });
}
async function showAttempts(page: Page) {
  const history = await openSavedHistory(page);
  await history.getByText('Identifiera sparandet och användaren', { exact: true }).last().click();
  return history;
}
async function arrange(page: Page, app: Awaited<ReturnType<typeof createInstallation>>) {
  await signIn(page.request, app.origin);
  const { household } = await (await createHousehold(page.request, app.origin)).json();
  const path = `${app.origin}/api/households/${household.id}/map`;
  const state = await (await page.request.get(path)).json();
  const value = { typeId: state.types[0].id, name: 'Lo Exempel', description: 'Påhittad uppgift' };
  await page.request.post(`${path}/draft`, {
    headers: { origin: app.origin },
    data: { version: 0, contentVersion: 1, id: 'lo', baseRevision: null, value },
  });
  await page.goto(app.origin);
  await openTable(page);
  return { path, value };
}

test('TEXT-07: hela ändringslistan visar samband, typer och verkliga före- och eftervärden', async ({
  page,
}) => {
  const app = await createInstallation(undefined, {
    modelFetch: textModel(() => [modelMessage('Ett provsvar.')]).provider,
  });
  try {
    await signIn(page.request, app.origin);
    const { household } = await (await createHousehold(page.request, app.origin)).json();
    const path = `${app.origin}/api/households/${household.id}/map`;
    const read = async () => (await page.request.get(path)).json();
    const post = async (route: string, data: object) => {
      const state = await read();
      const response = await page.request.post(`${path}/${route}`, {
        headers: { origin: app.origin },
        data: { version: state.draft.version, contentVersion: state.contentVersion, ...data },
      });
      expect(response.status(), await response.text()).toBe(200);
    };
    const state = await read();
    await post('object-type', {
      id: 'card-type',
      baseRevision: null,
      value: {
        name: 'Provkort',
        description: '',
        fields: [{ id: 'last-four', name: 'Sista fyra', description: '', kind: 'text' }],
      },
    });
    const value = {
      typeId: 'card-type',
      name: 'Kortet',
      description: '',
      customValues: { 'last-four': '1111' },
    };
    await post('draft', { id: 'card', baseRevision: null, value });
    await post('draft', {
      id: 'kim',
      baseRevision: null,
      value: { typeId: state.types[0].id, name: 'Kim', description: '' },
    });
    await post('save', { operationId: 'summary-initial' });
    await post('draft', {
      id: 'card',
      baseRevision: 1,
      value: { ...value, customValues: { 'last-four': '2222' } },
    });
    await post('relationship', {
      id: 'payment',
      baseRevision: null,
      value: {
        typeId: state.relationshipTypes.find((type: { name: string }) => type.name === 'Betalar')
          .id,
        sourceId: 'kim',
        targetId: 'card',
        knowledge: 'known',
      },
    });
    await post('object-type', {
      id: 'storage-type',
      baseRevision: null,
      value: { name: 'Förvaring', description: 'Hushållets förvaring', fields: [] },
    });
    await post('relationship-type', {
      id: 'storage-link',
      baseRevision: null,
      value: {
        name: 'Förvaras',
        description: '',
        forwardLabel: 'förvaras i',
        reverseLabel: 'innehåller',
      },
    });
    await page.goto(app.origin);
    await openTable(page);
    await consent(page);
    const summary = (await showDraft(page)).getByRole('table', { name: 'Osparade ändringar' });
    await expect(summary.locator('tbody tr')).toHaveCount(4);
    for (const line of [
      'Sista fyra: 1111 → 2222',
      'Kim → Betalar → Kortet',
      'Förvaring',
      'Förvaras',
    ])
      await expect(summary.getByText(line, { exact: false })).toBeVisible();
    await expect(summary.getByRole('columnheader')).toHaveText([
      'Symbol',
      'Namn',
      'Typ',
      'Vad som ändras',
    ]);
    expect(
      (await read()).objects.find((object: { id: string }) => object.id === 'card').customValues[
        'last-four'
      ],
    ).toBe('1111');
    expect((await read()).draft.relationships).toHaveLength(1);
  } finally {
    await app.close();
  }
});

test('TEXT-01: familjeärendet sparas samlat med bevarad oskickad formulärtext', async ({
  page,
}) => {
  let step = 0;
  let version = 0;
  let releaseModel = () => {};
  const heldModel = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  const model = textModel(async (body) => {
    await heldModel;
    const current = JSON.parse(String(body.input.findLast((item) => item.role === 'user')?.content))
      .draft as TextAssistantReview;
    if (step++ === 0)
      return [
        modelTool('resolve_conflict', {
          version: current.version,
          contentVersion: current.contentVersion,
          conflict: current.conflicts[0],
          choice: 'proposed',
        }),
      ];
    if (step === 2) {
      version = lastToolResult(body).version;
      return [modelTool('read_map', { query: 'Familjens Molnmusik' })];
    }
    if (step === 3) {
      const { id, householdId: _household, revision, ...value } = lastToolResult(body).objects[0];
      return [
        modelTool('propose_object', {
          version,
          contentVersion: 1,
          id,
          baseRevision: revision,
          value: {
            ...value,
            description: 'Familjeabonnemang 189 kr per månad.',
            financialFacts: {
              price: { knowledge: 'known', value: '189' },
              currency: { knowledge: 'known', value: 'SEK' },
              paymentInterval: { knowledge: 'known', value: 'månad' },
            },
          },
        }),
      ];
    }
    return [
      modelTool('save_draft', {
        version: lastToolResult(body).version,
        contentVersion: 1,
        operationId: 'family-request',
      }),
    ];
  });
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const household = app.seedDemo();
    await signIn(page.request, app.origin);
    await page.goto(app.origin);
    await consent(page);
    await expect(await showDraft(page)).toContainText('Lo Lind');
    await send(page, 'Behåll Lo-förslaget, rätta priset till 189 kr och spara.');
    await expect.poll(() => model.requests.length).toBe(1);
    await closeTextView(page);
    await editTableObject(page, 'Kim Exempel');
    await page.getByLabel('Beskrivning', { exact: true }).fill('Osänd text som ska finnas kvar');
    releaseModel();
    const path = `${app.origin}/api/households/${household.id}/map`;
    await expect
      .poll(async () => (await (await page.request.get(path)).json()).draft.changes)
      .toEqual([]);
    await expect(page.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Osänd text som ska finnas kvar',
    );
    await verifyObjectDepartureAndDiscard(page, { Beskrivning: 'Osänd text som ska finnas kvar' });
    await openConversationText(page);
    await expect(
      transcript(page)
        .getByRole('listitem')
        .filter({ hasText: /^Skyttel: Sparat\.$/ }),
    ).toHaveCount(1);
    await expect(await showDraft(page)).toContainText('Utkastet är tomt.');
    await expect(await showAttempts(page)).toContainText('Familjens Molnmusik');
    const map = await (
      await page.request.get(`${app.origin}/api/households/${household.id}/map`)
    ).json();
    expect(
      map.objects.find((object: { name: string }) => object.name === 'Familjens Molnmusik')
        .financialFacts.price,
    ).toEqual({ knowledge: 'known', value: '189' });
    expect(map.objects.some((object: { name: string }) => object.name === 'Lo Lind')).toBe(true);
    expect(map.draft.changes).toEqual([]);
    expect(map.relationships.map((edge: { knowledge: string }) => edge.knowledge)).toEqual(
      expect.arrayContaining(['unknown', 'none', 'uncertain']),
    );
    expect(model.requests).toHaveLength(4);
  } finally {
    releaseModel();
    await app.close();
  }
});

test('TEXT-02: sena svar efter kastat utkast och avbrott ändrar inte nytt arbete', async ({
  page,
}) => {
  let release!: (output: unknown[]) => void;
  let held = false;
  const model = textModel(
    () =>
      new Promise<unknown[]>((resolve) => {
        held = true;
        release = resolve;
      }),
  );
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const { path, value } = await arrange(page, app);
    const started = await consent(page);
    await send(page, 'Rätta namnet.');
    await expect.poll(() => held).toBe(true);
    await expect(transcript(page)).toContainText('Skyttel arbetar');
    await page.request.post(`${path}/discard`, {
      headers: { origin: app.origin },
      data: { version: 1, contentVersion: 1 },
    });
    release([
      modelTool('propose_object', {
        version: 1,
        contentVersion: 1,
        id: 'lo',
        baseRevision: null,
        value: { ...value, name: 'För sent' },
      }),
    ]);
    await expect(notice(page)).toHaveText('Skyttel kunde inte slutföra uppdraget. Försök igen.');
    expect(
      (
        await (
          await page.request.get(`${path.replace(/\/map$/, '/text-assistant')}/${started.id}`)
        ).json()
      ).error,
    ).toBe('assistant_draft_changed');
    expect((await (await page.request.get(path)).json()).draft.changes).toEqual([]);
    held = false;
    await send(page, 'Skapa ett nytt förslag.');
    await expect.poll(() => held).toBe(true);
    await assistant(page).getByRole('textbox', { name: 'Meddelande till Skyttel' }).press('Escape');
    release([
      modelTool('propose_object', {
        version: 2,
        contentVersion: 1,
        id: 'late',
        baseRevision: null,
        value,
      }),
    ]);
    await expect(assistant(page)).toContainText(
      'Avbrutet. Föreslagna ändringar ligger kvar i utkastet.',
    );
    expect((await (await page.request.get(path)).json()).draft.changes).toEqual([]);
  } finally {
    await app.close();
  }
});

test('TEXT-03: nekade sparbesked och modellfel lämnar formulärarbetet tillgängligt', async ({
  page,
}) => {
  let fail = false;
  const model = textModel(() => {
    if (fail) throw new Error('Synthetic failure');
    return [modelTool('save_draft', { version: 1, contentVersion: 1, operationId: 'no-save' })];
  });
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const { path } = await arrange(page, app);
    const started = await consent(page);
    const currentTask = async (): Promise<TextAssistantView> =>
      (await page.request.get(`${path.replace(/\/map$/, '/text-assistant')}/${started.id}`)).json();
    let revision = started.revision;
    for (const text of [
      'Spara inte.',
      'Vad händer om vi sparar?',
      'Spara ej.',
      'Spara senare.',
      'Skriv ”spara” i beskrivningen.',
    ]) {
      await send(page, text);
      await expect
        .poll(async () => {
          const current = await currentTask();
          return current.revision > revision && current.error === 'assistant_save_not_requested';
        })
        .toBe(true);
      revision = (await currentTask()).revision;
      await expect(notice(page)).toContainText(
        'Skyttel kunde inte slutföra uppdraget. Försök igen.',
      );
      expect((await (await page.request.get(path)).json()).objects).toEqual([]);
    }
    fail = true;
    await send(page, 'Beskriv mitt utkast.');
    await expect.poll(async () => (await currentTask()).error).toBe('assistant_provider_failed');
    await expect(notice(page)).toContainText('Skyttel kunde inte slutföra');
    await closeTextView(page);
    await editTableObject(page, 'Lo Exempel');
    await page.getByLabel('Namn', { exact: true }).fill('Lo Lind');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    expect((await (await page.request.get(path)).json()).draft.changes[0].after.name).toBe(
      'Lo Lind',
    );
  } finally {
    await app.close();
  }
});

test('TEXT-04: ett tappat sparbesked återfinns efter omstart utan dubbelt sparande', async ({
  page,
}) => {
  const model = textModel((body) => {
    const current = JSON.parse(
      String(body.input.findLast((item) => item.role === 'user')?.content),
    ).draft;
    return [
      modelTool('save_draft', {
        version: current.version,
        contentVersion: current.contentVersion,
        operationId: 'lost-browser-reply',
      }),
    ];
  });
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const { path } = await arrange(page, app);
    await consent(page);
    let dropped = false;
    await page.route('**/text-assistant/*/messages', async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(202);
      await expect
        .poll(async () =>
          (await (await page.request.get(`${path}/operations`)).json()).operations.some(
            (item: { status: string }) => item.status === 'succeeded',
          ),
        )
        .toBe(true);
      dropped = true;
      await route.abort();
    });
    await send(page, 'Spara hela utkastet nu.');
    await expect.poll(() => dropped).toBe(true);
    await expect(notice(page)).toContainText(
      'Det är oklart om utkastet sparades. Skyttel kontrollerar det.',
    );
    await app.restart();
    await page.unroute('**/text-assistant/*/messages');
    await page.reload();
    await openTable(page);
    await consent(page);
    const history = await showAttempts(page);
    await expect(history.getByRole('article')).toHaveCount(1);
    await expect(history).toContainText('Lo Exempel');
    const operations = (await (await page.request.get(`${path}/operations`)).json()).operations;
    expect(operations).toHaveLength(1);
    expect(operations[0].status).toBe('succeeded');
    expect((await (await page.request.get(path)).json()).objects).toHaveLength(1);
  } finally {
    await app.close();
  }
});

test('TEXT-05: markering kräver visning och skyddar oskickad text', async ({ page }) => {
  let step = 0;
  let releaseDisplay = () => {};
  const heldDisplay = new Promise<void>((resolve) => {
    releaseDisplay = resolve;
  });
  const model = textModel(async () => {
    if (step === 2) await heldDisplay;
    return step++ % 2 === 0
      ? [modelTool('show_map_object', { objectId: 'lo' })]
      : [modelMessage('Markerat!')];
  });
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    await arrange(page, app);
    await consent(page);
    await send(page, 'Markera Lo i kartan.');
    const selected = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    const mapStatus = page.getByRole('region', { name: 'Kartans status', exact: true });
    await expect(mapStatus).toContainText('Markerat i kartan.');
    await openConversationText(page);
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await send(page, 'Markera Lo igen.');
    await expect.poll(() => model.requests.length).toBe(3);
    await closeTextView(page);
    await editTableObject(page, 'Lo Exempel');
    await page.getByLabel('Beskrivning', { exact: true }).fill('Osänd uppgift');
    releaseDisplay();
    await expect.poll(() => model.requests.length).toBe(4);
    expect(lastToolResult(model.requests[3])).toMatchObject({ displayed: false });
    await expect(page.getByLabel('Beskrivning', { exact: true })).toHaveValue('Osänd uppgift');
    await verifyObjectDepartureAndDiscard(page, { Beskrivning: 'Osänd uppgift' });
    await openConversationText(page);
    await expect(transcript(page)).toContainText('Markerat!');
    await openMap(page);
    await expect(mapStatus).not.toContainText('Markerat i kartan.');
  } finally {
    releaseDisplay();
    await app.close();
  }
});

test('TEXT-06: obekräftad samtalstext skiljs från sparande och markering', async ({ page }) => {
  const replies = [
    'Klart. Ändringarna är nu lagrade i hushållets karta.',
    'Saved successfully.',
    'Lo är nu vald och visas i kartan.',
    'Har du sparat tidigare, och vem betalar?',
  ];
  let step = 0;
  const model = textModel(() =>
    step < replies.length
      ? [modelMessage(replies[step++])]
      : [
          modelTool('save_draft', {
            version: 1,
            contentVersion: 1,
            operationId: 'provider-choice',
          }),
        ],
  );
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const { path } = await arrange(page, app);
    const before = await (await page.request.get(path)).json();
    await openMap(page);
    await consent(page);
    const object = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
    const selected = await object.getAttribute('aria-pressed');
    for (const reply of replies) {
      await send(page, 'Beskriv mitt utkast.');
      const conversation = assistant(page).getByRole('log', { name: 'Samtalstext', exact: true });
      await expect(conversation).toContainText(reply);
      // The reservation about errors stands in the consent text, not in the text view.
      await expect(
        assistant(page).getByRole('button', { name: 'Visa utkastet (1)', exact: true }),
      ).toBeVisible();
      await expect(object).toHaveAttribute('aria-pressed', selected ?? 'false');
      const current = await (await page.request.get(path)).json();
      expect(current.objects).toEqual(before.objects);
      expect(current.draft).toEqual(before.draft);
      expect((await (await page.request.get(`${path}/operations`)).json()).operations).toEqual([]);
    }
    await send(page, 'Spara hela utkastet nu.');
    await expect(
      transcript(page)
        .getByRole('listitem')
        .filter({ hasText: /^Skyttel: Sparat\.$/ }),
    ).toHaveCount(1);
    const history = await showAttempts(page);
    await expect(history.getByRole('article')).toHaveCount(1);
    await expect(history).toContainText('Lo Exempel');
    expect((await (await page.request.get(path)).json()).objects).toMatchObject([{ id: 'lo' }]);
  } finally {
    await app.close();
  }
});

test('TEXT-09: samtalet beskriver verkliga ändringar i utkast och kvitto', async ({ page }) => {
  let step = 0;
  const model = textModel((body) => {
    const current = JSON.parse(
      String(body.input.findLast((item) => item.role === 'user')?.content),
    ).draft;
    const turn = step++;
    return [
      turn === 1
        ? modelTool('save_draft', {
            version: current.version,
            contentVersion: current.contentVersion,
            operationId: 'details-save',
          })
        : modelTool('report_result', { source: turn === 0 ? 'draft' : 'latest_save' }),
    ];
  });
  const app = await createInstallation(undefined, { modelFetch: model.provider });
  try {
    const { path } = await arrange(page, app);
    const read = async () => (await page.request.get(path)).json();
    const post = async (route: string, data: object) => {
      const state = await read();
      const response = await page.request.post(`${path}/${route}`, {
        headers: { origin: app.origin },
        data: { version: state.draft.version, contentVersion: state.contentVersion, ...data },
      });
      expect(response.status(), await response.text()).toBe(200);
    };
    const state = await read();
    const usageType = state.relationshipTypes.find(
      (type: { name: string }) => type.name === 'Använder',
    );
    const paymentType = state.relationshipTypes.find(
      (type: { name: string }) => type.name === 'Betalar',
    );
    const service = {
      typeId: state.types.find((type: { name: string }) => type.name === 'Tjänst').id,
      name: 'Tonrum',
      description: '',
    };
    const relationship = { sourceId: 'lo', targetId: 'tonrum', knowledge: 'known' };
    await post('draft', {
      id: 'tonrum',
      baseRevision: null,
      value: { ...service, lifecycle: 'active' },
    });
    await post('relationship', {
      id: 'lo-tonrum',
      baseRevision: null,
      value: { ...relationship, typeId: usageType.id },
    });
    await post('save', { operationId: 'details-baseline' });
    await post('draft', {
      id: 'tonrum',
      baseRevision: 1,
      value: { ...service, lifecycle: 'ended' },
    });
    await post('relationship', {
      id: 'lo-tonrum',
      baseRevision: 1,
      value: { ...relationship, typeId: paymentType.id },
    });
    await page.reload();
    await openTable(page);
    await consent(page);
    await openTable(page);
    const listPanel = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    const report = transcript(page);
    const beforeReview = await read();

    await send(page, 'Läs upp hela utkastet.');
    await expect(report).toContainText('Utkast:');
    await expect(report).toContainText('Tonrum (Gäller: aktuellt → upphört)');
    await expect(report).toContainText('Lo Exempel Använder Tonrum → Lo Exempel Betalar Tonrum');
    await expect(listPanel).toBeVisible();
    expect(await read()).toEqual(beforeReview);

    await send(page, 'Spara hela utkastet nu.');
    await expect(
      transcript(page)
        .getByRole('listitem')
        .filter({ hasText: /^Skyttel: Sparat\.$/ }),
    ).toHaveCount(1);
    const saved = await read();
    expect(saved.draft.changes).toEqual([]);
    expect(saved.draft.relationships ?? []).toEqual([]);
    expect(saved.objects.find((object: { id: string }) => object.id === 'tonrum').lifecycle).toBe(
      'ended',
    );
    expect(saved.relationships).toMatchObject([{ typeId: paymentType.id }]);
    const operations = await (await page.request.get(`${path}/operations`)).json();

    await send(page, 'Vad sparades senast?');
    await expect(report).toContainText('Sparandet:');
    await expect(report).toContainText('Tonrum (Gäller: aktuellt → upphört)');
    await expect(report).toContainText('Lo Exempel Använder Tonrum → Lo Exempel Betalar Tonrum');
    await expect(listPanel).toBeVisible();
    expect(await read()).toEqual(saved);
    expect(await (await page.request.get(`${path}/operations`)).json()).toEqual(operations);
    expect(model.requests).toHaveLength(3);
  } finally {
    await app.close();
  }
});
