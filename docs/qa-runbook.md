# QA Runbook Ultra Complet (Sans CI)

Date de reference: 2026-02-15
Portee par defaut: tout le repo (`frontend/`, `backend/`, `shared/`, docs critiques)
Mode: manuel strict, bloquant

## 1. Objectif

Ce runbook remplace la CI par un gate qualite manuel.
Une tache n'est pas terminee tant que toutes les etapes obligatoires ne sont pas vertes.

Objectifs obligatoires:
1. Verifier tests, lint, typecheck et build.
2. Verifier la gestion d'erreurs front/back.
3. Verifier la conformite aux regles `CLAUDE.md` et `AGENTS.md`.
4. Verifier le runtime Supabase quand le backend API est impacte.

## 2. Regles d'execution

0. Avant chaque prompt de travail envoye au LLM: lire ce runbook puis appliquer la matrice d'impact ci-dessous.
1. Ordre strict: executer les phases dans l'ordre.
2. Si une commande KO: STOP, corriger, puis relancer la phase.
3. Aucune livraison sans preuve ecrite en fin de runbook.
4. Les exceptions doivent etre explicites et justifiees.

## 3. Perimetre et conditions de skip

Par defaut: full repo.

Skips autorises uniquement si justifies dans le rapport final:
1. `npm run test:e2e` peut etre saute si aucun parcours UI n'est impacte.
2. Les probes runtime Supabase peuvent etre sautees si aucun changement backend API/DB n'est livre.
3. Les tests d'integration backend opt-in peuvent etre ignores si variables d'env absentes.

## 3.1 Matrice d'impact (obligatoire)

Appliquer la matrice la plus stricte en cas de doute:
1. Changement frontend pur (`frontend/src/**` sans impact backend):
   - Phases A, B, D, E (partie front).
2. Changement backend/API/auth/error handling/DB:
   - Phases A, B, C, D, E, F.
3. Changement transversal front + back:
   - Phases A, B, C, D, E, F complet.
4. Changement docs uniquement:
   - Phase A + relecture coherente des references docs + rapport final.

## 3.2 Protocole standard par cycle LLM

Pour chaque cycle "demande -> modification -> livraison":
1. Identifier le perimetre exact (front/back/transversal/docs).
2. Choisir la matrice d'impact correspondante.
3. Executer les phases requises.
4. Produire un rapport QA manuel dans la reponse de livraison.
5. Si une etape bloquante est KO: ne pas livrer.

## 4. Pre-requis

## 4.1 Outils

1. Node/NPM installes.
2. Deno installe.
3. `rg` (ripgrep) disponible.
4. Dependances installees:

```bash
cd frontend && npm install
cd ..
```

## 4.2 Variables

Frontend:
1. `frontend/.env` doit contenir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
2. E2E admin (si parcours admin testes): `E2E_ADMIN_EMAIL` et `E2E_ADMIN_PASSWORD` via `frontend/.env.e2e`.
3. E2E utilisateur general (hors admin): `E2E_USER_EMAIL` et `E2E_USER_PASSWORD` selon les specs.

Backend:
1. Variables minimales dans l'environnement shell (ou fichier charge) selon `backend/.env.example`.
2. Pour integration API opt-in: `RUN_API_INTEGRATION=1` + variables `API_INT_*`.
3. Si backend impacte: verification fail-fast obligatoire des variables avant execution.

## 5. Phase A - Baseline repo

Executer depuis la racine:

```bash
git status --short
```

Controle fail-fast (backend impacte):

```bash
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then echo "ENV backend manquant"; exit 1; fi
```

PowerShell equivalent:

```powershell
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($env:SUPABASE_ANON_KEY)) { Write-Error "ENV backend manquant"; exit 1 }
```

PASS:
1. L'etat du worktree est compris.
2. Les fichiers modifies par la tache sont identifies.

FAIL:
1. Changements inattendus non analyses.

## 6. Phase B - Validation frontend obligatoire

Executer depuis `frontend/`:

```bash
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:run
npm run check:error-compliance
npm run build
```

Si UI/parcours impacte:

```bash
npm run test:e2e
```

PASS:
1. Toutes les commandes retournent exit code 0.
2. `check:error-compliance` retourne `Error compliance check passed.`
3. Build Vite termine sans erreur.

FAIL:
1. Un seul echec bloque la livraison.

## 7. Phase C - Validation backend obligatoire

Executer depuis la racine:

```bash
deno lint backend/functions/api
deno check --config backend/deno.json backend/functions/api/index.ts
deno test --allow-env --no-check --config backend/deno.json backend/functions/api
```

PASS:
1. Lint Deno vert.
2. Typecheck backend vert.
3. Tests backend verts (les tests `ignored` documentes sont acceptes si non applicables).

FAIL:
1. Echec lint/type/test = blocage.

## 8. Phase D - Relecture code ultra stricte (regles projet)

Executer depuis la racine.

## 8.1 Regles erreurs interdites

```bash
rg -n "throw new Error\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
rg -n "console\.error\(" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
rg -n "toast\.error\(" frontend/src
```

PASS:
1. Aucun `throw new Error(` hors tests.
2. Aucun `console.error(` hors tests.
3. `toast.error(` uniquement dans `frontend/src/services/errors/notify.ts`.

## 8.2 Regles TypeScript strictes

```bash
rg -n "@ts-ignore|@ts-expect-error" frontend/src backend/functions/api shared
rg -n "\bany\b" frontend/src backend/functions/api shared --glob "!**/*.test.*" --glob "!**/*_test.ts"
```

PASS:
1. Zero `@ts-ignore` / `@ts-expect-error` non documentes.
2. Zero `any` non justifie.

## 8.3 Regles architecture/imports

```bash
rg -n "from '\.\./\.\./\.\./|from '\.\./\.\./\.\./\.\./" frontend/src
```

PASS:
1. Les imports front respectent l'alias `@/*` pour le code applicatif.
2. Aucun import circulaire connu.

Note:
1. Cette commande est un detecteur de suspicion; une verification manuelle reste obligatoire.

## 8.4 Contrat auth HTTP (P2)

Commande de controle:

```bash
rg -n "x-client-authorization" frontend/src/services/api backend/functions/api/middleware backend/functions/api/app.ts
```

PASS:
1. Aucune acceptance/envoi runtime de `x-client-authorization` dans le code applicatif.
2. Le contrat runtime repose sur `Authorization: Bearer <token>` uniquement.

## 8.5 Taille et responsabilite des fichiers

Commande de controle:

```bash
pwsh -NoLogo -Command "$files = rg --files frontend/src backend/functions/api shared | ? { $_ -match '\.(ts|tsx)$' }; foreach($f in $files){ $n=(Get-Content $f | Measure-Object -Line).Lines; if($n -gt 150){ '{0,4} {1}' -f $n,$f } }"
```

PASS:
1. Les depassements >150 lignes sont rares et justifies.
2. Les orchestrateurs restent lisibles et les extractions utiles.

## 9. Phase E - Relecture specialisee gestion d'erreurs

Checklist manuelle obligatoire:
1. Front:
   - `handleUiError()` utilise dans les handlers UI.
   - `normalizeError()` / mappers utilises dans services/hooks.
   - `notifyError()` utilise pour feedback utilisateur.
2. Back:
   - `httpError()` utilise dans routes/services.
   - `handleError()` global mappe vers catalog.
3. Shared:
   - Nouveau code erreur ajoute dans `shared/errors/types.ts` ET `shared/errors/catalog.ts`.
4. Retry policy:
   - Codes non retryables alignes dans `frontend/src/services/query/queryClient.ts`.
5. Messages:
   - Messages utilisateur en francais.

Commande de securite additionnelle:

```bash
cd frontend && npm run check:error-compliance
```

PASS:
1. Pipeline erreurs coherent front/back/shared.
2. Aucun contournement local des mappers.

## 10. Phase F - Verifications runtime Supabase (si backend impacte)

Obligatoire si routes API, middleware auth, error handling backend, migrations DB, ou contracts `/functions/v1/api/*` modifies.

## 10.1 Etat des fonctions

Avec MCP Supabase:
1. `list_edge_functions` sur le projet.
2. Verifier:
   - slug `api` actif,
   - version/hash attendus,
   - entrypoint `source/supabase/functions/api/index.ts`,
   - import map conforme,
   - `verify_jwt` conforme a la politique en cours.

## 10.2 Probes HTTP minimales

Attendus minimaux:
1. `POST /functions/v1/api/data/entities` ne retourne pas `404`.
2. `POST /functions/v1/api/data/entity-contacts` ne retourne pas `404`.
3. `POST /functions/v1/api/data/interactions` ne retourne pas `404`.
4. `OPTIONS` sur routes impactees retourne `200` avec headers CORS.
5. `POST` avec seul header `x-client-authorization` retourne `401 AUTH_REQUIRED`.

Exemple de probe (anonyme):

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/api/data/entities" -H "Content-Type: application/json" -d "{}"
curl -i -X OPTIONS "$SUPABASE_URL/functions/v1/api/data/entities" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST"
```

PASS:
1. Plus aucun `404` sur `/functions/v1/api/data/*`.
2. Preflight `OPTIONS` = `200` sur routes impactees.
3. Contrat `Authorization-only` respecte en runtime.

## 11. Matrice PASS/FAIL (bloquante)

Bloquant immediate:
1. Typecheck/lint/tests/build KO.
2. `check:error-compliance` KO.
3. Violations `throw new Error`, `console.error`, `toast.error` hors exceptions.
4. Runtime API en `404` sur routes impactees.

Bloquant conditionnel (si backend impacte):
1. `deno lint` ou `deno check` KO.
2. Probes CORS/POST KO.

Non bloquant mais a tracer:
1. Tests `ignored` opt-in non executes faute d'environnement.
2. E2E saute avec justification explicite.

Regle de gouvernance:
1. Deux skips consecutifs sur le meme controle obligent un plan de remediation documente.

## 12. Rapport de validation obligatoire (template)

Copier-coller ce bloc dans PR, ticket, ou message de livraison:

```md
## Rapport QA Manuel (Sans CI)

- Date:
- Branche/commit:
- Perimetre:
- Backend impacte: oui/non
- UI impactee: oui/non

### Resultats commandes
- [ ] frontend typecheck
- [ ] frontend lint --max-warnings=0
- [ ] frontend test:run
- [ ] frontend test:e2e (ou justification skip)
- [ ] frontend check:error-compliance
- [ ] frontend build
- [ ] deno lint backend/functions/api
- [ ] deno check backend/functions/api/index.ts
- [ ] deno test backend/functions/api

### Relecture regles
- [ ] zero throw new Error hors tests
- [ ] zero console.error hors tests
- [ ] toast.error uniquement via notify.ts
- [ ] zero any/ts-ignore/ts-expect-error non documentes
- [ ] erreurs front/back mappees au catalog
- [ ] messages FR
- [ ] contrat auth `Authorization-only` respecte (pas de fallback `x-client-authorization`)

### Runtime Supabase (si backend impacte)
- [ ] list_edge_functions valide
- [ ] POST /functions/v1/api/data/* sans 404
- [ ] OPTIONS routes impactees = 200 + CORS

### Ecarts connus / justifications
- ...

### Decision livraison
- [ ] LIVRABLE AUTORISE
- [ ] LIVRABLE BLOQUE (au moins un controle bloquant KO)
```

## 13. Liens de reference

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/stack.md`
4. `docs/audit-complet.md`
5. `frontend/scripts/check-error-compliance.mjs`
