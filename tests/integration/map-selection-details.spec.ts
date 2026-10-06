import { expect, test } from '@playwright/test';
import { openMap, utilityButton } from '../support/client.js';
import { prepareHouseholdReading } from '../support/household-reading.js';
import { createInstallation } from '../support/installation.js';

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 320, height: 640 },
  { width: 320, height: 250 },
]) {
  test(`MARKERING-05: selected information is read only and ordinary work remains reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    const installation = await createInstallation();
    try {
      const app = await prepareHouseholdReading(page.request, installation.origin, false);
      const before = await app.read();
      await page.setViewportSize(viewport);
      await page.goto(installation.origin);
      await openMap(page);
      const node = page.locator('.spatial-node[data-object-id="bike"]');
      await node.focus();
      await page.keyboard.press('Enter');
      await (await utilityButton(page, 'Visa detaljer')).click();
      const details = page.locator('.map-selection-details');
      await expect(details).toBeVisible();
      await expect(details).toHaveAttribute('data-selection-id', 'bike');
      await expect(details).toContainText('Cykel');
      await expect(details).toContainText('2000 SEK');
      await expect(details).toContainText('2500 SEK');
      await expect(details.getByRole('textbox')).toHaveCount(0);
      await expect(page.locator('.workspace-window')).toHaveCount(0);
      await details.getByRole('button', { name: 'Redigera Cykel', exact: true }).focus();
      await page.keyboard.press('Enter');
      const editor = page.getByRole('dialog', { name: 'Redigera Cykel', exact: true });
      await expect(editor).toBeVisible();
      await editor.getByRole('button', { name: 'Stäng objektdialogen', exact: true }).click();
      await expect(editor).not.toBeVisible();
      await expect(
        details.getByRole('button', { name: 'Redigera Cykel', exact: true }),
      ).toBeFocused();
      expect(await app.read()).toEqual(before);
      await details.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: testInfo.outputPath('selected-information.png') });
    } finally {
      await installation.close();
    }
  });
}
