import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['research/voice-expiry-fallback/*.probe.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
