import * as playwright from '@playwright/test';
import { test as base } from 'vitest';

// Preserve real HTTP, cookie jars and redirects without starting a browser.
export const test = base.extend<{
  playwright: typeof playwright;
  request: playwright.APIRequestContext;
}>({
  playwright,
  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    try {
      await use(request);
    } finally {
      await request.dispose();
    }
  },
});

export { expect } from '@playwright/test';
