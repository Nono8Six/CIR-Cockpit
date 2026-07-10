# Phase 3 — Chat assistant sur la page Référentiels (UI)

> Prérequis : Phases 1 et 2 terminées (lire leurs changelogs). Lire `00-plan-general.md`.
> Périmètre : frontend. Gate QA : `pnpm run qa:front`.
> Objectif : un Dialog de chat accessible depuis `/remises/referentiels`, qui envoie la
> question + l'historique + le contexte de page à `ai.assistant.ask` et affiche la réponse
> sourcée, avec états de chargement / quota / indisponibilité propres.

## 1. Résultat attendu

Sur la page des référentiels, un bouton « Assistant IA » ouvre un Dialog centré (pas de Sheet
latérale — décision PO). L'utilisateur pose une question, voit la réponse en français, les
outils utilisés (sources), et peut enchaîner. Le contexte de page (import/run/onglet courant)
est transmis automatiquement pour résoudre « le dernier fichier tarif », « le fichier Segment… ».

## 2. Spécification détaillée

### 2.1 Design (consulter les références avant de coder)

Invoquer le skill `cir-cockpit-design` (tokens, densité, décisions PO) puis, si accès réseau,
regarder les patterns de chat/assistant de Linear, Attio, Stripe (direction visuelle, pas de
copie). Le chat doit respecter le design system local : tokens de couleur, densité, typographie,
composants `@/components/ui/*` existants (Dialog, Button, Badge, etc.). Dialog **centré**,
largeur confortable, hauteur bornée avec zone de messages scrollable et zone de saisie fixe en
bas.

### 2.2 Service front

Ajouter dans `frontend/src/services/ai.ts` :

- `askAiAssistant(input)` → `api.ai.assistant.ask.mutate` + `parseResponse(aiAssistantAskResponseSchema)`.
- `getAiAssistantStatus()` → `api.ai.assistant.status.query` + parse.

Suivre exactement le pattern `invokeTrpc` + `parseResponse` déjà en place dans ce fichier.
Ajouter les query keys nécessaires dans `frontend/src/services/query/queryKeys.ts`.

### 2.3 État de conversation (hook)

Créer `frontend/src/components/pricing-references/hooks/useAssistantChat.ts` (ou emplacement
cohérent avec la structure existante) :

- état : `messages: AiAssistantMessage[]` (rôles user/assistant), `pending`, `error`.
- `send(question)` : ajoute le message user, appelle `askAiAssistant` avec `history` **borné à
  12 derniers messages** (D6), le `page_context` courant et un `client_request_id` UUID créé une
  seule fois pour cet envoi ; un retry réseau réutilise impérativement le même identifiant.
  Ajouter ensuite la réponse assistant + ses citations/tool_trace.
- Gestion des erreurs via `handleUiError` (quota dépassé, indispo, timeout) — messages FR clairs.
- Conserver `tool_trace`/`citations` par message assistant pour l'affichage des sources.
- Pas de persistance : l'historique vit dans le state du Dialog, réinitialisé à la fermeture
  (ou bouton « Nouvelle conversation »).

### 2.4 Contexte de page

Ne pas supposer que `PricingReferencesPage` possède déjà tous les identifiants au niveau haut.
Vérifier le code réel : la page connaît au minimum l'import sélectionné et l'onglet actif, mais
le `run_id`/les snapshots peuvent être résolus plus bas dans les composants de changements ou via
des hooks dédiés. Construire le `page_context` (`aiAssistantPageContextSchema` de la phase 1) à
partir de l'état réellement disponible et choisir explicitement l'une des deux stratégies :

- **stratégie front** : lever/centraliser dans `PricingReferencesPage` la résolution `run_id`,
  `target_snapshot_id`, `base_snapshot_id` avant d'ouvrir le Dialog ;
- **stratégie backend** : envoyer `import_id`, `active_tab`, `surface`, `file_kind` et laisser le
  broker/outils résoudre le run/snapshot via la règle de phase 2.

Dans les deux cas, documenter dans le changelog quelle stratégie est retenue. `surface` =
`'pricing.references'`, `active_tab` = onglet courant, `file_kind` si l'onglet le précise. Ne pas
envoyer un `run_id` vide ou supposé : mieux vaut omettre le champ et laisser la résolution backend
agir.

### 2.5 Composant Dialog de chat

`frontend/src/components/pricing-references/components/assistant/AssistantChatDialog.tsx` :

- liste de messages (user à droite / assistant à gauche, ou style aligné au design system) ;
- rendu Markdown léger de la réponse (réutiliser un renderer existant si le repo en a un,
  sinon rendu texte + listes simples — ne pas ajouter de grosse dépendance sans nécessité).
  Désactiver le HTML brut et les URLs/protocoles dangereux : le contenu LLM reste non fiable ;
- bloc « Sources » repliable par message assistant listant les outils utilisés (`tool_trace`) ;
- zone de saisie (textarea + bouton envoyer, Entrée pour envoyer, Maj+Entrée = nouvelle ligne) ;
- indicateur de chargement pendant la boucle (peut être longue : jusqu'à ~60 s) — état
  « L'assistant analyse… » ;
- suggestions de questions de départ (les 4 questions PO) quand la conversation est vide ;
- si `status.enabled === false` : état désactivé explicite (raison : provider inactif, pas
  d'accès, quota) au lieu d'un champ de saisie inerte.

### 2.6 Point d'entrée sur la page

Ajouter le bouton d'ouverture dans `PricingReferencesPage.tsx` (barre d'actions/en-tête).
Griser/masquer selon `getAiAssistantStatus()`. Respecter la densité et le placement du design
system. Optionnel : raccourci clavier cohérent avec le pattern Ctrl+K existant s'il est trivial
à brancher — sinon s'abstenir.

### 2.7 Tests front

Tests Vitest (dans `__tests__/`) :

- rendu du Dialog, envoi d'une question (service mocké), affichage de la réponse et des sources ;
- état quota/indispo (status.enabled=false) ;
- bornage de l'historique à 12 messages passé au service.
- stabilité de `client_request_id` lors d'un retry et nouvelle valeur pour un nouvel envoi.

## 3. Checkpoints à valider

- [ ] `askAiAssistant` / `getAiAssistantStatus` ajoutés à `services/ai.ts` (pattern invokeTrpc/parseResponse) + query keys.
- [ ] Hook `useAssistantChat` : envoi, historique borné à 12, `client_request_id` stable par envoi/retry, erreurs via handleUiError, citations conservées.
- [ ] `page_context` construit depuis l'état réel de la page ; stratégie front ou backend de résolution `run_id`/snapshots documentée.
- [ ] `AssistantChatDialog` : Dialog centré (pas de Sheet), messages, sources repliables, saisie, chargement, suggestions initiales, état désactivé.
- [ ] Bouton d'entrée sur `PricingReferencesPage`, visibilité pilotée par `status`.
- [ ] Design conforme au design system local (tokens, densité, composants ui/*).
- [ ] Tests Vitest : envoi/réponse/sources, état désactivé, bornage historique, idempotency key stable au retry.
- [ ] `pnpm run qa:front` vert.

## 4. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 3 du chantier Assistant IA (chat UI sur la page Référentiels).

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md.
3. Lis les changelogs des phases 1 et 2 (docs/ASSISTANT_IA/phase-1-*.md et phase-2-*.md) pour
   connaître les contrats réellement livrés (noms de procédures, schémas, champs). Le code fait foi.
4. Lis docs/ASSISTANT_IA/phase-3-chat-referentiels-ui.md : c'est ta spécification.
5. Invoque les skills : cir-cockpit-design (AVANT toute UI), impeccable, vercel-react-best-practices,
   vitest. Consulte cir-cockpit-api-contracts pour le service RPC.
6. `git status --short` — ne touche pas aux modifications qui ne sont pas les tiennes.

Lis le code réel avant d'éditer :
- frontend/src/services/ai.ts (pattern invokeTrpc/parseResponse à suivre)
- frontend/src/services/query/queryKeys.ts
- frontend/src/components/pricing-references/PricingReferencesPage.tsx (états import/onglet
  réellement disponibles pour le page_context ; vérifier si run/snapshots doivent être levés
  depuis les composants enfants ou résolus backend ; barre d'actions pour le bouton d'entrée)
- shared/schemas/aiAssistant.schema.ts (schémas livrés en phase 1)
- composants Dialog et ui/* existants ; un éventuel renderer Markdown déjà présent
- Rappel décision PO : détails en Dialog CENTRÉ, jamais en Sheet latérale.

Implémente les sections 2.1 à 2.7. Contraintes : imports via alias @/*, erreurs via
handleUiError, historique borné à 12 messages, zéro donnée mockée / TODO dans le code livré,
pas de nouvelle grosse dépendance sans justification. Respecte tokens/densité du design system.

Vérifie le rendu avec les outils preview_* (démarre le dev server via preview_start, ouvre
/remises/referentiels, ouvre le Dialog, teste une question — service réel si clé dispo, sinon
vérifie au moins l'état désactivé et le rendu). Écris les tests Vitest. Lance `pnpm run qa:front`
jusqu'au vert.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 3, mets à jour le
tableau de suivi (§8) de 00-plan-general.md. Ne commit/déploie pas sans demande explicite.
```

## 5. Notes de risque

- La boucle peut durer jusqu'à ~60 s (D4 non-streaming) : soigner l'état de chargement, ne pas
  laisser croire à un gel. Si la latence est jugée inacceptable en test réel, le noter pour la
  réévaluation SSE de la phase 6 — ne pas improviser du streaming ici.
- Ne pas réintroduire de Sheet latérale (violation décision PO).
- Le `page_context` doit refléter l'état réellement affiché, sinon « le fichier Segment… »
  se résout au mauvais import. Ne pas fabriquer un `run_id`/snapshot que la page ne détient pas.

## 6. Changelog

<!-- À remplir en fin de phase. -->

_(vide — phase non encore exécutée)_
