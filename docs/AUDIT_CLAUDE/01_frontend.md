# 01 - Audit Frontend (Version corrigee v2)

Date: 2026-02-27
Perimetre: `frontend/src/` (composants, hooks, services, state, tests, a11y)

## Errata majeur applique

- Correction compte hooks: 81 (et non 74)
- Correction volumetrie composants:
  - `ClientList.tsx`: 336 lignes
  - `ProspectList.tsx`: 324 lignes
  - `DashboardDateFilters.tsx`: 271 lignes
- Correction performance: virtualisation presente (TanStack Virtual) dans `ClientList` et `ProspectList`
- Confirmation tests hors convention `__tests__`: 3 fichiers

## Score frontend v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Architecture & layering | 88 | separation claire composants/hooks/services, conventions bien appliquees |
| Composants React | 84 | bons patterns, mais plusieurs orchestrateurs/lists lourds |
| Hooks | 78 | 81 hooks, seulement 6 fichiers de tests hooks |
| Services | 88 | structure propre, pattern erreur coherent |
| TypeScript strict | 95 | `strict` actif, zero `@ts-ignore/@ts-expect-error` detecte |
| Tests unitaires/integration | 68 | base existante mais scope coverage representatif limite |
| UI / styling | 90 | Tailwind + shadcn cohérents |
| State management | 95 | TQ + Context + Zustand minimaliste |
| Accessibilite | 82 | base correcte, mais manque de tests axe automatises |
| Performance | 86 | memoization + virtualisation presentes, mais hotspots volumineux |
| **Moyenne frontend** | **86** | |

## Findings prioritaires

### Majeur F-1 - Couverture Vitest non representative de tout le front

- Evidence: `frontend/vitest.config.ts:21-27`
- Constat: `coverage.include` cible seulement 6 zones (`services/admin|agency|api|auth|entities|errors`).
- Impact: le seuil 80/70/80/80 est respecte sur un sous-ensemble, pas sur l’ensemble front.
- Action:
  1. etendre `coverage.include` a un scope plus representatif
  2. garder des exclusions explicites documentees

### Majeur F-2 - Gap de tests hooks

- Evidence:
  - hooks total: 81
  - tests hooks detectes: 6 fichiers dans `frontend/src/hooks/__tests__/`
- Impact: logique metier front (session, realtime, flows formulaire) insuffisamment verrouillee.
- Action:
  1. prioriser 10 hooks critiques
  2. couvrir happy/error/edge paths

### Majeur F-3 - Routage encore centralise

- Evidence: `frontend/src/app/router.tsx` routes enfants avec `component: () => null`
- Impact: architecture routing moins explicite, responsibilities concentrees dans `App.tsx`.
- Action:
  1. evoluer vers route components explicites
  2. reduire charge d’orchestration de `App.tsx`

### Moyen F-4 - Rules ESLint desactivees globalement (hook/a11y)

- Evidence: `frontend/eslint.config.js`
  - `label-has-associated-control` off
  - `set-state-in-effect` off
  - `preserve-manual-memoization` off
  - `refs` off
- Impact: detection preemptive de regressions reduite.
- Action: reactivation progressive avec exceptions localisees par fichier.

### Moyen F-5 - Fichiers volumineux au-dessus du seuil pragmatique

- Evidence lignes:
  - `frontend/src/App.tsx`: 297
  - `frontend/src/hooks/useDashboardState.tsx`: 392
  - `frontend/src/components/ClientList.tsx`: 336
  - `frontend/src/components/ProspectList.tsx`: 324
- Impact: lisibilite/maintenabilite degradees, complexite percue elevee.
- Action: extraction par responsabilites metier (colonnes, handlers, orchestration).

### Moyen F-6 - Tests composants hors convention `__tests__`

- Fichiers:
  - `frontend/src/components/ClientList.test.tsx`
  - `frontend/src/components/ProspectList.test.tsx`
  - `frontend/src/components/InteractionSearchBar.test.tsx`
- Impact: incoherence avec conventions projet, navigation QA moins previsible.
- Action: deplacer vers `frontend/src/components/__tests__/`.

### Mineur F-7 - Reporter d’erreurs injectable non branche

- Evidence: `frontend/src/services/errors/reportError.ts:9`
- Constat: `setErrorReporter` exporte, pas de binding runtime detecte.
- Impact: observabilite production limitee.
- Action: connecter Sentry/outil equivalent selon environnement.

## Points forts verifies

1. Virtualisation effective:
  - `frontend/src/components/ClientList.tsx:11,245`
  - `frontend/src/components/ProspectList.tsx:11,233`
2. Pas de `throw new Error(` hors tests detecte dans front.
3. Pas de `console.error(` hors tests detecte dans front.
4. `toast.error` restreint a `notify.ts` (1 occurrence front).
5. State management conforme (TQ + Context + Zustand store unique erreurs).

## Inventaire quantitatif corrige

| Metrique | Valeur |
|---|---:|
| Composants `.tsx` dans `frontend/src/components` | 242 |
| Hooks dans `frontend/src/hooks` | 81 |
| Fichiers services `.ts` dans `frontend/src/services` | 114 |
| Fichiers tests front (`.test.ts/.test.tsx`) | 61 |
| Fichiers tests hooks (`hooks/__tests__`) | 6 |
| Specs Playwright (`frontend/e2e/*.spec.ts`) | 6 |
| Fichiers TS/TSX front+back+shared >150 lignes (global) | 35 |

## Preuves (commandes de reference v2)

```bash
rg --files frontend/src/hooks | wc -l
rg --files frontend/src/hooks | rg '__tests__.*\.test\.(ts|tsx)$'
rg -n 'useVirtualizer' frontend/src/components/ClientList.tsx frontend/src/components/ProspectList.tsx
rg -n 'test.skip\(' frontend/e2e
```
