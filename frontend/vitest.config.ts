import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      shared: path.resolve(__dirname, '../shared')
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
        'src/components/ui/status-dot.tsx',
        'src/components/ui/avatar-initials.tsx',
        'src/services/admin/**/*.ts',
        'src/services/agency/**/*.ts',
        'src/services/api/**/*.ts',
        'src/services/auth/**/*.ts',
        'src/services/clients/**/*.ts',
        'src/services/config/**/*.ts',
        'src/services/entities/**/*.ts',
        'src/services/errors/**/*.ts',
        'src/services/interactions/**/*.ts',
        'src/services/query/**/*.ts',
        'src/services/supabase/**/*.ts',
        'src/hooks/**/*.ts',
        'src/hooks/**/*.tsx',
        'src/utils/date/formatRelativeTime.ts'
      ],
      exclude: [
        'src/services/**/__tests__/**',
        'src/services/**/index.ts',
        'src/services/errors/journal.ts',
        'src/hooks/**/__tests__/**'
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
        'src/services/admin/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/services/agency/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/services/api/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/services/auth/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/services/entities/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/services/errors/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        },
        'src/hooks/**/*.{ts,tsx}': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        'src/hooks/{useInteractionDraft,useCockpitFormController}.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 80
        },
        'src/hooks/{useSettingsState,useInteractionSearch,useInteractionSubmit,useUsersManager,useAgenciesManager,useChangePasswordState}.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 70
        },
        'src/hooks/{useClients,useProspects,useInteractions,useLoginScreenForm,useAuditLogs,useAppSessionState}.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 50
        },
        'src/components/ui/status-dot.tsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        'src/components/ui/avatar-initials.tsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        'src/utils/date/formatRelativeTime.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    }
  }
});
