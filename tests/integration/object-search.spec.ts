import { expect, test } from '@playwright/test';
import { prepareHouseholdTable } from '../support/household-table.js';
import { createInstallation } from '../support/installation.js';
import { prepareObjectSearch } from '../support/object-search.js';

test('SÖK-01: own detail fields, every word and Swedish normalization find objects', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read } = await prepareObjectSearch(page.request, installation.origin);
    const before = await read();
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    const search = table.getByRole('searchbox', { name: 'Sök objekt i tabellen' });
    await search.fill('399 EGEN');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'A 2', exact: true })).toBeVisible();
    await expect(table.getByText('Träff i Egen anteckning, Pris', { exact: true })).toBeVisible();
    await search.fill('299 egen');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'A 2', exact: true })).toBeVisible();
    await search.fill('anteck elan öv');
    await expect(table.getByRole('rowheader')).toHaveCount(0);
    await search.fill('anteck e\u0301lan o\u0308v');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'Övrigt Élan', exact: true })).toBeVisible();
    await search.fill('Endast i sambandet');
    await expect(table.getByRole('rowheader')).toHaveCount(0);
    await search.fill('Övrigt Élan');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'A 2', exact: true })).toHaveCount(0);
    await search.fill('ake');
    await expect(table.getByRole('rowheader')).toHaveCount(0);
    await expect(search).toBeFocused();
    await expect(table.getByRole('heading', { name: 'Inga objekt matchar' })).toBeVisible();
    await table.getByRole('button', { name: 'Återställ sökning och filter', exact: true }).click();
    await expect(search).toHaveValue('');
    await search.fill('åke beskrivning');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'Åke', exact: true })).toBeVisible();
    expect(await read()).toEqual(before);
  } finally {
    await installation.close();
  }
});

test('SÖK-04: the last proposal resets only draft filters in both views and type-only proposals expose them', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { post, read } = await prepareHouseholdTable(page.request, installation.origin);
    await page.goto(installation.origin);
    const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
    await tools.getByRole('button', { name: 'Sök i kartan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Kartans sökning och filter' });
    await panel.getByRole('searchbox').fill('A 2');
    await panel.getByLabel('Typ 2', { exact: true }).check();
    await panel.getByLabel('Ändrat', { exact: true }).check();
    await page.keyboard.press('Escape');
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('searchbox').fill('prov');
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Filter i tabellen' });
    await filters.getByLabel('Typ 2', { exact: true }).check();
    await filters.getByLabel('Nytt', { exact: true }).check();
    await page.keyboard.press('Escape');
    await tools.getByRole('button', { name: /Ditt utkast|Utkast och historik/ }).click();
    await page.getByRole('button', { name: 'Kasta hela utkastet', exact: true }).click();
    await expect.poll(async () => (await read()).draft.changes.length).toBe(0);
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    await expect(table.getByRole('searchbox')).toHaveValue('prov');
    await expect(
      table.getByText('0 träffar · Utkastfiltret är återställt eftersom ditt utkast är tomt.', {
        exact: true,
      }),
    ).toBeVisible();
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    await expect(filters.getByLabel('Typ 2', { exact: true })).toBeChecked();
    await expect(filters.getByRole('group', { name: 'Förslag i ditt utkast' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await tools.getByRole('button', { name: 'Sök i kartan · aktiv', exact: true }).click();
    await expect(panel.getByRole('searchbox')).toHaveValue('A 2');
    await expect(panel.getByLabel('Typ 2', { exact: true })).toBeChecked();
    await expect(panel.getByRole('group', { name: 'Förslag i ditt utkast' })).toHaveCount(0);
    await post('object-type', {
      id: 'only-type',
      baseRevision: null,
      value: { name: 'Enbart typförslag', description: '', fields: [] },
    });
    await page.reload();
    await tools.getByRole('button', { name: 'Sök i kartan', exact: true }).click();
    await panel.getByRole('searchbox').fill('finns inte');
    await expect(panel.getByRole('group', { name: 'Förslag i ditt utkast' })).toBeVisible();
    await expect(panel.getByText('0 sökträffar', { exact: true })).toBeVisible();
  } finally {
    await installation.close();
  }
});

test('SÖK-05: mobile search and native filter dialog provide touch entry and preserve restrictions', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await prepareHouseholdTable(page.request, installation.origin);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(installation.origin);
    const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
    await tools.getByRole('button', { name: 'Visa verktygens namn' }).click();
    await tools.getByRole('button', { name: 'Sök i kartan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Kartans sökning och filter' });
    await expect(panel.getByRole('searchbox')).toBeFocused();
    await expect(panel.getByLabel('Ta med upphörda')).toBeVisible();
    await panel.getByRole('searchbox').fill('prov');
    await panel.getByLabel('Ta med upphörda').check();
    await panel.getByRole('button', { name: 'Stäng', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Kartans sökresultat' })).toContainText(
      'Sökning: prov · Ta med upphörda',
    );
    await tools.getByRole('button', { name: 'Visa verktygens namn' }).click();
    await expect(tools.getByRole('button', { name: 'Sök i kartan · aktiv' })).toBeVisible();
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('searchbox').fill('399 egen');
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Filter i tabellen' });
    await expect(filters.getByRole('heading')).toBeFocused();
    await filters.getByLabel('Typ 2', { exact: true }).check();
    await filters.getByRole('button', { name: 'Stäng filter' }).click();
    await expect(table.getByRole('searchbox')).toHaveValue('399 egen');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    const box = await table.getByRole('searchbox').boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  } finally {
    await installation.close();
  }
});

test('SÖK-02: multiple filters combine independently and keep proposals distinct from lifecycle', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await prepareHouseholdTable(page.request, installation.origin);
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Tabell', exact: true }).click();
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('button', { name: 'Filter', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Filter i tabellen' });
    await filters.getByLabel('Typ 2', { exact: true }).check();
    await filters.getByLabel('Typ 10', { exact: true }).check();
    await filters.getByLabel('Nytt', { exact: true }).check();
    await filters.getByLabel('Ändrat', { exact: true }).check();
    await page.keyboard.press('Escape');
    await expect(table.getByRole('rowheader')).toHaveCount(2);
    await expect(table.getByRole('button', { name: 'A 2', exact: true })).toBeVisible();
    await expect(table.getByRole('button', { name: 'Nytt prov', exact: true })).toBeVisible();
    await table.getByRole('button', { name: 'A 2', exact: true }).click();
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    await filters.getByLabel('Bara markerade').check();
    await page.keyboard.press('Escape');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    await filters.getByRole('button', { name: 'Återställ sökning och filter' }).click();
    await filters.getByLabel('Föreslagen borttagning', { exact: true }).check();
    await expect(table.getByRole('rowheader')).toHaveCount(0);
    await expect(filters.getByRole('group', { name: 'Förslag i ditt utkast' })).toBeVisible();
    await filters.getByLabel('Ta med upphörda').check();
    await page.keyboard.press('Escape');
    await expect(table.getByRole('rowheader')).toHaveCount(1);
    await expect(table.getByRole('button', { name: 'Tas bort prov', exact: true })).toBeVisible();
    await table.getByRole('button', { name: 'Filter · aktiva', exact: true }).click();
    await filters.getByLabel('Föreslagen borttagning', { exact: true }).uncheck();
    await filters.getByLabel('Ta med borttagna').check();
    await page.keyboard.press('Escape');
    await table.getByRole('searchbox').fill('borttaget');
    await expect(table.getByRole('button', { name: 'Borttaget prov', exact: true })).toBeVisible();
  } finally {
    await installation.close();
  }
});

test('SÖK-03: map-only character and composition entry preserve separate searches and Escape restrictions', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    const { read } = await prepareHouseholdTable(page.request, installation.origin);
    const before = await read();
    await page.goto(installation.origin);
    const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
    await tools.getByRole('button', { name: 'Sök i kartan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Kartans sökning och filter' });
    const mapSearch = panel.getByRole('searchbox');
    await expect(mapSearch).toBeFocused();
    await expect(panel.getByRole('button', { name: 'Filter', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await mapSearch.fill('299 EGEN');
    await expect(panel.getByText('1 sökträffar', { exact: true })).toBeVisible();
    await expect(panel.getByRole('list', { name: 'Matchande detaljfält' })).toContainText(
      'A 2: träff i Egen anteckning, Pris',
    );
    await panel.getByLabel('Typ 10', { exact: true }).check();
    await mapSearch.fill('A 10');
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    await expect(tools.getByRole('button', { name: 'Sök i kartan · aktiv' })).toBeFocused();
    await expect(page.getByRole('complementary', { name: 'Kartans sökresultat' })).toContainText(
      'Typ 10',
    );
    await tools.getByRole('button', { name: 'Sök i kartan · aktiv' }).click();
    await expect(mapSearch).toHaveValue('A 10');
    await page.keyboard.press('Escape');
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    const tableSearch = page.getByRole('searchbox', { name: 'Sök objekt i tabellen' });
    const table = page.getByRole('region', { name: 'Hushållets tabell', exact: true });
    await table.getByRole('button', { name: 'A 2', exact: true }).click();
    await expect(table.getByText('✓ Markerad', { exact: true })).toBeVisible();
    await tableSearch.fill('åke');
    await page.keyboard.type('x');
    await expect(tableSearch).toHaveValue('åkex');
    await tools.getByRole('button', { name: 'Karta', exact: true }).click();
    const canvas = page.getByRole('img', {
      name: 'Rymdens bakgrund. Välj innehåll med etiketterna eller listan.',
    });
    await canvas.focus();
    await canvas.dispatchEvent('keydown', { key: 'ö' });
    await expect(mapSearch).toHaveValue('ö');
    await expect(mapSearch).toBeFocused();
    await expect(panel.getByRole('button', { name: 'Filter', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await panel.getByRole('button', { name: 'Filter', exact: true }).click();
    await expect(panel.getByLabel('Typ 10', { exact: true })).toBeChecked();
    await page.keyboard.press('Escape');
    await canvas.focus();
    await canvas.dispatchEvent('keydown', { key: 'Process', isComposing: true });
    await expect(panel).not.toBeVisible();
    await canvas.evaluate((element) => {
      element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      element.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: 'a\u030a' }),
      );
    });
    await expect(mapSearch).toHaveValue('å');
    await page.keyboard.press('Escape');
    await canvas.focus();
    await page.keyboard.press('Control+f');
    await expect(panel).not.toBeVisible();
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    await expect(tableSearch).toHaveValue('åkex');
    await tools.getByRole('button', { name: 'Karta', exact: true }).click();
    await tools.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    const objectName = page.getByLabel('Objektets namn', { exact: true });
    await objectName.pressSequentially('Ö Testnamn 123');
    await expect(objectName).toHaveValue('Ö Testnamn 123');
    await expect(objectName).toBeFocused();
    await expect(panel).not.toBeVisible();
    await page.getByRole('button', { name: 'Stäng utan att skicka texten', exact: true }).click();
    await tools.getByRole('button', { name: 'Skriv till Skyttel', exact: true }).click();
    const message = page.getByRole('textbox', { name: 'Meddelande till Skyttel', exact: true });
    await message.pressSequentially('Å Oskickat meddelande 456');
    await expect(message).toHaveValue('Å Oskickat meddelande 456');
    await expect(message).toBeFocused();
    await expect(panel).not.toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Stäng textvyn', exact: true }).click();
    await tools.getByRole('button', { name: 'Sök i kartan · aktiv', exact: true }).click();
    await expect(mapSearch).toHaveValue('å');
    await expect(panel.getByLabel('Typ 10', { exact: true })).toBeChecked();
    await expect(panel.getByLabel('Bara markerade (1)', { exact: true })).not.toBeChecked();
    await panel.getByRole('button', { name: 'Rensa sökning', exact: true }).click();
    await expect(mapSearch).toHaveValue('');
    await expect(panel.getByLabel('Typ 10', { exact: true })).toBeChecked();
    await expect(panel.getByLabel('Bara markerade (1)', { exact: true })).not.toBeChecked();

    // Observe the public live region through actual timer delays and rapid UI edits.
    const announcements = page.locator('.map-search-status').getByRole('status');
    await mapSearch.fill('Örn');
    await expect(announcements).toHaveText('1 träffar.');
    const observed = await announcements.evaluateHandle((element) => {
      const messages: string[] = [];
      const observer = new MutationObserver(() => {
        if (element.textContent) messages.push(element.textContent);
      });
      observer.observe(element, { subtree: true, childList: true, characterData: true });
      return { messages, observer };
    });
    try {
      await mapSearch.fill('');
      await mapSearch.fill('finns inte');
      await mapSearch.fill('Örn');
      await expect(announcements).toBeEmpty();
      await expect(announcements).toHaveText('1 träffar.');
      // Let every pending result's real debounce window elapse before inspecting updates.
      await page.waitForTimeout(400);
      expect(await observed.evaluate(({ messages }) => messages)).toEqual(['1 träffar.']);
      await expect(mapSearch).toBeFocused();
    } finally {
      await observed.evaluate(({ observer }) => observer.disconnect());
      await observed.dispose();
    }
    await page.keyboard.press('Escape');
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    await expect(tableSearch).toHaveValue('åkex');
    await tableSearch.fill('A 2');
    await expect(table.getByText('✓ Markerad', { exact: true })).toBeVisible();
    await tools.getByRole('button', { name: 'Skriv till Skyttel', exact: true }).click();
    await expect(message).toHaveValue('Å Oskickat meddelande 456');
    expect(await read()).toEqual(before);
  } finally {
    await installation.close();
  }
});
