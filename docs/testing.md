# Tests - Processus et Conventions

## Objectif
Garantir qu'une feature est livrée avec ses tests (frontend + backend) et éviter les regressions.

## Regle: 1 feature = tests associes
- Toute feature doit inclure au minimum:
  - 1 test unitaire (logique pure, services, utils), et/ou
  - 1 test hook/composant si le comportement UI change, et/ou
  - 1 test E2E si un parcours utilisateur change.
- Pas de merge local tant que les tests impactes ne passent pas.

## Pyramide de tests (priorite)
1) Unitaires (utils, mappers, validation, services)
2) Hooks + composants critiques
3) E2E pour les parcours utilisateur majeurs

## Frontend

### Outils
- Unitaires/React: Vitest + React Testing Library
- E2E: Playwright (local only)

### Conventions
- Tests unitaires dans `frontend/src/**/__tests__/*.test.ts(x)`
- Tests E2E dans `frontend/e2e/*.spec.ts`
- Mocks partages dans `frontend/src/__tests__/mocks/*`

### Commandes
```bash
cd frontend
npm run test
npm run test:coverage
npm run test:e2e
npm run typecheck
```

### Variables E2E (local)
```
E2E_USER_EMAIL=...
E2E_USER_PASSWORD=...
E2E_USER_ROLE=agency_admin|tcs
```

## Backend

### Edge Functions (Deno)
- Tests dans `backend/functions/api/*` (si presents).
- Lancer avec Deno (permissions minimales).

Exemple:
```bash
deno test --allow-env --config backend/deno.json backend/functions/api
```

## Definition of Done (DoD)
- Le code compile.
- Les tests unitaires impactes passent.
- Les tests E2E impactes passent (si la feature touche un parcours user).
- Un test regressif est ajoute pour chaque bug corrige.
- La checklist QA est renseignee si un parcours user est touche (voir `docs/tests/qa-checklist.md`).

## Checklist rapide (avant commit)
- [ ] Le nouveau comportement est couvert par un test.
- [ ] Les erreurs sont testees (happy path + error path).
- [ ] Les mocks ne contournent pas la logique metier.
- [ ] Les tests sont rapides et deterministes.
