# Design system, cohérence visuelle et rédactionnelle

## Diagnostic

Le design system n’est pas absent : il est documenté, tokenisé et déjà suivi par une grande partie du shell et des écrans récents. La dette vient surtout de quelques familles anciennes ou refondues isolément qui contournent les primitives. Il faut donc corriger les sources de propagation, pas relancer un chantier de redesign global.

Le référentiel cible est sans ambiguïté : palette chaude, élévation par surfaces, une seule ombre autorisée, aucun gris froid, dialogs centrés, 11 px minimum et six états (`DESIGN.md:164-181`, `DESIGN.md:213-219`, `DESIGN.md:260-339`).

## UI-10 — Les Sheets latéraux contredisent la règle de Dialog centré

**Priorité : P1**

**Statut : [CODE] ; l’exception éventuelle des filtres mobiles est [À VALIDER].**

### Constat

`DESIGN.md:298-303` et `DESIGN.md:319-332` interdisent explicitement les Sheets/drawers latéraux droits et demandent un Dialog centré pour tout détail ou toute édition. Pourtant plusieurs parcours actifs reposent encore sur ce pattern :

- panneau « Mon compte » dans le shell (`frontend/src/components/AppLayout.tsx:186-245`) ;
- édition de Tiers, jusqu’à 1180 px de large (`frontend/src/components/client-directory/edit/EntityEditPanel.tsx:661-700`) ;
- onboarding/création d’entreprise, jusqu’à 1240 px (`frontend/src/components/EntityOnboardingDialog.tsx:542-559`) ;
- filtres mobiles de l’annuaire (`frontend/src/components/client-directory/DirectoryMobileFilterSheet.tsx:50-169`) ;
- inspecteur d’intégrité et corrections d’Activités (`frontend/src/components/settings/integrity/IntegritySection.tsx:98-110`, `frontend/src/components/settings/integrity/IntegrityInteractionsSheet.tsx:105-154`).

Les deux plus grands Sheets reproduisent presque une page complète glissant depuis la droite, avec overlay flouté et `shadow-2xl`. Ils ne sont ni un détail léger, ni une exception discrète. Ils contredisent aussi la stratégie d’élévation par surface et filet.

### Impact utilisateur

Le comportement de navigation varie selon l’objet : certaines éditions sont des pages, d’autres des dialogs, d’autres encore des pages déguisées en drawer. Les larges panneaux réduisent la perception du contexte, compliquent le focus et rendent l’historique navigateur peu prévisible. Sur poste fixe, un Sheet de 1240 px ne procure aucun gain par rapport à une page ou un Dialog correctement dimensionné.

### Correctif minimal

1. Convertir « Mon compte » et l’inspecteur d’intégrité en Dialog centré existant.
2. Pour création/édition de Tiers, choisir la surface déjà prévue par le composant (`surface="page"` existe dans `EntityOnboardingDialog`) lorsque le contenu constitue un vrai espace de travail ; réserver le Dialog centré aux formulaires plus courts.
3. Remplacer le filtre mobile par un Dialog responsive centré/maximisé sur petit écran, ou documenter explicitement une exception produit si le PO maintient le panneau latéral. La règle actuelle ne permet pas de conserver silencieusement l’écart.
4. Supprimer les ombres/blur spécifiques au passage, en s’appuyant sur `Dialog`, `CardSection` et les tokens existants.

### Non-objectifs

- Pas de nouveau système de modales.
- Pas de navigation imbriquée complexe.
- Pas de réécriture métier des formulaires.
- Pas de suppression du composant `Sheet` avant migration de tous ses consommateurs prouvés.

### Preuve d’acceptation

- Aucun parcours actif de détail/édition n’ouvre un drawer droit, sauf exception écrite et validée dans `DESIGN.md`.
- Le focus initial, Échap, retour de focus et scroll interne sont testés sur chaque surface migrée.
- À 1440 × 900 et 390 × 844, le contenu reste entièrement accessible sans débordement documentaire.
- Les tests ne recherchent plus `role=dialog` dans un panneau visuellement latéral contraire au contrat.

## UI-14 — Deux familles d’écrans contournent le design system

**Priorité : P1**

**Statut : [NAV] [CODE].**

### Constat

L’inventaire hors tests trouve 221 occurrences exactes de `text-[10px]` dans 75 fichiers, 89 usages de `transition-all` dans 34 fichiers, 224 occurrences de couleurs Tailwind froides (`slate-*`, `gray-*`, `zinc-*`, `neutral-*`) réparties sur 24 fichiers, et 8 gradients explicites dans 4 fichiers. Ces compteurs servent à localiser la dette, pas à demander un remplacement mécanique sans lecture.

Deux concentrations dominent :

### 1. Écran de connexion

Le Login utilise un fond `slate`, cinq couches de dégradés/radiaux, une carte à `rounded-[1.75rem]`, plusieurs ombres arbitraires et du backdrop blur (`frontend/src/components/LoginScreen.tsx:33-62`). Sa colonne de marque sombre et ses textes `slate` poursuivent ce langage (`frontend/src/components/LoginScreen.tsx:98-115`). Le formulaire et la marque réemploient ces couleurs/ombres (`frontend/src/components/login/LoginScreenForm.tsx:51-121`, `frontend/src/components/login/LoginScreenBrand.tsx:3-13`).

Le parcours navigateur confirme un écran visuellement propre pris isolément, mais nettement étranger au « Plan coté » : c’est exactement le mélange SaaS générique/dégradés/ombres/palette froide que `PRODUCT.md:39-48` et `DESIGN.md:324-337` rejettent.

### 2. Formulaire et fiche Client legacy

Les sections de formulaire redéfinissent localement hauteur, couleur, hover, focus, rayon et ombre avec une série de classes `!important`, `neutral-*`, `focus:!ring-0` et `transition-all` (`frontend/src/components/client-form/ClientFormIdentitySection.tsx:20-53`; le même motif existe dans Address, Account, Agency, Codes, Contact et Notes). La fiche détail répète le langage `neutral-*`, les ombres et des lignes faussement interactives (`frontend/src/components/client-directory/ClientDirectoryRecordInfoGrid.tsx:48-167`).

### Dette de socle confirmée

Le `<body>` conserve encore `bg-slate-50 text-slate-900` et des couleurs de sélection rouges Tailwind (`frontend/index.html:1-13`), dette déjà documentée à `DESIGN.md:181`. En revanche, l’autre phrase de cette même ligne est périmée : Inter, Inter Tight et JetBrains Mono sont désormais réellement importées (`frontend/src/main.tsx:13-22`). La documentation doit cesser d’affirmer qu’elles ne sont pas chargées.

### Impact utilisateur

Le passage Login → application donne l’impression de changer de produit. Les fiches Client ont une densité, des focus et une palette différents des écrans récents. Pour les développeurs, chaque correction visuelle exige de combattre des `!important`, ce qui favorise encore plus de classes ad hoc.

### Correctif minimal

1. Recomposer le Login avec `background/surface/card/border/primary`, un filet, `rounded-lg`, les primitives Input/Button et au plus `shadow-soft`. Garder exactement les mêmes champs et le même parcours.
2. Migrer les sections `client-form/*` vers les variants `density`, `tone` et `aria-invalid` des primitives existantes ; supprimer les `!important` et `focus:!ring-0` au fil de cette migration.
3. Créer un composant local `RecordPropertyRow` pour la fiche Tiers, avec états `statique`, `copiable` ou `éditable` explicites. Ne pas créer un framework générique de métadonnées.
4. Retirer les classes froides du `<body>` et laisser `index.css` porter le fond/texte canonique.
5. Corriger `DESIGN.md:181` pour ne conserver que les dérives actuelles.
6. Ajouter des checks statiques simples sur `text-[10px]`, familles froides et `transition-all`, avec une allowlist étroite pour les cas réellement justifiés.

### Non-objectifs

- Pas de nouvelle palette.
- Pas de dark mode, le produit est explicitement light-only (`PRODUCT.md:70`).
- Pas de remplacement de Tailwind ni de shadcn/Radix.
- Pas de codemod aveugle : `neutral` peut parfois être un nom métier/variant et les gradients du skeleton ou du graphe ont une justification distincte.
- Pas de refonte de tous les écrans en une fois.

### Preuve d’acceptation

- Captures Login et fiche Tiers à 1440 × 900 et 390 × 844 : même palette, rayons, focus et élévation que le shell.
- Aucun `slate-*`, `gray-*`, `zinc-*` dans les surfaces corrigées ; aucun `neutral-*` de couleur si un token sémantique existe.
- Aucun `!important` visuel nécessaire dans `client-form/*`.
- Les imports de fontes sont reconnus par la documentation et le rendu calculé utilise les familles attendues.
- Les compteurs de dette baissent sans modifier les composants hors périmètre du lot.

## UI-22 — La qualité rédactionnelle est inégale

**Priorité : P3**

**Statut : [CODE].**

### Constat

Le ton cible est un français court, exact et au vouvoiement (`PRODUCT.md:31-37`, `DESIGN.md:318-320`). Plusieurs chaînes visibles échappent encore à cette règle :

- accents manquants : « Se deconnecter » (`frontend/src/app/getAppGate.tsx:44-55`) ;
- apostrophes manquantes : « afficher l annuaire » (`frontend/src/components/client-directory/ClientDirectoryWorkspace.tsx:72-76`, `frontend/src/components/client-directory/ClientDirectoryConvertPage.tsx:53-58`) ;
- label sans accent : « Prenom » (`frontend/src/components/entity-onboarding/EntityOnboardingIndividualSearchStep.tsx:85-93`) ;
- tutoiement/familiarité : « Reviens sur Tous » (`frontend/src/components/entity-onboarding/EntityOnboardingSearchStep.tsx:870-880`) ;
- points de suspension ASCII : « Connexion en cours... », « Redirection... » (`frontend/src/components/login/LoginScreenForm.tsx:107-121`), « Rechercher une agence par nom... » (`frontend/src/components/agencies/AgenciesManagerSearch.tsx:15-25`) ;
- pluriels techniques : `tâche(s)` et `contact(s)` (`frontend/src/components/tasks/TasksPage.tsx:89`, `frontend/src/components/entity-contact/EntityContactsPanelSection.tsx:28-35`) ;
- métadonnée HTML non accentuée : « parametres » dans la description (`frontend/index.html:5-7`).

### Impact utilisateur

Chaque écart est mineur, mais leur accumulation rend le produit moins maîtrisé et contredit la voix directe attendue. Les formes `tâche(s)` et `contact(s)` sont particulièrement visibles dans une interface quotidienne.

### Correctif minimal

- Corriger les chaînes visibles dans le lot du composant concerné.
- Réutiliser une fonction de pluriel très petite ou une expression correcte, sans introduire d’infrastructure d’internationalisation tant qu’une deuxième langue n’est pas prévue.
- Remplacer `...` par le caractère `…` dans les libellés d’interface.
- Étendre le check existant de texte visible aux quelques termes interdits : tutoiement, « interaction » visible, formes sans accents connues.

### Non-objectifs

- Pas de framework i18n.
- Pas de réécriture éditoriale de tous les textes.
- Pas de correction des identifiants techniques ou messages historiques non affichés.

### Preuve d’acceptation

- Recherche statique ciblée sans occurrence visible des exemples ci-dessus.
- Tests composants mis à jour sur les libellés exacts.
- Lecture rapide Login, onboarding, erreurs de session, annuaire et compteurs en français cohérent et au vouvoiement.

## Direction visuelle recommandée

La direction actuelle « Plan coté » reste adaptée au produit : dense, factuelle, stable pendant huit heures. Les améliorations doivent renforcer quatre invariants seulement :

1. un fond/surface/filet suffit à créer la profondeur ;
2. une donnée inconnue n’emprunte jamais le style d’une donnée nulle ;
3. un élément qui ressemble à un contrôle agit et se focalise, sinon il reste visuellement statique ;
4. les exceptions visuelles vivent dans la documentation ou disparaissent, elles ne deviennent pas une seconde charte silencieuse.
