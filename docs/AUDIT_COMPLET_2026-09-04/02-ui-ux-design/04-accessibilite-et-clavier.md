# Accessibilité, clavier et vérité des affordances

## Position

Le produit n’annonce pas un niveau WCAG contractuel, mais il verrouille déjà quatre pratiques : mouvement réduit, contraste d’alerte, focus visible, parcours clavier et plancher de 11 px (`PRODUCT.md:60-70`). L’audit ne propose donc pas un programme de certification. Il relève les régressions concrètes qui empêchent un usage fiable au clavier ou rendent un contrôle ambigu.

Le P0 des raccourcis globaux est détaillé dans [Parcours et états — UI-01](./02-parcours-et-etats.md#ui-01--les-vues-masquées-continuent-à-écouter-le-clavier).

## UI-15 — Le plancher typographique de 11 px n’est pas respecté

**Priorité : P2**

**Statut : [CODE].**

### Constat

Le scan hors tests recense exactement **221 occurrences de `text-[10px]` dans 75 fichiers**. La règle est pourtant explicite : 11 px minimum (`PRODUCT.md:68`, `DESIGN.md:164-168`, `DESIGN.md:318-336`).

La dette n’est pas seulement décorative. Elle touche notamment :

- le primitif `Kbd`, donc tous les raccourcis qui le réutilisent (`frontend/src/components/ui/data-display/Kbd.tsx:7-15`) ;
- les labels et erreurs des formulaires Client (`frontend/src/components/client-form/ClientFormIdentitySection.tsx:20-53` et composants frères) ;
- les titres de sections Contacts et Propriétés (`frontend/src/components/entity-contact/EntityContactsPanelSection.tsx:28-35`, `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:48-53`) ;
- les KPI Paramètres (`frontend/src/components/settings/integrity/IntegritySection.tsx:86-95`) ;
- l’inspecteur d’intégrité (`frontend/src/components/settings/integrity/IntegrityInteractionsSheet.tsx:124-142`) ;
- les badges de rôle du shell (`frontend/src/components/AppLayout.tsx:90-107`, `frontend/src/components/AppHeader.tsx:168-176`).

`DESIGN.md:301` identifie déjà `Kbd` comme dette ; `DESIGN.md:336` annonce 239 occurrences, compteur désormais périmé mais problème toujours massif.

### Impact utilisateur

Sur un poste fixe utilisé huit heures, 10 px réduit la lecture rapide des labels, erreurs et raccourcis. Ce sont souvent les informations secondaires qui permettent pourtant de comprendre la portée ou la cause d’un état. L’utilisateur augmente le zoom, perd de la densité et contourne l’objectif du produit.

### Correctif minimal

1. Corriger d’abord `Kbd` et les primitives/composants partagés : `text-[11px]`, graisse et interlettrage ajustés sans augmenter inutilement la hauteur.
2. Corriger ensuite les informations métier critiques : erreurs, labels de champs, compteurs et états.
3. Migrer les occurrences restantes au fil des lots d’écran, avec un check statique interdisant toute nouvelle occurrence hors allowlist temporaire datée.
4. Mettre à jour le compteur de `DESIGN.md` automatiquement ou supprimer le nombre exact si sa maintenance n’est pas assurée.

### Non-objectifs

- Pas de passage uniforme à 14 ou 16 px : la densité reste une exigence produit.
- Pas de zoom CSS global.
- Pas de remplacement automatique sans inspection des hauteurs de ligne et conteneurs.

### Preuve d’acceptation

- Zéro nouvelle occurrence `text-[10px]`.
- `Kbd`, labels, erreurs et compteurs critiques sont à 11 px minimum dans le style calculé.
- Captures à zoom 100 % et 200 % : aucune troncature introduite sur le shell, les tables et dialogs corrigés.
- Le compteur de dette diminue à chaque lot et le fichier de design ne porte plus un chiffre faux.

## UI-16 — Certaines affordances et focus ne disent pas la vérité

**Priorité : P2**

**Statut : [CODE].**

### Constat A — lignes qui ressemblent à des contrôles mais ne font rien

Dans la fiche Tiers, les lignes Statut, Type de fiche, N° client, Agence, Commercial, Département, Pays et dates portent `cursor-pointer`, hover, transitions et styles `group-hover`, mais sont de simples `<div>` sans `onClick`, rôle ou tabulation (`frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:55-153`, `frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:157-165`).

La légende Cockpit présente également `? Aide` dans un bloc visuellement assimilable à un contrôle, mais il s’agit d’un `<span>` sans action ; aucun gestionnaire `?` n’est associé (`frontend/src/components/cockpit/CockpitShortcutLegend.tsx:27-43`).

### Constat B — focus canonique supprimé

Les champs Client imposent `focus:!ring-0` puis un simple changement de bordure neutre (`frontend/src/components/client-form/ClientFormIdentitySection.tsx:27-50`, motif répété dans les autres sections). Cela neutralise le focus `ring-2` garanti par la primitive et par `DESIGN.md:289-296`. `transition-all` anime en outre des propriétés non contrôlées.

### Impact utilisateur

À la souris, l’utilisateur tente de cliquer des propriétés qui semblent éditables/copieuses. Au clavier, il ne peut pas les atteindre — comportement contradictoire mais techniquement cohérent puisque ce ne sont pas des contrôles. Sur les vrais champs, le focus devient trop discret pour une navigation rapide.

### Correctif minimal

- Pour une propriété statique : retirer curseur, hover interactif et transition.
- Pour une propriété copiable : utiliser un vrai `<button>` avec libellé accessible et retour de copie.
- Pour une propriété éditable : utiliser le bouton ou lien qui ouvre l’édition, avec action explicite « Modifier ».
- Transformer `? Aide` en vrai bouton ouvrant une aide existante, ou le retirer tant qu’aucune aide n’existe.
- Supprimer les overrides `ring-0` dans les formulaires Client et laisser la primitive afficher le focus ; si le champ fusionné exige un style local, appliquer un `focus-within` au conteneur qui reste au moins aussi visible.

### Non-objectifs

- Pas de transformation de toutes les propriétés en édition inline.
- Pas d’effet hover sur les données purement statiques.
- Pas de nouveau centre d’aide si aucun contenu métier n’est prêt.

### Preuve d’acceptation

- Tout élément avec `cursor-pointer` est focalisable et possède une action réelle ; toute donnée statique a un curseur normal.
- Tabulation visible sur chaque champ Client aux zooms 100 % et 200 %.
- Le bouton Aide agit au clic et au clavier, ou n’est plus rendu comme un contrôle.
- Tests clavier : Tab/Shift+Tab/Entrée/Espace et retour de focus après Dialog.

## UI-17 — Les repères accessibles restent incomplets sur quelques surfaces

**Priorité : P2**

**Statut : [NAV] [CODE].**

### Constat A — actions Tâches nommées seulement par `title`

Dans chaque ligne Tâches, « Commencer », « Terminer » et « Reporter » sont des boutons icône dont le seul texte est l’attribut `title` (`frontend/src/components/tasks/TasksPage.tsx:79-85`). Un `title` dépend du navigateur et n’est pas un libellé robuste. Les actions voisines « Prendre » et « Ouvrir » ont, elles, un texte visible.

### Constat B — association des erreurs de formulaire inégale

Le Login constitue un bon exemple : labels, `name`, `autocomplete`, `aria-invalid` et `aria-describedby` sont présents (`frontend/src/components/login/LoginScreenForm.tsx:51-103`). À l’inverse, plusieurs erreurs Client sont seulement rendues sous le champ avec une taille 10 px, sans identifiant ni `aria-describedby` (`frontend/src/components/client-form/ClientFormIdentitySection.tsx:27-53`). Les messages Cockpit utilisent parfois `role="status"` mais l’association au champ n’est pas uniforme (`frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx:250-259`, `frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx:283-300`).

### Impact utilisateur

Un lecteur d’écran peut annoncer « bouton » sans action identifiable et ne pas relier une erreur au champ concerné. Pour un utilisateur clavier, un message global sans focus ni relation explicite oblige à rechercher le champ fautif.

### Correctif minimal

1. Donner à chaque bouton icône un `aria-label` contextualisé, par exemple `Terminer — Préparer le rendez-vous`, et laisser `title` comme aide visuelle facultative.
2. Chaque champ invalide porte `aria-invalid`, `aria-describedby=<error-id>` et un message identifié. Après soumission invalide, focaliser le premier champ fautif.
3. Ne pas marquer tous les champs invalides pour une erreur qui n’en concerne qu’un.

### Non-objectifs

- Pas de certification WCAG complète.
- Pas d’ajout d’ARIA là où HTML natif suffit.
- Pas de lecture vocale de chaque mise à jour de table.

### Preuve d’acceptation

- Les boutons icône ont un nom unique et compréhensible sans `title`.
- Axe/Vitest sur Tâches, Cockpit et formulaire Client sans violation de nom/association introduite.
- Soumission invalide : le premier champ fautif reçoit le focus et son erreur est annoncée une seule fois.

## UI-23 — Plusieurs landmarks principaux sont imbriqués

**Priorité : P2**

**Statut : [NAV] [CODE].**

### Constat

Le shell fournit déjà le landmark principal `main#main-content` (`frontend/src/components/AppMainContent.tsx:27-38`). La vue Cockpit en ajoute un autre à l’intérieur (`frontend/src/components/cockpit/guided/CockpitGuidedEntry.tsx:247-262`) ; le parcours navigateur a confirmé deux landmarks `main` simultanés. Le wizard Tiers réutilisé en surface page ajoute également un `<main>` (`frontend/src/components/entity-record-wizard/EntityRecordWizardShell.tsx:55-75`) susceptible d’être imbriqué sous celui du shell.

### Impact utilisateur

Un lecteur d’écran rencontre plusieurs régions « principal » dont une est contenue dans l’autre. La navigation par landmarks ne permet plus d’identifier sans ambiguïté le contenu principal de la page.

### Correctif minimal

Garder un seul `<main>` par document : celui du shell. Les vues internes deviennent `<div>` ou `<section aria-labelledby=…>`. Si `EntityRecordWizardShell` doit aussi fonctionner hors shell, lui donner une prop locale `as: 'main' | 'div'`, avec `div` par défaut dans CIR Cockpit.

### Non-objectifs

- Pas de composant polymorphe global.
- Pas de multiplication de rôles ARIA redondants.
- Pas de changement du layout ou du scroll.

### Preuve d’acceptation

- Arbre d’accessibilité : exactement un landmark principal sur Cockpit, onboarding page et toutes les routes du shell.
- Chaque grande section interne possède un titre ou un `aria-label` utile si elle doit être atteinte comme région.
- Le lien « Passer au contenu » continue de cibler `#main-content`.

## Contrôles clavier à conserver

- Ctrl/Cmd+K pour la palette globale, déclaré par `aria-keyshortcuts` (`frontend/src/app/appConstants.tsx:57-58`, `frontend/src/components/app-header/AppHeaderSearchButton.tsx:25-58`).
- Tab, Échap et Entrée via les primitives Radix.
- Navigation explicite des tables lorsque sa légende est visible (`frontend/src/components/dashboard/overview/DashboardDossiersTable.tsx:276-296`).
- Bloc `prefers-reduced-motion` et skeleton figé, qui préservent l’information (`PRODUCT.md:62-68`, `DESIGN.md:305-307`).

Ces acquis ne justifient pas d’ajouter davantage de raccourcis globaux. Chaque nouveau raccourci doit avoir un propriétaire actif, un libellé visible et un test inter-route.
