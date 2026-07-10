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

- [ ] `AdminAiPanel` découpé en sous-composants par onglet (fin du monolithe 955 lignes).
- [ ] Onglet Vue d'ensemble : synthèse provider/coût/usage, sans édition.
- [ ] Onglet Fournisseur & modèles : CRUD multi-modèles + défaut provider ou défaut par feature réellement persistant + clé (test, jamais en clair).
- [ ] Onglet Accès membres : overview effectif (noms résolus), override membre/agence, défaut global, conso par membre.
- [ ] Onglet Quotas : création + édition + suppression de politiques, périmètres/features résolus en noms.
- [ ] Onglet Prompts : branché sur ai.prompts.* (édition brouillon, publication, restauration, historique).
- [ ] Onglet Usage & audit : filtres + noms résolus + graphes conservés.
- [ ] Plus aucun uuid brut affiché ; plus aucune valeur provider/modèle hardcodée en dur bloquante ; aucune UI de modèle par feature sans persistance backend réelle.
- [ ] Services front complétés (pattern invokeTrpc/parseResponse) ; procédures backend manquantes ajoutées proprement si besoin.
- [ ] Tests Vitest à jour (dont résolution des noms) ; `pnpm run qa:front` vert et, si backend/shared touché, checks back ciblés ou `pnpm run qa:fast` verts.

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

_(vide — phase non encore exécutée)_
