import { expect, test } from '@playwright/test';
import { acceptRememberedOffer } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

test('ACCESS-28: a callback without an accepted auth cookie shows the precise unconfirmed-login message', async ({
  browser,
}) => {
  const installation = await createInstallation(undefined, {
    https: true,
    deliverResponse(request, response) {
      if (!new URL(request.url).pathname.startsWith('/api/auth/callback/')) return response;
      const headers = new Headers(response.headers);
      headers.delete('set-cookie');
      for (const cookie of response.headers.getSetCookie())
        if (!cookie.split(';', 1)[0].split('=')[0].endsWith('better-auth.session_token'))
          headers.append('set-cookie', cookie);
      return new Response(response.body, { status: response.status, headers });
    },
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const page = await context.newPage();
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
    await page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
    await page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Inloggningen kunde inte bekräftas. Försök logga in igen. Kontrollera att webbläsaren tillåter kakor för Skyttel om problemet kvarstår.',
    );
    await expect(
      page.getByRole('button', { name: 'Fortsätt med Google', exact: true }),
    ).toBeVisible();
    expect((await context.cookies()).filter((item) => item.name.includes('binding'))).toEqual([
      expect.objectContaining({ expires: -1 }),
    ]);
    expect(
      await (await context.request.get(`${installation.origin}/api/bootstrap`)).json(),
    ).toMatchObject({ status: 'anonymous' });
  } finally {
    await context.close();
    await installation.close();
  }
});

test('ACCESS-27: remembered login is selected separately after each successful login and a failed provider visit preserves the existing session', async ({
  browser,
}) => {
  const installation = await createInstallation(undefined, { https: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const page = await context.newPage();
    await page.goto(installation.origin);
    await page.getByRole('button', { name: 'Acceptera Alla', exact: true }).click();
    const chooseProvider = () =>
      page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
    const continueLogin = () =>
      page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
    await chooseProvider();
    await continueLogin();
    await acceptRememberedOffer(page);
    await expect(page.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
    const cookies = (await context.cookies()).filter(
      (item) => item.name.includes('binding') || item.name.endsWith('session_token'),
    );
    expect(cookies).toHaveLength(2);
    expect(cookies.every((item) => item.expires > Date.now() / 1000 && item.secure)).toBe(true);
    expect(cookies.find((item) => item.name.endsWith('session_token'))?.httpOnly).toBe(true);
    await page.goto(`${installation.origin}/login`);
    await chooseProvider();
    await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await chooseProvider();
    installation.failProvider(true);
    await continueLogin();
    await expect(page.getByRole('alert')).toContainText('Inloggningen kunde inte slutföras');
    expect(
      (await context.cookies()).filter(
        (item) => item.name.includes('binding') || item.name.endsWith('session_token'),
      ),
    ).toEqual(cookies);
    installation.failProvider(false);
    await chooseProvider();
    await continueLogin();
    const offer = page.getByRole('dialog', { name: 'Kom ihåg mig i Skyttel', exact: true });
    await offer.getByRole('button', { name: 'Inte nu', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
    expect(
      (await context.cookies())
        .filter((item) => item.name.includes('binding') || item.name.endsWith('session_token'))
        .every((item) => item.expires === -1),
    ).toBe(true);
    expect(
      await (
        await context.request.get(`${installation.origin}/api/browser-binding/preference`, {
          headers: { origin: installation.origin },
        })
      ).json(),
    ).toMatchObject({ remembered: false });
  } finally {
    await context.close();
    await installation.close();
  }
});
