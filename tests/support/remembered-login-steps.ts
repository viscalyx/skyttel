import { type APIRequestContext, expect } from '@playwright/test';
import { activateRememberedLogin } from './client.js';

export async function login(
  client: APIRequestContext,
  origin: string,
  choice: Record<string, unknown>,
) {
  const start = await client.post(`${origin}/api/auth/sign-in/social`, {
    headers: { origin },
    data: { provider: 'google', callbackURL: '/', ...choice },
  });
  expect(start.status()).toBe(200);
  const response = await client.get((await start.json()).url, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  if (choice.rememberMe === true && choice.informationVersion === 1)
    await activateRememberedLogin(client, origin);
  const proof = new URL(response.headers().location, origin).searchParams.get('loginConfirmation');
  expect(proof).toMatch(/^[a-f0-9]{64}$/);
  return `${origin}/api/browser-binding/confirmation?proof=${proof}`;
}
