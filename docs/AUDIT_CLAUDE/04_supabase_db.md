# 04 - Audit Supabase & Database (Version corrigee v2)

Date: 2026-02-27
Perimetre: projet Supabase `rbjtrcorlezvocayluok` (runtime, RLS, grants, advisors)
Sources: MCP Supabase uniquement (preuves primaires)

## Errata majeur applique

- retrait de la dependance narrative a un audit tiers
- consolidation des preuves SQL en resultats aggregates
- rescoring securite DB apres verification directe

## Etat runtime (preuve MCP)

- Projet: `CIR_Cockpit` / `rbjtrcorlezvocayluok`
- Statut: `ACTIVE_HEALTHY`
- Region: `eu-west-2`
- DB runtime: PostgreSQL `17.6.1.063`
- Edge Function `api`:
  - status: ACTIVE
  - version: 24
  - `verify_jwt=false`
  - entrypoint: `source/supabase/functions/api/index.ts`
  - import map active: `source/deno.json`

## Score Supabase/DB v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Edge runtime | 92 | deploiement coherent et stable |
| RLS architecture | 75 | RLS active partout, mais force RLS absente |
| Privileges least-privilege | 30 | grants trop larges `anon`/`authenticated` |
| Auth hardening | 72 | advisor security en WARN (leaked password protection disabled) |
| Performance DB | 82 | 9 indexes non utilises signales |
| Migrations/gouvernance | 86 | historique riche, structuration nette |
| **Moyenne Supabase/DB** | **73** | |

## Findings critiques / majeurs

### Critique DB-1 - Privileges tables excessifs

- Preuve aggregate SQL (`information_schema.role_table_grants`):
  - `anon`: 15 tables avec `SELECT/INSERT/UPDATE/DELETE/TRUNCATE`
  - `authenticated`: 15 tables avec `SELECT/INSERT/UPDATE/DELETE/TRUNCATE`
- Impact:
  - dependance totale a la qualite des policies
  - blast radius eleve en cas de policy defectueuse
  - `TRUNCATE` expose = risque majeur
- Action immediate:
  1. revoke global
  2. re-grant minimal par table et operation
  3. verifier avec `has_table_privilege`

### Majeur DB-2 - FORCE RLS absent

- Preuve SQL (`pg_class`):
  - public tables: 16
  - RLS active: 16
  - FORCE RLS active: 0
- Impact: protections contournables selon contexte role/owner.
- Action: evaluer `ALTER TABLE ... FORCE ROW LEVEL SECURITY` sur tables metier.

### Majeur DB-3 - Advisor securite actif

- Preuve MCP advisor security:
  - `auth_leaked_password_protection` = WARN
- Action: activer protection leaked-password ou documenter exception produit + controle compensatoire.

### Moyen DB-4 - Indexes inutilises

- Preuve MCP advisor performance:
  - 9 lints `unused_index` (notamment `interactions`, `profiles`, `interaction_drafts`, `audit_logs_archive`)
- Action: valider sur fenetre d’usage reelle puis supprimer les indexes inertes confirmes.

## Politique / RLS snapshot

- 16 tables publiques
- 16 tables avec RLS
- 0 table avec FORCE RLS
- policies presentes par table metier (CRUD pour la plupart), `rate_limits` restreinte `service_role`

## Remediation SQL (ordre recommande)

1. Revoke large grants
```sql
revoke all on all tables in schema public from anon, authenticated;
```

2. Regrant minimal par role
```sql
grant select on table public.agencies to authenticated;
grant select, insert, update on table public.interactions to authenticated;
```

3. Evaluer FORCE RLS
```sql
alter table public.interactions force row level security;
alter table public.entities force row level security;
```

## Preuves (commandes MCP reference v2)

- `get_project(id=rbjtrcorlezvocayluok)`
- `list_edge_functions(project_id=rbjtrcorlezvocayluok)`
- `get_advisors(type=security|performance)`
- `execute_sql(...)` sur:
  - RLS enabled/force counts
  - grants by privilege and role
  - truncate exposures
  - policy counts
