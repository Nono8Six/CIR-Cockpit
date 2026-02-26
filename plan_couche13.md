# Couche 13 - Supabase Postgres Baseline Perf + RLS (Plan Ultra Complet)

## Resume
Objectif: executer une couche 13 100% orientee base de donnees pour `CIR_Cockpit` (Supabase `rbjtrcorlezvocayluok`), avec:
1. baseline technique exhaustive (indexes, policies RLS, fonctions SQL sensibles),
2. suppression immediate des indexes "unused",
3. durcissement/perf RLS,
4. validation stricte `anon` / `authenticated` / `service_role`,
5. preuves operationnelles QA sans CI GitHub.

Contraintes confirmees:
- Supabase conserve.
- Pas de CI GitHub.
- Prod-only.
- Politique indexes: remove now.
- Validation RLS: strict role matrix.

## 1) Etat de depart consolide (facts verifies)

### Repo
- Migrations DB: `backend/migrations/*.sql` (historique complet jusqu'a `20260216103000_backfill_interaction_agency_id.sql`).
- Durcissement RLS strict: `backend/migrations/20260216102000_strict_multi_tenant_rls.sql`.
- Refactor entites: `backend/migrations/20260203120000_entities_refactor.sql`.
- Helpers auth/RLS: `backend/migrations/202601231410_optimize_rls_helpers.sql`, `backend/migrations/202601231520_harden_definer_search_path.sql`.

### Supabase MCP (prod actif)
- Projet actif: `rbjtrcorlezvocayluok` (`CIR_Cockpit`).
- Branches Supabase: aucune (`list_branches = []`).
- Advisor securite: `auth_leaked_password_protection` WARN (a tracer).
- Advisor performance: plusieurs indexes "unused".
- `pg_policies` presentes sur tables cle (`entities`, `entity_contacts`, `interactions`, `agency_*`, `profiles`, `rate_limits`).
- `pg_stat_user_indexes` confirme `idx_scan=0` sur les indexes signales.

## 2) Scope exact couche 13

### In scope
- Inventaire et baseline DB prod (indexes, policies, fonctions sensibles, grants).
- Suppression indexes non utilises signales (avec guardrails + rollback).
- Optimisation RLS/perf ciblee sans changer le modele metier.
- Validation stricte roles + probes runtime.
- Documentation de preuves (runbook/journal couche).

### Out of scope
- Changement fonctionnel produit.
- Migration tRPC/Drizzle (couches 9/12).
- MFA/Auth product policy (couche 14).
- Refactoring frontend/backend non DB.

## 3) Design d'execution (sequence, decision-complete)

### Phase A - Baseline immuable (pre-op)
Livrables:
- Snapshot SQL avant changement.
- Rapport baseline versionne (journal couche 13).

Collectes:
1. `mcp__supabase__list_tables` (public).
2. `mcp__supabase__get_advisors` (`security`, `performance`).
3. `mcp__supabase__execute_sql`:
   - `pg_policies` (public),
   - `pg_stat_user_indexes`,
   - `pg_indexes`,
   - inventaire `security definer` + `search_path`,
   - controle lignes `agency_id IS NULL` sur `entities`, `interactions`, `entity_contacts`.

Criteres STOP:
- Rows orphelines critiques incompatibles avec RLS strict.
- Drift migration DB/repo bloquant.

### Phase B - Plan index "remove now"
Creer 2 migrations SQL:
1. `layer13_drop_unused_indexes.sql` (DROP cibles).
2. `layer13_recreate_unused_indexes_rollback.sql` (CREATE rollback).

Indexes cibles:
- `idx_audit_logs_archive_actor_id`
- `idx_interactions_active`
- `idx_audit_logs_archive_created_at`
- `idx_interactions_status`
- `idx_profiles_active_agency_id`
- `idx_interactions_created_by`
- `interaction_drafts_user_id_idx`
- `interaction_drafts_agency_id_idx`
- `interaction_drafts_updated_at_idx`
- `idx_interactions_status_id_only`
- `idx_interactions_contact_id`
- `idx_entities_name_search`
- `idx_entities_entity_type`
- `idx_interactions_updated_by`
- `idx_rate_limits_window_start`
- `idx_entity_contacts_last_name_search`
- `idx_interactions_entity_id`
- `idx_audit_logs_archive_agency_id`

Regles de suppression:
- Ne supprimer que les indexes non-PK/non-constraint.
- Ordre: archive/drafts d'abord, puis interactions/entities.
- Re-verifier `pg_stat_user_indexes` juste avant execution.

Guardrails:
- Un statement de migration par index.
- Commentaire SQL: reason + source advisor + timestamp.
- Rollback complet pret avant execution du drop.

### Phase C - RLS/perf hardening cible
Objectif: reduire cout policies et garantir isolation multi-tenant.

Actions:
1. Verifier coherence policies strictes:
   - `entities`, `entity_contacts`, `interactions`, `agency_*`, `profiles`, `interaction_drafts`, `rate_limits`.
2. Verifier/normaliser roles policies (`authenticated` vs `public`) selon tables.
3. Verifier fonctions policy:
   - `is_super_admin`, `is_member`, `has_agency_role`, `safe_uuid`, `jwt_sub`.
4. Verifier `security definer`:
   - `search_path` verrouille,
   - grants minimaux (RPC admin sensibles).
5. Si cout policy eleve observe:
   - proposer index composite aligne predicates RLS reellement utilises.

Note: aucun changement de logique metier, uniquement durcissement + perf DB.

### Phase D - Validation stricte matrice roles (bloquante)
Matrice:
1. `anon`: acces data interdit.
2. `authenticated` non membre: 403 sur scope agence etrangere.
3. `authenticated` membre: acces autorise limite a son agence.
4. `service_role`: acces uniquement operations internes prevues.

Probes obligatoires:
- `POST /functions/v1/api/data/entities`
- `POST /functions/v1/api/data/entity-contacts`
- `POST /functions/v1/api/data/interactions`
- `POST /functions/v1/api/data/config`
- `OPTIONS` CORS routes impactees

Attendus:
- pas de 404,
- pas de fallback `x-client-authorization`,
- codes coherents (`401/403/400`),
- aucun contournement RLS.

### Phase E - Post-change perf/securite
Rejouer:
- advisors security/performance,
- `pg_stat_user_indexes`,
- plans `EXPLAIN` sur requetes chaudes data routes (si possible).

Accepter suppression index si:
- pas de regression latence significative endpoints critiques,
- pas d'augmentation erreurs DB/RLS,
- pas de nouveau risque critique advisor.

## 4) Fichiers a modifier lors de l'implementation

### SQL (nouveaux)
- `backend/migrations/<timestamp>_layer13_drop_unused_indexes.sql`
- `backend/migrations/<timestamp>_layer13_rollback_recreate_unused_indexes.sql`
- `backend/migrations/<timestamp>_layer13_rls_perf_hardening.sql` (si necessaire)

### Docs
- `Plan_refactoring.md` (journal couche 13 + checklist)
- `docs/qa-runbook.md` (preuves DB/RLS explicites)
- `docs/plan/<date>_couche13_supabase_postgres.md` (rapport detaille)

## 5) Tests et scenarios obligatoires

### SQL/DB
- checks `agency_id IS NULL` (avant/apres),
- inventaire policies exact (`pg_policies`) avant/apres,
- inventaire indexes (`pg_indexes`, `pg_stat_user_indexes`) avant/apres,
- verification grants fonctions sensibles.

### Backend/runtime
- QA gate local complet (`pnpm run qa`),
- tests integration API role matrix (env controle),
- probes HTTP manuelles/automatisees routes data/admin impactees.

### Criteres d'acceptation
- validations QA vertes,
- aucun incident auth/RLS runtime,
- journal de preuves complet,
- rollback pret et valide syntaxiquement.

## 6) Risques + mitigations (Prod-only)

Risque principal: suppression index en prod sans staging.
Mitigation:
1. pre-baseline exhaustive + rollback SQL pret,
2. execution par lot (petits groupes d'indexes),
3. re-check advisors/stats entre lots,
4. fenetre d'intervention controlee + monitoring post-change.

Risque secondaire: policies historiques heterogenes.
Mitigation:
- audit `pg_policies` complet + diff before/after,
- aucun "cleanup implicite", uniquement changements explicitement traces.

## 7) DoD couche 13 (bloquant)

- Baseline DB complete capturee.
- Tous indexes "unused" listes traites selon politique `remove now` + rollback pret.
- RLS/policies/fonctions sensibles auditees et corrigees si necessaire.
- Matrice roles stricte executee avec preuves.
- QA runbook mis a jour + journal couche 13 rempli.
- `Plan_refactoring.md` couche 13 marquee `TERMINEE` avec resultats mesurables.

## 8) Hypotheses explicites (figees)

1. Environnement d'execution: prod `rbjtrcorlezvocayluok` uniquement.
2. Risque controle de suppression indexes immediate accepte.
3. Pas de modification fonctionnelle applicative pendant couche 13.
4. Si check bloquant echoue: rollback partiel/total immediat avant poursuite.
5. Decision basee sur migrations repo + MCP Supabase + etat runtime.
