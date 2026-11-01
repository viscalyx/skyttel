import { conflictBasis } from '../../src/shared/conflict-properties.js';
import { draftConflicts } from '../../src/shared/draft-conflicts.js';
import {
  readRestoredHousehold,
  saveNativeRestoration,
  stageNativeRestoration,
} from '../support/conflict-definition-restoration-steps.js';
import { expectSavedConflictObject } from '../support/current-conflict-reading.js';
import { openTypeDefinitions } from '../support/domain-work.js';
import {
  readHistoricalDefinitionProposal,
  readIndependentHistoricalProposal,
} from '../support/historical-conflict-reading.js';
import { launchHistoricalPreparation } from '../support/manual-historical-conflicts.js';
import { propertyValues } from '../support/property-controls.js';
import { expect, test } from '../support/test.js';

test('historical preparation launcher preserves authority guards, applied and absent delivery and cleanup', {
  tag: '@technical',
}, async () => {
  test.setTimeout(90_000);
  const preparation = await launchHistoricalPreparation();
  let lastOrigin = '';
  try {
    for (const fixture of [
      'new-missing-object-type',
      'new-missing-relationship-type',
      'new-multiple-blockers',
    ]) {
      await preparation.fresh(fixture);
      const prepared = await preparation.result();
      expect(
        prepared.map.draft.changes.find((change: { id: string }) => change.id === 'independent'),
      ).toBeDefined();
      const relationship = fixture.includes('relationship') || fixture === 'new-multiple-blockers';
      const target = (
        relationship ? prepared.map.draft.relationships : prepared.map.draft.changes
      ).find((change: { id: string }) => change.id === 'private-target');
      expect(propertyValues(target.after)).toEqual(
        relationship
          ? { 'storage-year': 'Våren 2021' }
          : { description: 'Tidigare privat förslag', year: 'Våren 2021' },
      );
      expect(target.after.properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Installationsår', kind: 'text', value: 'Våren 2021' }),
        ]),
      );
      if (fixture === 'new-multiple-blockers')
        expect(prepared.map.objects.some((object: { id: string }) => object.id === 'service')).toBe(
          false,
        );
      expect(await preparation.result()).toEqual(prepared);
    }
    for (const fixture of [
      'new-no-removed-object-definition',
      'new-no-removed-relationship-definition',
    ]) {
      await preparation.fresh(fixture);
      const before = await preparation.result();
      await preparation.command(
        'probe-unavailable-restoration',
        /HTTP 409; both private drafts, shared facts and history unchanged/,
      );
      expect(await preparation.result()).toEqual(before);
    }
    const paired = await preparation.fresh('new-restoration-two');
    const beforeReview = await preparation.result();
    await preparation.command('probe-definition-guards', /Other private owner: HTTP 409/);
    expect(await preparation.result()).toEqual(beforeReview);
    const memberConflict = draftConflicts(beforeReview.map).find(
      (conflict) => conflict.kind === 'objectType',
    );
    if (!memberConflict) throw new Error('Missing launcher conflict');
    await stageNativeRestoration(paired.page, {
      conflict: memberConflict,
      basis: conflictBasis(beforeReview.map, memberConflict),
      command: 'definition-choice',
      definitionChoice: 'proposed',
      version: beforeReview.map.draft.version,
      contentVersion: beforeReview.map.contentVersion,
    });
    const reviewed = await preparation.result();
    const restartedPrivate = await preparation.command('restart', /Restarted:/);
    expect(restartedPrivate).toContain(`Restarted: new-restoration-two, ${paired.origin}`);
    expect(await preparation.result()).toEqual(reviewed);
    await paired.page.reload();
    await expectSavedConflictObject(paired.page, 'Lo Exempel');
    await expectSavedConflictObject(paired.page, 'Molnmusik');
    await openTypeDefinitions(paired.page);
    await paired.page.getByText('Objekttyper', { exact: true }).click();
    await expect(
      paired.page.getByRole('button', { name: 'Ändra typ: Solcellsanläggning', exact: true }),
    ).toHaveCount(0);
    await expect(
      paired.page.getByRole('button', { name: 'Ändra typ: Min privata typbenämning', exact: true }),
    ).toBeVisible();
    await paired.page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
    await readHistoricalDefinitionProposal(paired.page, false);
    await readIndependentHistoricalProposal(paired.page);
    await preparation.command('probe-reused-definition', /Reused comparison: HTTP 409/);
    expect(await preparation.result()).toEqual(reviewed);
    await preparation.command(
      'newer-definition',
      /Deletion while another private restoration remains: HTTP 200; canceled/,
    );
    // Flush the complete command, including the later legitimate definition save.
    const newer = await preparation.result();
    expect(
      newer.map.types.find((type: { id: string }) => type.id === memberConflict.id),
    ).toMatchObject({ name: 'Ny gemensam typbenämning', revision: 4 });
    await preparation.command('try-restoration-save', /Save response: 409/);
    expect(await preparation.result()).toEqual(newer);

    const forged = await preparation.fresh('new-object-restoration');
    await forged.page
      .getByRole('button', { name: '1 konflikt i ditt utkast', exact: true })
      .click();
    const discarded = forged.page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await discarded
      .getByRole('button', { name: 'Typdefinition: Sparat i kartan nu – Borttaget', exact: true })
      .click();
    await discarded.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
    await expect(discarded.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    const beforeForgery = await preparation.result();
    await preparation.command('forge-restoration', /Ordinary creation response: 409/);
    expect(await preparation.result()).toEqual(beforeForgery);

    const imported = await preparation.fresh('new-relationship-restoration');
    const importedBefore = await preparation.result();
    const importedConflict = draftConflicts(importedBefore.map).find(
      (conflict) => conflict.kind === 'relationshipType',
    );
    if (!importedConflict) throw new Error('Missing imported launcher conflict');
    await stageNativeRestoration(imported.page, {
      conflict: importedConflict,
      basis: conflictBasis(importedBefore.map, importedConflict),
      command: 'definition-choice',
      definitionChoice: 'proposed',
      version: importedBefore.map.draft.version,
      contentVersion: importedBefore.map.contentVersion,
    });
    const beforeImport = await preparation.result();
    preparation.child.stdin.write('reimport-restoration\n');
    const afterImport = await preparation.result();
    expect(afterImport.map.contentVersion).toBe(beforeImport.map.contentVersion + 1);
    expect(afterImport.map.draft.relationshipTypes[0].restoration).toBeUndefined();
    await preparation.command('try-restoration-save', /Save response: 409/);
    expect(await preparation.result()).toEqual(afterImport);

    const durable = await preparation.fresh('new-object-restoration');
    const beforeDurable = await preparation.result();
    const durableConflict = draftConflicts(beforeDurable.map).find(
      (conflict) => conflict.kind === 'objectType',
    );
    if (!durableConflict) throw new Error('Missing durable launcher conflict');
    await stageNativeRestoration(durable.page, {
      conflict: durableConflict,
      basis: conflictBasis(beforeDurable.map, durableConflict),
      command: 'definition-choice',
      definitionChoice: 'proposed',
      version: beforeDurable.map.draft.version,
      contentVersion: beforeDurable.map.contentVersion,
    });
    await readHistoricalDefinitionProposal(durable.page, false);
    await readIndependentHistoricalProposal(durable.page);
    const stagedDurable = await preparation.result();
    await saveNativeRestoration(
      durable.page,
      stagedDurable.map,
      async () => (await preparation.result()).history,
    );
    const savedDurable = await preparation.result();
    expect(savedDurable.map.draft.changes).toHaveLength(0);
    expect(savedDurable.map.draft.objectTypes ?? []).toHaveLength(0);
    const restartedSaved = await preparation.command('restart', /Restarted:/);
    expect(restartedSaved).toContain(`Restarted: new-object-restoration, ${durable.origin}`);
    expect(await preparation.result()).toEqual(savedDurable);
    await readRestoredHousehold(durable.page, durable.origin, false);

    for (const delivery of ['lose-applied', 'lose-unsent']) {
      const { page, origin } = await preparation.fresh('new-object-restoration');
      lastOrigin = origin;
      const before = await preparation.result();
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await dialog.getByRole('button', { name: /^Typdefinition: Ditt förslag/ }).click();
      preparation.child.stdin.write(`${delivery}\n`);
      expect(await preparation.result()).toEqual(before);
      await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('Det är oklart');
      const after = await preparation.result();
      expect(after.history).toEqual(before.history);
      if (delivery === 'lose-applied') {
        expect(after.map.draft.version).toBe(before.map.draft.version + 1);
        expect(after.map.draft.objectTypes[0].restoration).toBeDefined();
      } else expect(after).toEqual(before);
      preparation.child.stdin.write('network-ok\n');
      expect(await preparation.result()).toEqual(after);
      await dialog
        .getByRole('button', { name: 'Kontrollera om valet lades i utkastet', exact: true })
        .click();
      await expect(dialog.getByRole('status')).toContainText(
        delivery === 'lose-applied'
          ? 'Valen finns i ditt utkast'
          : 'Kontrollen visar att valet inte lades i utkastet',
      );
    }
  } finally {
    await preparation.close();
  }
  await expect(fetch(lastOrigin)).rejects.toThrow();
});
