# Responsive, performance perçue et état porté par l’URL

## Position

CIR Cockpit est un produit desktop-first utilisé sur poste fixe pendant de longues sessions (`PRODUCT.md:9-17`). Le test local à 390 × 844 n’a néanmoins révélé aucun débordement horizontal global : le shell mobile, les Paramètres et les principaux blocs restent accessibles. Il n’y a donc pas de motif pour lancer une refonte mobile générale.

Les vrais sujets de scalabilité sont ailleurs : volume de données chargé dans le navigateur, vues cachées maintenues actives, et état de travail perdu au refresh ou impossible à partager.

## UI-12 — Les écrans de travail restent difficiles à partager ou restaurer

**Priorité : P2**

**Statut : [CODE].**

### Constat

L’annuaire constitue la bonne référence : ses paramètres de recherche décrivent type, portée, départements, ville, commerciaux, archives, taille, tri et page, puis sont transformés en contrat serveur (`frontend/src/components/client-directory/clientDirectorySearch.ts:77-173`). Un lien peut donc restaurer une vue de travail.

Plusieurs autres écrans conservent en revanche leur état uniquement dans React :

- Pilotage n’accepte dans la route que `interactionId`; recherche, période, canal, portée et tri restent locaux (`frontend/src/app/dashboardSearch.ts:1-10`, `frontend/src/hooks/dashboard-state/useDashboardState.tsx:90-103`) ;
- Paramètres conserve `activeSection` en `useState('workflow')` (`frontend/src/components/Settings.tsx:104-112`) ;
- la fiche Tiers conserve l’onglet Synthèse/Contacts/Activités/Tâches/Historique localement (`frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:33-42`, `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:187-225`) ;
- Référentiels met l’onglet principal dans l’URL, mais garde localement pages, recherches, filtres, tri, densité et colonnes (`frontend/src/components/pricing-references/PricingReferencesPage.tsx:140-193`) ;
- Tâches garde vue, recherche, statut, échéance, type, priorité, tri et page en état local (`frontend/src/components/tasks/TasksPage.tsx:29-54`).

Le keep-alive masque partiellement le problème pendant une même session, mais un refresh, un lien envoyé à un collègue ou une navigation directe restaure seulement la route de base.

### Impact utilisateur

Un administrateur ne peut pas transmettre « les anomalies bloquantes de cet import, triées ainsi » ; un TCS ne peut pas revenir à sa file Tâches filtrée. Après refresh ou incident, l’utilisateur reconstruit manuellement son contexte, ce qui contredit la promesse « ne rien perdre entre deux interruptions » (`PRODUCT.md:15`).

### Correctif minimal

Prioriser seulement l’état ayant une valeur de navigation :

1. onglet/section actif ;
2. filtres, recherche, tri et pagination serveur ;
3. identifiant du détail ouvert lorsqu’un lien direct a du sens.

Conserver en état local les éléments transitoires : texte non validé, dialog de confirmation, hover, progression de saisie. Utiliser les schémas Zod de recherche de route déjà en place et `replace` pour les changements continus afin de ne pas polluer l’historique.

Ordre utile : Tâches et Paramètres d’abord, Pilotage seulement après décision métier UI-02, puis filtres Référentiels les plus employés.

### Non-objectifs

- Pas de sérialisation des brouillons sensibles dans l’URL.
- Pas de store global supplémentaire.
- Pas de conservation de chaque état visuel mineur.
- Pas de refonte du routeur TanStack.

### Preuve d’acceptation

- Copier/coller l’URL restaure la même section, les mêmes filtres et la même page de résultats.
- Retour/Avance du navigateur traverse les changements significatifs sans rejouer chaque frappe.
- Une URL invalide est normalisée par le schéma et ne fait pas planter l’écran.
- Aucun contenu de prompt, note ou donnée sensible n’apparaît dans la query string.

## UI-13 — L’index de recherche front n’est pas compatible avec 12 000 clients

**Priorité : P2 avant import massif ; deviendra P1 lors du chargement réel.**

**Statut : [CODE].**

### Constat

`PRODUCT.md:21-24` impose plus de 12 000 clients, 50 à 100 fournisseurs et des catalogues de centaines de milliers de références comme échelle de décision.

Le shell charge aujourd’hui les Activités dès que les données d’agence peuvent être lues, quelle que soit la route active (`frontend/src/hooks/session/useAppQueries.ts:32-45`). Il charge aussi l’index entités/contacts complet dès que la recherche globale est ouverte ou que la vue est Clients/Cockpit (`frontend/src/hooks/session/useAppQueries.ts:44-60`).

Côté backend, `getEntitySearchIndex` sélectionne toutes les entités actives de l’agence sans limite, extrait tous leurs identifiants, puis charge tous leurs contacts (`backend/src/services/entities/core/dataEntitiesList.ts:94-142`). Le frontend conserve ces tableaux et filtre/trie ensuite localement. Cette approche est confortable sur quelques lignes, mais son coût réseau, parsing, mémoire et rerender croît avec chaque client et contact.

Le keep-alive maintient en plus toutes les vues visitées dans le DOM (`frontend/src/components/app-main/AppMainTabContent.tsx:62-71`, `frontend/src/components/app-main/AppMainTabContent.tsx:115-155`). Même après correction des raccourcis, leurs hooks et abonnements peuvent rester actifs.

### Impact utilisateur

À l’échelle cible, ouvrir Cockpit ou Ctrl+K peut déclencher un gros téléchargement avant de rendre une recherche utile. Sur un poste laissé ouvert toute la journée, les tableaux et vues cachées augmentent la pression mémoire. Le ressenti sera une saisie lente précisément sur les parcours les plus fréquents.

### Correctif minimal

1. Remplacer l’index complet par une recherche serveur debounced et bornée, en réutilisant les contrats annuaire/recherche existants.
2. Charger au démarrage uniquement les éléments récents nécessaires au Cockpit et un petit cache de suggestions ; lancer la recherche distante à partir d’un seuil court validé (par exemple 2 caractères, à confirmer par le PO).
3. Retourner un nombre de résultats limité, le type d’objet et les champs d’affichage nécessaires ; pas la fiche entière.
4. Ne charger les Activités que pour Cockpit/Pilotage/recherche lorsqu’elles sont réellement nécessaires, ou utiliser une projection récente bornée.
5. Après isolation UI-01, mesurer les requêtes et listeners des vues keep-alive ; démonter uniquement les vues dont le brouillon n’a pas à survivre.

### Non-objectifs

- Pas de moteur de recherche externe.
- Pas d’Elasticsearch/Algolia pour 12 000 clients.
- Pas de virtualisation de la palette si le serveur renvoie une dizaine de résultats.
- Pas de préchargement de centaines de milliers de références dans le shell.

### Preuve d’acceptation

- Profil avec 12 000 clients et volume réaliste de contacts : ouverture du shell sans téléchargement de l’index complet.
- Ctrl+K rend immédiatement son cadre, puis une requête bornée après debounce.
- La payload de suggestion contient uniquement les champs affichés et un maximum explicite.
- Mesures avant/après : octets transférés, temps jusqu’à saisie interactive, mémoire après visite de chaque onglet et nombre de requêtes actives.

## UI-21 — Le Cockpit perd de la densité sur le bloc Suivi

**Priorité : P2**

**Statut : [NAV] [CODE].**

### Constat

Dans l’étape Détails du Cockpit, le bloc « Suivi » déclare une grille `sm:grid-cols-2` mais ne contient plus qu’un seul enfant « N° dossier » (`frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx:280-303`). La seconde moitié reste vide à partir du breakpoint `sm`.

Le parcours desktop montre cette perte de densité : un grand bloc visuel est réservé alors que l’information n’occupe qu’une colonne. Le commentaire indique encore « N° dossier & Rappel », signe que le rappel a été retiré ou déplacé vers Tâches sans que la composition visuelle soit nettoyée. Cette migration métier est correcte — une relance est une Tâche (`docs/architecture-cible-cir-cockpit.md:343-347`) — mais son ancien emplacement est resté.

### Impact utilisateur

Le bloc attire plus l’œil qu’il ne contient d’information et pousse les familles produits plus bas. Sur un écran de saisie fréquent, cela réduit le nombre de champs visibles sans raison.

### Correctif minimal

- Passer ce bloc en colonne unique et dimensionner le champ à sa largeur utile, ou intégrer N° dossier dans le groupe précédent si la hiérarchie reste claire.
- Mettre à jour le commentaire pour ne plus mentionner Rappel.
- Réserver la création de Tâche à son parcours réel ; ne pas réintroduire un champ rappel dans l’Activité.

### Non-objectifs

- Pas de refonte complète du wizard Cockpit.
- Pas de retour du rappel legacy.
- Pas de compactage qui descend sous les hauteurs ou tailles minimales.

### Preuve d’acceptation

- À 1440 × 900, aucune demi-colonne vide dans le bloc Suivi et davantage de contenu utile visible sans scroll.
- À 390 × 844, la hiérarchie reste identique et le champ conserve une cible confortable.
- Le payload Activité ne récupère aucun champ de Tâche future.

## Responsive : règles de décision

### À préserver

- Les tables denses peuvent conserver une largeur minimale et un scroll interne sur petit viewport : le produit principal reste desktop.
- Les barres d’onglets/filtres utilisent déjà `overflow-x-auto` sur plusieurs surfaces (`frontend/src/components/tasks/TasksPage.tsx:61-76`, `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:187-225`).
- Le shell possède une navigation mobile dédiée et le test 390 × 844 ne révèle pas de débordement du document.

### À éviter

- Dupliquer une version mobile complète d’un écran.
- Masquer une colonne métier décisive sans autre moyen d’accès.
- Transformer chaque table en cartes mobiles si le cas d’usage n’est pas validé.
- Utiliser un Sheet droit uniquement parce que le viewport est petit sans mettre à jour la décision explicite de `DESIGN.md`.

## Budget de performance proportionné

Le prochain lot ne nécessite pas un observatoire complet. Trois mesures suffisent :

1. volume transféré et temps de réponse de Ctrl+K sur 12 000 clients ;
2. nombre de listeners/requêtes après visite de tous les onglets keep-alive ;
3. temps de rendu d’une table Référentiels avec la taille de page maximale réellement proposée.

On n’introduit virtualisation, index spécialisé ou découpage supplémentaire que si l’une de ces mesures prouve le besoin.
