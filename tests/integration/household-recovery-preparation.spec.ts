import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

const preparation = readFileSync('docs/manual-tests/household-recovery-faults.md', 'utf8').match(
  /```javascript\n([\s\S]*?)\n```/,
)?.[1];
if (!preparation) throw new Error('Missing runnable recovery preparation');

for (const seeded of [false, true]) {
  test(`documented recovery delivery preparation uses real responses with ${seeded ? 'seeded' : 'empty'} content`, {
    tag: '@technical',
  }, async ({ page }) => {
    const installation = await createInstallation();
    try {
      await signIn(page.request, installation.origin);
      const { household } = await (await createHousehold(page.request, installation.origin)).json();
      const path = `${installation.origin}/api/households/${household.id}`;
      const headers = { origin: installation.origin };
      const read = async () => (await page.request.get(`${path}/map`)).json();
      if (seeded) {
        const state = await read();
        expect(
          (
            await page.request.post(`${path}/map/draft`, {
              headers,
              data: {
                id: 'private',
                version: state.draft.version,
                baseRevision: null,
                value: { typeId: state.types[0].id, name: 'Privat prov', description: '' },
              },
            })
          ).status(),
        ).toBe(200);
      }
      const before = await read();
      const exported = await (
        await page.request.post(`${path}/exports`, { headers, data: {} })
      ).json();
      const archive = await (await page.request.get(`${path}/exports/${exported.id}`)).body();
      await page.goto(`${installation.origin}/households/${household.id}/settings/import`);
      const writes: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().startsWith(`${path}/imports`))
          writes.push(request.url());
      });
      const install = async (mode: string) => {
        page.once('dialog', (dialog) => dialog.accept(mode));
        // DevTools Console execution does not insert an inline script element.
        await page.evaluate(preparation);
      };
      await install('prepare-delay');
      const waiting = page.waitForEvent('console', {
        predicate: (message) => message.text() === 'Serverns svar väntar',
      });
      const preparing = page.evaluate(
        async ({ url, bytes, contentVersion }) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/zip',
              'x-skyttel-content-version': String(contentVersion),
            },
            body: new Uint8Array(bytes),
          });
          return { status: response.status, body: await response.json() };
        },
        { url: `${path}/imports`, bytes: [...archive], contentVersion: before.contentVersion },
      );
      await waiting;
      expect(await read()).toEqual(before);
      await page.keyboard.press('Alt+Shift+L');
      const ready = await preparing;
      expect(ready.status).toBe(201);
      expect(ready.body.status).toBe('ready');
      expect(
        await page.evaluate(
          async ({ url, contentVersion }) => {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ confirmed: true, contentVersion }),
            });
            return response.status;
          },
          {
            url: `${path}/imports/${ready.body.id}/confirm`,
            contentVersion: before.contentVersion,
          },
        ),
      ).toBe(200);
      const confirmed = await read();
      expect(confirmed).toEqual({
        ...before,
        contentVersion: before.contentVersion + 1,
        // Empty archives have no historical private owner to restore.
        userId: seeded ? before.userId : expect.any(String),
      });
      for (const [mode, url] of [
        ['import-status-drop', `${path}/imports/${ready.body.id}`],
        ['owner-status-drop', `${path}/content-owners`],
      ]) {
        await install(mode);
        const dropped = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'Serverns svar tappat',
        });
        const result = await page.evaluate(async (address) => {
          try {
            await fetch(address);
            return 'delivered';
          } catch (failure) {
            return failure instanceof TypeError ? 'lost' : 'unexpected';
          }
        }, url);
        await dropped;
        expect(result).toBe('lost');
        expect(await page.evaluate(async (address) => (await fetch(address)).status, url)).toBe(
          200,
        );
      }
      expect(await read()).toEqual(confirmed);
      expect(writes).toEqual([`${path}/imports`, `${path}/imports/${ready.body.id}/confirm`]);
    } finally {
      await installation.close();
    }
  });
}
