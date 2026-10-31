import { beginAssistant, callAssistant } from '../../support/assistant.js';
import { createHousehold, signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { createInstallation, robin } from '../../support/installation.js';

test('browser replacement and logout deny old cookies while an independently consented MCP connection remains valid', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ playwright }) => {
  const app = await createInstallation();
  const browser = await playwright.request.newContext();
  let lost: Awaited<ReturnType<typeof playwright.request.newContext>> | undefined;
  try {
    await signIn(browser, app.origin);
    const { household } = await (await createHousehold(browser, app.origin)).json();
    const flow = await beginAssistant(browser, app.origin);
    const accepted = await flow.consent(household.id);
    expect(accepted.status()).toBe(200);
    const tokens = await flow.exchange((await accepted.json()).url);
    expect(tokens.status).toBe(200);
    const { access_token } = await tokens.json();
    const before = await browser.storageState();
    lost = await playwright.request.newContext({
      storageState: {
        cookies: before.cookies.filter((cookie) => !cookie.name.includes('binding')),
        origins: [],
      },
    });
    expect(await (await lost.get(`${app.origin}/api/auth/get-session`)).json()).toBeNull();
    const unbound = await beginAssistant(lost, app.origin);
    expect(new URL(unbound.consentUrl).searchParams.get('code')).toBeNull();
    expect((await unbound.consent(household.id)).status()).toBe(401);
    expect(
      (
        await lost.post(`${app.origin}/api/auth/sign-out`, {
          headers: { origin: app.origin },
          data: {},
        })
      ).status(),
    ).toBe(401);
    app.setIdentity(robin);
    await signIn(browser, app.origin, 'microsoft');
    expect((await callAssistant(app.origin, access_token, 'read_map')).status).toBe(200);
    expect(
      (
        await browser.post(`${app.origin}/api/auth/sign-out`, {
          headers: { origin: app.origin },
          data: {},
        })
      ).status(),
    ).toBe(200);
    expect((await callAssistant(app.origin, access_token, 'read_map')).status).toBe(200);
    await lost.addCookies(before.cookies);
    expect(await (await lost.get(`${app.origin}/api/auth/get-session`)).json()).toBeNull();
    expect((await unbound.consent(household.id)).status()).toBe(401);
  } finally {
    await browser.dispose();
    await lost?.dispose();
    await app.close();
  }
});
