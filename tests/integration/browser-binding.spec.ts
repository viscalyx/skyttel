import { createInstallation } from '../support/installation.js';
import { createPreparedContext, expect, test } from '../support/test.js';

test('ACCESS-24: simultaneous first HTTPS tabs confirm one browser binding before provider start', async ({
  browser,
}) => {
  const installation = await createInstallation(undefined, { https: true });
  const context = await createPreparedContext(browser, { ignoreHTTPSErrors: true });
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    const observed: string[] = [];
    await context.route('**/api/auth/sign-in/social', async (route) => {
      const cookie = (await route.request().allHeaders()).cookie ?? '';
      observed.push(
        cookie
          .split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('__Host-skyttel_binding=')) ?? '',
      );
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      // Keep the test at provider start while preserving the actual app's state.
      await route.fulfill({ status: 503, json: { error: 'synthetic_provider_hold' } });
    });
    await Promise.all([first.goto(installation.origin), second.goto(installation.origin)]);
    expect((await context.cookies()).filter((item) => item.name.includes('binding'))).toEqual([]);
    for (const page of [first, second])
      await page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
    await Promise.all(
      [first, second].map((page) =>
        page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click(),
      ),
    );
    await expect.poll(() => observed.length).toBe(2);
    for (const page of [first, second]) {
      await expect(page.getByRole('alert')).toContainText('Inloggningen kunde inte slutföras');
      await expect(
        page.getByRole('button', { name: 'Fortsätt med Google', exact: true }),
      ).toBeVisible();
    }
    expect(observed[0]).toBe(observed[1]);
    expect(observed[0]).toMatch(/^__Host-skyttel_binding=[a-f0-9]{64}$/);
    const cookies = await context.cookies();
    expect(cookies.filter((item) => item.name.includes('binding'))).toEqual([
      expect.objectContaining({
        name: '__Host-skyttel_binding',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        path: '/',
        expires: -1,
      }),
    ]);
    const independent = await createPreparedContext(browser, { ignoreHTTPSErrors: true });
    try {
      const page = await independent.newPage();
      await page.goto(installation.origin);
      await page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
      await page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
      expect(
        (await independent.cookies()).find((item) => item.name.includes('binding'))?.value,
      ).not.toBe(cookies[0].value);
    } finally {
      await independent.close();
    }
  } finally {
    await context.close();
    await installation.close();
  }
});

test('ACCESS-26: cancelling delayed initialization cannot replace another tabs confirmed binding', async ({
  browser,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let candidateReceived = false;
  let delivered = false;
  const installation = await createInstallation(undefined, {
    https: true,
    async deliverResponse(request, response) {
      if (
        !candidateReceived &&
        new URL(request.url).pathname === '/api/browser-binding/candidate'
      ) {
        expect(response.headers.get('set-cookie')).toBeNull();
        candidateReceived = true;
        await held;
        delivered = true;
      }
      return response;
    },
  });
  const context = await createPreparedContext(browser, { ignoreHTTPSErrors: true });
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    await Promise.all([first.goto(installation.origin), second.goto(installation.origin)]);
    await first.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
    await first.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
    await expect.poll(() => candidateReceived).toBe(true);
    await first.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await expect(first.getByRole('status')).toContainText('Inloggningen avbröts');
    await second.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
    await second.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
    await expect(second.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
    const before = (await context.cookies()).find((item) => item.name === '__Host-skyttel_binding');
    release();
    await expect.poll(() => delivered).toBe(true);
    expect(
      (await context.cookies()).find((item) => item.name === '__Host-skyttel_binding'),
    ).toEqual(before);
    await second.reload();
    await expect(second.getByRole('heading', { name: 'Skapa ditt hushåll' })).toBeVisible();
    await expect(
      first.getByRole('button', { name: 'Fortsätt med Google', exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await context.close();
    await installation.close();
  }
});

test('ACCESS-25: unavailable browser locks and blocked cookies stop login accessibly without retry', async ({
  browser,
}) => {
  const installation = await createInstallation(undefined, { https: true });
  try {
    for (const failure of ['locks', 'cookies', 'registration'] as const) {
      const context = await createPreparedContext(browser, { ignoreHTTPSErrors: true });
      try {
        const page = await context.newPage();
        if (failure === 'locks')
          await page.addInitScript(() =>
            Object.defineProperty(navigator, 'locks', { value: undefined }),
          );
        else if (failure === 'cookies') {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setDocumentCookieDisabled', { disabled: true });
        } else
          await page.route('**/api/browser-binding/register', async (route) => {
            expect((await route.fetch()).status()).toBe(200);
            await route.abort('failed');
          });
        let starts = 0;
        page.on('request', (request) => {
          if (request.url().endsWith('/api/auth/sign-in/social')) starts += 1;
        });
        await page.goto(installation.origin);
        await page.getByRole('button', { name: 'Fortsätt med Google', exact: true }).click();
        await page.getByRole('button', { name: 'Fortsätt till Google', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('Säker inloggning kan inte bekräftas');
        await expect(
          page.getByRole('button', { name: 'Fortsätt med Google', exact: true }),
        ).toBeFocused();
        expect(starts).toBe(0);
        const bindings = (await context.cookies()).filter((item) => item.name.includes('binding'));
        expect(bindings).toHaveLength(failure === 'registration' ? 1 : 0);
        expect(
          await (await context.request.get(`${installation.origin}/api/bootstrap`)).json(),
        ).toMatchObject({ status: 'anonymous' });
      } finally {
        await context.close();
      }
    }
  } finally {
    await installation.close();
  }
});
