import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: ['./src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/index.ts',
        'src/version.ts'
      ]
    }
  }
});
