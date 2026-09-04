# Refactorings frontend ciblés et séquence d’exécution

## Doctrine

Un refactoring est retenu ici seulement s’il supprime plusieurs défauts prouvés ou protège un invariant métier. La longueur d’un fichier, à elle seule, n’est pas une raison suffisante. Aucun lot ne doit introduire une nouvelle dépendance, un framework interne ou une couche de compatibilité.

## UI-R01 — Contrat d’activation unique pour les vues conservées

**Priorité : P0**

**Statut : [NAV] [CODE].**

### Constat

Le shell connaît la vue active mais les composants keep-alive ne reçoivent pas cette information (`frontend/src/components/app-main/AppMainTabContent.tsx:115-155`). Cockpit et Pilotage s’abonnent directement à `window` (`frontend/src/hooks/interactions/handlers/useInteractionHotkeys.ts:40-79`, `frontend/src/components/Dashboard.tsx:123-181`), tandis que la navigation globale possède encore son propre listener (`frontend/src/app/useAppShortcuts.ts:19-58`). Le résultat est UI-01 : plusieurs propriétaires actifs pour un même événement.

### Correctif minimal

Créer un contrat local, par exemple :

```ts
type ActiveSurface = {
  isActive: boolean;
};
```

Le passer à Cockpit, Pilotage et tout composant keep-alive qui inscrit un effet global. Chaque `useEffect` retourne immédiatement sans abonnement lorsque la surface est inactive. Le shell reste propriétaire de Ctrl/Cmd+K, Ctrl/Cmd+B et F1–F9 ; une surface métier ne possède que ses raccourcis locaux lorsque active.

Ajouter `inert` à la section inactive dans `AppMainTabContent`, sans compter sur lui pour neutraliser les listeners `window`.

### Non-objectifs

- Pas de context global de raccourcis.
- Pas de librairie hotkey.
- Pas de suppression du keep-alive avant décision sur la persistance des brouillons.

### Preuve d’acceptation

- Matrice ciblée de tests cross-route définie dans UI-01.
- Un seul listener métier actif par combinaison.
- Aucun changement de comportement sur la vue effectivement active.

## UI-R02 — État asynchrone discriminé au bord de chaque bloc

**Priorité : P1**

**Statut : [CODE].**

### Constat

Les fallbacks `data?.rows ?? []`, `data?.total ?? 0` et `report?.… ?? 0` font perdre l’information d’erreur avant le rendu (`frontend/src/components/client-directory/useClientDirectoryWorkspace.ts:121-141`, `frontend/src/components/pricing-references/PricingReferencesPage.tsx:744-773`, `frontend/src/components/pricing-references/components/health/health-strip.tsx:82-119`). La même omission se répète pour les contacts et l’intégrité.

### Correctif minimal

Ne pas créer un « composant universel de page ». Ajouter un petit type utilitaire pur au niveau des hooks :

```ts
type Loadable<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T; updatedAt: number }
  | { kind: 'stale'; data: T; updatedAt: number; error: AppError }
  | { kind: 'error'; error: AppError };
```

Chaque hook adapte React Query une seule fois ; le composant de bloc rend ensuite explicitement les quatre branches. L’état `empty` est dérivé uniquement de `ready.data`.

### Non-objectifs

- Pas de remplacement de React Query.
- Pas de store d’erreurs parallèle.
- Pas d’uniformisation visuelle forcée entre une table, un KPI et un panneau.

### Preuve d’acceptation

- TypeScript empêche le rendu de `rows` sans avoir traité `error/loading`.
- Les tests UI-05 couvrent annuaire, contacts, Référentiels et intégrité.
- Une donnée stale garde son horodatage et ne devient jamais un zéro.

## UI-R03 — Garde de fermeture commune pour les surfaces dirty

**Priorité : P1**

**Statut : [CODE].**

### Constat

Paramètres ne protège que `beforeunload` (`frontend/src/components/Settings.tsx:114-122`), Prompt Studio calcule `hasUnsavedChanges` sans l’utiliser à la fermeture (`frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:88-117`, `frontend/src/components/admin-ai/AiPromptEditorDialog.tsx:387-390`), les dialogs Tâches gardent des états à travers plusieurs ouvertures (`frontend/src/components/tasks/TaskCreateDialog.tsx:30-69`, `frontend/src/components/tasks/TasksPage.tsx:93-103`) et l’import possède deux chemins de fermeture différents (`frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:409-428`, `frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:584-590`, `frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx:652-660`).

### Correctif minimal

Extraire un hook étroit `useDiscardGuard` qui ne connaît ni route ni formulaire :

- entrée : `isDirty`, `isBusy`, callback `onDiscard` ;
- sortie : `requestClose`, état du ConfirmDialog, `confirmDiscard`, `cancelDiscard` ;
- aucune persistance ni autosave.

Chaque surface reste responsable de son reset. Paramètres ajoute un adaptateur spécifique pour la demande de changement d’agence, puisque la cible d’agence fait partie de la décision.

### Non-objectifs

- Pas de machine à états générale.
- Pas de brouillon global.
- Pas de dialogue imbriqué pour une fermeture sans modification.

### Preuve d’acceptation

- Les scénarios UI-06, UI-08, UI-09 et UI-19 utilisent la même sémantique `request/confirm/cancel`.
- Aucune surface ne peut être fermée pendant une mutation si cette fermeture masque son résultat.
- La fonction `onDiscard` est appelée exactement une fois.

## UI-R04 — Horloge de date civile unique

**Priorité : P1**

**Statut : [CODE].**

### Constat

Trois implémentations Tâches produisent des dates par `toISOString().slice(...)` et à des moments de cycle de vie différents (`frontend/src/components/tasks/TasksPage.tsx:23-27`, `frontend/src/components/tasks/TaskCreateDialog.tsx:28-35`, `frontend/src/components/tasks/TasksPage.tsx:97-103`). Le contrat de fuseau est déjà `Europe/Paris`/agence (`docs/PLAN/plan-brique-3-taches-relances.md:237-246`).

### Correctif minimal

Créer deux fonctions pures partagées :

- `formatCivilDate(instant, timeZone): YYYY-MM-DD` ;
- `formatLocalDateTimeInput(instant, timeZone): YYYY-MM-DDTHH:mm`.

Le hook de page reçoit la date serveur de référence, planifie seulement un rafraîchissement au prochain changement de jour local et laisse le backend fournir `is_overdue`.

### Non-objectifs

- Pas de dépendance date supplémentaire.
- Pas de conversion implicite d’une date civile en instant UTC.

### Preuve d’acceptation

- Tests de frontières listés dans UI-07.
- Plus aucun `toISOString().slice(0, 10)` dans le code de date civile métier.
- Même date affichée/filtrée côté client et serveur.

## UI-R05 — Ligne de propriété Tiers honnête et tokenisée

**Priorité : P2**

**Statut : [CODE].**

### Constat

`ClientDirectoryRecordInfoGrid` répète une dizaine de fois le même assemblage classes/label/valeur, avec `cursor-pointer` sur des lignes sans action et une palette `neutral-*` locale (`frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:48-167`). Les formulaires Client répètent le même bloc label/Input/error et les mêmes overrides dans sept fichiers, par exemple `frontend/src/components/client-form/ClientFormIdentitySection.tsx:20-53`.

### Correctif minimal

Créer uniquement deux composants locaux au domaine Tiers :

- `RecordPropertyRow`, avec `label`, `value`, `variant: static | action | copy` et action obligatoire pour les variants interactifs ;
- `ClientFormField`, qui relie label, champ et erreur tout en laissant le layout à la section.

Ces composants consomment les primitives/tokens existants et ne connaissent ni la mutation ni le schéma métier.

### Non-objectifs

- Pas de générateur de formulaire depuis un schéma.
- Pas de composant générique pour tous les domaines.
- Pas d’édition inline automatique.

### Preuve d’acceptation

- Suppression des répétitions de classes et des `!important` sur les sections migrées.
- Les variants interactifs exigent une action au typecheck.
- Labels, erreurs et focus respectent UI-15 à UI-17.

## UI-R06 — Recherche serveur bornée et résultats légers

**Priorité : P2 avant import massif**

**Statut : [CODE].**

### Constat

`getEntitySearchIndex` charge toutes les entités puis tous leurs contacts (`backend/src/services/entities/core/dataEntitiesList.ts:94-142`) et `useAppQueries` active cette lecture sur Cockpit/Clients/recherche (`frontend/src/hooks/session/useAppQueries.ts:32-60`). Ce choix ne tient pas les 12 000 clients ciblés par `PRODUCT.md:21-24`.

### Correctif minimal

Réutiliser la recherche annuaire serveur avec une projection suggestion : identifiant, nom, type, numéro, ville, contact principal et champs nécessaires au libellé. Limite courte, debounce et annulation de la requête précédente. Conserver un petit tableau de récents issu des données déjà disponibles.

### Non-objectifs

- Pas de moteur de recherche externe.
- Pas de synchronisation locale complète.
- Pas de préchargement catalogue.

### Preuve d’acceptation

- Critères et mesures UI-13.
- Payload et limite vérifiés par contrat partagé.
- Résultat obsolète d’une requête lente ne remplace pas la requête la plus récente.

## UI-R07 — Copier une valeur avec résultat explicite

**Priorité : P2**

**Statut : [CODE].**

### Constat

Trois composants dupliquent l’appel non attendu à `navigator.clipboard.writeText`, le timer de deux secondes et l’état `copiedKey` (`frontend/src/components/admin-ai/AiUsageEventDialog.tsx:57-69`, `frontend/src/components/pricing-references/components/classification/classification-drilldown.tsx:198-205`, `frontend/src/components/pricing-references/components/imports/import-detail-dialog.tsx:214-223`).

### Correctif minimal

Extraire une fonction asynchrone `copyText` et, si le timer se répète encore, un hook `useCopyFeedback`. Le hook doit nettoyer son timer au démontage et distinguer `idle/copying/copied/error`.

### Non-objectifs

- Pas de service global de presse-papiers.
- Pas de journalisation du texte copié.

### Preuve d’acceptation

- Les trois consommateurs partagent la gestion succès/échec de UI-18.
- Aucun timer ne met à jour un composant démonté.

## UI-R08 — Découper seulement les composants qui mélangent orchestration et édition

**Priorité : P2**

**Statut : [CODE] ; ordre exact [À VALIDER] après les correctifs fonctionnels.**

### Constat

L’inventaire hors tests trouve dix modules frontend de plus de 500 lignes. Les plus grands sont :

- `frontend/src/components/client-directory/edit/EntityEditPanel.tsx` — 1 358 lignes ;
- `frontend/src/components/pricing-references/PricingReferencesPage.tsx` — 1 000 lignes ;
- `frontend/src/components/admin-ai/AiRightsBudgetsView.tsx` — 921 lignes ;
- `frontend/src/components/admin-ai/AiCapabilitiesView.tsx` — 912 lignes ;
- `frontend/src/components/pricing-references/pricing-reference-import-dialog.tsx` — 900 lignes ;
- `frontend/src/components/entity-onboarding/EntityOnboardingSearchStep.tsx` — 876 lignes.

La taille seule ne justifie rien. En revanche ces fichiers associent plusieurs responsabilités observables : requêtes/mutations, état de formulaire, dérivation métier, confirmation, layout et sous-vues. C’est ce mélange qui rend les états d’erreur ou fermeture difficiles à traiter de façon exhaustive.

### Correctif minimal

Découper lors du correctif fonctionnel, selon des frontières déjà présentes :

- `EntityEditPanel` : contrôleur formulaire/guard, contenu principal, résumé latéral ;
- `PricingReferencesPage` : état de route/filtres dans un hook, un composant par onglet ;
- `AiRightsBudgetsView` et `AiCapabilitiesView` : un bloc requête/rendu par capacité, politique ou fournisseur, conformément à UI-20 ;
- assistant import : contrôleur des étapes et composants d’étape, en conservant une seule mutation/orchestration ;
- recherche onboarding : formulaire, résultats et sélection, sans dupliquer les contrats de recherche.

### Non-objectifs

- Pas de seuil automatique « 500 lignes = découper ».
- Pas d’extraction de chaque fragment JSX dans un fichier.
- Pas de hook abstrait mélangeant des domaines différents.
- Pas de refactoring préalable sans test protégeant le comportement concerné.

### Preuve d’acceptation

- Le composant parent lit comme l’orchestration du parcours, sans logique de champ ni markup répétitif massif.
- Les tests existants restent au niveau du comportement public ; seuls les calculs purs méritent des tests unitaires nouveaux.
- Le nombre de fichiers augmente uniquement lorsqu’une responsabilité testable et nommable est extraite.

## Séquence sans sur-engineering

1. **UI-R01** seul, avec tests cross-route ; c’est le hard stop.
2. **UI-R03 + UI-R04** dans les surfaces Tâches/Paramètres/Prompt/import concernées.
3. **UI-R02** d’abord sur Clients et Référentiels, puis sur les autres erreurs prouvées.
4. **UI-R05 + correction Design** sur Login et Tiers, sans toucher aux autres écrans.
5. **UI-R06** juste avant l’import des 12 000 clients, avec mesure réelle.
6. **UI-R07** comme petit nettoyage transversal.
7. **UI-R08** uniquement à l’intérieur des lots précédents ; jamais comme chantier autonome de « propreté ».
