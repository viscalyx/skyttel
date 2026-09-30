import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('IMPORT-16: an administrator explicitly cancels only an unconfirmed preparation and removes its staged archive', async ({
  page,
}) => {
  const installation = await createInstallation();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}`;
    const headers = { origin: installation.origin };
    const before = await (await page.request.get(`${path}/map`)).json();
    const exported = await (
      await page.request.post(`${path}/exports`, { headers, data: {} })
    ).json();
    const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
    await page.goto(`${installation.origin}/households/${household.id}/settings/import`);
    const importer = page.getByRole('region', { name: 'Återimportera hushållet', exact: true });
    const file = importer.getByLabel('Skyttel-export (ZIP)');
    await file.setInputFiles({ name: 'skyttel.zip', mimeType: 'application/zip', buffer: archive });
    const prepared = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url() === `${path}/imports`,
    );
    await importer.getByRole('button', { name: 'Kontrollera importfil' }).click();
    const ready = await (await prepared).json();
    expect(ready.status).toBe('ready');
    const staged = join(installation.directory, '.skyttel-imports', ready.id);
    expect(existsSync(staged)).toBe(true);
    const cancel = importer.getByRole('button', { name: 'Avbryt förberedelsen', exact: true });
    await expect(cancel).toBeVisible();
    await expect(
      importer.getByRole('button', { name: 'Ersätt hushållets innehåll' }),
    ).toBeDisabled();
    const cancelled = page.waitForResponse(
      (response) => response.url() === `${path}/imports/${ready.id}/cancel`,
    );
    await cancel.focus();
    await page.keyboard.press('Enter');
    expect((await cancelled).status()).toBe(200);
    await expect(importer.getByRole('status')).toContainText('Förberedelsen är avbruten');
    await expect(file).toBeFocused();
    await expect(file).toBeEnabled();
    await expect(importer.getByRole('group', { name: 'Granska ersättningen' })).toHaveCount(0);
    expect(existsSync(staged)).toBe(false);
    expect(await (await page.request.get(`${path}/imports`)).json()).toEqual({
      attempt: null,
      ready: null,
    });
    expect((await page.request.get(`${path}/imports/${ready.id}`)).status()).toBe(404);
    expect(
      (
        await page.request.post(`${path}/imports/${ready.id}/confirm`, {
          headers,
          data: { confirmed: true, contentVersion: 1 },
        })
      ).status(),
    ).toBe(404);
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual(before);
    await page.reload();
    await expect(importer.getByRole('group', { name: 'Granska ersättningen' })).toHaveCount(0);
    await expect(file).toBeEnabled();
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual(before);
  } finally {
    await installation.close();
  }
});
