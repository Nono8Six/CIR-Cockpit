# 1. Sécurité, isolation et identités

## BE-P0-01 — Les services Windows transforment une modification locale en exécution `SYSTEM`

- **Priorité technique :** P0 hôte local
- **Statut :** CONFIRMÉ — RISQUE ACCEPTÉ PAR LE PO, HORS ROADMAP PRODUIT
- **Preuves code/configuration :** `scripts/servy/CIR-Cockpit-API.json:5-11` lance directement `node --env-file=.env --import tsx src/index.ts` depuis `backend/`. `scripts/servy/CIR_Cockpit.json:5-11` lance Vite depuis `frontend/node_modules` et `frontend/`. Les deux services exécutent donc des fichiers du checkout.
- **Preuves runtime :** les services `CIR-Cockpit-API` et `CIR-Cockpit` étaient `Running`, en démarrage automatique, sous `LocalSystem`. Les ACL observées accordaient `Modify` à des principaux non administrateurs, dont `Authenticated Users` et `CodexSandboxUsers`, sur `backend/`, `frontend/`, leurs fichiers `.env` et les deux JSON Servy. Les sondes `http://127.0.0.1:8787/health` et `http://127.0.0.1:3000/` répondaient `200`.
- **Impact :** un utilisateur ou processus autorisé à modifier un fichier chargé au démarrage par l'un des deux services peut obtenir une exécution au niveau `SYSTEM`. La lecture/modification de `backend/.env` expose en outre les secrets backend. Sécuriser seulement l'API laisserait la même voie d'élévation via le frontend.
- **Contexte confirmé par le PO :** Servy sert uniquement à lancer automatiquement les serveurs Node/Vite en mode développement sur son poste. Ce n'est ni la stack finale ni un mécanisme de déploiement destiné à être conservé.
- **Décision du 4 septembre 2026 :** aucune remédiation Windows, aucun artefact immuable, aucun compte de service et aucun changement d'ACL ne sont planifiés dans les lots produit. Le risque local est accepté en connaissance de cause.
- **Conséquence de planification :** BE-P0-01 ne bloque plus DBOS, une nouvelle brique ou la définition de la stack finale. Il reste documenté pour ne pas présenter l'environnement local comme durci ou représentatif de la production.
- **Condition de réouverture :** réexaminer ce risque seulement si Servy devient un composant de la stack cible, si le poste est partagé/non fiable, si le service devient accessible au-delà du contexte de développement prévu ou si le PO retire explicitement cette acceptation.

## BE-P1-01 — `userDb` ne porte pas l'identité utilisateur et contourne la barrière RLS

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/middleware/auth/auth.ts:40-52` construit un seul `db` et retourne littéralement `userDb: db`. `backend/drizzle/index.ts:16-44` maintient un pool global depuis `DATABASE_URL`, sans transaction portant un JWT, `SET ROLE` ou des claims de requête. L'alias est propagé par `backend/src/trpc/procedures.ts:164-176` puis utilisé comme base « utilisateur » par `backend/src/trpc/procedureHelpers.ts:41-93`.
- **Preuves d'exploitation :** la connexion active correspond à un rôle PostgreSQL privilégié de la famille `postgres`, avec `rolbypassrls=true`. Supabase documente que ses rôles administratifs/serveur peuvent contourner RLS : [Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles).
- **Preuves de mutation concrète :** le contrat accepte un identifiant fourni par le client (`shared/schemas/system/data.schema.ts:76-101`). Pour `save`, `backend/src/services/entities/core/dataEntities.ts:92-104` vérifie l'accès à la **nouvelle** agence, puis `backend/src/services/entities/actions/dataEntitiesSavePersistence.ts:137-180` met à jour la ligne par son seul `id`. `backend/src/services/entities/actions/dataEntitiesSaveRows.ts:48-73` peut réécrire agence et type. De même, `backend/src/services/entities/interactions/dataInteractions.ts:178-228` fait un upsert sur l'ID fourni et remplace agence, tiers, contact et créateur sans charger l'appartenance existante.
- **Impact :** la sécurité repose uniquement sur la discipline de chaque service. Un UUID étranger connu ou divulgué peut permettre une lecture ou une mutation inter-agences si une garde applicative manque ; les policies RLS présentes ne compensent pas ce défaut puisque la connexion les contourne.
- **Correction minimale :** à très court terme, ajouter avant chaque mutation un chargement de la ligne existante et une garde propriétaire/agence, puis inclure agence/ID dans le prédicat d'écriture. Structurellement, ouvrir une transaction par requête utilisateur, y poser le rôle/les claims RLS documentés et n'exposer ce client qu'aux procédures métier. Renommer et réserver le client privilégié aux opérations système/super-admin explicitement justifiées.
- **Non-objectifs :** ne pas créer un ORM parallèle, un deuxième backend ni réécrire les 91 procédures. La cible est une seule fabrique de contexte DB et un chemin privilégié rare et visible.
- **Dépendances :** vérifier le rôle SQL non privilégié disponible, le format de claims attendu par les policies actuelles et la compatibilité avec le pool ; traiter BE-P1-05 dans la même transaction.
- **Preuve d'acceptation :** tests d'intégration à deux agences démontrant qu'un utilisateur A ne peut ni lire ni mettre à jour/supprimer un UUID de B sur tiers, contacts, activités, interactions et tâches ; inspection SQL prouvant le rôle/les claims à l'intérieur de la transaction ; inventaire des procédures utilisant le client privilégié avec justification ; absence de simple alias `userDb: db`.

## BE-P1-02 — L'obligation de changer un mot de passe est déclarative et contournable

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/admin/adminUsers.ts:97-106` et `backend/src/services/admin/adminUsers.ts:176-187` posent `must_change_password=true`. Pourtant `backend/src/middleware/auth/buildAuthContext.ts:30-75` ne sélectionne pas ce champ et n'interdit aucune route métier. `backend/src/services/data/dataProfile.ts:49-60` remet le flag à `false` sur une simple déclaration client `password_changed`, sans preuve serveur d'un changement Auth récent.
- **Preuve plateforme :** l'advisor Supabase signalait la protection contre les mots de passe compromis désactivée. La fonctionnalité et sa portée sont documentées par Supabase : [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Impact :** un mot de passe temporaire peut rester utilisable sur toutes les fonctions métier ; un client modifié peut lever le flag sans changer le secret. La mention « changement obligatoire » affichée à l'utilisateur n'est donc pas un invariant de sécurité.
- **Correction minimale :** inclure le flag dans le contexte d'authentification et bloquer toutes les procédures hors changement de mot de passe tant qu'il est actif ; exposer une seule procédure dédiée qui change le secret via Supabase Auth côté serveur, puis lève le flag seulement après ce succès. L'activation de la détection des mots de passe compromis est une action Supabase distante séparée, soumise à une autorisation propre.
- **Non-objectifs :** ne pas construire une politique IAM d'entreprise ni un système maison de hachage. Supabase Auth reste l'autorité du secret.
- **Dépendances :** test local d'un compte créé/réinitialisé ; autorisation séparée avant toute modification de configuration Supabase.
- **Preuve d'acceptation locale :** un compte temporaire reçoit `403` sur une procédure métier, peut uniquement appeler la procédure dédiée, puis accède au métier après succès Auth ; l'ancienne déclaration client `password_changed` n'existe plus. L'advisor de mots de passe compromis reste un suivi distant distinct et ne bloque pas le Lot 1 local.

## BE-P1-07 — Le test d'un fournisseur IA accepte une origine arbitraire avant le garde-fou runtime

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code :** `shared/schemas/ai.schema.ts:234-251` accepte `base_url` comme texte ; `backend/src/services/ai/aiGovernance.ts:432-475` le persiste. Le test de connexion déchiffre la clé (`backend/src/services/ai/aiGovernance.ts:769-813`) puis envoie un header `Bearer` à `${baseUrl}/models` (`backend/src/services/ai/aiGovernance.ts:1380-1393`). À l'inverse, le runtime normal dispose déjà d'une validation d'endpoint canonique dans `backend/src/services/ai/runtime/providerRegistry.ts:47-66`.
- **Impact :** un super-admin trompé ou un compte super-admin compromis peut faire transmettre un secret fournisseur à une origine contrôlée, à une adresse loopback/privée ou via redirection. Le fait que la fonctionnalité soit administrative réduit l'exposition, pas la conséquence.
- **Correction minimale :** appliquer la même validation canonique au stockage et au test : origine HTTPS exacte par fournisseur supporté, aucun userinfo, loopback, IP/réseau privé ou redirection vers une autre origine ; supprimer/refuser les fournisseurs que le runtime ne sait pas réellement exécuter.
- **Non-objectifs :** ne pas bâtir un proxy sortant générique ni supporter des endpoints « compatibles OpenAI » non demandés.
- **Dépendances :** liste produit explicite des fournisseurs supportés et de leurs origines ; stratégie de test sans journaliser la clé.
- **Preuve d'acceptation :** tests unitaires refusant `http`, loopback, IP privée, userinfo et redirection cross-origin ; test positif par fournisseur supporté ; aucune requête sortante n'est déclenchée pour une URL refusée ; le secret n'apparaît jamais dans les logs ou erreurs.

## BE-P2-11 — La future stack exposée doit imposer un mode production et un CORS explicites

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/config.ts:5-25` définit `NODE_ENV=development` et un CORS vide par défaut ; `backend/src/middleware/corsAndBodySize.ts:27-45` traduit cette absence en `['*']` hors production.
- **Preuves runtime :** l'environnement Servy contrôlé ne déclarait ni `NODE_ENV` ni `CORS_ALLOWED_ORIGIN`. Une requête `OPTIONS` depuis une origine locale a reçu `Access-Control-Allow-Origin: *`. Ce comportement est cohérent avec le rôle de lanceur de développement local confirmé par le PO ; il ne constitue pas la configuration cible.
- **Impact :** le code sait distinguer le mode production, mais aucun contrat de déploiement final ne prouve encore que la future stack fournira obligatoirement une origine explicite. Copier telle quelle la configuration de développement rendrait alors le CORS trop permissif.
- **Correction minimale :** dans la future stack exposée, déclarer explicitement `NODE_ENV=production` et l'origine réelle du frontend, puis faire échouer le démarrage si l'origine manque. Ne pas modifier Servy pour simuler aujourd'hui cette stack finale.
- **Non-objectifs :** ne pas ajouter un service de configuration centralisé et ne pas transformer le lanceur local en déploiement de production.
- **Dépendances :** choix de la stack finale et URL canonique du frontend.
- **Preuve d'acceptation :** dans l'environnement cible, l'origine autorisée reçoit le header attendu, une origine étrangère ne le reçoit pas et le backend refuse de démarrer en production sans origine. Le service Servy de développement n'est pas la preuve attendue.

## BE-P2-12 — Trois tables IA sont RLS sans policy : fermeture volontaire à prouver

- **Priorité :** P2
- **Statut :** À VALIDER
- **Preuves runtime :** les advisors ont signalé `ai_feature_model_assignments`, `ai_request_reservations` et `ai_usage_daily_aggregates` avec RLS activée mais aucune policy.
- **Impact :** pour un client utilisateur, l'absence de policy est fail-closed et peut être exactement l'intention. Le risque est documentaire : sans inventaire des grants et consommateurs, on ne sait pas si cette fermeture est voulue ou masque un chemin cassé ; ajouter une policy permissive serait plus dangereux que l'état actuel.
- **Correction minimale :** documenter, table par table, le propriétaire fonctionnel, les rôles ayant des grants et le seul service autorisé. Révoquer les grants inutiles. Ajouter une policy uniquement si un accès utilisateur actuel est prouvé et avec le prédicat métier exact.
- **Non-objectifs :** ne pas « corriger » automatiquement l'advisor par `USING (true)` ou par une policy large.
- **Dépendances :** inventaire des appels IA et décision d'autorité pour les agrégats/réservations.
- **Preuve d'acceptation :** matrice grants/policies/consommateurs revue ; tests SQL par rôle ; aucune policy permissive ; la documentation explique explicitement pourquoi chaque table est client-accessible ou service-only.
