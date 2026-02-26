import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'jsdom',
    testTimeout: 10000,
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/services/admin/**/*.ts',
        'src/services/agency/**/*.ts',
        'src/services/api/**/*.ts',
        'src/services/auth/**/*.ts',
        'src/services/entities/**/*.ts',
        'src/services/errors/**/*.ts'
      ],
      exclude: [
        'src/services/**/__tests__/**',
        'src/services/**/index.ts',
        'src/services/errors/journal.ts'
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
});
