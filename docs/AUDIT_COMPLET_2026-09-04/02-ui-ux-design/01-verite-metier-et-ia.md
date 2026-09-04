# Vérité métier, Pilotage et gouvernance IA

## Principe directeur

L’interface doit distinguer trois choses que le code actuel mélange encore par endroits :

- un fait passé, nommé **Activité** ;
- une action future, nommée **Tâche** ;
- un potentiel commercial, nommé **Opportunité**, éventuellement relié à des devis et commandes.

Ce découpage n’est pas théorique : il est verrouillé par `docs/architecture-cible-cir-cockpit.md:204-218` et détaillé dans `docs/architecture-cible-cir-cockpit.md:315-383`. Tant que les objets Opportunité, Devis et Commande ne sont pas stabilisés, une activité ne doit pas être présentée comme une affaire commerciale certaine.

## UI-02 — Le Pilotage affiche un pseudo-pipeline à partir d’Activités

**Priorité : P1**

**Statut : [CODE] ; le choix transitoire d’intitulé est [À VALIDER].**

### Constat

La page appelée « Pilotage » reçoit un simple tableau d’interactions/activités (`frontend/src/components/Dashboard.tsx:18-35`). Elle déduit qu’une ligne est commerciale si elle possède déjà une étape, un montant, ou si son type contient une expression régulière `devis|prix|commande|chiffrage|offre` (`frontend/src/utils/dashboard/dashboardPipeline.ts:35-42`). Chaque interaction devient ensuite une et une seule ligne de « dossier », portant urgence, étape et montant (`frontend/src/utils/dashboard/dashboardOverview.ts:280-305`).

L’écran permet en outre de changer cette étape et de déclarer le dossier « Gagné » ou « Perdu » directement sur l’interaction (`frontend/src/components/dashboard/overview/DashboardDetailsActions.tsx:26-85`). La table elle-même se décrit comme une surface de dossiers (`frontend/src/components/dashboard/overview/DashboardDossiersTable.tsx:91-108`).

Cette représentation contredit la cible métier :

- une Activité est un fait réalisé et ne doit pas porter directement l’étape d’une Opportunité ou le montant d’une Affaire (`docs/architecture-cible-cir-cockpit.md:315-327`) ;
- « Affaires » est une projection de plusieurs vrais objets, jamais un objet fourre-tout (`docs/architecture-cible-cir-cockpit.md:361-371`) ;
- la cible Pilotage doit être construite après stabilisation des Tâches, Opportunités, Devis et Commandes (`docs/architecture-cible-cir-cockpit.md:373-383`).

La vérité quantitative est également partielle. Le backend renvoie `total` et `page_size`, avec une limite par défaut de 200 activités (`backend/src/services/entities/interactions/dataInteractions.ts:32-35`, `backend/src/services/entities/interactions/dataInteractions.ts:395-429`). Le parseur frontend extrait uniquement `response.interactions` et abandonne les métadonnées (`frontend/src/services/interactions/getInteractions.ts:9-30`). Tous les KPI sont alors agrégés sur ce tableau possiblement tronqué (`frontend/src/hooks/dashboard-state/useDashboardState.tsx:127-151`). À partir de la 201e activité, l’écran peut donc afficher un nombre de dossiers ouverts, un montant de pipeline et une évolution faux sans aucun signal de données partielles.

### Impact utilisateur

Un responsable d’agence peut croire qu’un appel mentionnant un devis est une Opportunité, que son montant est le pipeline officiel et que « Gagné » clôt une véritable affaire. Le chiffre paraît précis mais n’est ni fondé sur le bon objet, ni garanti complet. Cette précision apparente est plus dangereuse qu’une fonctionnalité absente : elle peut orienter une relance ou une décision commerciale.

### Correctif minimal

1. Faire remonter au frontend `total`, `page_size` et un indicateur explicite `is_complete` ou équivalent ; ne jamais calculer un KPI global si `loaded < total`.
2. Tant que les objets cibles n’existent pas, rendre la surface honnête : « Activités à suivre » ou « Activité de l’agence », métriques strictement dérivées de faits réels, sans intitulés Pipeline/Affaires/Gagné/Perdu.
3. Si le PO décide de conserver temporairement les champs legacy, afficher clairement la portée « compatibilité » et ne pas présenter les agrégats comme exhaustifs.
4. Conserver la future vue Pilotage pour le read model Opportunité/Devis/Commande/Tâche prévu par l’architecture, sans créer une nouvelle table `affaires` générique.

### Non-objectifs

- Ne pas implémenter Opportunités, Devis ou Commandes pendant cette correction UI.
- Ne pas perfectionner le scoring ou le pipeline legacy.
- Ne pas charger toutes les activités en mémoire pour obtenir un total : les agrégats exhaustifs doivent être calculés côté serveur sur une source canonique.
- Ne pas inventer les étapes d’Opportunité ; elles sont explicitement à valider (`docs/architecture-cible-cir-cockpit.md:349-353`).

### Preuve d’acceptation

- Un jeu de plus de 200 activités affiche soit des agrégats serveur exhaustifs, soit un état visible `Données partielles`; aucun KPI silencieusement tronqué.
- Une Activité sans Opportunité ne peut plus être déclarée « gagnée » ou « perdue » comme si elle était un dossier commercial.
- Les libellés et l’aide accessible nomment exactement l’objet manipulé.
- Un test de contrat prouve la conservation de `total/page_size` jusqu’au composant qui affiche la portée.

## UI-03 — Les KPI ne répondent pas aux filtres visuellement globaux

**Priorité : P1**

**Statut : [CODE].**

### Constat

La recherche produit `searchedInteractions`, mais le pipeline, les KPI et l’évolution continuent à utiliser toutes les interactions (`frontend/src/hooks/dashboard-state/useDashboardState.tsx:112-151`). La période est transformée en `periodDays` et appliquée seulement aux lignes du tableau (`frontend/src/hooks/dashboard-state/useDashboardState.tsx:154-176`). Le commentaire aux lignes 127-128 confirme que ce comportement est intentionnel, sans que l’interface n’explicite cette différence de périmètre.

La période et la recherche étant présentées dans l’en-tête de la vue, un utilisateur raisonnable les interprète comme des filtres de page. Les chiffres ne bougeant pas selon les mêmes règles que la table, deux vérités concurrentes sont affichées sur le même écran.

### Impact utilisateur

Le responsable peut lire « 12 dossiers ouverts » au-dessus d’une table n’en montrant que 2 sur la période choisie et conclure à un bug, ou pire, croire que les 12 répondent au filtre. La confiance dans les KPI chute rapidement dès la première discordance observée.

### Correctif minimal

Choisir une seule des deux sémantiques et la rendre visible :

- soit période, recherche et canaux filtrent tous les KPI et la liste ;
- soit les KPI restent « Agence · toutes périodes » et leurs contrôles sont séparés visuellement de ceux de la liste, avec une portée écrite à côté du chiffre.

Le choix recommandé pour le POC est le second tant que les agrégats restent simples : déplacer les filtres de liste dans l’en-tête de la table et titrer explicitement les KPI. Cela évite de construire un moteur analytique transitoire.

### Non-objectifs

- Pas de constructeur de rapports.
- Pas de nouveaux filtres ni de vues sauvegardées.
- Pas de synchronisation complexe entre widgets tant que le modèle Pilotage est lui-même transitoire.

### Preuve d’acceptation

- Chaque contrôle indique le bloc qu’il filtre.
- Un test composant change période/recherche et vérifie soit la mise à jour de tous les chiffres concernés, soit leur libellé de portée inchangée.
- L’arbre d’accessibilité associe la portée au KPI, pas uniquement par proximité visuelle.

## UI-07 — Les dates civiles des Tâches ne sont pas calées sur Europe/Paris

**Priorité : P1**

**Statut : [CODE].**

### Constat

`TasksPage` fabrique aujourd’hui, hier et la fin de semaine avec `Date` puis `toISOString().slice(0, 10)` (`frontend/src/components/tasks/TasksPage.tsx:23-27`). Ces valeurs sont calculées au chargement du module, puis conservées pendant toute la session (`frontend/src/components/tasks/TasksPage.tsx:44-54`). Une application laissée ouverte huit heures, ou au-delà de minuit, peut donc garder « Aujourd’hui » sur la veille.

`TaskCreateDialog` utilise la même conversion UTC pour la date par défaut et l’attribut `min` (`frontend/src/components/tasks/TaskCreateDialog.tsx:28-35`, `frontend/src/components/tasks/TaskCreateDialog.tsx:86-88`). `TaskActionDialog` initialise de la même façon son `datetime-local`, puis conserve cet état dans un composant monté même lorsqu’aucune action n’est ouverte (`frontend/src/components/tasks/TasksPage.tsx:97-103`).

Le contrat métier dit pourtant que :

- `due_timezone` est copié depuis le fuseau de l’agence ; Europe/Paris est la valeur CIR validée (`docs/PLAN/plan-brique-3-taches-relances.md:237-246`) ;
- les dates civiles sont des `YYYY-MM-DD`, les heures des `HH:mm`, et le client ne calcule jamais seul le retard faisant autorité (`docs/PLAN/plan-brique-3-taches-relances.md:353-355`).

`toISOString()` exprime l’instant en UTC. Autour de minuit local et des changements d’heure, le jour civil produit peut être la veille ou le lendemain attendu.

### Impact utilisateur

Un TCS peut créer une tâche avec une mauvaise échéance minimale, filtrer « Aujourd’hui » sur le mauvais jour, ou terminer une tâche avec une heure préremplie ancienne. Ce sont des erreurs métier difficiles à détecter après enregistrement.

### Correctif minimal

1. Centraliser une seule fonction de date civile qui reçoit le fuseau de l’agence et retourne `YYYY-MM-DD` sans passage implicite par UTC.
2. Utiliser la date serveur faisant autorité pour les filtres `retard/aujourd’hui/semaine` ; conserver le calcul d’affichage local uniquement comme présentation.
3. Recalculer la valeur au montage/ouverture de chaque dialog et prévoir le rollover après minuit pour une session longue.
4. Laisser le backend continuer à décider `is_overdue` ; ne pas le recalculer dans React.

### Non-objectifs

- Pas de bibliothèque de date supplémentaire si `Intl.DateTimeFormat` et le contexte serveur existant suffisent.
- Pas de conversion des dates civiles en `timestamptz`.
- Pas de support multi-fuseau utilisateur distinct de l’agence sans besoin validé.

### Preuve d’acceptation

- Tests unitaires à 23 h 30 UTC/Paris, après minuit, lors des deux changements d’heure et après un rollover de session.
- Le payload conserve exactement `YYYY-MM-DD`, `HH:mm` et `due_timezone: Europe/Paris`.
- Les filtres se fondent sur la même date serveur que le backend et `is_overdue`.

## UI-09 — Le Prompt Studio protège la publication mais pas le brouillon local

**Priorité : P1**

**Statut : [CODE].**

### Constat

L’éditeur calcule correctement `hasUnsavedChanges` en comparant le corps et la note à leur version initiale (`frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:88-101`). Pourtant, la fermeture du Dialog est directement déléguée à `onOpenChange`, et le bouton « Fermer » appelle immédiatement `onOpenChange(false)` (`frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:114-117`, `frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:387-390`). Un clic extérieur, Échap, la croix ou le bouton peut donc perdre le brouillon local sans avertissement.

En parallèle, les actions beaucoup moins fréquentes de publication et de restauration possèdent bien leurs confirmations dédiées (`frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:409-478`). La protection est donc inversée : l’action gouvernée est confirmée, mais la perte de travail quotidien ne l’est pas.

### Impact utilisateur

Un administrateur peut perdre un prompt long et une note de version par une fermeture involontaire. Cette perte est silencieuse, impossible à récupérer, et particulièrement coûteuse sur une surface de gouvernance IA.

### Correctif minimal

Faire passer toutes les intentions de fermeture par `requestClose()` :

- fermeture immédiate si aucune modification locale ;
- `AlertDialog` « Abandonner les modifications ? » si `hasUnsavedChanges` ;
- blocage de la fermeture pendant une sauvegarde en cours ;
- focus restauré sur l’éditeur si l’abandon est annulé.

### Non-objectifs

- Pas d’autosave serveur.
- Pas d’historique de chaque frappe.
- Pas de collaboration temps réel.
- Ne pas modifier les confirmations de publication/restauration, qui protègent une autre décision.

### Preuve d’acceptation

- Le même garde s’applique à Échap, overlay, croix et bouton Fermer.
- Fermer un contenu inchangé ne crée aucune confirmation.
- Abandonner ferme et réinitialise ; annuler conserve exactement le texte et le focus.
- Un test couvre la fermeture pendant `isSaving`.

## UI-11 — Le vocabulaire visible n’a pas fini la bascule vers Activité

**Priorité : P2**

**Statut : [CODE] ; le calendrier de retrait technique reste [À VALIDER].**

### Constat

Le vocabulaire canonique visible « Activité » a été validé le 8 août 2026 ; « Interaction » n’est plus qu’un nom technique temporaire (`docs/architecture-cible-cir-cockpit.md:921-925`). Le shell conserve pourtant une section technique `interactions` et plusieurs libellés utilisateur « Interactions » (`frontend/src/app/appConstants.tsx:81-86`, `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:207-212`, `frontend/src/components/settings/integrity/IntegrityInteractionsSheet.tsx:107-142`).

Le problème n’est pas le nom des tables ou fonctions internes. Il apparaît lorsque la même chose est appelée « Activité » dans Tâches/Cockpit et « Interaction » dans les fiches, l’intégrité ou les réglages.

### Impact utilisateur

Le TCS doit apprendre que deux mots décrivent le même fait. Le terme « interaction » entretient aussi la confusion avec le pseudo-dossier du Pilotage.

### Correctif minimal

- Remplacer uniquement les chaînes visibles et labels accessibles par « Activité(s) ».
- Conserver temporairement les identifiants de routes, types et noms de fichiers si leur renommage n’apporte aucun bénéfice utilisateur immédiat.
- Ajouter une vérification statique limitée aux chaînes JSX pour empêcher la réintroduction du terme visible.

### Non-objectifs

- Pas de renommage massif de tables, payloads, hooks ou historiques de migration.
- Pas de compatibilité double exposée à l’utilisateur.
- Pas de changement du sens métier des données.

### Preuve d’acceptation

- Les parcours Cockpit, fiche Tiers, Paramètres et Pilotage utilisent le même terme visible.
- Les tests d’accessibilité ne contiennent plus un onglet ou un titre « Interaction(s) », hors citation historique explicitement marquée.
- Le PO confirme le retrait progressif des identifiants techniques séparément.

## UI-20 — Une requête IA secondaire peut masquer toute la vue

**Priorité : P2**

**Statut : [CODE].**

### Constat

La vue Capacités lance séparément les réglages, prompts et l’usage (`frontend/src/components/admin-ai/AiCapabilitiesView.tsx:142-167`), puis affiche un squelette global tant qu’une seule requête est pending et remplace toute la page par un message générique si une seule échoue (`frontend/src/components/admin-ai/AiCapabilitiesView.tsx:275-290`).

La vue Situation fait de même avec quatre lectures indépendantes : réglages, usage, prompts et cinq derniers événements (`frontend/src/components/admin-ai/AiSituationView.tsx:71-94`). Une panne du journal récent masque donc aussi l’état des fournisseurs et des politiques, qui peut pourtant être disponible (`frontend/src/components/admin-ai/AiSituationView.tsx:119-139`).

### Impact utilisateur

Lors d’un incident IA, l’administrateur perd précisément les informations qui lui permettraient de distinguer fournisseur, prompt, quota ou journal. Un service secondaire lent retarde toute la page et transforme un incident partiel en écran aveugle.

### Correctif minimal

- Donner à chaque bloc sa propre limite chargement/erreur/retry.
- Conserver les données déjà chargées et afficher un bandeau `Données partielles` au niveau de la page.
- N’interdire les actions que si leur dépendance directe est indisponible.
- Afficher la date de fraîcheur ou l’état stale lorsque React Query conserve une ancienne réponse.

### Non-objectifs

- Pas de nouvelle couche globale de micro-frontends.
- Pas de cache métier supplémentaire au frontend.
- Pas de faux fallback : une donnée absente reste `Indisponible`, jamais `0` ou `Conforme`.

### Preuve d’acceptation

- Échec simulé de `listAiUsageEvents` : fournisseurs, capacités et quotas restent lisibles, seul le bloc Journal est en erreur.
- Chaque bloc fautif possède un retry ciblé.
- L’état partiel est annoncé visuellement et dans l’arbre d’accessibilité.

## Décisions à obtenir avant une refonte métier

1. Quel intitulé transitoire remplace « Pilotage » tant que la page ne repose que sur des Activités ?
2. Les champs legacy `stage` et `amount` doivent-ils rester visibles en lecture seule jusqu’à la Brique Opportunités, ou être retirés immédiatement des parcours actifs ?
3. Les futurs responsables de Tâches peuvent-ils être choisis parmi les collègues, ou le MVP reste-t-il limité à « Moi » et « File d’agence » ? Le code actuel ne propose que ces deux options (`frontend/src/components/tasks/TaskCreateDialog.tsx:104-109`) alors que le détail permet d’ajouter des participants (`frontend/src/components/tasks/TaskDetailDialog.tsx:43-45`).
4. Quelles capacités IA seront réellement exposées aux TCS ? Le panneau actuel est une gouvernance admin ; il ne justifie pas à lui seul la création d’un assistant utilisateur générique.
