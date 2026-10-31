import { createHousehold, signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { alex, createInstallation } from '../../support/installation.js';
import { linkStep } from '../../support/linking-steps.js';

test('both proven providers return to the same user and household', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request }) => {
  const installation = await createInstallation();
  const { origin } = installation;
  try {
    await signIn(request, origin);
    await createHousehold(request, origin);
    const before = await (await request.get(`${origin}/api/bootstrap`)).json();
    const prove = await request.post(`${origin}/api/login-methods/prove`, {
      headers: { origin },
      data: { provider: 'google' },
    });
    expect(prove.status()).toBe(200);
    await request.get((await prove.json()).url);
    expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toEqual(before);
    installation.setIdentity({ ...alex, subject: 'alex-private-microsoft' });
    const add = await request.post(`${origin}/api/login-methods/add`, {
      headers: { origin },
      data: { provider: 'microsoft' },
    });
    expect(add.status()).toBe(200);
    await request.get((await add.json()).url);
    expect(await (await request.get(`${origin}/api/login-methods`)).json()).toEqual({
      providers: ['google', 'microsoft'],
      stage: 'complete',
    });
    expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toEqual(before);
    await installation.restart();
    expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toEqual(before);
    await request.post(`${origin}/api/auth/sign-out`, { headers: { origin }, data: {} });
    await signIn(request, origin, 'microsoft');
    const { loginId: originalLoginId, ...originalIdentity } = before;
    const { loginId, ...identity } = await (await request.get(`${origin}/api/bootstrap`)).json();
    expect(originalLoginId).toEqual(expect.any(String));
    expect(loginId).toEqual(expect.any(String));
    expect(loginId).not.toBe(originalLoginId);
    expect(identity).toEqual(originalIdentity);
  } finally {
    await installation.close();
  }
});

for (const failure of [
  'wrong identity',
  'denied consent',
  'provider failure',
  'cancelled',
] as const) {
  test(`existing identity proof preserves access after ${failure}`, {
    tags: ['technical'],
    timeout: 30_000,
  }, async ({ request }) => {
    const installation = await createInstallation();
    const { origin } = installation;
    try {
      await signIn(request, origin);
      await createHousehold(request, origin);
      const before = await (await request.get(`${origin}/api/bootstrap`)).json();
      if (failure === 'denied consent') installation.denyConsent(true);
      const url = await linkStep(request, origin, 'prove', 'google');
      if (failure === 'wrong identity') installation.setIdentity({ ...alex, subject: 'impostor' });
      if (failure === 'provider failure') installation.failProvider(true);
      if (failure === 'cancelled')
        await request.post(`${origin}/api/login-methods/cancel`, { headers: { origin }, data: {} });
      await request.get(url);
      expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toEqual(before);
      expect((await (await request.get(`${origin}/api/login-methods`)).json()).providers).toEqual([
        'google',
      ]);
      expect(
        (
          await request.post(`${origin}/api/login-methods/add`, {
            headers: { origin },
            data: { provider: 'microsoft' },
          })
        ).status(),
      ).toBe(409);
    } finally {
      await installation.close();
    }
  });
}

for (const failure of [
  'occupied identity',
  'denied consent',
  'provider failure',
  'cancelled',
] as const) {
  test(`new identity proof preserves both users after ${failure}`, {
    tags: ['technical'],
    timeout: 30_000,
  }, async ({ request, playwright }) => {
    const installation = await createInstallation();
    const { origin } = installation;
    const other = await playwright.request.newContext();
    try {
      installation.setIdentity({ ...alex, subject: 'other-microsoft' });
      await signIn(other, origin, 'microsoft');
      const otherBefore = await (await other.get(`${origin}/api/bootstrap`)).json();
      installation.setIdentity(alex);
      await signIn(request, origin);
      await createHousehold(request, origin);
      const before = await (await request.get(`${origin}/api/bootstrap`)).json();
      expect(otherBefore.user.id).not.toBe(before.user.id);
      await request.get(await linkStep(request, origin, 'prove', 'google'));
      installation.setIdentity({
        ...alex,
        subject: failure === 'occupied identity' ? 'other-microsoft' : 'new-microsoft',
      });
      if (failure === 'denied consent') installation.denyConsent(true);
      const url = await linkStep(request, origin, 'add', 'microsoft');
      if (failure === 'provider failure') installation.failProvider(true);
      if (failure === 'cancelled')
        await request.post(`${origin}/api/login-methods/cancel`, { headers: { origin }, data: {} });
      await request.get(url);
      expect(await (await request.get(`${origin}/api/bootstrap`)).json()).toEqual(before);
      expect(await (await other.get(`${origin}/api/bootstrap`)).json()).toEqual(otherBefore);
      expect((await (await request.get(`${origin}/api/login-methods`)).json()).providers).toEqual([
        'google',
      ]);
    } finally {
      await other.dispose();
      await installation.close();
    }
  });
}

test('linking requires the original session, explicit proof and same-origin requests', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ request, playwright }) => {
  const installation = await createInstallation();
  const { origin } = installation;
  const other = await playwright.request.newContext();
  try {
    expect(
      (
        await request.post(`${origin}/api/login-methods/prove`, {
          headers: { origin },
          data: { provider: 'google' },
        })
      ).status(),
    ).toBe(401);
    await signIn(request, origin);
    expect(
      (
        await request.post(`${origin}/api/login-methods/prove`, {
          headers: { origin: 'https://elsewhere.example' },
          data: { provider: 'google' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`${origin}/api/login-methods/add`, {
          headers: { origin },
          data: { provider: 'microsoft' },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await request.post(`${origin}/api/auth/link-social`, {
          headers: { origin },
          data: { provider: 'microsoft' },
        })
      ).status(),
    ).toBe(404);
    const url = await linkStep(request, origin, 'prove', 'google');
    await signIn(other, origin);
    await other.get(url);
    expect((await (await request.get(`${origin}/api/login-methods`)).json()).stage).toBe('prove');
    const tampered = new URL(url);
    tampered.searchParams.set('state', 'invalid-state');
    await request.get(tampered.href);
    expect((await (await request.get(`${origin}/api/login-methods`)).json()).stage).toBe('prove');
  } finally {
    await other.dispose();
    await installation.close();
  }
});
