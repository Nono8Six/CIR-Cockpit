# Phase 5 — Refonte de l'interface Admin > IA

> Prérequis : Phases 1 et 4 terminées (lire leurs changelogs). Idéalement après 2-3 aussi.
> Lire `00-plan-general.md`. Périmètre : frontend, avec backend minimal seulement si un contrat
> indispensable manque. Gate QA : `pnpm run qa:front`, complétée par les checks backend ciblés ou
> `pnpm run qa:fast` dès qu'un fichier backend/shared/migration est modifié.
> Objectif : transformer l'onglet Admin > IA (aujourd'hui hardcodé et incomplet) en console
> de gouvernance réellement utilisable : vue d'ensemble, modèles, accès membres, prompts,
> usage/coûts. Aucune donnée/API jetée — on rebâtit l'UI sur le socle existant + phases 1/4.

## 1. Diagnostic de l'existant (à confirmer en lisant le code)

`frontend/src/components/admin-ai/AdminAiPanel.tsx` (~955 lignes) et `frontend/src/services/ai.ts` :
défauts constatés le 2026-07-08 :

- provider et modèle **hardcodés** (`AI_PROVIDER = 'openrouter'`, DeepSeek V4 Pro en dur) ;
  pas de gestion multi-modèles réelle (un seul modèle éditable) ;
- **pas de création** de politique de quota (on ne peut éditer que celles qui existent) ;
- `user_id`/`agency_id` affichés en **uuid bruts** (ex. « Utilisateur <uuid> ») ;
- **onglet Prompts absent** alors que l'API `ai.prompts.*` et les services existent déjà ;
- **pas de gestion d'accès** par membre (n'existait pas avant la phase 4) ;
- tout dans un seul composant monolithique.

Ce qui est bon et conservé : le backend (clés chiffrées, quotas, usage, prompts, coût réel),
la structure en sous-onglets, les graphes d'usage.

## 2. Spécification détaillée

### 2.1 Design d'abord

Invoquer `cir-cockpit-design` puis `impeccable`. Références (si réseau) : Ramp / Stripe / Attio /
Linear pour une console d'admin dense et lisible. Objectif : une page de gouvernance claire,
pas un long scroll. Découper `AdminAiPanel.tsx` en sous-composants par onglet (le monolithe de
955 lignes doit être cassé). Respecter tokens, densité, composants `ui/*`.

### 2.2 Structure cible (sous-onglets)

1. **Vue d'ensemble** — état du provider (actif, clé présente/last4, dernier test), modèle par
   défaut, coût 30 j, appels/tokens. Les alertes budget ne sont affichées que lorsque le contrat
   réel existe ; la phase 6 les ajoute à cette vue, sans placeholder ni donnée factice,
   raccourci « tester le provider ». Synthèse, pas d'édition.
2. **Fournisseur & modèles** — gestion **multi-modèles** réelle : liste des modèles
   (`ai_model_configs`), ajout/édition/suppression, prix par M tokens, max output, température,
   activer/désactiver, définir le modèle **par défaut par feature** (au moins
   `assistant.referentiels` vs `pricing.references.diagnose`) **uniquement si la phase 1 a créé
   un mapping persistant feature → modèle**. Si le schéma est encore celui d'origine
   (`ai_model_configs.is_default` unique par provider), afficher seulement le défaut provider ou
   ajouter d'abord le contrat backend minimal nécessaire ; ne pas créer un sélecteur front qui ne
   persiste pas réellement. Clé API OpenRouter (saisie/remplacement/test), jamais affichée en clair.
3. **Accès membres** — consomme `ai.access.membersOverview` + `ai.access.save/delete` (phase 4).
   Tableau des membres (nom, email, agence, rôle) avec accès **effectif** et son origine
   (user/agence/global/défaut) ; toggles pour override par membre ou par agence ; réglage du
   défaut global. **Noms résolus, pas d'uuid.** Colonne conso par membre (`ai.usage.byMember`).
4. **Quotas** — refonte : **création** de politiques (scope global/agence/membre × feature),
   édition, suppression, avec sélecteurs de feature et de périmètre résolus en noms. Afficher
   la consommation vs limite.
5. **Prompts** — nouvel onglet branché sur `ai.prompts.list/saveDraft/publish/restore` (déjà
   dans `services/ai.ts`, jamais utilisés). Par feature : éditer le brouillon, publier une
   version, restaurer une version antérieure, voir l'historique des versions.
6. **Usage & audit** — le journal d'événements existant, enrichi : filtre par feature/statut/
   membre, noms résolus, export si trivial. Conserver les graphes journaliers.

### 2.3 Services front

Compléter `frontend/src/services/ai.ts` avec les appels manquants (access.*, usage.byMember,
et tout `saveModel`/`deleteModel` multi-modèles selon ce que la phase 1/4 a exposé). Réutiliser
strictement le pattern `invokeTrpc` + `parseResponse`. Query keys dans `queryKeys.ts`.

Note : si la création de quota ou la suppression de modèle nécessite une procédure backend
absente, la signaler au changelog et l'ajouter côté backend de façon minimale (contrat +
router + miroir + test), en respectant `cir-cockpit-api-contracts`. Même règle pour le modèle
par défaut par feature : si le mapping persistant n'existe pas, il faut l'ajouter proprement ou
retirer cette capacité de l'UI v1. Ne pas bricoler côté front ce qui doit être une vraie procédure.

### 2.4 Tests

Vitest sur chaque sous-composant clé (services mockés) : rendu, une action d'édition, résolution
des noms (pas d'uuid affiché), état vide/erreur. Mettre à jour/adapter les tests existants du
panel s'ils cassent avec le découpage.

## 3. Checkpoints à valider

- [x] `AdminAiPanel` découpé en sous-composants par onglet (fin du monolithe 955 lignes).
- [x] Onglet Vue d'ensemble : synthèse provider/coût/usage, sans édition.
- [x] Onglet Fournisseur & modèles : CRUD multi-modèles + défaut provider ou défaut par feature réellement persistant + clé (test, jamais en clair).
- [x] Onglet Accès membres : overview effectif (noms résolus), override membre/agence, défaut global, conso par membre.
- [x] Onglet Quotas : création + édition + suppression de politiques, périmètres/features résolus en noms.
- [x] Onglet Prompts : branché sur ai.prompts.* (édition brouillon, publication, restauration, historique).
- [x] Onglet Usage & audit : filtres + noms résolus + graphes conservés.
- [x] Plus aucun uuid brut affiché ; plus aucune valeur provider/modèle hardcodée en dur bloquante ; aucune UI de modèle par feature sans persistance backend réelle.
- [x] Services front complétés (pattern invokeTrpc/parseResponse) ; procédures backend manquantes ajoutées proprement si besoin.
- [x] Tests Vitest à jour (dont résolution des noms) ; `pnpm run qa:front` vert et, si backend/shared touché, checks back ciblés ou `pnpm run qa:fast` verts.

## 4. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 5 du chantier Assistant IA (refonte de l'interface Admin > IA).

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md.
3. Lis les changelogs des phases 1 et 4 (et 2-3 si faites) : contrats réellement exposés
   (ai.access.*, ai.usage.byMember, défaut par feature, etc.). Le code fait foi.
4. Lis docs/ASSISTANT_IA/phase-5-refonte-admin-ia.md : c'est ta spécification.
5. Invoque les skills : cir-cockpit-design (AVANT toute UI), impeccable, web-design-guidelines,
   vercel-composition-patterns (pour découper le monolithe), vitest. cir-cockpit-api-contracts
   si tu dois ajouter une procédure backend manquante.
6. `git status --short` — ne touche pas aux modifications qui ne sont pas les tiennes.

Lis le code réel avant d'éditer :
- frontend/src/components/admin-ai/AdminAiPanel.tsx (à découper) et AdminPanel.tsx (montage)
- frontend/src/services/ai.ts (pattern à suivre ; services prompts déjà présents mais non utilisés)
- frontend/src/services/query/queryKeys.ts
- shared/schemas/ai.schema.ts et aiAssistant.schema.ts (contrats)
- backend/functions/api/trpc/router.ts + shared/api/trpc.ts si une procédure manque
- backend/drizzle/schema.ts / changelog phase 1 pour confirmer si le défaut modèle est global
  provider ou réellement mappé par feature

Refonds les 6 onglets (section 2.2). Impératifs : résoudre TOUS les uuid en noms lisibles,
supprimer les valeurs hardcodées bloquantes, ne pas afficher un défaut par feature non persistant,
brancher l'onglet Prompts sur l'API existante,
brancher Accès membres sur les procédures de la phase 4. Découpe le composant monolithique.
Contraintes : alias @/*, erreurs via handleUiError, tokens/densité du design system, zéro
mock/TODO livré. Si une procédure backend manque, ajoute-la proprement (contrat + router +
miroir + test) plutôt que de contourner côté front.

Vérifie avec preview_* : démarre le dev server, ouvre /admin onglet IA, teste chaque sous-onglet
(édition modèle, toggle accès, création quota, édition prompt). Écris/actualise les tests Vitest.
Lance `pnpm run qa:front` jusqu'au vert. Si tu modifies backend/shared ou une migration, lance
aussi les checks backend ciblés ; utilise `pnpm run qa:fast` si l'impact est transverse.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 5, mets à jour le
tableau de suivi (§8) de 00-plan-general.md. Ne commit/déploie pas sans demande explicite.
```

## 5. Notes de risque

- Ne rien casser du backend existant : cette phase est surtout frontend. Si un besoin UI révèle
  un manque backend, l'ajouter proprement (vraie procédure), pas un hack.
- Le modèle par feature est un sujet de données, pas seulement d'UI. Si le mapping n'existe pas,
  l'écran doit soit rester sur le défaut provider, soit créer le vrai contrat backend.
- Le découpage du monolithe peut casser les tests existants du panel : les adapter, ne pas les
  supprimer sans équivalent.
- Sécurité : la clé API ne doit jamais transiter en clair ni s'afficher (déjà le cas backend,
  ne pas régresser côté UI).

## 6. Changelog

<!-- À remplir en fin de phase. -->

### 2026-07-11 — Phase exécutée localement
- **Fait** : console Admin > IA restructurée en 6 onglets autonomes ; synthèse provider/usage, CRUD multi-modèles, accès et consommation Phase 4, CRUD quotas, prompts versionnés et journal filtrable avec évolution quotidienne. Tous les identifiants de membres et d'agences visibles sont résolus en noms ; le défaut modèle reste explicitement global au provider car aucun mapping persistant par feature n'existe.
- **Fichiers créés** : composants `AiOverviewTab`, `AiModelsTab`, `AiAccessTab`, `AiQuotasTab`, `AiPromptsTab`, `AiUsageTab`, utilitaires UI et tests Vitest associés sous `frontend/src/components/admin-ai/`.
- **Fichiers modifiés** : `AdminAiPanel.tsx`, `frontend/src/services/ai.ts`, `queryKeys.ts`, contrats `shared/schemas/ai.schema.ts`, miroir `shared/api/trpc.ts`, service de gouvernance, routeur tRPC, test de contrats, ce document et `00-plan-general.md`.
- **Contrats ajoutés** : `ai.settings.deleteModel`, `ai.settings.createQuota`, `ai.settings.deleteQuota`. La suppression du modèle par défaut est refusée tant qu'un autre défaut provider n'est pas défini.
- **Preview locale** : connexion superadmin, rendu réel des 6 onglets, édition modèle, ouverture/remplissage création quota, édition/restauration locale du texte prompt, noms résolus et journal sans UUID brut vérifiés. Le test live d'un toggle membre a retourné l'erreur UI attendue sans changement d'état sur l'Edge Function distante v117, qui ne contient pas les nouveaux changements locaux ; aucun déploiement n'a été effectué.
- **QA** : `pnpm run qa:front` vert ; test contrats backend 20/20 vert ; `deno check` vert ; `pnpm run qa:fast` vert ; `git diff --check` vert (avertissements de normalisation LF/CRLF uniquement).

### 2026-07-12 — Backend Phase 5 déployé
- **Déploiement** : Edge Function `api` version 118 `ACTIVE` sur le projet lié `rbjtrcorlezvocayluok`, avec `verify_jwt=false`, entrypoint `source/supabase/functions/api/index.ts` et import map `source/deno.json`. Aucun commit et aucune migration supplémentaire.
- **Périmètre effectivement embarqué** : tout l'état local de `backend/functions/api/` et ses dépendances partagées, incluant les phases Assistant IA précédentes et les modifications interactions/référentiels déjà présentes dans le worktree.
- **Probes** : routes `ai.settings.deleteModel`, `ai.settings.createQuota`, `ai.settings.deleteQuota`, `ai.access.save` et `ai.usage.byMember` présentes (401 `AUTH_REQUIRED` sans token, aucun 404 de routage) ; probes superadmin authentifiés `deleteModel`/`deleteQuota` en 404 métier attendu sur identifiant inexistant et `createQuota` en 400 de validation attendu ; CORS `OPTIONS` 200 pour `http://localhost:3000`.
- **QA de livraison** : `pnpm run qa` a exécuté 680/680 tests frontend mais reste bloquée par le seuil de couverture concurrent de `useDashboardStatusHelpers.ts` (13,33 % de branches pour 30 % requis). Déploiement poursuivi sur autorisation explicite avec `qa:front`, `qa:fast`, Deno check/tests et contrats Phase 5 verts.
