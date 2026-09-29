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
