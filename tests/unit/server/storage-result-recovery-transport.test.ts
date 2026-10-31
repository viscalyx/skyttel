import { restartWithSession, signIn } from '../../support/client.js';
import { expect, test } from '../../support/http-test.js';
import { alex, createInstallation, robin } from '../../support/installation.js';

test('result reads require the exact owner and retain their original 24-hour limit after restart', {
  tags: ['technical'],
  timeout: 30_000,
}, async ({ playwright }) => {
  let time = Date.now();
  const installation = await createInstallation(undefined, { now: () => time });
  const { origin } = installation;
  let owner = await playwright.request.newContext();
  const other = await playwright.request.newContext();
  const anonymous = await playwright.request.newContext();
  try {
    await signIn(owner, origin);
    const id = crypto.randomUUID();
    const response = await owner.post(`${origin}/api/browser-binding/revoke`, {
      headers: { origin },
      data: { id },
    });
    expect(response.status()).toBe(200);
    const result = await response.json();
    const path = `${origin}/api/browser-binding/results/${id}`;
    expect((await owner.get(path, { headers: { origin } })).status()).toBe(401);
    expect(
      (await anonymous.get(path, { headers: { 'sec-fetch-site': 'same-origin' } })).status(),
    ).toBe(401);
    owner = await restartWithSession(owner, () => installation.restart());
    await signIn(owner, origin);
    installation.setIdentity(robin);
    await signIn(other, origin, 'microsoft');
    expect((await other.get(path, { headers: { origin } })).status()).toBe(404);
    installation.setIdentity(alex);
    time = result.completedAt + 86_399_999;
    await signIn(owner, origin);
    const recovered = await owner.get(path, { headers: { origin } });
    expect(recovered.status()).toBe(200);
    expect(await recovered.json()).toMatchObject({
      id,
      status: 'completed',
      completedAt: result.completedAt,
      checkUntil: result.completedAt + 86_400_000,
    });
    time++;
    expect((await owner.get(path, { headers: { origin } })).status()).toBe(404);
    time++;
    expect((await owner.get(path, { headers: { origin } })).status()).toBe(404);
    const before = await (
      await owner.get(`${origin}/api/browser-binding/preference`, { headers: { origin } })
    ).json();
    expect(
      (
        await owner.post(`${origin}/api/browser-binding/revoke`, {
          headers: { origin },
          data: { id },
        })
      ).status(),
    ).toBe(409);
    expect(
      await (
        await owner.get(`${origin}/api/browser-binding/preference`, { headers: { origin } })
      ).json(),
    ).toEqual(before);
  } finally {
    await owner.dispose();
    await other.dispose();
    await anonymous.dispose();
    await installation.close();
  }
});
