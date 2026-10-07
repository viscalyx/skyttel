import { defineConfig } from '@playwright/test';

process.env.PLAYWRIGHT_HTML_PORT ??= '9324';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
});
