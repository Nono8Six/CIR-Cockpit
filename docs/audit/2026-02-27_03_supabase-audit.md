# Audit Supabase & Database - CIR Cockpit

Date: 2026-02-27
Perimetre: projet Supabase `rbjtrcorlezvocayluok`, schema public, policies, grants, edge function `api`
Methodes: MCP Supabase (`get_project`, `list_edge_functions`, `get_advisors`, `execute_sql`)
Skills utilises: `supabase-postgres-best-practices`
References externes: Supabase docs (RLS, securing API, hardening Data API)

## Phase 1 - Etat runtime Supabase (preuve MCP)

- Project: `CIR_Cockpit` (`rbjtrcorlezvocayluok`)
- Statut: `ACTIVE_HEALTHY`
- Region: `eu-west-2`
- Postgres: `17.6.1.063`
- Edge function:
  - slug: `api`
  - version: `24`
  - status: `ACTIVE`
  - `verify_jwt=false`
  - entrypoint: `source/supabase/functions/api/index.ts`
  - import_map: `source/deno.json`

## Phase 2 - Scorecard Supabase (notes /100)

| Axe | Note | Commentaire court |
|---|---:|---|
| Runtime Edge Function | 92 | Deploiement coherent avec wrapper/import map |
| Multi-tenant RLS design | 74 | RLS active partout, mais configuration permissive |
| Privileges roles API | 32 | Grants `anon/authenticated` beaucoup trop larges |
| Auth hardening | 72 | Alerte leaked-password protection activee en WARN |
| Performance DB | 82 | Advisor signale indexes inutilises a traiter |
| Gouvernance schema/migrations | 84 | Historique migration riche et structuree |
| **Moyenne Supabase** | **73** | **Risque principal: privileges trop ouverts** |

## Phase 3 - Findings critiques (ordonnes)

### S-1 (Critique) - Grants table tres ouverts pour `anon`/`authenticated`

- Evidence SQL (`information_schema.role_table_grants`):
  - `anon` et `authenticated` ont `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` sur quasi toutes les tables metier (`agencies`, `entities`, `interactions`, `profiles`, etc.).
- Impact:
  - dependance totale a la justesse des policies; surface de blast radius elevee en cas d'erreur policy.
  - `TRUNCATE` expose est un anti-pattern fort.
- Reco immediate:
  - revoke privileges larges de base sur `public` pour `anon`/`authenticated`.
  - re-grant minimal par table et operation necessaire.
  - verifier ensuite avec `has_table_privilege`.

### S-2 (Majeur) - `FORCE RLS` non active

- Evidence SQL (`pg_class`):
  - tables `public.*` ont `relrowsecurity=true` mais `relforcerowsecurity=false`.
- Impact: owners/bypass roles peuvent contourner RLS selon contexte d'execution.
- Reco: evaluer `ALTER TABLE ... FORCE ROW LEVEL SECURITY` sur tables sensibles, apres tests complets.

### S-3 (Majeur) - Security advisor auth

- Evidence MCP advisor:
  - `auth_leaked_password_protection` = `WARN`
- Impact: acceptance potentielle de mots de passe compromis.
- Reco: activer protection, ou documenter exception produit avec risque accepte + controle compensatoire.

### S-4 (Moyen) - Indexes inutilises

- Evidence MCP advisor (performance):
  - indexes non utilises sur `profiles`, `interaction_drafts`, plusieurs indexes `interactions`, `audit_logs_archive`.
- Impact: cout ecriture/maintenance inutile.
- Reco: confirmer via `pg_stat_user_indexes` sur fenetre representative puis drop des inutilises confirmes.

## Phase 4 - Conformite refactoring cible (Plan_refactoring / stack)

- Couche 13 (Supabase/Postgres baseline) materialisee mais pas encore "parfaite" sur grants minimaux.
- Couche 14 (Auth hardening) partiellement completee (point leaked-password explicitement hors scope d'apres plan).
- Edge wrapper repo -> deploy conforme:
  - `supabase/functions/api/index.ts` delegue bien vers `backend/functions/api/index.ts`.

## Phase 5 - SQL de remediation recommande (a valider avant execution)

1. Revoke large privileges de base:

```sql
revoke all on all tables in schema public from anon, authenticated;
```

2. Re-grant minimal cible (exemple):

```sql
grant select on table public.agencies to authenticated;
grant select, insert, update on table public.interactions to authenticated;
```

3. Evaluer force RLS:

```sql
alter table public.interactions force row level security;
alter table public.entities force row level security;
```

## Phase 6 - Liens de reference (best practices)

- Supabase Securing API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Hardening Data API: https://supabase.com/docs/guides/database/hardening-data-api

