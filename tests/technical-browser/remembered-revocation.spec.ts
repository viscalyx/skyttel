import { randomUUID } from 'node:crypto';
import { signIn } from '../support/client.js';
import { createInstallation, robin } from '../support/installation.js';
import { createPreparedContext, expect, test } from '../support/test.js';

for (const phase of ['early', 'late', 'repeated'] as const) {
  test(`a real delayed persistent cookie cannot revive ${phase} revocation or its pending callback`, {
    tag: '@technical',
  }, async ({ browser, playwright }) => {
    let time = Date.now();
    let hold = false;
    let release = () => {};
    let capture: (value: {
      cookies: string[];
      binding: { cookieName: string; candidate: string };
    }) => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const captured = new Promise<{
      cookies: string[];
      binding: { cookieName: string; candidate: string };
    }>((resolve) => {
      capture = resolve;
    });
    const installation = await createInstallation(undefined, {
      https: true,
      now: () => time,
      async deliverResponse(request, response) {
        if (hold && new URL(request.url).pathname === '/api/browser-binding/activate') {
          hold = false;
          capture({
            cookies: response.headers.getSetCookie(),
            binding: await response.clone().json(),
          });
          await held;
        }
        return response;
      },
    });
    const { origin } = installation;
    const context = await createPreparedContext(browser, { ignoreHTTPSErrors: true }, true);
    const independent = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    let current: typeof independent | undefined;
    let continued: typeof independent | undefined;
    let resume = () => {};
    try {
      await signIn(context.request, origin);
      const preference = await (
        await context.request.get(`${origin}/api/browser-binding/preference`, {
          headers: { origin },
        })
      ).json();
      hold = true;
      const delayed = context.request.post(`${origin}/api/browser-binding/activate`, {
        headers: { origin },
        data: {
          id: randomUUID(),
          sessionId: preference.sessionId,
          bindingId: preference.bindingId,
          preferences: true,
          rememberMe: true,
          informationVersion: 1,
          consentInformationVersion: 1,
        },
      });
      const { cookies: issued, binding: activatedBinding } = await captured;
      const oldAuth = issued.find((item) => item.startsWith('__Secure-better-auth.session_token='));
      if (!oldAuth) throw new Error('Missing persistent auth cookie');
      const [name, ...parts] = oldAuth.split(';', 1)[0].split('=');
      current = await playwright.request.newContext({
        ignoreHTTPSErrors: true,
        storageState: await context.storageState(),
      });
      await current.addCookies([
        {
          name,
          value: parts.join('='),
          url: origin,
          secure: true,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
      await current.addCookies([
        {
          name: activatedBinding.cookieName,
          value: activatedBinding.candidate,
          url: origin,
          secure: true,
          sameSite: 'Lax',
        },
      ]);
      expect(
        (
          await current.post(`${origin}/api/browser-binding/register`, {
            headers: { origin },
            data: {},
          })
        ).status(),
      ).toBe(200);
      const oldState = await current.storageState();
      const before = await (await current.get(`${origin}/api/auth/get-session`)).json();
      const originalDeadline = time + 604_800_000;
      time += phase === 'late' ? 601_200_000 : phase === 'repeated' ? 86_400_000 : 1_000;
      const expectedDeadline = phase === 'late' ? originalDeadline : time + 28_800_000;
      await signIn(independent, origin);
      const pending = await current.post(`${origin}/api/auth/sign-in/social`, {
        headers: { origin },
        data: { provider: 'google', callbackURL: '/' },
      });
      const paused = installation.pauseNextProvider();
      resume = paused.resume;
      const slow = current.get((await pending.json()).url, { maxRedirects: 0 });
      await paused.reached;
      installation.setIdentity(robin);
      const actor = current;
      const revoke = async () => {
        const response = await actor.post(`${origin}/api/browser-binding/revoke`, {
          headers: { origin },
          data: { id: randomUUID() },
        });
        expect(response.status()).toBe(200);
        const result = await response.json();
        expect(result.expiresAt).toBe(expectedDeadline);
        expect(
          response
            .headersArray()
            .filter((header) => header.name.toLowerCase() === 'set-cookie')
            .every((header) => !header.value.includes('binding')),
        ).toBe(true);
        await actor.addCookies([
          {
            name: result.cookieName,
            value: result.candidate,
            url: origin,
            secure: true,
            sameSite: 'Lax',
          },
        ]);
        expect(
          (
            await actor.post(`${origin}/api/browser-binding/register`, {
              headers: { origin },
              data: {},
            })
          ).status(),
        ).toBe(200);
        return result;
      };
      let result = await revoke();
      if (phase === 'repeated') {
        time += 60_000;
        result = await revoke();
      }
      const state = await current.storageState();
      continued = await playwright.request.newContext({
        ignoreHTTPSErrors: true,
        storageState: state,
      });
      await context.addCookies(state.cookies);
      const newKey = (await context.cookies()).find((cookie) => cookie.name === name)?.value;
      release();
      expect((await delayed).status()).toBe(200);
      const actualCookie = (await context.cookies()).find((cookie) => cookie.name === name);
      expect(actualCookie?.value).toBe(parts.join('='));
      expect(actualCookie?.value).not.toBe(newKey);
      expect(actualCookie?.expires).toBe(Math.floor(originalDeadline / 1000));
      expect(
        (await context.cookies()).find((cookie) => cookie.name.includes('binding'))?.expires,
      ).toBe(-1);
      expect(await (await context.request.get(`${origin}/api/auth/get-session`)).json()).toBeNull();
      expect(await (await context.request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
        status: 'anonymous',
      });
      expect(
        (
          await context.request.post(`${origin}/api/browser-binding/revoke`, {
            headers: { origin },
            data: { id: randomUUID() },
          })
        ).status(),
      ).toBe(401);
      expect(await (await continued.get(`${origin}/api/auth/get-session`)).json()).toMatchObject({
        session: { id: before.session.id },
      });
      paused.resume();
      expect((await slow).headers().location).toBe(`${origin}/?error=binding_invalid`);
      expect(await (await independent.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
        user: { name: 'Alex Exempel' },
      });
      await context.addCookies(oldState.cookies);
      expect(await (await context.request.get(`${origin}/api/auth/get-session`)).json()).toBeNull();
      expect(
        (
          await continued.get(`${origin}/api/browser-binding/results/${result.id}`, {
            headers: { origin },
          })
        ).status(),
      ).toBe(200);
      const methods = await continued.get(`${origin}/api/login-methods`);
      expect(await methods.json()).toMatchObject({
        providers: ['google'],
      });
    } finally {
      release();
      resume();
      await context.close();
      await current?.dispose();
      await continued?.dispose();
      await independent.dispose();
      await installation.close();
    }
  });
}
