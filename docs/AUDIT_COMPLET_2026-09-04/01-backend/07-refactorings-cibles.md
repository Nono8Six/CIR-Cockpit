# 7. Refactorings ciblés

## Doctrine

Le backend vient de subir une migration structurante Deno → Node. Une nouvelle refonte générale ajouterait du risque sans fermer les défauts prioritaires. La règle retenue est : **extraire une frontière seulement lorsqu'elle rend une correction P0/P1/P2 plus sûre ou testable**. La longueur d'un fichier n'est pas un bug.

## BE-P3-02 — `config.raw` conserve une copie complète et inutilisée de l'environnement

- **Priorité :** P3
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/config.ts:47` expose `raw`; `backend/src/config.ts:54-67` copie toutes les entrées de `process.env`; `backend/src/config.ts:113` les conserve dans l'objet. La recherche dans `backend/`, `shared/` et `drizzle/` ne trouve aucun consommateur de `AppConfig.raw`.
- **Impact :** surface inutile retenant en mémoire des variables potentiellement sensibles, contrat de configuration plus large et illusion d'un usage futur.
- **Correction minimale :** supprimer `raw`, `readSource` et la copie ; ne conserver que les propriétés validées et nommées.
- **Non-objectifs :** ne pas remplacer la configuration par une bibliothèque ou un coffre de secrets.
- **Dépendances :** test de configuration ; recherche finale des consommateurs.
- **Preuve d'acceptation :** typecheck/tests verts ; aucune propriété `raw` dans `AppConfig` ; seule la liste Zod autorisée est conservée.

## BE-P3-03 — `assertQuotaAvailable` est une ancienne voie de quota non utilisée

- **Priorité :** P3
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/ai/aiRunContext.ts:243-280` exporte `assertQuotaAvailable`. La recherche du symbole ne trouve aucun appel en dehors de sa définition ; le flux actif utilise les réservations atomiques.
- **Impact :** deux modèles mentaux de quota coexistent ; un futur appel pourrait réintroduire un check-then-act non atomique et contourner la réservation canonique.
- **Correction minimale :** supprimer la fonction et les helpers/imports devenus exclusivement inutiles, en conservant le flux de réservation actuel.
- **Non-objectifs :** ne pas refondre la gouvernance IA au seul motif de ce code mort.
- **Dépendances :** confirmer par tests que `loadQuotaUsage` reste ou non utilisé ailleurs.
- **Preuve d'acceptation :** aucun symbole mort ; tests quota/réservation inchangés ; une seule voie documentée pour réserver et finaliser une consommation IA.

## BE-P3-04 — La numérotation des versions de prompt fait `max(version)+1` hors verrou

- **Priorité :** P3
- **Statut :** CONFIRMÉ
- **Preuves code :** création de draft dans `backend/src/services/ai/aiGovernance.ts:927-974` et restauration dans `backend/src/services/ai/aiGovernance.ts:1033-1067` calculent `max(version)+1`, puis insèrent séparément.
- **Impact :** deux administrateurs concurrents peuvent choisir le même numéro ; l'un échoue sur contrainte ou, sans contrainte suffisante, crée une ambiguïté. L'erreur retournée risque d'être générique.
- **Correction minimale :** sérialiser l'allocation par template dans une courte transaction (verrou de la ligne template ou mécanisme atomique équivalent), conserver la contrainte unique et mapper le conflit résiduel vers `CONFLICT`.
- **Non-objectifs :** ne pas créer un service de séquences global ni distribué.
- **Dépendances :** vérifier la contrainte unique distante ; réutiliser le même helper pour draft et restore.
- **Preuve d'acceptation :** test concurrent créant ou restaurant deux versions sur le même template ; numéros distincts et croissants, ou conflit stable sans état partiel ; templates différents non bloqués entre eux.

## BE-P3-05 — Le calcul de diff réutilise un cache sans revendiquer atomiquement le travail

- **Priorité :** P3
- **Statut :** À MESURER
- **Preuves code :** `backend/src/services/pricing/references/referenceDiffs.ts:1564-1609` lit d'abord un run en cache, puis lance le calcul si absent ; aucune revendication/lease n'est visible entre les deux.
- **Impact :** deux appels simultanés peuvent effectuer le même calcul et tenter de persister deux runs. Le rate limit borne l'abus, mais pas le doublon concurrent légitime. Le coût réel doit être mesuré avant d'alourdir le mécanisme.
- **Correction minimale :** si la mesure montre un calcul significatif, revendiquer la paire `(base_snapshot_id, target_snapshot_id)` atomiquement ou s'appuyer sur une unicité avec relecture du gagnant. Garder `force` explicite et auditable.
- **Non-objectifs :** ne pas ajouter une file de jobs ou un cache distribué pour un calcul peu coûteux.
- **Dépendances :** durée/volume du calcul et contrainte actuelle sur les runs.
- **Preuve d'acceptation :** test de deux requêtes simultanées ; un seul calcul/persist, l'autre reçoit le résultat réutilisé ; `force` conserve le comportement décidé.

## Découpes naturelles autorisées au contact des corrections

### `referenceImports.ts`

Le fichier fait environ 3 755 lignes et combine plusieurs raisons de changer. La correction de BE-P1-06/BE-P1-09 autorise trois modules profonds, sans couche d'adapters :

1. cycle de vie import + fichiers + mappings ;
2. analyse et persistance atomique d'une tentative ;
3. lectures, exports et présentation des résultats.

Le contrat tRPC public reste stable ; les helpers purement techniques restent privés à leur module.

### `aiGovernance.ts`

Le fichier fait environ 1 436 lignes. Lors de BE-P1-07/BE-P3-04, séparer seulement :

1. fournisseurs et modèles ;
2. templates et versions de prompts ;
3. quotas, usages et budgets.

Chaque bloc doit exposer des commandes métier, pas une collection de CRUD génériques.

### `taskService.ts`

Malgré environ 1 943 lignes, le service présente une cohérence métier forte : permissions, versionnement, événements et transactions sont liés. Ne pas le découper en couches artificielles. Pour BE-P2-07, extraire au plus une requête de lecture des contributeurs et garder les mutations transactionnelles ensemble.

### Éléments à ne pas refactorer maintenant

- `backend/src/trpc/router.ts` est volumineux mais majoritairement déclaratif ; le contrat des 91 procédures est synchronisé.
- `shared/api/trpc.generated.d.ts` et `shared/supabase.types.ts` sont générés : ne jamais les éditer à la main.
- Les migrations appliquées, même longues ou historiquement supersédées, ne sont pas du code mort.
- Les schémas Zod partagés fonctionnels ne doivent pas être regroupés dans un « schema.ts » géant.

## Critère de fin d'un refactoring

Un refactoring n'est accepté que s'il ferme le constat qui l'a déclenché, réduit une raison de changer clairement nommée, garde les contrats publics et passe le test ciblé plus le typecheck backend. Aucun objectif de nombre de lignes ou de nombre de fichiers n'est imposé.
