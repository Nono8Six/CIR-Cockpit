# Audit Frontend - CIR Cockpit

Date: 2026-02-27
Perimetre: frontend complet (`frontend/`), plus coherence avec `shared/`
Methodes: lecture code, scans statiques (rg), QA evidence existante, verifications React/TanStack/UI guidelines
Skills utilises: `vercel-react-best-practices`, `web-design-guidelines`
References externes: React docs (Context7), TanStack Query docs (Context7), Vercel Web Interface Guidelines

## Phase 1 - Inventaire & couverture

- Fichiers frontend scannes: 538
- Hotspots > 150 lignes (frontend): 20+
- Plus gros fichiers frontend:
  - `frontend/src/hooks/useDashboardState.tsx` (392)
  - `frontend/src/components/ClientList.tsx` (336)
  - `frontend/src/hooks/useClientsPanelState.ts` (331)
  - `frontend/src/components/ProspectList.tsx` (324)
  - `frontend/src/App.tsx` (297)

## Phase 2 - Scorecard frontend (notes /100)

| Axe | Note | Commentaire court |
|---|---:|---|
| Architecture globale | 82 | Structure saine, mais orchestrateurs encore trop lourds |
| Routing & navigation | 74 | Route tree present, mais routes enfants `component: () => null` |
| Etat & data fetching | 88 | TanStack Query bien applique, invalidations/prefetch existants |
| Qualite code & lisibilite | 84 | Bonne hygiene globale, quelques gros hotspots |
| Tests frontend | 90 | Bon socle tests + couverture globale forte |
| Accessibilite & UI robustness | 78 | Bonne base, mais certains garde-fous eslint a11y/hooks desactives |
| Performance frontend | 82 | Bonne base, `manualChunks` perfectible |
| Securite frontend | 88 | Pipeline erreurs propre, pas de patterns interdits trouves |
| Conformite stack cible | 86 | Alignement global bon, drift doc/version a corriger |
| **Moyenne frontend** | **84** | **Solide, mais encore des dettes de maintainabilite** |

## Phase 3 - Findings majeurs (ordonnes)

### F-1 (Majeur) - Routage partiellement declaratif

- Evidence:
  - `frontend/src/app/router.tsx:20`
  - `frontend/src/app/router.tsx:26`
  - `frontend/src/app/router.tsx:32`
  - `frontend/src/app/router.tsx:38`
  - `frontend/src/app/router.tsx:44`
- Observation: les routes metier enfants existent mais retournent `null`, et l'orchestration reste centralisee dans `App.tsx`.
- Impact: limite le benefice de la route composition, du split par route et de la clarte d'isolation des tabs.
- Reco: basculer vers des route components explicites (layout + route views), conserver `App` comme shell minimal.

### F-2 (Majeur) - `App.tsx` reste un mega orchestrateur

- Evidence:
  - `frontend/src/App.tsx:47` (orchestrateur)
  - `frontend/src/App.tsx:53` a `:58` (etat UI multiple)
  - `frontend/src/App.tsx:153` et `:159` (effects transverses)
- Observation: logique session/navigation/search/dialogs/prefetch/conversion concentree.
- Impact: augmente le cout de changement et le risque regressif transverse.
- Reco: extraire 3 couches:
  - shell routing/navigation
  - search orchestration
  - entity conversion workflow

### F-3 (Majeur) - Garde-fous lint volontairement abaisses

- Evidence:
  - `frontend/eslint.config.js:106` (`label-has-associated-control` off)
  - `frontend/eslint.config.js:116` (`set-state-in-effect` off)
  - `frontend/eslint.config.js:117` (`preserve-manual-memoization` off)
  - `frontend/eslint.config.js:119` (`react-hooks/refs` off)
- Observation: ces exceptions peuvent etre legitimes localement, mais affaiblissent la detection automatique de regressions.
- Impact: dette qualitative progressive si pas compensee par revues strictes.
- Reco: re-activer progressivement avec allowlist locale par fichier, pas globalement.

### F-4 (Moyen) - `allowJs: true` en TS strict

- Evidence:
  - `frontend/tsconfig.json:20`
- Observation: incoherent avec une politique "strict TS" tres exigeante.
- Impact: autorise des regressions de typing si du JS revient dans le code applicatif.
- Reco: passer a `allowJs: false` (ou scope restreint sur scripts hors `src/`).

### F-5 (Moyen) - Strategie `manualChunks` trop agregee

- Evidence:
  - `frontend/vite.config.ts:45` (chunk `supabase`)
  - `frontend/vite.config.ts:47` a `:50` (`@trpc/*` force dans `supabase`)
  - `frontend/vite.config.ts:86` (fallback `ui-primitives`)
- Observation: melange de domaines techniques differents dans memes chunks.
- Impact: invalidation cache plus large que necessaire; risque de telechargements inutiles.
- Reco: separer au moins `trpc-core`, `supabase-core`, `ui-core`.

### F-6 (Moyen) - Imports relatifs profonds vers `shared`

- Evidence: multiples `../../../shared/...` et `../../../../shared/...` detectes par scan.
- Observation: contredit l'intention d'alias lisibles et augmente le couplage chemin.
- Impact: refactors dossiers plus fragiles.
- Reco: ajouter alias workspace pour `shared/*` (ex: `@shared/*`) et migrer graduellement.

### F-7 (Moyen) - Trou de couverture sur mapper critique

- Evidence (lcov):
  - `frontend/coverage/lcov.info` section `SF:src/services/errors/mapDataDomainError.ts`
  - `FNH:0`, `LH:0`
  - fichier source: `frontend/src/services/errors/mapDataDomainError.ts:45`
- Observation: mapper d'erreur data non teste alors qu'il influence retry/notif UX.
- Impact: risque d'erreur silencieuse en production sur cas edge.
- Reco: ajouter tests unitaire pour pass-through + remap + fallback source.

## Phase 4 - Bonnes pratiques confirmees

- Pas de `throw new Error(` hors tests dans frontend.
- Pas de `console.error(` hors tests dans frontend.
- `toast.error` limite a `frontend/src/services/errors/notify.ts:36`.
- Pattern QueryClient correct (`retry` conditionnel, delai exponentiel): `frontend/src/services/query/queryClient.ts:7` a `:23`.
- Pattern preload lazy utile dans `App.tsx` (`preloadAppSearchOverlay`, `preloadConvertClientDialog`).

## Phase 5 - Alignement stack cible vs stack.md

### Alignement OK

- React 19 + Vite 7 + TS 5.9 + TanStack Query v5 + RHF + Zod v4: en place.
- Refactor orientee hooks/services/query cache: coherent avec `Plan_refactoring.md`.

### Ecarts a corriger

- `docs/stack.md` n'est plus totalement a jour vs versions et sous-stack effective.
- Exemples de drift observes au 2026-02-27:
  - `@playwright/test`: repo `^1.49.2` vs latest `1.58.2`
  - `tailwindcss`: repo `4.1.18` vs latest `4.2.1`
  - `@supabase/supabase-js`: repo `^2.95.3` vs latest `2.98.0`
  - `hono`: repo `^4.11.9` vs latest `4.12.3`

## Plan amelioration frontend (priorise)

1. Elever le niveau routing (split par route concret) - impact fort, cout moyen.
2. Decouper `App.tsx` en orchestrateurs specialises - impact fort, cout moyen.
3. Reintroduire regles eslint hooks/a11y progressivement - impact moyen/fort, cout faible/moyen.
4. Corriger le trou de test `mapDataDomainError` - impact moyen, cout faible.
5. Refactor `manualChunks` pour cache granulaire - impact moyen, cout faible.
6. Migrer imports `shared` vers alias dedie - impact moyen, cout moyen.

## Annexe - Scoring fichier par fichier
| Path | Lines | Score/100 | Note |
|---|---:|---:|---|
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\.env | 0 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\.env.e2e | 0 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\.env.example | 0 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\components.json | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\admin-settings-p07.spec.ts | 133 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\auth.spec.ts | 89 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\clients-p05.spec.ts | 148 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\dashboard-p06.spec.ts | 178 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\navigation.spec.ts | 198 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\e2e\search.spec.ts | 131 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\eslint.config.js | 120 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\index.html | 14 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\metadata.json | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\package.json | 89 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\playwright.config.ts | 44 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\postcss.config.cjs | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\scripts\check-error-compliance.mjs | 144 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\scripts\generate-rpc-types.mjs | 116 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\__tests__\mocks\supabase.ts | 19 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\__tests__\setup.ts | 18 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\__tests__\test-utils.tsx | 26 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\App.tsx | 297 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\__tests__\appRoutes.test.ts | 27 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\__tests__\useAppShortcuts.test.tsx | 62 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\appConstants.tsx | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\appRoutes.ts | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\getAppGate.tsx | 89 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\router.tsx | 54 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\useAppSearchData.ts | 91 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\useAppShortcuts.ts | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\app\useProfileMenuDismiss.ts | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\AgencyFormDialog.test.tsx | 37 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\AppMainStateView.test.tsx | 43 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\AppSearchOverlay.test.tsx | 90 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\ChangePasswordScreen.test.tsx | 40 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\ErrorBoundary.test.tsx | 19 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\LoginScreen.test.tsx | 47 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\__tests__\UserMembershipDialog.test.tsx | 31 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AdminPanel.tsx | 40 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\agencies\AgenciesManagerDialogs.tsx | 76 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\agencies\AgenciesManagerHeader.tsx | 33 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\agencies\AgenciesManagerList.tsx | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\agencies\AgenciesManagerSearch.tsx | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\agencies\AgencyCard.tsx | 55 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AgenciesManager.tsx | 68 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AgencyFormDialog.tsx | 77 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeader.types.ts | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeaderBrandSection.tsx | 72 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeaderProfileMenu.tsx | 77 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeaderSearchButton.tsx | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeaderStatusSection.tsx | 10 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-header\AppHeaderTabsSection.tsx | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-main\AppMainContent.types.ts | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-main\AppMainStateView.tsx | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-main\AppMainTabContent.tsx | 157 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchClientsSection.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchContactsSection.tsx | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchFooter.tsx | 14 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchInteractionsSection.tsx | 45 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchProspectsSection.tsx | 45 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\app-search\AppSearchResults.tsx | 40 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AppHeader.tsx | 75 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AppMainContent.tsx | 60 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AppSearchOverlay.tsx | 203 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AppSessionProvider.tsx | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\__tests__\AuditLogsDateRange.test.tsx | 35 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\__tests__\AuditLogsFilters.test.tsx | 86 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\AuditLogsDateRange.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\AuditLogsFilters.tsx | 94 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\AuditLogsHeader.tsx | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\AuditLogsRow.tsx | 45 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\audit-logs\AuditLogsTable.tsx | 79 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\AuditLogsPanel.tsx | 58 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordActions.tsx | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordError.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordFields.tsx | 77 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordFields.types.ts | 14 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordHeader.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\change-password\ChangePasswordRules.tsx | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ChangePasswordScreen.tsx | 78 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-detail\ClientDetailContactsSection.tsx | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-detail\ClientDetailEmptyState.tsx | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-detail\ClientDetailHeader.tsx | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-detail\ClientDetailInfoGrid.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-detail\ClientDetailPanel.types.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormAccountSection.tsx | 80 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormAddressSection.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormAgencySection.tsx | 80 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormCodesSection.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormContent.tsx | 98 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormFooter.tsx | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormHeader.tsx | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormIdentitySection.tsx | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\client-form\ClientFormNotesSection.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientContactDialog.tsx | 88 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientContactsList.tsx | 71 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientDetailPanel.tsx | 48 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientFormDialog.tsx | 104 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientList.test.tsx | 85 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientList.tsx | 336 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\buildClientsPanelSectionProps.ts | 102 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanel.shared.ts | 1 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanel.types.ts | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelConfirmDialogs.tsx | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelContent.tsx | 75 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelContent.types.ts | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelDetailPane.tsx | 70 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelDialogs.tsx | 59 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelDialogs.types.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelEntityDialogs.tsx | 72 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelLayout.tsx | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelListPane.tsx | 129 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelSearchControls.tsx | 80 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelTitle.tsx | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelToolbar.tsx | 66 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelToolbarActions.tsx | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\clients\ClientsPanelViewModeTabs.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ClientsPanel.tsx | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\buildCockpitLeftEntitySectionsProps.ts | 119 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitForm.types.ts | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitFormDialogs.tsx | 69 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitFormHeader.tsx | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitFormLeftPane.tsx | 57 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitFormRightPane.tsx | 64 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitLeftEntitySectionsProps.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\CockpitPaneTypes.ts | 100 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitChannelSection.tsx | 96 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitClientContactSection.tsx | 51 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitClientContactSelector.tsx | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitCompanyCityField.tsx | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitCompanyInput.tsx | 81 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactNameFields.tsx | 58 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactPhoneEmailFields.tsx | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactPhoneField.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactPositionField.tsx | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactSection.tsx | 74 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitContactSection.types.ts | 40 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitFieldError.tsx | 12 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitIdentityEditor.tsx | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitIdentityHints.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitIdentitySection.tsx | 75 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitInteractionTypeSection.tsx | 62 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitManualContactForm.tsx | 66 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitManualContactForm.types.ts | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitManualContactSection.tsx | 54 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitRelationSection.tsx | 106 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitSearchSection.tsx | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitSelectedContactCard.tsx | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitSelectedEntityCard.tsx | 57 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitServicePicker.tsx | 70 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitServiceQuickToggles.tsx | 42 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\left\CockpitServiceSection.tsx | 122 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\right\CockpitFooterSection.tsx | 102 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\right\CockpitReminderControl.tsx | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\right\CockpitStatusControl.tsx | 145 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\cockpit\right\CockpitSubjectSection.tsx | 66 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\CockpitForm.tsx | 107 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ConfirmDialog.tsx | 57 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormContactSection.tsx | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormFooter.tsx | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormHeader.tsx | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormIdentitySection.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormNotesSection.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\contact-form\ContactFormPositionSection.tsx | 12 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\convert-client\ConvertClientCompanyCard.tsx | 12 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\convert-client\ConvertClientFields.tsx | 85 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\convert-client\ConvertClientFooter.tsx | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\convert-client\ConvertClientHeader.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ConvertClientDialog.tsx | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\Dashboard.tsx | 87 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\__tests__\DashboardDetailsOverlay.test.tsx | 61 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\__tests__\DashboardToolbar.test.tsx | 73 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\DashboardDetailsOverlay.tsx | 63 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\DashboardKanban.tsx | 51 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\DashboardList.tsx | 126 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\DashboardToolbar.tsx | 59 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\kanban\KanbanColumn.tsx | 58 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\list\DashboardFamilyBadges.tsx | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\list\DashboardListEmptyRow.tsx | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\list\DashboardListHeader.tsx | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\list\DashboardListRow.tsx | 68 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\list\DashboardListRow.types.ts | 8 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\toolbar\DashboardDateFilters.tsx | 271 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\toolbar\DashboardSearchInput.tsx | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\dashboard\toolbar\DashboardViewModeSwitch.tsx | 42 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ErrorBoundary.tsx | 62 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ErrorJournalExport.tsx | 63 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\getInteractionCardState.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\getInteractionChannelIcon.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\InteractionCard.types.ts | 12 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\InteractionCardBody.tsx | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\InteractionCardFamilies.tsx | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\InteractionCardFooter.tsx | 59 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-card\InteractionCardHeader.tsx | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\HighlightedDigits.tsx | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\HighlightedText.tsx | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchBar.types.ts | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchContactItem.tsx | 37 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchContainer.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchEntityItem.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchFooter.tsx | 40 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchHeader.tsx | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchInput.tsx | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchListArea.tsx | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchRecents.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchResults.tsx | 60 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interaction-search\InteractionSearchStatusMessage.tsx | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\InteractionCard.tsx | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\InteractionDetails.tsx | 70 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\footer\InteractionFooterNoteComposer.tsx | 55 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\footer\InteractionFooterOrderRefInput.tsx | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\footer\InteractionFooterReminderInput.tsx | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\footer\InteractionFooterStatusSelect.tsx | 44 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\footer\InteractionFooterTopFields.tsx | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\InteractionDetailsFooter.tsx | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\InteractionDetailsHeader.tsx | 77 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\InteractionDetailsSubjectCard.tsx | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\interactions\InteractionDetailsTimeline.tsx | 58 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\InteractionSearchBar.test.tsx | 136 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\InteractionSearchBar.tsx | 79 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\InteractionStepper.tsx | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\login\LoginScreenBrand.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\login\LoginScreenForm.tsx | 125 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\LoginScreen.tsx | 63 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-detail\ProspectDetailContactsSection.tsx | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-detail\ProspectDetailEmptyState.tsx | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-detail\ProspectDetailHeader.tsx | 54 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-detail\ProspectDetailInfoGrid.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-detail\ProspectDetailPanel.types.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormAddressSection.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormContent.tsx | 78 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormFooter.tsx | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormHeader.tsx | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormIdentitySection.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormMetaSection.tsx | 88 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\prospect-form\ProspectFormNotesSection.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ProspectDetailPanel.tsx | 47 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ProspectFormDialog.tsx | 95 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ProspectList.test.tsx | 85 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ProspectList.tsx | 324 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\Settings.tsx | 86 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\ConfigSection.tsx | 60 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\ConfigSectionAddRow.tsx | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\ConfigSectionItemsList.tsx | 56 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsConfigColumns.tsx | 95 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsConfigColumns.types.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsHeader.tsx | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsReadOnlyBanner.tsx | 8 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsSections.tsx | 74 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsSections.types.ts | 44 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\SettingsStatusColumn.tsx | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\status\__tests__\StatusRow.test.tsx | 51 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\status\StatusAddBar.tsx | 40 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\status\StatusCategoryTabs.tsx | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\status\StatusRow.tsx | 70 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\status\StatusRowsList.tsx | 33 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\settings\StatusSection.tsx | 61 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\TemporaryPasswordDialog.tsx | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\alert-dialog.tsx | 127 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\badge.tsx | 51 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\button.tsx | 62 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\calendar.tsx | 169 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\card.tsx | 110 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\combobox.tsx | 211 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\command.tsx | 160 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\dialog.tsx | 112 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\input.tsx | 44 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\popover.tsx | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\scroll-area.tsx | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\select.tsx | 171 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\sheet.tsx | 127 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\switch.tsx | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\table.tsx | 111 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\tabs.tsx | 48 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\textarea.tsx | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\toggle-group.tsx | 67 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\toggle.tsx | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\toolbar-row.tsx | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\ui\tooltip.tsx | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\user-create\UserCreateAgenciesSection.tsx | 107 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\user-create\UserCreateFooter.tsx | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\user-create\UserCreateIdentitySection.tsx | 57 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\user-create\UserCreateRoleSection.tsx | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\UserCreateDialog.tsx | 76 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\UserIdentityDialog.tsx | 122 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\UserMembershipDialog.tsx | 176 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UserCard.tsx | 95 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UserMembershipPills.tsx | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UserRoleSelect.tsx | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UsersManagerContent.tsx | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UsersManagerDialogs.tsx | 115 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UsersManagerHeader.tsx | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UsersManagerList.tsx | 68 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\users\UsersManagerSearch.tsx | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\components\UsersManager.tsx | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\constants\__tests__\relations.test.ts | 9 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\constants\relations.ts | 33 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\constants\statusCategories.ts | 7 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useAgencyConfig.test.tsx | 43 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useDashboardState.test.tsx | 236 | 84 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useEntityFormDialogs.test.tsx | 88 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useNotifyError.test.tsx | 22 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useReassignEntity.test.tsx | 98 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\__tests__\useSaveInteraction.test.tsx | 79 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAddTimelineEvent.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAdminUsers.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAgencies.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAgenciesManager.ts | 101 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAgencyConfig.ts | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAppSession.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAppSessionState.ts | 118 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useArchiveAgency.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useArchiveUser.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAuditLogs.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useAuditLogsPanel.ts | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useChangePasswordState.ts | 168 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useClientContactDialog.ts | 73 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useClientFormDialog.ts | 106 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useClientFormDialogFields.ts | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useClients.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useClientsPanelState.ts | 331 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitDerivedState.ts | 74 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitDerivedState.types.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitDialogsState.ts | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitFormController.ts | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitFormRefs.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitPaneProps.ts | 95 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitPaneProps.types.ts | 91 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCockpitRegisterFields.ts | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useConvertClientDialog.ts | 73 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCreateAdminUser.ts | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useCreateAgency.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useDashboardState.tsx | 392 | 71 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useDeleteEntityContact.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useDeleteUser.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useEntityContacts.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useEntitySearchIndex.ts | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useHardDeleteAgency.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionDetailsState.ts | 101 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionDraft.ts | 297 | 76 | Taille elevee, decoupage recommande. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionFocus.ts | 74 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionFormEffects.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionFormEffects.types.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionFormState.ts | 108 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionFormState.types.ts | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionGateState.ts | 86 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionHandlers.ts | 57 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionHandlers.types.ts | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionHotkeys.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionInvalidHandler.ts | 71 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractions.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionSearch.ts | 149 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionStepper.ts | 111 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useInteractionSubmit.ts | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useKnownCompanies.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useLoginScreenForm.ts | 90 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useNotifyError.ts | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useProspectFormDialog.ts | 93 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useProspectFormDialogFields.ts | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useProspects.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useRealtimeInteractions.ts | 49 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useReassignEntity.ts | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useRenameAgency.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useResetUserPassword.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSaveAgencyConfig.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSaveClient.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSaveEntityContact.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSaveInteraction.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSaveProspect.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSetClientArchived.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSettingsState.helpers.ts | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSettingsState.ts | 193 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSetUserMemberships.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useSetUserRole.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useUnarchiveAgency.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useUnarchiveUser.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useUpdateUserIdentity.ts | 27 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useUserCreateDialog.ts | 114 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\hooks\useUsersManager.ts | 176 | 82 | Au-dela de 150 lignes, extraction possible. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\index.css | 60 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\lib\result.ts | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\lib\utils.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\main.tsx | 74 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\schemas\__tests__\interactionSchema.test.ts | 76 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\schemas\interactionSchema.ts | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\__tests__\admin.rpc-services.test.ts | 224 | 84 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\__tests__\getAdminUsers.test.ts | 143 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\__tests__\getAuditLogs.test.ts | 125 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminAgenciesArchive.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminAgenciesCreate.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminAgenciesHardDelete.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminAgenciesRename.ts | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminAgenciesUnarchive.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersArchive.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersCreate.ts | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersDelete.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersResetPassword.ts | 31 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersSetMemberships.ts | 37 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersSetRole.ts | 32 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersUnarchive.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\adminUsersUpdateIdentity.ts | 36 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\getAdminUsers.ts | 116 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\admin\getAuditLogs.ts | 54 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\__tests__\agency.supabase-services.test.ts | 127 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\__tests__\getActiveAgencyContext.test.ts | 50 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\__tests__\getAgencyMemberships.test.ts | 113 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\getActiveAgencyContext.ts | 42 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\getActiveAgencyId.ts | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\getAgencies.ts | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\getAgencyMemberships.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\getProfileActiveAgencyId.ts | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\agency\setProfileActiveAgencyId.ts | 22 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\__tests__\rpcClient.test.ts | 59 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\__tests__\safeRpc.test.ts | 95 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\__tests__\trpcClient.test.ts | 102 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\rpcClient.ts | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\safeRpc.ts | 48 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\api\trpcClient.ts | 135 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\__tests__\auth.core-services.test.ts | 259 | 78 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\__tests__\signInWithPassword.test.ts | 43 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\__tests__\signOut.test.ts | 22 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\getCurrentUserId.ts | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\getCurrentUserLabel.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\getProfile.ts | 20 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\getSession.ts | 11 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\onAuthStateChange.ts | 11 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\setProfilePasswordChanged.ts | 12 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\signInWithPassword.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\signOut.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\auth\updateUserPassword.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\clients\getClientById.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\clients\getClients.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\clients\saveClient.ts | 55 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\clients\setClientArchived.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\config\getAgencyConfig.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\config\index.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\config\saveAgencyConfig.ts | 28 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\__tests__\entities.rpc-services.test.ts | 241 | 84 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\__tests__\entities.supabase-services.test.ts | 183 | 84 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\convertEntityToClient.ts | 37 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\deleteEntityContact.ts | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\getEntityContacts.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\getEntitySearchIndex.ts | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\getProspects.ts | 34 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\reassignEntity.ts | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\saveEntity.ts | 58 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\entities\saveEntityContact.ts | 47 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\AppError.test.ts | 20 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\handleUiError.test.ts | 20 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapAdminDomainError.test.ts | 81 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapEdgeError.test.ts | 90 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapPostgrestError.test.ts | 36 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapSettingsDomainError.test.ts | 40 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapSupabaseAuthError.test.ts | 47 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\mapTrpcError.test.ts | 61 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\normalizeError.test.ts | 15 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\notify.test.ts | 34 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\__tests__\reportError.test.ts | 33 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\AppError.ts | 38 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\handleUiError.ts | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\journal.ts | 45 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapAdminDomainError.ts | 56 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapDataDomainError.ts | 53 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapEdgeError.ts | 10 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapPostgrestError.ts | 87 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapSettingsDomainError.ts | 43 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapSupabaseAuthError.ts | 98 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\mapTrpcError.ts | 71 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\normalizeError.ts | 64 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\notify.ts | 30 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\reportError.ts | 62 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\errors\source.ts | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\__tests__\validateInteractionDraft.test.ts | 44 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\addTimelineEvent.ts | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\deleteInteractionDraft.ts | 23 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\generateId.ts | 19 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\getInteractionDraft.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\getInteractions.ts | 25 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\getKnownCompanies.ts | 35 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\hydrateTimeline.ts | 39 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\index.ts | 8 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\interactionDraftPayload.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\saveInteraction.ts | 52 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\saveInteractionDraft.ts | 29 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\updateInteractionOptimistic.ts | 41 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\interactions\validateInteractionDraft.ts | 51 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\__tests__\queryClient.test.ts | 27 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\__tests__\queryInvalidation.test.ts | 78 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\__tests__\queryKeys.test.ts | 20 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\__tests__\queryPrefetch.test.ts | 71 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\queryClient.ts | 21 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\queryInvalidation.ts | 106 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\queryKeys.ts | 50 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\query\queryPrefetch.ts | 26 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\supabase\__tests__\memoryStorage.test.ts | 10 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\supabase\getSupabaseClient.ts | 17 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\supabase\index.ts | 2 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\supabase\memoryStorage.ts | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\services\supabase\requireSupabaseClient.ts | 15 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\stores\errorStore.ts | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\types.ts | 83 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\types\app-session.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\types\supabase.ts | 1 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\__tests__\safeJsonParse.test.ts | 13 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\audit\formatAuditMetadata.ts | 9 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\clients\formatClientNumber.ts | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\__tests__\getPresetDateRange.test.ts | 20 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\buildReminderDateTime.ts | 24 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\formatDate.ts | 5 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\formatDateInputValue.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\formatDateTime.ts | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\formatDateTimeLocalInput.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\formatTime.ts | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\getEndOfDay.ts | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\getNowIsoString.ts | 2 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\getPresetDateRange.ts | 42 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\getStartOfDay.ts | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\getTodayIsoDate.ts | 2 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\isBeforeNow.ts | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\toDate.ts | 6 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\date\toTimestamp.ts | 3 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\formatFrenchPhone.ts | 11 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\__tests__\buildInteractionEvents.test.ts | 102 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\__tests__\getInteractionGateState.test.ts | 60 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\__tests__\upsertInteractionInList.test.ts | 24 | 92 | Couverture de tests presente. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\buildInteractionEvents.ts | 78 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\getInteractionGateState.ts | 87 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\interactions\upsertInteractionInList.ts | 16 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\recordNarrowing.ts | 14 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\safeJsonParse.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\toJsonValue.ts | 18 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\utils\typeGuards.ts | 13 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\src\vite-env.d.ts | 1 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\tailwind.config.cjs | 68 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\test-results\.last-run.json | 4 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\tsconfig.json | 46 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\vite.config.ts | 99 | 90 | RAS notable. |
| C:\GitHub\CIR_Cockpit\CIR-Cockpit\frontend\vitest.config.ts | 41 | 90 | RAS notable. |

