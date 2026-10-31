import { defineConfig } from '@playwright/test';
import integration from './playwright.config.js';

// Browser cookie delivery and public preparation launchers need a real browser
// plus Node-owned installations. Component rendering stays in Vitest graphics.
export default defineConfig({
  ...integration,
  testDir: './tests/technical-browser',
  outputDir: 'test-results/technical-browser',
});
