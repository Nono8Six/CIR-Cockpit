# Questions de cadrage - Saisie tiers V1

Objectif : répondre directement sous chaque question avant de produire le plan détaillé de refonte Saisie / recherche / création / annuaire.

## Clarification : Directory et 7 onglets

Dans le projet, `Directory` désigne l'annuaire des fiches tiers : l'écran où l'on consulte, filtre, ouvre, édite et archive les fiches déjà créées.

Quand je parle des `7 onglets`, je parle d'une proposition d'affichage dans cet annuaire avec une vue séparée par type de fiche :

- Clients à terme
- Clients comptants
- Particuliers
- Prospects
- Fournisseurs
- Sollicitations
- Internes (CIR)

Ce n'est pas forcément obligatoire sous forme d'onglets visuels. Cela peut aussi être un filtre, un menu, une barre segmentée ou une autre UX. La vraie question est : veux-tu que l'annuaire permette de voir et gérer séparément ces 7 catégories ?

Réponse / clarification utilisateur :

Oui, après réflexion plus froide : je ne mettrais pas les 7 types au même niveau partout. Je séparerais très clairement deux moments UX :

Chercher / consulter une fiche.
Créer une fiche.
Ces deux moments n’ont pas la même logique.

Le Diagnostic
La page actuelle est déjà dans une bonne direction : elle est calme, dense, lisible, orientée travail. Elle ressemble à un vrai outil métier, pas à une page marketing. Les zones sont claires : titre, recherche, filtres, table, pagination, action primaire.

Le risque, maintenant, c’est de vouloir “ajouter tous les types” en les exposant brutalement. Si on ajoute Client à terme, Client comptant, Particulier, Prospect, Fournisseur, Sollicitation, Interne comme 7 onglets principaux, on abîme la page.

Pourquoi ? Parce qu’on mélange deux niveaux de classification :

Client, Prospect, Fournisseur, Interne, Sollicitation sont des familles de tiers.
Client à terme, Client comptant, Particulier sont plutôt des sous-types de client.
Prospect société et Prospect personne physique sont aussi des sous-types, mais probablement pas à exposer tout le temps.
Donc le problème n’est pas “comment caser 7 boutons”. Le problème est : quelle taxonomie mentale donner à l’utilisateur pour qu’il trouve vite sans comprendre notre modèle technique ?

La Position UX Que Je Défendrais
Je ferais de cette page un Annuaire tiers, pas une page “Clients et prospects++”.

Le titre devrait devenir :

Annuaire tiers

Et l’interface devrait dire implicitement :

Ici, tu retrouves toutes les fiches de personnes, sociétés, fournisseurs, sollicitations et internes. Tu n’as pas besoin de savoir dans quelle table ou quel modèle elles vivent.

La page reste une seule surface de travail. Pas 7 pages. Pas 7 tables. Pas 7 onglets lourds.

Le Bon Modèle
Pour la consultation, je proposerais une hiérarchie comme ça :

Tous
Clients
Prospects
Fournisseurs
Internes
Sollicitations
Puis, seulement quand c’est utile, un second niveau discret :

Si Clients est sélectionné :

Tous clients
À terme
Comptants
Particuliers
Si Prospects est sélectionné :

Tous prospects
Sociétés
Personnes
Là, on garde une architecture propre. On ne force pas l’utilisateur à voir tous les détails tout le temps.

Point Clé
Pour la création, en revanche, je mettrais bien les 7 choix explicitement :

Client à terme
Client comptant
Particulier
Prospect
Fournisseur
Sollicitation
Interne CIR
Parce qu’au moment de créer, l’utilisateur doit choisir une intention précise. Mais au moment de consulter, il doit surtout retrouver vite.

Donc : 7 choix à la création, pas 7 onglets permanents à la consultation.

La Table
La table doit rester unique. C’est très important.

Elle doit garder une structure stable, avec des colonnes génériques :

Type
Nom / identité
Identifiant
Téléphone
Email
Ville
Agence
Commercial / référent
Mis à jour
La colonne Identifiant devient contextuelle :

client : numéro client ;
fournisseur : code fournisseur ou numéro fournisseur ;
sollicitation : téléphone principal ;
interne : email ou agence CIR ;
prospect : vide ou indicateur léger.
Ça évite d’avoir une colonne N° client, puis une colonne Code fournisseur, puis une colonne Agence CIR, puis une colonne Téléphone sollicitation, etc. C’est exactement comme ça qu’une table devient une usine à gaz.

Les Filtres
La recherche actuelle est bonne visuellement. Il faut la rendre plus puissante, pas plus grosse.

Le champ unique doit chercher dans :

nom société ;
prénom / nom ;
numéro client ;
téléphone ;
email ;
SIRET / SIREN ;
code fournisseur ;
ville.
Les filtres doivent rester courts. Les systèmes solides type GitLab recommandent recherche + filtres visibles, mais pas une barre avec 15 contrôles. Leur guidance parle plutôt de 3 à 5 filtres visibles avant de passer à des patterns plus avancés. Cloudscape fait aussi une distinction nette entre recherche simple, filtres par collection, et filtre avancé selon la complexité.

Donc ici, visible par défaut :

Recherche
Type
Agence
Ville / département
Archives
Affichage / vues sauvegardées
Le reste doit être dans un panneau “Filtres avancés”, pas dans la première ligne.

Le Détail
La complexité métier doit vivre dans la fiche détail, pas dans la table.

Quand j’ouvre une fiche :

Client : compte, commercial, contacts, historique.
Fournisseur : code, numéro fournisseur, SIRET, contacts.
Sollicitation : téléphone, notes, historique de démarchage.
Interne : profil, agence CIR, email, téléphone.
Particulier : identité, coordonnées, numéro client.
Ça donne une table simple + des détails riches. C’est le bon compromis.

Ce Que Je Changerais Dans Le Design Actuel
Je garderais 80 % de la structure actuelle.

Je changerais :

titre : Annuaire tiers ;
compteur plus clair ;
filtre Affichage renommé en Type ou remplacé par une barre de familles ;
table avec colonne Identifiant au lieu de N° client ;
badges de type plus précis ;
bouton Nouvelle fiche ouvrant un menu typé ;
filtres avancés masqués derrière un bouton propre ;
fiche détail adaptée au type.
Je ne changerais pas :

la densité générale ;
la logique table + filtres ;
la pagination ;
les vues sauvegardées ;
l’action primaire en haut à droite ;
le style sobre.


## 1. Objectif global

### 1.1
Est-ce que `docs/spec-saisie-tiers.md` devient la source de vérité produit, ou faut-il la corriger avant de planifier ?

Réponse : On s'en inspire fortement pour construire le plan, mais ce n'est pas une source figée. Elle sert de base de réflexion produit/data/API, puis on corrige ce qui ne convient pas avant implémentation.


### 1.2
Est-ce que le scope V1 doit vraiment inclure Saisie + recherche unifiée + création inline + Directory + édition + archivage, ou faut-il découper en livraisons plus petites ?

Réponse : Oui, c'est le scope V1 complet. En revanche, l'exécution doit être découpée en tranches techniques validables pour éviter un chantier ingérable.


### 1.3
Est-ce qu'il faut supprimer complètement la logique configurable `agency_entities` pour les types de tiers dans la Saisie ?

Réponse : Oui pour la Saisie : les types de tiers doivent devenir des catégories produit fixes, non configurables par agence. En revanche, on ne supprime pas forcément la table ou les anciens usages immédiatement : on la déprécie proprement, on retire son rôle dans la Saisie, puis on nettoie seulement après audit des usages restants.


### 1.4
Est-ce que le bouton `Tout` doit disparaître partout dans la Saisie, y compris les anciens composants non guidés ?

Réponse : Oui, `Tout` doit disparaître comme choix de relation métier. On peut garder un état interne "aucun type sélectionné" ou "recherche tous types" pour éviter les doublons, mais l'utilisateur ne doit pas enregistrer une interaction avec `Tout` comme type de tiers.


### 1.5
Est-ce qu'il faut une refonte UX profonde du parcours, ou garder l'UI actuelle et seulement rendre chaque type fonctionnel ?

Réponse : Il faut une refonte UX profonde mais contrôlée. On garde l'esprit visuel actuel, sobre et professionnel, mais on revoit l'architecture du parcours : annuaire tiers unique, recherche globale, création typée, formulaires spécialisés par type, complexité progressive, et fiches détail adaptées. L'objectif n'est pas seulement de rendre les types fonctionnels, mais de rendre l'ensemble propre, clair, rapide et durable.


## 2. Types de tiers

### 2.1 - Client à terme
Quels champs sont absolument obligatoires à la création : SIRET, SIREN, NAF, adresse, téléphone, email, commercial ?

Réponse : La plupart des champs seront remplit automatiquement graçe a l'api qu'on utilise a la création de compte tu vois ?


### 2.2 - Client comptant
Faut-il exactement le même parcours que client à terme, sauf `account_type='cash'` ?

Réponse : Oui


### 2.3 - Particulier
Le numéro client est-il toujours obligatoire dès la création, ou peut-il être ajouté plus tard ?

Réponse : Il est obligatoire a la création car un particulier doit avoir un numéro de client pour etre considéré comme un client.


### 2.4 - Particulier
Le téléphone/email principal doit-il être stocké sur `entities.primary_*`, dans `entity_contacts`, ou dans les deux ?

Réponse : Dans les deux je sais pas tu en penses quoi ?


### 2.5 - Prospect
Faut-il demander d'abord "personne physique ou société" avant tout autre champ ?

Réponse : Oui


### 2.6 - Prospect société
La ville doit-elle être obligatoire ou optionnelle ?

Réponse : Optionnelle


### 2.7 - Prospect personne physique
Adresse, code postal et ville doivent-ils être optionnels dès la création ?

Réponse : Optionnelle


### 2.8 - Fournisseur
Le contact nominatif doit-il être optionnel à la création, ou obligatoire dans la Saisie cockpit ?

Réponse : Optionnelle


### 2.9 - Fournisseur
`supplier_code` et `supplier_number` doivent-ils être saisis par l'utilisateur, générés automatiquement, ou seulement ajoutés plus tard depuis l'annuaire ?

Réponse : Ajouté par l'utilisateir, peu être fais plus tard


### 2.10 - Sollicitation
Confirmes-tu que le téléphone seul suffit et que `name='Inconnu'` est acceptable si aucun nom n'est saisi ?

Réponse : Oui


### 2.11 - Sollicitation
Faut-il créer une ligne `entities`, ou seulement enregistrer l'interaction sans fiche tiers ?

Réponse : Enregistrer l'interaction, et la recherche se fais avec le numéro de téléphone


### 2.12 - Interne (CIR)
Faut-il gérer deux sous-types visibles : membre plateforme et interne externe ?

Réponse : Membre qui sont créer déjà dans l'outil actuel et membre que l'on peu créer rapidement avec Nom + Prénom + agence


### 2.13 - Interne externe
Qui fournit la liste réelle des agences CIR à mettre dans `cir_agencies` ?

Réponse : L'administrateur


## 3. Recherche et doublons

### 3.1
Quand l'utilisateur choisit `Fournisseur` mais trouve un client existant, faut-il afficher le résultat cross-type ou le masquer ?

Réponse : Afficher le résultat cross-type


### 3.2
Quand un résultat cross-type est sélectionné, faut-il changer automatiquement le type choisi, demander confirmation, ou garder le type initial ?

Réponse : Garder le type initial


### 3.3
Quels champs doivent compter pour détecter un doublon société : SIRET, SIREN, nom, ville, téléphone, email ?

Réponse : SIRET, SIREN


### 3.4
Quels champs doivent compter pour détecter un doublon personne : prénom, nom, téléphone, email, ville, code postal ?

Réponse : Prénom + nom, téléphone


### 3.5
Pour le téléphone, faut-il une normalisation française stricte ou une comparaison digits-only tolérante ?

Réponse : Normalisation française stricte


### 3.6
Pour les fiches archivées, faut-il un toggle visible dans tous les écrans de recherche ou seulement dans l'annuaire ?

Réponse : Toggle visible dans tous les écrans de recherche


### 3.7
La recherche doit-elle interroger le backend à chaque frappe, ou charger un index filtré comme aujourd'hui ?

Réponse : Interroger le backend à chaque frappe


## 4. Création inline

### 4.1
Après avoir choisi un type, faut-il un seul dialogue universel qui change ses champs, ou des formulaires spécialisés par type ?

Réponse : Il faut un parcours commun visuellement, mais des formulaires spécialisés par type. L'utilisateur doit avoir une expérience cohérente, sans formulaire monstre. Chaque type affiche uniquement les champs utiles à sa création : client société, particulier, prospect société/personne, fournisseur, sollicitation, interne.


### 4.2
Pour les sociétés, faut-il garder la recherche officielle entreprise comme première étape ?

Réponse : Oui pour les sociétés. La recherche officielle doit rester la première étape pour Client à terme, Client comptant, Prospect société et Fournisseur. Elle réduit les erreurs de saisie, accélère la création et améliore la qualité des données. Elle ne doit pas bloquer la saisie manuelle.


### 4.3
Si la recherche officielle ne trouve rien, faut-il autoriser la saisie manuelle immédiatement ?

Réponse : Oui. La saisie manuelle doit être disponible immédiatement si l'entreprise n'est pas trouvée, si les données officielles sont incomplètes, ou si l'utilisateur sait déjà qu'il doit créer la fiche. Le parcours doit encourager la recherche officielle, mais ne jamais bloquer l'opérateur. Et si c'est créer via la recherche officiel avec on dois mettre un petit badge en sorte d'icone "validé" ou quoi tu vois ? car on est sur des infos.


### 4.4
Pour `Prospect société` et `Fournisseur`, les données officielles SIRET/SIREN doivent-elles rester optionnelles ?

Réponse : Oui. Pour Prospect société et Fournisseur, les données officielles restent optionnelles. Elles sont utiles pour la qualité de données et la détection de doublons, mais elles ne doivent pas empêcher une création rapide. Pour les clients société, en revanche, les exigences peuvent rester plus strictes.


### 4.5
À la création d'un client société, faut-il créer un contact nominatif tout de suite ou laisser cela pour après ?

Réponse : Le contact nominatif ne doit pas être obligatoire à la création d'un client société. On doit pouvoir créer la fiche client avec les coordonnées générales de l'entreprise, puis ajouter les contacts nominatifs ensuite. En revanche, le parcours peut proposer d'ajouter un contact immédiatement après la création si l'information est disponible.


### 4.6
Pour les personnes physiques, faut-il afficher "Identité" comme écran principal au lieu d'un écran "Entreprise" adapté ?

Réponse : Oui. Pour Particulier, Prospect personne physique et Interne externe, l'écran principal doit être centré sur l'identité : prénom, nom, téléphone, email, adresse éventuelle. Il ne faut pas recycler une étape "Entreprise" avec des libellés adaptés artificiellement.


## 5. Conversions

### 5.1
Confirmes-tu que `Prospect -> Client à terme`, `Prospect -> Client comptant`, `Prospect -> Particulier` sont les seules conversions depuis prospect ?

Réponse : Oui. Depuis un prospect, les seules conversions autorisées en V1 sont vers Client à terme, Client comptant ou Particulier. Les autres changements de nature doivent être traités comme une nouvelle fiche, pas comme une conversion automatique.


### 5.2
`Client comptant <-> Client à terme` doit-il être une simple édition de fiche, sans nouvelle entité ?

Réponse : Oui. Le passage Client comptant <-> Client à terme est une modification de fiche sur la même entité. On conserve l'historique existant et les anciennes interactions gardent leur libellé d'origine.


### 5.3
Pour `Sollicitation -> Prospect/Fournisseur`, confirmes-tu qu'on ne convertit jamais et qu'on crée une nouvelle fiche ?

Réponse : Oui. Une Sollicitation reste l'historique du démarchage entrant. Si elle devient utile commercialement, on crée une nouvelle fiche Prospect ou Fournisseur, éventuellement préremplie depuis la sollicitation, mais on ne transforme pas la sollicitation elle-même.


### 5.4
Lors d'une conversion, faut-il une trace d'audit visible dans l'UI ou seulement stockée en backend ?

Réponse : La trace d'audit doit être stockée en backend obligatoirement. Dans l'UI, il faut au minimum afficher l'information dans l'historique ou la fiche détail quand elle aide l'utilisateur à comprendre le changement, sans surcharger la liste principale.


## 6. Annuaire / Directory

### 6.1
Faut-il 7 vues séparées dans l'annuaire, ou un filtre compact avec les 7 types ?

Réponse : On a déjà répondu au tout début


### 6.2
Pour `Internes`, faut-il afficher ensemble les `profiles` et les internes externes dès V1 ?

Réponse : Oui. L'annuaire doit afficher ensemble les membres plateforme (`profiles`) et les internes externes (`entities`) dans une même famille "Internes". Il faut cependant distinguer clairement la source dans la fiche ou par un badge discret : membre plateforme / interne externe. (la je comprends pas la différence entre membre plateforme et interne externe, a la CIR c'est que des employé CIR)


### 6.3
Pour les membres plateforme, quels champs sont éditables depuis l'annuaire : téléphone, nom, email, rôle, agence ?

Réponse : Depuis l'annuaire, les membres plateforme doivent être consultables, mais l'édition doit rester limitée. Le téléphone professionnel peut être éditable si on ajoute ce champ au profil. Le nom, l'email, le rôle et l'agence doivent rester gérés par les écrans d'administration/utilisateurs existants, pour éviter deux endroits concurrents de gestion des droits et identités.


### 6.4
Pour tous les types `entities`, l'archivage doit-il être disponible pour les `tcs`, les `agency_admin`, ou seulement certains rôles ?

Réponse : L'archivage des fiches `entities` doit être réservé aux `agency_admin` et `super_admin` et 'tcs'.


### 6.5
Faut-il garder la suppression définitive complètement hors UI standard ?

Réponse : Oui. La suppression définitive est reservé au admin. L'annuaire expose l'archivage, pas la suppression hard. Toute suppression définitive doit rester une action exceptionnelle, réservée à un workflow super_admin et agency_admin ou technique, avec audit.


## 7. Backend et données

### 7.1
Acceptes-tu qu'on ajoute les colonnes V1 dans `entities` plutôt que de continuer à surcharger `entity_contacts` ?

Réponse : Oui. Les coordonnées générales et les champs métier principaux doivent être portés par `entities`. `entity_contacts` doit rester réservé aux contacts nominatifs additionnels. On ajoute donc les colonnes V1 nécessaires dans `entities` : prénom, nom, téléphone principal, email principal, code fournisseur, numéro fournisseur, agence CIR interne, etc.


### 7.2
Faut-il créer une vue SQL `search_entities`, ou préfères-tu une requête/service backend sans vue SQL ?

Réponse : Créer une vue SQL `search_entities` est préférable si elle respecte strictement la sécurité/RLS. Elle donne une source de recherche unifiée claire pour `entities` + `profiles`, évite de dupliquer la logique dans plusieurs services, et rend le contrat plus stable. Si la version Postgres ou les règles RLS rendent la vue risquée, le plan doit prévoir une alternative backend sans vue, mais la cible préférée reste la vue sécurisée.


### 7.3
Les unicités `client_number`, `supplier_code`, `supplier_number` doivent-elles être globales toutes agences confondues ?

Réponse : Oui. Ces identifiants métier doivent être uniques globalement toutes agences confondues. Cela évite les doublons de référentiel et simplifie la recherche. Si une exception métier réelle existe plus tard, elle devra être traitée explicitement, pas anticipée par défaut.


### 7.4
Pour `Sollicitation.primary_phone`, l'unicité par agence doit-elle bloquer l'enregistrement ou seulement avertir ?

Réponse : Elle doit bloquer l'enregistrement d'une nouvelle sollicitation strictement doublon dans la même agence. L'UI doit afficher la sollicitation existante et proposer de l'ouvrir ou de créer une interaction liée, plutôt que de créer une nouvelle fiche doublon.


### 7.5
Faut-il migrer les anciens `Prospect / Particulier` vers `Prospect` comme la spec le dit, sans essayer de deviner les particuliers ?

Réponse : Oui. La migration legacy doit rester prudente : remapper `Prospect / Particulier` vers `Prospect`, sans essayer de deviner automatiquement quels anciens enregistrements étaient de vrais particuliers. Les corrections fines se feront ensuite manuellement fiche par fiche si nécessaire.


## 8. Plan et livraison

### 8.1
Le plan final doit-il être écrit dans un fichier Markdown durable, probablement dans `docs/`, ou uniquement dans le chat ?

Réponse : Le plan final doit être écrit dans un fichier Markdown durable dans `docs/`. Le chat peut servir à valider la direction, mais le document doit devenir la référence de travail pour suivre les décisions, les tranches, les validations et l'avancement, et il doit y avoir une explication du contexte en début du fichier.


### 8.2
Le plan doit-il être découpé en tranches validables avec commits séparés ?

Réponse : Oui. Le plan doit être découpé en tranches validables avec commits séparés. Le scope V1 est complet, mais l'exécution doit rester progressive : chaque tranche doit avoir un objectif clair, des fichiers impactés, des tests ciblés, une validation QA, puis un checkpoint.


### 8.3
Quelle partie doit être prioritaire dans le plan : DB/API d'abord, UX Saisie d'abord, ou Annuaire/Directory d'abord ?

Réponse : Priorité DB/API d'abord, puis Saisie, puis Annuaire/Directory. Le modèle de données et les contrats API doivent être solides avant de brancher l'UX. Ensuite on construit les parcours de création/recherche dans la Saisie. Enfin on étend l'annuaire avec les filtres, détails, édition et archivage multi-types.


### 8.4
Faut-il prévoir une validation navigateur Playwright manuelle/assistée pour chaque parcours de création ?

Réponse : Oui, pour les parcours critiques de création. Il faut prévoir une validation navigateur assistée au moins pour : Client à terme, Client comptant, Particulier, Prospect société, Prospect personne physique, Fournisseur, Sollicitation et Interne externe. Les tests automatisés peuvent couvrir les règles et contrats, mais les parcours UI doivent aussi être vérifiés visuellement.


### 8.5
Le plan doit-il inclure explicitement les commandes QA et probes Supabase à exécuter à chaque tranche ?

Réponse : Oui. Chaque tranche doit lister les commandes QA attendues, les tests ciblés, et les probes Supabase nécessaires quand le backend/API/DB est impacté. Le plan doit préciser quand exécuter `pnpm run qa:fast`, quand exécuter `pnpm run qa`, et quelles vérifications MCP/probes API sont bloquantes.

