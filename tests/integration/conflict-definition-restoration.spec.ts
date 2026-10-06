import { expect, test } from '@playwright/test';
import { conflictBasis } from '../../src/shared/conflict-properties.js';
import { draftConflicts } from '../../src/shared/draft-conflicts.js';
import {
  downloadConflictArchive,
  importConflictArchive,
  prepareArchiveConflict,
} from '../support/conflict-archive.js';
import { applyProposedConflictChanges } from '../support/conflict-properties.js';
import { saveReviewedConflictDraft } from '../support/conflict-special.js';

for (const kind of ['object', 'relationship'] as const)
  test(`UTKAST-76: a retained ${kind} definition without an actual removed revision can be explicitly discarded without granting restoration`, async ({
    page,
    browser,
  }) => {
    const administrator = await browser.newContext();
    const app = await prepareArchiveConflict(
      administrator.request,
      page.request,
      kind === 'object' ? 'missing-object-definition' : 'missing-relationship-definition',
    );
    try {
      const before = await app.read();
      const history = await (await page.request.get(`${app.path}/history`)).json();
      const conflict = draftConflicts(before).find(
        (conflict) => conflict.kind === (kind === 'object' ? 'objectType' : 'relationshipType'),
      );
      if (!conflict) throw new Error('Missing retained definition');
      expect(before.removedDefinitions).toBeUndefined();
      expect(
        (
          await app.post(page.request, 'resolve', {
            conflict,
            command: 'definition-choice',
            definitionChoice: 'proposed',
            basis: conflictBasis(before, conflict),
            version: before.draft.version,
            contentVersion: before.contentVersion,
          })
        ).status(),
      ).toBe(409);
      expect((await app.read()).draft).toEqual(before.draft);
      await page.goto(app.installation.origin);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      const proposed = dialog
        .getByRole('region', { name: 'Ditt förslag', exact: true })
        .getByRole('button');
      await expect(proposed).toContainText('Min privata typbenämning');
      await expect(proposed).toBeDisabled();
      await expect(dialog).toContainText(
        'Typdefinitionen kan inte återställas med det aktuella underlaget.',
      );
      await dialog
        .getByRole('region', { name: 'Sparat i kartan nu', exact: true })
        .getByRole('button', { name: 'Typdefinition: Sparat i kartan nu – Borttaget', exact: true })
        .click();
      await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText(
        'Förslaget har tagits bort ur ditt utkast',
      );
      const after = await app.read();
      expect(after.draft.version).toBe(before.draft.version + 1);
      expect(after.draft[kind === 'object' ? 'objectTypes' : 'relationshipTypes'] ?? []).toEqual(
        [],
      );
      expect(after.draft.changes).toEqual(before.draft.changes);
      expect(after.objects).toEqual(before.objects);
      expect(after.types).toEqual(before.types);
      expect(after.relationshipTypes).toEqual(before.relationshipTypes);
      expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    } finally {
      await administrator.close();
      await app.installation.close();
    }
  });

for (const kind of ['object', 'relationship'] as const)
  test(`UTKAST-67: an explicitly reviewed removed ${kind} definition restores its historical identity only on a separate save`, async ({
    page,
    browser,
  }) => {
    const administrator = await browser.newContext();
    const app = await prepareArchiveConflict(
      administrator.request,
      page.request,
      kind === 'object' ? 'removed-object-definition' : 'removed-relationship-definition',
    );
    try {
      const before = await app.read();
      const history = await (await page.request.get(`${app.path}/history`)).json();
      await page.goto(app.installation.origin);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(dialog).toContainText(
        'Typdefinitionen saknas nu i kartan. Ditt förslag innehåller ändringar i den.',
      );
      const saved = dialog.getByRole('region', { name: 'Sparat i kartan nu', exact: true });
      const proposed = dialog.getByRole('region', { name: 'Ditt förslag', exact: true });
      await expect(
        saved.getByRole('button', {
          name: 'Typdefinition: Sparat i kartan nu – Borttaget',
          exact: true,
        }),
      ).toBeEnabled();
      await expect(proposed).toContainText('Min privata typbenämning');
      await expect(proposed).toContainText('Min tidigare definition');
      if (kind === 'object') {
        await expect(proposed).toContainText('Eget fält: Installationsår');
        await expect(proposed).toContainText('Text · Egna fält');
      } else {
        await expect(proposed).toContainText('Framåtriktning: förvaras i');
        await expect(proposed).toContainText('Omvänd riktning: förvarar');
      }
      const apply = dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
      await expect(apply).toBeDisabled();
      await expect(dialog).toContainText('1 av 1 egenskaper återstår att välja.');
      await expect(
        dialog.getByRole('region', { name: 'Resultat av valen', exact: true }),
      ).toContainText('Välj ett värde');
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `/tmp/skyttel-244/256-${kind}-definition-default-${width}.png`,
          fullPage: true,
        });
      }
      await page.keyboard.press('Escape');
      expect((await app.read()).draft).toEqual(before.draft);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      await proposed.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
      await expect(
        dialog.getByRole('region', { name: 'Resultat av valen', exact: true }),
      ).toContainText('Typdefinitionen föreslås återställas med din ändring.');
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({
          path: `/tmp/skyttel-244/256-${kind}-definition-selected-${width}.png`,
          fullPage: true,
        });
      }
      await apply.click();
      await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
      const after = await app.read();
      const change = (
        kind === 'object' ? after.draft.objectTypes : after.draft.relationshipTypes
      )?.find((change) => change.id === app.typeId);
      expect(change).toMatchObject({
        before: null,
        after: { id: app.typeId, revision: 3, name: 'Min privata typbenämning' },
      });
      expect(kind === 'object' ? after.types : after.relationshipTypes).toEqual(
        kind === 'object' ? before.types : before.relationshipTypes,
      );
      expect(after.draft.changes).toEqual(before.draft.changes);
      expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
      await saveReviewedConflictDraft(page);
      const savedState = await app.read();
      expect(
        (kind === 'object' ? savedState.types : savedState.relationshipTypes).find(
          (type) => type.id === app.typeId,
        ),
      ).toMatchObject({
        revision: 3,
        name: 'Min privata typbenämning',
        description: 'Min tidigare definition',
      });
      const receipts = await (await page.request.get(`${app.path}/history`)).json();
      expect(JSON.stringify(receipts)).not.toContain('restoration');
      expect(
        receipts.history[0][kind === 'object' ? 'objectTypes' : 'relationshipTypes'][0],
      ).not.toHaveProperty('restoration');
      expect(savedState.objects.find((object) => object.id === 'independent')).toBeDefined();
    } finally {
      await administrator.close();
      await app.installation.close();
    }
  });

test('UTKAST-68: a newer saved definition rejects stale restoration atomically and preserves independent proposals', async ({
  page,
  browser,
}) => {
  const administrator = await browser.newContext();
  const app = await prepareArchiveConflict(
    administrator.request,
    page.request,
    'removed-object-definition',
    { administratorDefinitionProposal: true },
  );
  try {
    const original = await app.read();
    const conflict = draftConflicts(original).find((conflict) => conflict.kind === 'objectType');
    if (!conflict) throw new Error('Missing fixture conflict');
    const review = {
      conflict,
      basis: conflictBasis(original, conflict),
      command: 'definition-choice',
      definitionChoice: 'proposed',
      version: original.draft.version,
      contentVersion: original.contentVersion,
    };
    expect((await app.post(page.request, 'resolve', { ...review, basis: {} })).status()).toBe(409);
    expect((await app.post(administrator.request, 'resolve', review)).status()).toBe(409);
    expect((await app.read()).draft).toEqual(original.draft);
    expect((await app.post(page.request, 'resolve', review)).status()).toBe(200);
    const privateRestoration = await app.read();
    expect((await app.post(page.request, 'resolve', review)).status()).toBe(409);
    const administratorState = await app.administratorRead();
    const administratorConflict = draftConflicts(administratorState).find(
      (conflict) => conflict.kind === 'objectType',
    );
    if (!administratorConflict) throw new Error('Missing administrator fixture conflict');
    expect(
      (
        await app.post(administrator.request, 'resolve', {
          conflict: administratorConflict,
          basis: conflictBasis(administratorState, administratorConflict),
          command: 'definition-choice',
          definitionChoice: 'proposed',
          version: administratorState.draft.version,
          contentVersion: administratorState.contentVersion,
        })
      ).status(),
    ).toBe(200);
    expect((await app.save(administrator.request, 'other-restoration')).status()).toBe(200);
    const active = (await app.administratorRead()).types.find((type) => type.id === app.typeId);
    if (!active) throw new Error('Missing restored definition');
    expect(
      (
        await app.post(administrator.request, 'object-type', {
          version: (await app.administratorRead()).draft.version,
          contentVersion: original.contentVersion,
          id: active.id,
          baseRevision: active.revision,
          value: null,
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await app.post(administrator.request, 'object-type', {
          version: (await app.administratorRead()).draft.version,
          contentVersion: original.contentVersion,
          id: active.id,
          baseRevision: active.revision,
          value: {
            name: 'Ny gemensam typbenämning',
            description: active.description,
            fields: active.fields ?? [],
          },
        })
      ).status(),
    ).toBe(200);
    expect((await app.save(administrator.request, 'newer-active-definition')).status()).toBe(200);
    const beforeRejectedSave = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    expect((await app.save(page.request, 'stale-restoration')).status()).toBe(409);
    const after = await app.read();
    expect(after.draft).toEqual(privateRestoration.draft);
    expect(after.objects).toEqual(beforeRejectedSave.objects);
    expect(after.types).toEqual(beforeRejectedSave.types);
    expect(after.objects.some((object) => object.id === 'independent')).toBe(false);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    expect(after.types.find((type) => type.id === app.typeId)?.revision).toBe(4);
    await page.goto(app.installation.origin);
    await applyProposedConflictChanges(page);
    expect((await app.read()).draft.objectTypes?.[0].after?.revision).toBe(5);
    expect((await app.read()).draft.objectTypes?.[0].restoration).toBeUndefined();
    await saveReviewedConflictDraft(page);
    expect((await app.read()).types.find((type) => type.id === app.typeId)?.revision).toBe(5);
  } finally {
    await administrator.close();
    await app.installation.close();
  }
});

test('UTKAST-69: importing a private restoration requires a fresh explicit review in the replacement generation', async ({
  page,
  browser,
}) => {
  const administrator = await browser.newContext();
  const app = await prepareArchiveConflict(
    administrator.request,
    page.request,
    'removed-relationship-definition',
  );
  try {
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await dialog.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
    await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
    const before = await app.read();
    const authority = before.draft.relationshipTypes?.[0].restoration;
    expect(authority?.contentVersion).toBe(before.contentVersion);
    const archive = await downloadConflictArchive(app, administrator.request);
    expect(
      archive.content.drafts.find((draft) => draft.userId === before.userId)?.relationshipTypes[0]
        .restoration,
    ).toEqual(authority);
    await importConflictArchive(app, administrator.request, archive);
    const afterImport = await app.read();
    expect(afterImport.contentVersion).toBe(before.contentVersion + 1);
    expect(afterImport.draft.relationshipTypes?.[0].restoration).toBeUndefined();
    expect(afterImport.draft.relationshipTypes?.[0].before).toEqual(authority?.definition);
    expect(afterImport.draft.changes).toEqual(before.draft.changes);
    expect((await app.save(page.request, 'unreviewed-import')).status()).toBe(409);
    expect((await app.read()).draft).toEqual(afterImport.draft);
    await page.reload();
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await dialog.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
    await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
    expect((await app.read()).draft.relationshipTypes?.[0].restoration?.contentVersion).toBe(
      afterImport.contentVersion,
    );
    await saveReviewedConflictDraft(page);
    expect(
      (await app.read()).relationshipTypes.find((type) => type.id === app.typeId)?.revision,
    ).toBe(3);
  } finally {
    await administrator.close();
    await app.installation.close();
  }
});

for (const surface of ['Karta', 'Tabell'])
  test(`UTKAST-70: a lost definition restoration reply verifies its private authority without replay in ${surface}`, async ({
    page,
    browser,
  }) => {
    const administrator = await browser.newContext();
    const app = await prepareArchiveConflict(
      administrator.request,
      page.request,
      'removed-object-definition',
    );
    try {
      await page.setViewportSize({ width: 320, height: 900 });
      const before = await app.read();
      const history = await (await page.request.get(`${app.path}/history`)).json();
      let submitted = 0;
      await page.route('**/map/resolve', async (route) => {
        submitted++;
        await route.fetch();
        await route.abort();
      });
      await page.goto(app.installation.origin);
      if (surface === 'Tabell')
        await page
          .getByRole('navigation', { name: 'Kartans verktyg' })
          .getByRole('button', { name: 'Tabell', exact: true })
          .click();
      const opener = page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true });
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await dialog.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
      await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('Det är oklart');
      await page.keyboard.press('Escape');
      await opener.click();
      await expect(opener).toHaveCount(0);
      await page.keyboard.press('Escape');
      const followUp = page.getByRole('button', { name: 'Visa konfliktvalet', exact: true });
      await followUp.click();
      await expect(
        dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole('button', { name: 'Kontrollera om valet lades i utkastet', exact: true })
        .click();
      await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
      expect(submitted).toBe(1);
      const after = await app.read();
      expect(after.draft.objectTypes?.[0]).toMatchObject({
        before: null,
        after: { id: app.typeId, revision: 3 },
        restoration: {
          contentVersion: before.contentVersion,
          definition: before.removedDefinitions?.objectTypes[0],
        },
      });
      expect(after.types).toEqual(before.types);
      expect(after.draft.changes).toEqual(before.draft.changes);
      expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
      await page.keyboard.press('Escape');
      await expect(page.locator(':focus')).toBeVisible();
      expect(await page.locator(':focus').evaluate((element) => element.tagName)).not.toBe('BODY');
    } finally {
      await administrator.close();
      await app.installation.close();
    }
  });

test('UTKAST-71: ordinary definition creation cannot reuse a removed identity or grant forged restoration authority', async ({
  page,
  browser,
}) => {
  const administrator = await browser.newContext();
  const app = await prepareArchiveConflict(
    administrator.request,
    page.request,
    'removed-object-definition',
  );
  try {
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await dialog
      .getByRole('button', { name: 'Typdefinition: Sparat i kartan nu – Borttaget', exact: true })
      .click();
    await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    await expect(
      dialog.getByRole('heading', { name: '✓ Typdefinitionen förblir borttagen', exact: true }),
    ).toBeVisible();
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    expect(before.draft.objectTypes ?? []).toEqual([]);
    const rejected = await app.post(page.request, 'object-type', {
      id: app.typeId,
      version: before.draft.version,
      contentVersion: before.contentVersion,
      baseRevision: null,
      value: { name: 'Förfalskat återställningsförslag', description: '', fields: [] },
      restoration: { contentVersion: before.contentVersion, definition: app.historicalType },
    });
    expect(rejected.status()).toBe(409);
    const after = await app.read();
    expect(after.draft).toEqual(before.draft);
    expect(after.types).toEqual(before.types);
    expect(after.objects).toEqual(before.objects);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
  } finally {
    await administrator.close();
    await app.installation.close();
  }
});
