import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['research/voice-task-extension/*.probe.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
