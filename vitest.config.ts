import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
    pool: 'threads',
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e/**',
      '**/*.e2e.*',
      'playwright/**'
    ],
  },
})
