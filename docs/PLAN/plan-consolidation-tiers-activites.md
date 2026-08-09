# Plan d'exécution — Consolidation pré-import Tiers et Activités

| Métadonnée | Valeur |
| --- | --- |
| Statut | TA-5 terminée — GO Brique 3, non commencée |
| Date de reprise | 2026-08-08 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` |
| État vérifié | `main` / `d37070254ad2a2dcbb05b4a4525dc18a8e4adf0d`, Supabase distant `rbjtrcorlezvocayluok` |
| Périmètre | Socle 0, Brique 1 Tiers et rôles, Brique 2 Activités v2 additive |

## 1. Résultat attendu

Préparer une consolidation progressive du noyau `Tiers → Activités` avant tout
import de clients, sans réécriture globale et sans casser les écrans Clients,
Prospects, Fournisseurs, Cockpit et Configurateurs déjà présents.

La consolidation doit séparer :

- l'identité stable d'une organisation ou d'une personne ;
- ses rôles temporels, par exemple client, prospect, fournisseur ou fabricant ;
- sa relation commerciale avec CIR ou une agence ;
- ses contacts ;
- les activités réellement réalisées ;
- les tâches, opportunités, devis et commandes, hors de cette tranche.

## 2. Non-objectifs

- Aucun import de clients réels.
- Aucun écran Opportunité, Devis, Commande, Affaires ou Ma journée.
- Aucun remplacement global de `entities` ou `interactions` en une migration.
- Aucun accès SQL généraliste ou nouvel outil IA.
- Aucun changement du Configurateur métier, de la Tarification ou du catalogue.
- Aucun déploiement, migration ou écriture distante sans autorisation PO distincte.

## 3. État réel de départ

### 3.1 Données et modèle distant

État Supabase lu via MCP le 2026-08-08 :

| Surface | État constaté |
| --- | --- |
| `entities` | 6 lignes : 4 clients, 1 prospect, 1 fournisseur |
| `entity_contacts` | 41 contacts |
| `interactions` | 8 lignes |
| `cir_agencies` | 0 ligne |
| `entities.entity_type` | porte encore le rôle métier principal |
| `entities.agency_id` | porte à la fois la visibilité et le rattachement commercial |
| `entities.cir_commercial_id` | un seul responsable possible |
| `interactions.timeline` | historique JSONB encore actif |
| `interactions` | porte aussi statut, relance, montant, étape, devis et commande |

Le distant n'expose aucune vue dépendante de ces tables. Les dépendances SQL
directes à préserver sont notamment :

- `entity_contacts.entity_id → entities.id` avec suppression en cascade ;
- `interactions.entity_id → entities.id` et
  `interactions.contact_id → entity_contacts.id` avec `SET NULL` ;
- `configurator.saved_configuration.client_entity_id → entities.id` avec
  `SET NULL` ;
- les fonctions privées d'audit, de suppression d'agence, de préparation d'une
  configuration et de synchronisation de statut ;
- les politiques RLS de `entity_contacts` et `interactions`, qui dérivent la
  visibilité de `entities.agency_id` ;
- les index de recherche, d'agence, de responsable, de client, de fournisseur
  et de dernière activité.

### 3.2 Contrats et code

| Couche | Dépendances à préserver |
| --- | --- |
| Schémas partagés | `tier-v1.schema.ts`, `interaction.schema.ts`, schémas Client/Prospect/Data |
| tRPC | `data.entities`, `data.entity-contacts`, `data.interactions`, `data.searchEntitiesUnified`, routes `directory.*` |
| Contrat différé | `directory.tiers-list` est typé mais répond actuellement `501` |
| Backend | services `entities`, `directory`, `search`, `config` et intégrations associées |
| Frontend | annuaire Clients, Prospects, Fournisseurs, recherche globale, Cockpit, formulaires et détails |
| Configurateur | une configuration sauvegardée peut référencer `entities.id` |

Le schéma Tier V1 existant est une couche de compatibilité, pas le modèle cible :
ses variantes `client_term`, `client_cash`, `prospect_*` et `supplier` traduisent
encore un rôle en type exclusif de tiers.

## 4. Cartographie modèle actuel → modèle cible

| Actuel | Cible conceptuelle | Stratégie de consolidation |
| --- | --- | --- |
| `entities` | Organisation ou personne stable | Conserver l'identifiant pendant la transition ; extraire progressivement rôles et comptes |
| `entity_type` | Rôle d'organisation temporel | Ajouter une relation dédiée ; ne plus utiliser un type exclusif comme identité |
| Aucun champ canonique | Profil métier d'organisation | Ajouter un référentiel gouverné distinct des rôles CIR, de la forme juridique et du code NAF |
| `account_type`, `client_number`, codes fournisseur | Compte commercial et identifiants de rôle | Déplacer vers la portée décidée en TA-0 |
| `agency_id`, `cir_agency_id`, `cir_commercial_id` | Relations CIR/agence/responsable nommées | Modéliser cardinalité et temporalité après décisions TA-D1/TA-D2 |
| `entity_contacts` | Contact rattaché à une organisation | Préserver les identifiants et l'historique ; supprimer uniquement après preuve de remplacement |
| `profiles` utilisés comme internes | Personne interne et identité d'authentification | Ne pas fusionner silencieusement ; décider la frontière en TA-0 |
| `interactions` | Activité réalisée | Extraire uniquement les faits d'activité dans Brique 2 |
| `reminder_at` | Tâche ou relance future | Conserver en compatibilité jusqu'à la Brique 3 |
| `stage`, `amount`, `lost_reason` | Opportunité | Conserver en compatibilité jusqu'à la Brique 4 |
| `quote_sent_at`, `order_ref` | Devis ou commande | Conserver en compatibilité jusqu'à la Brique 5 |
| `timeline` JSONB | Événements/historique structurés | Lire l'ancien format pendant la transition ; retrait seulement après migration prouvée |

## 5. Décisions d'entrée TA-0

TA-D1 à TA-D7 sont verrouillées par le PO.

| ID | Décision PO requise | Impact bloqué |
| --- | --- | --- |
| TA-D1 | **VALIDÉ —** compte et numéro client globaux CIR | unicité globale ; le rattachement à une agence ne recrée pas le compte |
| TA-D2 | **VALIDÉ —** un client dépend d'une seule agence et possède un commercial principal ; des commerciaux secondaires peuvent aussi lui être assignés | agence unique, responsabilité principale explicite, collaboration multiple possible |
| TA-D3 | **VALIDÉ —** le système de gestion amont ERP/AS400 fait foi pour le numéro et le statut du compte client ; CIR Cockpit fait foi pour les contacts, notes et activités CRM | les conflits sont résolus champ par champ selon cette autorité |
| TA-D4 | **VALIDÉ —** le terme visible devient « Activité » ; « Interaction » reste un nom technique de compatibilité pendant la migration | appel, email, visite et passage comptoir sont des types ou canaux d'activité |
| TA-D5 | **VALIDÉ —** une activité interne peut exister sans organisation externe | agence et participant interne obligatoires ; aucun tiers artificiel n'est créé |
| TA-D6 | **VALIDÉ —** contrat IA vide pour Brique 1 et Brique 2 | aucune lecture ou écriture IA sur Tiers/Activités avant une tranche PO distincte |
| TA-D7 | **VALIDÉ —** une organisation possède un profil métier principal et peut avoir plusieurs profils secondaires | valeurs issues d'un référentiel gouverné ; aucun texte libre comme source de vérité |

### 5.1 Contrat de compatibilité verrouillé

- Les références existantes à `entities.id` et `entity_contacts.id` restent
  résolubles pendant toute la transition ; aucune suppression ou renumérotation.
- Chaque compte client global possède exactement une agence responsable, un
  commercial principal et zéro à plusieurs commerciaux secondaires.
- La reprise de compatibilité conserve toutefois un commercial principal
  manquant comme donnée manquante : aucun responsable n'est inféré. Toute
  création canonique ou alimentation ERP/AS400 exige ensuite ce principal.
- Les valeurs officielles du numéro et du statut client ne sont pas écrasées par
  une saisie CIR Cockpit ; les contacts, notes et activités CRM ne sont pas
  écrasés par un import dépourvu d'autorité sur ces champs.
- Les lectures et écritures actuelles restent la voie active jusqu'au GO de la
  tranche qui remplace chaque surface. Aucun double-write non transactionnel.
- Le rollback d'une tranche additive rebascule les lectures vers le modèle
  actuel et conserve les nouvelles données pour diagnostic ; il ne détruit rien.
- Chaque bascule prouve les comptages, l'absence d'orphelin, la conservation des
  identifiants et la parité fonctionnelle des consommateurs concernés.

## 6. Séquence phase-gated

### TA-0 — Décisions et contrat de compatibilité

**Entrée :** présent plan relu, état local et distant à nouveau vérifié.

**Travaux :**

- trancher TA-D1 à TA-D7 ;
- fixer les objets, cardinalités, temporalités et termes retenus ;
- définir la conservation des identifiants `entities.id` et `entity_contacts.id` ;
- nommer les lectures et écritures compatibles pendant la transition ;
- fixer les critères mesurables de rollback et de retrait de l'ancien modèle.

**Preuves de sortie :** décisions inscrites dans ce plan et dans le journal de
l'architecture ; aucune décision `À VALIDER` nécessaire à Brique 1 ne subsiste.

**Décision :** **GO TA-0 et checkpoint global**. TA-1 est la prochaine tranche
prête ; toute migration ou écriture Supabase reste soumise à une autorisation explicite distincte.

### TA-1 — Fondation additive Tiers et rôles

**Prérequis :** GO TA-0 et autorisation explicite de migration Supabase.

**Travaux :**

- écrire les schémas Zod stricts du modèle validé ;
- préparer une migration additive, transactionnelle et rejouable ;
- créer contraintes, index, RLS et audit depuis les accès réels ;
- conserver les tables et identifiants actuels comme voie de compatibilité ;
- convertir les 6 entités existantes avec provenance et rapport de concordance ;
- prévoir un rollback qui désactive la nouvelle lecture sans supprimer les données.

**Preuves de sortie :** parité migration MCP/local, comptages avant/après,
absence de doublon, RLS multi-agence, audit, advisors et QA backend ciblée.

**Décision :** **GO TA-2**. La fondation additive est active ; TA-2 reste non
commencée et requiert sa propre autorisation d'exécution.

### TA-2 — Contrats et services Tiers

**Prérequis :** GO TA-1.

**Travaux :**

- faire du contrat partagé validé la source de vérité ;
- migrer les services `data.entities`, contacts, recherche et annuaire ;
- implémenter `directory.tiers-list` sans registre manuel ni type exclusif ;
- maintenir une lecture compatible pour les consommateurs non migrés ;
- vérifier auth Bearer, erreurs CIR et validation entrée/sortie.

**Preuves de sortie :** tests de contrats, recherche et permissions ; absence de
`501` sur la route ; résultats identiques ou écarts explicitement approuvés sur
les six entités et les 41 contacts.

**Décision :** **GO TA-3**. Le contrat canonique partagé alimente les lectures
`data.entities`, contacts, recherche et annuaire, tandis que les champs
historiques restent servis pour les consommateurs non migrés. La tranche TA-3
reste non commencée et requiert sa propre autorisation d'exécution.

### TA-3 — Bascule des surfaces Tiers

**Prérequis :** GO TA-2.

**Travaux :**

- basculer par surface Clients, Prospects, Fournisseurs, recherche puis Cockpit ;
- conserver les parcours existants tant que leur remplacement n'est pas prouvé ;
- vérifier la référence Configurateur vers l'identité stable ;
- mesurer les requêtes principales et contrôler les invalidations de cache.

**Cartographie exécutée :**

| Surface | Lecture de compatibilité conservée | Lecture canonique utilisée | Preuve visible et automatisée |
| --- | --- | --- | --- |
| Clients | Ligne `directory.list` et fiche `directory.record`, avec `entity_type`, `client_number`, `account_type`, agence et commercial historiques | rôles temporels actifs, compte client global, agence responsable, commerciaux et profils métier | liste clients, SEA et AQUITAINE ÉLECTRIQUE ; tests services, table, page et fiche |
| Prospects | mêmes lignes et identifiants `entities.id` | rôle prospect actif, y compris organisation multi-rôle | filtre Prospect et PONTAC Thierry ; tests de rôle canonique contradictoire avec le type historique |
| Fournisseurs | champs fournisseur historiques et `entities.id` | rôle fournisseur actif et profil métier explicite | liste et fiche FESTO ; tests page, table et routage |
| Recherche globale | résultats V1 `data.searchEntitiesUnified` | projection `tiers` correspondante, rôles actifs et identités stables | recherche SEA puis navigation vers la fiche ; tests de correspondance sans omission silencieuse |
| Cockpit | résultat V1 sélectionnable et contacts historiques | rôles canoniques pour les récents, le filtrage et la confirmation inter-type | recherche, vide, chargement, erreur puis reprise ; test d'organisation multi-rôle |

**Preuves de sortie :** les cinq surfaces lisent la projection canonique sans
retirer les champs historiques. L'Edge Function `api` v205 sert simultanément
la fiche historique (paramètre absent) et la fiche canonique
(`includeCanonicalTier: true`). Les permissions runtime prouvent membre dans
son agence, agence étrangère refusée en `403` et super-admin sur agence
sélectionnée. Le navigateur in-app prouve Clients, Prospects, Fournisseurs,
recherche, Cockpit et Configurateur ; les états vide, chargement, erreur,
commercial principal absent et référentiel métier absent restent explicites.
Les clés de requête restent déterministes et les mutations invalident toujours
les racines annuaire, index Tiers et recherche unifiée ; les tests
`queryKeys` / `queryInvalidation` sont inclus dans les 903 tests frontend.
Le Configurateur conserve la FK
`configurator.saved_configuration.client_entity_id -> public.entities.id`, sans
référence active ni orpheline. `pnpm run qa` est vert : frontend `903/903`,
backend `603/603`, intégration distante `9/9`.

**Rollback de lecture :** omettre `includeCanonicalTier` sur
`directory.record` restitue la réponse historique stricte ; les services
frontend peuvent revenir à leurs champs de compatibilité déjà conservés dans
`directory.list`, `data.entities`, `data.entity-contacts` et
`data.searchEntitiesUnified`. Ce retour ne supprime aucune donnée, ne modifie
aucun identifiant et ne requiert ni migration ni restauration distante.

**Écart constaté :** l'état distant final compte trois comptes sans commercial
principal, contre quatre à la sortie TA-2. L'audit distant attribue à
l'utilisateur actif une mise à jour d'AQUITAINE ÉLECTRIQUE le 2026-08-08 ; TA-3
n'a pas réécrit cette donnée. L'absence reste prouvée sur SEA et affichée sans
inférence. Aucune organisation multi-rôle n'existe dans les six données
actuelles ; ce cas est donc prouvé par contrat et test, pas présenté comme une
preuve navigateur réelle.

**Décision :** **GO TA-4 / TA-4 non commencée**.

### TA-4 — Modèle additif Activités v2

**Prérequis :** GO TA-3 et décisions TA-D4/TA-D5 confirmées.

**Travaux :**

- définir Activité, participants, canal, compte rendu, sources et pièces jointes ;
- créer le modèle additif sans déplacer tâches, opportunités ou transactions ;
- préserver les 8 interactions et leurs identifiants de corrélation ;
- définir la conversion de `timeline` sans perte et sans historique uniquement JSONB ;
- recâbler les RLS sur les relations validées de Tiers.

**Preuves de sortie :** migration et rollback, conversion 8/8, RLS, concurrence,
audit, contrats et tests backend.

**Résultat exécuté :** les migrations MCP/local
`20260809033113_ta4_activities_v2_foundation` et
`20260809035041_ta4_activity_fk_indexes` créent le modèle relationnel additif,
ses contraintes différées, ses RLS forcées, ses ACL, son audit et les index de
chaque FK. Les 8 interactions sont corrélées 8/8, leurs 24 événements sont
convertis et classés sans divergence ni orphelin. Les champs Tâche,
Opportunité, Devis/Commande restent sur la voie historique.

La lecture stricte `data.activity-v2.by-legacy-interaction` est active sur
l'Edge Function `api` v207. Les probes transactionnelles prouvent participant
interne obligatoire, isolation inter-agence, super-admin global, correction
auditée et conflit de version ; aucune donnée de probe ne persiste. La gate
`pnpm run qa` est verte : frontend 905/905, backend 603/603 et intégration
distante 10/10.

**Décision :** **GO TA-5 / TA-5 non commencée**.

### TA-5 — Contrats, interface et retrait contrôlé

**Prérequis :** GO TA-4.

**Travaux :**

- migrer saisie, brouillons, recherche, détails et listes d'activités ;
- conserver `reminder_at`, opportunité, devis et commande sur la voie compatible
  jusqu'aux briques qui leur sont dédiées ;
- retirer l'ancien chemin uniquement après preuves de parité et rollback ;
- documenter les champs encore temporaires et leur tranche de retrait.

**Preuves de sortie :** QA front/back proportionnée, parcours réels, erreurs et
reprise, audit, métriques, compatibilité et absence d'artefact accidentel.

**Décision :** GO / NO-GO Brique 3 Tâches et relances.

**Contrat exécuté :** `activities` est la source canonique des parcours de
saisie, recherche, listes, détail et correction. `interactions` reste une
projection de compatibilité identifiée par `activities.legacy_interaction_id`.
Les triggers différés de la migration
`20260809042946_ta5_activity_compatibility_bridge` synchronisent les deux sens
dans la transaction appelante et refusent le commit si la projection diverge.
La migration `20260809043926_ta5_activity_correction_reason` conserve le motif
de chaque correction dans `activity_corrections`. Les brouillons restent dans
`interaction_drafts`, avec `form_type = 'activity-v2'` et verrou optimiste ; ils
ne créent aucune activité avant validation.

**Surfaces basculées :** Cockpit, recherche et pagination, listes Pilotage et
fiches Tiers, détail centré Activity v2, correction auditée, archivage,
invalidation temps réel et suppression administrative explicite. Le détail
expose contenu, participants, sources, historique, corrections et métadonnées
de pièces jointes. La lecture `read_model = 'legacy'` demeure un rollback
explicite ; aucun renommage technique global n'est effectué.

**Compatibilité maintenue :** `reminder_at` reste propriétaire de la projection
`interactions` jusqu'à la Brique 3 ; `stage`, `amount` et `lost_reason` jusqu'à
la Brique 4 ; `quote_sent_at` et `order_ref` jusqu'à la Brique 5. Dashboard,
relances, opportunités, métriques, anonymisation et intégrations continuent à
lire ces champs synchronisés. Aucun modèle futur ni workflow Storage n'est
introduit.

**Rollback :** sans perte de données, sélectionner `read_model = 'legacy'` pour
les lectures puis redéployer la version précédente de l'API. Le retrait du pont
consiste à désactiver ses cinq triggers dans une migration additive distincte,
uniquement après preuve que plus aucun consommateur n'écrit `interactions` ; la
preuve TA-5 a désactivé ces triggers dans une transaction puis effectué un
`ROLLBACK`, avec les cinq triggers actifs après contrôle.

**Preuves :** migrations locale/distante en parité normalisée, API v211 active,
10/10 tests d'intégration distante, tests ciblés contrat/composant 5/5 et E2E
réel Cockpit/brouillon/détail 3/3. Le contrôle distant final conserve 8
interactions, 8 activités, 8 sources, 24 événements, 8 participants internes,
5 externes, zéro pièce jointe, zéro correction persistée, orphelin, divergence et
artefact de probe. La gate `pnpm run qa` est verte : frontend 910/910, backend
605/605, intégration distante 10/10 et build de production réussi.

**Décision :** **GO Brique 3 Tâches et relances / Brique 3 non commencée**.

## 7. Règles d'exécution communes

- Une seule tranche ouverte à la fois ; aucune tranche suivante sans décision de sortie.
- Supabase distant est la vérité runtime ; toute écriture de schéma passe par MCP
  après autorisation explicite.
- Aucune migration historique appliquée n'est modifiée.
- Toute migration est additive jusqu'à preuve de bascule et de rollback.
- Les payloads API sont stricts et validés par les schémas partagés.
- Les erreurs utilisent le système CIR existant.
- Les données existantes sont inventoriées, conservées et rapprochées par identifiant.
- Aucun mock, hardcode, TODO, registre manuel ou double source de vérité durable.
- La décision IA peut être un contrat vide ; elle doit seulement être explicite.

## 8. Checkpoint du plan

- [x] Code, contrats, migrations et Supabase distant réconciliés.
- [x] Dépendances DB, API, frontend et Configurateur inventoriées.
- [x] Modèle actuel et cible cartographiés sans imposer de schéma prématuré.
- [x] Import idempotent, RLS, compatibilité, provenance et rollback au cœur du plan.
- [x] Séquence Tiers puis Activités respectée ; briques futures exclues.
- [x] TA-D1 — compte et numéro client globaux CIR.
- [x] TA-D2 — une agence, un commercial principal et plusieurs commerciaux secondaires possibles par client.
- [x] TA-D3 — ERP/AS400 autoritaire pour numéro et statut ; CIR Cockpit pour le CRM.
- [x] TA-D4 — terme visible « Activité ».
- [x] TA-D5 — activités internes autorisées avec agence et participant interne.
- [x] TA-D6 — contrat IA vide pour Brique 1 et Brique 2.
- [x] TA-D7 — un profil métier principal et plusieurs profils secondaires possibles, issus d'un référentiel gouverné.
- [x] Contrat de compatibilité, conservation des identifiants et rollback fixés.
- [x] Décision de sortie TA-0 : **GO TA-0 / TA-1 prête, migration non autorisée**.
- [x] Migration MCP/local `20260808080632_ta1_tiers_roles_foundation`, empreinte
  SQL normalisée `3c36d608731b63ecdac11220f9eeba80f9689dd0437d5cc12369cf5c624bf187`.
- [x] Conversion prouvée : 6 rôles, 4 comptes clients, zéro divergence et zéro
  orphelin ; les 4 responsables principaux absents restent explicitement absents.
- [x] RLS forcée, ACL explicites et audit sur les 6 tables ; preuve multi-agence
  4 comptes visibles depuis l'agence responsable, 0 depuis l'autre, écriture TCS 0 ligne.
- [x] Décision de sortie TA-1 : **GO TA-2 / TA-2 non commencée**.
- [x] Contrat de lecture Tiers strict partagé : identité stable, rôles temporels,
  compte client, agence responsable, commerciaux, profils métier, provenance,
  données manquantes et identifiants historiques explicites.
- [x] `directory.tiers-list` actif sur l'Edge Function `api` v202 ; filtres par
  périmètre, texte littéral, rôles gouvernés, profils métier et commercial
  principal, avec pagination bornée et sans registre manuel.
- [x] Compatibilité maintenue : les réponses historiques restent présentes dans
  `data.entities`, `data.entity-contacts`, `data.searchEntitiesUnified` et
  `directory.list`, complétées par leur lecture canonique.
- [x] Runtime distant : 6 organisations et 41 contacts conservés ; filtre client
  sans commercial principal prouvé ; agence étrangère refusée en 403,
  super-admin global autorisé, auth/CORS/validation d'entrée prouvées.
- [x] Intégration distante : 9 tests passés, 0 échec, 8 scénarios optionnels
  ignorés ; Edge Function `api` v202 active, migration TA-1 inchangée.
- [x] `pnpm run qa` vert : frontend 896/896, backend 602/602,
  intégration distante 9/9 et gate finale complète PASS.
- [x] Décision de sortie TA-2 : **GO TA-3 / TA-3 non commencée**.
- [x] Clients, Prospects, Fournisseurs, recherche globale et Cockpit basculés
  sur les rôles et comptes canoniques, sans retirer les champs historiques.
- [x] Permissions runtime prouvées : membre limité à son agence, agence
  étrangère refusée en 403, super-admin autorisé sur une agence sélectionnée.
- [x] États navigateur prouvés : données, navigation, vide, chargement, erreur,
  reprise, commercial principal absent et référentiel métier indisponible.
- [x] Configurateur inchangé : FK vers `entities.id`, zéro référence active et
  zéro orpheline ; aucun identifiant Tiers parallèle.
- [x] Rollback non destructif prouvé par la réponse `directory.record` legacy
  sans paramètre et la réponse canonique opt-in sur `api` v205.
- [x] `pnpm run qa` vert : frontend 903/903, backend 603/603, intégration
  distante 9/9 et gate finale complète PASS.
- [x] Décision de sortie TA-3 : **GO TA-4 / TA-4 non commencée**.
- [x] Modèle Activités v2 additif créé : activité, participants internes et
  externes, sources, métadonnées de pièces jointes, historique relationnel et
  corrections versionnées ; aucune suppression de `interactions`.
- [x] Migrations MCP/local `20260809033113_ta4_activities_v2_foundation` et
  `20260809035041_ta4_activity_fk_indexes` en parité SQL normalisée, empreintes
  `250bcb6de57b23cf911742257fcca5d109f7335e4265567d71f95d081b9cf476` et
  `de4f3f702a6a5ba3cc94f0cdf635532f26528ce086dd26c099dc972d3e4462e7`.
- [x] Conversion distante : 8/8 activités corrélées, 24/24 événements,
  8 sources, 8 participants internes et 5 externes ; zéro divergence,
  doublon, orphelin ou participant inventé.
- [x] RLS/ACL, participant réel, écriture même agence, refus inter-agence,
  super-admin sans appartenance, correction auditée et conflit de version
  prouvés par transactions annulées ; zéro ligne de probe persistée.
- [x] `data.activity-v2.by-legacy-interaction` actif sur `api` v207 ; CORS,
  auth, contrat strict, intégration distante et smoke navigateur prouvés.
- [x] `pnpm run qa` vert : frontend 905/905, backend 603/603, intégration
  distante 10/10 et gate finale complète PASS.
- [x] Décision de sortie TA-4 : **GO TA-5 / TA-5 non commencée**.
- [x] Pont atomique Activity v2 ↔ `interactions` appliqué par migrations
  MCP/local `20260809042946_ta5_activity_compatibility_bridge` et
  `20260809043926_ta5_activity_correction_reason`, empreintes normalisées
  `7c30b3f177f46c411c451c8b6efaa7d39c5cadff6e12cf10f9a8abb30f8d4f3d`
  et `ee345ffff2790fabd029489d947422f2c42c2b415a20f1cfbb6c0d607678fb40`.
- [x] Saisie, brouillons versionnés, recherche, listes, détail complet,
  correction auditée, archivage et invalidation temps réel basculés sur le
  contrat canonique ; lecture legacy explicitement réactivable.
- [x] Champs futurs maintenus sans nouveau modèle : relances en Brique 3,
  opportunité/montant/perte en Brique 4, devis/commande en Brique 5.
- [x] Runtime `api` v211 : auth/CORS, ACL agence, participant invalide, conflit
  optimiste, correction motivée, cycle brouillon et suppression explicite
  prouvés ; intégration distante 10/10.
- [x] Parité finale : 8/8 activités, 24 événements, 8 sources, 8 participants
  internes, 5 externes, zéro correction ou probe persisté, orphelin ou
  divergence ; rollback transactionnel des cinq triggers prouvé.
- [x] Tests ciblés Activity v2 5/5 et parcours navigateur réel TA-5 3/3.
- [x] Gate finale `pnpm run qa` verte : frontend 910/910, backend 605/605,
  intégration distante 10/10 et build de production réussi.
- [x] Décision de sortie TA-5 : **GO Brique 3 / Brique 3 non commencée**.

## 9. Changelog

| Date | Tranche | Décision et preuve |
| --- | --- | --- |
| 2026-08-08 | Reprise Socle 0 | Plan établi depuis `main` `d370702…`, contrat tRPC canonique et Supabase distant ; aucune écriture distante, migration ou implémentation |
| 2026-08-08 | Entrée TA-0 | Autorisation PO de produire le plan ; décisions TA-D1 à TA-D6 maintenues **À VALIDER** |
| 2026-08-08 | TA-D1 / TA-D2 | Compte et numéro client globaux CIR ; un client rattaché à une seule agence, avec un commercial principal et des commerciaux secondaires optionnels |
| 2026-08-08 | TA-D3 à TA-D6 | ERP/AS400 autoritaire pour numéro/statut, CIR Cockpit pour le CRM ; terme « Activité » ; activités internes autorisées et encadrées ; contrat IA vide |
| 2026-08-08 | Sortie TA-0 | Contrat de compatibilité verrouillé — **GO TA-0 / NO-GO TA-1** avant checkpoint global et autorisation explicite de migration |
| 2026-08-08 | Réouverture TA-D7 | Le PO demande de distinguer le profil métier réel de l'organisation — par exemple intégrateur ou constructeur de machines — de son rôle envers CIR ; cardinalité **À VALIDER** |
| 2026-08-08 | TA-D7 et checkpoint global | Un profil métier principal et plusieurs secondaires possibles, référentiel gouverné sans texte libre ; six principes globaux validés — **GO TA-0 / TA-1 prête, migration non autorisée** |
| 2026-08-08 | Autorisation TA-1 | Le PO donne carte blanche pour exécuter la tranche préparée ; les interdictions de commit, push, déploiement et de démarrage de TA-2 restent appliquées |
| 2026-08-08 | Sortie TA-1 | Migration MCP/local `20260808080632_ta1_tiers_roles_foundation` en parité (`3c36d608…`) ; 6 rôles et 4 comptes convertis, zéro divergence/orphelin, RLS multi-agence et écriture TCS bloquée, aucun nouveau WARN advisor ; `pnpm run qa` vert (frontend 892/892, backend 600/600, intégration 9/9) — **GO TA-2, non commencée** |
| 2026-08-08 | Sortie TA-2 | Contrat canonique partagé et validé en sortie, lectures Tiers réutilisées sur les quatre surfaces avec compatibilité historique ; `directory.tiers-list` actif sur `api` v202, 6 organisations et 41 contacts conservés, auth/permissions/recherche littérale prouvées ; `pnpm run qa` vert (frontend 896/896, backend 602/602, intégration 9/9) — **GO TA-3, non commencée** |
| 2026-08-08 | Sortie TA-3 | Clients, Prospects, Fournisseurs, recherche globale et Cockpit basculés sur les rôles canoniques ; champs historiques et identifiants conservés, rollback de lecture opt-in prouvé, Configurateur toujours relié à `entities.id`, permissions et parcours navigateur prouvés ; `api` v205, `pnpm run qa` vert (frontend 903/903, backend 603/603, intégration 9/9) — **GO TA-4, non commencée** |
| 2026-08-09 | Sortie TA-4 | Modèle Activités v2 additif et index FK appliqués par migrations MCP/local ; 8/8 interactions et 24/24 événements convertis sans perte, RLS/ACL, participants réels, audit, concurrence et rollback transactionnel prouvés ; lecture stricte sur `api` v207, `pnpm run qa` vert (frontend 905/905, backend 603/603, intégration 10/10) — **GO TA-5, non commencée** |
| 2026-08-09 | Sortie TA-5 | Pont transactionnel bidirectionnel, correction motivée, contrats tRPC/Zod, Cockpit, brouillons, recherche, listes et détail Activity v2 livrés sur `api` v211 ; parité 8/8, rollback, E2E ciblé 3/3 et `pnpm run qa` vert (frontend 910/910, backend 605/605, intégration 10/10) — **GO Brique 3, non commencée** |
