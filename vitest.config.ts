import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',

    // CRITICAL: ONLY run unit tests
    include: ['src/__tests__/**/*.test.{ts,tsx}'],

    // EXCLUDE EVERYTHING ELSE
    exclude: [
      'node_modules',
      'dist',
      'e2e',
      'playwright',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ]
  }
});
