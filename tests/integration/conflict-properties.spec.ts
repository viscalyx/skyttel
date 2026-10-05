import { expect, test } from '@playwright/test';
import { conflictBasis } from '../../src/shared/conflict-properties.js';
import { draftConflicts } from '../../src/shared/draft-conflicts.js';
import { conflictCollaborators } from '../support/conflict-properties.js';

for (const width of [1440, 390])
  test(`UTKAST-28: mix explicit property choices without saving the shared map at ${width}px`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await conflictCollaborators(page.request, other.request);
    try {
      await page.setViewportSize({ width, height: 900 });
      const initial = await app.read();
      await app.propose(page.request, 'draft', 'lo', {
        typeId: initial.types[0].id,
        name: 'Lo Lind',
        description: 'Min anteckning',
        identity: 'unspecified',
        lifecycle: 'active',
      });
      await app.propose(other.request, 'draft', 'lo', {
        typeId: initial.types[0].id,
        name: 'Lo Berg',
        description: 'Robins anteckning',
      });
      expect((await app.save(other.request, 'concurrent')).status()).toBe(200);
      const saved = await app.read();
      await page.goto(app.installation.origin);
      await page
        .getByRole('navigation', { name: 'Kartans verktyg' })
        .getByRole('button', { name: 'Tabell', exact: true })
        .click();
      const opener = page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true });
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      await expect(
        dialog.getByRole('heading', { name: 'Granska konflikter', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(
        true,
      );
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(
        true,
      );
      await expect(dialog).toContainText(
        'Robin sparade ändringar efter att du gjorde ditt förslag, men innan du hann spara det.',
      );
      await expect(
        dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      const conflict = draftConflicts(saved)[0];
      const incomplete = await app.post(page.request, 'resolve', {
        version: saved.draft.version,
        contentVersion: saved.contentVersion,
        conflict,
        basis: conflictBasis(saved, conflict),
        choices: { name: 'proposed' },
      });
      expect(incomplete.status()).toBe(400);
      expect((await app.read()).draft).toEqual(saved.draft);
      await dialog
        .getByRole('button', { name: 'Namn: Ditt förslag – Lo Lind', exact: true })
        .click();
      await expect(
        dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole('button', {
          name: 'Beskrivning: Sparat i kartan nu – Robins anteckning',
          exact: true,
        })
        .click();
      const preview = dialog.getByRole('region', { name: 'Resultat av valen', exact: true });
      await expect(preview).toContainText('Lo Lind');
      await expect(preview).toContainText('Robins anteckning');
      await expect(preview).not.toContainText('Min anteckning');
      await expect(
        dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole('button', {
          name: 'Identifiering: Sparat i kartan nu – Identifierat objekt',
          exact: true,
        })
        .click();
      await dialog
        .getByRole('button', { name: 'Giltighet: Ditt förslag – Gäller fortfarande', exact: true })
        .click();
      await expect(preview).toContainText('Identifierat objekt');
      await expect(preview).toContainText('Gäller fortfarande');
      await page.screenshot({ path: `/tmp/skyttel-244/255-${width}-choices.png` });
      await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
      await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
        'Objekt',
      );
      await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
        'Lo Lind',
      );
      await expect(dialog.locator('.cp-resolved-mark')).toHaveText('✓');
      const after = await app.read();
      expect(after.objects).toEqual(saved.objects);
      expect(after.draft.changes[0].after).toMatchObject({
        name: 'Lo Lind',
        description: 'Robins anteckning',
      });
      expect((await (await page.request.get(`${app.path}/history`)).json()).history).toHaveLength(
        2,
      );
      expect(
        (await (await page.request.get(`${app.path}/history`)).json()).history[1].changes[0],
      ).not.toHaveProperty('proposedAt');
      await page.screenshot({ path: `/tmp/skyttel-244/255-${width}-resolved.png` });
      await page.keyboard.press('Escape');
      await expect(opener).toHaveCount(0);
      await expect(
        page
          .getByRole('navigation', { name: 'Kartans verktyg' })
          .getByRole('button', { name: 'Karta', exact: true }),
      ).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    } finally {
      await other.close();
      await app.installation.close();
    }
  });

test('UTKAST-29: invalid relationship property combinations keep every choice until corrected', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await conflictCollaborators(page.request, other.request);
  try {
    let state = await app.read();
    const edge = {
      typeId: state.relationshipTypes[0].id,
      sourceId: 'lo',
      targetId: 'service',
      knowledge: 'known' as const,
    };
    await app.propose(page.request, 'relationship', 'edge', edge);
    await app.save(page.request, 'base-edge');
    await app.propose(page.request, 'relationship', 'edge', { ...edge, knowledge: 'uncertain' });
    await app.propose(other.request, 'relationship', 'edge', {
      ...edge,
      targetId: null,
      knowledge: 'none',
    });
    await app.save(other.request, 'changed-edge');
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter' });
    await dialog
      .getByRole('button', { name: 'Till objekt: Ditt förslag – Molnmusik', exact: true })
      .click();
    await dialog
      .getByRole('button', {
        name: 'Vad är känt?: Sparat i kartan nu – Uttryckligen inget',
        exact: true,
      })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('målobjektet fungerar inte tillsammans');
    await expect(dialog.getByRole('button', { name: 'Lägg valen i utkastet' })).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: 'Till objekt: Ditt förslag – Molnmusik' }),
    ).toHaveAttribute('aria-pressed', 'true');
    state = await app.read();
    const conflict = draftConflicts(state)[0];
    const invalid = await app.post(page.request, 'resolve', {
      version: state.draft.version,
      contentVersion: state.contentVersion,
      conflict,
      basis: conflictBasis(state, conflict),
      choices: { targetId: 'proposed', knowledge: 'saved' },
    });
    expect(invalid.status()).toBe(400);
    expect((await app.read()).draft).toEqual(state.draft);
    await dialog
      .getByRole('button', { name: 'Vad är känt?: Ditt förslag – Osäkert uppgivet', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Lägg valen i utkastet' }).click();
    await expect(dialog.getByRole('status')).toContainText('Valen finns');
    expect((await app.read()).draft.relationships?.[0].after).toMatchObject({
      targetId: 'service',
      knowledge: 'uncertain',
    });
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-30: a concurrent save rejects an outdated property comparison without changing the draft', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await conflictCollaborators(page.request, other.request);
  try {
    const initial = await app.read();
    const value = { typeId: initial.types[0].id, name: 'Lo Lind', description: '' };
    await app.propose(page.request, 'draft', 'lo', value);
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Berg' });
    await app.save(other.request, 'first');
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter' });
    await dialog.getByRole('button', { name: 'Namn: Ditt förslag – Lo Lind', exact: true }).click();
    const before = await app.read();
    await app.propose(other.request, 'draft', 'lo', { ...value, name: 'Lo Ek' });
    await app.save(other.request, 'second');
    await dialog.getByRole('button', { name: 'Lägg valen i utkastet' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Underlaget har ändrats.');
    expect((await app.read()).draft).toEqual(before.draft);
    await expect(
      dialog.getByRole('button', { name: 'Namn: Ditt förslag – Lo Lind' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Visa aktuell jämförelse' }).click();
    await expect(dialog).toContainText('Lo Ek');
    await expect(dialog.getByRole('button', { name: 'Lägg valen i utkastet' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }),
    ).toBeFocused();
  } finally {
    await other.close();
    await app.installation.close();
  }
});
