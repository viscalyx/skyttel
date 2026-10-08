import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import type {
  MapState,
  ObjectValue,
  RelationshipValue,
  SaveReceipt,
} from '../../src/shared/map.js';
import {
  closeSupportDialog,
  closeTextView,
  createHousehold,
  openDraftReview,
  openMap,
  openNewObject,
  openTable,
  signIn,
} from '../support/client.js';
import {
  applyConflictPropertyChoices,
  applyProposedConflictChanges,
  chooseConflictProperties,
} from '../support/conflict-properties.js';
import { saveReviewedConflictDraft } from '../support/conflict-special.js';
import {
  closeTableObject,
  editObjectRelationship,
  editTableObject,
  openObjectRelationships,
  openTypeDefinitions,
  readDraftProposal,
  readTableObject,
} from '../support/domain-work.js';
import { alex, createInstallation, robin } from '../support/installation.js';
import { focusMapSearch } from '../support/object-search.js';
import { stageRelationshipAndClose } from '../support/relationship-dialog.js';

test('UTKAST-17: canceled form loss and staged independent work survive concurrent conflict review', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  const member = await other.newPage();
  try {
    await page.goto(app.installation.origin);
    await member.goto(app.installation.origin);
    for (const client of [page, member]) {
      await openTable(client);
      await editTableObject(client, 'Lo Exempel');
    }
    await page.getByLabel('Namn', { exact: true }).fill('Lo Lind');
    await page.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    await member.getByLabel('Namn', { exact: true }).fill('Lo Berg');
    await member.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    await saveReviewedConflictDraft(member);
    await closeTextView(member);
    await openDraftReview(page);
    await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
    const saveDialog = page.getByRole('dialog', { name: 'Spara utkastet', exact: true });
    await expect(saveDialog).toContainText('Inget sparades');
    await saveDialog.getByRole('button', { name: 'Stäng dialogen', exact: true }).click();
    await page.reload();
    await openTable(page);
    await openNewObject(page);
    await page.getByLabel('Namn', { exact: true }).fill('Oskickad cykel');
    const form = page.locator('dialog.object-dialog-C');
    await form.getByRole('button', { name: 'Avbryt', exact: true }).click();
    const loss = page.getByRole('dialog', { name: 'Lämna ändrade uppgifter?', exact: true });
    await expect(
      loss.getByRole('button', { name: 'Fortsätt redigera', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(form.getByLabel('Namn', { exact: true })).toHaveValue('Oskickad cykel');
    expect((await app.read()).draft.changes.map((change) => change.after?.name)).toEqual([
      'Lo Lind',
    ]);
    await form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    const beforeReview = await app.read();
    await openMap(page);
    const status = page.getByRole('region', { name: 'Kartans status', exact: true });
    await status.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      dialog.getByRole('heading', { name: 'Granska konflikter', exact: true }),
    ).toBeFocused();
    await expectFocusedTargetUncovered(page);
    await expect(dialog.getByRole('region', { name: 'Sparat i kartan nu' })).toContainText(
      'Lo Berg',
    );
    await expect(dialog.getByRole('region', { name: 'Ditt förslag' })).toContainText('Lo Lind');
    await expect(
      dialog.getByRole('button', { name: 'Namn: Ditt förslag – Lo Lind', exact: true }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');
    await openTable(page);
    await expect(await readTableObject(page, 'Oskickad cykel')).toBeVisible();
    expect(await app.read()).toEqual(beforeReview);
    expect((await app.read()).objects.find((object) => object.id === 'lo')?.name).toBe('Lo Berg');
    expect((await app.read()).draft.changes.map((change) => change.after?.name)).toEqual([
      'Lo Lind',
      'Oskickad cykel',
    ]);
    expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(2);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

async function expectFocusedTargetUncovered(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const target = document.activeElement;
        if (!(target instanceof HTMLElement)) return false;
        const bounds = target.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        return bounds.top >= 0 && bounds.bottom <= innerHeight && target.contains(hit);
      }),
    )
    .toBe(true);
}

for (const { width, height } of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
  { width: 640, height: 456 },
]) {
  test(`UTKAST-18: status reaches all conflict kinds and preserves complete snapshot values at ${width}px`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await collaborators(page.request, other.request);
    try {
      await page.setViewportSize({ width, height });
      const initial = await app.read();
      const objectType = initial.types[0];
      const edgeType = initial.relationshipTypes[0];
      const edgeDefinition = {
        name: edgeType.name,
        description: edgeType.description,
        forwardLabel: edgeType.forwardLabel ?? edgeType.name,
        reverseLabel: edgeType.reverseLabel ?? edgeType.name,
        fields: edgeType.fields,
        sections: edgeType.sections,
      };
      const definition = {
        ...objectType,
        sections: [{ id: 'finance', name: 'Sparad ekonomi' }],
        fields: [
          { id: 'note', name: 'Dold anteckning', description: '', kind: 'text', sectionId: '' },
        ],
        builtins: [{ key: 'debt', name: 'Sparad skuld', sectionId: 'finance' }],
        propertyOrder: ['builtin:debt', 'field:note'],
      };
      async function proposeType(
        client: APIRequestContext,
        kind: 'object-type' | 'relationship-type',
        value: unknown,
      ) {
        const state = await app.read(client);
        const type = (kind === 'object-type' ? state.types : state.relationshipTypes)[0];
        expect(
          (
            await app.post(client, kind, {
              version: state.draft.version,
              id: type.id,
              baseRevision: type.revision,
              value,
            })
          ).status(),
        ).toBe(200);
      }
      await proposeType(page.request, 'object-type', definition);
      const original: ObjectValue = {
        typeId: objectType.id,
        name: 'Lo Exempel',
        description: 'Tidigare beskrivning',
        customValues: { note: 'Tidigare dold uppgift' },
        financialFacts: { debt: { knowledge: 'known', value: '1 200', reportedOn: '2026-09-01' } },
      };
      await app.propose(page.request, 'draft', 'lo', original);
      const edge: RelationshipValue = {
        typeId: edgeType.id,
        sourceId: 'lo',
        targetId: 'service',
        knowledge: 'known',
      };
      await app.propose(page.request, 'relationship', 'edge', edge);
      expect((await app.save(page.request, 'base-values')).status()).toBe(200);
      await proposeType(page.request, 'object-type', {
        ...definition,
        name: 'Min objekttyp',
        sections: [{ id: 'finance', name: 'Mitt ekonomiska avsnitt' }],
        builtins: [{ key: 'debt', name: 'Min skuld', sectionId: 'finance' }],
      });
      await proposeType(page.request, 'relationship-type', {
        ...edgeDefinition,
        name: 'Min sambandstyp',
        forwardLabel: 'använder enligt mig',
        reverseLabel: 'används av mig',
      });
      await app.propose(page.request, 'draft', 'lo', {
        ...original,
        name: 'Lo Lind',
        customValues: { note: 'Min dolda uppgift' },
        financialFacts: { debt: { knowledge: 'known', value: '1 700', reportedOn: '2026-09-03' } },
      });
      await app.propose(page.request, 'relationship', 'edge', { ...edge, knowledge: 'uncertain' });
      await proposeType(other.request, 'object-type', {
        ...definition,
        description: 'Annans typförklaring',
      });
      await proposeType(other.request, 'relationship-type', {
        ...edgeDefinition,
        description: 'Annans sambandstyp',
      });
      await app.propose(other.request, 'draft', 'lo', {
        ...original,
        name: 'Lo Berg',
        description: 'Annans beskrivning',
        customValues: { note: 'Annans dolda uppgift' },
        financialFacts: {
          debt: { knowledge: 'uncertain', value: '2 000', reportedOn: '2026-09-02' },
        },
      });
      await app.propose(other.request, 'relationship', 'edge', {
        ...edge,
        targetId: null,
        knowledge: 'unknown',
      });
      expect((await app.save(other.request, 'concurrent-values')).status()).toBe(200);
      const unchanged = await app.read();
      await page.goto(app.installation.origin);
      await openMap(page);
      const status = page.getByRole('region', { name: 'Kartans status', exact: true });
      await focusMapSearch(page);
      const search = page.getByRole('region', { name: 'Kartans sökning och filter', exact: true });
      await search
        .getByRole('searchbox', { name: 'Sök objekt i kartan', exact: true })
        .fill('Finns inte i kartan');
      await search.getByRole('searchbox').press('Escape');
      await expect(
        page.getByRole('region', { name: 'Teckenförklaring i kartan', exact: true }),
      ).toHaveCount(0);
      await expect(status).toContainText('4 konflikter i ditt utkast');
      const disclosure = status.getByRole('button', {
        name: '4 konflikter i ditt utkast',
        exact: true,
      });
      await disclosure.focus();
      await expectFocusedTargetUncovered(page);
      expect((await disclosure.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Enter');
      const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(
        conflict.getByRole('heading', { name: 'Granska konflikter', exact: true }),
      ).toBeFocused();
      await expect(
        conflict.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
      ).toBeEnabled();
      const list = conflict.getByRole('navigation', { name: 'Alla konflikter', exact: true });
      for (const [label, title] of [
        ['Objekttyp Min objekttyp', 'Min objekttyp'],
        ['Sambandstyp Min sambandstyp', 'Min sambandstyp'],
        [
          'Samband Lo Berg → Använder → Molnmusik (Osäkert uppgivet)',
          'Lo Berg → Använder → Molnmusik (Osäkert uppgivet)',
        ],
        ['Objekt Lo Lind', 'Lo Lind'],
      ]) {
        await list.getByRole('button', { name: label, exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(conflict.getByRole('heading', { name: title, exact: true })).toBeFocused();
        await expectFocusedTargetUncovered(page);
      }
      const current = conflict.getByRole('region', { name: 'Sparat i kartan nu', exact: true });
      const proposed = conflict.getByRole('region', { name: 'Ditt förslag', exact: true });
      await expect(current).toContainText('Sparad skuld');
      await expect(current).toContainText('2 000');
      await expect(current).toContainText('Osäkert uppgivet');
      await expect(current).toContainText('2026-09-02');
      await expect(current).toContainText('Annans dolda uppgift');
      await expect(proposed).toContainText('Min skuld');
      await expect(proposed).toContainText('1 700');
      await expect(proposed).toContainText('2026-09-03');
      await expect(proposed).toContainText('Min dolda uppgift');
      await current.getByRole('button', { name: /^Sparad skuld: Sparat i kartan nu/ }).click();
      const preview = conflict.getByRole('region', { name: 'Resultat av valen', exact: true });
      await expect(
        preview
          .locator('dl > div')
          .filter({ has: page.getByText('Sparad skuld', { exact: true }) }),
      ).toContainText('2 000');
      await proposed.getByRole('button', { name: /^Min skuld: Ditt förslag/ }).click();
      await expect(
        preview.locator('dl > div').filter({ has: page.getByText('Min skuld', { exact: true }) }),
      ).toContainText('1 700');

      await page.keyboard.press('Escape');
      const historical = await readDraftProposal(page, 'Lo Lind');
      for (const value of [
        'Sparad skuld',
        '1 200',
        '2026-09-01',
        'Tidigare dold uppgift',
        'Min skuld',
        '1 700',
        '2026-09-03',
        'Min dolda uppgift',
      ])
        await expect(historical).toContainText(value);
      await closeSupportDialog(page, 'Lo Lind');
      const definitionRead = await readDraftProposal(page, 'Min objekttyp');
      await expect(definitionRead).toContainText('Sparad ekonomi');
      await expect(definitionRead).toContainText('Mitt ekonomiska avsnitt');
      await expect(definitionRead).toContainText('Sparad skuld');
      await expect(definitionRead).toContainText('Min skuld');
      await closeSupportDialog(page, 'Min objekttyp');
      const review = await openDraftReview(page);
      const expectRejectedSave = async () => {
        const beforeSave = await app.read();
        const beforeHistory = (await (await page.request.get(`${app.path}/history`)).json())
          .history;
        const response = page.waitForResponse(
          (response) =>
            response.url().endsWith('/map/save') && response.request().method() === 'POST',
        );
        await review.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
        expect((await response).status()).toBe(409);
        await expect(
          page.getByRole('dialog', { name: 'Spara utkastet', exact: true }),
        ).toContainText('Inget sparades');
        expect(await app.read()).toEqual(beforeSave);
        expect((await (await page.request.get(`${app.path}/history`)).json()).history).toEqual(
          beforeHistory,
        );
        await closeSupportDialog(page, 'Spara utkastet');
      };
      await expectRejectedSave();
      expect(await app.read()).toEqual(unchanged);
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        3,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await closeTextView(page);
      await page.reload();
      await openMap(page);
      await disclosure.click();
      await expect(
        conflict.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
      ).toBeEnabled();
      await list.getByRole('button', { name: 'Objekttyp Min objekttyp', exact: true }).click();
      await chooseConflictProperties(conflict, 'proposed');
      const apply = conflict.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
      await apply.focus();
      await page.keyboard.press('Enter');
      await expect(
        conflict.getByRole('heading', { name: 'Min objekttyp', exact: true }),
      ).toBeFocused();
      await expectFocusedTargetUncovered(page);
      await expect(
        conflict.getByRole('heading', { name: '✓ Valen finns i ditt utkast', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        status.getByRole('button', { name: '3 konflikter i ditt utkast', exact: true }),
      ).toBeVisible();
      await openDraftReview(page);
      await expectRejectedSave();
      expect(await app.read()).toMatchObject({
        objects: unchanged.objects,
        relationships: unchanged.relationships,
        types: unchanged.types,
        relationshipTypes: unchanged.relationshipTypes,
      });
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        3,
      );
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

test('UTKAST-19: an own object correction preserves staged independent work and saved facts until a fresh save', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  let cleanup: PromiseSettledResult<void>[] = [];
  try {
    const { types } = await app.read();
    const value = { typeId: types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    await app.propose(other.request, 'draft', 'lo', {
      ...value,
      name: 'Lo Berg',
      description: 'Spelar piano',
    });
    expect((await app.save(other.request, 'independent-description')).status()).toBe(200);
    const saved = await app.read();
    await page.goto(app.installation.origin);
    await openTable(page);
    await openNewObject(page);
    const unsent = page.locator('dialog.object-dialog-C');
    await unsent.getByLabel('Namn', { exact: true }).fill('Oskickad cykel');
    await unsent.getByLabel('Beskrivning', { exact: true }).fill('Behåll den här texten');
    await unsent.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(unsent.getByLabel('Namn', { exact: true })).toHaveValue('Oskickad cykel');
    await expect(unsent.getByLabel('Beskrivning', { exact: true })).toHaveValue(
      'Behåll den här texten',
    );
    expect((await app.read()).draft.changes).toHaveLength(1);
    await unsent.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
    await expect(unsent).not.toBeVisible();
    await openMap(page);
    const status = page.getByRole('region', { name: 'Kartans status', exact: true });
    await status.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      dialog.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await openTable(page);
    await editTableObject(page, 'Lo Lind');
    const correction = page.locator('dialog.object-dialog-C');
    await expect(correction.getByLabel('Namn', { exact: true })).toBeFocused();
    await expectFocusedTargetUncovered(page);
    await expect(correction.getByLabel('Namn', { exact: true })).toHaveValue('Lo Lind');
    await correction.getByLabel('Namn', { exact: true }).fill('Lo Alm');
    await correction
      .getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true })
      .click();
    await expect(correction).not.toBeVisible();
    const correctionProposal = await readDraftProposal(page, 'Lo Alm');
    await expect(correctionProposal).toContainText('Lo Alm');
    await closeSupportDialog(page, 'Lo Alm');
    await closeTextView(page);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const refresh = dialog.getByRole('button', { name: 'Visa aktuell jämförelse' });
    if (await refresh.isVisible()) await refresh.click();
    await expect(
      dialog.getByRole('button', { name: 'Namn: Ditt förslag – Lo Alm', exact: true }),
    ).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await openTable(page);
    const independent = await readTableObject(page, 'Oskickad cykel');
    await expect(independent).toContainText('Behåll den här texten');
    await closeTableObject(page, 'Oskickad cykel');
    const corrected = await app.read();
    expect(corrected.objects).toEqual(saved.objects);
    expect(corrected.draft.changes).toHaveLength(2);
    expect(corrected.draft.changes.find(({ id }) => id === 'lo')?.after?.name).toBe('Lo Alm');
    expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(2);
    await openMap(page);
    await applyProposedConflictChanges(page);
    expect((await app.read()).objects).toEqual(saved.objects);
    expect((await app.read()).draft.changes.find(({ id }) => id === 'lo')?.after).toMatchObject({
      name: 'Lo Alm',
      description: 'Spelar piano',
    });
    expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(2);
    await saveReviewedConflictDraft(page);
    await closeTextView(page);
    expect((await app.read(other.request)).objects.find(({ id }) => id === 'lo')).toMatchObject({
      name: 'Lo Alm',
      description: 'Spelar piano',
    });
    expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(3);
  } finally {
    cleanup = await Promise.allSettled([other.close(), app.installation.close()]);
  }
  for (const result of cleanup) {
    if (result.status === 'rejected') throw result.reason;
  }
});

for (const width of [1440, 390]) {
  test(`UTKAST-20: a relationship correction replaces a deleted endpoint and still requires a fresh save at ${width}px`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await collaborators(page.request, other.request, [
      ['lo', 'Lo Exempel'],
      ['service', 'Molnmusik'],
      ['garage', 'Garaget'],
    ]);
    try {
      await page.setViewportSize({ width, height: 900 });
      const state = await app.read();
      const edge: RelationshipValue = {
        typeId: state.relationshipTypes[0].id,
        sourceId: 'lo',
        targetId: 'service',
        knowledge: 'uncertain',
      };
      await app.propose(page.request, 'relationship', 'pending-edge', edge);
      await app.propose(page.request, 'draft', 'independent', {
        typeId: state.types[0].id,
        name: 'Privat stol',
        description: '',
      });
      await app.propose(other.request, 'draft', 'service', null);
      expect((await app.save(other.request, 'delete-endpoint')).status()).toBe(200);
      expect((await app.save(page.request, 'blocked-endpoint')).status()).toBe(409);
      const saved = await app.read();
      await page.goto(app.installation.origin);
      await openMap(page);
      const status = page.getByRole('region', { name: 'Kartans status', exact: true });
      await status.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(conflict).toContainText('Ett objekt som sambandet pekar på saknas.');
      await expect(
        conflict.getByRole('region', { name: 'Ditt förslag' }).getByRole('button'),
      ).toHaveCount(0);
      await page.keyboard.press('Escape');
      const editor = await editObjectRelationship(
        page,
        'Lo Exempel',
        'Lo Exempel → Använder → Molnmusik (Osäkert uppgivet)',
      );
      await expect(
        editor.getByRole('heading', { name: 'Redigera samband', exact: true }),
      ).toBeVisible();
      await expect(editor.getByLabel('Från objekt')).toHaveValue('lo');
      await expect(editor.getByLabel('Sambandstyp', { exact: true })).toHaveValue(edge.typeId);
      await expect(editor.getByLabel('Uppgiftens säkerhet', { exact: true })).toHaveValue(
        'uncertain',
      );
      await expect(
        editor.getByLabel('Till objekt').getByRole('option', { name: /Molnmusik/ }),
      ).toHaveCount(0);
      await editor.getByLabel('Till objekt').selectOption('garage');
      await stageRelationshipAndClose(page);
      const review = await openDraftReview(page);
      await expect(review).toContainText('Lo Exempel → Använder → Garaget (osäkert uppgivet)');
      await expect(review).toContainText('Privat stol');
      const corrected = await app.read();
      expect(corrected.objects).toEqual(saved.objects);
      expect(corrected.relationships).toEqual([]);
      expect(corrected.draft.relationships?.[0]).toMatchObject({
        id: 'pending-edge',
        before: null,
        after: { ...edge, targetId: 'garage' },
      });
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        2,
      );
      await saveReviewedConflictDraft(page);
      const shared = await app.read(other.request);
      expect(shared.relationships).toEqual([
        expect.objectContaining({ id: 'pending-edge', ...edge, targetId: 'garage' }),
      ]);
      expect(shared.objects.some(({ name }) => name === 'Privat stol')).toBe(true);
      expect(shared.objects.some(({ id }) => id === 'service')).toBe(false);
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        3,
      );
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

for (const kind of ['object-type', 'relationship-type'] as const) {
  for (const width of [1440, 390]) {
    test(`UTKAST-21: ${kind} correction opens retained settings and preserves independent edits until a fresh save at ${width}px`, async ({
      page,
      browser,
    }) => {
      const other = await browser.newContext();
      const app = await collaborators(page.request, other.request);
      try {
        await page.setViewportSize({ width, height: 844 });
        const initial = await app.read();
        const isObjectType = kind === 'object-type';
        const type = isObjectType ? initial.types[0] : initial.relationshipTypes[0];
        const definition = {
          name: type.name,
          description: type.description,
          fields: type.fields ?? [],
          sections: type.sections,
          ...(isObjectType
            ? {
                builtins: initial.types[0].builtins,
                propertyOrder: initial.types[0].propertyOrder,
              }
            : {
                forwardLabel: initial.relationshipTypes[0].forwardLabel ?? type.name,
                reverseLabel: initial.relationshipTypes[0].reverseLabel ?? type.name,
              }),
        };
        for (const [client, name, description] of [
          [page.request, 'Min typ', definition.description],
          [other.request, 'Annans typ', 'Oberoende typförklaring'],
        ] as const) {
          const state = await app.read(client);
          expect(
            (
              await app.post(client, kind, {
                version: state.draft.version,
                id: type.id,
                baseRevision: type.revision,
                value: { ...definition, name, description },
              })
            ).status(),
          ).toBe(200);
        }
        expect((await app.save(other.request, 'other-type')).status()).toBe(200);
        const saved = await app.read();
        expect((await app.save(page.request, 'blocked-type')).status()).toBe(409);
        expect((await app.read()).draft).toEqual(saved.draft);
        await page.goto(app.installation.origin);
        await openTable(page);
        await openMap(page);
        const status = page.getByRole('region', { name: 'Kartans status', exact: true });
        await status.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
        const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
        await expect(
          conflict.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
        ).toBeEnabled();
        await expect(conflict).toContainText('Annans typ');
        await expect(conflict).toContainText('Oberoende typförklaring');
        await page.keyboard.press('Escape');
        await openTypeDefinitions(page);
        const category = page.getByText(
          isObjectType ? 'Objekttyper och egna fält' : 'Sambandstyper och riktning',
          { exact: true },
        );
        await category.click();
        await page
          .getByRole('button', {
            name: isObjectType ? 'Ändra typ: Min typ' : 'Ändra sambandstyp: Min typ',
            exact: true,
          })
          .click();
        const editor = page.getByRole('group', {
          name: isObjectType ? 'Objekttypens definition' : 'Sambandstypens definition',
          exact: true,
        });
        const name = editor.getByLabel(isObjectType ? 'Typens namn' : 'Sambandstypens namn', {
          exact: true,
        });
        await expect(name).toHaveValue('Min typ');
        await name.fill('Rättad typ');
        await editor
          .getByRole('button', {
            name: isObjectType
              ? 'Lägg typförslaget i mitt utkast'
              : 'Lägg sambandstypen i mitt utkast',
            exact: true,
          })
          .click();
        await expect(editor).toHaveCount(0);
        await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
        await openMap(page);
        await applyProposedConflictChanges(page);
        const corrected = await app.read();
        expect(corrected.types).toEqual(saved.types);
        expect(corrected.relationshipTypes).toEqual(saved.relationshipTypes);
        expect(corrected.objects).toEqual(saved.objects);
        expect(corrected.relationships).toEqual(saved.relationships);
        const changes = isObjectType
          ? corrected.draft.objectTypes
          : corrected.draft.relationshipTypes;
        expect(changes).toEqual([
          expect.objectContaining({
            id: type.id,
            after: expect.objectContaining({
              name: 'Rättad typ',
              description: 'Oberoende typförklaring',
            }),
          }),
        ]);
        expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
          2,
        );
        await saveReviewedConflictDraft(page);
        const shared = await app.read(other.request);
        expect(
          (isObjectType ? shared.types : shared.relationshipTypes).find(({ id }) => id === type.id),
        ).toMatchObject({
          id: type.id,
          name: 'Rättad typ',
          description: 'Oberoende typförklaring',
          revision: type.revision + 2,
        });
        expect(shared.objects).toEqual(saved.objects);
        expect(shared.relationships).toEqual(saved.relationships);
        expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
          3,
        );
      } finally {
        await other.close();
        await app.installation.close();
      }
    });
  }
}

for (const choice of ['saved', 'proposed'] as const) {
  test(`UTKAST-22: a ${choice} conflict choice keeps the review heading focused and restores usable toolbar focus without saving`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await collaborators(page.request, other.request);
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      const initial = await app.read();
      const value = { typeId: initial.types[0].id, name: 'Lo Lind', description: '' };
      await app.propose(page.request, 'draft', 'lo', value);
      await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Berg' });
      expect((await app.save(other.request, 'other-name')).status()).toBe(200);
      const saved = await app.read();
      await page.goto(app.installation.origin);
      await openTable(page);
      await openMap(page);
      const status = page.getByRole('region', { name: 'Kartans status', exact: true });
      await status.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await chooseConflictProperties(review, choice);
      const decision = review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
      await decision.focus();
      await page.keyboard.press('Enter');
      await expect(review.getByRole('heading', { name: 'Lo Lind', exact: true })).toBeFocused();
      await expectFocusedTargetUncovered(page);
      await expect(review.getByRole('status')).toContainText(
        choice === 'saved' ? 'Förslaget har tagits bort' : 'Valen finns i ditt utkast',
      );
      await page.keyboard.press('Escape');
      await expect(
        page
          .getByRole('navigation', { name: 'Kartans verktyg' })
          .getByRole('button', { name: 'Karta', exact: true }),
      ).toBeFocused();
      const resolved = await app.read();
      expect(resolved.objects).toEqual(saved.objects);
      expect(resolved.relationships).toEqual(saved.relationships);
      expect(resolved.draft.changes).toHaveLength(choice === 'saved' ? 0 : 1);
      if (choice === 'proposed') expect(resolved.draft.changes[0].after?.name).toBe('Lo Lind');
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        2,
      );
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

test('UTKAST-23: delayed conflict resolution protects pending focus and allows explicit table continuation', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const initial = await app.read();
    const value = { typeId: initial.types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Berg' });
    expect((await app.save(other.request, 'other-name')).status()).toBe(200);
    const saved = await app.read();
    let resolved = false;
    await page.route('**/map/resolve', async (route) => {
      const response = await route.fetch();
      resolved = true;
      await held;
      await route.fulfill({ response });
    });
    await page.goto(app.installation.origin);
    await openTable(page);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await chooseConflictProperties(review, 'proposed');
    const decision = review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
    await decision.click();
    await expect.poll(() => resolved).toBe(true);
    await expect(decision).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(review).toBeVisible();
    await expect(
      review.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
    ).toBeDisabled();
    await expect(review.getByRole('heading', { name: 'Lo Lind', exact: true })).toBeFocused();
    release();
    await expect(review.getByRole('status')).toContainText('Valen finns i ditt utkast');
    await expect(review.getByRole('heading', { name: 'Lo Lind', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    const search = page.getByRole('searchbox', { name: 'Sök objekt i tabellen', exact: true });
    await search.fill('Lo');
    release();
    await expect(
      page.getByRole('status', { name: 'Konfliktvalens status', exact: true }),
    ).toContainText('Valen finns i ditt utkast');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('Lo');
    await expectFocusedTargetUncovered(page);
    const state = await app.read();
    expect(state.objects).toEqual(saved.objects);
    expect(state.relationships).toEqual(saved.relationships);
    expect(state.draft.changes[0].after?.name).toBe('Lo Lind');
    expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(2);
  } finally {
    release();
    await other.close();
    await app.installation.close();
  }
});

for (const width of [1440, 390]) {
  test(`UTKAST-24: lost resolution and save responses recover the private choice and one fresh receipt at ${width}px`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await collaborators(page.request, other.request);
    try {
      await page.setViewportSize({ width, height: 844 });
      const initial = await app.read();
      const value = { typeId: initial.types[0].id, name: 'Lo Lind', description: '' };
      await app.propose(page.request, 'draft', 'lo', value);
      await app.propose(page.request, 'draft', 'chair', { ...value, name: 'Privat stol' });
      await app.propose(other.request, 'draft', 'lo', {
        ...value,
        name: 'Lo Berg',
        description: 'Spelar piano',
      });
      expect((await app.save(other.request, 'other-name')).status()).toBe(200);
      const saved = await app.read();
      const historyBefore = (await (await page.request.get(`${app.path}/history`)).json()).history;
      const operationsBefore = (await (await page.request.get(`${app.path}/operations`)).json())
        .operations;
      let privateResult: MapState['draft'] | undefined;
      await page.route('**/map/resolve', async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        privateResult = await response.json();
        await route.abort('failed');
      });
      await page.goto(app.installation.origin);
      await openTable(page);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await chooseConflictProperties(conflict, 'proposed');
      await conflict.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(conflict.getByRole('status')).toContainText('Det är oklart');
      await expect(
        conflict.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      expect(privateResult).toBeDefined();
      const resolved = await app.read();
      expect(resolved.draft).toEqual(privateResult);
      expect(resolved.draft.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'lo',
            after: expect.objectContaining({ name: 'Lo Lind', description: 'Spelar piano' }),
          }),
          expect.objectContaining({
            id: 'chair',
            after: expect.objectContaining({ name: 'Privat stol' }),
          }),
        ]),
      );
      expect(resolved.objects).toEqual(saved.objects);
      expect(resolved.relationships).toEqual(saved.relationships);
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toEqual(
        historyBefore,
      );
      expect((await (await page.request.get(`${app.path}/operations`)).json()).operations).toEqual(
        operationsBefore,
      );
      await conflict
        .getByRole('button', { name: 'Kontrollera om valet lades i utkastet', exact: true })
        .click();
      await expect(conflict.getByRole('status')).toContainText('Valen finns i ditt utkast');
      await page.keyboard.press('Escape');
      const proposal = await readDraftProposal(page, 'Lo Lind');
      await expect(proposal).toContainText('Spelar piano');
      await closeSupportDialog(page, 'Lo Lind');
      await page.reload();
      const review = await openDraftReview(page);
      await expect(review).toContainText('Lo Lind');
      await expect(review).toContainText('Privat stol');
      expect((await app.read()).draft).toEqual(privateResult);
      expect((await app.read(other.request)).objects).toEqual(saved.objects);
      await closeTextView(page);
      await openMap(page);
      await expect(
        page.getByRole('region', { name: 'Teckenförklaring i kartan', exact: true }),
      ).toContainText('föreslås');
      let receipt: SaveReceipt | undefined;
      let saveRequests = 0;
      await page.route('**/map/save', async (route) => {
        saveRequests += 1;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        receipt = (await response.json()).receipt;
        await route.abort('failed');
      });
      await openDraftReview(page);
      await review.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
      const saveDialog = page.getByRole('dialog', { name: 'Spara utkastet', exact: true });
      await expect(saveDialog).toContainText('Sparandet kunde inte bekräftas');
      expect(receipt).toBeDefined();
      await saveDialog
        .getByRole('button', { name: 'Kontrollera sparandet igen', exact: true })
        .click();
      await expect(saveDialog).not.toBeVisible();
      await expect(
        page.getByRole('status', { name: 'Sparbekräftelse', exact: true }),
      ).toContainText('Utkastet är sparat');
      await expect(review).toContainText('Utkastet är tomt.');
      const shared = await app.read(other.request);
      expect(shared.objects.find(({ id }) => id === 'lo')).toMatchObject({
        name: 'Lo Lind',
        description: 'Spelar piano',
      });
      expect(shared.objects.find(({ id }) => id === 'chair')).toMatchObject({
        name: 'Privat stol',
      });
      expect((await app.read()).draft.changes).toEqual([]);
      expect(saveRequests).toBe(1);
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toEqual([
        receipt,
        ...historyBefore,
      ]);
      const { operations } = await (await page.request.get(`${app.path}/operations`)).json();
      expect(operations).toHaveLength(operationsBefore.length + 1);
      expect(operations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            operationId: receipt?.operationId,
            status: 'succeeded',
            receipt,
          }),
        ]),
      );
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

test('UTKAST-05: a conflict choice preserves independent proposals and requires a new save', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const { installation, path, read, propose, save } = await collaborators(
    page.request,
    other.request,
    [['lo', 'Lo Exempel']],
  );
  try {
    await propose(page.request, 'draft', 'alex', {
      typeId: (await read()).types[0].id,
      name: 'Alex Exempel',
      description: '',
    });
    await propose(page.request, 'draft', 'lo', {
      typeId: (await read()).types[0].id,
      name: 'Lo Lind',
      description: '',
    });
    await page.goto(installation.origin);
    await openDraftReview(page);
    await expect(page.getByRole('button', { name: 'Spara hela utkastet' })).toBeEnabled();
    await propose(other.request, 'draft', 'lo', {
      typeId: (await read()).types[0].id,
      name: 'Lo Berg',
      description: '',
    });
    expect((await save(other.request, 'other')).status()).toBe(200);
    await page.getByRole('button', { name: 'Spara hela utkastet' }).click();
    const rejected = page.getByRole('dialog', { name: 'Spara utkastet', exact: true });
    await expect(rejected).toContainText('Inget sparades');
    expect((await read()).objects.map((object) => object.name)).toEqual(['Lo Berg']);
    expect((await (await page.request.get(`${path}/history`)).json()).history).toHaveLength(2);
    await closeSupportDialog(page, 'Spara utkastet');
    const historical = await readDraftProposal(page, 'Lo Lind');
    await expect(historical).toContainText('Lo Exempel');
    await expect(historical).toContainText('Lo Lind');
    await closeSupportDialog(page, 'Lo Lind');
    await closeTextView(page);
    await page.reload();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      conflict.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
    ).toBeEnabled();
    for (const name of ['Lo Berg', 'Lo Lind']) await expect(conflict).toContainText(name);
    await page.keyboard.press('Escape');
    await applyProposedConflictChanges(page, 'Lo Berg');
    const draft = await openDraftReview(page);
    await expect(draft).toContainText('Alex Exempel');
    expect((await read()).objects[0].name).toBe('Lo Berg');
    await installation.restart();
    await page.reload();
    await openDraftReview(page);
    await expect(draft).toContainText('Lo Lind');
    await saveReviewedConflictDraft(page);
    expect((await read(other.request)).objects.map((object) => object.name)).toEqual([
      'Alex Exempel',
      'Lo Lind',
    ]);
  } finally {
    await other.close();
    await installation.close();
  }
});

async function collaborators(
  first: APIRequestContext,
  second: APIRequestContext,
  seeds = [
    ['lo', 'Lo Exempel'],
    ['service', 'Molnmusik'],
  ],
) {
  const installation = await createInstallation();
  await signIn(first, installation.origin);
  const { household } = await (await createHousehold(first, installation.origin)).json();
  const path = `${installation.origin}/api/households/${household.id}/map`;
  const post = (client: APIRequestContext, route: string, data: unknown) =>
    client.post(`${path}/${route}`, { headers: { origin: installation.origin }, data });
  const read = async (client = first): Promise<MapState> => (await client.get(path)).json();
  async function propose(
    client: APIRequestContext,
    kind: 'draft' | 'relationship',
    id: string,
    value: ObjectValue | RelationshipValue | null,
  ) {
    const state = await read(client);
    const previous = (kind === 'draft' ? state.objects : state.relationships).find(
      (item) => item.id === id,
    );
    expect(
      (
        await post(client, kind, {
          version: state.draft.version,
          id,
          baseRevision: previous?.revision ?? null,
          value,
        })
      ).status(),
    ).toBe(200);
  }
  const save = async (client: APIRequestContext, operationId: string) =>
    post(client, 'save', { version: (await read(client)).draft.version, operationId });
  installation.setIdentity(robin);
  await signIn(second, installation.origin);
  const { user } = await (await second.get(`${installation.origin}/api/bootstrap`)).json();
  const { code } = await (
    await first.post(`${installation.origin}/api/households/${household.id}/invitations`, {
      headers: { origin: installation.origin },
      data: { userId: user.id },
    })
  ).json();
  expect(
    (
      await second.post(`${installation.origin}/api/invitations/accept`, {
        headers: { origin: installation.origin },
        data: { code },
      })
    ).status(),
  ).toBe(200);
  const state = await read();
  for (const [id, name] of seeds) {
    await propose(first, 'draft', id, { typeId: state.types[0].id, name, description: '' });
  }
  expect((await save(first, 'initial')).status()).toBe(200);
  return { installation, path, post, read, propose, save, userId: user.id };
}

test('UTKAST-06: deleting an object requires reviewing newly saved relationships', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    await app.propose(page.request, 'draft', 'lo', null);
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: /^Skriv till Skyttel/ }).click();
    await page.getByRole('button', { name: /^Visa utkastet/ }).click();
    const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
    await expect(
      draft.getByRole('button', { name: 'Spara hela utkastet', exact: true }),
    ).toBeEnabled();
    await app.propose(other.request, 'relationship', 'new-edge', {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'uncertain',
    });
    expect((await app.save(other.request, 'new-edge')).status()).toBe(200);
    const before = await app.read();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('/map/save') &&
          response.status() === 409,
      ),
      draft.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click(),
    ]);
    const saveDialog = page.getByRole('dialog', { name: 'Spara utkastet', exact: true });
    await expect(saveDialog.getByRole('status')).toContainText('Utkastet kunde inte sparas.');
    expect((await app.read()).draft).toEqual(before.draft);
    await page.keyboard.press('Escape');
    await page.reload();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      review.getByRole('region', { name: 'Sparat i kartan nu', exact: true }),
    ).toContainText('Lo Exempel Använder Molnmusik');
    const proposed = review.getByRole('region', { name: 'Ditt förslag', exact: true });
    await proposed.getByRole('button', { name: /^Objekt:/ }).click();
    await proposed.getByRole('button', { name: /^Samband:/ }).click();
    await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('Valen finns i ditt utkast');
    const staged = await app.read();
    expect(staged.draft.relationships).toEqual([
      expect.objectContaining({ id: 'new-edge', before: before.relationships[0], after: null }),
    ]);
    expect(staged.relationships).toEqual(before.relationships);
    await saveReviewedConflictDraft(page);
    const saved = await app.read(other.request);
    expect(saved.relationships).toEqual([]);
    expect(saved.objects.map((object) => object.name)).toEqual(['Molnmusik']);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-07: overlapping relationship proposals show meanings and can accept the saved value', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    const value: RelationshipValue = {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'known',
    };
    await app.propose(page.request, 'relationship', 'edge', value);
    expect((await app.save(page.request, 'edge')).status()).toBe(200);
    await app.propose(page.request, 'relationship', 'edge', { ...value, knowledge: 'uncertain' });
    await app.propose(other.request, 'relationship', 'edge', {
      ...value,
      targetId: null,
      knowledge: 'none',
    });
    expect((await app.save(other.request, 'other-edge')).status()).toBe(200);
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(conflict).toContainText('Osäkert uppgivet');
    await expect(conflict).toContainText('Uttryckligen inget');
    await page.keyboard.press('Escape');
    await applyConflictPropertyChoices(page, 'saved');
    const draft = await openDraftReview(page);
    await expect(draft).toContainText('Utkastet är tomt.');
    expect((await app.read()).relationships[0].knowledge).toBe('none');
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-10: relationship choices preserve independent status and keep date certainty with its value', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    const value: RelationshipValue = {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'known',
    };
    await app.propose(page.request, 'relationship', 'edge', value);
    expect((await app.save(page.request, 'edge')).status()).toBe(200);
    await app.propose(page.request, 'relationship', 'edge', {
      ...value,
      endDate: { knowledge: 'known', value: '2031-04-12' },
    });
    await app.propose(other.request, 'relationship', 'edge', { ...value, lifecycle: 'ended' });
    expect((await app.save(other.request, 'ended')).status()).toBe(200);
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(conflict).toContainText('Manuellt upphört');
    await expect(conflict).toContainText('2031-04-12');
    await page.keyboard.press('Escape');
    await applyProposedConflictChanges(page);
    expect((await app.read()).relationships[0]).not.toHaveProperty('endDate');
    await app.installation.restart();
    await page.reload();
    const retained = await readDraftProposal(page, 'Lo Exempel → Använder → Molnmusik');
    await expect(retained).toContainText('Upphört');
    await expect(retained).toContainText('2031-04-12');
    await closeSupportDialog(page, 'Lo Exempel → Använder → Molnmusik');
    await saveReviewedConflictDraft(page);
    await closeTextView(page);
    const first = (await app.read(other.request)).relationships[0];
    expect(first).toMatchObject({
      lifecycle: 'ended',
      endDate: { knowledge: 'known', value: '2031-04-12' },
    });

    await app.propose(page.request, 'relationship', 'edge', {
      ...first,
      endDate: { knowledge: 'uncertain', value: '2031-04-12' },
    });
    await app.propose(other.request, 'relationship', 'edge', {
      ...first,
      lifecycle: 'active',
      endDate: { knowledge: 'known', value: '2031-05-15' },
    });
    expect((await app.save(other.request, 'changed-date')).status()).toBe(200);
    await page.reload();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await expect(conflict).toContainText('2031-04-12');
    await expect(conflict).toContainText('Osäkert uppgivet');
    await expect(conflict).toContainText('2031-05-15');
    await expect(conflict).toContainText('Gäller fortfarande');
    await page.keyboard.press('Escape');
    await applyProposedConflictChanges(page);
    expect((await app.read()).relationships[0].endDate).toEqual({
      knowledge: 'known',
      value: '2031-05-15',
    });
    await saveReviewedConflictDraft(page);
    expect((await app.read(other.request)).relationships[0]).toMatchObject({
      lifecycle: 'active',
      endDate: { knowledge: 'uncertain', value: '2031-04-12' },
    });
  } finally {
    await other.close();
    await app.installation.close();
  }
});

for (const side of ['proposed', 'saved'] as const) {
  const title =
    side === 'proposed'
      ? 'UTKAST-11: deletion after concurrent type changes retains the matching historical definitions'
      : 'UTKAST-11: keeping a changed relationship preserves it and reopens the object removal dependency';
  test(title, async ({ page, browser }) => {
    const other = await browser.newContext();
    const app = await collaborators(page.request, other.request);
    try {
      const state = await app.read();
      const value: RelationshipValue = {
        typeId: state.relationshipTypes[0].id,
        sourceId: 'lo',
        targetId: 'service',
        knowledge: 'known',
      };
      await app.propose(page.request, 'relationship', 'edge', value);
      expect((await app.save(page.request, 'edge')).status()).toBe(200);
      await app.propose(page.request, 'draft', 'lo', null);
      await app.propose(other.request, 'draft', 'lo', {
        name: 'Lo Exempel',
        description: '',
        typeId: state.types[1].id,
      });
      await app.propose(other.request, 'relationship', 'edge', {
        ...value,
        typeId: state.relationshipTypes[1].id,
      });
      expect((await app.save(other.request, 'changed-types')).status()).toBe(200);
      const comparison = await app.read();
      const historyBefore = (await (await page.request.get(`${app.path}/history`)).json()).history;
      await page.goto(app.installation.origin);
      await openTable(page);
      await page.getByRole('button', { name: '2 konflikter i ditt utkast', exact: true }).click();
      const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(
        review.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
      ).toBeEnabled();
      expect(await app.read()).toEqual(comparison);
      expect((await app.save(page.request, 'unresolved-removal')).status()).toBe(409);
      expect(await app.read()).toEqual(comparison);
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toEqual(
        historyBefore,
      );
      await review
        .getByRole('button', { name: 'Objekt: Ditt förslag – Föreslagen borttagning', exact: true })
        .click();
      await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(
        review.getByRole('heading', { name: '✓ Valen finns i ditt utkast', exact: true }),
      ).toBeVisible();
      await review
        .getByRole('navigation', { name: 'Alla konflikter', exact: true })
        .getByRole('button', { name: /^Samband / })
        .click();
      await expect(
        review.getByRole('region', { name: 'Ditt förslag' }).getByRole('button'),
      ).not.toHaveCount(0);
      await expect(review.getByRole('region', { name: 'Sparat i kartan nu' })).toContainText(
        state.relationshipTypes[1].name,
      );
      if (side === 'proposed') {
        const service = (await app.read(other.request)).objects.find(
          (object) => object.id === 'service',
        );
        if (!service) throw new Error('The saved service must exist before its endpoint rename');
        await app.propose(other.request, 'draft', 'service', {
          ...service,
          name: 'Molnmusik aktuell',
        });
        expect((await app.save(other.request, 'endpoint-name')).status()).toBe(200);
        const beforeStaleChoice = await app.read();
        await chooseConflictProperties(review, side);
        const staleResponse = page.waitForResponse(
          (response) =>
            response.url() === `${app.path}/resolve` && response.request().method() === 'POST',
        );
        await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
        expect((await staleResponse).status()).toBe(409);
        expect((await app.read()).draft).toEqual(beforeStaleChoice.draft);
        await review.getByRole('button', { name: 'Visa aktuell jämförelse', exact: true }).click();
        await expect(review.getByRole('region', { name: 'Sparat i kartan nu' })).toContainText(
          'Molnmusik aktuell',
        );
      }
      await chooseConflictProperties(review, side);
      await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(
        review.getByRole('heading', { name: '✓ Valen finns i ditt utkast', exact: true }),
      ).toBeVisible();
      expect((await app.read(other.request)).relationships).toHaveLength(1);
      if (side === 'saved') {
        const retained = await app.read();
        expect(retained.objects).toEqual(comparison.objects);
        expect(retained.relationships).toEqual(comparison.relationships);
        expect(retained.draft.relationships ?? []).toEqual([]);
        expect(retained.draft.changes.find((change) => change.id === 'lo')?.after).toBeNull();
        expect((await app.save(page.request, 'retained-connection')).status()).toBe(409);
        expect(await app.read()).toEqual(retained);
        expect((await (await page.request.get(`${app.path}/history`)).json()).history).toEqual(
          historyBefore,
        );
        return;
      }
      await page.keyboard.press('Escape');
      const deletion = await readDraftProposal(page, 'Lo Exempel → Används av → Molnmusik aktuell');
      await expect(deletion).toContainText('Molnmusik aktuell');
      await closeSupportDialog(page, 'Lo Exempel → Används av → Molnmusik aktuell');
      await saveReviewedConflictDraft(page);
      const saved = await app.read(other.request);
      expect(saved.objects.map((object) => object.id)).toEqual(['service']);
      expect(saved.relationships).toEqual([]);
      const { history } = await (await page.request.get(`${app.path}/history`)).json();
      expect(history[0]).toMatchObject({
        changes: [{ before: { typeId: state.types[1].id }, after: null, type: state.types[1] }],
        relationships: [
          {
            before: { typeId: state.relationshipTypes[1].id },
            after: null,
            type: state.relationshipTypes[1],
          },
        ],
      });
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

test('UTKAST-08: a saved duplicate can be selected without losing another proposal', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    const value: RelationshipValue = {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'known',
    };
    await app.propose(page.request, 'relationship', 'my-edge', value);
    await app.propose(page.request, 'draft', 'independent', {
      typeId: state.types[0].id,
      name: 'Kim Exempel',
      description: '',
    });
    await app.propose(other.request, 'relationship', 'other-edge', value);
    expect((await app.save(other.request, 'other-edge')).status()).toBe(200);
    expect((await app.save(page.request, 'blocked-duplicate')).status()).toBe(409);
    await page.goto(app.installation.origin);
    const before = await app.read();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(review).toContainText(
      'Ett sparat samband har redan samma typ, riktning och objekt.',
    );
    await expect(
      review.getByRole('region', { name: 'Sparat i kartan nu', exact: true }),
    ).toContainText('Molnmusik');
    await review
      .getByRole('button', { name: 'Ta bort sambandet ur ditt utkast', exact: true })
      .click();
    await expect(review.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    const discarded = await app.read();
    expect(discarded.draft.relationships ?? []).toEqual([]);
    expect(discarded.draft.changes).toEqual(before.draft.changes);
    expect(discarded.relationships).toEqual(before.relationships);
    await saveReviewedConflictDraft(page);
    const saved = await app.read();
    expect(saved.relationships.map((edge) => edge.id)).toEqual(['other-edge']);
    expect(saved.objects.map((object) => object.name)).toContain('Kim Exempel');
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-09: a deleted relationship endpoint has an explicit recovery choice', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    await app.propose(page.request, 'relationship', 'pending-edge', {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'uncertain',
    });
    await app.propose(other.request, 'draft', 'service', null);
    expect((await app.save(other.request, 'delete-service')).status()).toBe(200);
    expect((await app.save(page.request, 'blocked-endpoint')).status()).toBe(409);
    await page.goto(app.installation.origin);
    const before = await app.read();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(review).toContainText('Ett objekt som sambandet pekar på saknas.');
    await page.keyboard.press('Escape');
    expect((await app.read()).draft).toEqual(before.draft);
    await app.installation.restart();
    await page.reload();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await expect(review).toContainText('Lo Exempel → Använder → Molnmusik (Osäkert uppgivet)');
    await review
      .getByRole('button', { name: 'Ta bort sambandet ur ditt utkast', exact: true })
      .click();
    await expect(
      review.getByRole('heading', {
        name: '✓ Sambandet har tagits bort ur ditt utkast',
        exact: true,
      }),
    ).toBeVisible();
    const after = await app.read();
    expect(after.draft.relationships ?? []).toEqual([]);
    expect(after.draft.changes).toEqual(before.draft.changes);
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual([]);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('HTTP clients reject stale conflict choices and enforce private drafts and revoked membership', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const sameUser = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    let state = await app.read();
    const value = { typeId: state.types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    expect((await app.read(other.request)).draft.changes).toEqual([]);
    app.installation.setIdentity(alex);
    await signIn(sameUser.request, app.installation.origin);
    expect((await app.read(sameUser.request)).draft).toEqual((await app.read()).draft);
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Berg' });
    expect((await app.save(other.request, 'first-conflict')).status()).toBe(200);
    state = await app.read();
    const resolution = {
      version: state.draft.version,
      conflict: {
        kind: 'object',
        id: 'lo',
        current: state.objects.find((object) => object.id === 'lo'),
      },
      choice: 'proposed',
    };
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Ek' });
    expect((await app.save(other.request, 'second-conflict')).status()).toBe(200);
    expect((await app.post(page.request, 'resolve', resolution)).status()).toBe(409);
    expect((await app.read()).draft).toEqual(state.draft);
    state = await app.read();
    const currentResolution = {
      ...resolution,
      conflict: {
        ...resolution.conflict,
        current: state.objects.find((object) => object.id === 'lo'),
      },
    };
    expect(
      (
        await app.post(page.request, 'resolve', { ...currentResolution, choice: 'anything' })
      ).status(),
    ).toBe(400);
    expect((await app.post(sameUser.request, 'resolve', currentResolution)).status()).toBe(200);
    const resolved = (await app.read()).draft;
    for (const [route, body] of [
      ['resolve', currentResolution],
      ['discard', { version: state.draft.version }],
      ['draft', { version: state.draft.version, id: 'lo', baseRevision: 1, value }],
      ['save', { version: state.draft.version, operationId: 'old-approval' }],
    ] as const) {
      expect((await app.post(page.request, route, body)).status()).toBe(409);
      expect((await app.read()).draft).toEqual(resolved);
    }
    const { user: owner } = await (
      await page.request.get(`${app.installation.origin}/api/bootstrap`)
    ).json();
    const privateRead = await (await other.request.get(`${app.path}?userId=${owner.id}`)).json();
    expect(privateRead.draft.changes).toEqual([]);
    expect(
      (
        await app.post(other.request, 'resolve', { ...currentResolution, userId: owner.id })
      ).status(),
    ).toBe(409);
    expect((await app.read()).draft).toEqual(resolved);
    expect((await app.save(page.request, 'fresh-approval')).status()).toBe(200);
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Robin privat' });
    expect(
      (
        await page.request.post(`${app.path.replace('/map', '')}/members/${app.userId}/revoke`, {
          headers: { origin: app.installation.origin },
          data: {},
        })
      ).status(),
    ).toBe(200);
    for (const route of ['draft', 'relationship', 'resolve', 'save', 'discard'])
      expect(
        (
          await app.post(other.request, route, { ...currentResolution, operationId: 'revoked' })
        ).status(),
      ).toBe(403);
    expect((await other.request.get(app.path)).status()).toBe(403);
    expect((await other.request.get(`${app.path}/history`)).status()).toBe(403);
  } finally {
    await sameUser.close();
    await other.close();
    await app.installation.close();
  }
});

test('resolving an object preserves fields changed only by the other user', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    const value = { typeId: state.types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    await app.propose(other.request, 'draft', 'lo', {
      ...value,
      name: 'Lo Exempel',
      description: 'Spelar piano',
    });
    expect((await app.save(other.request, 'description')).status()).toBe(200);
    await page.goto(app.installation.origin);
    await applyProposedConflictChanges(page);
    const review = await openDraftReview(page);
    await expect(review).toContainText('Lo Lind');
    await saveReviewedConflictDraft(page);
    expect((await app.read()).objects.find((object) => object.id === 'lo')).toMatchObject({
      name: 'Lo Lind',
      description: 'Spelar piano',
    });
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('independent users save unrelated objects without a meaningless conflict', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const state = await app.read();
    await app.propose(page.request, 'draft', 'lo', {
      typeId: state.types[0].id,
      name: 'Lo Lind',
      description: '',
    });
    await app.propose(other.request, 'draft', 'service', {
      typeId: state.types[0].id,
      name: 'Ny musiktjänst',
      description: '',
    });
    expect((await app.save(other.request, 'service-change')).status()).toBe(200);
    expect((await app.save(page.request, 'person-change')).status()).toBe(200);
    await app.installation.restart();
    for (const client of [page.request, other.request])
      expect((await app.read(client)).objects.map((object) => object.name)).toEqual([
        'Lo Lind',
        'Ny musiktjänst',
      ]);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-02: a stale discard preserves newer object and relationship proposals', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  const newer = await page.context().newPage();
  try {
    const initial = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await app.propose(page.request, 'draft', 'lo', {
      typeId: initial.types[0].id,
      name: 'Lo Lind',
      description: '',
    });
    await page.goto(app.installation.origin);
    const review = await openDraftReview(page);
    await expect(review).toContainText('Lo Lind');
    await review.getByRole('button', { name: 'Kasta hela utkastet', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Ta bort hela utkastet?', exact: true });
    await expect(
      confirmation.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }),
    ).toBeEnabled();
    await newer.goto(app.installation.origin);
    const relationship = await openObjectRelationships(newer, 'Lo Lind');
    await relationship.getByRole('button', { name: 'Nytt samband', exact: true }).click();
    await relationship.getByLabel('Från objekt').selectOption('lo');
    await relationship
      .getByLabel('Sambandstyp', { exact: true })
      .selectOption(initial.relationshipTypes[0].id);
    await relationship.getByLabel('Till objekt').selectOption('service');
    await stageRelationshipAndClose(newer);
    await expect(await openDraftReview(newer)).toContainText('Lo Lind → Använder → Molnmusik');
    const updated = await app.read();
    await confirmation.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }).click();
    await expect(confirmation.getByRole('alert')).toContainText(
      'Borttagningen kunde inte bekräftas',
    );
    expect((await app.read()).draft).toEqual(updated.draft);
    await expect(
      confirmation.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }),
    ).toBeDisabled();
    await confirmation.getByRole('button', { name: 'Hämta aktuellt utkast', exact: true }).click();
    await expect(confirmation).toContainText('Lo Lind → Använder → Molnmusik');
    await confirmation.getByRole('button', { name: 'Ta bort hela utkastet', exact: true }).click();
    await expect(
      page.getByRole('status', { name: 'Utkastets åtgärdsstatus', exact: true }),
    ).toContainText('Hela ditt utkast har tagits bort');
    await page.reload();
    await expect(await openDraftReview(page)).toContainText('Utkastet är tomt.');
    const discarded = await app.read();
    expect(discarded.draft.changes).toEqual([]);
    expect(discarded.draft.relationships ?? []).toEqual([]);
    expect(discarded.objects).toEqual(initial.objects);
    expect(discarded.relationships).toEqual(initial.relationships);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
  } finally {
    await newer.close();
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-03: a stale conflict choice requires refreshed review before saving', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const { types } = await app.read();
    const value = { typeId: types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Berg' });
    expect((await app.save(other.request, 'first-change')).status()).toBe(200);
    await page.goto(app.installation.origin);
    await openTable(page);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      review.getByRole('button', { name: 'Stäng konfliktdialogen', exact: true }),
    ).toBeEnabled();
    await expect(review).toContainText('Lo Berg');
    const beforeChoice = (await app.read()).draft;
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Ek' });
    expect((await app.save(other.request, 'second-change')).status()).toBe(200);
    await chooseConflictProperties(review, 'proposed');
    await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('Underlaget har ändrats');
    await expect(
      review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
    ).toBeDisabled();
    expect((await app.read()).draft).toEqual(beforeChoice);
    await review.getByRole('button', { name: 'Visa aktuell jämförelse', exact: true }).click();
    await expect(review).toContainText('Lo Ek');
    await expect(review).toContainText('Lo Lind');
    await chooseConflictProperties(review, 'proposed');
    await review.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(review.getByRole('status')).toContainText('Valen finns i ditt utkast');
    expect((await app.read()).objects.find((object) => object.id === 'lo')?.name).toBe('Lo Ek');
    await saveReviewedConflictDraft(page);
    expect((await app.read(other.request)).objects.find((object) => object.id === 'lo')?.name).toBe(
      'Lo Lind',
    );
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-04: accepting a deleted object preserves an independent proposal', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await collaborators(page.request, other.request);
  try {
    const { types } = await app.read();
    await app.propose(page.request, 'draft', 'lo', {
      typeId: types[0].id,
      name: 'Lo Lind',
      description: '',
    });
    await app.propose(page.request, 'draft', 'independent', {
      typeId: types[0].id,
      name: 'Kim Exempel',
      description: '',
    });
    await app.propose(other.request, 'draft', 'lo', null);
    expect((await app.save(other.request, 'delete-lo')).status()).toBe(200);
    await page.goto(app.installation.origin);
    await openTable(page);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(review).toContainText('Objektet är borttaget');
    await expect(
      review.getByRole('region', { name: 'Ditt förslag' }).getByRole('button'),
    ).toHaveCount(0);
    await review
      .getByRole('button', { name: 'Acceptera borttagningen och kasta ditt förslag', exact: true })
      .click();
    await expect(
      review.getByRole('heading', { name: '✓ Ditt ändringsförslag har kastats', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    const draft = await openDraftReview(page);
    await expect(
      draft.getByRole('button', { name: 'Visa förslaget: Lo Lind', exact: true }),
    ).toHaveCount(0);
    await expect(draft).toContainText('Kim Exempel');
    expect((await app.read()).objects.map((object) => object.name)).toEqual(['Molnmusik']);
    await saveReviewedConflictDraft(page);
    await page.reload();
    await openTable(page);
    const objects = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await expect(objects).toContainText('Kim Exempel');
    await expect(objects).toContainText('Molnmusik');
    await expect(objects.getByRole('button', { name: 'Lo Exempel', exact: true })).toHaveCount(0);
    expect((await app.read(other.request)).objects.map((object) => object.name)).toEqual([
      'Kim Exempel',
      'Molnmusik',
    ]);
  } finally {
    await other.close();
    await app.installation.close();
  }
});
