import { signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { createInstallation, robin } from '../../support/installation.js';
import { login } from '../../support/remembered-login-steps.js';
import { advanceActiveLogin } from '../../support/session-time.js';

test('ordinary login uses a session cookie and never emits a remembered-choice mirror', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  try {
    await signIn(request, installation.origin);
    const cookies = (await request.storageState()).cookies;
    expect(
      cookies.find((cookie) => cookie.name.endsWith('better-auth.session_token')),
    ).toMatchObject({
      expires: -1,
      httpOnly: true,
      sameSite: 'Lax',
    });
    expect(cookies.some((cookie) => cookie.name.includes('dont_remember'))).toBe(false);
  } finally {
    await installation.close();
  }
});

test('confirmation belongs to the exact current session and a proof alone grants no access', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request, playwright }) => {
  const installation = await createInstallation();
  const { origin } = installation;
  const other = await playwright.request.newContext();
  const anonymous = await playwright.request.newContext();
  try {
    await signIn(request, origin);
    const first = await login(request, origin, { rememberMe: true, informationVersion: 1 });
    expect((await anonymous.get(first, { headers: { origin } })).status()).toBe(401);
    installation.setIdentity(robin);
    await signIn(other, origin, 'microsoft');
    expect((await other.get(first, { headers: { origin } })).status()).toBe(401);
    const second = await login(request, origin, { rememberMe: false, informationVersion: 1 });
    expect((await request.get(first, { headers: { origin } })).status()).toBe(401);
    expect((await request.get(second, { headers: { origin } })).status()).toBe(200);
    const saved = await request.storageState();
    const withoutBinding = await playwright.request.newContext({
      storageState: {
        ...saved,
        cookies: saved.cookies.filter((cookie) => cookie.name !== 'skyttel_binding'),
      },
    });
    try {
      expect((await withoutBinding.get(second, { headers: { origin } })).status()).toBe(401);
    } finally {
      await withoutBinding.dispose();
    }
    expect(
      (await request.get(second, { headers: { origin: 'https://attacker.example' } })).status(),
    ).toBe(403);
  } finally {
    await anonymous.dispose();
    await other.dispose();
    await installation.close();
  }
});

test('delayed remembered-cookie delivery and repeated reads retain the original absolute deadline', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  let time = Date.now();
  let delayed = false;
  const installation = await createInstallation(undefined, {
    now: () => time,
    deliverResponse(request, response) {
      if (delayed && new URL(request.url).pathname.startsWith('/api/auth/callback/'))
        time += 300_000;
      return response;
    },
  });
  const { origin } = installation;
  try {
    await signIn(request, origin);
    const expiresAt = time + 604_800_000;
    delayed = true;
    const proof = await login(request, origin, { rememberMe: true, informationVersion: 1 });
    const cookie = (await request.storageState()).cookies.find((item) =>
      item.name.endsWith('session_token'),
    );
    expect(cookie?.expires).toBe(Math.floor(expiresAt / 1000));
    for (let repeat = 0; repeat < 3; repeat++) {
      const response = await request.get(proof, { headers: { origin } });
      expect(await response.json()).toMatchObject({ remembered: true, expiresAt });
      expect(response.headers()['set-cookie']).toBeUndefined();
      time += 60_000;
    }
  } finally {
    await installation.close();
  }
});

test('untrusted choice fields and direct authentication routes cannot create remembered access', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  const { origin } = installation;
  try {
    await signIn(request, origin);
    for (const choice of [
      {},
      { rememberMe: 'true', informationVersion: 1 },
      { rememberMe: 1, informationVersion: 1 },
      { rememberMe: true },
      { rememberMe: true, informationVersion: 999 },
      { rememberMe: true, informationVersion: '1' },
      {
        additionalData: {
          rememberMe: true,
          informationVersion: 1,
          choiceSchemaVersion: 1,
          decidedAt: Date.now(),
          absoluteExpiresAt: Date.now() + 999_999_999,
        },
      },
    ]) {
      const proof = await login(request, origin, choice);
      expect(await (await request.get(proof, { headers: { origin } })).json()).toMatchObject({
        remembered: false,
      });
      expect(
        (await request.storageState()).cookies.find((item) => item.name.endsWith('session_token'))
          ?.expires,
      ).toBe(-1);
    }
    const before = await (await request.get(`${origin}/api/auth/get-session`)).json();
    expect(
      (await request.get(`${origin}/api/auth/sign-in/social`, { headers: { origin } })).status(),
    ).toBe(400);
    expect(
      (
        await request.post(`${origin}/api/auth/sign-in/social`, {
          headers: { origin },
          data: {
            provider: 'google',
            idToken: { token: 'forged' },
            rememberMe: true,
            informationVersion: 1,
          },
        })
      ).status(),
    ).toBe(400);
    for (const path of ['update-session', 'link-social', 'sign-in/email'])
      expect(
        (
          await request.post(`${origin}/api/auth/${path}`, {
            headers: { origin },
            data: { rememberMe: true },
          })
        ).status(),
      ).toBe(404);
    expect(
      (
        await request.post(`${origin}/api/auth/sign-in/social`, {
          headers: { origin: 'https://attacker.example' },
          data: { provider: 'google', rememberMe: true, informationVersion: 1 },
        })
      ).status(),
    ).toBe(403);
    expect(await (await request.get(`${origin}/api/auth/get-session`)).json()).toEqual(before);
  } finally {
    await installation.close();
  }
});

for (const remembered of [false, true]) {
  test(`${remembered ? 'remembered' : 'ordinary'} login ends exactly at its absolute deadline across reads and restart`, {
    tags: ['technical'],
    timeout: 30_000,
  }, async ({ request }) => {
    let time = Date.now();
    const installation = await createInstallation(undefined, { now: () => time });
    const { origin } = installation;
    try {
      await signIn(request, origin);
      const confirmation = await login(request, origin, {
        rememberMe: remembered,
        informationVersion: 1,
      });
      const expiresAt = time + (remembered ? 604_800_000 : 28_800_000);
      const read = () => request.get(confirmation, { headers: { origin } });
      expect(await (await read()).json()).toMatchObject({
        status: 'confirmed',
        remembered,
        informationVersion: 1,
        expiresAt,
        decidedAt: time,
      });
      const cookie = (await request.storageState()).cookies.find((item) =>
        item.name.endsWith('better-auth.session_token'),
      );
      expect(cookie?.expires).toBe(remembered ? Math.floor(expiresAt / 1000) : -1);
      if (remembered) time += 3_600_000;
      else
        await advanceActiveLogin(request, origin, 3_600_000, (elapsed) => {
          time += elapsed;
        });
      await installation.restart();
      expect(await (await read()).json()).toMatchObject({ expiresAt });
      if (remembered) time = expiresAt - 1;
      else
        await advanceActiveLogin(request, origin, expiresAt - 1 - time, (elapsed) => {
          time += elapsed;
        });
      expect((await read()).status()).toBe(200);
      expect(
        (await request.get(`${origin}/api/auth/get-session`)).headers()['set-cookie'],
      ).toBeUndefined();
      time = expiresAt;
      expect((await read()).status()).toBe(401);
      expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toMatchObject({
        status: 'anonymous',
      });
      expect(
        (
          await request.post(`${origin}/api/households`, {
            headers: { origin },
            data: { name: 'Too late' },
          })
        ).status(),
      ).toBe(401);
      const registration = await request.post(`${origin}/api/auth/oauth2/register`, {
        headers: { origin },
        data: {
          application_type: 'native',
          client_name: 'Boundary check',
          redirect_uris: ['http://127.0.0.1:7777/callback'],
          token_endpoint_auth_method: 'none',
        },
      });
      expect(registration.status()).toBe(201);
      expect(await registration.json()).not.toHaveProperty('user_id');
      expect(registration.headers()['set-cookie']).toBeUndefined();
      time += 1;
      expect(await (await request.get(`${origin}/api/auth/get-session`)).json()).toBeNull();
    } finally {
      await installation.close();
    }
  });
}
