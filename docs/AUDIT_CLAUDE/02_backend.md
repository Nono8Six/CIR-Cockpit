# 02 - Audit Backend (Version corrigee v2)

Date: 2026-02-27
Perimetre: `backend/functions/api/`, `backend/drizzle/`, integration tests backend

## Errata majeur applique

- correction volumetrie:
  - `adminUsers.ts`: 797 lignes (et non ~450)
  - `auth.ts`: 326 lignes (et non 384)
- correction assertion data layer:
  - backend utilise majoritairement Drizzle, mais conserve un usage Supabase (`.from('profiles')`) dans auth context
- re-evaluation score backend avec ces corrections

## Score backend v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Architecture Hono+tRPC | 90 | middleware chain propre, routing net |
| Type safety tRPC/Zod | 91 | input/output schemas et procedures coherentes |
| Auth/JWT hardening | 84 | bonne base JWKS/algos, fichier dense |
| Services metier | 80 | hotspots volumineux impactent maintenabilite |
| Error handling | 92 | `httpError` + formatter tRPC cohérents |
| Drizzle integration | 86 | schema explicite, mais usage hybride ponctuel avec Supabase admin |
| Tests backend | 83 | base correcte, integration lourde et conditionnelle |
| **Moyenne backend** | **87** | |

## Findings prioritaires

### Majeur B-1 - `adminUsers.ts` trop volumineux

- Evidence: `backend/functions/api/services/adminUsers.ts` = 797 lignes
- Impact: maintenance difficile, forte surface regressions.
- Action:
  1. split par sous-domaines (`password`, `membership`, `lifecycle`, `system-user`)
  2. tests unitaire par module extrait

### Majeur B-2 - `auth.ts` dense et multi-responsabilites

- Evidence: `backend/functions/api/middleware/auth.ts` = 326 lignes
- Regroupe: config env, cache JWKS, verification JWT, resolution auth context, middleware requireAuth/superAdmin.
- Action:
  1. extraire `auth/config.ts`, `auth/jwtGateway.ts`, `auth/context.ts`, `auth/middleware.ts`
  2. conserver API publique stable

### Majeur B-3 - Integration test monolithique

- Evidence: `backend/functions/api/integration/api_integration_test.ts` = 533 lignes
- Impact: debuggage long, granularite faible.
- Action: segmenter par domaines (`auth`, `data`, `admin`, `cors`).

### Moyen B-4 - Duplication try/catch dans router tRPC

- Evidence: `backend/functions/api/trpc/router.ts` mutations lineaires (7 occurrences)
- Impact: bruit repetitif, divergence potentielle.
- Action: wrapper `withProcedureErrorHandling` pour homogeniser.

### Moyen B-5 - Usage hybride Drizzle/Supabase a clarifier

- Evidence:
  - Drizzle majoritaire sur services data/admin
  - Supabase `.from('profiles')` dans `auth.ts:149`
- Constat: pattern acceptable (auth context), mais la regle doit etre documentee explicitement.
- Action: formaliser dans docs backend les cas ou Supabase client reste autorise.

## Points forts verifies

1. Middleware chain claire:
  - `backend/functions/api/app.ts:14-19`
2. tRPC procedures avec `input` + `output` schemas:
  - `backend/functions/api/trpc/router.ts`
3. Formatter d’erreur robuste:
  - `backend/functions/api/trpc/procedures.ts:105-115`
4. Drizzle schema explicite 12 tables:
  - `backend/drizzle/schema.ts`

## Inventaire backend corrige

| Metrique | Valeur |
|---|---:|
| Fichiers TS backend API | 32 |
| Fichiers tests backend (`_test.ts`/`.test.ts`) | 12 |
| Procedures tRPC mutations | 7 |
| Tables Drizzle | 12 |
| Migrations SQL | 63 |
| Hotspots backend >150 lignes (selection) | `adminUsers.ts` 797, `auth.ts` 326, `api_integration_test.ts` 533 |

## Preuves (commandes de reference v2)

```bash
rg -n '\.from\(' backend/functions/api --glob '!**/*_test.ts'
rg --files backend/functions/api | rg '(_test\.ts|\.test\.ts)$'
```
