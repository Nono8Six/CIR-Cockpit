# Lots 2A et 2B — Frontière DB/RLS et preuve runtime

Date de vérification : 5 septembre 2026.

## 1. Verdict

**GO LOT 2B.** La connexion PostgreSQL réellement configurée applique désormais la séquence attendue dans une transaction : poser l'acteur tant que la connexion est privilégiée, prendre localement le rôle `authenticated`, poser les claims compris par `auth.uid()`, exécuter les accès métier sous RLS, puis rendre la connexion au pool sans fuite après commit ou rollback.

Le mode Supavisor Transaction sur le port `6543` est conservé pour le Lot 2B. La probe a réussi sur ce chemin exact et `postgres.js` est déjà configuré avec `prepare: false`. Passer au mode Session `5432` n'est donc pas nécessaire pour établir la frontière RLS.

Le code du Lot 2B et ses preuves locale et distante sont terminés. Le contrôle de migration confirme qu'aucun DDL supplémentaire n'est nécessaire : les rôles, grants, fonctions et policies requis sont déjà présents et la dernière migration locale `20260905041426_revoke_authenticated_profiles_update.sql` est enregistrée dans l'historique distant.

## 2. Périmètre et état préservé

Le Lot 2A a été exécuté en lecture seule côté PostgreSQL et Supabase. Le Lot 2B a ensuite créé deux comptes TCS et deux fiches Prospect strictement temporaires pour la preuve distante ; les fiches, comptes, audits et compteurs de rate limit associés ont été supprimés dans le `finally` du test.

Les six fichiers non commités du micro-lot 1.1 étaient présents avant la vérification et n'ont pas été modifiés :

- `backend/src/integration/auth_integration_test.ts` ;
- `backend/src/integration/helpers.ts` ;
- `shared/api/trpc.generated.d.ts` ;
- `docs/AUDIT_COMPLET_2026-09-04/01-backend/02-topologie-runtime-cutover.md` ;
- `docs/AUDIT_COMPLET_2026-09-04/PLAN_PRIORISE.md` ;
- `docs/AUDIT_COMPLET_2026-09-04/README.md`.

Le seul fichier créé par ce lot est le présent document.

## 3. État local vérifié

| Constat | Preuve actuelle | Résultat |
|---|---|---|
| Client utilisateur | `backend/src/middleware/auth/auth.ts` et `backend/src/trpc/procedureHelpers.ts` | L'alias `userDb: db` a disparu ; le client utilisateur n'existe que dans le callback de transaction RLS. |
| Pool | `backend/drizzle/index.ts` | Un pool global `postgres.js`, `max=10` dans la configuration observée, alimente Drizzle. |
| Prepared statements | `backend/drizzle/index.ts` | `prepare: false`. |
| Connexion configurée | métadonnées de `backend/.env`, sans afficher sa valeur | Hôte Supavisor, port `6543`, mode Transaction. |
| Runtime | `docs/stack.md` et paquets installés | Drizzle `0.45.2`, `postgres` `3.4.8`, Node 24 LTS. |
| Wrappers tRPC | `backend/src/trpc/router.ts` | Quatre chemins explicites : utilisateur RLS, privilégié avec acteur, authentifié sans DB et mixte en transactions courtes. |
| Acteur d'audit local | recherche ciblée hors tests | La pose de l'acteur est centralisée à la frontière ; les poses locales de Tâches, Entités et Contacts ont disparu. |
| Transactions internes | recherche ciblée dans les services | Tâches, Entités, Contacts, Activités v2, Configuration, Tarification et IA ouvrent déjà des transactions. |

## 4. État distant vérifié

Les constats suivants ont été relus avec le MCP `supabase_cockpit` le 5 septembre 2026.

### 4.1 Rôles et capacité de délégation

| Vérification | Résultat |
|---|---|
| `session_user` du MCP | `postgres` |
| `current_user` initial | `postgres` |
| `postgres.rolbypassrls` | `true` |
| capacité de `postgres` à prendre `authenticated` | `true` |
| RLS sur `public.agency_members` | activée et forcée |
| droit `SELECT` de `authenticated` sur `agency_members` | `true` |

### 4.2 Identité et audit

La définition distante actuelle de `auth.uid()` lit, dans cet ordre :

1. `request.jwt.claim.sub` ;
2. `request.jwt.claims ->> 'sub'`.

La forme minimale retenue est donc le paramètre local transactionnel :

```json
{"sub":"<uuid-utilisateur>","role":"authenticated"}
```

posé dans `request.jwt.claims`. Le champ `role` est également compris par `auth.role()`. L'inventaire des policies publiques distantes trouve 20 policies utilisant `auth.uid()`, aucune utilisant `auth.role()` et aucune utilisant directement `auth.jwt()` : `sub` est l'information d'autorisation nécessaire aux policies actuelles, tandis que `role` conserve la forme cohérente d'un JWT Supabase minimal.

`private.audit_actor_id()` retourne le premier UUID disponible parmi `auth.uid()`, `private.app_actor_id()` et `private.jwt_sub()`. `private.set_audit_actor(uuid)` est `SECURITY DEFINER`, appartient à `postgres` et pose `app.actor_id` localement à la transaction.

Les grants distants exacts de `private.set_audit_actor(uuid)` sont :

| Rôle | `EXECUTE` | Délégable |
|---|---:|---:|
| `postgres` | oui | oui |
| `service_role` | oui | non |
| `authenticated` | non | non |

Conséquence : `private.set_audit_actor` doit être appelée avant `SET LOCAL ROLE authenticated`. Son appel ne peut pas rester dans un service métier exécuté ensuite sous `authenticated`.

## 5. Probes exécutées sur la connexion configurée

Deux identités d'intégration déjà configurées ont été utilisées. Aucun email, token, mot de passe ou chaîne de connexion n'a été affiché. Les sorties ont été réduites aux rôles et aux booléens de preuve.

### 5.1 Transaction principale

Ordre réellement exécuté :

1. `BEGIN TRANSACTION READ ONLY` ;
2. résolution en lecture seule de l'identité d'intégration et d'une ligne d'agence strictement étrangère ;
3. `private.set_audit_actor(<utilisateur>)` sous `postgres` ;
4. vérification de `private.audit_actor_id()` sous le rôle privilégié ;
5. `SET LOCAL ROLE authenticated` ;
6. `set_config('request.jwt.claims', <claims-json>, true)` ;
7. lectures d'identité et lectures RLS ;
8. `ROLLBACK`.

| Invariant | Résultat |
|---|---:|
| transaction explicitement read-only | vrai |
| `session_user = postgres` | vrai |
| `current_user` initial = `postgres` | vrai |
| `BYPASSRLS` initial | vrai |
| rôle `authenticated` prenable | vrai |
| acteur d'audit = identité attendue avant changement de rôle | vrai |
| `current_user = authenticated` après `SET LOCAL ROLE` | vrai |
| `session_user` inchangé | vrai |
| `auth.uid()` = identité attendue | vrai |
| `app.actor_id` = identité attendue sous le rôle utilisateur | vrai |
| lecture RLS de l'appartenance propre visible | vrai |
| ligne d'une identité et d'une agence strictement étrangères invisible | vrai |

`private.audit_actor_id()` n'est pas directement exécutable par `authenticated`. La comparaison de la fonction a donc été faite avant le changement de rôle ; sous `authenticated`, la présence de la même valeur a été vérifiée via le paramètre transactionnel `app.actor_id`. Les fonctions de triggers `SECURITY DEFINER` peuvent continuer à résoudre l'acteur, mais la preuve de son écriture effective dans `audit_logs.actor_id` devra appartenir au test de mutation ciblé du Lot 2B.

### 5.2 Seconde transaction et absence de fuite

Une seconde identité d'intégration existante et distincte a été utilisée sur la même connexion réservée :

| Invariant | Résultat |
|---|---:|
| rôle revenu au rôle de session avant la seconde transaction | vrai |
| claims absents avant la seconde transaction | vrai |
| `app.actor_id` absent avant la seconde transaction | vrai |
| seconde identité distincte | vrai |
| acteur d'audit remplacé par la seconde identité | vrai |
| `current_user = authenticated` dans la seconde transaction | vrai |
| `auth.uid()` = seconde identité | vrai |
| rôle privilégié restauré après le second `ROLLBACK` | vrai |
| claims absents après le second `ROLLBACK` | vrai |
| `app.actor_id` absent après le second `ROLLBACK` | vrai |

Ces résultats prouvent la propriété recherchée avec le pooler : l'état est porté par la transaction, pas par la connexion logique suivante.

## 6. Documentation officielle actuelle

- [Supabase — Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) : le port `6543` du shared pooler est le mode Transaction ; ce mode ne supporte pas les prepared statements et exige leur désactivation côté client.
- [PostgreSQL — `SET`](https://www.postgresql.org/docs/current/sql-set.html) : `SET LOCAL` ne vit que jusqu'à la fin de la transaction ; `COMMIT`, `ROLLBACK` ou un retour à un savepoint antérieur annulent les changements locaux concernés.
- [PostgreSQL — `SET TRANSACTION`](https://www.postgresql.org/docs/current/sql-set-transaction.html) : `READ ONLY` interdit le DML et le DDL ordinaires utilisés par l'application.
- [Postgres.js — README officiel](https://github.com/porsager/postgres#transactions) : `sql.begin` réserve une connexion jusqu'au commit/rollback, `sql.savepoint` porte les transactions imbriquées, et `prepare: false` désactive les prepared statements automatiques.
- [Drizzle ORM — Transactions](https://orm.drizzle.team/docs/transactions) : une transaction imbriquée devient un savepoint.

Le code installé confirme le comportement documentaire pour les versions du dépôt : `PostgresJsSession.transaction()` appelle `client.begin()` et `PostgresJsTransaction.transaction()` appelle `client.savepoint()`.

Décision CIR Cockpit : `6543` est compatible avec la frontière demandée. Le backend Node est persistant, domaine pour lequel Supabase recommande plutôt une connexion directe ou le mode Session, mais ce conseil d'exploitation ne crée pas ici une nécessité fonctionnelle. Le Lot 2B ne changera donc pas la connexion. Une bascule vers `5432` ne devra être évaluée que sur un besoin prouvé de fonctionnalité de session ou de performance, pas comme prérequis RLS.

## 7. Matrice des accès actuels et cibles

Les procédures partageant le même wrapper et la même règle sont regroupées ; les 91 procédures ne sont pas relues une par une.

Le contrat réel distingue quatre chemins, sans alias ni client transactionnel conservé :

1. **transaction utilisateur RLS** pour les lectures et mutations métier ordinaires ;
2. **transaction privilégiée avec acteur humain** pour les procédures super-admin et les exceptions étroites justifiées ;
3. **authentification sans transaction DB** pour les handlers sans accès à la DB métier, notamment `directory.company-search` et `directory.company-details` ;
4. **traitement mixte en phases courtes** lorsque DB et réseau alternent, notamment `data.changePassword`, `admin.users`, `ai.settings.testProvider` et `pricing.references.watch.summarize`.

| Procédure ou groupe | Client actuel | Client cible Lot 2B | Justification métier | Transaction interne | Adaptation |
|---|---|---|---|---:|---|
| handlers utilisateur DB ordinaires : Data, Activités v2, Configuration, lectures/écritures Tarification autorisées, Cockpit, Annuaire et vues sauvegardées | ancien `userDb`, alias privilégié | transaction utilisateur RLS | parcours d'un utilisateur authentifié ; aucun besoin générique de contourner RLS | oui pour Entités, Contacts, Activités v2 et Configuration | `withAuthedHandler` ouvre la transaction utilisateur et passe uniquement son `tx` au handler |
| Tâches et `task-types.list` | `withAuthedDualDbHandler`, sélecteur toujours `db` | transaction utilisateur RLS | lecture et mutation métier bornées par agence/utilisateur | oui, dix mutations Tâches | remplacer le sélecteur privilégié par le wrapper utilisateur ; les transactions deviennent des savepoints |
| `data.searchEntitiesUnified` | sélecteur toujours `db` | transaction utilisateur RLS | recherche métier ordinaire | non | utiliser le wrapper utilisateur |
| `admin.audit-logs` | sélecteur toujours `db` | transaction utilisateur RLS | la policy et les règles métier doivent borner ce que l'appelant peut voir | non | utiliser le wrapper utilisateur ; ne pas faire du nom `admin` une justification de privilège |
| `data.entities` hors `delete`/`reassign` | ancienne sélection `userDb` | transaction utilisateur RLS | opérations ordinaires sur le périmètre autorisé | oui pour les mutations | branche utilisateur explicite ; pose locale redondante de l'acteur retirée |
| `data.entities.delete` et `data.entities.reassign` | sélection `db`, gardes `isSuperAdmin` dans le service | transaction privilégiée explicite avec acteur humain, sans claims forgés | opérations transverses actuellement réservées au super-admin | oui | conserver l'exception, exiger la garde super-admin avant l'opération et ne pas ouvrir inutilement une transaction utilisateur |
| `pricing.references.watch.summarize` | `userDb` + `serviceDb` | transaction utilisateur pour les lectures métier + client privilégié explicite pour réservations/usage IA | les tables de gouvernance IA sont service-only ; les faits métier restent soumis à RLS | oui côté service IA | conserver deux responsabilités sans second pool ; ne pas garder une transaction utilisateur ouverte autour de l'appel réseau au modèle |
| `data.profile` | ancien chemin utilisateur privilégié par alias | transaction privilégiée courte avec acteur humain | `UPDATE public.profiles` est révoqué à `authenticated` | non | valider l'agence, puis ne modifier que `authContext.userId` |
| `data.changePassword` | ancien handler recevant `userDb` | Auth sans DB, puis transaction privilégiée courte | l'appel Supabase Auth doit terminer avant l'ouverture de la transaction DB | non | lever le flag seulement après succès Auth, sans connexion conservée |
| `directory.company-search/details` | ancien handler recevant un DB inutilisé | authentifié sans transaction DB | API externe, aucun accès DB métier dans le handler | non | `withAuthedNoDbHandler` ne fournit aucun client DB |
| `admin.users` et `ai.settings.testProvider` | ancien chemin privilégié englobant DB et réseau | phases privilégiées courtes séparées des appels Auth/API | ne pas garder une connexion pendant un appel réseau | selon l'action | `withSuperAdminPhasedHandler` ne fournit que des callbacks transactionnels |
| procédures super-admin DB ordinaires | `db` privilégié | transaction privilégiée explicite avec acteur humain | garde super-admin avant le handler ; opérations transverses ou service-only | oui dans Tâches, Imports et IA | acteur centralisé, sans `SET ROLE authenticated` |
| traitements système sans utilisateur | `db` selon le service | client privilégié explicite, sans faux UUID utilisateur | absence réelle d'acteur humain | selon le service | garder un chemin nommé système ; ne pas réutiliser le wrapper utilisateur |

## 8. Contrat minimal du Lot 2B

### 8.1 Frontière utilisateur

La transaction commence dans `withAuthedHandler`, après validation du token et construction de `AuthContext`, et se termine seulement après la résolution ou l'échec du handler métier. Elle n'est pas ouverte dans `authenticateAccessToken` : ce niveau ne connaît pas encore le type d'accès de la procédure. Les handlers sans DB et les traitements mixtes utilisent des wrappers distincts.

Séquence normative :

```text
db.transaction(async tx => {
  1. private.set_audit_actor(authContext.userId) sous postgres
  2. SET LOCAL ROLE authenticated
  3. set_config('request.jwt.claims', {sub, role}, true)
  4. handler(tx, authContext, requestId, input)
})
```

Le commit ou le rollback est géré par Drizzle/Postgres.js. Aucun `SET` de portée session n'est permis. Le helper ne journalise ni token, ni claims complets, ni chaîne de connexion.

### 8.2 Contexte tRPC minimal

Le contexte authentifié ne doit plus porter deux alias du même objet. Sa forme minimale devient :

```text
requestId + callerId + authContext
```

Le client utilisateur transactionnel est créé à la frontière du handler et n'est jamais stocké au-delà du callback. `userDb` disparaît de `AuthenticatedRequestContext`, `AppEnv` et de la propagation dans `procedures.ts`.

### 8.3 Transactions internes

Quand un handler reçoit le `tx` utilisateur et appelle `tx.transaction(...)`, Drizzle crée un savepoint sur la même connexion. L'identité, le rôle et les claims sont posés avant ces savepoints ; un rollback vers un savepoint créé ensuite ne les efface donc pas.

Les transactions internes qui protègent plusieurs écritures métier sont conservées. Elles ne doivent pas être aplaties. En revanche, les wrappers locaux dont le seul but est de poser `private.set_audit_actor` sont supprimés des parcours utilisateur : après `SET LOCAL ROLE authenticated`, cet appel échouerait conformément aux grants distants.

Le chemin `pricing.references.watch.summarize` découpe le cycle en transactions courtes : configuration/accès privilégiés, faits métier sous RLS, réservation privilégiée, appel modèle sans transaction, puis finalisation privilégiée. `data.changePassword`, `admin.users` et `ai.settings.testProvider` appliquent la même règle autour de leurs appels réseau.

### 8.4 Chemins privilégiés

- `withSuperAdminHandler` ouvre une transaction privilégiée, pose l'acteur humain avec `private.set_audit_actor(callerId)`, n'applique pas `SET ROLE authenticated`, puis exécute le handler.
- `data.entities.delete/reassign` suit le même principe seulement après la garde super-admin existante.
- un traitement réellement système utilise le client privilégié explicitement nommé et ne fabrique pas d'identité utilisateur.
- le client privilégié racine n'est jamais remis à un handler utilisateur ordinaire.

### 8.5 Prévention des fuites

La prévention repose sur quatre contraintes simples :

1. uniquement `SET LOCAL` ou `set_config(..., true)` dans une transaction ;
2. aucun client transactionnel conservé dans un cache ou retourné hors callback ;
3. commit/rollback automatique avant remise de la connexion au pool ;
4. test séquentiel à deux identités sur une même capacité de pool, vérifiant rôle, claims et acteur avant la seconde requête.

### 8.6 Fichiers modifiés

Fichiers de production réellement concernés :

- `backend/src/middleware/auth/auth.ts` : retirer l'alias `userDb` ;
- `backend/src/types.ts` : réduire le contexte DB ;
- `backend/src/trpc/procedures.ts` : ne plus propager `userDb` ;
- `backend/src/trpc/procedureHelpers.ts` : implémenter les frontières utilisateur et privilégiée ;
- `backend/src/trpc/dataEntitiesDbSelection.ts` : exprimer un type d'accès `user` ou `service`, pas choisir un objet DB déjà construit ;
- `backend/src/trpc/router.ts` : convertir les sélecteurs toujours privilégiés vers la frontière utilisateur et garder les exceptions explicites ;
- `backend/src/services/tasks/taskService.ts` : retirer les poses utilisateur locales de l'acteur, sans perdre le cas super-admin désormais centralisé ;
- `backend/src/services/entities/core/dataEntities.ts` et `backend/src/services/entities/contacts/dataEntityContacts.ts` : retirer les wrappers locaux d'acteur devenus redondants ;
- `backend/src/services/ai/watch/referenceWatchSummarize.ts` : borner séparément lecture utilisateur et écritures service si le wrapper actuel maintient la transaction pendant l'appel réseau.
- `backend/src/services/data/dataProfile.ts` : conserver `data.profile` en transaction privilégiée courte et ouvrir celle de `data.changePassword` seulement après Supabase Auth ;
- `backend/src/services/directory/company/directoryCompany.ts` : retirer le paramètre DB inutilisé ;
- `backend/src/services/admin/adminUsers.ts`, `backend/src/services/adminUsers/core/createUser.ts` et `backend/src/services/ai/aiGovernance.ts` : séparer les phases DB privilégiées des appels Auth/API.

Tests existants à adapter ou compléter :

- `backend/src/trpc/procedures_test.ts` ;
- `backend/src/trpc/router_test.ts` ;
- `backend/src/middleware/auth/auth_test.ts` ;
- après intégration propre du micro-lot 1.1, `backend/src/integration/auth_integration_test.ts` et les tests d'intégration Tâches déjà capables d'utiliser deux identités.

Aucun changement frontend n'est requis par la frontière elle-même. Le contrat tRPC généré a été régénéré ; son générateur a seulement réordonné certains membres d'union, sans changement de surface publique. Aucune nouvelle migration n'est nécessaire : le rôle, les grants, les fonctions d'identité, les policies et le mode de connexion nécessaires existent déjà.

## 9. Validations du Lot 2B

Un test ciblé par invariant distinct :

1. test unitaire du wrapper utilisateur : ordre acteur → rôle → claims → handler, et rollback sur erreur ;
2. test unitaire du routage : accès ordinaires vers `user`, `delete/reassign` uniquement vers `service` après garde super-admin ;
3. test d'intégration à deux identités : lecture propre visible et UUID étranger invisible sous RLS ;
4. test d'intégration d'une mutation auditée : `audit_logs.actor_id` correspond à l'appelant ;
5. test séquentiel de réutilisation : aucune fuite de rôle, claims ou acteur ;
6. test ciblé d'un service à transaction interne, par exemple Tâches, prouvant le savepoint et la conservation de l'identité ;
7. typecheck backend.

Résultats du 5 septembre 2026 :

- 12 fichiers de tests ciblés, 82 tests réussis ;
- typecheck backend réussi ;
- génération et contrôle du contrat tRPC réussis ;
- gate documentaire et `git diff --check` réussis ;
- preuve distante `rlsBoundary_integration_test.ts` réussie contre le backend modifié sur un port isolé ;
- scénario A → B → A : fiche propre visible, UUID étranger `NOT_FOUND`, puis retour à A sans fuite ;
- mutation Entité avec transaction imbriquée/savepoint : `audit_logs.actor_id` égal à l'identité appelante ;
- nettoyage distant contrôlé : aucune fiche ni identité temporaire conservée.

Pas de matrice E2E, build, coverage ou suite générale pour ce micro-lot. Les gates documentaires et dépôt restent celles demandées lors de la livraison du document.

## 10. Réserves réelles

1. `authenticated` ne peut pas exécuter directement `private.audit_actor_id()` ni `private.set_audit_actor(uuid)`. L'ordre acteur → rôle → claims reste donc un invariant impératif de la frontière centrale.
2. Supabase recommande Session/direct pour un backend persistant, mais aucune incompatibilité fonctionnelle n'a été observée sur `6543`. Il n'existe donc pas de preuve justifiant une bascule de connexion dans ce lot.
3. Le compte utilisateur historique d'intégration porte `must_change_password=true`. La preuve Lot 2B crée donc ses deux identités éphémères et ne modifie pas ce fixture existant.

## 11. Point d'arrêt

Le code, les tests ciblés, le contrat et les deux scénarios distants du Lot 2B sont validés. Les écritures de preuve ont été nettoyées. L'historique distant et les définitions SQL actuelles ne justifient aucune nouvelle migration ou DDL.

Verdict actuel : **GO LOT 2B**.
