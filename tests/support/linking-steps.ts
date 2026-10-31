import { expect } from './test.js';

export async function linkStep(
  client: import('@playwright/test').APIRequestContext,
  origin: string,
  step: string,
  provider: string,
) {
  const response = await client.post(`${origin}/api/login-methods/${step}`, {
    headers: { origin },
    data: { provider },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).url as string;
}
