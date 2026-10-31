import { randomUUID } from 'node:crypto';
import { activateRememberedLogin, signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { alex, createInstallation, robin } from '../../support/installation.js';
import { revoke } from '../../support/remembered-revocation-steps.js';

test('only the authenticated owner can read the committed result until its exact original 24-hour boundary', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ playwright }) => {
  let time = Date.now();
  const installation = await createInstallation(undefined, { now: () => time });
  const { origin } = installation;
  const owner = await playwright.request.newContext();
  const wrongOwner = await playwright.request.newContext();
  const anonymous = await playwright.request.newContext();
  try {
    await signIn(owner, origin);
    const result = await revoke(owner, origin);
    const path = `${origin}/api/browser-binding/results/${result.id}`;
    expect((await anonymous.get(path, { headers: { origin } })).status()).toBe(401);
    installation.setIdentity(robin);
    await signIn(wrongOwner, origin, 'microsoft');
    expect((await wrongOwner.get(path, { headers: { origin } })).status()).toBe(404);
    expect(
      (await owner.get(path, { headers: { origin: 'https://attacker.example' } })).status(),
    ).toBe(403);
    installation.setIdentity(alex);
    time += 86_399_999;
    await signIn(owner, origin);
    expect(await (await owner.get(path, { headers: { origin } })).json()).toMatchObject({
      id: result.id,
      completedAt: result.completedAt,
      checkUntil: result.completedAt + 86_400_000,
    });
    time += 1;
    expect((await owner.get(path, { headers: { origin } })).status()).toBe(404);
    expect(
      (
        await owner.post(`${origin}/api/browser-binding/revoke`, {
          headers: { origin },
          data: { id: result.id },
        })
      ).status(),
    ).toBe(409);
    expect(await (await owner.get(`${origin}/api/auth/get-session`)).json()).not.toBeNull();
  } finally {
    await owner.dispose();
    await wrongOwner.dispose();
    await anonymous.dispose();
    await installation.close();
  }
});

for (const stage of ['verified proof', 'verifying add', 'linked accounts'] as const) {
  test(`revocation ${stage === 'linked accounts' ? 'preserves' : 'clears'} ${stage} without granting late account-linking effects`, {
    tags: ['technical'],
    timeout: 30_000,
  }, async ({ playwright }) => {
    const installation = await createInstallation();
    const { origin } = installation;
    const client = await playwright.request.newContext();
    const independent = await playwright.request.newContext();
    let resume = () => {};
    try {
      await signIn(client, origin);
      await signIn(independent, origin);
      const link = async (step: string, provider: string) => {
        const response = await client.post(`${origin}/api/login-methods/${step}`, {
          headers: { origin },
          data: { provider },
        });
        expect(response.status()).toBe(200);
        return (await response.json()).url as string;
      };
      await client.get(await link('prove', 'google'), { maxRedirects: 0 });
      if (stage === 'linked accounts') {
        installation.setIdentity({ ...alex, subject: 'linked-microsoft' });
        await client.get(await link('add', 'microsoft'), { maxRedirects: 0 });
        installation.setIdentity(alex);
      }
      let pending: Promise<import('@playwright/test').APIResponse> | undefined;
      if (stage === 'verifying add') {
        const callback = await link('add', 'microsoft');
        const paused = installation.pauseNextProvider();
        resume = paused.resume;
        installation.setIdentity({ ...alex, subject: 'uncommitted-microsoft' });
        pending = client.get(callback, { maxRedirects: 0 });
        await paused.reached;
      }
      await revoke(client, origin);
      if (pending) {
        resume();
        expect((await pending).headers().location).toBe(`${origin}/?error=binding_invalid`);
      }
      const providers = stage === 'linked accounts' ? ['google', 'microsoft'] : ['google'];
      expect(await (await client.get(`${origin}/api/login-methods`)).json()).toMatchObject({
        providers,
        stage: null,
      });
      expect(await (await independent.get(`${origin}/api/login-methods`)).json()).toMatchObject({
        providers,
      });
      expect(
        (
          await client.post(`${origin}/api/login-methods/add`, {
            headers: { origin },
            data: { provider: 'microsoft' },
          })
        ).status(),
      ).toBe(409);
    } finally {
      resume();
      await client.dispose();
      await independent.dispose();
      await installation.close();
    }
  });
}

test('revocation rotates the current key and binding while preserving the session and durable owner result', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ playwright }) => {
  let time = Date.now();
  const installation = await createInstallation(undefined, { now: () => time });
  const { origin } = installation;
  let client = await playwright.request.newContext();
  let old: typeof client | undefined;
  const independent = await playwright.request.newContext();
  try {
    await signIn(client, origin);
    const start = await client.post(`${origin}/api/auth/sign-in/social`, {
      headers: { origin },
      data: { provider: 'google', callbackURL: '/', rememberMe: true, informationVersion: 1 },
    });
    const completed = await client.get((await start.json()).url, { maxRedirects: 0 });
    await activateRememberedLogin(client, origin);
    const proof = new URL(completed.headers().location).searchParams.get('loginConfirmation');
    const before = await (await client.get(`${origin}/api/auth/get-session`)).json();
    const saved = await client.storageState();
    old = await playwright.request.newContext({ storageState: saved });
    time += 86_400_000;
    await signIn(independent, origin);
    const id = randomUUID();
    const response = await client.post(`${origin}/api/browser-binding/revoke`, {
      headers: { origin },
      data: { id },
    });
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      id,
      status: 'completed',
      remembered: false,
      expiresAt: time + 28_800_000,
      inactiveAfterMs: 1_800_000,
    });
    expect(
      response
        .headersArray()
        .filter((item) => item.name.toLowerCase() === 'set-cookie')
        .every((item) => !/expires=|max-age=/i.test(item.value)),
    ).toBe(true);
    expect(await (await old.get(`${origin}/api/auth/get-session`)).json()).toBeNull();
    // Auth without the positively registered replacement binding grants no access.
    expect(await (await client.get(`${origin}/api/auth/get-session`)).json()).toBeNull();
    await client.addCookies([
      { name: result.cookieName, value: result.candidate, url: origin, sameSite: 'Lax' },
    ]);
    expect(
      (
        await client.post(`${origin}/api/browser-binding/register`, {
          headers: { origin },
          data: {},
        })
      ).status(),
    ).toBe(200);
    expect(await (await client.get(`${origin}/api/auth/get-session`)).json()).toMatchObject({
      session: { id: before.session.id },
    });
    expect(
      (
        await client.get(`${origin}/api/browser-binding/confirmation?proof=${proof}`, {
          headers: { origin },
        })
      ).status(),
    ).toBe(401);
    expect(
      await (
        await client.get(`${origin}/api/browser-binding/preference`, { headers: { origin } })
      ).json(),
    ).toMatchObject({ remembered: false, expiresAt: time + 28_800_000 });
    const resultPath = `${origin}/api/browser-binding/results/${id}`;
    expect(await (await independent.get(resultPath, { headers: { origin } })).json()).toMatchObject(
      { id, status: 'completed' },
    );
    const state = await client.storageState();
    await client.dispose();
    await installation.restart();
    client = await playwright.request.newContext({ storageState: state });
    expect(await (await client.get(resultPath, { headers: { origin } })).json()).toMatchObject({
      id,
      status: 'completed',
    });
    time += 60_000;
    expect(
      (
        await client.post(`${origin}/api/browser-binding/revoke`, {
          headers: { origin },
          data: { id: randomUUID() },
        })
      ).status(),
    ).toBe(200);
    expect(await (await independent.get(resultPath, { headers: { origin } })).json()).toMatchObject(
      { expiresAt: time - 60_000 + 28_800_000 },
    );
  } finally {
    await client.dispose();
    await old?.dispose();
    await independent.dispose();
    await installation.close();
  }
});
