import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect } from './test.js';

export async function revoke(client: APIRequestContext, origin: string) {
  const response = await client.post(`${origin}/api/browser-binding/revoke`, {
    headers: { origin },
    data: { id: randomUUID() },
  });
  expect(response.status()).toBe(200);
  const result = await response.json();
  await client.addCookies([
    {
      name: result.cookieName,
      value: result.candidate,
      url: origin,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  expect(
    (
      await client.post(`${origin}/api/browser-binding/register`, { headers: { origin }, data: {} })
    ).status(),
  ).toBe(200);
  return result;
}
