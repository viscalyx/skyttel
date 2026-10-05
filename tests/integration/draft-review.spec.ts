import { expect, test } from '@playwright/test';
import { consentBox, giveConversationConsent } from '../support/conversation-page.js';
import { prepareDraftReview } from '../support/draft-review.js';
import { createInstallation } from '../support/installation.js';
import { modelMessage, textModel } from '../support/text-model.js';

for (const mobile of [false, true])
  test(`UTKAST-25: ${mobile ? 'mobile' : 'desktop'} complete draft review works without AI or consent`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      const { household, read } = await prepareDraftReview(page.request, installation.origin);
      const before = await read();
      const starts: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'POST' && /text-assistant(?:\/|$)/.test(request.url()))
          starts.push(request.url());
      });
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.goto(`${installation.origin}/households/${household.id}`);
      const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
      await tools.getByRole('button', { name: 'Utkast', exact: true }).click();
      const draft = page.getByRole('region', { name: 'Utkastet', exact: true });
      await expect(draft).toBeVisible();
      await expect(draft.getByRole('columnheader')).toHaveText([
        'Symbol',
        'Namn',
        'Typ',
        'Vad som ändras',
      ]);
      await expect(consentBox(page)).not.toBeVisible();
      await expect(draft.getByRole('button', { name: /^Redigera/ })).toHaveCount(0);
      const button = draft.getByRole('button', {
        name: 'Visa förslaget: Alex blå cykel',
        exact: true,
      });
      await button.focus();
      await page.keyboard.press('Enter');
      const modal = page.getByRole('dialog', { name: 'Alex blå cykel', exact: true });
      await expect(
        modal.getByRole('heading', { name: 'Alex blå cykel', exact: true }),
      ).toBeFocused();
      await expect(modal.getByRole('heading', { name: 'Sparade värden' })).toBeVisible();
      await expect(modal.getByRole('heading', { name: 'Föreslagna värden' })).toBeVisible();
      for (const value of [
        'SPARAT-17',
        'FÖRESLAGET-42',
        'Hela den sparade beskrivningen',
        'Fullständig föreslagen beskrivning',
        'Uttryckligen inget',
        'Okänt',
        '500 SEK (osäkert uppgivet) · uppgivet 2026-01-01',
      ])
        await expect(modal.getByText(value, { exact: true })).toBeVisible();
      await expect(modal.getByRole('button')).toHaveCount(1);
      await page.screenshot({
        path: `/tmp/skyttel-244/252-read-${mobile ? 'mobile' : 'desktop'}.png`,
      });
      await page.keyboard.press('Tab');
      await expect(modal.getByRole('button', { name: 'Stäng dialogen' })).toBeFocused();
      await page.keyboard.press('Tab');
      expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      await expect(button).toBeFocused();
      for (const [name, detail] of [
        ['Utkastfordon', 'Föreslagen fältbeskrivning'],
        ['Granskar', 'kontrolleras av'],
      ]) {
        await draft.getByRole('button', { name: `Visa förslaget: ${name}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name, exact: true });
        await expect(dialog.getByText(detail, { exact: false }).last()).toBeVisible();
        await dialog.getByRole('button', { name: 'Stäng dialogen' }).click();
      }
      const edge = draft
        .getByRole('button', { name: /Visa förslaget:.*→.*Ospecificerat fordon/ })
        .first();
      await edge.click();
      await expect(
        page.getByRole('dialog').getByText('Hela dolda uppgiften known', { exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(draft.getByRole('row', { name: /Olöst fordon/ })).toContainText(
        'Identiteten är olöst',
      );
      await expect(
        draft
          .getByRole('row', { name: /Ospecificerat fordon/ })
          .first()
          .locator('.draft-row-warning'),
      ).toHaveCount(0);
      await expect(draft.locator('.draft-row-warning')).toHaveCount(2);
      expect(starts).toEqual([]);
      expect(await read()).toEqual(before);
      await draft.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: `/tmp/skyttel-244/252-${mobile ? 'mobile' : 'desktop'}.png` });
    } finally {
      await installation.close();
    }
  });

test('UTKAST-26: empty and type-only drafts preserve unsent text and first send asks consent once', async ({
  page,
}) => {
  let messages = 0;
  const submitted: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/messages'))
      submitted.push(request.postDataJSON().text);
  });
  const installation = await createInstallation(undefined, {
    modelFetch: textModel(() => {
      messages++;
      return [modelMessage('Ett provsvar.')];
    }).provider,
  });
  try {
    const { household, post, read } = await prepareDraftReview(page.request, installation.origin);
    await post('discard', {});
    await page.goto(`${installation.origin}/households/${household.id}`);
    const tools = page.getByRole('navigation', { name: 'Kartans verktyg', exact: true });
    await expect(tools.getByRole('button', { name: 'Utkast', exact: true })).toHaveCount(0);
    await tools.getByRole('button', { name: 'Skriv till Skyttel', exact: true }).click();
    await expect(consentBox(page)).not.toBeVisible();
    await page.getByRole('button', { name: /^Visa utkastet/ }).click();
    await expect(page.getByText('Utkastet är tomt.', { exact: true })).toBeVisible();
    const message = page.getByLabel('Meddelande till Skyttel', { exact: true });
    await message.fill('Behåll å, ä och ö i mitt meddelande');
    await page.getByRole('button', { name: 'Stäng textvyn' }).click();
    await tools.getByRole('button', { name: 'Tabell', exact: true }).click();
    await tools.getByRole('button', { name: 'Skriv till Skyttel', exact: true }).click();
    await expect(message).toHaveValue('Behåll å, ä och ö i mitt meddelande');
    await page.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect(consentBox(page)).toBeVisible();
    await giveConversationConsent(page);
    await expect(page.getByRole('log', { name: 'Samtalstext' })).toContainText('Ett provsvar.');
    expect(messages).toBe(1);
    expect(submitted).toEqual(['Behåll å, ä och ö i mitt meddelande']);
    await expect(message).toHaveValue('');
    await post('object-type', {
      id: 'only-type',
      baseRevision: null,
      value: { name: 'Endast typförslag', description: '', fields: [] },
    });
    await page.reload();
    await expect(tools.getByRole('button', { name: 'Utkast', exact: true })).toBeVisible();
    await tools.getByRole('button', { name: 'Utkast', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Visa förslaget: Endast typförslag' }),
    ).toBeVisible();
    expect((await read()).draft.objectTypes).toHaveLength(1);
  } finally {
    await installation.close();
  }
});
