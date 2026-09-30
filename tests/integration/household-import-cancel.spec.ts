import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { createHousehold, openSettings, openWorkspace, signIn } from '../support/client.js';
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
    const initial = await (await page.request.get(`${path}/map`)).json();
    const value = { name: 'Exportens namn', description: '', typeId: initial.types[0].id };
    expect(
      (
        await page.request.post(`${path}/map/draft`, {
          headers,
          data: { id: 'cancel-object', version: 0, baseRevision: null, value },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.post(`${path}/map/save`, {
          headers,
          data: { version: 1, operationId: 'cancel-before-export' },
        })
      ).status(),
    ).toBe(200);
    const exported = await (
      await page.request.post(`${path}/exports`, { headers, data: {} })
    ).json();
    const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
    const saved = await (await page.request.get(`${path}/map`)).json();
    expect(
      (
        await page.request.post(`${path}/map/draft`, {
          headers,
          data: {
            id: 'cancel-object',
            version: saved.draft.version,
            baseRevision: saved.objects[0].revision,
            value: { ...value, name: 'Senare namn' },
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.post(`${path}/map/save`, {
          headers,
          data: { version: saved.draft.version + 1, operationId: 'cancel-after-export' },
        })
      ).status(),
    ).toBe(200);
    const changed = await (await page.request.get(`${path}/map`)).json();
    expect(
      (
        await page.request.post(`${path}/map/draft`, {
          headers,
          data: {
            id: 'cancel-private',
            version: changed.draft.version,
            baseRevision: null,
            value: { ...value, name: 'Privat arbete efter exporten' },
          },
        })
      ).status(),
    ).toBe(200);
    const before = await (await page.request.get(`${path}/map`)).json();
    expect(before.objects).toEqual([expect.objectContaining({ name: 'Senare namn' })]);
    expect(before.draft.changes).toHaveLength(1);
    await page.goto(installation.origin);
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Nytt objekt', exact: true }).click();
    const unsent = page.getByLabel('Objektets namn');
    await unsent.fill('Oskickat arbete under avbrottet');
    await openSettings(page);
    await page.getByRole('link', { name: 'Återimportera hushållet', exact: true }).click();
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
    await page.getByRole('link', { name: 'Tillbaka till kartan', exact: true }).click();
    await expect(unsent).toHaveValue('Oskickat arbete under avbrottet');
    await openSettings(page);
    await page.getByRole('link', { name: 'Återimportera hushållet', exact: true }).click();
    await page.reload();
    await expect(importer.getByRole('group', { name: 'Granska ersättningen' })).toHaveCount(0);
    await expect(file).toBeEnabled();
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual(before);
  } finally {
    await installation.close();
  }
});
