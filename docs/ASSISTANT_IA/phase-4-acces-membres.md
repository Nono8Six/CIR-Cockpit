# Phase 4 — Accès membres à l'assistant IA

> Prérequis : Phase 1 terminée (lire son changelog). Indépendante des phases 2-3 mais
> l'ordre nominal est 1→4. Lire `00-plan-general.md`.
> Périmètre : backend + shared + **migration DB**. Gate QA : `pnpm run qa:back`.
> Objectif : contrôler **qui** peut utiliser l'assistant, avec un défaut sûr, appliqué dans
> le broker et administrable. Demande PO explicite : gérer les autorisations par membre.

## 1. Modèle d'accès retenu

Trois niveaux, du plus général au plus spécifique (le plus spécifique gagne) :

1. **Défaut global** de la feature (ex. « assistant activé pour tous les membres » ou « désactivé par défaut »).
2. **Par agence** : override pour une agence entière.
3. **Par utilisateur** : override pour un membre précis.

Cela réplique la logique de scope déjà présente sur `ai_quota_policies` (`global`/`agency`/`user`),
pour rester cohérent. Les **super admins** ont toujours accès (bypass), comme ailleurs dans l'app.

Contexte du modèle de rôles (vérifié 2026-07-08) : `profiles.role` (`UserRole`), appartenance
agence via `agency_members(agency_id, user_id)`, `active_agency_id` sur le profil. Les
procédures `superAdminProcedure` existent déjà. Vérifier dans le code la façon exacte dont
`AuthContext` expose `user_id`, `activeAgencyId`, `agencyIds`, rôle/superadmin avant
d'implémenter l'enforcement. Ne pas supposer qu'une agence active est toujours présente.

## 2. Spécification détaillée

### 2.1 Table `ai_feature_grants` (migration)

Créer une migration Supabase (suivre le pattern de migrations du repo + `repo:check` pour la
parité ; respecter le format de nommage documenté). Table :

```
ai_feature_grants
  id            uuid pk default gen_random_uuid()
  feature       text not null            -- 'assistant.referentiels', extensible
  scope         text not null            -- 'global' | 'agency' | 'user'
  agency_id     uuid null                -- requis si scope='agency'
  user_id       uuid null                -- requis si scope='user'
  allowed       boolean not null default true
  created_by    uuid null
  updated_by    uuid null
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()
  -- CHECK de cohérence scope/agency_id/user_id + indexes uniques partiels par scope
```

- RLS ON. `force_rls` est recommandé pour durcir cette nouvelle table, mais noter que les tables
  IA existantes ne sont pas toutes en `force_rls` : si `force_rls` est activé ici, le documenter
  comme un durcissement volontaire, pas comme une simple reproduction du pattern existant.
  Lecture/écriture réservées côté serveur/superadmin (l'administration passe par
  `superAdminProcedure`, pas d'accès client direct).
- Index sur `(feature, scope)` et sur `agency_id`, `user_id`.
- Ajouter un `CHECK` strict : global = aucun identifiant, agency = `agency_id` seule, user =
  `user_id` seule. Créer trois indexes uniques partiels (`global`, `agency`, `user`) plutôt qu'une
  pseudo-unicité avec `coalesce` non typé ; ajouter les FK vers agences/profils selon les patterns
  réels du repo et définir explicitement leur comportement à la suppression.
- Ajouter la table à `backend/drizzle/schema.ts` et à l'agrégat d'export.
- Seed d'une ligne défaut globale pour `assistant.referentiels`. Choisir explicitement le défaut
  avec le PO **avant migration** : `allowed = true` ouvre l'assistant à tous les membres
  authentifiés, `allowed = false` impose une activation contrôlée. Super admin bypass de toute
  façon. Consigner le défaut retenu dans la migration/changelog ; ne pas laisser le comportement
  implicite.

### 2.2 Résolution d'accès (backend)

Nouveau helper (dans `assistantBroker.ts` ou un `aiAccess.ts` dédié) :

```ts
export const resolveAssistantAccess = async (
  db, authContext, feature,
): Promise<{ allowed: boolean; reason: string | null }>
```

Règles :

1. Super admin → `allowed:true`.
2. Sinon, chercher un grant `scope='user'` pour ce user → si présent, il tranche.
3. Sinon, grant `scope='agency'` pour l'agence active → tranche.
4. Sinon, grant `scope='global'` de la feature → tranche.
5. Sinon (aucun grant) → défaut codé sûr (aligné sur le seed 2.1).

Précision obligatoire : si `authContext.activeAgencyId` est nul mais que `authContext.agencyIds`
contient des agences, décider et documenter la règle exacte. Recommandation : l'usage courant de
l'assistant se résout sur l'agence active quand elle existe ; sans agence active, ne pas accorder
un accès agence par simple appartenance multiple sauf décision produit explicite. L'overview admin
peut en revanche afficher l'accès effectif par agence.

Brancher `resolveAssistantAccess` :

- dans `runAssistantAsk` **avant** le quota (si refusé → pas d'appel provider ; retour
  `ai_available:false` + `fallback_reason:'Accès non autorisé'`, ou throw 403 selon la
  convention d'erreurs — préférer un retour explicite lisible par l'UI, pas un crash) ;
- dans `getAssistantStatus` (phase 1) pour que le front grise l'entrée si pas d'accès.

### 2.3 Contrats + procédures admin

Schémas (`shared/schemas/aiAssistant.schema.ts` ou `ai.schema.ts`) `.strict()` FR :

- `aiFeatureGrantSchema` (ligne complète).
- `aiFeatureGrantsListResponseSchema` : liste des grants + **résolution enrichie** : pour
  l'affichage admin, joindre les noms (agence, membre via `profiles.display_name`/email) — ne
  pas exposer des uuid bruts (défaut relevé sur l'UI actuelle).
- `aiFeatureGrantSaveInputSchema` : upsert d'un grant (feature, scope, agency_id?, user_id?, allowed).
- `aiFeatureGrantDeleteInputSchema` : suppression (revenir au niveau supérieur).
- `aiMembersAccessOverviewResponseSchema` : vue « par membre » = liste des membres (agence,
  nom, email, rôle) avec leur accès **effectif** résolu (allowed + origine du grant :
  user/agency/global/défaut). Base de l'écran d'administration (phase 5).

Procédures tRPC sous `ai: router({ ... })`, toutes `superAdminProcedure` :

- `ai.access.list` (query) · `ai.access.save` (mutation) · `ai.access.delete` (mutation)
  · `ai.access.membersOverview` (query).

Miroir `shared/api/trpc.ts`. Tests de contrat dans `aiContracts_test.ts` (résolution :
user>agency>global>défaut, bypass superadmin).

### 2.4 Conso par membre (pour l'admin)

Étendre la couche usage : une agrégation `ai_usage_events` **groupée par user_id** sur une
période, jointe aux `profiles` pour le nom, retournant appels/tokens/coût par membre et par
feature. Exposer `ai.usage.byMember` (query, superAdmin). Sert l'onglet « Accès & conso » de
la phase 5 et répond au besoin PO « gestion des coûts par membre ».

### 2.5 Journalisation

Toute écriture de grant → `audit_logs` (action, actor, cible), cohérent avec le reste de l'app.

## 3. Checkpoints à valider

- [x] Migration `ai_feature_grants` appliquée (RLS, `force_rls`, CHECK scope/IDs, FK, indexes uniques partiels) ; parité `repo:check` OK ; table dans `schema.ts`.
- [x] Seed du grant défaut global `assistant.referentiels` (défaut ouvert/fermé retenu explicitement et documenté).
- [x] Règle `activeAgencyId`/`agencyIds` documentée et testée.
- [x] `resolveAssistantAccess` (superadmin bypass, priorité user>agency>global>défaut) branché dans `runAssistantAsk` ET `getAssistantStatus`.
- [x] Schémas grants/overview `.strict()` FR, uuid résolus en noms (pas d'uuid brut exposé).
- [x] Procédures `ai.access.list/save/delete/membersOverview` (superAdmin) + `ai.usage.byMember` + miroir `shared/api/trpc.ts`.
- [x] Écriture de grant journalisée dans `audit_logs`.
- [x] Tests de contrat : résolution d'accès + bypass superadmin + conso par membre.
- [x] `pnpm run qa:back` vert (inclut la parité migrations distante), confirmé par le gate complet `pnpm run qa` du 2026-07-12.

## 4. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 4 du chantier Assistant IA (accès membres + conso par membre).

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md.
3. Lis le changelog de la phase 1 (broker, getAssistantStatus, feature assistant.referentiels
   réellement livrés). Le code fait foi.
4. Lis docs/ASSISTANT_IA/phase-4-acces-membres.md : c'est ta spécification.
5. Invoque les skills : cir-cockpit-api-contracts, drizzle-orm, supabase-postgres-best-practices,
   cir-error-handling. Utilise le MCP Supabase pour la migration (projet lié) et vérifier RLS.
6. `git status --short` — ne touche pas aux modifications qui ne sont pas les tiennes.

Lis le code réel avant d'éditer :
- backend/drizzle/schema.ts (profiles, agency_members, ai_quota_policies pour le pattern scope,
  export agrégé des tables ; étends le $type feature si la phase 1 ne l'a pas déjà fait)
- backend/functions/api/services/ai/assistantBroker.ts + aiGovernance.ts (AuthContext : comment
  sont exposés userId, activeAgencyId, agencyIds, superadmin ; enforceAiQuota comme modèle d'enforcement)
- backend/functions/api/trpc/router.ts (bloc ai + superAdminProcedure) + shared/api/trpc.ts
- comment les migrations sont nommées/gérées (repo:check, format timestamp) : NE CASSE PAS la parité.

Crée la migration via le MCP Supabase, applique RLS, décide/documente `force_rls`, index, unicité
par périmètre, seed du grant défaut choisi explicitement. Implémente resolveAssistantAccess et
branche-le dans runAssistantAsk et getAssistantStatus. La règle activeAgencyId/agencyIds doit être
testée, pas supposée. Ajoute les procédures admin (superAdmin) et le miroir. Résous les uuid en
noms (profiles/agences) — n'expose jamais d'uuid brut. Journalise les écritures dans audit_logs.
Contraintes : Zod .strict() FR, erreurs via httpError/createAppError, zéro mock/TODO livré.

Écris les tests de contrat (résolution d'accès + bypass superadmin + conso par membre). Lance
`pnpm run qa:back` (parité migrations incluse) jusqu'au vert.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 4, mets à jour le
tableau de suivi (§8) de 00-plan-general.md. Ne commit/déploie pas sans demande explicite ;
pour toute action DB de migration, confirme la logique avant application si un doute existe.
```

## 5. Notes de risque

- Le défaut d'accès est une décision produit : trancher le sens (ouvert vs fermé par défaut)
  et le documenter. Super admin garde toujours l'accès.
- L'accès agence doit être défini contre le vrai `AuthContext` : agence active seulement ou
  appartenance multiple. Un choix implicite créera des autorisations difficiles à auditer.
- `force_rls` sur la nouvelle table est un durcissement acceptable, mais ce n'est pas exactement
  l'état historique de toutes les tables IA existantes ; documenter le choix.
- Ne pas exposer d'uuid bruts à l'admin (défaut de l'UI actuelle à corriger dès les contrats).
- Migration : respecter scrupuleusement la parité `repo:check` et le format de nommage, sinon
  la gate `qa:back` casse.

## 6. Changelog

<!-- À remplir en fin de phase. -->

### 2026-07-10 — Phase exécutée, gate finale bloquée hors périmètre
- **Fait** : table `ai_feature_grants`, résolution effective user > agence active > global > défaut, bypass superadmin, enforcement avant quota dans `runAssistantAsk` et dans `getAssistantStatus`, contrats Zod stricts, procédures superadmin d'administration, vue d'accès par membre, agrégation de consommation par membre et audit transactionnel des mutations. Les UUID de cible sont accompagnés des noms/emails/agences résolus dans les réponses d'administration.
- **Fichiers créés** : `backend/functions/api/services/ai/aiAccess.ts`, `backend/functions/api/services/ai/aiAccess_test.ts`, `backend/migrations/20260710220413_ai_feature_grants.sql`, `backend/migrations/20260710221105_fix_ai_feature_access_validation.sql`.
- **Fichiers modifiés** : `backend/drizzle/schema.ts`, `backend/functions/api/services/ai/assistantBroker.ts`, `backend/functions/api/trpc/router.ts`, `shared/schemas/ai.schema.ts`, `shared/api/trpc.ts`, `scripts/check-repo-state.mjs`, ce fichier et `docs/ASSISTANT_IA/00-plan-general.md`.
- **Décisions prises en cours de route** : défaut global fermé (`allowed=false`) ; sans `activeAgencyId`, les simples appartenances de `agencyIds` ne déclenchent aucun grant agence ; `FORCE ROW LEVEL SECURITY` activé volontairement ; aucune lecture directe pour `anon`/`authenticated`, résolution minimale via fonction privée `SECURITY DEFINER` liée à `auth.uid()` ; suppression d'une agence ou d'un membre en cascade sur son grant, auteurs d'audit en `SET NULL` ; unicités partielles distinctes global/agence/utilisateur.
- **Écarts vs spécification (et pourquoi)** : la fonction de résolution a nécessité une migration corrective additive après qu'un probe transactionnel a détecté l'appel PostgreSQL invalide `pg_catalog.trim(text)` ; l'historique appliqué n'a pas été réécrit. La gate `pnpm run qa:back` n'est pas verte à ce stade à cause d'une erreur TypeScript préexistante et concurrente hors Phase 4 dans `dataInteractions_test.ts` (`amount` optionnel dans la factory pour un champ requis). Ce fichier, déjà modifié avant la phase, n'a pas été touché.
- **Points ouverts / à surveiller pour les phases suivantes** : laisser la Phase 4 en cours et relancer `pnpm run qa:back` après correction du chantier interactions concurrent. L'Edge Function `api` a été déployée explicitement à la demande du PO le 2026-07-11 en version 117 (`verify_jwt=false`, auth applicative conservée).
- **QA** : tests ciblés accès/broker 6/6 verts ; `repo:check`, lint backend et typecheck de l'API verts ; suite backend d'exécution avec `--no-check` 275 réussis, 0 échec, 8 intégrations conditionnelles ignorées ; probes Supabase verts pour RLS/`FORCE`, ACL, seed fermé, priorité utilisateur et absence de fallback vers `agencyIds` sans agence active. Après déploiement, Edge Function `api` version 117 `ACTIVE`, entrypoint/import map conformes, CORS `OPTIONS` 200 et routes `ai.access.list`, `ai.usage.byMember`, `ai.assistant.status` présentes (401 `AUTH_REQUIRED` sans token, aucun 404). `pnpm run qa:back` reste bloquée par le pré-check TypeScript concurrent décrit ci-dessus ; `pnpm run qa` a par ailleurs 677/677 tests frontend verts mais bloque sur le seuil de couverture concurrent de `useDashboardStatusHelpers.ts` (13,33 % de branches pour 30 % requis).

### 2026-07-12 — Statut réconcilié et gate finale verte
- **Réconciliation** : le fixture interactions et la couverture Dashboard qui bloquaient les gates ont été remis en cohérence. La Phase 4 est désormais terminée et déployée ; ses procédures d'accès et de consommation sont incluses dans l'Edge Function `api` version 118, qui supersède la version 117 mentionnée dans l'historique ci-dessus.
- **QA actuelle** : `pnpm run qa` vert — 689 tests frontend, 276 tests backend et 9 tests d'intégration réussis ; couverture, build, lint, typechecks, conformité erreurs, hygiène repo et parité migrations verts.
