import { expect, test } from '@playwright/test';
import { signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';
import { login } from '../support/remembered-login-steps.js';
import { prepareStorageChoice } from '../support/test.js';

test('a delayed remembered confirmation cannot leave persistent binding after a newer ordinary callback', {
  tag: '@technical',
}, async ({ browser }) => {
  let hold = false;
  let reached = () => {};
  let release = () => {};
  const captured = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const installation = await createInstallation(undefined, {
    https: true,
    async deliverResponse(request, response) {
      if (hold && new URL(request.url).pathname === '/api/browser-binding/confirmation') {
        hold = false;
        reached();
        await held;
      }
      return response;
    },
  });
  const { origin } = installation;
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(context.request, origin);
    const confirmation = await login(context.request, origin, {
      rememberMe: true,
      informationVersion: 1,
    });
    // Arrange another already-started callback, so its publication can happen
    // while the real browser holds the confirmation lock across a JSON read.
    const started = await context.request.post(`${origin}/api/auth/sign-in/social`, {
      headers: { origin },
      data: { provider: 'google', callbackURL: '/', rememberMe: false, informationVersion: 1 },
    });
    expect(started.status()).toBe(200);
    const pending = (await started.json()).url;
    hold = true;
    await prepareStorageChoice(context, true);
    const page = await context.newPage();
    await page.goto(
      `${origin}/?loginConfirmation=${new URL(confirmation).searchParams.get('proof')}`,
    );
    await captured;
    expect((await context.request.get(pending, { maxRedirects: 0 })).status()).toBe(302);
    release();
    await expect(page.getByRole('alert')).toHaveText(
      'Inloggningen kunde inte bekräftas. Försök logga in igen. Kontrollera att webbläsaren tillåter kakor för Skyttel om problemet kvarstår.',
    );
    expect(
      (await context.cookies())
        .filter((item) => item.name.includes('binding') || item.name.endsWith('session_token'))
        .every((item) => item.expires === -1),
    ).toBe(true);
    expect(await (await context.request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
      status: 'setup',
    });
  } finally {
    release();
    await context.close();
    await installation.close();
  }
});
