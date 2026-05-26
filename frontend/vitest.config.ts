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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', '../shared/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**', '../shared/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/components/ui/StatusDot.tsx',
        'src/components/ui/AvatarInitials.tsx',
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
        '../shared/node_modules/**',
        'src/services/**/__tests__/**',
        'src/services/**/index.ts',
        'src/services/errors/journal.ts',
        'src/hooks/**/__tests__/**'
      ],
      thresholds: {
        statements: 55,
        branches: 50,
        functions: 50,
        lines: 58,
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
        // 1. Seuil de secours général des hooks : Tout nouveau hook créé doit obligatoirement avoir des tests (min 40%)
        'src/hooks/**/*.{ts,tsx}': {
          statements: 40,
          branches: 20,
          functions: 30,
          lines: 40
        },
        // 2. Exemptions temporaires explicites pour les dossiers/hooks legacy n'ayant pas encore de tests unitaires
        'src/hooks/{admin/agencies/actions/**,admin/users/access/**,directory/options/**,directory/views/**,entities/suppliers/**}': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        'src/hooks/{admin/agencies/core/useAgencies,admin/audit/useAuditLogsPanel,admin/users/identity/useCreateAdminUser,admin/users/identity/useUpdateUserIdentity,admin/users/identity/useAdminUserCreateDialog,cockpit/useCockpitDialogsState,cockpit/useCockpitFormRefs,cockpit-utils/useCockpitPaneProps,cockpit-utils/useCockpitRegisterFields,cockpit-utils/useCockpitConfigSnapshot,directory/company/useCitySuggestions,directory/company/useKnownCompanies,directory/company/useUnifiedCompanySearch,directory/core/useDirectoryPage,directory/core/useDirectoryRecord,directory/core/useDirectorySearchIndex,entities/clients/useClientContactDialogFields,entities/clients/useDeleteClient,entities/clients/useSaveClient,entities/clients/useClientArchived,entities/contacts/useEntityContacts,entities/contacts/useEntityContact,entities/core/useProductConfig,entities/prospects/useProspectDialogFields,entities/prospects/useSaveProspect,interactions/core/queries/useInteractionStepper,interactions/drafts/useInteractionFormEffects,interactions/drafts/useInteractionFormState,interactions/drafts/useInteractionGateState,interactions/handlers/useInteractionFocus,interactions/handlers/useInteractionIsValidHandler,session/useAppQueries,session/useAppSession,settings-state/useSettingsState.helpers}.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        'src/hooks/admin/agencies/core/useAgencyMembers.ts': {
          statements: 5,
          branches: 0,
          functions: 0,
          lines: 5
        },
        'src/hooks/cockpit-utils/useCockpitPhoneLookup.ts': {
          statements: 15,
          branches: 0,
          functions: 0,
          lines: 15
        },
        // 3. Seuils de couverture réels pour les hooks historiques qui possèdent des tests unitaires
        'src/hooks/cockpit/useCockpitFormController.ts': {
          statements: 80,
          branches: 45,
          functions: 25,
          lines: 84
        },
        'src/hooks/interactions/drafts/useInteractionDraft.ts': {
          statements: 75,
          branches: 60,
          functions: 90,
          lines: 80
        },
        'src/hooks/interactions/core/queries/useInteractionSearch.ts': {
          statements: 85,
          branches: 75,
          functions: 80,
          lines: 90
        },
        'src/hooks/interactions/core/actions/useInteractionSubmit.ts': {
          statements: 85,
          branches: 75,
          functions: 70,
          lines: 90
        },
        'src/hooks/admin/users/identity/useUsersManager.ts': {
          statements: 60,
          branches: 35,
          functions: 55,
          lines: 65
        },
        'src/hooks/admin/agencies/core/useAgenciesManager.ts': {
          statements: 80,
          branches: 50,
          functions: 80,
          lines: 85
        },
        'src/hooks/session/useChangePasswordState.ts': {
          statements: 80,
          branches: 60,
          functions: 100,
          lines: 85
        },
        'src/hooks/interactions/core/queries/useInteractions.ts': {
          statements: 80,
          branches: 75,
          functions: 100,
          lines: 80
        },
        'src/hooks/session/useLoginScreenForm.ts': {
          statements: 95,
          branches: 80,
          functions: 100,
          lines: 95
        },
        'src/hooks/admin/audit/useAuditLogs.ts': {
          statements: 90,
          branches: 80,
          functions: 100,
          lines: 95
        },
        'src/hooks/session/useAppSessionState.ts': {
          statements: 65,
          branches: 45,
          functions: 75,
          lines: 80
        },
        'src/hooks/settings-state/useSettingsState.ts': {
          statements: 35,
          branches: 15,
          functions: 15,
          lines: 40
        },
        'src/hooks/entities/clients/useClientContactDialog.ts': {
          statements: 70,
          branches: 75,
          functions: 60,
          lines: 75
        },
        'src/hooks/entities/prospects/useProspectFormDialog.ts': {
          statements: 95,
          branches: 80,
          functions: 100,
          lines: 95
        },
        'src/hooks/directory/company/useDirectoryCompanyDetails.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95
        },
        'src/hooks/directory/duplicates/useDirectoryDuplicates.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95
        },
        // 4. Utilitaires et schémas spécifiques aux hooks
        'src/hooks/interaction-draft/normalizeInteractionDraftValues.ts': {
          statements: 80,
          branches: 60,
          functions: 100,
          lines: 80
        },
        'src/hooks/settings-state/settingsFormSchema.ts': {
          statements: 85,
          branches: 40,
          functions: 100,
          lines: 85
        },
        'src/hooks/dashboard-state/useDashboardStatusHelpers.ts': {
          statements: 60,
          branches: 30,
          functions: 80,
          lines: 60
        },
        'src/components/ui/StatusDot.tsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        'src/components/ui/AvatarInitials.tsx': {
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
