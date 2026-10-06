import { expect, test } from '@playwright/test';
import {
  prepareOwnRemovalConflict,
  prepareRelationshipSpecialConflict,
  prepareRemovedObjectConflict,
  saveReviewedConflictDraft,
} from '../support/conflict-special.js';

test('UTKAST-57: accepting a removed object discards only its proposal and preserves the saved removal', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await prepareRemovedObjectConflict(page.request, other.request);
  try {
    const before = await app.read();
    const history = await (await page.request.get(`${app.path}/history`)).json();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(
      dialog.getByText('Objektet togs bort från den gemensamma kartan medan du redigerade det.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.', {
        exact: true,
      }),
    ).toBeVisible();
    const saved = dialog.getByRole('region', { name: 'Sparat i kartan nu', exact: true });
    const proposed = dialog.getByRole('region', { name: 'Ditt förslag', exact: true });
    await expect(saved).toContainText('Borttaget');
    await expect(saved).toContainText('✓ Förvalt');
    await expect(proposed).toContainText('Mitt förslag');
    await expect(proposed.getByRole('button')).toHaveCount(0);
    await expect(
      dialog.getByText('Du behöver inte välja några egenskaper.', { exact: true }),
    ).toBeVisible();
    await expect(dialog.locator('.cp-warning [aria-hidden="true"]')).toHaveText('⚠');
    await expect(saved.locator('.cp-default')).toHaveCSS(
      'box-shadow',
      'rgb(29, 112, 107) 0px 0px 0px 2px inset',
    );
    await expect(saved.locator('.cp-default')).toHaveClass(/cp-overlap/);
    await expect(saved.locator('.cp-default')).toHaveCSS('background-color', 'rgb(255, 242, 214)');
    await expect(proposed.getByText('Mitt förslag', { exact: true }).locator('..')).toHaveClass(
      /cp-overlap/,
    );
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `/tmp/skyttel-244/256-removed-object-${width}.png`,
        fullPage: true,
      });
    }
    await page.keyboard.press('Escape');
    expect((await app.read()).draft).toEqual(before.draft);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Acceptera borttagningen och kasta ditt förslag', exact: true })
      .click();
    await expect(dialog.getByRole('status')).toContainText(
      'Förslaget har tagits bort ur ditt utkast',
    );
    await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
      'Lo Lind',
    );
    await expect(dialog.getByRole('navigation', { name: 'Alla konflikter' })).toContainText(
      'Vald lösning',
    );
    const after = await app.read();
    expect(after.draft.changes).toEqual(
      before.draft.changes.filter((change) => change.id !== 'lo'),
    );
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

for (const [id, kind, title, reason, warning, action] of [
  [
    '58',
    'removed',
    'accepting a removed relationship discards only its proposal without restoring the saved edge',
    'Sambandet togs bort från den gemensamma kartan medan du redigerade det.',
    'Ett ändringsförslag kan inte återställa ett borttaget samband.',
    'Acceptera borttagningen och kasta ditt förslag',
  ],
  [
    '59',
    'duplicate',
    'a duplicate relationship has a readonly comparison and discards only the proposed duplicate',
    'Ett sparat samband har redan samma typ, riktning och objekt.',
    'Sambandet finns redan. Ta bort det föreslagna sambandet ur ditt utkast.',
    'Ta bort sambandet ur ditt utkast',
  ],
  [
    '60',
    'missing-endpoint',
    'a missing endpoint has a readonly comparison and removes only the unusable relationship proposal',
    'Ett objekt som sambandet pekar på saknas.',
    'Sambandet kan inte läggas till eftersom ett objekt som det pekar på saknas.',
    'Ta bort sambandet ur ditt utkast',
  ],
] as const) {
  test(`UTKAST-${id}: ${title}`, async ({ page, browser }) => {
    const other = await browser.newContext();
    const app = await prepareRelationshipSpecialConflict(page.request, other.request, kind);
    try {
      const before = await app.read();
      const history = await (await page.request.get(`${app.path}/history`)).json();
      await page.goto(app.installation.origin);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
      const proposal = before.draft.relationships?.find((change) => change.id === 'mine');
      if (!proposal) throw new Error('Missing relationship fixture proposal');
      const retainedName = `Lo Exempel → ${proposal.type.forwardLabel ?? proposal.type.name} → Molnmusik (Osäkert uppgivet)`;
      await expect(dialog.getByRole('heading', { name: retainedName, exact: true })).toBeVisible();
      await expect(
        dialog
          .getByRole('navigation', { name: 'Alla konflikter', exact: true })
          .getByRole('button'),
      ).toContainText(retainedName);
      await expect(dialog.getByText(reason, { exact: true })).toBeVisible();
      await expect(dialog.getByText(warning, { exact: true })).toBeVisible();
      for (const name of ['Sparat i kartan nu', 'Ditt förslag']) {
        const side = dialog.getByRole('region', { name, exact: true });
        await expect(side.getByRole('button')).toHaveCount(0);
      }
      await expect(dialog.getByRole('region', { name: 'Ditt förslag', exact: true })).toContainText(
        'Osäkert uppgivet',
      );
      await expect(dialog.getByRole('region', { name: 'Resultat av valen' })).toContainText(
        '✓ Förvalt',
      );
      await page.keyboard.press('Escape');
      expect((await app.read()).draft).toEqual(before.draft);
      await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
      await dialog.getByRole('button', { name: action, exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText(
        'Förslaget har tagits bort ur ditt utkast',
      );
      const after = await app.read();
      expect(after.draft.relationships ?? []).toEqual([]);
      expect(after.draft.changes).toEqual(before.draft.changes);
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}

test('UTKAST-61: an own removal is explicitly rebased against changed saved facts before a separate save', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await prepareOwnRemovalConflict(page.request, other.request);
  try {
    const before = await app.read();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(dialog).toContainText(
      'Du föreslår borttagning. Robin sparade ändringar i objektet innan du hann spara ditt förslag.',
    );
    await expect(dialog.getByRole('region', { name: 'Sparat i kartan nu' })).toContainText(
      'Nya sparade fakta',
    );
    await expect(dialog.getByRole('region', { name: 'Sparat i kartan nu' })).toContainText(
      'Robin sparade ett nytt värde efter att du började ändra den här uppgiften.',
    );
    const apply = dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
    await expect(apply).toBeDisabled();
    await dialog
      .getByRole('button', { name: 'Objekt: Ditt förslag – Föreslagen borttagning', exact: true })
      .click();
    await expect(dialog.getByRole('region', { name: 'Resultat av valen' })).toContainText(
      'Föreslagen borttagning',
    );
    await apply.click();
    await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
    const after = await app.read();
    expect(after.objects).toEqual(before.objects);
    expect(after.draft.changes.find((change) => change.id === 'lo')).toMatchObject({
      before: before.objects.find((object) => object.id === 'lo'),
      after: null,
    });
    expect(after.draft.changes.find((change) => change.id === 'independent')).toEqual(
      before.draft.changes.find((change) => change.id === 'independent'),
    );
    await saveReviewedConflictDraft(page);
    expect((await app.read()).objects.some((object) => object.id === 'lo')).toBe(false);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

test('UTKAST-62: object and new connection removal choices remain independent and reject an invalid combination', async ({
  page,
  browser,
}) => {
  const other = await browser.newContext();
  const app = await prepareOwnRemovalConflict(page.request, other.request, true);
  try {
    const before = await app.read();
    await page.goto(app.installation.origin);
    await page.getByRole('button', { name: '1 konflikt i ditt utkast', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect(dialog).toContainText(
      'Du föreslår borttagning. Ytterligare ett sparat samband berör nu objektet.',
    );
    const apply = dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true });
    await dialog
      .getByRole('button', { name: 'Objekt: Ditt förslag – Föreslagen borttagning', exact: true })
      .click();
    const savedEdge = dialog
      .getByRole('region', { name: 'Sparat i kartan nu' })
      .getByRole('button', { name: /^Samband:/ });
    await savedEdge.click();
    await expect(dialog.getByRole('alert')).toContainText(
      'Objektet kan inte tas bort medan sambandet till det finns kvar. Välj att ta bort sambandet eller behåll objektet.',
    );
    await expect(apply).toBeDisabled();
    expect((await app.read()).draft).toEqual(before.draft);
    await dialog
      .getByRole('region', { name: 'Sparat i kartan nu' })
      .getByRole('button', { name: /^Objekt:/ })
      .click();
    await dialog
      .getByRole('button', {
        name: 'Samband: Ditt förslag – Föreslagen borttagning av sambandet',
        exact: true,
      })
      .click();
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
    const after = await app.read();
    expect(after.objects).toEqual(before.objects);
    expect(after.relationships).toEqual(before.relationships);
    expect(after.draft.changes).toEqual(
      before.draft.changes.filter((change) => change.id !== 'lo'),
    );
    expect(after.draft.relationships).toEqual([
      expect.objectContaining({ id: 'new-edge', before: before.relationships[0], after: null }),
    ]);
    await saveReviewedConflictDraft(page);
    expect((await app.read()).objects.find((object) => object.id === 'lo')).toEqual(
      before.objects.find((object) => object.id === 'lo'),
    );
    expect((await app.read()).relationships).toEqual([]);
  } finally {
    await other.close();
    await app.installation.close();
  }
});

for (const surface of ['Karta', 'Tabell'] as const) {
  test(`UTKAST-63: a lost reply verifies retained object and connection removals without replay in ${surface}`, async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext();
    const app = await prepareOwnRemovalConflict(page.request, other.request, true);
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
      await dialog
        .getByRole('button', { name: 'Objekt: Ditt förslag – Föreslagen borttagning', exact: true })
        .click();
      await dialog
        .getByRole('button', {
          name: 'Samband: Ditt förslag – Föreslagen borttagning av sambandet',
          exact: true,
        })
        .click();
      await dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('Det är oklart');
      await page.keyboard.press('Escape');
      await opener.click();
      await expect(opener).toHaveCount(0);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Visa konfliktvalet', exact: true }).click();
      await expect(
        dialog.getByRole('button', { name: 'Lägg valen i utkastet', exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole('button', { name: 'Kontrollera om valet lades i utkastet', exact: true })
        .click();
      await expect(dialog.getByRole('status')).toContainText('Valen finns i ditt utkast');
      await expect(dialog.getByRole('region', { name: 'Resultat av valen' })).toHaveCount(0);
      await expect(dialog.locator('.cp-preview')).toContainText(
        'Föreslagen borttagning av sambandet',
      );
      expect(submitted).toBe(1);
      const after = await app.read();
      expect(after.draft.version).toBe(before.draft.version + 1);
      expect(after.draft.changes.find((change) => change.id === 'lo')).toMatchObject({
        before: before.objects.find((object) => object.id === 'lo'),
        after: null,
      });
      expect(after.draft.relationships).toEqual([
        expect.objectContaining({ id: 'new-edge', before: before.relationships[0], after: null }),
      ]);
      expect(after.objects).toEqual(before.objects);
      expect(after.relationships).toEqual(before.relationships);
      expect(await (await page.request.get(`${app.path}/history`)).json()).toEqual(history);
    } finally {
      await other.close();
      await app.installation.close();
    }
  });
}
