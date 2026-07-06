# Guide de tests

Reference QA: `docs/qa-runbook.md`.

## Pyramide

1. Unitaires: services, helpers, schemas partages.
2. Hooks React: TanStack Query, formulaires, orchestration UI.
3. Composants React.
4. E2E Playwright.

Regles:

- Happy path et error path pour chaque comportement critique.
- Mocks interdits sur la logique metier interne.
- Mocks autorises pour reseau, SDK, horloge, random et APIs externes.
- Test regressif pour chaque bug corrige.

## Gates par impact

Depuis la racine:

```bash
pnpm run qa:docs   # docs/config/agents/QA
pnpm run qa:front  # frontend sans coverage/build
pnpm run qa:back   # backend sans integration distante
pnpm run qa:fast   # gate intermediaire large
pnpm run qa        # gate finale complete
```

Checks frontend:

```bash
pnpm --dir frontend run typecheck
pnpm --dir frontend run lint
pnpm --dir frontend run test:run
pnpm --dir frontend run test:coverage
pnpm --dir frontend run check:error-compliance
pnpm --dir frontend run build
```

Checks backend:

```bash
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --env-file=backend/.env --allow-env --config backend/deno.json backend/functions/api
pnpm run backend:test:integration
```

## E2E

Commande:

```bash
RUN_E2E=1 pnpm --dir frontend run test:e2e
```

Pre-requis:

- `frontend/.env.e2e` si identifiants requis.
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` pour parcours admin.
- `PLAYWRIGHT_BASE_URL` optionnel, sinon Playwright demarre `pnpm run dev`.

Ne pas lancer E2E automatiquement pour chaque modification. Les lancer si un parcours UI est impacte et que l'utilisateur le demande ou le confirme.

## Coverage

Source de verite: `frontend/vitest.config.ts`.

Seuils principaux:

- Global minimal: `55/50/50/58` sur statements/branches/functions/lines.
- Domaines critiques services: `80/70/80/80`.
- Thresholds specifiques pour hooks, composants UI et utilitaires cibles.

Commande:

```bash
pnpm --dir frontend run test:coverage
```

La coverage est une gate finale ou de risque eleve, pas une boucle systematique apres chaque petit changement.

## CI

`.github/workflows/qa.yml` installe pnpm, Node et Deno, prepare `backend/.env` depuis l'exemple si necessaire, puis lance:

```bash
pnpm run qa
```

La CI ne remplace pas la validation locale demandee par le runbook quand une livraison est attendue.
