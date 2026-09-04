# 3. Intégrité, transactions et audit

## BE-P1-04 — La suppression d'un utilisateur mélange réattributions DB et suppression Auth sans atomicité

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/admin/adminUsers.ts:41-59` réattribue d'abord les interactions puis supprime l'utilisateur Supabase Auth. `backend/src/services/adminUsers/actions/deleteUser.ts:189-245` compte, crée/résout des comptes système et met à jour les interactions agence par agence sans transaction englobante. Le bulk enchaîne les suppressions utilisateur par utilisateur (`backend/src/services/admin/adminUsers.ts:217-247`).
- **Preuves schéma :** les migrations appliquées `backend/migrations/20260809033113_ta4_activities_v2_foundation.sql:11-13,54-58,135,159` et `backend/migrations/20260811075102_b3_1_tasks_foundation.sql:31-32,71-72,136,145-147,252,277` montrent d'autres références utilisateur dans Activities/Tasks avec des comportements de FK contraignants ; l'anonymisation actuelle ne couvre explicitement que les interactions.
- **Impact :** un échec au milieu laisse un utilisateur partiellement anonymisé, encore présent dans Auth, ou supprimé d'Auth avec des données non réattribuées. Le bulk peut annoncer une erreur après avoir supprimé une partie du lot. La politique de conservation métier n'est pas explicite pour Tasks, Activities et audit.
- **Correction minimale :** tant que la politique de rétention n'est pas décidée, conserver l'action `archive` et désactiver `delete`/`bulk_delete` dans l'API et l'UI. Si la suppression définitive est réellement requise, définir d'abord la matrice de conservation puis mettre en place une opération idempotente avec compensation entre DB et Auth.
- **Non-objectifs :** ne pas créer une saga générique ou un orchestrateur distribué si l'archivage couvre le besoin du POC.
- **Dépendances :** décision PO/juridique sur conservation/anonymisation ; inventaire complet des FK et traces d'audit ; choix du comportement bulk (tout le lot ou résultat par élément).
- **Preuve d'acceptation :** aucune suppression définitive accessible avant décision ; ou, si elle est maintenue, tests injectant une panne à chaque étape et démontrant reprise idempotente/état cohérent, couverture de toutes les références et résultat bulk non ambigu.

## BE-P1-05 — L'acteur d'audit n'est posé que sur quelques chemins métier

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves schéma :** `backend/migrations/20260418153000_phase3_private_schema_hardening.sql:108-115` résout l'acteur depuis `auth.uid()`, `app.actor_id` ou les claims JWT ; `backend/migrations/20260617120000_enrich_entity_audit_changes.sql:1-7,119-120` s'appuie sur ce mécanisme pour journaliser.
- **Preuves code :** `backend/src/services/tasks/taskService.ts:131-132`, `backend/src/services/entities/core/dataEntities.ts:53-60` et `backend/src/services/entities/contacts/dataEntityContacts.ts:43-50` posent `private.set_audit_actor` dans une transaction. Les écritures Interactions, Activities, Configuration, Utilisateurs et Agences ne passent pas toutes par ce wrapper.
- **Impact :** des mutations peuvent produire un acteur `NULL` ou une attribution incomplète, précisément sur les opérations administratives et de configuration où la traçabilité est la plus importante.
- **Correction minimale :** intégrer l'acteur d'audit dans la transaction de requête centrale proposée pour BE-P1-01. Les services ne devraient plus avoir à se souvenir de poser l'acteur eux-mêmes.
- **Non-objectifs :** ne pas dupliquer un appel `set_audit_actor` dans chaque fonction ni ajouter un deuxième système de logs métier.
- **Dépendances :** même conception de transaction/claims que BE-P1-01 ; inventaire des tables réellement couvertes par triggers.
- **Preuve d'acceptation :** tests d'intégration pour une mutation représentative de chaque domaine (tiers, activité, interaction, tâche, configuration, utilisateur, agence) ; chaque ligne d'audit contient l'utilisateur attendu, y compris via le pool ; échec de transaction sans fuite de contexte vers la requête suivante.

## BE-P1-06 — Une même analyse de référentiel peut partir deux fois et laisser un snapshot partiel

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/pricing/references/referenceImports.ts:2033-2056` vérifie l'import mais ne prend ni lock, ni claim atomique de statut, ni clé de tentative. `backend/src/services/pricing/references/referenceImports.ts:2057-2120` télécharge deux fichiers, les parse et persiste l'analyse dans la requête HTTP. `backend/src/services/pricing/references/referenceImports.ts:1872-1933` nettoie et crée le snapshot dans une transaction, puis `backend/src/services/pricing/references/referenceImports.ts:1935-2028` insère les gros lots et finalise hors de cette transaction.
- **Impact :** double clic, retry réseau ou deux workers peuvent analyser le même import en concurrence. Une panne après le nettoyage ou entre deux lots peut laisser un snapshot incomplet et un statut ambigu ; un retry repart sur un état qu'il vient de modifier.
- **Correction minimale :** effectuer un claim atomique de l'import (`status` attendu + identifiant de tentative) sous verrou/advisory lock par `import_id` ; rendre la tentative idempotente ; écrire dans un snapshot de tentative distinct et ne le rendre visible/actif qu'après finalisation. Découpler en job uniquement si la durée HTTP est réellement un problème après ces garanties.
- **Non-objectifs :** ne pas introduire DBOS ou une file distribuée avant d'avoir sécurisé l'idempotence en base.
- **Dépendances :** états autorisés du cycle d'import ; stratégie de nettoyage d'une tentative expirée ; mesure de durée et de volumétrie.
- **Preuve d'acceptation :** deux appels concurrents sur le même `import_id` produisent une seule tentative effective ; une panne injectée à chaque phase laisse l'ancien snapshot lisible et une tentative récupérable ; un retry ne duplique aucune ligne ; le statut final et les compteurs correspondent aux lignes persistées.

## BE-P2-02 — Une réservation IA `reserved` expirée peut bloquer indéfiniment un retry

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves schéma/code :** la fonction appliquée dans `backend/migrations/20260816064437_ai_watch_reservations.sql:70-101` retourne une réservation existante sans exclure `expires_at` passé. `backend/src/services/ai/watch/referenceWatchSummarize.ts:169-181` refuse toute réservation existante encore marquée `reserved`. Le nettoyage visible dans `backend/migrations/20260712120000_ai_assistant_hardening.sql:93-101` n'est pas un mécanisme de récupération à la demande.
- **Scénario prouvé par lecture :** le fournisseur peut répondre avec succès (`backend/src/services/ai/watch/referenceWatchSummarize.ts:275-323`), puis `persistAiOutcome` peut échouer lors de la transaction usage/finalisation (`backend/src/services/ai/aiRunContext.ts:510-588`). La réservation reste alors `reserved`, l'usage peut ne pas être compté et le même idempotency key reste bloqué.
- **Impact :** l'utilisateur reçoit durablement « analyse déjà en cours » après une panne ; une consommation fournisseur réussie peut ne pas être tracée/facturée dans les agrégats internes.
- **Correction minimale :** dans le claim SQL, reprendre atomiquement une réservation `reserved` expirée avec un nouveau lease/tentative ; finaliser avec comparaison de tentative ; fournir un nettoyage périodique simple comme filet, pas comme seule garantie.
- **Non-objectifs :** ne pas ajouter un moteur de workflow avant de fiabiliser le lease SQL existant. Ne jamais modifier la migration déjà appliquée ; créer une nouvelle migration corrective.
- **Dépendances :** durée de lease métier ; politique de rejeu lorsque le fournisseur a répondu mais la persistance a échoué.
- **Preuve d'acceptation :** test d'intégration avec réservation expirée récupérée une seule fois ; deux reprises concurrentes n'obtiennent pas toutes deux le lease ; panne après réponse fournisseur aboutit à un état final explicite et observable ; commentaire/documentation de la migration reflète le SQL courant.

## BE-P2-03 — Les workflows Supabase Auth + PostgreSQL ne compensent pas les échecs intermédiaires

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** la création enchaîne Auth, profil et memberships dans `backend/src/services/admin/adminUsers.ts:76-121` et `backend/src/services/adminUsers/core/createUser.ts:19-43`. Les mises à jour d'identité se situent dans `backend/src/services/adminUsers/core/updateUser.ts:129-159`, les memberships dans `backend/src/services/adminUsers/core/updateUser.ts:42-106`; reset et archive enchaînent aussi Auth puis DB dans `backend/src/services/admin/adminUsers.ts:176-202`.
- **Impact :** une panne après l'opération Auth peut laisser un compte sans profil/membership, un mot de passe réinitialisé sans flag cohérent ou un ban différent de l'archive DB.
- **Correction minimale :** donner à chaque commande une clé/idempotence et un état final vérifiable ; appliquer une compensation ciblée pour les rares étapes externes (par exemple supprimer le compte Auth créé si le profil initial échoue) ou échouer fermé avec une action de reprise administrative explicite.
- **Non-objectifs :** ne pas prétendre rendre Auth et PostgreSQL atomiques et ne pas ajouter une saga universelle.
- **Dépendances :** états de récupération admis ; capacité à rechercher un compte par identifiant/email sans ambiguïté.
- **Preuve d'acceptation :** tests avec panne injectée après chaque appel externe ; relance sûre sans doublon ; écran/admin capable d'identifier et corriger un état incomplet ; aucun succès API lorsque les deux autorités divergent.

## BE-P2-05 — L'unicité logique de la vue annuaire par défaut n'est pas atomique

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/directory/core/directorySavedViews.ts:55-72` désactive les défauts existants. Save appelle cette écriture puis crée/met à jour la vue hors transaction (`backend/src/services/directory/core/directorySavedViews.ts:108-178`) ; set-default répète la séquence (`backend/src/services/directory/core/directorySavedViews.ts:223-266`).
- **Impact :** une panne entre les deux requêtes peut laisser aucune vue par défaut ; deux appels concurrents peuvent laisser plusieurs défauts selon l'ordre d'exécution.
- **Correction minimale :** regrouper clear + set/insert dans une transaction et ajouter une contrainte/index unique partiel sur utilisateur + type lorsque `is_default=true`.
- **Non-objectifs :** ne pas créer un service de verrouillage applicatif.
- **Dépendances :** nouvelle migration additive ; choix explicite du comportement si la vue cible n'existe pas.
- **Preuve d'acceptation :** concurrence de deux set-default laisse exactement une vue par défaut ; panne avant commit ne modifie rien ; la contrainte empêche tout état double hors API.

## BE-P2-06 — Les mises à jour Tiers/Interactions ne protègent pas systématiquement contre l'écrasement concurrent

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** l'update d'un tiers repose sur l'ID seul dans `backend/src/services/entities/actions/dataEntitiesSavePersistence.ts:137-180`. L'upsert interaction fait de même dans `backend/src/services/entities/interactions/dataInteractions.ts:178-228`. Seul l'ajout de timeline compare `expected_updated_at` (`backend/src/services/entities/interactions/dataInteractions.ts:244-307`).
- **Impact :** deux onglets ou deux utilisateurs peuvent écraser silencieusement leurs modifications sur les formulaires complets, avec une protection incohérente selon l'action.
- **Correction minimale :** choisir une version entière ou `updated_at` attendu dans les contrats de mutation et l'inclure dans le prédicat d'update ; retourner `CONFLICT` avec action de récupération. Traiter en même temps la garde d'appartenance de BE-P1-01.
- **Non-objectifs :** ne pas implémenter de fusion automatique champ par champ ni de CRDT.
- **Dépendances :** adaptation du formulaire frontend ; définition des créations/upserts réellement idempotents.
- **Preuve d'acceptation :** deux écritures basées sur la même version : une seule réussit, l'autre reçoit le conflit canonique et aucune donnée n'est silencieusement perdue ; tests sur tiers et interaction.
