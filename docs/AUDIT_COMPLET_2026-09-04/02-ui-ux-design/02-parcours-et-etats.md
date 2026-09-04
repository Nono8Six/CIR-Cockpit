# Parcours, états, erreurs et protection des saisies

## Règle de lecture

Les états `chargement`, `vide`, `erreur`, `partiel`, `stale` et `données présentes` sont des états métier distincts. Un toast peut compléter un état local, mais il ne peut pas empêcher une table en erreur de se présenter ensuite comme vide. Cette règle découle directement de `PRODUCT.md:54-58` — rien ne disparaît en silence — et de `DESIGN.md:318-321` — les six états doivent être conçus avant livraison.

## UI-01 — Les vues masquées continuent à écouter le clavier

**Priorité : P0**

**Statut : [NAV] [CODE].**

### Constat

`AppMainTabContent` conserve toutes les vues visitées dans `KEEP_ALIVE_TABS`, les laisse montées puis applique seulement l’attribut HTML `hidden` à la section inactive (`frontend/src/components/app-main/AppMainTabContent.tsx:62-71`, `frontend/src/components/app-main/AppMainTabContent.tsx:104-155`). La navigation locale confirme qu’après avoir visité Cockpit puis Pilotage, les deux sections restent dans le DOM ; l’une est seulement masquée.

Les hooks de ces vues inscrivent pourtant des écouteurs globaux sur `window` sans connaître l’onglet actif :

- Cockpit écoute `Ctrl/Cmd+Entrée` pour soumettre, `Ctrl/Cmd+N` pour réinitialiser, F1/F2 pour focaliser et T/E/C/V pour changer le canal (`frontend/src/hooks/interactions/handlers/useInteractionHotkeys.ts:40-79`) ;
- trois composants du parcours guidé Cockpit écoutent aussi globalement le clavier, dont deux en phase de capture : `CockpitGuidedStepSwitch` et `CockpitSupplierLookup` peuvent avancer sur `Ctrl/Cmd+Entrée`, tandis que `CockpitGuidedDetailsQuestion` maintient un état visuel de touche (`frontend/src/components/cockpit/guided/CockpitGuidedStepSwitch.tsx:86-102`, `frontend/src/components/cockpit/guided/CockpitSupplierLookup.tsx:58-67`, `frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx:65-82`) ;
- Pilotage écoute `/`, les flèches, Entrée/O, Retour arrière et Suppr (`frontend/src/components/Dashboard.tsx:123-181`) ;
- le shell réserve F1 à F9 à la navigation (`frontend/src/app/appConstants.tsx:46-54`, `frontend/src/app/useAppShortcuts.ts:19-58`).

`hidden` retire la surface du rendu et de la navigation séquentielle, mais ne désabonne pas un listener `window`. F1 peut donc être traité à la fois par le shell et par un Cockpit masqué ; Ctrl+Entrée peut soumettre le formulaire Cockpit depuis Tâches ; Suppr peut préparer l’archivage d’une ligne Pilotage alors que l’utilisateur travaille ailleurs. Même lorsqu’une confirmation empêche l’écriture finale, l’effet de bord se produit dans un contexte invisible.

### Impact utilisateur

C’est le risque UI le plus grave : changement de vue inattendu, perte d’un brouillon après `Ctrl+N`, soumission d’une Activité cachée, focus envoyé dans un élément invisible ou apparition d’un dialog sans relation avec l’écran courant. Le comportement est intermittent car il dépend de l’ordre des onglets déjà visités.

### Correctif minimal

1. Propager un booléen explicite `isActive` aux vues conservées et à chaque hook de raccourcis.
2. Ne monter l’écouteur global que lorsque `isActive === true`; le désabonner dès le changement de route.
3. Ajouter `inert` aux sections inactives comme seconde défense pour le focus et les technologies d’assistance. `inert` ne remplace pas la désinscription des listeners.
4. Laisser F1–F9 au seul shell et retirer F1/F2 du hook Cockpit, où ces actions ne sont pas annoncées ; ne pas inventer de touches de remplacement.
5. Conserver le keep-alive tant que le PO n’a pas décidé si un brouillon Cockpit doit survivre à la navigation.

### Non-objectifs

- Ne pas supprimer toutes les optimisations de conservation d’état.
- Ne pas remplacer le routeur.
- Ne pas ajouter une librairie de raccourcis.
- Ne pas changer les combinaisons avant de mesurer leur utilité métier ; l’urgence porte sur leur isolation.

### Preuve d’acceptation

- Test d’intégration : visiter Cockpit, Pilotage puis Tâches ; `Ctrl+Entrée`, `Ctrl+N`, F1, F2, `/`, O, Retour arrière et Suppr ne déclenchent que l’action appartenant à la vue active.
- Les sections inactives portent `hidden` et `inert`, et aucun élément masqué ne reçoit le focus.
- Un compteur espion prouve qu’un seul gestionnaire métier traite chaque événement, y compris dans le parcours guidé Cockpit.
- Le brouillon Cockpit est soit conservé conformément à la décision produit, soit explicitement protégé avant démontage.

## UI-04 — L’annuaire invente un total implicite et une page suivante

**Priorité : P1**

**Statut : [NAV] [CODE].**

### Constat

La requête Clients fixe `includeTotal: false` (`frontend/src/components/client-directory/clientDirectorySearch.ts:156-173`). Le workspace attend néanmoins `directoryPageQuery.data?.total` pour afficher son badge ; en l’absence de total, il laisse un squelette avec `aria-busy` (`frontend/src/components/client-directory/useClientDirectoryWorkspace.ts:121-141`, `frontend/src/components/client-directory/ClientDirectoryWorkspace.tsx:83-99`).

La pagination choisit alors arbitrairement `totalPages = page + 1`, construit la plage jusqu’à `page * pageSize` et active la page suivante (`frontend/src/components/client-directory/data-table/DirectoryTablePagination.tsx:37-48`, `frontend/src/components/client-directory/data-table/DirectoryTablePagination.tsx:97-123`).

Le parcours local a rendu 4 lignes tout en affichant un squelette de nombre persistant, la plage `1-50` et une page 2 active. Ce n’est pas seulement un état de chargement long : le contrat demande expressément de ne pas calculer le total, donc cet état ne peut pas se résoudre.

### Impact utilisateur

L’utilisateur croit qu’il existe au moins 50 résultats et une autre page. En cliquant, il peut obtenir un écran vide et perdre confiance dans les filtres. Le lecteur d’écran entend indéfiniment « Nombre de résultats en cours de chargement ».

### Correctif minimal

Deux solutions simples sont acceptables :

- demander `includeTotal: true` pour l’annuaire Clients, comme le fait déjà le répertoire Fournisseurs (`frontend/src/components/admin-suppliers/supplierDirectorySearch.ts:135-152`) ;
- ou assumer une pagination sans total, mais uniquement si la réponse porte `has_more`, si la plage affiche le nombre réellement chargé et si aucun badge n’attend un total.

Au stade actuel et avec 12 000 clients, le total filtré côté serveur est la solution la plus lisible tant que sa requête reste mesurée. Ne jamais fabriquer une page supplémentaire pour compenser un contrat absent.

### Non-objectifs

- Pas de scroll infini.
- Pas de chargement des 12 000 clients côté navigateur.
- Pas de compteur approximatif présenté comme exact.

### Preuve d’acceptation

- Avec 4 résultats et une taille 50, l’écran affiche `1–4 / 4`, aucune page 2 et aucun squelette persistant.
- Avec 51 résultats, page 2 est active et affiche la plage réellement retournée.
- En cas d’échec du total, l’état est `Indisponible` ou une navigation `Suivant` fondée sur `has_more`, jamais `page + 1` par défaut.
- Test accessibilité : `aria-busy` repasse à `false` après la réponse.

## UI-05 — Plusieurs écrans confondent erreur et absence de données

**Priorité : P1**

**Statut : [CODE] ; reproduction mutante/non disponible pour chaque API : [À VALIDER].**

### Constat transversal

Le hook annuaire déclenche bien une notification d’erreur (`frontend/src/hooks/directory/core/useDirectoryPage.ts:8-19`), mais les workspaces convertissent ensuite l’absence de `data` en `[]` (`frontend/src/components/client-directory/useClientDirectoryWorkspace.ts:140-141`, `frontend/src/components/admin-suppliers/useSupplierDirectoryWorkspace.ts:121-132`). Les tables ne reçoivent pas `isError`; une fois `isInitialLoading` faux, `rows.length === 0` produit « Aucun résultat trouvé » ou « Aucun fournisseur trouvé » (`frontend/src/components/client-directory/ClientDirectoryTable.tsx:257-280`, `frontend/src/components/admin-suppliers/AdminSuppliersTable.tsx:299-322`).

Le même motif existe sur plusieurs surfaces :

- la fiche Tiers transmet `contactsQuery.data ?? []` sans transmettre l’erreur au composant Contacts (`frontend/src/components/client-directory/ClientDirectoryRecordDetails.tsx:117-132`, `frontend/src/components/client-directory/ClientDirectoryRecordDetails.tsx:370-388`) ; `EntityContactsPanelSection` n’accepte que `isContactsLoading` et affiche ensuite la liste vide et `0 contact(s)` (`frontend/src/components/entity-contact/EntityContactsPanelSection.tsx:7-16`, `frontend/src/components/entity-contact/EntityContactsPanelSection.tsx:28-62`) ;
- le panneau Tâches contextuel affiche d’abord `query.data?.total ?? 0`, puis seulement plus bas l’erreur (`frontend/src/components/tasks/TaskContextPanel.tsx:23-32`) ;
- les Référentiels passent `healthQuery.data?.health_report` au bandeau sans l’état d’erreur (`frontend/src/components/pricing-references/PricingReferencesPage.tsx:647-652`) ; le bandeau transforme tout rapport absent en 0 anomalie/0 compteur (`frontend/src/components/pricing-references/components/health/health-strip.tsx:82-119`) ;
- les tables Classification et Segments reçoivent `rows ?? []` et `total ?? 0` sans `isError` (`frontend/src/components/pricing-references/PricingReferencesPage.tsx:744-773`, `frontend/src/components/pricing-references/PricingReferencesPage.tsx:857-868`) ;
- Paramètres transforme une lecture usage absente en `null`, puis `IntegritySection` en tableau vide, 0 non résolu et badge « À jour » (`frontend/src/components/Settings.tsx:43-69`, `frontend/src/components/Settings.tsx:110-155`, `frontend/src/components/settings/integrity/IntegritySection.tsx:44-57`, `frontend/src/components/settings/integrity/IntegritySection.tsx:86-95`).

### Impact utilisateur

Une panne réseau devient « aucun client », « aucun contact », « zéro anomalie » ou « configuration à jour ». L’utilisateur peut prendre une décision ou lancer une correction en pensant que la donnée a été vérifiée. Le toast disparaît tandis que le faux état métier reste à l’écran.

### Correctif minimal

Adopter le même petit contrat de vue sur chaque bloc de données :

```text
loading | ready(data, fetchedAt) | empty | error(retry) | stale(data, error, fetchedAt)
```

Concrètement :

1. transmettre `isError`, `error`, `refetch` et `dataUpdatedAt` aux tables/panneaux qui reçoivent aujourd’hui seulement `[]` ;
2. afficher une erreur inline dans la zone concernée, avec Retry ;
3. si une ancienne donnée existe, la conserver mais ajouter un bandeau `Données non actualisées` et son horodatage ;
4. réserver `0`, `Aucun…` et `À jour` à une réponse serveur réussie ;
5. employer `—` lorsqu’une valeur est inconnue et non un zéro.

### Non-objectifs

- Pas de composant universel couvrant toutes les formes de page.
- Pas de modal bloquante globale pour une erreur locale.
- Pas de retry infini ni de masquage silencieux par cache.
- Pas de suppression des toasts ; ils restent un signal complémentaire.

### Preuve d’acceptation

- Pour chaque lecture ci-dessus, un test force une erreur et vérifie l’absence des libellés métier `Aucun`, `0` ou `À jour` dans la zone fautive.
- Le retry relance seulement la requête concernée.
- Une donnée stale reste visible avec un avertissement explicite et son horodatage.
- L’état d’erreur est annoncé par `role="alert"` ou une région nommée appropriée, sans déplacer brutalement le focus si le contenu précédent reste utilisable.

## UI-06 — Un brouillon Paramètres peut rester rattaché à l’ancienne agence

**Priorité : P1**

**Statut : [CODE] ; la politique UX de changement d’agence est [À VALIDER].**

### Constat

Le formulaire Paramètres est initialisé avec le snapshot et `agencyId`, mais son effet de synchronisation refuse tout `reset` si `formState.isDirty` (`frontend/src/hooks/settings-state/use-settings-form.ts:19-44`). Lorsqu’un `super_admin` change d’agence avec un brouillon en cours, le shell change de contexte mais le formulaire conserve donc les valeurs — y compris son ancien `values.agency_id`.

La sauvegarde envoie précisément `values.agency_id` (`frontend/src/hooks/settings-state/useSettingsState.ts:102-124`). En revanche, le hook de mutation est construit avec le nouvel `agencyId` de props et invalide les caches de ce nouveau contexte (`frontend/src/hooks/settings-state/use-settings-mutations.ts:15-34`). Le résultat possible est une écriture sur l’ancienne agence suivie d’un rafraîchissement visuel de la nouvelle, sans relation évidente entre les deux.

Le `beforeunload` ne protège que la fermeture de la page (`frontend/src/components/Settings.tsx:114-122`) ; il ne protège ni changement d’agence ni navigation interne.

### Impact utilisateur

Un administrateur peut modifier la mauvaise agence ou croire qu’une sauvegarde n’a pas fonctionné. C’est un risque de portée métier, pas une simple perte de formulaire.

### Correctif minimal

Intercepter tout changement d’agence lorsque Paramètres est dirty :

- proposer `Rester`, `Abandonner et changer`, et éventuellement `Enregistrer puis changer` seulement si la sauvegarde cible est incontestable ;
- après décision, réinitialiser le formulaire avec le snapshot de la nouvelle agence ;
- rendre le `agency_id` de sauvegarde identique à l’agence affichée et l’afficher dans la confirmation/action bar ;
- invalider les caches à partir de l’agence réellement écrite, pas d’une closure devenue obsolète.

Pour le POC, `Rester` + `Abandonner et changer` est suffisant et réduit le risque. « Enregistrer puis changer » peut attendre.

### Non-objectifs

- Pas de fusion de deux brouillons d’agences.
- Pas de sauvegarde automatique.
- Pas de stockage local multi-agence.

### Preuve d’acceptation

- Test : modifier Agence A, demander Agence B, choisir Rester ; l’agence et le brouillon A restent intacts.
- Test : choisir Abandonner ; le formulaire B porte `agency_id=B` et les valeurs du snapshot B.
- Une mutation ne peut jamais écrire A pendant que l’en-tête affirme B sans avertissement explicite.
- L’invalidation vise l’identifiant contenu dans le payload confirmé.

## UI-08 — Les dialogs Tâches peuvent réutiliser un état précédent

**Priorité : P1**

**Statut : [CODE].**

### Constat

`TaskCreateDialog` conserve titre, type, date, mode avancé, description, heure, priorité, visibilité, affectation et erreur dans des `useState` locaux (`frontend/src/components/tasks/TaskCreateDialog.tsx:30-42`). Ces champs ne sont réinitialisés qu’après une création réussie (`frontend/src/components/tasks/TaskCreateDialog.tsx:44-62`). Une annulation ferme directement le dialog (`frontend/src/components/tasks/TaskCreateDialog.tsx:68-69`, `frontend/src/components/tasks/TaskCreateDialog.tsx:112-116`) : à la réouverture, la saisie précédente revient, y compris si le contexte Organisation/Contact a changé.

`TaskDetailDialog` conserve de même note, participant, rôle et erreur entre deux `taskId` (`frontend/src/components/tasks/TaskDetailDialog.tsx:16-24`, `frontend/src/components/tasks/TaskDetailDialog.tsx:33-49`).

Enfin `TaskActionDialog` reste monté même lorsque `action` vaut `null`. Ses champs `date`, `reason`, `occurredAt`, `channel`, `activityType`, `subject`, `report` sont initialisés une seule fois puis réutilisés (`frontend/src/components/tasks/TasksPage.tsx:93-103`). Une annulation ou un succès n’efface rien avant la prochaine tâche.

### Impact utilisateur

Une note, un motif de report ou un compte rendu destiné à la tâche A peut apparaître sur la tâche B. Un contexte Tiers précédent peut contaminer une nouvelle création. L’utilisateur peut enregistrer une donnée correcte en apparence mais sur le mauvais objet.

### Correctif minimal

- Réinitialiser le formulaire à chaque transition `closed → open` et à chaque changement d’identifiant/contexte.
- Donner aux dialogs de détail/action une `key` fondée sur `taskId`/`action.task.id` si cela simplifie le remount.
- Passer toute fermeture par une fonction unique qui applique la politique de brouillon : confirmation si dirty, reset si abandon confirmé.
- Recalculer la date/heure par défaut à l’ouverture, pas au premier montage de la page.

### Non-objectifs

- Pas de conservation de brouillon multi-tâche.
- Pas d’autosave.
- Pas de refonte du modèle Tâches.

### Preuve d’acceptation

- Ouvrir tâche A, saisir une note, annuler, ouvrir tâche B : aucun champ A n’est visible.
- Annuler une création puis rouvrir dans un autre Tiers : le contexte et les valeurs correspondent uniquement au nouveau Tiers.
- Après succès, erreur et abandon confirmé, l’état est déterministe et couvert par tests.

## UI-18 — La copie presse-papiers peut annoncer un faux succès

**Priorité : P2**

**Statut : [CODE].**

### Constat

Plusieurs composants lancent `navigator.clipboard.writeText(...)` sans attendre la promesse, puis affichent immédiatement l’état « copié » :

- détail d’un événement IA (`frontend/src/components/admin-ai/AiUsageEventDialog.tsx:57-69`) ;
- escalier de classification (`frontend/src/components/pricing-references/components/classification/classification-drilldown.tsx:198-205`) ;
- détail d’import (`frontend/src/components/pricing-references/components/imports/import-detail-dialog.tsx:214-223`).

L’API peut refuser l’accès selon le contexte sécurisé, les permissions ou le presse-papiers du poste. Dans ce cas, le feedback succès est faux et la rejection peut rester non gérée.

### Impact utilisateur

L’administrateur colle ensuite une ancienne valeur en pensant avoir copié un identifiant ou une preuve récente. Sur un journal IA ou un import, cela peut fausser un diagnostic.

### Correctif minimal

Créer une petite fonction partagée `copyText` qui :

- `await` la promesse ;
- retourne un résultat typé succès/erreur ;
- n’affiche « Copié » qu’après résolution ;
- fournit une erreur courte et une sélection manuelle de repli si la copie échoue.

### Non-objectifs

- Pas de bibliothèque presse-papiers.
- Pas de stockage du contenu copié.
- Pas de toast global obligatoire si un retour inline suffit.

### Preuve d’acceptation

- Mock résolution : état « Copié » visible deux secondes.
- Mock rejet : aucun faux succès, message `Copie impossible` et contenu toujours sélectionnable.
- Aucune rejection non gérée dans la console.

## UI-19 — Toutes les fermetures de l’assistant d’import ne réinitialisent pas le même état

**Priorité : P2**

**Statut : [CODE].**

### Constat

L’assistant définit correctement `resetState` et `closeAndReset` (`frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:409-428`). La fermeture émise par le composant `Dialog` passe aussi par un handler qui reset quand l’opération n’est pas busy (`frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:569-591`).

Mais le bouton « Annuler » de la première étape appelle directement le callback parent `onOpenChange(false)` (`frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:652-660`). Cet appel ne traverse pas le handler `Dialog` défini plus bas et ne déclenche donc pas `resetState`. À la réouverture, le fichier ou des préférences peuvent survivre de façon différente selon le moyen de fermeture. Les écrans de fin utilisent, eux, `closeAndReset` (`frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:915-933`).

### Impact utilisateur

Le comportement dépend du bouton choisi. Un fichier abandonné peut réapparaître et être prévisualisé par erreur ; à l’inverse, une préférence utile peut être perdue par une autre fermeture. Cette incohérence est particulièrement risquée dans un parcours d’import versionné.

### Correctif minimal

- Remplacer tous les appels directs de fermeture par `requestClose`/`closeAndReset`.
- Pendant `isBusy`, bloquer Échap, overlay, croix et boutons de fermeture de la même manière.
- Définir explicitement le seul état volontairement persistant (`saveAsDefault` semble l’être à `frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:409-418`).
- Si un fichier inspecté constitue un brouillon coûteux, confirmer l’abandon ; sinon reset direct.

### Non-objectifs

- Pas de reprise d’import après redémarrage.
- Pas de persistance du fichier dans le navigateur.
- Pas de changement du pipeline backend d’import.

### Preuve d’acceptation

- Annuler, Échap, overlay et Fermer aboutissent au même état défini.
- Fermer pendant une mutation n’est pas possible.
- Réouvrir après abandon repart sur l’étape Fichier, sans fichier ni résultat précédent, tout en conservant seulement la préférence explicitement décidée.
