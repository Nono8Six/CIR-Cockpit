# Plan de refonte Agentic First

## 1. Statut et autorité

| Élément | Valeur |
| --- | --- |
| Statut | Plan canonique unique du socle agentique |
| Ouvert le | 2026-08-15, Europe/Paris |
| Périmètre | POC personnel pré-production, local et interruptible |
| Cible technique | [`stack-cible-agentique-et-comparatif-existant.md`](./stack-cible-agentique-et-comparatif-existant.md) |
| Architecture produit | [`../architecture-cible-cir-cockpit.md`](../architecture-cible-cir-cockpit.md) |
| Suivi GitHub | [Programme #23](https://github.com/Nono8Six/CIR-Cockpit/issues/23) |

Ce plan remplace l'ancien plan `SA-0…SA-7`. Valider ce document n'autorise ni
dépendance, migration, déploiement, commit ni push.

## 2. Ce qui a été arrêté le 2026-08-15

L'ancien chantier reposait sur une décision structurante — « le backend Deno
porte le POC, aucun second runtime, aucun moteur durable » — que la cible
technique contredit frontalement. Continuer SA-2 aurait perfectionné une
architecture supersédée.

Arrêté et supprimé :

- le plan `plan-socle-agentique.md` et ses tranches SA-0 à SA-7 ;
- les ADR `0001` à `0004` et l'audit `audit-et-proposition-socle-agentique.md` ;
- le shadow one-shot SA-2 : service backend, schéma partagé, procédure tRPC
  `pricing.references.watch.shadow`, service frontend, panneau React et leurs
  tests ;
- l'extension `json_object` de l'adaptateur Mistral et la résolution de modèle
  sans prompt, introduites uniquement pour ce shadow.

Le contrat tRPC est revenu à 98 procédures, avec le même *contract fingerprint*
qu'avant SA-2 : la surface publique est exactement celle d'avant le chantier.

Aucun smoke Mistral supplémentaire n'a été demandé, aucune correction de parsing
n'a été tentée.

**Écart GitHub non bloquant.** Les issues [#26](https://github.com/Nono8Six/CIR-Cockpit/issues/26)
à [#32](https://github.com/Nono8Six/CIR-Cockpit/issues/32) décrivent encore les
tranches SA-2 à SA-7 et restent ouvertes ; [#23](https://github.com/Nono8Six/CIR-Cockpit/issues/23)
décrit encore l'ancien programme. Le token GitHub disponible est en lecture seule
sur les issues (HTTP 403 sur `PATCH /issues`). La fermeture et la réécriture
restent à faire lorsque cet accès sera disponible. L'étape 1 technique est
terminée et cet écart administratif ne bloque pas le ménage local ; ce document
fait foi en cas d'écart.

## 3. Actifs conservés

### 3.1 `ReferenceWatchFacts`

La projection de faits est conservée comme actif métier. Elle a été déplacée de
`services/ai/` vers
[`backend/src/services/pricing/references/`](../../backend/src/services/pricing/references/referenceWatchFacts.ts),
à côté des services de diff qu'elle compose.

Preuve de neutralité : elle ne dépend que du contrat Zod partagé
`pricing/references`, du helper d'erreur CIR, des types `AuthContext`/`DbClient`
et des services de diff. Aucune dépendance à Mistral, à la gouvernance IA, au
shadow ni à un transport. Ses 12 tests déterministes passent après déplacement.

Elle n'a plus de consommateur applicatif avant le vertical AI SDK de l'étape 4.
C'est assumé : elle est protégée par ses tests et sera le premier vertical
rebranché.

### 3.2 Doctrine de preuve

Toute projection destinée à un modèle distingue :

- `fact` — valeur déterministe avec sa source ;
- `missing` — donnée absente ou brique non livrée ;
- `ambiguous` — plusieurs interprétations sans arbitrage métier.

Une donnée manquante reste manquante. Elle ne devient jamais zéro, ni certitude.
Le texte issu des fichiers sources reste marqué non fiable même lorsqu'il est
recopié tel quel.

### 3.3 Séparation requête / commande

Une **requête** retourne un résultat borné et sourcé sans effet métier. Une
**commande** ajoute clé d'idempotence, risque et règle d'approbation. Les
services métier existants restent responsables de validation, identité, agence,
autorisation, transaction et erreurs.

Le modèle choisit une capacité bornée. Il ne reçoit ni SQL général, ni Supabase
MCP, ni catalogue d'outils non borné.

### 3.4 Propositions et autonomie

Une proposition métier est un objet durable distinct de
`ai_request_reservations`, qui reste un registre technique de quotas, coûts et
appels idempotents. Son contrat distingue au minimum : type et charge utile
bornée, faits observés et données manquantes, version et clé métier
d'idempotence, décision `proposed` / `approved` / `rejected`, expiration,
référence de l'effet créé, auteur et dates.

L'approbation et le refus sont des commandes distinctes. Une approbation crée au
plus une tâche.

La progression `shadow` → `supervised` → `autonomous` dépend d'une matrice
déterministe : type d'action, impact, droits, données, bornes métier et
résultats d'évaluation. Aucun score de confiance auto-attribué par le modèle
n'autorise une action.

### 3.5 Baseline live

Mesure du 2026-08-14 sur le run `450ea0d3-5dd4-4800-ac3a-e93fcb631cfb`, via
l'ancien chemin Mistral direct : 2 appels bornés, 46 292 tokens d'entrée, 2 685
de sortie, 0,027 USD, 61 488 ms de latence tracée, sortie invalide après
réparation.

Cette mesure sert de point de comparaison au premier vertical AI SDK. Elle n'est
pas un objectif à reproduire.

## 4. Étapes

| Étape | Objet | Sortie attendue |
| --- | --- | --- |
| 1 | Arrêt SA-2 et cohérence documentaire | **Technique FAIT le 2026-08-15 ; GitHub en attente non bloquante** |
| 2 | Ménage workspace, dépendances, arborescence et frontières | **FAIT le 2026-08-15** |
| 3 | Cutover Node 24 | **FAIT le 2026-08-15** — API métier Node en service ; backend Deno et surfaces IA historiques supprimés |
| 4 | AI SDK 7 | **FAIT le 2026-08-16** — `AgentRuntime`, Mistral direct, vertical sourcé et réservé. Migration distante appliquée, prompt publié par la gouvernance existante, smoke Mistral réel valide, cité et rejouable |
| 5 | DBOS | `approve → createTask` transactionnel et reprise prouvée |
| 6 | Chat agentique | nouvelle surface interactive sur les projections et outils canoniques |

Une étape ne démarre pas avant la décision de sortie de la précédente.

### Étape 2 — Ménage

Assainir arborescence, dépendances, scripts et frontières de modules avant de
créer le workspace Node. Aucune création de runtime à cette étape.

Exécutée le 2026-08-15 : artefacts sans consommateur retirés, scripts et
configs concurrents réduits, barrel `types/supabase` remplacé par
`shared/supabase.types`, dépendances mises à jour dans le même major.
Le backend Deno et le legacy IA restent jusqu'à l'étape 3.

### Étape 3 — Cutover Node 24

Créer le workspace Node 24 ESM en TypeScript strict. Porter configuration
injectée, Hono, les procédures tRPC métier conservées, auth, erreurs et Drizzle.
Dans le même cutover, supprimer le backend Deno et les surfaces IA historiques :
routes assistant, consommateurs frontend, `assistantBroker.ts`, outils SQL et
adaptateurs providers maison. Ils ne sont jamais portés vers Node. L'assistant
peut rester temporairement absent du POC jusqu'aux étapes 4 et 6 ; aucun code de
transition n'est construit.

Gate : contrat tRPC régénéré conforme à la surface réellement conservée, aucun
import ou consommateur du legacy IA, auth et permissions identiques ou plus
restrictives sur les routes métier, erreurs publiques stables.

### Étape 4 — AI SDK 7

Introduire `AgentRuntime` avec un adaptateur AI SDK de production et un
adaptateur déterministe de test. Rebrancher `ReferenceWatchFacts` en
`generateText` + `Output.object` + validation Zod CIR, sans effet métier.

`ToolLoopAgent` est réservé au chat interactif réellement multi-étapes. Les
providers sont construits explicitement ; aucune string de modèle globale ne
passe par une gateway.

Gate : sortie structurée valide, tokens, coût et latence comparés à la baseline
du §3.5, tests d'injection indirecte verts, gouvernance CIR inchangée.

### Étape 5 — DBOS

Modéliser propositions, approbations et tentatives d'effet. Intégrer la
datasource Drizzle DBOS et rendre `approve → createTask` atomique avec le
journal d'effet et le checkpoint.

Gate bloquant préalable : spike de connexion et de bootstrap du schéma DBOS sur
une base isolée, sans toucher le projet Supabase distant.

Gate : au plus une tâche par proposition approuvée, après crash, retry et
concurrence.

### Étape 6 — Chat agentique

Construire le chat interactif directement sur `ToolLoopAgent`, les projections,
outils et policies canoniques. Aucun broker historique n'est migré ou réintroduit.
Consolider les scripts QA. MCP, sandbox, gateway et multi-agent sont évalués
seulement ensuite.

## 5. Règles de travail

- Une case reste vide sans preuve réellement exécutée.
- Une seule architecture canonique subsiste à chaque étape. Pas de strangler,
  dual-run, dual-write, feature flag, shim de compatibilité ni mécanisme de
  rollback sans consommateur prouvé qui l'exige.
- Un retrait est précédé d'une recherche réelle de consommateurs — imports,
  routes, procédures, tests — pas d'une procédure de retour arrière.
- Git est le filet de récupération. Un fichier jamais commité n'en bénéficie
  pas : le vérifier avant de le supprimer.
- Toute dépendance, migration, déploiement, commit ou push exige son
  autorisation courante.
- Une donnée de production rouvre un gate provider et conformité.

## 6. Journal

| Date | Décision ou preuve | Sortie |
| --- | --- | --- |
| 2026-08-14 | Exécution SA-1 puis SA-2 sur le runtime Deno ; live Mistral atteint, sortie invalide après réparation. | NO-GO SA-3 |
| 2026-08-15 | Cible technique Node 24 + AI SDK 7 + DBOS validée par le PO. | ancien plan SA supersédé |
| 2026-08-15 | Étape 1 technique : SA-2 arrêté et retiré, `ReferenceWatchFacts` conservé et déplacé, corpus `docs/IA_AGENTIQUE` réduit à trois documents, contrat tRPC revenu à 98 procédures. GitHub reste en lecture seule et sera réaligné ultérieurement. | GO technique étape 2 ; suivi GitHub non bloquant |
| 2026-08-15 | Étape 2 : ménage workspace, dépendances, scripts, configs et frontières. Artefacts régénérables `tmp/`/`outputs/` retirés, `qa-gate.sh` supprimé, barrel `frontend/src/types/supabase.ts` remplacé par `shared/supabase.types`, `react-day-picker` et adapters frontend sans consommateur retirés. Dépendances modernisées dans leur major, sauf `lint-staged` passé explicitement de 15 à 17 et compatible Node 24. Les sources d'import, le sidecar Impeccable et les probes SQL d'invariants sont conservés. Contrat tRPC : 98 procédures, fingerprint public inchangé. `qa:fast` vert : 920 tests frontend et 625 backend, zéro échec, 19 intégrations ignorées. | GO technique étape 3 |
| 2026-08-15 | Étape 3 : cutover Node 24. Workspace `backend/` ESM, Hono + `@hono/node-server`, tRPC, config Zod unique, auth Supabase JWT, Drizzle `postgres`. Legacy IA (broker, SQL génératif, adapters Mistral/OpenRouter, chat frontend) retiré. Gouvernance IA conservée. Deno, import maps et wrapper Edge Function retirés. Contrat tRPC : 95 procédures. `qa:fast` vert : 912 tests frontend, 449 tests backend, zéro échec. Probes locales : `/health` 200, CORS 200, tRPC sans token `AUTH_REQUIRED` 401. | GO technique étape 4 |
| 2026-08-16 | Étape 4 initiale : AI SDK 7 épinglé, vertical watch livré. Revue : NO-GO étape 5 (quotas non atomiques, tokens double-comptés, sortie non citée, `base_url` administrable, traces inventées). | NO-GO étape 5 |
| 2026-08-16 | Remédiation étape 4 : `client_request_id` + `private.reserve_ai_assistant_request` avant l'appel modèle ; coût/quotas n'additionnent plus cache/reasoning aux totaux ; citations `fact_id` vérifiées contre le paquet ; `createMistral` n'accepte plus de `baseURL` personnalisée ; pas de usage inventé si le modèle n'est pas résolu ; timeout déterministe borne aussi `output` asynchrone. Migration locale `20260816120000_ai_watch_reservations.sql` écrite, **non appliquée** au projet Supabase distant. Contrat tRPC : 96 procédures. `qa:fast` vert : 912 frontend, 487 backend. | GO technique local étape 4 ; étape 5 bloquée tant que la migration n'est pas autorisée |
| 2026-08-16 | Revue corrective finale de l'étape 4 : les politiques wildcard partagent désormais un verrou entre capacités et comptent toutes leurs réservations ; le replay vérifie les identifiants du run ; usage et finalisation sont écrits dans une transaction unique ; résumé, anomalies et recommandations exigent des faits réels, jamais `missing`/`ambiguous`. Test d'intégration SQL étendu à deux features concurrentes. Contrat tRPC : 96 procédures. `qa:fast` vert : 912 frontend, 492 backend ; après ajout de la dernière régression de citation, suite backend complète : 493 tests verts. Migration toujours **non appliquée** au distant. | GO technique local étape 4 ; application distante encore soumise à autorisation PO |
| 2026-08-16 | Migration distante `20260816064437_ai_watch_reservations` appliquée via MCP, SQL local/distant identique. Contrainte et fonction vérifiées, exécution limitée au `service_role`, `search_path` vide. Test PostgreSQL réel : 20 admissions concurrentes sur deux features sous quota wildcard, vert. Navigateur : écran de connexion chargé sans erreur console. Backend courant testé sur port isolé : santé et CORS verts, utilisateur refusé proprement, administrateur arrêté sur `AI_CONFIG_MISSING`. État distant : provider et modèle Mistral présents ; prompt `pricing.references.diagnose` non publié. État local : `AI_SECRET_ENCRYPTION_KEY` absent. Le service Windows existant reste sur l'ancien processus faute de droits de redémarrage. | Migration GO ; étape 4 runtime NO-GO jusqu'au prompt, secret, redémarrage administré et smoke Mistral |
| 2026-08-16 | Clôture runtime de l'étape 4. Prompt : template `pricing.references.diagnose` désarchivé puis version 2 publiée via `ai.prompts.setArchived`, `saveDraft` et `publish`, sans second système ; la version 1 décrivait l'ancien contrat de sortie et devenait invalide. Secret : ancienne `AI_SECRET_ENCRYPTION_KEY` définitivement perdue — absente de `backend/.env`, de la configuration du service, des variables Windows et de l'historique Git, et non restituable par Supabase ; nouvelle clé locale régénérée puis clé API Mistral ressaisie par le PO dans l'UI admin, `ai.settings.testProvider` `success`. Service `CIR-Cockpit-API` redémarré par le PO à 11:04:57, après l'écriture du `.env` à 11:03:30. Smoke réel : `mistral-large-2512`, 200 en 19 699 ms, 23 256 tokens entrée et 1 021 sortie, 0,01315950 USD, `finish_reason` `stop`, sortie conforme au schéma Zod, paquet tronqué et limite de troncature ajoutée par le serveur. Citations vérifiées indépendamment en base : les trois `diff.*` cités existent, appartiennent au couple de snapshots du run et portent `changed_columns = {coef_retro}`. Replay du même `client_request_id` : 200 en 620 ms, résultat et `request_id` identiques, aucun second `ai_usage_events`. Même clé sur un autre run : 409 `CONFLICT`. Réservation unique `status=success`, `actual_tokens=24277`, réponse rejouable, TTL 15 minutes. Comparaison à la baseline §3.5, mesurée sur le même run : 1 appel contre 2, 23 256 tokens d'entrée contre 46 292, 1 021 de sortie contre 2 685, 0,0132 USD contre 0,027, 19 699 ms contre 61 488, et sortie valide et citée là où la baseline restait invalide après réparation. Zéro mutation métier : comptes identiques avant et après sur diffs, runs, snapshots, anomalies, imports et tâches. Navigateur authentifié : la gouvernance IA affiche 1 appel, 24 277 tokens et 0,0132 USD ; aucune erreur applicative en console, seules des violations de contraste signalées par `@axe-core/react` en mode développement. | GO étape 5 |
| 2026-08-16 | Revue PO de la clôture étape 4 : preuves fonctionnelles confirmées indépendamment, trois corrections exigées avant DBOS. Double-comptage corrigé dans les deux surfaces de restitution restantes, `aiGovernance.ts` et `aiAccess.ts`, qui additionnaient encore cache et raisonnement aux totaux alors que `cached_input_tokens` est inclus dans `input_tokens` et `reasoning_tokens` dans `output_tokens` ; le total redevient `input_tokens + output_tokens`, définition déjà appliquée par `loadQuotaUsage` et par la finalisation de réservation. Le smoke ne pouvait pas révéler l'écart, ses deux compteurs valant zéro ; mesure sur les données réelles : `assistant.referentiels` affichait 11 110 588 tokens au lieu de 8 001 330, soit +38,9 %. `backend/logs/`, écrit par le service administré, est désormais ignoré par Git. Contrat tRPC régénéré : seule l'empreinte de source change, surface publique inchangée. Faille locale de privilèges ouverte et non corrigée ici : le service tourne en `LocalSystem` et exécute le TypeScript du dépôt, alors que `backend` et `backend/.env` accordent `Modify` aux utilisateurs authentifiés et à des groupes de bac à sable — élévation vers SYSTEM au redémarrage et lecture des secrets, dont `AI_SECRET_ENCRYPTION_KEY`, la clé service-role et le mot de passe base. Remédiation à la main du PO : compte de service non privilégié et restriction des ACL. | Étape 5 conditionnée à la remédiation de privilèges |

## 7. Sources techniques primaires

- [Node.js — calendrier des versions LTS](https://nodejs.org/en/about/previous-releases)
- [AI SDK — sorties structurées](https://ai-sdk.dev/docs/reference/ai-sdk-core/output)
- [AI SDK — outils, approbations et conditions d'arrêt](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [DBOS — transactions et datasources](https://docs.dbos.dev/typescript/tutorials/transaction-tutorial)
- [DBOS — intégration Supabase](https://docs.dbos.dev/integrations/supabase)
- [OWASP — excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
