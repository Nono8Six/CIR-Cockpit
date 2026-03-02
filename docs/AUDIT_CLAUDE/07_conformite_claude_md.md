# 07 - Conformite CLAUDE.md (Version corrigee v2)

Date: 2026-02-27
Perimetre: verification systematique des regles techniques/qualite codifiees

## Errata majeur applique

- correction de faux positifs sur `!`:
  - la version precedente confondait negation logique et non-null assertion
  - scan cible non-null assertion: 0 candidat detecte sur patterns usuels
- correction comptages et violations reelles (tests hors `__tests__`, fichiers volumineux, coverage scope)

## Score global conformite v2: 87/100

## Regles critiques - statut

### TypeScript strict

| Regle | Statut | Preuve |
|---|---|---|
| `strict: true` | Conforme | `frontend/tsconfig.json` |
| `noUnusedLocals` / `noUnusedParameters` | Conforme | `frontend/tsconfig.json` |
| `@ts-ignore` / `@ts-expect-error` | Conforme | 0 occurrence detectee |
| `any` typage explicite hors tests | Conforme | 0 occurrence detectee (`: any`, `as any`) |
| Non-null assertion (`value!`) | Conforme (scan cible) | 0 candidat detecte sur motifs usuels |

### Hygiene erreurs

| Regle | Statut | Preuve |
|---|---|---|
| zero `throw new Error(` hors tests | Conforme | 0 occurrence |
| zero `console.error(` hors tests | Conforme | 0 occurrence |
| `toast.error` limite au pipeline | Conforme | 1 occurrence front (notify) |

### Architecture & conventions

| Regle | Statut | Preuve |
|---|---|---|
| tests frontend sous `__tests__/` | Partiel | 3 fichiers hors convention |
| fichiers ~150 lignes max (pragmatique) | Partiel | 35 fichiers TS/TSX >150 (global front/back/shared) |
| path alias `@/*` en front | Conforme globalement | usage dominant confirme |
| zero localStorage metier | Conforme | aucun usage detecte |
| state management cible (TQ+Context+Zustand erreurs) | Conforme | architecture observee |

### QA & tests

| Regle | Statut | Preuve |
|---|---|---|
| gate `pnpm run qa` | Conforme | gate executee et verte |
| couverture representant tout le front | Partiel | scope Vitest restreint (`services/*` selectionnes) |
| hooks critiques testes | Partiel | 81 hooks pour 6 fichiers tests hooks |

## Violations/risques principaux conserves

### Majeur C-1 - Conformite tests incomplète

- 3 tests composants hors `__tests__/`
- faible densite de tests hooks critiques
- coverage perimetree restreinte

### Moyen C-2 - Taille de fichiers

- hotspots au-dessus du seuil de confort (ex: `useDashboardState`, `adminUsers`, `auth`)

### Mineur C-3 - Observabilite reporter

- `setErrorReporter` present mais non connecte

## Inventaire correction v2

| Metrique | Valeur |
|---|---:|
| `@ts-ignore/@ts-expect-error` | 0 |
| `throw new Error` hors tests | 0 |
| `console.error` hors tests | 0 |
| `toast.error` front | 1 |
| tests composants hors `__tests__` | 3 |
| hooks totaux | 81 |
| fichiers tests hooks | 6 |

## Preuves (commandes de reference v2)

```bash
rg -n '@ts-ignore|@ts-expect-error' frontend/src backend/functions/api shared
rg -n 'throw new Error\(' frontend/src backend/functions/api shared --glob '!**/*.test.*' --glob '!**/*_test.ts'
rg -n 'console\.error\(' frontend/src backend/functions/api shared --glob '!**/*.test.*' --glob '!**/*_test.ts'
rg -n 'toast\.error\(' frontend/src
rg --files frontend/src/components | rg '\.test\.tsx?$' | rg -v '__tests__'
```
