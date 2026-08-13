# Plan d'exécution — Socle Agentique

## 1. Statut et autorité

| Élément | Valeur |
| --- | --- |
| Statut du document | Plan canonique prêt à valider, implémentation non commencée |
| Tranche programme | Socle Agentique (SA), transverse aux briques |
| Date de l'audit de départ | 2026-08-13, Europe/Paris |
| Autorité métier | Décisions PO du cadrage Socle Agentique |
| Autorité d'architecture | `docs/architecture-cible-cir-cockpit.md` |
| Prérequis livré | Brique 3 Tâches et relances |
| Vérité runtime | Projet Supabase `CIR_Cockpit` (`rbjtrcorlezvocayluok`) |
| Règle de progression | Une tranche ouverte à la fois, décision de sortie explicite avant la suivante |

Ce document est conçu pour être coché pendant l'exécution. Une case n'est cochée
qu'après ajout dans le journal de la preuve réellement obtenue.

Le Socle Agentique n'est pas une brique métier. C'est la couche transverse qui
permet à CIR Cockpit d'exécuter un travail **sans requête humaine**, de façon
durable, idempotente, tracée et bornée par des permissions. Il répond à la
décision ouverte n°19 de l'architecture — « quel runtime portera les imports et
indexations longues » — et au `À VALIDER` de sa section 11.2.

Il est explicitement conçu pour que les sources futures — Outlook, ERP/AS400,
téléphonie — se branchent **sans redécoupage** : elles n'ajoutent qu'un
connecteur de source, jamais un nouveau moteur d'exécution.

## 2. État actuel revérifié

### 2.1 Code local

- branche `codex/b3-4-activity-recurrence`, worktree sale hors périmètre à préserver ;
- **aucun runtime d'arrière-plan applicatif** : ni queue, ni outbox, ni worker,
  ni `EdgeRuntime.waitUntil` dans le code de `backend/functions/api` ;
- la récurrence de tâches crée l'occurrence suivante dans la transaction de
  clôture (`backend/functions/api/services/tasks/taskService.ts`), donc
  uniquement sur clic humain ;
- assistant IA : 12 outils, tous du domaine référentiels/imports/diffs/anomalies,
  plus les outils SQL bornés (`services/ai/assistantTools.ts`) ;
- **aucun outil d'écriture IA** : la surface assistant est intégralement en
  lecture ;
- l'assistant n'est exposé que dans un dialog de `PricingReferencesPage` ;
- `assistantBroker.ts` = 2800 lignes, `aiGovernance.ts` = 2656 lignes :
  l'orchestrateur doit être touché pour chaque nouveau domaine, ce que la
  section 10.2 de l'architecture cherche précisément à éviter ;
- le contrat `AssistantTool` (`name/version/inputSchema/outputSchema/run`) est un
  chemin parallèle aux procédures tRPC, sans source commune ;
- la gouvernance IA en base est en revanche solide et réutilisable :
  `ai_request_reservations` (idempotence par `client_request_id`, statuts
  `reserved/success/error/blocked`), `ai_response_cache`, `ai_usage_events`,
  `ai_quota_policies`, `ai_model_configs`, `ai_prompt_templates` / `_versions`,
  `ai_provider_configs`, `ai_feature_grants`.

### 2.2 Supabase distant

Contrôle en lecture seule du 2026-08-13 :

| Preuve | Valeur observée |
| --- | ---: |
| Edge Function `api` | version 225, `ACTIVE`, `verify_jwt=false` |
| Tables `public` | 66 |
| `pg_cron` | **1.6.4 installé**, schéma `pg_catalog` |
| Jobs cron actifs | 2 — `audit_logs_retention_daily`, `ai_data_retention_daily` |
| Forme des jobs existants | `select private.run_*()`, SQL pur, sans appel HTTP |
| `pgmq` | 1.5.1 **disponible, non installé** |
| `pg_net` | 0.20.0 **disponible, non installé** |
| `supabase_vault` | 0.3.1 installé |
| `vector` | 0.8.0 disponible, non installé |
| `pg_trgm` | 1.6 installé |
| `pricing_reference_imports` | 7 |
| `pricing_reference_diffs` | 7 659 |
| `pricing_supplier_segments` | 64 801 |
| `tasks` | 6 |
| `activities` | 2 |
| `entities` | 6 |
| `ai_usage_events` | 1 247 |

Deux conclusions décisives.

**L'horloge existe déjà et le pattern est éprouvé sur ce projet.** `pg_cron`
appelle déjà des fonctions `private.*` en production. Le Socle Agentique
n'introduit pas une mécanique inconnue : il étend une mécanique qui tourne.

**Le seul domaine qui possède des données réelles est le domaine catalogue.**
64 801 segments et 7 659 diffs contre 6 tiers et 2 activités. Toute preuve
agentique à court terme doit se faire là, et nulle part ailleurs.

### 2.3 Contrainte de plateforme à respecter

| Contrainte | Valeur | Conséquence de conception |
| --- | --- | --- |
| Wall clock Edge Function | 400 s | une invocation de worker exécute **une** étape et sort ; jamais de boucle longue |
| Budget actuel du broker IA | `OVERALL_TIMEOUT_MS = 180_000`, `MAX_TOOL_ROUNDS = 12` | aucune marge pour du multi-étapes autonome en requête |
| Bail de tâche recommandé | 5 min | toute étape doit tenir sous le bail, sinon double exécution concurrente |
| Effets de bord | interrompus après effet mais avant checkpoint → rejoués | **tout effet de bord doit être idempotent**, sans exception |

## 3. Périmètre

### 3.1 Inclus

- runtime durable Postgres-natif : file, horloge, bail, tentative, reprise ;
- worker sans état exposé comme route dédiée de l'Edge Function `api` ;
- journal d'exécution `agent_runs` / `agent_steps` avec checkpoint par étape ;
- registre d'actions métier typées, unique pour tRPC, IA, worker et MCP futur ;
- politiques d'action administrables : activation, autonomie, budget, approbation ;
- journal d'événements métier (outbox transactionnelle) ;
- abstraction de source d'ingestion, ouverte pour Outlook, ERP et téléphonie ;
- registre de preuves et registre d'approbations ;
- première preuve verticale : veille autonome des référentiels fournisseurs ;
- branchement de l'assistant existant sur le registre d'actions ;
- observabilité : corrélation `request_id` / `run_id`, coûts, échecs, reprises.

### 3.2 Exclus

- toute action sortante vers un client ou un fournisseur — autonomie plafonnée
  au niveau 3, décision SA-D08 ;
- connecteur Outlook, connecteur ERP/AS400, transcription téléphonique : le
  socle prépare leur point d'ancrage, il ne les implémente pas ;
- référence produit canonique et prix catalogue par référence, qui relèvent des
  Filières Produit 1 et 2 ;
- embeddings, recherche vectorielle et `vector` : la section 10.3 de
  l'architecture verrouille la recherche structurée d'abord ;
- serveur MCP exposé à l'extérieur : adaptateur ultérieur sur le registre SA-2 ;
- notifications email, SMS ou push ;
- Opportunités, Devis, Commandes, Pilotage : Briques 4 à 6 ;
- refonte de l'interface assistant au-delà du strict nécessaire à SA-6 ;
- scoring IA de priorité : les priorités restent déterministes.

### 3.3 Contrat IA du socle

Contrairement aux Briques 1 à 3, ce socle **possède** un contrat IA, puisqu'il
est la plateforme d'exposition elle-même. Il déclare :

- outils de lecture : issus du registre d'actions, aucun outil écrit à la main ;
- actions préparables : création de tâche, annotation d'import, proposition de
  correction de mapping — toutes internes, toutes idempotentes ;
- format de preuve : ligne `evidence` obligatoire pour toute affirmation portant
  sur une donnée CIR ;
- budgets : hérités de `ai_quota_policies`, plus un budget par exécution ;
- évaluations : jeu de cas sur le domaine référentiels, réutilisant le socle
  d'évaluation existant.

## 4. Décisions métier et techniques à verrouiller

Les décisions PO déjà prises pendant le cadrage sont notées **VALIDÉ**. Les
autres doivent être tranchées avant la tranche qui les consomme.

| Réf | Décision | Statut |
| --- | --- | --- |
| SA-D01 | Le socle agentique passe **avant la Brique 4**. | VALIDÉ 2026-08-13 |
| SA-D02 | Seule source externe disponible aujourd'hui : catalogues et tarifs fournisseurs. Pas d'Outlook, pas d'ERP/AS400, pas de téléphonie. | VALIDÉ 2026-08-13 |
| SA-D03 | Première preuve verticale : veille des changements de référentiels fournisseurs et aide à la mise à jour des catalogues. | VALIDÉ 2026-08-13 |
| SA-D04 | Le socle doit accueillir Outlook et l'ERP par ajout d'un connecteur de source, sans modification du moteur d'exécution. | VALIDÉ 2026-08-13 |
| SA-D05 | Runtime : Postgres natif — `pg_cron` comme unique horloge, `pgmq` comme file, `pg_net` comme transport, Edge Function `api` comme worker sans état. Aucune infrastructure externe. | À valider SA-0 |
| SA-D06 | Le worker est une **route dédiée de l'Edge Function `api`**, pas un nouveau slug — conformité à la décision « slug unique ». | À valider SA-0 |
| SA-D07 | Authentification du worker : secret dédié stocké dans `supabase_vault`, présenté en en-tête par `pg_net`, vérifié par un middleware distinct du middleware JWT utilisateur. Le `service_role` ne circule jamais dans un parcours utilisateur. | À valider SA-0 |
| SA-D08 | Autonomie maximale = **niveau 3**. L'agent écrit uniquement en interne : tâches, alertes, annotations, propositions. Aucune action sortante, jamais, dans ce socle. | VALIDÉ 2026-08-13 |
| SA-D09 | Identité de l'agent : principal système explicite, distinct d'un utilisateur humain, portant une agence de portée par exécution, journalisé comme acteur d'audit. | À valider SA-1 |
| SA-D10 | La sortie de l'agent réutilise les **`tasks` de la Brique 3** et le registre d'approbations. Aucune boîte de réception parallèle, aucun dossier de revue séparé. | À valider SA-0 |
| SA-D11 | Convention d'idempotence : clé stable dérivée de `(action, portée métier, fenêtre)`, sur le modèle déjà appliqué par `ai_request_reservations`. | À valider SA-1 |
| SA-D12 | Durée du bail d'étape et politique de reprise : bail court, tentatives bornées, file de rebut explicite après épuisement. | À valider SA-1 |
| SA-D13 | Rétention de `agent_runs`, `agent_steps`, `business_events` et `evidence`, alignée sur les jobs de rétention existants. | À valider SA-1 |
| SA-D14 | Une action déclarée dans le registre est exposée à l'IA **seulement** si sa politique l'autorise explicitement. L'exposition n'est jamais implicite. | À valider SA-2 |
| SA-D15 | Toute affirmation de l'assistant portant sur une donnée CIR produit une ligne `evidence` ; l'absence de preuve interdit l'affirmation. | À valider SA-4 |

## 5. Architecture du socle

### 5.1 Forme générale

```text
   SOURCES                 ÉVÉNEMENTS            EXÉCUTION            ACTIONS
┌─────────────┐         ┌──────────────┐     ┌──────────────┐    ┌─────────────┐
│ Catalogues  │────────>│              │     │ pg_cron tick │    │  Registre   │
│ fournisseur │         │  business_   │────>│      +       │───>│  d'actions  │
├─────────────┤         │  events      │     │  pgmq file   │    │   typées    │
│ Outlook     │  plus   │  (outbox)    │     │      +       │    └──────┬──────┘
│ ERP/AS400   │  tard   │              │     │ worker `api` │           │
│ Téléphonie  │────────>│              │     │  sans état   │           v
└─────────────┘         └──────────────┘     └──────┬───────┘    ┌─────────────┐
                                                    │            │  Services   │
                                                    v            │ métier      │
                                          ┌──────────────────┐   │ déterministes│
                                          │ agent_runs       │   └──────┬──────┘
                                          │ agent_steps      │          │
                                          │ (checkpoints)    │          v
                                          └──────────────────┘   ┌─────────────┐
                                                                 │  evidence   │
                                                                 │  approvals  │
                                                                 │  tasks (B3) │
                                                                 └─────────────┘
```

Les quatre colonnes sont indépendantes. Ajouter Outlook demain n'ajoute qu'une
ligne dans la première colonne et un producteur d'événements. Le reste ne bouge
pas. C'est l'exigence SA-D04.

### 5.2 Le principe structurant : une action, toutes les interfaces

C'est la décision la plus importante du socle, et la seule idée réellement
neuve par rapport à l'existant.

Aujourd'hui, une capacité métier s'écrit deux fois : une procédure tRPC pour
l'humain, un `AssistantTool` pour l'IA. Ces deux chemins divergeront.

Cible : le **service métier** devient l'unité canonique unique. Il déclare :

```text
name              identifiant stable, versionné
description       texte destiné au modèle
input             schéma Zod partagé
output            schéma Zod partagé
permissions       rôles et portée d'agence requis
idempotencyKey    fonction pure des entrées
dryRun            prévisualisation sans effet
requiresApproval  niveau d'autonomie exigé
estimatedCost     lignes, tokens, temps
execute           implémentation déterministe
```

Quatre adaptateurs minces le consomment, sans logique propre :

| Adaptateur | Rôle | État |
| --- | --- | --- |
| Procédure tRPC | surface humaine | existant, à rebrancher |
| Outil assistant | surface IA | existant, à remplacer par génération |
| Étape de worker | surface autonome | créé par ce socle |
| Serveur MCP | surface externe | hors périmètre, prévu |

Effet recherché : **chaque nouvelle brique rend l'assistant transversal
gratuitement**, en déclarant ses actions, sans que l'orchestrateur soit
réécrit. C'est l'objectif de la section 10.2 de l'architecture, jamais atteint
jusqu'ici.

### 5.3 Objets de données à créer

| Objet | Rôle | Remarque |
| --- | --- | --- |
| `business_events` | outbox transactionnelle des faits métier | écrite dans la même transaction que le fait ; jamais d'appel réseau en transaction |
| `agent_sources` | déclaration d'une source d'ingestion et de sa configuration | point d'ancrage Outlook / ERP / téléphonie |
| `agent_runs` | une exécution durable : type, déclencheur, statut, agence, acteur, bail, tentative, budget | grain de reprise |
| `agent_steps` | étapes checkpointées d'une exécution, avec clé d'idempotence et sortie | rejeu sans réexécution |
| `agent_action_policies` | politique par action : activée, autonomie, budget, approbation requise, exposition IA | même esprit que `ai_quota_policies` |
| `agent_approvals` | action proposée, charge utile, demandeur, décideur, décision, date | matérialise le niveau 5 |
| `evidence` | affirmation, objet et champ source, document et page, date d'observation, confiance, statut de validation | exigence 4.1-6 et 10.5 |

Le registre d'actions lui-même reste **du code typé**, pas une table. Seule sa
*politique* est en base, exactement comme les modèles et quotas IA actuels.

### 5.4 Ce que le socle ne réinvente pas

- l'idempotence et la réservation de coût : pattern `ai_request_reservations` ;
- la rétention : mécanique `private.run_*()` déjà planifiée par `pg_cron` ;
- les fonctions sensibles en schéma `private` : convention déjà établie ;
- le système d'erreurs : catalogue CIR, `request_id`, retries bornés,
  circuit breaker, tels que définis en 11.6 ;
- la sortie utilisateur : `tasks` de la Brique 3, pas un nouvel inbox.

## 6. Première preuve verticale — veille des référentiels

### 6.1 Ce qui est réellement possible aujourd'hui

Le moteur de diff couvre cinq types d'objet — `classification`, `segment`,
`liaison`, `grille`, `anomalie` — et cinq types de changement — `ajoute`,
`supprime`, `modifie`, `anomalie_apparue`, `anomalie_disparue`.

| Question posée | Faisable dans ce socle |
| --- | --- |
| Nouvelles familles fabricant d'un fournisseur entre deux imports | Oui — diff `segment` / `classification` |
| Familles modifiées, libellés changés | Oui — `changed_columns` |
| Remises, coefficients et bornes d'achat qui ont bougé | Oui — diff `grille` |
| Liaisons cassées vers la classification CIR | Oui — diff `liaison` |
| Anomalies apparues ou résolues | Oui — diff `anomalie` |
| **Prix d'une référence produit entre deux catalogues** | **Non — la donnée n'existe pas** |

### 6.2 Limite à écrire noir sur blanc

`pricing_supplier_segments` porte `segment`, `marque`, `cat_fab`, `cat_fab_l`,
`strategiq`, `codif_fair`, `tarif_fab`. Les grilles portent des remises et des
coefficients. **Aucune référence produit et aucun prix tarif par article
n'existent en base.**

Une question du type « quelle est la différence de prix du catalogue FESTO entre
janvier et juin, référence par référence » est donc hors d'atteinte, non par
limite d'IA mais par absence de modèle. Elle relève des Filières Produit 1 et 2.
Ce socle ne doit pas prétendre y répondre, ni fabriquer une réponse approchée.

### 6.3 Comportement cible de la preuve

À l'activation d'un snapshot, un événement est publié. Le worker :

1. réserve l'exécution avec une clé idempotente `(veille, snapshot, fournisseur)` ;
2. compare le snapshot activé au précédent, par fournisseur ;
3. agrège les changements par type d'objet et par sévérité ;
4. écrit une ligne `evidence` par affirmation, pointant snapshot, import,
   fichier source et numéro de ligne ;
5. crée une tâche interne par changement exigeant un arbitrage humain ;
6. clôt l'exécution avec coût, durée et compteurs.

L'utilisateur ouvre l'espace Tâches et voit le travail déjà préparé, sans avoir
lancé quoi que ce soit. L'assistant répond ensuite aux questions de suivi en
s'appuyant sur les mêmes actions et les mêmes preuves.

Critère d'acceptation non négociable : **la veille doit se produire sans aucune
requête humaine**, et deux exécutions du même événement ne doivent produire ni
doublon de tâche, ni doublon de preuve.

## 7. Plan d'exécution coché par preuves

### 7.1 Protocole de reprise

Identique au protocole de la Brique 3 : une issue programme, une issue par
tranche, une conversation neuve par tranche, preuves commentées avant
fermeture. La création des issues n'autorise ni migration, ni déploiement, ni
commit, ni push. Les numéros d'issue sont à créer sur autorisation distincte.

| Tranche | Objet | Effort | Condition de démarrage |
| --- | --- | ---: | --- |
| SA-0 | Spécification et décisions | medium | validation PO de ce document |
| SA-1 | Runtime durable | high | SA-0 close, autorisation de migration |
| SA-2 | Registre d'actions | high | SA-1 close |
| SA-3 | Événements et sources | medium | SA-2 close |
| SA-4 | Preuves et approbations | medium | SA-3 close |
| SA-5 | Veille référentiels autonome | high | SA-4 close |
| SA-6 | Assistant branché sur le registre | high | SA-5 close |
| SA-7 | Recette, observabilité, clôture | medium | SA-6 close |

### SA-0 — Spécification et état de départ

Objectif : rendre ce plan exécutable et figer la preuve de départ.

- [x] Auditer le code, les contrats et l'assistant existants.
- [x] Relever l'état distant : extensions, jobs cron, Edge Function, compteurs.
- [x] Confirmer l'absence totale de runtime d'arrière-plan applicatif.
- [x] Établir la limite de données de la preuve verticale (aucun prix produit).
- [ ] Trancher SA-D05, SA-D06, SA-D07 et SA-D10.
- [ ] Faire valider ce plan par le PO avant toute migration ou implémentation.

Preuves de sortie : présent document, `pnpm run qa:docs`, diff limité à ce
fichier, worktree hors périmètre préservé.

Décision de sortie attendue : `GO SA-1 / SA-1 non commencée`.

### SA-1 — Runtime durable

Objectif : rendre possible l'exécution d'un travail sans requête humaine, de
façon reprenable, sans aucune infrastructure externe.

- [ ] Revérifier extensions, jobs cron et version d'Edge Function.
- [ ] Trancher SA-D09, SA-D11, SA-D12, SA-D13.
- [ ] Charger `supabase-postgres-best-practices`, `cir-cockpit-api-contracts`,
      `cir-error-handling`, `drizzle-orm` selon le routeur.
- [ ] Écrire d'abord les tests : bail expiré, reprise, tentative bornée,
      idempotence, exécution concurrente, file de rebut.
- [ ] Préparer la migration : activation `pgmq` et `pg_net`, tables `agent_runs`
      et `agent_steps`, contraintes, index, RLS forcée, ACL, audit.
- [ ] Créer `private.agent_runtime_tick()` et sa planification `pg_cron`,
      alignées sur la forme des jobs existants.
- [ ] Stocker le secret worker dans `supabase_vault`, sans jamais l'exposer.
- [ ] Faire relire le SQL complet et les requêtes de preuve avant exécution.
- [ ] Obtenir l'autorisation PO spécifique d'appliquer la migration.
- [ ] Appliquer une seule fois la migration via MCP Supabase.
- [ ] Extraire le SQL distant exact dans `backend/migrations/`.
- [ ] Mettre à jour Drizzle et régénérer les types depuis le distant.
- [ ] Créer la route worker dans l'Edge Function `api`, avec middleware
      d'authentification distinct du middleware JWT utilisateur.
- [ ] Prouver qu'une invocation exécute **une** étape et sort sous le bail.
- [ ] Prouver la reprise après interruption : étape checkpointée non rejouée,
      étape interrompue rejouée sans doublon d'effet.
- [ ] Prouver le refus d'accès à la route worker sans secret valide.
- [ ] Exécuter advisors sécurité et performance, traiter les alertes.
- [ ] `pnpm run repo:check`, puis la gate QA choisie.

Preuves de sortie : parité migration local/distant, empreinte SQL, types
générés, exécution durable observée de bout en bout, reprise prouvée, advisors,
absence de résidu de test.

Décision de sortie attendue : `GO SA-2 / SA-2 non commencée`.

### SA-2 — Registre d'actions

Objectif : faire converger surface humaine, surface IA et surface autonome sur
une déclaration unique.

- [ ] Définir le type d'action canonique et son schéma de déclaration.
- [ ] Créer `agent_action_policies` et son administration super-admin.
- [ ] Implémenter l'adaptateur tRPC au-dessus du registre.
- [ ] Implémenter l'adaptateur outil assistant, **généré** depuis le registre.
- [ ] Implémenter l'adaptateur étape de worker.
- [ ] Migrer les 12 outils assistant existants vers des actions déclarées, à
      comportement strictement inchangé.
- [ ] Prouver l'équivalence avant/après sur le jeu d'évaluation existant.
- [ ] Découper `assistantBroker.ts` en réduisant sa responsabilité au routage,
      sans changement de comportement.
- [ ] Prouver qu'une action non autorisée par sa politique n'est pas exposée au
      modèle (SA-D14).
- [ ] Prouver que `dryRun` n'a aucun effet de bord observable.
- [ ] Tests de contrat, tests de permission, gate QA.

Preuves de sortie : un seul point de déclaration par capacité, parité
d'évaluation, broker réduit, exposition IA explicite.

Décision de sortie attendue : `GO SA-3 / SA-3 non commencée`.

### SA-3 — Événements et sources

Objectif : donner au runtime de quoi se déclencher, et préparer Outlook et l'ERP
sans les implémenter.

- [ ] Créer `business_events` en outbox transactionnelle.
- [ ] Publier les premiers événements réels, dont l'activation de snapshot.
- [ ] Créer `agent_sources` et le contrat de connecteur de source.
- [ ] Écrire le connecteur `catalogue_fournisseur` — la seule source disponible.
- [ ] Documenter le point d'ancrage exact d'un connecteur Outlook et d'un
      connecteur ERP, avec ce qu'ils devront fournir et ce qu'ils ne changeront
      pas.
- [ ] Prouver qu'aucun appel réseau n'est émis pendant une transaction métier.
- [ ] Prouver la livraison au moins une fois et l'absence de double traitement.
- [ ] Gate QA.

Preuves de sortie : événement métier produisant une exécution durable, contrat
de source écrit et vérifié sur une source réelle.

Décision de sortie attendue : `GO SA-4 / SA-4 non commencée`.

### SA-4 — Preuves et approbations

Objectif : rendre toute affirmation vérifiable et toute action sensible
gouvernée.

- [ ] Créer `evidence` et son contrat d'écriture.
- [ ] Créer `agent_approvals` et le cycle proposition → décision.
- [ ] Câbler les niveaux d'autonomie sur `requiresApproval`, plafond niveau 3.
- [ ] Prouver qu'une affirmation sans preuve est refusée (SA-D15).
- [ ] Prouver qu'une action de niveau supérieur au plafond est bloquée, même si
      le modèle la demande explicitement.
- [ ] Prouver la traçabilité complète : `request_id` → `run_id` → étape →
      action → preuve → décideur.
- [ ] Gate QA.

Décision de sortie attendue : `GO SA-5 / SA-5 non commencée`.

### SA-5 — Veille référentiels autonome

Objectif : la première preuve que CIR Cockpit travaille sans personne.

- [ ] Déclarer les actions de veille au registre.
- [ ] Implémenter la comparaison snapshot courant / précédent par fournisseur.
- [ ] Produire le digest par type d'objet et sévérité.
- [ ] Écrire les preuves pointant snapshot, import, fichier et ligne source.
- [ ] Créer les tâches internes d'arbitrage via la Brique 3.
- [ ] Prouver l'exécution **sans aucune requête humaine**.
- [ ] Prouver l'idempotence : même événement rejoué, zéro doublon.
- [ ] Prouver le respect de la portée d'agence et des permissions.
- [ ] Mesurer coût, durée et volumétrie sur les 7 659 diffs réels.
- [ ] Gate QA.

Décision de sortie attendue : `GO SA-6 / SA-6 non commencée`.

### SA-6 — Assistant branché sur le registre

Objectif : permettre les questions avancées sur les changements de référentiels,
en s'appuyant sur les mêmes actions et les mêmes preuves.

- [ ] Permettre la désignation de deux snapshots en langage naturel, par date ou
      par import, avec clarification explicite si l'intention est ambiguë.
- [ ] Répondre aux questions de comparaison par fournisseur et par famille.
- [ ] Refuser explicitement, sans approximation, les questions de prix par
      référence produit, en expliquant la limite de modèle.
- [ ] Afficher les preuves dans la réponse.
- [ ] Étendre le jeu d'évaluation aux cas faciles, ambigus et impossibles.
- [ ] Prouver l'absence de régression sur les évaluations existantes.
- [ ] Gate QA.

Décision de sortie attendue : `GO SA-7 / SA-7 non commencée`.

### SA-7 — Recette, observabilité et clôture

- [ ] Recette complète des scénarios de la section 8.
- [ ] Vérifier corrélation, coûts, taux d'échec et reprises.
- [ ] Vérifier la rétention effective des nouvelles tables.
- [ ] Mettre à jour `docs/architecture-cible-cir-cockpit.md` : décision ouverte
      n°19 tranchée, `À VALIDER` de 11.2 levé, journal de décisions complété.
- [ ] Mettre à jour `docs/stack.md`.
- [ ] Gate QA finale et décision « Socle Agentique TERMINÉ ».

## 8. Scénarios de recette obligatoires

1. Un snapshot est activé sans qu'aucun utilisateur ne soit connecté ; la veille
   s'exécute, les tâches et preuves existent.
2. Le worker est interrompu au milieu d'une exécution ; après expiration du
   bail, l'exécution reprend et l'effet de bord n'est produit qu'une fois.
3. Le même événement est publié deux fois ; aucun doublon de tâche ni de preuve.
4. Une action de niveau 4 est demandée par le modèle ; elle est refusée.
5. Une affirmation sans preuve est tentée ; elle est refusée.
6. Un utilisateur d'une autre agence ne voit ni les exécutions, ni les preuves,
   ni les tâches produites hors de sa portée.
7. La route worker est appelée sans secret ; elle refuse.
8. Une question de prix par référence produit est posée ; l'assistant explique
   la limite au lieu d'approximer.
9. Une exécution dépasse son budget ; elle est arrêtée, tracée et signalée.
10. Après épuisement des tentatives, l'exécution part en file de rebut et reste
    visible.

## 9. Matrice minimale de validation technique

| Domaine | Contrôle |
| --- | --- |
| Migration | parité local/distant, empreinte SQL, aucune migration appliquée modifiée |
| Sécurité | RLS forcée sur les nouvelles tables, grants minimaux, secret en Vault, `service_role` absent des parcours utilisateur |
| Concurrence | bail, tentative, exécution concurrente, file de rebut |
| Idempotence | rejeu d'événement, rejeu d'étape, double invocation de worker |
| Erreurs | codes catalogue, retries bornés, aucun retry sur permission ou validation |
| Coût | budget par exécution, réservation, coût réel enregistré |
| Observabilité | corrélation `request_id` → `run_id` → étape → action → preuve |
| Non-régression | évaluations assistant existantes, gates QA |

## 10. Risques et réponses

| Risque | Réponse |
| --- | --- |
| Le worker dépasse le bail et double une écriture | une étape par invocation, budget d'étape strictement inférieur au bail, idempotence obligatoire |
| Le socle devient une abstraction spéculative | SA-2 migre les 12 outils réels avant d'ajouter la moindre capacité neuve ; rien n'est généralisé sans usage constaté |
| La preuve verticale promet plus que la donnée | limite de la section 6.2 écrite dans le plan et testée en recette, scénario 8 |
| L'orchestrateur regrossit | SA-2 impose la réduction du broker comme preuve de sortie |
| Le socle retarde la valeur métier | SA-5 délivre une capacité utilisable dès la première preuve, sur le seul domaine qui a des données |
| L'ajout d'Outlook forcerait un redécoupage | SA-3 écrit et vérifie le contrat de source sur une source réelle avant que la question se pose |

## 11. Règles d'arrêt

- Aucune migration, aucun déploiement, aucun commit et aucun push sans
  autorisation distincte et explicite.
- Aucune tranche ne démarre avant la décision de sortie de la précédente.
- Le worktree hors périmètre est préservé en permanence.
- Aucune action sortante n'est implémentée, quel que soit l'avancement.
- Si une preuve manque, la case reste vide et la tranche reste ouverte.
