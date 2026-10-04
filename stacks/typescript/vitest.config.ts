import { defineConfig } from 'vitest/config';

const BUSINESS_LOGIC_THRESHOLD = { lines: 90, branches: 90, functions: 90, statements: 90 };

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // DI decorators register metadata at import time, before any test runs.
    setupFiles: ['reflect-metadata'],
    env: { LOG_LEVEL: 'silent' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
      // Gated only where business rules live; elsewhere coverage is a signal, not a target.
      thresholds: {
        'src/modules/*/domain/**': BUSINESS_LOGIC_THRESHOLD,
        'src/modules/*/application/**': BUSINESS_LOGIC_THRESHOLD,
      },
    },
  },
});
