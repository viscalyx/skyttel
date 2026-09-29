import { chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';

test('IMPORT-09: another administrator discovers the same committed import after a lost response and restart', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const other = await browser.newContext();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}`;
    const headers = { origin: installation.origin };
    installation.setIdentity(robin);
    await signIn(other.request, installation.origin, 'microsoft');
    const { user } = await (await other.request.get(`${installation.origin}/api/bootstrap`)).json();
    const { code } = await (
      await page.request.post(`${path}/invitations`, { headers, data: { userId: user.id } })
    ).json();
    expect(
      (
        await other.request.post(`${installation.origin}/api/invitations/accept`, {
          headers,
          data: { code },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.post(`${path}/members/${user.id}/role`, {
          headers,
          data: { role: 'administrator' },
        })
      ).status(),
    ).toBe(200);
    const before = await (await page.request.get(`${path}/map`)).json();
    expect(
      (
        await page.request.post(`${path}/map/draft`, {
          headers,
          data: {
            id: 'private',
            version: before.draft.version,
            baseRevision: null,
            value: {
              name: 'Privat arbete från exporten',
              description: '',
              typeId: before.types[0].id,
            },
          },
        })
      ).status(),
    ).toBe(200);
    const original = await (await page.request.get(`${path}/map`)).json();
    const exported = await (
      await page.request.post(`${path}/exports`, { headers, data: {} })
    ).json();
    const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
    const administration = `${installation.origin}/households/${household.id}/administration`;
    await page.goto(administration);
    await page.getByLabel('Skyttel-export (ZIP)').setInputFiles({
      name: 'skyttel.zip',
      mimeType: 'application/zip',
      buffer: archive,
    });
    await page.getByRole('button', { name: 'Kontrollera importfil' }).click();
    await expect(page.getByText('Filen är kontrollerad.', { exact: false })).toBeVisible();
    let committedId = '';
    let confirmations = 0;
    other.on('request', (request) => {
      if (request.method() === 'POST' && /\/imports\/[^/]+\/confirm$/.test(request.url()))
        confirmations++;
    });
    await page.route('**/imports/*/confirm', async (route) => {
      confirmations++;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result).toMatchObject({ status: 'completed', contentVersion: 2 });
      committedId = result.id;
      await route.abort('failed');
    });
    await page.getByRole('checkbox', { name: 'Jag vill ersätta allt hushållsinnehåll' }).check();
    await page.getByRole('button', { name: 'Ersätt hushållets innehåll' }).click();
    await expect(page.getByRole('alert')).toContainText('Utfallet är okänt');
    await expect(page.getByLabel('Skyttel-export (ZIP)')).toBeDisabled();
    expect(committedId).not.toBe('');
    const fresh = await other.newPage();
    await fresh.goto(installation.origin);
    expect(
      await fresh.evaluate((id) => sessionStorage.getItem(`skyttel-import:${id}`), household.id),
    ).toBeNull();
    await fresh.goto(administration);
    await expect(
      fresh.getByText('Hushållets innehåll är ersatt. Nuvarande åtkomst är bevarad.'),
    ).toBeVisible();
    await expect(fresh.getByText(committedId, { exact: true })).toBeVisible();
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual({
      ...original,
      contentVersion: 2,
    });
    await installation.restart();
    await fresh.reload();
    await expect(fresh.getByText(committedId, { exact: true })).toBeVisible();
    await expect(
      fresh.getByText('Hushållets innehåll är ersatt. Nuvarande åtkomst är bevarad.'),
    ).toBeVisible();
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual({
      ...original,
      contentVersion: 2,
    });
    expect(confirmations).toBe(1);
  } finally {
    await other.close();
    await installation.close();
  }
});

test('IMPORT-11: another administrator finishes the same gated cleanup after the original administrator loses authority', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const other = await browser.newContext();
  let directory = '';
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const { user: owner } = await (
      await page.request.get(`${installation.origin}/api/bootstrap`)
    ).json();
    const path = `${installation.origin}/api/households/${household.id}`;
    const headers = { origin: installation.origin };
    installation.setIdentity(robin);
    await signIn(other.request, installation.origin, 'microsoft');
    const { user } = await (await other.request.get(`${installation.origin}/api/bootstrap`)).json();
    const { code } = await (
      await page.request.post(`${path}/invitations`, {
        headers,
        data: { userId: user.id },
      })
    ).json();
    expect(
      (
        await other.request.post(`${installation.origin}/api/invitations/accept`, {
          headers,
          data: { code },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await page.request.post(`${path}/members/${user.id}/role`, {
          headers,
          data: { role: 'administrator' },
        })
      ).status(),
    ).toBe(200);
    const original = await (await page.request.get(`${path}/map`)).json();
    const exported = await (
      await page.request.post(`${path}/exports`, { headers, data: {} })
    ).json();
    const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
    const administration = `${installation.origin}/households/${household.id}/administration`;
    await page.goto(administration);
    await page.getByLabel('Skyttel-export (ZIP)').setInputFiles({
      name: 'skyttel.zip',
      mimeType: 'application/zip',
      buffer: archive,
    });
    const prepared = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url() === `${path}/imports`,
    );
    await page.getByRole('button', { name: 'Kontrollera importfil' }).click();
    const ready = await (await prepared).json();
    expect(ready.status).toBe('ready');
    directory = join(installation.directory, '.skyttel-imports', ready.id);
    // Real filesystem boundary: replacement can commit but removal of the
    // extracted files must fail. No production state or result is substituted.
    chmodSync(directory, 0o500);
    await page.getByRole('checkbox', { name: 'Jag vill ersätta allt hushållsinnehåll' }).check();
    await page.getByRole('button', { name: 'Ersätt hushållets innehåll' }).click();
    await expect(page.getByText(/Tillfälliga filer behöver rensas/)).toBeVisible();
    expect((await other.request.get(`${path}/map`)).status()).toBe(409);
    expect((await other.request.post(`${path}/exports`, { headers, data: {} })).status()).toBe(409);
    expect(
      (
        await other.request.post(`${path}/members/${owner.id}/role`, {
          headers,
          data: { role: 'member' },
        })
      ).status(),
    ).toBe(200);
    expect((await page.request.get(`${path}/imports`)).status()).toBe(403);
    expect((await page.request.get(`${path}/imports/${ready.id}`)).status()).toBe(403);
    const fresh = await other.newPage();
    await fresh.goto(administration);
    await expect(fresh.getByText(ready.id, { exact: true })).toBeVisible();
    await expect(fresh.getByText(/Tillfälliga filer behöver rensas/)).toBeVisible();
    await expect(fresh.getByLabel('Skyttel-export (ZIP)')).toBeDisabled();
    const discovered = await (await other.request.get(`${path}/imports`)).json();
    expect(discovered.attempt).toMatchObject({
      id: ready.id,
      status: 'cleanup',
      contentVersion: 2,
      confirmationContentVersion: 1,
    });
    const altered = await other.request.post(`${path}/imports/${ready.id}/confirm`, {
      headers,
      data: { confirmed: true, contentVersion: 2 },
    });
    expect(altered.status()).toBe(409);
    expect(await altered.json()).toEqual({ error: 'operation_conflict' });
    expect((await other.request.get(`${path}/map`)).status()).toBe(409);
    chmodSync(directory, 0o700);
    const cleanup = fresh.waitForRequest(
      (request) =>
        request.method() === 'POST' && request.url() === `${path}/imports/${ready.id}/confirm`,
    );
    await fresh.getByRole('button', { name: 'Slutför importens rensning' }).click();
    expect((await cleanup).postDataJSON()).toEqual({ confirmed: true, contentVersion: 1 });
    await expect(fresh.getByText(/Hushållets innehåll är ersatt/)).toBeVisible();
    await expect(fresh.getByText(ready.id, { exact: true })).toBeVisible();
    expect(existsSync(directory)).toBe(false);
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual({
      ...original,
      contentVersion: 2,
    });
    await installation.restart();
    await fresh.reload();
    await expect(fresh.getByText(ready.id, { exact: true })).toBeVisible();
    expect((await (await page.request.get(`${path}/map`)).json()).contentVersion).toBe(2);
  } finally {
    if (directory && existsSync(directory)) chmodSync(directory, 0o700);
    await other.close();
    await installation.close();
  }
});

test('IMPORT-10: the current administrator recovers a lost preparation before an older completed import', async ({
  page,
  browser,
}) => {
  const installation = await createInstallation();
  const other = await browser.newContext();
  try {
    await signIn(page.request, installation.origin);
    const { household } = await (await createHousehold(page.request, installation.origin)).json();
    const path = `${installation.origin}/api/households/${household.id}`;
    const exported = await (
      await page.request.post(`${path}/exports`, {
        headers: { origin: installation.origin },
        data: {},
      })
    ).json();
    const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
    const administration = `${installation.origin}/households/${household.id}/administration`;
    const file = { name: 'skyttel.zip', mimeType: 'application/zip', buffer: archive };
    await page.goto(administration);
    await page.getByLabel('Skyttel-export (ZIP)').setInputFiles(file);
    await page.getByRole('button', { name: 'Kontrollera importfil' }).click();
    await page.getByRole('checkbox', { name: 'Jag vill ersätta allt hushållsinnehåll' }).check();
    await page.getByRole('button', { name: 'Ersätt hushållets innehåll' }).click();
    await expect(page.getByText(/Hushållets innehåll är ersatt/)).toBeVisible();
    const before = await (await page.request.get(`${path}/map`)).json();
    expect(before.contentVersion).toBe(2);
    let readyId = '';
    let confirmations = 0;
    other.on('request', (request) => {
      if (request.method() === 'POST' && /\/imports\/[^/]+\/confirm$/.test(request.url()))
        confirmations++;
    });
    await page.route('**/imports', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      const result = await response.json();
      expect(result).toMatchObject({ status: 'ready', contentVersion: 2 });
      readyId = result.id;
      await route.abort('failed');
    });
    await page.getByLabel('Skyttel-export (ZIP)').setInputFiles(file);
    await page.getByRole('button', { name: 'Kontrollera importfil' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(readyId).not.toBe('');
    await signIn(other.request, installation.origin);
    const fresh = await other.newPage();
    await fresh.goto(administration);
    await expect(fresh.getByRole('group', { name: 'Granska ersättningen' })).toBeVisible();
    await expect(fresh.getByText(readyId, { exact: true })).toBeVisible();
    const replace = fresh.getByRole('button', { name: 'Ersätt hushållets innehåll' });
    await expect(replace).toBeDisabled();
    expect(await (await page.request.get(`${path}/map`)).json()).toEqual(before);
    expect(confirmations).toBe(0);
    await fresh.getByRole('checkbox', { name: 'Jag vill ersätta allt hushållsinnehåll' }).check();
    await replace.click();
    await expect(fresh.getByText(/Hushållets innehåll är ersatt/)).toBeVisible();
    expect(confirmations).toBe(1);
    expect((await (await page.request.get(`${path}/map`)).json()).contentVersion).toBe(3);
  } finally {
    await other.close();
    await installation.close();
  }
});
