# 4. Contrats, erreurs et observabilité

## Lecture d'ensemble

La chaîne de contrat est l'une des parties les plus abouties du backend : schémas Zod partagés, 91 procédures tRPC recensées, déclaration générée synchronisée et catalogue d'erreurs public. `backend/src/middleware/errorHandler.ts:77-110` filtre les détails, normalise le code, expose l'action de récupération et renvoie un `request_id`. `backend/src/trpc/procedures.ts:144-157` adapte le même contrat au format tRPC. La sonde sans jeton a confirmé une erreur 401 française structurée.

Le déficit n'est pas la réponse client ; c'est ce qui manque côté serveur pour relier cette réponse à une cause, une dépendance et une latence.

## BE-P1-08 — La sonde de santé et les logs ne prouvent ni readiness ni cause d'incident

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves code/configuration :** `backend/src/app.ts:20-25` renvoie constamment `{ ok: true }` sur `/health`. `backend/src/config.ts:5-25` permet aux configurations critiques d'être vides par défaut et `backend/src/index.ts:21-30` démarre immédiatement le serveur. Servy ne sonde que cette liveness (`scripts/servy/CIR-Cockpit-API.json:22-29`). `backend/src/middleware/errorHandler.ts:77-110` et `backend/src/trpc/procedures.ts:144-157` formatent mais ne journalisent pas l'erreur serveur.
- **Écart à la cible :** `docs/architecture-cible-cir-cockpit.md:764-777` exige corrélation de bout en bout, retries bornés, dépendances observables et tests de faute.
- **Impact :** le service peut être déclaré sain alors que DB, JWKS/Auth ou configuration sont inutilisables. Un utilisateur communique un `request_id` qui n'est retrouvé dans aucun événement structuré. Les lenteurs et erreurs externes ne sont pas attribuables sans relire des logs texte partiels.
- **Correction minimale :** valider au démarrage les variables réellement obligatoires ; garder `/health` comme liveness légère et ajouter une readiness bornée vérifiant DB et configuration/Auth sans requête coûteuse ; émettre une ligne JSON pour fin de requête, erreur, appel externe et opération lente avec `request_id`, route/action, statut, durée et code CIR. Expurger les tokens, clés, payloads personnels et détails SQL.
- **Non-objectifs :** ne pas installer une stack APM complète. Des logs JSON locaux rotatifs, des compteurs simples et deux endpoints de sonde suffisent au POC.
- **Dépendances :** liste des dépendances bloquant réellement la readiness ; seuil d'opération lente ; politique de conservation des logs.
- **Preuve d'acceptation :** démarrage refusé avec message non sensible si une configuration obligatoire manque ; liveness reste 200 quand le processus tourne ; readiness devient non-200 lors d'une panne DB/Auth simulée et se rétablit ; le `request_id` d'une erreur client retrouve exactement un log serveur ; test automatique de redaction des secrets.

## BE-P2-04 — L'invariant « un TCS appartient à une agence » existe dans le formulaire, pas dans l'API

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** `shared/schemas/admin/user.schema.ts:26-44` impose au formulaire au moins une agence pour le rôle `tcs`. Le schéma API de création rend pourtant rôle et agences optionnels (`shared/schemas/admin/user.schema.ts:60-68`). Le service choisit `tcs` par défaut et accepte une liste vide (`backend/src/services/admin/adminUsers.ts:83-110`).
- **Impact :** un appel API direct, un ancien frontend ou un test peut créer un TCS sans périmètre d'agence. L'utilisateur existe mais n'a pas de contexte métier exploitable ; l'invariant varie selon le client.
- **Correction minimale :** porter la règle dans le schéma/handler API canonique : si le rôle résolu vaut `tcs`, `agency_ids` contient au moins une agence active. Décider explicitement le cas `agency_admin` au lieu de l'inférer.
- **Non-objectifs :** ne pas dupliquer la règle dans chaque écran ; le formulaire peut garder un message ergonomique mais l'API reste l'autorité.
- **Dépendances :** validation PO de la règle pour `agency_admin` et `super_admin` ; traitement des éventuels profils existants sans agence.
- **Preuve d'acceptation :** requête directe de création TCS sans agence rejetée par un code de validation stable ; création avec agence réussie ; test partagé démontrant l'alignement formulaire/API.

## BE-P3-01 — `x-request-id` entrant n'est ni borné ni normalisé

- **Priorité :** P3
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/middleware/requestId.ts:5-10` reprend toute chaîne non vide fournie dans `x-request-id`, sans limite de taille ni alphabet, puis la réémet.
- **Impact :** identifiants gigantesques ou contenant des caractères de contrôle peuvent gonfler les headers, polluer les logs futurs et compliquer la corrélation. Ce n'est pas une brèche métier démontrée dans l'état actuel.
- **Correction minimale :** accepter uniquement un format court défini (UUID ou alphabet visible avec taille maximale) ; sinon générer un UUID serveur. Si l'identifiant amont doit être conservé, le journaliser séparément après normalisation.
- **Non-objectifs :** ne pas introduire de système de trace distribué pour ce contrôle d'entrée.
- **Dépendances :** aucun blocage ; aligner le format avec les proxys éventuellement utilisés.
- **Preuve d'acceptation :** tests sur UUID valide, chaîne vide, caractères de contrôle et valeur trop longue ; réponse toujours munie d'un identifiant serveur borné.

## Contrat d'observabilité minimal

Chaque événement serveur devrait contenir uniquement :

- horodatage UTC, niveau, `request_id` ;
- procédure/action et statut HTTP/code CIR ;
- durée totale et, pour une dépendance, son nom et sa durée ;
- identifiants techniques non sensibles nécessaires au diagnostic ;
- aucune clé, aucun JWT, aucun mot de passe, aucun contenu libre métier.

Cette base rend le catalogue d'erreurs déjà en place réellement exploitable sans sur-ingénierie.
