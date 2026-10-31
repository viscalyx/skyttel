import { signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';
import { createPreparedContext, expect, test } from '../support/test.js';

test('a genuinely delayed callback header overwrites the browser cookie without reviving its old session', {
  tag: '@technical',
}, async ({ browser, playwright }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let capture: (cookies: string[]) => void = () => {};
  const captured = new Promise<string[]>((resolve) => {
    capture = resolve;
  });
  let delay = false;
  const installation = await createInstallation(undefined, {
    https: true,
    async deliverResponse(request, response) {
      if (delay && new URL(request.url).pathname.startsWith('/api/auth/callback/')) {
        delay = false;
        capture(response.headers.getSetCookie());
        await held;
      }
      return response;
    },
  });
  const { origin } = installation;
  const context = await createPreparedContext(browser, { ignoreHTTPSErrors: true });
  let current: Awaited<ReturnType<typeof playwright.request.newContext>> | undefined;
  try {
    await signIn(context.request, origin);
    const start = await context.request.post(`${origin}/api/auth/sign-in/social`, {
      headers: { origin },
      data: { provider: 'google', callbackURL: '/' },
    });
    expect(start.status()).toBe(200);
    delay = true;
    const oldResponse = context.request.get((await start.json()).url, { maxRedirects: 0 });
    const issued = await captured;
    // The installation's response-delivery seam exposes the issued key only
    // to the fixture. A second client arranges a later authorized replacement
    // while the original real HTTP response is still held outside the server.
    current = await playwright.request.newContext({
      ignoreHTTPSErrors: true,
      storageState: await context.request.storageState(),
    });
    const oldAuth = issued.find((item) => item.startsWith('__Secure-better-auth.session_token='));
    if (!oldAuth) throw new Error('Missing issued auth cookie');
    const [name, ...parts] = oldAuth.split(';', 1)[0].split('=');
    await current.addCookies([
      { name, value: parts.join('='), url: origin, secure: true, httpOnly: true, sameSite: 'Lax' },
    ]);
    installation.setIdentity(robin);
    await signIn(current, origin);
    const winner = await current.storageState();
    await context.addCookies(winner.cookies);
    const winningKey = (await context.cookies()).find((cookie) => cookie.name === name)?.value;
    expect(await (await context.request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
      user: { name: robin.name },
    });
    release();
    expect((await oldResponse).status()).toBe(302);
    const lateKey = (await context.cookies()).find((cookie) => cookie.name === name)?.value;
    expect(lateKey).toBe(parts.join('='));
    expect(lateKey).not.toBe(winningKey);
    expect(await (await context.request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
      status: 'anonymous',
    });
    expect(await (await current.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
      user: { name: robin.name },
    });
    await installation.restart();
    expect(await (await context.request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
      status: 'anonymous',
    });
  } finally {
    release();
    await current?.dispose();
    await context.close();
    await installation.close();
  }
});
