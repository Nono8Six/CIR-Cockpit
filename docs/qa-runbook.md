# QA Runbook Local + CI

Date de reference: 2026-06-20
Portee: CIR Cockpit local + backend Supabase lie.

## 1. Principe

La validation se choisit par impact. Ne pas lancer `qa:fast` ou `qa` par reflexe: ces gates sont utiles, mais couteuses en temps, contexte et bruit.

`pnpm run qa` reste la gate finale de livraison. Elle n'est obligatoire que pour une livraison/merge/deploiement/PR, une demande explicite de verification complete, ou un changement large qui touche plusieurs couches.

## 2. Matrice d'impact

| Perimetre | Commande standard | Quand l'utiliser |
| --- | --- | --- |
| Analyse, plan, audit sans edition | Aucune suite QA | Commandes read-only ciblees seulement |
| Docs/config agents/QA | `pnpm run qa:docs` | AGENTS, CLAUDE, docs, scripts QA, hooks, configs |
| Frontend pur | `pnpm run qa:front` | `frontend/src/**`, hooks, services front, composants |
| Backend pur | `pnpm run qa:back` | `backend/functions/api/**`, Deno, services backend |
| Shared/API/erreurs/transversal | checks front + back cibles, ou `pnpm run qa:fast` | `shared/**`, tRPC, schemas partages, pipeline erreurs |
| Livraison finale/merge/deploy/PR | `pnpm run qa` | Gate complet local, puis CI si PR |

Regle de prudence: si le perimetre est incertain ou large, utiliser `qa:fast` en validation intermediaire. Utiliser `qa` seulement en gate finale.

## 3. Commandes

Racine:

```bash
pnpm run repo:check
pnpm run qa:docs
pnpm run qa:front
pnpm run qa:back
pnpm run qa:fast
pnpm run qa
pnpm run qa:audit
```

Frontend cible:

```bash
pnpm --dir frontend run typecheck
pnpm --dir frontend run lint
pnpm --dir frontend run test:run
pnpm --dir frontend run test:coverage
pnpm --dir frontend run check:error-compliance
pnpm --dir frontend run build
```

Backend cible:

```bash
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --env-file=backend/.env --allow-env --config backend/deno.json backend/functions/api
pnpm run backend:test:integration
```

E2E:

```bash
RUN_E2E=1 pnpm --dir frontend run test:e2e
```

E2E seulement si un parcours UI est impacte et que l'utilisateur le demande ou le confirme.

## 4. Gates

### `qa:docs`

Gate legere pour docs/config:

1. `repo:check`
2. `git diff --check` sur AGENTS, CLAUDE, docs, scripts, hooks et configs principales.

Ne valide pas le runtime applicatif.

### `qa:front`

Gate frontend intermediaire:

1. `repo:check`
2. TypeScript frontend.
3. ESLint frontend.
4. Vitest sans coverage.
5. Error compliance frontend.

Ne lance pas build, coverage, backend, E2E.

### `qa:back`

Gate backend intermediaire:

1. `repo:check`
2. Deno lint.
3. Deno check.
4. Tests backend unitaires.

Ne lance pas tests d'integration backend ni probes Supabase runtime.

### `qa:fast`

Gate intermediaire large:

1. `repo:check`
2. Frontend typecheck/lint/tests sans coverage/error compliance.
3. Backend lint/check/tests.

Utiliser quand le changement traverse plusieurs couches ou quand les checks cibles ne suffisent plus.

### `qa`

Gate final complet:

1. `repo:check`
2. Frontend typecheck.
3. Frontend lint.
4. Frontend tests avec coverage.
5. Frontend error compliance.
6. Frontend build.
7. E2E seulement si `RUN_E2E=1`.
8. Backend lint.
9. Backend check.
10. Backend tests.
11. Backend integration runner.

## 5. Conditions de skip

Skips autorises si justifies dans le rapport final:

- E2E saute si aucun parcours UI n'est impacte.
- Probes runtime Supabase sautees si aucun backend/API/DB/Edge Function n'est impacte.
- `backend:test:integration` peut ignorer ses tests si `backend/.env.test` ou les variables d'integration sont absents.
- `qa:audit` est separe car il depend du reseau.

## 6. Relecture stricte

Pour code livre, verifier selon impact:

```bash
rg -n "throw new Error\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
rg -n "console\.error\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
rg -n "toast\.error\(" frontend/src
rg -n "@ts-ignore|@ts-expect-error" frontend/src backend/functions/api shared
rg -n "\bany\b" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
rg -n "x-client-authorization" frontend/src/services/api backend/functions/api/middleware backend/functions/api/app.ts
```

Attendus:

- Pas de `throw new Error`, `console.error`, `toast.error` direct hors exceptions documentees.
- Pas de `any`, `@ts-ignore`, `@ts-expect-error` non documente.
- Contrat runtime auth: `Authorization: Bearer <token>` uniquement.
- Messages d'erreur en francais.

## 7. Supabase runtime

Obligatoire seulement si routes API, middleware auth, error handling backend, migrations DB, Edge Function ou contrat `/functions/v1/api/*` sont modifies.

Avec Supabase MCP:

1. `list_edge_functions` sur le projet lie.
2. Verifier `api` actif, version/hash attendu, entrypoint `source/supabase/functions/api/index.ts`, import map `source/deno.json`, `verify_jwt=false`.
3. Prober les routes tRPC impactees: aucun `404`.
4. Prober `OPTIONS` sur routes impactees: `200` + headers CORS attendus.
5. Si DB/RLS impacte: verifier policies, grants, indexes, advisors et types generes selon les tables touchees.

## 8. CI

Le workflow `.github/workflows/qa.yml` execute `pnpm run qa` sur PR et `workflow_dispatch`.

CI verte ne remplace pas le rapport local quand une livraison est demandee. Pour une PR ouverte, les checks GitHub Actions requis doivent etre verts avant merge.

## 9. Rapport final minimal

Inclure dans la reponse de livraison:

```md
## Rapport QA

- Perimetre:
- Gate executee:
- Backend impacte: oui/non
- UI impactee: oui/non
- Supabase runtime requis: oui/non
- CI GitHub Actions: verte / non lancee / justification

### Resultats
- [ ] qa:docs / qa:front / qa:back / qa:fast / qa
- [ ] E2E execute ou skip justifie
- [ ] Probes Supabase executees ou skip justifie

### Decision
- [ ] Livrable autorise
- [ ] Livrable bloque
```
