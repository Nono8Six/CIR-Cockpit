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

- [ ] Migration `ai_feature_grants` appliquée (RLS, `force_rls`, CHECK scope/IDs, FK, indexes uniques partiels) ; parité `repo:check` OK ; table dans `schema.ts`.
- [ ] Seed du grant défaut global `assistant.referentiels` (défaut ouvert/fermé retenu explicitement et documenté).
- [ ] Règle `activeAgencyId`/`agencyIds` documentée et testée.
- [ ] `resolveAssistantAccess` (superadmin bypass, priorité user>agency>global>défaut) branché dans `runAssistantAsk` ET `getAssistantStatus`.
- [ ] Schémas grants/overview `.strict()` FR, uuid résolus en noms (pas d'uuid brut exposé).
- [ ] Procédures `ai.access.list/save/delete/membersOverview` (superAdmin) + `ai.usage.byMember` + miroir `shared/api/trpc.ts`.
- [ ] Écriture de grant journalisée dans `audit_logs`.
- [ ] Tests de contrat : résolution d'accès + bypass superadmin + conso par membre.
- [ ] `pnpm run qa:back` vert (inclut la parité migrations distante).

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

_(vide — phase non encore exécutée)_
