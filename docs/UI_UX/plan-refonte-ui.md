# UI/UX — plan de refonte et suivi d'exécution

Point d'entrée unique pour la remise à niveau UI/UX/design de CIR Cockpit.
Issu de l'audit du 26/07/2026 (application locale exécutée, 9 écrans parcourus,
mesures `ripgrep` sur `frontend/src` hors tests, ratios de contraste calculés
dans le navigateur depuis les variables CSS résolues).

## Situation au 26/07/2026

| Phase | Objet | Tâches | Statut |
| --- | --- | --- | --- |
| P1 — Bloquants | Risque utilisateur et crédibilité | 8 | 🟡 en cours (6/8 terminées, T1.3 et T1.4 partielles) |
| P2 — Refontes structurelles | Pilotage, Saisie, Admin, Ctrl K | 4 | 🟡 en cours (T2.1 partielle, T2.2 terminée) |
| P3 — Fondation design system | Primitifs manquants et garde-fous | 6 | ⬜ non commencée |
| P4 — Convergence visuelle | Couleurs, ombres, rayons, Sheets, onglets | 5 | ⬜ non commencée |
| P5 — Finitions | Selects, boutons, troncatures, densité | 6 | ⬜ non commencée |
| P6 — Décisions produit | Modèle de données exposé par l'UI | 2 | ⬜ non commencée |

Une phase passe à ✅ quand toutes ses tâches y sont, à 🟡 dès qu'une tâche est
terminée ou partielle.

**Prochaine action :** P1. Les huit tâches de P1 sont indépendantes entre elles
et peuvent être lancées en parallèle.

## Règles de suivi

- Chaque tâche est autonome : elle ne suppose aucune autre tâche terminée.
  Quand une dépendance améliore le résultat sans être bloquante, elle est notée
  « Dépendance conseillée » et le prompt indique le repli.
- Les prompts sont conçus pour être collés dans une conversation vierge, sans
  contexte préalable. Ils n'ont pas besoin de ce document pour être exécutés.
- Chaque prompt se termine par un bloc **SUIVI** qui impose à l'agent de revenir
  cocher son checkpoint, remplir sa preuve réelle, mettre à jour son statut, et
  ajouter une ligne au changelog. Un travail livré sans cette mise à jour est
  considéré comme non livré.
- Une case n'est cochée qu'avec la preuve nommée en regard. « Fait » n'est pas
  une preuve : il faut une commande et son résultat, un chemin de capture, un
  nom de test ou un identifiant de commit.
- Le journal vit dans `docs/UI_UX/changelog.md`, pas ici. Ce fichier est un état
  courant ; le changelog est l'historique. La séparation évite les conflits
  d'écriture quand plusieurs tâches sont exécutées en parallèle.
- Le diagnostic complet vit dans l'artifact d'audit du 26/07/2026 ; ce fichier ne
  conserve que l'état, les preuves et les prompts.

### Légende des statuts

| Symbole | Sens |
| --- | --- |
| ⬜ non commencée | Aucun travail engagé. |
| 🟡 partielle | Travail engagé, checkpoint incomplet. Ce qui reste ouvert est décrit dans le changelog. |
| ✅ terminée | Toutes les cases du checkpoint sont cochées et la preuve réelle est renseignée. |
| ↩️ annulée | Tâche abandonnée sur décision PO, avec la raison au changelog. |

## Diagnostic en une phrase

Le design system est écrit (`frontend/src/index.css`,
`frontend/src/components/app-shell/appShellTokens.ts`, skill `cir-cockpit-design`)
mais rien n'empêche mécaniquement un écran de diverger. Écart mesuré :

| Règle écrite | Conforme | Hors règle |
| --- | --- | --- |
| Ombres : `shadow-soft` uniquement | 11 | 134 |
| Couleurs par tokens | tokens | ~900 classes Tailwind brutes |
| Pas de Sheet latérale, Dialog centré | 28 Dialogs | 6 Sheets `side="right"` |
| Échelle de rayon sm/md/lg | 442 | 109 `xl`/`2xl` |
| Kit UI partagé | 257 `<Button>` | 105 `<button>` + 7 `<select>` natifs |

---

# Phase 1 — Bloquants

Risque utilisateur direct et perte de crédibilité. Coût faible, visibilité
maximale. Aucune décision produit requise.

## T1.1 — Contrôles morts dans le shell

**Statut** ✅ terminée · **Impact** élevé · **Effort** faible · **Dépendance** aucune

**Constat.** Deux contrôles visibles en permanence n'ont aucun gestionnaire.
La cloche de notifications (`AppHeader.tsx:148`) est un `<button>` sans
`onClick`. Le sélecteur d'agence du sidebar (`AppSidebarContent.tsx:93`) est un
`<button>` avec chevron sans `onClick`, alors que le vrai changement d'agence
est enfoui dans le panneau « Mon compte ».

**Fichiers.** `frontend/src/components/AppHeader.tsx`,
`frontend/src/components/app-sidebar/AppSidebarContent.tsx`,
`frontend/src/components/AppLayout.tsx`

**Checkpoint**

- [x] La cloche est branchée sur une vraie destination, ou retirée du DOM.
- [x] Le sélecteur d'agence ouvre le changement d'agence, ou devient un
      affichage non interactif (`<div>`, pas de chevron, pas de `hover`).
- [x] Aucun `<button>` sans `onClick` ni `type="submit"` ne subsiste dans
      `AppHeader.tsx` et `AppSidebarContent.tsx`.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Capture des deux contrôles après correction + sortie
`qa:front`.

**Preuve réelle.** 28/07/2026.
Cloche retirée du DOM (aucune destination notifications n'existe dans le code :
`rg 'Bell|Notifications' frontend/src` ne renvoyait que ce bouton mort et l'icône
de rappel de `CockpitReadonlyView.tsx`) ; l'import `Bell` de `AppHeader.tsx` est
supprimé et aucun test ne la référençait.
Sélecteur d'agence branché sur `onAgencyChange` / `agencyMemberships` remontés
depuis `AppLayout.tsx` via `AppSidebar.tsx` : `DropdownMenu` + `RadioGroup` quand
l'utilisateur a plusieurs agences, `<div>` sans chevron ni `hover` sinon. Le
changement d'agence de « Mon compte » est inchangé.
Capture non produite : aucune session navigateur n'a été ouverte pour cette
tâche. Remplacée par un test automatisé nommé :
`frontend/src/components/app-sidebar/__tests__/AppSidebarContent.test.tsx`
(« permet de changer d'agence quand l'utilisateur en a plusieurs » et « rend un
affichage non interactif quand l'utilisateur n'a qu'une agence »).
Commande : `pnpm run qa:front` → `Repo state check passed.`, `tsc --noEmit` OK,
`eslint --max-warnings 0` OK, `Test Files 156 passed (156) / Tests 708 passed
(708)`, `Error compliance check passed.`

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design` avant toute modification visible.
Contraintes : modifier le minimum utile, respecter le worktree sale (ne jamais
revert des changements que tu n'as pas faits), zéro mock ou TODO, UI en français.

CONTEXTE
Deux contrôles du shell applicatif sont affichés en permanence mais ne font rien :
1. La cloche de notifications dans frontend/src/components/AppHeader.tsx (autour
   de la ligne 148) : c'est un <button> avec aria-label="Notifications" et aucun
   onClick.
2. Le sélecteur d'agence dans frontend/src/components/app-sidebar/AppSidebarContent.tsx
   (autour de la ligne 93) : un <button> qui affiche le nom de l'agence, un point
   vert, un sous-titre "Agence active" et un ChevronDown, sans aucun onClick. Le
   vrai changement d'agence existe déjà, mais uniquement dans le panneau
   "Mon compte" de frontend/src/components/AppLayout.tsx, via un composant Select
   alimenté par headerProps.agencyMemberships et headerProps.onAgencyChange.

Un contrôle qui a une affordance visuelle (curseur, hover, chevron) sans action
est un mensonge d'interface : l'utilisateur clique et rien ne se passe.

TÂCHE
1. Cloche : soit tu la branches sur une destination réelle si elle existe déjà
   dans le code, soit tu la retires entièrement. Ne crée PAS de système de
   notifications ; ce n'est pas le périmètre. Si tu la retires, vérifie qu'aucun
   test ne la référence.
2. Sélecteur d'agence : rends-le fonctionnel en réutilisant onAgencyChange et
   agencyMemberships déjà disponibles (le composant reçoit déjà agencyName et
   agencySubtitle ; remonte les props nécessaires depuis AppLayout). Si
   l'utilisateur n'a qu'une seule agence, rends un élément non interactif : pas
   de chevron, pas de hover, pas de <button>.
3. Vérifie qu'aucun autre <button> de ces deux fichiers n'est dépourvu de
   onClick ou de type="submit".

CRITÈRES D'ACCEPTATION
- Aucun contrôle du shell n'a d'affordance interactive sans action.
- Les états hover, focus-visible et disabled sont cohérents avec les tokens de
  frontend/src/components/app-shell/appShellTokens.ts (APP_SHELL_CLASSES).
- Le changement d'agence reste accessible depuis "Mon compte" (pas de régression).

QA
Lance `pnpm run qa:front` et rapporte la sortie. Décris précisément ce que tu as
choisi pour la cloche et pourquoi.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.2 — Action destructive au même rang que l'action principale

**Statut** ✅ terminée · **Impact** élevé · **Effort** faible · **Dépendance** aucune

**Constat.** Sur la fiche client, « Supprimer définitivement » est un bouton
permanent, de même poids visuel et à quelques pixels de « Modifier ». Une action
irréversible ne doit jamais être adjacente à l'action principale.

**Fichiers.** `frontend/src/components/client-detail/ClientDetailHeader.tsx`
(fichier mort : jamais importé). L'en-tête réellement rendu sur `/clients/$clientNumber`,
`/clients/prospects/$prospectId` et `/suppliers/$supplierId` est
`frontend/src/components/client-directory/ClientDirectoryRecordActionsBar.tsx`,
monté par `ClientDirectoryRecordDetails.tsx` ; c'est là que le correctif a été appliqué.

**Checkpoint**

- [x] L'action de suppression est déplacée dans un menu de dépassement (`⋮`).
- [x] Une confirmation explicite est exigée (saisie du nom de la fiche, pas un
      simple « Confirmer »).
- [x] Le dialogue de confirmation annonce ce qui est détruit et ce qui ne l'est pas.
- [x] Le même traitement est appliqué aux écrans jumeaux (fiche prospect,
      fiche fournisseur) s'ils exposent la même action.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Capture du menu et du dialogue de confirmation.

**Preuve réelle.** Capture non produite : aucune session navigateur authentifiée
en super admin n'est disponible dans cet environnement (l'action n'est visible que
pour `role === 'super_admin'`). Remplacée par des tests.
`pnpm run qa:front` : `Repo state check passed`, typecheck OK, `eslint --max-warnings 0` OK,
`Test Files 157 passed / Tests 711 passed`, `Error compliance check passed.`
Test ajouté `frontend/src/components/client-directory/__tests__/ClientDirectoryRecordActionsBar.test.tsx`
(3 cas : absence du bouton destructif dans la barre + présence du `⋮` ; bouton de
confirmation désactivé tant que la saisie ≠ nom exact ; Escape ferme sans supprimer
et rend le focus au `⋮`). Tests existants de
`ClientDirectoryDetailPage.test.tsx` mis à jour sur le nouveau parcours (client et
fournisseur). Nouveau composant :
`frontend/src/components/client-directory/ClientDirectoryRecordDangerMenu.tsx`.
Texte du dialogue vérifié contre le backend : `dataEntitiesDelete.ts` (suppression
dure de l'entité, suppression des interactions seulement si
`delete_related_interactions`) et `backend/migrations/20260203120000_entities_refactor.sql`
(`entity_contacts.entity_id … on delete cascade` ligne 99,
`interactions_entity_id_fkey … on delete set null` ligne 219).

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`. Le système d'erreurs impose
createAppError() / notifyError() : pas de throw new Error() ni de toast.error()
direct (skill `cir-error-handling` si besoin).
Contraintes : minimum utile, worktree sale respecté, UI et messages en français.

CONTEXTE
Sur la fiche client (route /clients/:id, en-tête rendu par
frontend/src/components/client-detail/ClientDetailHeader.tsx), le bouton
"Supprimer définitivement" est affiché en permanence, en haut à droite, avec le
même poids visuel que "Modifier" et à quelques pixels de celui-ci.

C'est une action irréversible placée sur le chemin de l'action la plus fréquente.
Un clic de trop détruit une fiche client.

TÂCHE
1. Sors "Supprimer définitivement" de la barre d'actions principale et place-la
   dans un menu de dépassement (DropdownMenu, déclencheur icône "⋮"), en dernière
   position, avec le style destructif déjà utilisé ailleurs dans le produit (voir
   l'item "Déconnexion" de frontend/src/components/AppHeader.tsx).
2. Exige une confirmation forte : un AlertDialog qui demande de saisir le nom
   exact de la fiche pour activer le bouton de confirmation. Le composant
   AlertDialog existe déjà dans frontend/src/components/ui/feedback/AlertDialog.tsx.
3. Le texte du dialogue doit dire concrètement ce qui est supprimé et ce qui
   subsiste (interactions historiques, contacts...). Vérifie le comportement réel
   côté backend avant d'écrire ce texte ; ne l'invente pas.
4. Cherche si les fiches prospect et fournisseur exposent la même action
   (frontend/src/components/prospect-detail/, frontend/src/components/admin-suppliers/)
   et applique le même traitement le cas échéant.

CRITÈRES D'ACCEPTATION
- Aucune action irréversible n'est atteignable en un seul clic depuis l'en-tête.
- Le bouton de confirmation reste désactivé tant que la saisie ne correspond pas.
- Escape ferme le dialogue sans supprimer ; le focus revient au déclencheur.
- Les erreurs passent par le pipeline d'erreurs existant.

QA
Lance `pnpm run qa:front` et rapporte la sortie. Précise le libellé exact du
dialogue de confirmation que tu as écrit.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.3 — Contraste des tokens sémantiques sous le seuil AA

**Statut** 🟡 partielle · **Impact** élevé · **Effort** faible · **Dépendance** aucune

**Constat.** Ratios calculés dans le navigateur depuis
`frontend/src/index.css`. Seuil AA texte normal : 4,5:1. Seuil AA bordures de
contrôle (WCAG 1.4.11) : 3:1.

| Paire | Avant | Après | Requis | Verdict |
| --- | --- | --- | --- | --- |
| `warning-strong` / `card` (texte) | 2,40 | 5,33 | 4,5 | ✅ token dédié |
| `warning` / `card` (aplat seul) | 2,40 | 2,40 | — | hors seuil texte |
| `destructive` / `card` | 3,76 | 5,03 | 4,5 | ✅ |
| `success` / `card` | 4,13 | 5,05 | 4,5 | ✅ |
| `muted-foreground` / `surface-2` | 4,31 | 4,65 | 4,5 | ✅ |
| `muted-foreground` / `background` | 4,58 | 4,94 | 4,5 | ✅ |
| `border` / `background` | 1,28 | 1,28 | 3,0 | ❌ arbitré : refusé |
| `border-subtle` / `background` | 1,09 | 1,09 | 3,0 | ❌ arbitré : refusé |

Le pire fond est `surface-2`, pas `card` : les valeurs sont calées dessus
(`warning-strong` 4,94 · `destructive` 4,65 · `success` 4,68 ·
`muted-foreground` 4,65). `warning-strong` est aussi vérifié sur le fond réel des
badges, `bg-warning/10` composé sur `card` (`#fcf5e8`) : 4,92.

**Séparation aplat / texte pour l'ambre (décision PO du 28/07/2026, option 2).**
Un ambre ne peut pas atteindre 4,5:1 sur blanc en restant un ambre : à L 32 % il
vire au brun (`#916512` au lieu de `#de9a1b`). Le token est donc dédoublé, comme
le font les design systems matures :

- `--warning` reste `39 78% 49%` — aplats, pastilles, `bg-warning`, points d'état.
  `--warning-foreground` reste le texte foncé posé dessus.
- `--warning-strong` = `38 85% 31%` (`#92610c`, soit l'équivalent d'`amber-800`)
  est la couleur de texte. Les 25 occurrences de `text-warning` sont passées à
  `text-warning-strong` dans 20 fichiers.

**Deux reverts arbitrés par le PO sur capture d'écran.** La première passe avait
amené les 7 paires au seuil ; le rendu a été rejeté deux fois :

- `--border` 88 % → 53 % (`#e4e1dd` → `#968a79`). Ce token alimente le
  `* { border-color }` global : chaque filet de table, séparateur `divide-border`
  et contour de carte devenait un trait gris franc. Reverté à 88 %.
- `--input` 88 % → 53 %, tenté ensuite seul sur les contrôles réels (boutons
  `outline`, `select`). Rejeté aussi : les boutons « Vues », « Affichage »,
  « Assistant IA », « Suivant » ressortaient avec un contour beaucoup plus sombre
  que le reste de l'écran. Reverté à 88 %.
- `--border-subtle` reverté à 95 % par cohérence : il doit rester plus clair que
  `--border`.

Conséquence assumée : **aucune bordure ne satisfait WCAG 1.4.11**. C'est un
arbitrage PO explicite, pas un oubli — il n'existe pas de valeur qui satisfasse
le critère sans le rendu refusé. Les trois dettes (`warning` en aplat, `border`,
`border-subtle`, plus `input`) sont figées dans le test par
`KNOWN_BELOW_THRESHOLD` : aucune ne peut bouger sans décision.

**Fichiers.** `frontend/src/index.css`

**Checkpoint**

- [x] `warning`, `destructive`, `success` atteignent ≥ 4,5:1 sur `card`,
      `background`, `surface-1` et `surface-2`. — pour `warning`, via le token de
      texte `--warning-strong` (option 2 retenue par le PO) ; `--warning` reste
      l'aplat ambre, non utilisé comme couleur de texte.
- [x] `muted-foreground` atteint ≥ 4,5:1 sur les quatre mêmes fonds.
- [ ] `border` atteint ≥ 3:1 sur `background` et `card`. — **arbitré : refusé par
      le PO.** Les deux tentatives (`--border` puis `--input` seul) ont été
      rejetées sur rendu. Aucune valeur ne satisfait le critère sans le rendu
      refusé ; la case reste ouverte volontairement.
- [x] Le caractère chaud de la palette (teinte 30–48) et le rouge de marque sont
      préservés.
- [x] Un test unitaire verrouille les ratios pour empêcher la régression.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Tableau avant/après des ratios + test unitaire.

**Preuve réelle.** `frontend/src/index.css` : `--destructive` 0 84.2% 60.2% →
47 %, `--success` 148 49% 37% → 33 %, `--muted-foreground` 31 7% 45% → 43 %
(luminosité seule ; teintes, saturations et `--primary: 6 72% 45%` intacts), plus
le nouveau `--warning-strong: 38 85% 31%`. `frontend/tailwind.config.cjs` expose
`warning.strong`. 25 occurrences de `text-warning` → `text-warning-strong` dans
20 fichiers (`git grep -c text-warning-strong -- frontend/src`).
Test : `frontend/src/components/ui/__tests__/designTokensContrast.test.ts`
(20 cas ; il relit `index.css`, recalcule les ratios WCAG, couvre les paires
`*-foreground` sur leur fond, le fond composé `bg-warning/10`, le maintien des
teintes 30–48, et fige les quatre dettes via `KNOWN_BELOW_THRESHOLD`).
Régression vérifiée : en remettant les anciennes valeurs, `npx vitest run
src/components/ui/__tests__/designTokensContrast.test.ts` donnait
`Tests 8 failed | 9 passed (17)` ; état courant `Tests 20 passed (20)`.
Rendu vérifié en navigateur sur `http://localhost:3000` (écran Référentiels CIR,
super admin) à chaque itération : `getComputedStyle` confirme
`--input` revenu à `36 12% 88%`, bordure des boutons `outline` à
`rgb(228, 225, 221)`, et `text-warning-strong` calculé à `rgb(146, 97, 12)`.
`pnpm run qa:front` : lint/typecheck OK, `Test Files 158 passed / Tests 731
passed`, `Error compliance check passed.`

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Les tokens de couleur du produit sont définis en HSL dans
frontend/src/index.css (bloc :root) et exposés à Tailwind via
frontend/tailwind.config.cjs. Plusieurs paires échouent WCAG AA. Ratios mesurés
dans le navigateur à partir des variables réellement résolues :

  warning / card ................ 2,40  (requis 4,5)  ÉCHEC NET
  destructive / card ............ 3,76  (requis 4,5)  ÉCHEC
  success / card ................ 4,13  (requis 4,5)  ÉCHEC
  muted-foreground / surface-2 .. 4,31  (requis 4,5)  ÉCHEC
  muted-foreground / background . 4,58  (requis 4,5)  limite, +0,08
  border / background ........... 1,28  (requis 3,0)  ÉCHEC (WCAG 1.4.11)
  border-subtle / background .... 1,09  (requis 3,0)  invisible

L'aggravation : muted-foreground est utilisé 834 fois, dont 204 fois combiné à
text-[10px] ou text-[11px]. Ces tailles sont très en dessous du seuil "grand
texte" (18,66px) qui autoriserait 3:1 ; le seuil applicable reste 4,5.

TÂCHE
1. Recalcule les valeurs HSL de --warning, --destructive, --success,
   --muted-foreground et --border pour atteindre les seuils, en vérifiant contre
   les QUATRE fonds réellement utilisés : --background, --card, --surface-1,
   --surface-2.
2. Contrainte d'identité : la palette est neutre chaude (teinte 30 à 48) et le
   primaire est un rouge de marque hsl(6 72% 45%). Baisse la luminosité plutôt
   que de dériver la teinte. Le produit doit rester reconnaissable.
3. Vérifie aussi les couleurs "-foreground" associées (texte posé SUR le token) :
   --primary-foreground / --primary, --success-foreground, --warning-foreground.
4. Ajoute un test unitaire Vitest qui calcule les ratios depuis les valeurs de
   index.css et échoue si l'un passe sous son seuil. Place-le à côté des tests UI
   existants (frontend/src/components/ui/__tests__/). Invoque le skill `vitest`.
5. Ne touche pas aux ~900 classes Tailwind brutes (stone-*, neutral-*, red-*)
   présentes dans les composants : c'est une autre tâche.

CRITÈRES D'ACCEPTATION
- Les 7 paires listées passent leur seuil ; rapporte le tableau avant/après.
- La palette reste chaude et le rouge de marque reconnaissable.
- Le test unitaire échoue si on remet les anciennes valeurs (vérifie-le).

QA
Lance `pnpm run qa:front`. Rapporte le tableau des ratios avant/après.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.3" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.3 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.3, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.4 — Plancher typographique sous le seuil de lisibilité

**Statut** 🟡 partielle · **Impact** élevé · **Effort** moyen · **Dépendance** aucune

**Constat.** 51 usages de texte à 8, 9 ou 9,5 px répartis sur 19 fichiers.
La taille de base déclarée du produit est 13 px ; les deux tailles les plus
utilisées sont `text-[10px]` (259 occurrences) et `text-[11px]` (230).

**Fichiers.** 19 fichiers, dont
`components/admin-suppliers/create-wizard/supplier-intelligence-aside.tsx`
(17 occurrences), `components/cockpit/right/CockpitStatusControl.tsx`,
`components/dashboard/overview/DashboardDossiersTable.tsx`.

**Checkpoint**

- [x] Plus aucun `text-[8px]`, `text-[9px]` ni `text-[9.5px]` dans `frontend/src`.
- [x] Le plancher retenu est documenté dans le skill `cir-cockpit-design`.
- [ ] Aucune régression de mise en page (chips, badges, en-têtes de tableau).
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Sortie `rg 'text-\[(8|9|9\.5)px\]' frontend/src` vide.

**Preuve réelle.** 51 occurrences remplacées par `text-[11px]` dans 19 fichiers,
avec compensation par le poids (`font-bold`/`font-extrabold` → `font-semibold`)
et le tracking (`tracking-wider`/`tracking-widest`/`tracking-[0.12em]`/
`tracking-[0.14em]` → `tracking-wide` ou `tracking-[0.04em]`) ; trois pastilles
à hauteur fixe passent de `size-4` à `size-5` et le badge de mapping d'import de
`h-4` à `h-5`. `rg 'text-\[(8|9|9\.5)px\]' frontend/src` retourne 0 ligne
(exit 1). `pnpm run qa:front` : lint/typecheck OK, `Test Files 158 passed /
Tests 731 passed`, `Error compliance check passed.` Plancher documenté dans
`.agents/skills/cir-cockpit-design/SKILL.md` §Visual Direction (ligne
« Typographic floor: 11px »), visible via la jonction `.claude/skills/`.
Vérification navigateur sur `http://localhost:3000` (1280×720, session super
admin, 6 écrans chargés : `/cockpit` saisie guidée étape 3, `/dashboard`,
`/suppliers/new` étape 1, `/clients/new` étape 1, `/settings` → Statuts,
`/remises/referentiels`) : audit DOM `getComputedStyle` → aucun nœud texte sous
11 px hors dette `text-[10px]` préexistante, et `clippedCount: 0` sur chacun des
6 écrans. Non-régression de hauteur mesurée en réappliquant les anciennes
valeurs à chaud : nav de progression de l'assistant 38 px → 38 px, ligne du
tableau Dossiers 47,4 px → 47,4 px. Composants non atteignables faute de données
mesurés par injection dans le build Tailwind réel : pastille de catégorie de
`CockpitStatusControl` 70,7 × 20 px (9 px/0,12em) → 75,3 × 20 px (11 px/0,04em),
`TableHead` de `segment-detail-dialog` toujours à 24 px (`h-6`), cellule
coefficient 45,5 px → 45,0 px, libellés de l'aside fournisseur tous sur une
seule ligne dans les 359 px réels de l'aside.

**Reste ouvert.** La case « aucune régression de mise en page » n'est pas cochée
pour deux raisons : (1) dans `DashboardDossiersTable`, la colonne Statut est
fixée à 110 px et le badge « Attente éléments du client » demande désormais
169 px de texte pour 96 px disponibles (contre ~138 px avant) — la troncature
existait déjà à 9 px et l'intitulé complet reste exposé via `title`, mais elle
s'aggrave ; élargir `GRID_TEMPLATE` sort du périmètre de T1.4. (2) Les écrans
dépendants de données absentes de l'environnement local n'ont pas pu être
observés en vrai : cartes de prévisualisation de `supplier-intelligence-aside`
(étapes 2 et 3), dialog de détail segment et dialog d'import des référentiels
(table Segments vide), `EntityOnboardingSidebar` (bloc Finances et checklist),
`EntityOnboardingCompanySummary`, `CockpitSelectedEntityCard`,
`CockpitSupplierLookup`, `InteractionSearchFooter`.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit se veut un SaaS dense, base 13px. Mais 51 endroits utilisent du texte
à 8px, 9px ou 9,5px, répartis sur 19 fichiers. À ces tailles, le texte est
illisible pour une part significative des utilisateurs, et il porte souvent de
l'information réelle (codes SIRET, NAF, libellés de statut, badges).

Liste exacte des motifs à éliminer : text-[8px], text-[9px], text-[9.5px].
Pour les localiser : rg 'text-\[(8|9|9\.5)px\]' frontend/src --type tsx

Fichiers les plus touchés :
- components/admin-suppliers/create-wizard/supplier-intelligence-aside.tsx (17)
- components/cockpit/right/CockpitStatusControl.tsx
- components/dashboard/overview/DashboardDossiersTable.tsx
- components/entity-onboarding/ (plusieurs)
- components/pricing-references/ (plusieurs)

TÂCHE
1. Remplace chaque occurrence par 11px minimum (text-[11px]).
2. Beaucoup de ces éléments sont des micro-libellés en capitales espacées
   (font-bold uppercase tracking-wider). En passant à 11px ils vont grossir :
   compense en réduisant le tracking et/ou le poids plutôt qu'en remettant une
   taille plus petite. Vérifie visuellement chaque écran touché — lance
   l'application (pnpm --dir frontend run dev) et regarde le rendu réel.
3. Attention aux badges et chips à hauteur fixe (h-5, h-4) : ils peuvent devoir
   passer à la hauteur supérieure sur la grille de 4px.
4. Documente le plancher retenu dans .agents/skills/cir-cockpit-design/SKILL.md
   (section "Visual Direction"), en une phrase.

CRITÈRES D'ACCEPTATION
- `rg 'text-\[(8|9|9\.5)px\]' frontend/src` ne retourne rien.
- Aucun débordement, aucune troncature nouvelle, aucun décalage de grille.
- La densité globale reste comparable ; ce n'est pas une opération d'aération.

QA
Lance `pnpm run qa:front`. Liste les écrans que tu as vérifiés visuellement.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.4" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.4 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.4, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.5 — Accents français manquants

**Statut** ✅ terminée · **Impact** élevé · **Effort** faible · **Dépendance** aucune

**Constat.** Sur le seul assistant de création de fiche : « Definit le
parcours », « Intention de creation », « Qualification legere », « Societe »,
« etablissements et controle CIR », « Client sans entite », « Retour aux
resultats ». Ailleurs : « Gestion des acces et roles globaux »
(`UsersManagerHeader.tsx:19`), « Commencez a taper pour rechercher »
(`AppSearchOverlay.tsx:107` et `:234`), « Termine » (Paramètres → Statuts).

10 occurrences confirmées visuellement sur 3 écrans ; le motif est détecté dans
une vingtaine de fichiers.

**Fichiers.** `components/entity-onboarding/`, `components/EntityOnboardingDialog.tsx`,
`components/users/UsersManagerHeader.tsx`, `components/AppSearchOverlay.tsx`,
`components/admin-suppliers/create-wizard/`

**Checkpoint**

- [x] Les 10 occurrences confirmées sont corrigées.
- [x] Une passe systématique est faite sur toutes les chaînes visibles.
- [x] Les valeurs de données (libellés de statut en base) sont distinguées des
      chaînes codées en dur ; les premières sont signalées, pas corrigées en dur.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Liste des chaînes corrigées + captures des 3 écrans.

**Preuve réelle.** 228 règles de remplacement appliquées sur `frontend/src` en
quatre passes scriptées — 173 puis 37 sur des libellés d'interface (149 puis 35
fichiers réécrits), 18 sur des libellés d'un seul mot, plus 5 éditions ciblées ;
une passe supplémentaire de 12 règles aligne les matchers de test sur les
libellés corrigés. Les 10 occurrences du constat sont couvertes :
`EntityOnboardingDialog.tsx:374` (« Définit le parcours… à collecter »),
`EntityOnboardingIntentStep.tsx` (`:27` « Qualification légère », `:32`
« Création d'un compte complet », `:39` « Société », `:40` « établissements et
contrôle CIR », `:45` « sans entité », `:210` « Intention de création »),
`ClientDirectoryCreatePage.tsx:86` (« Retour aux résultats »),
`UsersManagerHeader.tsx:19` (« Gestion des accès et rôles globaux »),
`AppSearchOverlay.tsx:107` et `:234` (« Commencez à taper pour rechercher »).

Passe systématique en trois détecteurs successifs écrits pour la tâche, chacun
rejoué après correction jusqu'à n'exposer que des faux positifs :
(1) chaînes multi-mots contenant un mot d'une liste de ~280 formes non accentuées
— 272 chaînes candidates, 148 réellement affichées ;
(2) auto-cohérence : tout mot présent ailleurs dans `frontend/src` sous forme
accentuée mais rendu non accentué dans une chaîne affichée — 68 groupes ;
(3) libellés d'un seul mot (`Societe`, `Prenom`, `Telephone`, `Role`, `Creer`,
`Reessayer`, `Departement`, `Etablissement`, `Ferme`, `Previsualiser`), que les
deux premiers détecteurs manquaient car ils exigeaient un espace.
Les 73 chaînes contenant `ou` / `a` / `sur` ont été relues une par une : toutes
sont des homographes corrects (conjonction, auxiliaire, préposition) sauf celles
déjà corrigées en `à`.

Non corrigé volontairement, car ce sont des **données** et non du code :
- les libellés de statut d'interaction saisis en base (Paramètres → Statuts
  interactions), dont le « Termine » signalé — nettoyage de données à faire côté
  PO ; l'état distant n'a pas pu être lu ici (MCP Supabase non authentifié dans
  cette session) ;
- `constants/relations.ts:43` (`'client a terme'`) et
  `utils/dashboard/dashboardAggregates.ts:7-8` (`'termine'`, `'a traiter'`,
  `'a faire'`…) : tokens de comparaison normalisés sans accent, comparés à des
  libellés de base après `normalize('NFD')` — les accentuer casserait
  l'appariement.
Le libellé de catégorie `STATUS_CATEGORY_LABELS` de `constants/statusCategories.ts`
est, lui, bien du code : corrigé en `À traiter` / `Terminé`.

`pnpm run qa:front` : lint/typecheck OK, `Test Files 158 passed (158)`,
`Tests 731 passed (731)`, `Error compliance check passed.`, `exit=0`.
Captures non produites (aucune session navigateur ouverte dans cette session) ;
la non-régression est portée par les 731 tests, dont 12 matchers d'accessibilité
mis à jour qui échouaient tant que les libellés n'étaient pas corrigés
(`AppSearchOverlay.test.tsx`, `ChangePasswordScreen.test.tsx`,
`EntityOnboardingDialog.test.tsx`, `ClientDirectoryFilters.test.tsx`,
`ClientDirectoryDetailPage.test.tsx`, `PricingReferencesPage.test.tsx`).

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Le produit est en français et destiné à des professionnels français. Une
quantité notable de chaînes visibles est écrite sans accents, ce qui fait passer
l'interface pour un produit non fini.

Occurrences confirmées à l'écran :
- Assistant de création de fiche (route /clients/new) : "Definit le parcours et
  les champs obligatoires a collecter", "Intention de creation", "Qualification
  legere pour une prise de contact", "Creation d'un compte complet pour
  l'annuaire", "Societe", "Recherche SIRENE, etablissements et controle CIR",
  "Client sans entite, avec compte comptant direct", "Retour aux resultats".
- frontend/src/components/users/UsersManagerHeader.tsx ligne 19 :
  "Gestion des acces et roles globaux".
- frontend/src/components/AppSearchOverlay.tsx lignes 107 et 234 :
  "Commencez a taper pour rechercher".
- Paramètres → Statuts interactions : un statut affiché "Termine".

TÂCHE
1. Corrige les occurrences ci-dessus.
2. Fais une passe systématique sur frontend/src : cherche les mots français
   fréquents écrits sans accent dans des chaînes affichées (creation, donnees,
   resultats, selectionne, verification, etablissement, controle, entite, acces,
   societe, legere, categorie, numero, deja, apres, cree, termine, derniere,
   premiere, reference, parametres, roles...). Attention aux faux positifs :
   noms de variables, clés d'API, identifiants techniques. Ne corrige QUE ce qui
   est rendu à l'écran.
3. Distinction importante : certaines chaînes sans accent ("Termine" dans
   Paramètres) viennent de DONNÉES en base, pas du code. Ne les corrige pas en
   dur dans le composant. Identifie-les, liste-les dans ton rapport, et signale
   au PO qu'un nettoyage de données est nécessaire.

CRITÈRES D'ACCEPTATION
- Aucune régression de sens ou de casse.
- Les apostrophes typographiques déjà utilisées ailleurs restent cohérentes.
- Le rapport distingue clairement "corrigé dans le code" et "à corriger en base".

QA
Lance `pnpm run qa:front`. Liste toutes les chaînes que tu as modifiées, et
séparément celles qui relèvent des données.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.5" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.5 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.5, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.6 — Tutoiement et vouvoiement mélangés

**Statut** ✅ terminée · **Impact** élevé · **Effort** faible · **Dépendance** aucune

**Constat.** Dans le même parcours de saisie : « Avec qui as-tu échangé ? » et
« Choisis un contact existant » (`CockpitGuidedStepSwitch.tsx:108` et `:113`),
alors que deux étapes plus tôt l'écran dit « Sélectionnez un client via la
recherche pour continuer ». Mesure : 11 formulations au tutoiement contre 20 au
vouvoiement.

**Fichiers.** `components/cockpit/guided/CockpitGuidedStepSwitch.tsx`,
`components/cockpit/guided/CockpitSolicitationLookup.tsx`,
`components/entity-onboarding/` (4 fichiers),
`components/admin-suppliers/create-wizard/` (3 fichiers),
`components/EntityOnboardingDialog.tsx`

**Checkpoint**

- [x] Une forme est choisie et documentée dans le skill `cir-cockpit-design`.
- [x] Les 11 formulations minoritaires sont converties.
- [x] Les messages de validation Zod de `shared/schemas` suivent la même forme.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Liste avant/après des 11 formulations.

**Preuve réelle.** Forme retenue : **vouvoiement**, documentée en une ligne dans
`.agents/skills/cir-cockpit-design/SKILL.md` §Product-Owner Rules (« Vouvoiement
everywhere, never tutoiement »). Le constat comptait 11 formulations ; le balayage
au mot entier (impératifs 2ᵉ pers. sing., pronoms `tu`/`ton`/`ta`/`tes`/`toi`,
formes `-toi`, inversions `as-tu`) en a trouvé **17 sur 16 emplacements**, dont 6
absentes de la liste du prompt — les 6 supplémentaires sont converties aussi.
Liste avant → après :

| # | Emplacement | Avant | Après |
| --- | --- | --- | --- |
| 1 | `cockpit/guided/CockpitGuidedStepSwitch.tsx:108` | Avec qui as-tu échangé ? | Avec qui avez-vous échangé ? |
| 2 | `cockpit/guided/CockpitGuidedStepSwitch.tsx:113` | Choisis un contact existant du tiers, ou ajoute-en un nouveau. | Choisissez un contact existant du tiers, ou ajoutez-en un nouveau. |
| 3 | `cockpit/guided/CockpitSolicitationLookup.tsx:296` | Saisis un numéro pour retrouver l’historique. | Saisissez un numéro pour retrouver l’historique. |
| 4 | `entity-onboarding/EntityOnboardingIndividualSearchStep.tsx:75` | Saisis les coordonnées. | Saisissez les coordonnées. |
| 5 | `entity-onboarding/EntityOnboardingReviewStep.tsx:160` | Vérifie attentivement ces données | Vérifiez attentivement ces données |
| 6 | `entity-onboarding/EntityOnboardingSidebar.tsx:172` | Sélectionne un établissement pour voir les infos du site. | Sélectionnez un établissement pour voir les infos du site. |
| 7 | `EntityOnboardingDialog.tsx:475` | Vérifie les informations avant l'insertion | Vérifiez les informations avant l'insertion |
| 8 | `admin-suppliers/create-wizard/supplier-details-step.tsx:43` | Renseigne les coordonnées et identifiants permanents | Renseignez les coordonnées et identifiants permanents |
| 9 | `admin-suppliers/create-wizard/supplier-review-step.tsx:32` | Vérifie l'exactitude des informations | Vérifiez l'exactitude des informations |
| 10 | `admin-suppliers/create-wizard/supplier-intelligence-aside.tsx:123` | Complète les champs obligatoires | Complétez les champs obligatoires |
| 11 | `admin-suppliers/create-wizard/supplier-intelligence-aside.tsx:231` | Sélectionne un établissement de la liste | Sélectionnez un établissement dans la liste |
| 12 | `EntityOnboardingDialog.tsx:531` *(hors liste)* | …seront perdues si tu fermes maintenant ce flux. | …seront perdues si vous fermez maintenant ce parcours. |
| 13 | `entity-onboarding/EntityOnboardingReviewStep.tsx:171` *(hors liste)* | Assure-toi qu'il s'agit bien d'une nouvelle entité | Assurez-vous qu'il s'agit bien d'une nouvelle entité |
| 14 | `entity-onboarding/useOnboardingNavigation.ts:62` *(hors liste)* | Renseigne l identité et au moins un moyen de contact. | Renseignez l’identité et au moins un moyen de contact. |
| 15 | `entity-onboarding/useOnboardingNavigation.ts:94-95` *(hors liste, 2 messages)* | Sélectionne un établissement officiel ou passe en saisie manuelle. / Sélectionne un établissement officiel pour continuer. | Sélectionnez un établissement officiel ou passez en saisie manuelle. / Sélectionnez un établissement officiel pour continuer. |
| 16 | `cockpit/left/CockpitClientContactSection.tsx:60` *(hors liste)* | Ajoute un contact pour continuer. | Ajoutez un contact pour continuer. |
| 17 | `cockpit/guided/CockpitSupplierLookup.tsx:191` *(hors liste)* | Utilise un fournisseur ponctuel pour cette saisie. | Utilisez un fournisseur ponctuel pour cette saisie. |

Quatre conversions ne sont pas une simple conjugaison : #11 `de la liste` →
`dans la liste`, #12 `ce flux` → `ce parcours` (aligné sur le titre du dialog
« Quitter le parcours ? »), #14 apostrophe manquante restaurée (`l identité` →
`l’identité`), #15 `passe` → `passez` et #17/#15 verbes irréguliers
(`poursuis` → `poursuivez` dans `search-step/search-results-list.tsx:84`,
également converti).

**`shared/schemas` : aucune modification nécessaire, et c'est vérifié, pas
supposé.** `rg` sur les 33 fichiers de `shared/schemas` ne trouve aucun
`tu`/`ton`/`ta`/`tes`/`toi` (0 occurrence) ni aucun impératif 2ᵉ pers. sing. :
les messages Zod y sont tous impersonnels/nominaux (« Jeton upload requis. »,
« Au moins un champ officiel doit etre selectionne. »). Les 3 correspondances du
balayage sont des participes passés (`verifie`, `selectionne`), pas des
impératifs. La forme y est donc déjà compatible avec le vouvoiement.

**Commandes et résultats.**

- Critère d'acceptation :
  `rg "as-tu|Choisis |Saisis |Sélectionne |Renseigne |Vérifie |Complète " frontend/src -g '*.tsx'`
  → **0 ligne, exit 1** (plus aucune occurrence, pas même un faux positif).
- Balayage résiduel élargi (`ts` + `tsx`, pronoms + impératifs + `-toi`) → une
  seule ligne, faux positif assumé :
  `pricing-references-formatters.ts:106  complete_valid: 'Complète valide'`
  (adjectif d'un libellé de statut, pas une instruction).
- `pnpm run qa:front` → lint/typecheck OK, `Test Files 159 passed (159)`,
  `Tests 735 passed (735)`, `Error compliance check passed.`, exit 0.
- Non-régression prouvée par deux matchers de test mis à jour ou déjà en attente :
  `CockpitSolicitationLookup.test.tsx:161` (aligné sur « Saisissez un numéro »)
  et `EntityOnboardingDialog.test.tsx:656`, qui attendait déjà
  `/sélectionnez un établissement pour voir les infos du site/i` dans le worktree
  sale et **échouait avant cette tâche** faute de la conversion source — il passe
  maintenant.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Le produit mélange tutoiement et vouvoiement, parfois dans le même parcours.
Exemple le plus visible, écran de saisie d'interaction (/cockpit) :
- Étape 3 : "Sélectionnez un client via la recherche pour continuer." (vouvoiement)
- Étape 4 : "Avec qui as-tu échangé ?" et "Choisis un contact existant du tiers,
  ou ajoute-en un nouveau." (tutoiement)
Source : frontend/src/components/cockpit/guided/CockpitGuidedStepSwitch.tsx,
lignes 108 et 113.

Mesure : 11 formulations au tutoiement, 20 au vouvoiement.

Autres fichiers au tutoiement :
- components/cockpit/guided/CockpitSolicitationLookup.tsx:296 ("Saisis un numéro")
- components/entity-onboarding/EntityOnboardingIndividualSearchStep.tsx:75
- components/entity-onboarding/EntityOnboardingReviewStep.tsx:160
- components/entity-onboarding/EntityOnboardingSidebar.tsx:172
- components/EntityOnboardingDialog.tsx:475
- components/admin-suppliers/create-wizard/supplier-details-step.tsx:43
- components/admin-suppliers/create-wizard/supplier-review-step.tsx:32
- components/admin-suppliers/create-wizard/supplier-intelligence-aside.tsx:123 et 231

TÂCHE
1. Retiens le VOUVOIEMENT : c'est la forme majoritaire (20 contre 11), et le
   produit s'adresse à des professionnels en contexte de travail. Si tu penses
   que le tutoiement serait meilleur, dis-le mais applique le vouvoiement — le
   choix appartient au PO, la cohérence ne se discute pas.
2. Convertis les 11 formulations. Attention : ne te contente pas de conjuguer,
   relis chaque phrase pour qu'elle sonne naturelle.
3. Passe aussi sur les messages de validation dans shared/schemas/ : ils doivent
   suivre la même forme.
4. Documente la règle en une ligne dans .agents/skills/cir-cockpit-design/SKILL.md,
   section "Product-Owner Rules".

CRITÈRES D'ACCEPTATION
- `rg "as-tu|Choisis |Saisis |Sélectionne |Renseigne |Vérifie |Complète " frontend/src --type tsx`
  ne retourne plus que des faux positifs (noms de variables, commentaires).
- Aucune phrase maladroite issue d'une conversion mécanique.

QA
Lance `pnpm run qa:front`. Fournis la liste avant/après des 11 formulations.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.6" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.6 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.6, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.7 — Textes de remplissage et compteurs fantômes en production

**Statut** ✅ terminée · **Impact** moyen · **Effort** faible · **Dépendance** aucune

**Constat.** `AGENTS.md` interdit le texte décoratif dans le code livré. Deux
violations visibles : le panneau « Notes de parcours » de l'assistant de création
affiche entre guillemets « Le type choisi ajuste tout le reste du parcours. »
(`EntityOnboardingDialog.tsx:222`), et le badge de comptage de la page Clients
affiche littéralement « … résultats » quand le total n'est pas encore connu
(`ClientDirectoryWorkspace.tsx:89`).

**Fichiers.** `components/EntityOnboardingDialog.tsx`,
`components/entity-onboarding/EntityOnboardingSidebar.tsx`,
`components/client-directory/ClientDirectoryWorkspace.tsx`

**Checkpoint**

- [x] Le panneau « Notes de parcours » porte une aide réellement utile, ou n'est
      pas rendu.
- [x] Le badge de comptage affiche un squelette pendant le chargement, jamais
      « … résultats ».
- [x] Une recherche de texte décoratif résiduel est faite sur `frontend/src`.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Captures des deux écrans avant/après.

**Preuve réelle.**

- Panneau supprimé, pas remplacé : le rail droit porte déjà un contenu réel par
  étape (résumé entreprise + établissement + signaux + dirigeants + finances en
  `company`, checklist des champs manquants en `details`, alerte doublons et
  `stepError` en `alert`). La prop `footerMessage` et son calcul à quatre
  branches génériques sont supprimés de
  `frontend/src/components/EntityOnboardingDialog.tsx` et
  `frontend/src/components/entity-onboarding/EntityOnboardingSidebar.tsx`
  (`grep -rn "footerMessage" frontend/src` → 0 résultat).
- Badge de comptage : `<span className="skeleton-shimmer …" aria-hidden>` +
  `aria-busy` tant que `totalResults` n'est pas un nombre, dans
  `client-directory/ClientDirectoryWorkspace.tsx` et, même défaut trouvé au
  balayage, `admin-suppliers/AdminSuppliersPage.tsx`
  (`grep -rnE ">\s*(\.\.\.|…)\s*<|'(\.\.\.|…)'" frontend/src` → plus aucune
  occurrence hors ellipsis de pagination `DirectoryTablePagination.tsx:99`).
- Balayage `frontend/src` : `lorem/ipsum` → 0 ; les `italic` restants sont des
  états vides réels (« Adresse non renseignée », « Aucun sujet saisi ») ; les
  `placeholder="Ex: …"` des wizards fournisseurs restent des indications de
  saisie, signalées non corrigées (voir changelog).
- `pnpm run qa:front` → PASS : `repo:check:local` OK, typecheck OK, lint OK,
  Vitest `159 fichiers / 735 tests` passés, `check-error-compliance` OK
  (exécution du 30/07/2026).
- Captures avant/après non produites : pas de session navigateur lancée pour
  cette tâche ; la preuve est le diff + la sortie QA ci-dessus.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
AGENTS.md pose la règle : "Zéro donnees mockees, hardcodees, TODO non resolus ou
texte decoratif dans le code livre." Deux violations sont visibles en production
locale.

1. Assistant de création de fiche (route /clients/new), étape 1. Le rail droit
   affiche un panneau intitulé "NOTES DE PARCOURS" contenant, entre guillemets :
   « Le type choisi ajuste tout le reste du parcours. »
   Source : frontend/src/components/EntityOnboardingDialog.tsx ligne 222, rendu
   par frontend/src/components/entity-onboarding/EntityOnboardingSidebar.tsx
   ligne 311. C'est une phrase de remplissage qui occupe un panneau entier.

2. Page Clients (route /clients). Le badge à côté du titre "Clients et prospects"
   affiche littéralement "… résultats" tant que le total n'est pas chargé.
   Source : frontend/src/components/client-directory/ClientDirectoryWorkspace.tsx
   ligne 89 : le ternaire retombe sur la chaîne 'résultats' quand totalResults
   n'est pas un nombre.

TÂCHE
1. Panneau "Notes de parcours" : soit il porte une aide contextuelle réellement
   utile et spécifique à l'étape (ce qui suppose du contenu par étape), soit tu
   ne le rends pas du tout quand il n'a rien à dire. Ne remplis pas avec une
   autre phrase générique. Regarde ce que fait le rail sur les étapes suivantes
   avant de trancher.
2. Badge de comptage : pendant le chargement, affiche un squelette
   (classe skeleton-shimmer, déjà définie dans frontend/src/index.css) et non un
   texte. Une fois chargé, affiche le nombre avec l'accord singulier/pluriel déjà
   présent dans le code.
3. Passe rapidement sur frontend/src pour repérer d'autres textes décoratifs du
   même type (phrases entre guillemets, "lorem", "Ex:", placeholders explicatifs
   affichés comme du contenu). Liste ce que tu trouves ; corrige ce qui est
   évident, signale le reste.

CRITÈRES D'ACCEPTATION
- Aucun texte de remplissage rendu comme du contenu.
- Aucun état de chargement rendu sous forme de texte littéral avec des points
  de suspension.

QA
Lance `pnpm run qa:front`. Décris ce que tu as choisi pour le rail droit.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.7" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.7 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.7, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T1.8 — Validation affichée avant toute action

**Statut** ✅ terminée · **Impact** moyen · **Effort** faible · **Dépendance** aucune

**Constat.** À l'arrivée sur l'étape « Contact » du parcours de saisie, le
message « Contact requis » est déjà affiché en rouge alors qu'un contact existe
dans la liste et que l'utilisateur n'a rien tenté. Le message vient du schéma
partagé (`shared/schemas/interaction/interaction.schema.ts:124` et `:212`) ;
c'est le moment de son affichage qui est fautif, pas son contenu.

**Fichiers.** `components/cockpit/guided/`,
`hooks/` (état du formulaire guidé)

**Checkpoint**

- [x] Aucune erreur de validation n'est affichée au montage d'une étape.
- [x] L'erreur apparaît au `blur` d'un champ touché ou à la tentative de passage
      à l'étape suivante.
- [x] Le même contrôle est appliqué aux autres étapes du parcours guidé.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Capture de l'étape Contact au montage, sans erreur.

**Preuve réelle.** Cause identifiée avant correction :
`hooks/interactions/handlers/useInteractionHandlers.ts:40` remet `contact_id` à
vide avec `{ shouldValidate: true }` quand l'utilisateur choisit le tiers à
l'étape 3 ; `trigger('contact_id')` publie alors « Contact requis » dans
`formState.errors`, que `CockpitClientContactSection.tsx:73` rend sans condition
dès le montage de l'étape 4. Déclencheur retenu : la **tentative de passage à
l'étape suivante** (clic sur « Continuer », `Ctrl/⌘ + Entrée`, ou soumission du
formulaire) — le `blur` par champ n'est volontairement pas câblé, il aurait exigé
un `touchedFields` croisé avec la valeur de chaque champ dans six sous-composants
pour honorer « blur sur un champ *renseigné* ». `useCockpitGuidedFlow` expose
`areStepErrorsVisible` / `revealStepErrors` ; `CockpitGuidedEntry` masque
`errors` des deux panneaux tant que l'étape active n'a pas été tentée, ce qui
couvre Canal, Relation, Tiers, Contact et Sujet d'un seul point ; l'étape
Validation garde le comportement existant (elle n'est atteinte que complète et
son `onInvalid` de soumission doit rester visible). Les boutons « Continuer » ne
sont plus `disabled` : au clic sur une étape incomplète ils révèlent l'erreur et
appellent `focusFirstInvalidField` (réutilise `useInteractionInvalidHandler`, qui
place le focus sur le premier champ fautif). Preuves : `pnpm run qa:front` →
exit 0, `Repo state check passed.`, typecheck OK, lint OK,
`Test Files 160 passed (160)`, `Tests 746 passed (746)`,
`Error compliance check passed.` ; tests ajoutés
`CockpitGuidedEntry.test.tsx` → « n affiche aucune erreur au montage de l etape
contact » et « affiche l erreur et demande le focus apres un clic sur
Continuer », `CockpitGuidedStepSwitch.test.tsx` → « revele les erreurs et donne
le focus au premier champ fautif au clic sur Continuer » et « affiche le message
familles produits une fois les erreurs de l etape revelees »,
`useCockpitGuidedFlow.test.tsx` → « masque les erreurs a l arrivee sur une etape
et ne les revele qu apres une tentative » ; régression prouvée en neutralisant le
masque dans `CockpitGuidedEntry.tsx` : `Tests 1 failed | 5 passed (6)` avec
`Contact requis` trouvé au montage. Capture non produite (aucune session
navigateur ouverte), remplacée par ces tests.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`. Si le comportement n'est pas évident,
invoque le skill `systematic-debugging` avant de corriger.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Parcours de saisie d'interaction (route /cockpit), étape "Contact". En arrivant
sur l'étape, un message d'erreur rouge "Contact requis" est DÉJÀ affiché sous la
liste, alors que :
- un contact existe bien dans la liste (il suffit de le sélectionner) ;
- l'utilisateur n'a encore rien tenté.

La validation devance l'utilisateur au lieu de le guider. Une erreur doit
répondre à une action, jamais l'anticiper.

Le message vient de shared/schemas/interaction/interaction.schema.ts (lignes 124
et 212). Le contenu du message n'est pas le problème : c'est le MOMENT de son
affichage, côté frontend, qu'il faut corriger.

TÂCHE
1. Trouve où l'état de validation est calculé et rendu pour le parcours guidé
   (frontend/src/components/cockpit/guided/ et les hooks associés dans
   frontend/src/hooks/). Comprends d'abord le flux avant de modifier.
2. Introduis une notion de champ "touché" ou de tentative de soumission :
   l'erreur ne s'affiche qu'après un blur sur un champ renseigné, ou après un
   clic sur "Continuer".
3. Vérifie les AUTRES étapes du parcours (Canal, Relation, Tiers, Sujet,
   Validation) : le même défaut s'y trouve probablement.
4. Ne change pas les messages ni les schémas Zod partagés.

CRITÈRES D'ACCEPTATION
- Au montage d'une étape, aucune erreur de validation n'est visible.
- Après un clic sur "Continuer" avec un formulaire incomplet, l'erreur apparaît
  et le focus va sur le premier champ fautif.
- Les tests existants du parcours guidé passent toujours
  (frontend/src/components/cockpit/guided/__tests__/).

QA
Lance `pnpm run qa:front`. Décris le déclencheur d'affichage que tu as retenu.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T1.8" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T1.8 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T1.8, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Phase 2 — Refontes structurelles

Ces trois écrans plus la palette ne se réparent pas par retouches : c'est le
modèle d'information qui est en cause. Impact produit maximal.

## T2.1 — Refonte de Pilotage

**Statut** 🟡 partielle · **Impact** très élevé · **Effort** élevé · **Dépendance conseillée** T3.1 (PageHeader)

**Constat.** Un seul dossier réel est rendu six fois sur la page : dans « File
de priorité », dans « Top clients », dans « Dossiers en cours », et son montant
(4 800 €) dans la carte « Pipeline ouvert », dans la barre « Devis envoyé » et
dans la colonne « Montant ». Le graphique consomme 260 px pour deux points de
données, sans axe Y ni graduation. Les 5 cartes KPI n'ont pas la même anatomie
(liseré sur la première seulement, sparkline sur deux seulement, tiret cadratin
comme valeur sur la cinquième). La barre « Devis envoyé » est ambre, c'est-à-dire
`--warning`, pour une étape neutre du pipeline.

**Fichiers.** `frontend/src/components/dashboard/overview/` (8 fichiers),
`frontend/src/hooks/dashboard-state/`,
`frontend/src/utils/dashboard/`

**Checkpoint**

- [x] Chaque dossier n'apparaît qu'une fois sur la page.
- [x] Les cartes KPI partagent une anatomie unique.
- [x] Le graphique n'est rendu qu'au-delà d'un seuil de points ; sinon un delta
      chiffré le remplace.
- [x] Aucune couleur sémantique n'est utilisée pour un état neutre.
- [x] Les badges ne sont jamais tronqués en plein mot.
- [ ] La page remplit la fenêtre à 1440×900 sans zone morte de plus de 120 px.
- [x] `pnpm run qa:front` passe et les tests dashboard existants sont à jour.

**Preuve attendue.** Captures avant/après en 1440×900 et 1280×720.

**Preuve réelle.** Refonte livrée le 2026-07-30 sur données réelles (agence CIR
Bordeaux, 7 dossiers ouverts).

- Panneaux supprimés : `DashboardPriorityQueue.tsx`, `DashboardPipelineSummary.tsx`,
  `DashboardTopClients.tsx`. Leur contenu devient les colonnes `Échéance`, `Étape`
  et `Montant` d'une table unique triable (`priority` / `client` / `stage` /
  `amount`) et filtrable (périmètre `À traiter` ou `Toute la période`, canal).
  Modèle de données : `buildDossierRows` + `selectDossierRows` dans
  `frontend/src/utils/dashboard/dashboardOverview.ts`, une ligne par dossier.
- Bande de métriques : `DashboardKpiRow.tsx` réécrit en 4 cellules `MetricCell`
  strictement identiques (pastille de tonalité, libellé, valeur, précision).
  Aucune sparkline : les quatre métriques ne peuvent pas toutes en porter une.
- Garde du graphique : `hasEnoughEvolutionPoints` exige ≥ 8 semaines chiffrées
  **et** ≥ 3 valeurs distinctes. Sur les données réelles la série vaut 4 800 €
  constants sur 12 semaines, donc la courbe n'est pas rendue et le delta chiffré
  `stable sur 4 sem.` (`buildOpenDossiersDelta`) la remplace dans la métrique
  « Dossiers ouverts ». Le tracé conservé porte axe Y gradué, grille discrète,
  points terminaux accentués et infobulle au survol.
- Couleurs : `STAGE_DOT_CLASSES` passe `quote_sent` de `bg-warning` à
  `bg-foreground/70` ; `--success` et `--destructive` ne restent que sur
  gagné / perdu / retard.
- Troncature : `shortenBadgeLabel` coupe à la source sur frontière de mot et
  retire les mots-outils terminaux ; `title` porte le libellé complet.
  « Attente éléments du client » → « Attente éléments… ».
- Tests ajoutés (`frontend/src/utils/dashboard/__tests__/dashboardOverview.test.ts`) :
  `buildDossierRows` « produit exactement une ligne par dossier et qualifie son
  urgence », `selectDossierRows` « ajoute les dossiers clos de la periode sans
  jamais dupliquer une ligne », `hasEnoughEvolutionPoints` « refuse une serie
  plate : douze fois le meme montant reste un seul fait », `shortenBadgeLabel`
  « ne termine pas un libelle raccourci sur un mot-outil ».
  Tests ajoutés (`frontend/src/hooks/__tests__/useDashboardState.test.tsx`) :
  « filtre la table par canal et n y laisse aucun doublon », « inverse le tri au
  second clic sur la meme colonne », « masque la courbe tant que la serie
  hebdomadaire est trop courte ».
- Commande : `pnpm run qa:front` → `Test Files 160 passed (160)`,
  `Tests 762 passed (762)`, typecheck, eslint `--max-warnings 0`,
  `repo:check:local` et `check-error-compliance` verts (2026-07-30, 18:45).
- Captures avant/après 1440×900 et 1280×720 produites par Playwright sur le
  serveur `pnpm --dir frontend run dev` :
  `%TEMP%/claude/C--GitHub-CIR-Cockpit-CIR-Cockpit/dc010bdd-b064-44bd-b523-f6e93e0ffebd/scratchpad/shots/`
  (`avant-1440x900.png`, `avant-1280x720.png`, `apres-1440x900.png`,
  `apres-1280x720.png`).

**Reste ouvert.** La case « zone morte ≤ 120 px » n'est pas cochée : à 1280×720
le vide sous la dernière ligne mesure ≈ 65 px, mais à 1440×900 avec seulement
7 dossiers réels il atteint ≈ 250 px à l'intérieur de la table. La table est
volontairement étirée jusqu'au pied de page, comme la table de
`/remises/referentiels` qui sert de référence de densité et se comporte de la
même façon. Combler ce vide supposerait soit de réintroduire un panneau — ce que
la refonte élimine — soit de laisser la table se dimensionner au contenu, ce qui
déplacerait le vide sur le fond de page. Décision à trancher par le PO.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `vercel-react-best-practices`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000) ; regarde
le rendu réel avant et après.
Contraintes : minimum utile hors périmètre de la page, worktree sale respecté,
zéro donnée mockée, UI en français.

CONTEXTE
Page Pilotage, route /dashboard, rendue par
frontend/src/components/dashboard/overview/ (DashboardOverviewHeader,
DashboardKpiRow, DashboardEvolutionChart, DashboardPriorityQueue,
DashboardPipelineSummary, DashboardTopClients, DashboardDossiersTable).

Problèmes constatés sur données réelles :

1. REDONDANCE. Un seul dossier ("Sollicitation / Appel publicitaire pour proposer
   une offre fournisseur", 4 800 €) est rendu SIX fois : dans "File de priorité",
   dans "Top clients", dans "Dossiers en cours", et son montant dans la carte KPI
   "Pipeline ouvert", dans la barre "Devis envoyé" et dans la colonne "Montant".
   La page ne synthétise pas, elle duplique.

2. GRAPHIQUE VIDE. "Évolution du pipeline & du gagné" occupe 260px de hauteur
   pour deux points de données. Pas d'axe Y, pas de graduation, pas de repère.
   Une ligne rouge monte de S19 à S21 puis reste plate ; la ligne verte est à
   zéro sur toute la largeur. Le remplissage rose couvre 80% du panneau.

3. CARTES HÉTÉROGÈNES. Les 5 cartes KPI n'ont pas la même anatomie : liseré rouge
   à gauche sur la première seulement, sparkline sur la 3e et la 4e seulement,
   tiret cadratin comme valeur sur la 5e.

4. SÉMANTIQUE DE COULEUR. La barre "Devis envoyé" est ambre (--warning) alors
   qu'un devis envoyé est une étape normale, pas un avertissement. Trois barres
   sur quatre valent 0 et affichent une piste grise vide.

5. TRONCATURE. Le badge "ATTENTE ÉLÉMENT…" est coupé en plein mot alors que la
   colonne est large.

6. GRILLE. Trois systèmes de grille empilés (5 colonnes / 1 colonne / 3 colonnes
   inégales), la troisième colonne ayant une ligne de contenu et 250px de vide.

TÂCHE
Refonds la page autour d'UNE question : "qu'est-ce que je dois traiter
maintenant ?".

1. Chaque dossier apparaît exactement une fois. Ce qui était dupliqué en panneaux
   devient des colonnes d'une table unique, triable et filtrable.
2. Remplace la rangée de cartes KPI par une bande de 3 à 4 métriques compactes,
   anatomie identique pour toutes. Ne conserve une sparkline que si TOUTES les
   métriques peuvent en avoir une.
3. Le graphique n'est rendu que s'il y a au moins 8 points de données réels.
   En dessous, affiche un delta chiffré ("+1 dossier sur 30 j"). Si tu le
   conserves : axe Y avec graduations, point terminal accentué, grille discrète,
   infobulle au survol.
4. Réserve --warning, --success et --destructive aux états qui le méritent. Une
   étape de pipeline neutre utilise un neutre.
5. Aucun badge tronqué : soit le contenu tient, soit il est raccourci à la source
   avec une infobulle.
6. Une seule grille cohérente. La page doit remplir la fenêtre à 1440x900 sans
   zone morte de plus de 120px.

CRITÈRES D'ACCEPTATION
- Zéro donnée dupliquée entre panneaux.
- Densité comparable à la page Référentiels CIR (/remises/referentiels), qui est
  la référence de densité du produit — va la regarder.
- États vides, chargement (classe skeleton-shimmer) et erreur tous traités.
- Tests existants mis à jour : frontend/src/utils/dashboard/__tests__/ et
  frontend/src/hooks/__tests__/useDashboardState.test.tsx.

QA
Lance `pnpm run qa:front`. Fournis des captures avant/après en 1440x900 et
1280x720.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T2.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T2.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T2.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T2.2 — Refonte du parcours de saisie

**Statut** ✅ terminée · **Impact** très élevé · **Effort** élevé · **Dépendance conseillée** T1.8

**Constat.** La position dans le parcours est communiquée trois fois
simultanément : le stepper (`CANAL / RELATION / TIERS / CONTACT / SUJET /
VALIDATION`), un récapitulatif qui répète les valeurs des étapes franchies, puis
un bloc « ÉTAPE 3 » avec le titre. Aucun des trois ne se suffit à lui-même. Le
rail droit est vide sur 450 px et se termine par trois boutons icône sans
libellé. La page compte 15 libellés en capitales espacées.

**Fichiers.** `frontend/src/components/cockpit/`,
`frontend/src/components/cockpit/guided/`,
`frontend/src/components/cockpit/left/`,
`frontend/src/components/cockpit/right/`

**Checkpoint**

- [x] Un seul dispositif de progression, cliquable pour revenir en arrière.
- [x] Le rail contextuel n'est rendu que lorsqu'il a du contenu.
- [x] Les boutons icône du rail ont un libellé ou une infobulle.
- [x] Les capitales sont réservées à l'eyebrow de section.
- [x] Le bouton désactivé n'annonce pas de raccourci clavier.
- [x] `pnpm run qa:front` passe.

**Preuve attendue.** Captures des étapes 1 à 6 avant/après.

**Preuve réelle.** `pnpm run qa:front` → exit 0 : `Repo state check passed.`,
typecheck OK, lint `--max-warnings 0` OK, `Test Files 160 passed (160)`,
`Tests 763 passed (763)`, `Error compliance check passed.` (30/07/2026, 19:37).
Tests ajoutés dans
`frontend/src/components/cockpit/guided/__tests__/CockpitGuidedEntry.test.tsx` —
« porte la valeur choisie dans le stepper sans recapitulatif ni bloc etape »,
« permet de revenir sur une etape franchie depuis le stepper », « laisse les
etapes non franchies non cliquables » — et assertion d'état neutre ajoutée dans
`frontend/src/components/cockpit/__tests__/CockpitShortcutLegend.test.tsx`
(`bg-secondary` présent, `bg-primary` absent, aucun `Ctrl ↵` sur le bouton
désactivé). Parcours des 6 étapes rejoué dans Chrome sur
`pnpm --dir frontend run dev` (1440×900), captures avant/après dans
`scratchpad/shots/` : `before-1-canal.png` … `before-6-validation.png` et
`after-1-canal.png` … `after-6-validation.png`. Rail droit mesuré après refonte
sur l'étape Contact (`getBoundingClientRect` dans la page) : hauteur 404 px,
espace résiduel 30 px, plus grand écart interne 48 px — contre 463 px de vide
avant. `CockpitGuidedAnswerRow.tsx` supprimé (récapitulatif retiré) ainsi que
ses deux tests dans `CockpitGuidedStepSwitch.test.tsx` ; l'assertion
« Continuer affiche Ctrl Entrée » sur une étape incomplète y est inversée,
puisqu'elle encodait le comportement corrigé par le point 4.

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `vercel-composition-patterns`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000) ; parcours
les 6 étapes réellement avant de modifier quoi que ce soit.
Contraintes : minimum utile, worktree sale respecté, UI en français, vouvoiement.

CONTEXTE
Écran de saisie d'interaction, route /cockpit. C'est le geste quotidien central
du produit. Composants dans frontend/src/components/cockpit/ (sous-dossiers
guided/, left/, right/).

Problèmes constatés :

1. TRIPLE REDONDANCE DE PROGRESSION. La position dans le parcours est annoncée
   trois fois sur le même écran :
   - un stepper en onglets soulignés : CANAL / RELATION / TIERS / CONTACT /
     SUJET / VALIDATION ;
   - juste en dessous, un récapitulatif qui répète "CANAL — Téléphone",
     "RELATION — Client à terme", "TIERS — AQUITAINE ELECTRIQUE" ;
   - puis un bloc "ÉTAPE 3" suivi du titre de l'étape.
   Aucun des trois ne se suffit à lui-même.

2. RAIL DROIT VIDE. À l'étape Contact, le rail droit affiche une fiche client
   puis "Interactions du client (1)", puis 450px de vide, puis trois boutons
   icône sans libellé (document, téléphone, enveloppe) collés en bas.

3. TEXTURE EN CAPITALES. 15 libellés en capitales espacées sur un seul écran :
   NOUVELLE INTERACTION, CANAL, RELATION, TIERS, CONTACT, SUJET, VALIDATION,
   RECOMMENCER, LOCALISATION, COMPTE, SIREN, SIRET, NAF, PAYS, INTERACTIONS DU
   CLIENT. Les capitales cessent de hiérarchiser dès qu'elles sont la texture
   dominante.

4. BOUTON DÉSACTIVÉ TROMPEUR. "Continuer" est grisé mais affiche le raccourci
   "Ctrl Entrée". De plus le primaire désactivé est rendu en rouge délavé, donc
   indiscernable d'un primaire actif à faible contraste.

5. MONO MAL PLACÉ. La police monospace est utilisée pour le rôle d'une personne
   ("Directeur") et pour des libellés de prose. Elle est réservée aux
   identifiants, codes et nombres.

TÂCHE
1. Un seul dispositif de progression. Garde le stepper, rends-le cliquable pour
   revenir sur une étape franchie, et affiche la valeur choisie DANS l'étape du
   stepper. Le récapitulatif et le bloc "ÉTAPE n" disparaissent.
2. Le rail droit n'est rendu que lorsqu'il a du contenu. Quand il est rendu, il
   ne laisse pas 450px de vide : soit le contenu s'étire, soit le rail se réduit.
   Les trois boutons icône reçoivent un libellé visible ou une infobulle
   (composant Tooltip disponible dans components/ui/feedback/Tooltip.tsx).
3. Réduis les capitales à l'eyebrow de section. Le reste passe en casse phrase
   avec du contraste de poids et de couleur.
4. Le bouton désactivé n'affiche pas de raccourci. Traite l'état désactivé comme
   un état à part entière (fond neutre, pas de primaire délavé).
5. Corrige les usages de font-mono sur de la prose.

CRITÈRES D'ACCEPTATION
- Un seul indicateur de progression sur l'écran.
- Le parcours reste complet et fonctionnel de bout en bout (6 étapes) : teste-le
  réellement dans le navigateur.
- Aucune zone morte de plus de 120px.
- Les tests existants passent : frontend/src/components/cockpit/guided/__tests__/.

QA
Lance `pnpm run qa:front`. Fournis des captures des 6 étapes avant/après.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T2.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T2.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T2.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T2.3 — Refonte de l'administration des utilisateurs

**Statut** ⬜ non commencée · **Impact** élevé · **Effort** moyen · **Dépendance conseillée** T3.1, T3.3

**Constat.** Trois cartes KPI géantes affichent « 2 », « 2 » et « 0 » au-dessus
d'un tableau de deux lignes, avec des pastilles d'icônes décoratives. Le rôle
d'un utilisateur se change par un select inline sans libellé ni confirmation.
Chaque ligne offre quatre affordances d'action concurrentes : case à cocher,
select inline, bouton « Modifier » dans une cellule, menu « ⋮ ». La case à cocher
n'ouvre aucune barre d'actions groupées.

**Fichiers.** `frontend/src/components/users/`,
`frontend/src/components/AdminPanel.tsx` (ou équivalent)

**Checkpoint**

- [ ] Les cartes KPI sont supprimées ou remplacées par une ligne de métriques.
- [ ] Le changement de rôle exige une confirmation explicite.
- [ ] Une seule grammaire d'action par ligne.
- [ ] La sélection multiple ouvre une barre d'actions groupées, ou la case à
      cocher est supprimée.
- [ ] `pnpm run qa:front` passe.

**Preuve attendue.** Captures avant/après + dialogue de changement de rôle.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000), onglet
Admin > Utilisateurs.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Route /admin, onglet "Utilisateurs". Composants dans
frontend/src/components/users/ (UsersManagerHeader.tsx, UsersManagerList.tsx et
voisins).

Problèmes constatés :

1. DENSITÉ INVERSÉE. Trois cartes KPI de 90px de haut affichent "TOTAL 2",
   "ACTIFS 2", "ARCHIVÉS 0", chacune avec une pastille d'icône décorative, au
   dessus d'un tableau de DEUX lignes. Les cartes occupent la surface d'une
   dizaine de lignes de tableau pour trois nombres à un chiffre.

2. ACTION À CONSÉQUENCE SANS GARDE-FOU. Le rôle d'un utilisateur (TCS,
   Admin agence, Super admin) se change par un menu déroulant sans libellé,
   directement dans une cellule du tableau, sans confirmation. Passer quelqu'un
   en Super admin est une élévation de privilège en un geste.

3. QUATRE AFFORDANCES CONCURRENTES PAR LIGNE. Case à cocher, select inline pour
   le rôle, bouton "Modifier" dans la cellule Agences, et menu "⋮" en fin de
   ligne. L'utilisateur ne sait pas où agir.

4. SÉLECTION SANS DESTINATION. La case à cocher n'ouvre aucune barre d'actions
   groupées.

TÂCHE
1. Supprime les trois cartes KPI. Si le comptage est utile, mets-le en une ligne
   de texte compacte près du titre (par exemple "2 utilisateurs · 2 actifs ·
   0 archivé"). Pas de pastille d'icône décorative.
2. Le changement de rôle passe par une confirmation explicite qui nomme
   l'utilisateur, l'ancien rôle et le nouveau, et rappelle ce que le nouveau rôle
   autorise. Le composant AlertDialog existe dans
   components/ui/feedback/AlertDialog.tsx.
3. Unifie la grammaire d'action : une seule voie par ligne. Ma recommandation :
   tout passe par le menu "⋮" (Modifier le rôle, Gérer les agences, Archiver),
   et le tableau redevient de la lecture. Si tu diverges, justifie.
4. Soit la case à cocher ouvre une barre d'actions groupées quand au moins une
   ligne est sélectionnée, soit tu la supprimes. Ne laisse pas une sélection
   sans destination.
5. Le tableau doit s'étirer jusqu'au bas de la fenêtre ; il s'arrête aujourd'hui
   à mi-hauteur avec 300px de vide en dessous.

CRITÈRES D'ACCEPTATION
- Aucune élévation de privilège possible sans confirmation nommée.
- Une seule voie d'action par ligne.
- Densité comparable à la page Référentiels CIR (/remises/referentiels), qui est
  la référence du produit.
- États vides, chargement et erreur traités.

QA
Lance `pnpm run qa:front`. Fournis les captures avant/après et le libellé exact
du dialogue de changement de rôle.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T2.3" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T2.3 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T2.3, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T2.4 — Palette Ctrl K : de la recherche aux commandes

**Statut** ⬜ non commencée · **Impact** élevé · **Effort** moyen · **Dépendance** aucune

**Constat.** La règle projet dit que « le motif palette de commandes est l'entrée
privilégiée pour la navigation et les actions globales ». En l'état, la palette
ne fait que chercher : aucune action, aucune navigation, aucun élément récent
(alors que le composant `InteractionSearchRecents.tsx` existe déjà). Les préfixes
de filtre sont cryptiques et non documentés — `@ Contact`, `# Interaction`,
`! Client`, le `!` signalant habituellement l'urgence ou la négation. L'état vide
est une phrase grise avec une faute d'accent sur 90 px de haut.

**Fichiers.** `frontend/src/components/AppSearchOverlay.tsx`,
`frontend/src/components/interaction-search/` (11 fichiers)

**Checkpoint**

- [ ] La palette expose des actions (créer un client, nouvelle interaction) et
      la navigation vers les 7 sections.
- [ ] Les éléments récents s'affichent à l'ouverture, avant toute frappe.
- [ ] Les préfixes de filtre sont cohérents et découvrables.
- [ ] L'état vide propose quelque chose plutôt que d'attendre.
- [ ] Navigation clavier complète : flèches, Entrée, Escape, Tab.
- [ ] `pnpm run qa:front` passe.

**Preuve attendue.** Captures de la palette à l'ouverture, en recherche, en
mode action.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000) ; ouvre la
palette avec Ctrl+K avant de modifier.
Contraintes : minimum utile, worktree sale respecté, UI en français, vouvoiement.

CONTEXTE
La palette Ctrl+K est rendue par frontend/src/components/AppSearchOverlay.tsx et
frontend/src/components/interaction-search/ (11 fichiers : InteractionSearchBar,
InteractionSearchInput, InteractionSearchListArea, InteractionSearchRecents,
InteractionSearchResults, InteractionSearchFooter...).

Le skill projet `cir-cockpit-design` pose la règle : "Command-palette pattern
(Ctrl+K style) is the preferred entry for global navigation/actions." En l'état
ce n'est qu'une recherche.

Problèmes constatés :

1. AUCUNE ACTION. On ne peut pas créer un client, lancer une interaction ni
   naviguer vers Pilotage depuis la palette. Les seuls filtres sont Contact,
   Interaction et Client — trois types d'entités, aucune commande.

2. AUCUN RÉCENT À L'OUVERTURE. L'état initial est une phrase grise :
   "Commencez a taper pour rechercher…" (avec une faute d'accent sur "à", lignes
   107 et 234 de AppSearchOverlay.tsx). Or le composant InteractionSearchRecents
   existe déjà et l'écran de saisie affiche bien une liste "Récents" exploitable.

3. PRÉFIXES CRYPTIQUES. Les chips de filtre affichent "@ Contact",
   "# Interaction", "! Client". Le "!" pour Client est contre-intuitif : il
   signale habituellement l'urgence ou la négation. Rien n'explique si taper "@"
   dans le champ active le filtre.

4. DEUX PARADIGMES DE RECHERCHE À L'ÉCRAN. Ctrl+K en global, "/" pour filtrer
   sur Pilotage.

TÂCHE
1. Ajoute un registre de commandes : navigation vers les 7 sections
   (voir buildShellNavigation dans frontend/src/app/appConstants.tsx pour la
   liste et les raccourcis F1-F8), plus les actions de création déjà existantes
   dans le produit. N'invente pas d'action qui n'existe pas.
2. Affiche les récents à l'ouverture, avant toute frappe, en réutilisant
   InteractionSearchRecents.
3. Rends les préfixes cohérents et découvrables : montre-les dans le pied de
   dialogue et fais-les fonctionner à la frappe. Remplace "!" par un signe qui ne
   signifie pas l'urgence.
4. L'état vide (recherche sans résultat) propose une sortie : créer la fiche
   correspondante, élargir aux archivés, effacer les filtres.
5. Corrige la faute d'accent "Commencez a taper" -> "Commencez à taper".
6. Vérifie le parcours clavier complet : flèches haut/bas, Entrée, Escape, Tab,
   et le retour du focus au déclencheur à la fermeture.

CRITÈRES D'ACCEPTATION
- Ctrl+K permet d'atteindre n'importe quelle section sans souris.
- Les récents sont visibles à l'ouverture.
- Aucun sigle non expliqué.
- Le dialogue reste centré (règle PO : pas de panneau latéral).

QA
Lance `pnpm run qa:front`. Fournis des captures de la palette à l'ouverture, en
recherche, et en mode action.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T2.4" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T2.4 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T2.4, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Phase 3 — Fondation du design system

Sans ces primitifs, chaque écran ré-improvise. C'est la cause mécanique de toute
la divergence constatée. À faire avant ou en parallèle des refontes, jamais après.

## T3.1 — Composant `PageHeader` partagé

**Statut** ⬜ non commencée · **Impact** élevé · **Effort** moyen · **Dépendance** aucune

**Constat.** Six anatomies d'en-tête pour six pages, et 14 composants nommés
`*Header.tsx` dans l'arborescence, aucun partagé. Tailles de titre relevées :
`text-lg` (17 usages), `text-xl` (7), `text-2xl` (14), plus `text-[28px]`,
`text-[22px]`, `text-[20px]`, `text-[17px]`.

**Checkpoint**

- [ ] Un composant `PageHeader` couvre : eyebrow, titre, sous-titre, méta
      inline, actions, onglets, état de chargement.
- [ ] Les 6 pages principales l'utilisent.
- [ ] Une seule taille de titre de page subsiste.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `vercel-composition-patterns`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Six pages, six anatomies d'en-tête différentes. Va les regarder toutes avant
d'écrire du code :

- /cockpit ............ aucun en-tête de page
- /dashboard .......... titre 24px + sous-titre daté + barre d'outils inline
- /clients ............ titre 20px + badge de comptage + bouton à droite
- /remises/referentiels titre 24px + pastille d'état + bande de statistiques + onglets
- /admin .............. titre 30px gras + phrase de description + onglets + UN SECOND
                        en-tête ("Utilisateurs / Gestion des acces...") + boutons
- /settings ........... eyebrow en capitales + titre inline dans une bande bordée
                        + une instruction tronquée à droite

Il existe 14 composants nommés *Header.tsx dans frontend/src/components/, aucun
partagé : AgenciesManagerHeader, AuditLogsHeader, ChangePasswordHeader,
ClientDetailHeader, ClientFormHeader, CockpitFormHeader, ContactFormHeader,
DashboardOverviewHeader, InteractionDetailsHeader, ProspectDetailHeader,
ProspectFormHeader, SettingsHeader, UsersManagerHeader.

Tailles de titre relevées : text-lg (17 usages), text-xl (7), text-2xl (14),
plus text-[28px], text-[22px], text-[20px], text-[17px].

TÂCHE
1. Crée un composant PageHeader dans frontend/src/components/ui/ (choisis le
   sous-dossier cohérent avec l'organisation existante : data-display/,
   feedback/, inputs/, navigation/). Utilise la composition (sous-composants ou
   slots), pas une explosion de props booléennes — le skill
   `vercel-composition-patterns` couvre ce point.
   Il doit couvrir : eyebrow optionnel, titre, sous-titre optionnel, bande de
   méta inline optionnelle, zone d'actions à droite, zone d'onglets en dessous,
   état de chargement (classe skeleton-shimmer, définie dans index.css).
2. Fixe UNE taille de titre de page et une seule. Regarde la page Référentiels
   CIR : c'est la référence de densité du produit.
3. Migre les 6 pages principales dessus. Ne migre pas les en-têtes de dialogue
   ni de formulaire : ce n'est pas le même objet.
4. Supprime les composants *Header.tsx devenus vides ou redondants.
5. Cas particulier /admin : il a DEUX en-têtes empilés. Décide lequel survit et
   dis pourquoi.

CRITÈRES D'ACCEPTATION
- Les 6 pages ont la même anatomie d'en-tête et la même hauteur de bande.
- Une seule taille de titre de page dans tout le produit.
- L'instruction tronquée de /settings ne l'est plus.
- Les tests existants passent ; mets à jour ceux qui ciblent les anciens en-têtes.

QA
Lance `pnpm run qa:front`. Fournis les 6 captures avant/après.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T3.2 — Composant `Pagination` partagé

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** faible · **Dépendance** aucune

**Constat.** Trois modèles de pagination : numéroté avec « « Précédent 1 2
Suivant » (Clients), « Précédent Page 1 / 185 Suivant » (Référentiels),
« Affichage 1-50 sur 9 248 » avec un `<select>` natif non stylé. Sur Clients, le
libellé « 1-50 » s'affiche pour 4 lignes.

**Checkpoint**

- [ ] Un composant `Pagination` unique, incluant le sélecteur de taille de page.
- [ ] Le sélecteur de taille utilise le composant `Select`, pas un `<select>` natif.
- [ ] Le libellé de plage reflète le nombre réel de lignes.
- [ ] Les 3 tables principales l'utilisent.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Trois modèles de pagination coexistent dans le produit :

1. /clients : "1-50 | Lignes [50 v] | « | Précédent | [1] [2] | Suivant".
   Le libellé affiche "1-50" alors que le tableau ne contient que 4 lignes.
   Composant : frontend/src/components/client-directory/.

2. /remises/referentiels : "Affichage 1-50 sur 9 248 | Lignes : [50 v] |
   Précédent | Page 1 / 185 | Suivant". Le "Lignes :" est un <select> NATIF non
   stylé (frontend/src/components/pricing-references/components/table/pagination-bar.tsx
   ligne 45) qui se distingue visuellement du composant Select utilisé juste au
   dessus dans la même barre d'outils. Le bouton "Suivant" est mis en avant comme
   s'il était l'action principale.

3. Les autres tables n'ont pas de pagination du tout.

TÂCHE
1. Crée un composant Pagination unique dans frontend/src/components/ui/. Il
   inclut : le libellé de plage, le sélecteur de taille de page, et les contrôles
   de navigation.
2. Le sélecteur de taille utilise le composant Select de
   frontend/src/components/ui/inputs/selects/Select.tsx, jamais un <select> natif.
3. Le libellé de plage doit refléter le nombre RÉEL de lignes affichées
   ("1-4 sur 4"), jamais la taille de page théorique.
4. Aucun bouton de navigation n'est traité comme une action principale :
   "Précédent" et "Suivant" ont le même poids.
5. Migre /clients et /remises/referentiels dessus.
6. Tranche entre pagination numérotée et "Page n / N" — une seule des deux
   subsiste. Justifie ton choix (indice : 185 pages ne se numérotent pas).

CRITÈRES D'ACCEPTATION
- Un seul modèle de pagination dans le produit.
- Plus aucun <select> natif dans les barres de pagination.
- Le libellé de plage est exact dans tous les cas, y compris page unique et
  résultat vide.

QA
Lance `pnpm run qa:front`. Fournis les captures des deux barres avant/après.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T3.3 — Composant `EmptyState` partagé

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** faible · **Dépendance** aucune

**Constat.** Les états vides sont improvisés partout : « Non renseigné » comme
valeur sur la fiche client sans action pour ajouter un contact, une phrase grise
de 90 px dans la palette Ctrl K, un tiret cadratin comme valeur de KPI sur
Pilotage, une boîte en pointillés de 400×780 px sur l'assistant de création.
Certaines cellules vides ne rendent rien, d'autres un tiret.

**Checkpoint**

- [ ] Un composant `EmptyState` unique : icône optionnelle, titre, explication,
      action.
- [ ] Une convention unique de cellule vide dans les tableaux.
- [ ] Les 6 états vides identifiés sont migrés.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté, UI en français, vouvoiement.

CONTEXTE
Les états vides du produit sont improvisés écran par écran, et la plupart
n'offrent aucune sortie à l'utilisateur :

1. /clients/:id : la carte "CONTACT PRINCIPAL" affiche "Non renseigné" comme si
   c'était une valeur, sans aucun bouton pour ajouter un contact — alors qu'un
   onglet "Contacts" existe juste au dessus.
2. Palette Ctrl+K : une phrase grise "Commencez a taper pour rechercher…" sur
   90px de haut, sans suggestion ni récent.
3. /dashboard : la carte KPI "TAUX CONVERSION" affiche un tiret cadratin comme
   valeur, avec "0 gagnés / 0 perdus" en dessous.
4. /clients/new : le rail droit affiche une boîte en pointillés de 400x780px avec
   "Sélectionnez une entreprise pour voir son intelligence commerciale".
5. /clients : les cellules Ville et Département vides ne rendent RIEN, alors que
   /dashboard rend un tiret cadratin pour la même situation.
6. Divers panneaux affichent un texte gris centré sans action.

TÂCHE
1. Crée un composant EmptyState dans frontend/src/components/ui/ : icône
   optionnelle, titre, explication d'une ligne, action principale optionnelle,
   et une variante compacte pour les cellules et petits panneaux.
2. Fixe UNE convention de cellule vide dans les tableaux (mon conseil : un tiret
   cadratin en muted-foreground, jamais du vide, pour que l'utilisateur
   distingue "pas de donnée" de "colonne mal alignée"). Applique-la partout.
3. Migre les 6 cas ci-dessus. Chaque état vide doit proposer une sortie quand
   elle existe réellement dans le produit : "Ajouter un contact" doit vraiment
   ouvrir la création de contact. N'invente aucune action.
4. Règle spéciale rail droit : quand un rail contextuel n'a rien à montrer, ne le
   rends pas du tout plutôt que d'afficher une boîte vide de 780px.

CRITÈRES D'ACCEPTATION
- Un seul composant pour tous les états vides.
- Une seule convention de cellule vide.
- Aucun état vide sans explication de ce qu'il faut faire.

QA
Lance `pnpm run qa:front`. Liste les emplacements migrés.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.3" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.3 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.3, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T3.4 — Primitifs de formulaire manquants

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance** aucune

**Constat.** `components/ui/` compte 28 fichiers mais n'a ni `Label`, ni
`Checkbox`, ni `RadioGroup`, ni `Separator`, ni `Alert`. Conséquence visible :
les choix uniques de l'assistant de création sont rendus avec une coche
(métaphore case à cocher) au lieu d'un point radio.

**Checkpoint**

- [ ] `Label`, `Checkbox`, `RadioGroup`, `Separator`, `Alert` créés.
- [ ] Les choix uniques utilisent une métaphore radio.
- [ ] Les cases à cocher ad hoc de l'admin sont migrées.
- [ ] Les libellés sont correctement associés à leurs champs.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `web-design-guidelines`.
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Le dossier frontend/src/components/ui/ contient 28 fichiers organisés en
data-display/, feedback/, inputs/basic/, inputs/selects/, navigation/. Il manque
des primitifs de base, ce qui force chaque écran à improviser :

Manquants : Label, Checkbox, RadioGroup, Separator, Alert.

Conséquences visibles :
- Assistant de création de fiche (/clients/new, étape 1) : les choix UNIQUES
  ("Prospect" ou "Client", "Societe" ou "Particulier") sont rendus avec un cercle
  rempli portant une COCHE. La coche est la métaphore de la case à cocher (choix
  multiple), pas du bouton radio (choix unique). Le composant est dans
  frontend/src/components/entity-onboarding/.
- /admin > Utilisateurs : des cases à cocher ad hoc dans le tableau.
- Des libellés de champ écrits en <p> ou <span> sans association au champ, donc
  invisibles pour les lecteurs d'écran et non cliquables.

TÂCHE
1. Crée Label, Checkbox, RadioGroup, Separator et Alert en suivant les idiomes
   des primitifs existants (regarde Switch.tsx, Toggle.tsx et Select.tsx pour le
   style, les variantes de densité et la gestion du focus). Radix UI est déjà
   utilisé dans le projet : reste cohérent.
2. Corrige la métaphore de l'assistant de création : point radio pour un choix
   unique, jamais une coche.
3. Migre les cases à cocher ad hoc de /admin.
4. Passe sur les libellés de champ : chaque champ a un Label associé via htmlFor
   ou par imbrication. Cliquer le libellé doit donner le focus au champ.
5. Ne fais PAS de refonte visuelle des formulaires : tu poses les primitifs et
   tu migres l'existant à l'identique visuellement.

CRITÈRES D'ACCEPTATION
- Les 5 primitifs existent, sont typés, et suivent les tokens du produit.
- Aucun choix unique rendu avec une coche.
- Chaque libellé de champ est cliquable et associé.
- Le focus clavier est visible sur chaque nouveau primitif.

QA
Lance `pnpm run qa:front`. Liste les primitifs créés et les emplacements migrés.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.4" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.4 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.4, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T3.5 — Échelle typographique figée

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance conseillée** T1.4

**Constat.** 17 tailles arbitraires coexistent, de `text-[8px]` à `text-[28px]`,
dont `text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]`. Les deux
plus utilisées, `text-[10px]` (259) et `text-[11px]` (230), sont plus petites que
la taille de base déclarée du produit (13 px).

**Checkpoint**

- [ ] Une échelle de 6 pas maximum est définie dans `tailwind.config.cjs`.
- [ ] Plus aucun `text-[...px]` arbitraire dans `frontend/src`.
- [ ] L'échelle est documentée dans le skill `cir-cockpit-design`.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
17 tailles de police arbitraires coexistent dans frontend/src, exprimées en
valeurs arbitraires Tailwind text-[Npx]. Décompte exact :

  text-[10px] .. 259      text-[9.5px] .. 2
  text-[11px] .. 230      text-[8px] .... 2
  text-[13px] ... 49      text-[15px] ... 2
  text-[9px] .... 47      text-[28px] ... 1
  text-[12px] ... 22      text-[22px] ... 1
  text-[10.5px] . 15      text-[20px] ... 1
  text-[11.5px] . 11      text-[17px] ... 1
  text-[12.5px] .. 9
  text-[13.5px] .. 5
  text-[14px] .... 3

La taille de base déclarée du produit est 13px (frontend/src/index.css, body).
Les deux tailles dominantes sont donc PLUS PETITES que la base.

Il n'existe aucune échelle typographique nommée : tailwind.config.cjs n'étend pas
fontSize.

TÂCHE
1. Définis une échelle de 6 pas maximum dans frontend/tailwind.config.cjs
   (extend.fontSize), avec des noms parlants et une line-height par pas. Le
   produit est un SaaS dense : ne l'aère pas, structure-le. Plancher à 11px.
2. Mappe les 17 tailles arbitraires vers les 6 pas. Les demi-pixels
   (10.5, 11.5, 12.5, 13.5) disparaissent : ils n'apportent rien et empêchent
   l'alignement sur la grille de 4px.
3. Remplace toutes les occurrences dans frontend/src.
4. Vérifie visuellement les écrans les plus denses : /remises/referentiels,
   /dashboard, /cockpit, /clients. Cherche les débordements et troncatures
   nouvelles.
5. Documente l'échelle dans .agents/skills/cir-cockpit-design/SKILL.md.

CRITÈRES D'ACCEPTATION
- `rg 'text-\[[0-9.]+px\]' frontend/src` ne retourne rien.
- Aucun pas en dessous de 11px.
- La densité globale est préservée : compare le nombre de lignes visibles avant
  et après sur /remises/referentiels.

QA
Lance `pnpm run qa:front`. Fournis le tableau de correspondance
ancienne taille -> nouveau pas, et des captures avant/après des 4 écrans denses.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.5" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.5 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.5, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T3.6 — Garde-fou ESLint contre la divergence

**Statut** ⬜ non commencée · **Impact** élevé (préventif) · **Effort** faible · **Dépendance conseillée**
T3.5, T4.1, T4.2, T4.3

**Constat.** Aucune règle n'empêche mécaniquement un nouvel écran de repartir
hors système. C'est la cause racine de tout l'audit.

**Checkpoint**

- [ ] Les classes de palette Tailwind brutes sont interdites.
- [ ] `shadow-md` et au-delà sont interdits.
- [ ] `rounded-xl` et au-delà sont interdits.
- [ ] `text-[...px]` arbitraire est interdit.
- [ ] `<select>` natif est interdit.
- [ ] `pnpm --dir frontend run lint` passe avec `--max-warnings 0`.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `pnpm` pour les questions de workspace/scripts.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit a un design system écrit (frontend/src/index.css,
frontend/src/components/app-shell/appShellTokens.ts,
.agents/skills/cir-cockpit-design/SKILL.md) mais rien n'empêche mécaniquement un
écran d'en sortir. Écart mesuré à ce jour :

- 134 ombres hors règle (shadow-sm 101, shadow-md 13, shadow-xl 7, shadow-2xl 7,
  shadow-lg 5, shadow-inner 1) contre 11 shadow-soft, alors que la règle dit
  "shadow-soft uniquement".
- ~900 classes de palette Tailwind brutes (stone-*, neutral-*, slate-*, red-*,
  emerald-*, amber-*, blue-*) en parallèle des tokens sémantiques.
- 109 rounded-xl / rounded-2xl hors de l'échelle sm/md/lg déclarée.
- 17 tailles de police arbitraires text-[Npx].
- 7 <select> natifs à côté du composant Select.

TÂCHE
Ajoute des règles ESLint qui rendent ces écarts impossibles. Le script de lint
existant est `pnpm --dir frontend run lint` (eslint . --ext .ts,.tsx
--max-warnings 0). La configuration est à la racine de frontend/.

1. Interdis dans les className :
   - les classes de palette Tailwind brutes : (bg|text|border|ring|from|to|via)-
     (slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|
     teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}
   - shadow-md, shadow-lg, shadow-xl, shadow-2xl, shadow-inner
   - rounded-xl, rounded-2xl, rounded-3xl
   - text-[Npx] arbitraire
2. Interdis l'élément <select> natif au profit du composant Select.
3. Chaque règle porte un message qui dit quoi utiliser à la place, en français.
4. IMPORTANT : si le code n'est pas encore conforme (les tâches de nettoyage
   T3.5, T4.1, T4.2 et T4.3 peuvent ne pas être faites), n'échoue pas le build.
   Introduis les règles en "warn" avec un commentaire daté expliquant qu'elles
   passeront en "error" une fois le nettoyage terminé, OU restreins-les d'abord
   aux nouveaux dossiers. Explique clairement ton choix.
5. Vérifie que `pnpm run qa:front` passe toujours.

CRITÈRES D'ACCEPTATION
- Écrire `className="bg-stone-100 shadow-lg rounded-xl text-[9px]"` dans un
  composant déclenche 4 diagnostics distincts avec des messages actionnables.
- Les règles ne cassent pas la CI existante.

QA
Lance `pnpm --dir frontend run lint` puis `pnpm run qa:front`. Rapporte le
nombre de diagnostics par règle sur le code actuel.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T3.6" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T3.6 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T3.6, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Phase 4 — Convergence visuelle

Nettoyage de masse. Sans la garde-fou T3.6, ces tâches se re-dégradent.

## T4.1 — Codemod : couleurs brutes vers tokens

**Statut** ⬜ non commencée · **Impact** élevé · **Effort** élevé · **Dépendance conseillée** T1.3

**Constat.** ~900 classes Tailwind brutes forment un second système de couleurs,
invisible aux tokens. Aucun hex n'est codé en dur dans les composants, ce qui est
un bon point. Fichiers les plus touchés :

| Fichier | Classes brutes |
| --- | --- |
| `client-directory/ClientDirectoryRecordInfoGrid.tsx` | 83 |
| `pricing-references/…/classification-drilldown.tsx` | 48 |
| `pricing-references/…/import-detail-dialog.tsx` | 43 |
| `client-directory/ClientDirectoryRecordHistoryPanel.tsx` | 37 |
| `client-form/ClientFormContactSection.tsx` | 34 |
| `client-directory/ClientDirectoryInteractionSection.tsx` | 34 |

**Checkpoint**

- [ ] Plus aucune classe de palette Tailwind brute dans `frontend/src`.
- [ ] La palette `cir.*` morte est supprimée de `tailwind.config.cjs`.
- [ ] `richColors` est retiré du `Toaster` sonner.
- [ ] Aucune régression visuelle sur les 8 écrans principaux.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000). Prends des
captures AVANT de commencer : c'est une opération à fort risque de régression.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit a QUATRE systèmes de couleurs en parallèle :

1. Les tokens sémantiques HSL de frontend/src/index.css, exposés à Tailwind par
   frontend/tailwind.config.cjs. C'est le système officiel.

2. ~900 classes de palette Tailwind brutes dans les composants. Répartition :
   text-stone-500 (93), bg-neutral-50 (67), border-neutral-200 (56),
   text-stone-950 (45), border-stone-200 (44), text-neutral-400 (39),
   text-neutral-500 (37), border-stone-100 (32), bg-stone-100 (29),
   bg-stone-50 (27), text-neutral-700 (28), text-neutral-900 (22),
   border-neutral-300 (22), text-neutral-800 (19), text-neutral-300 (18),
   border-neutral-400 (17), text-neutral-950 (14), text-stone-400 (13),
   bg-red-50 (12), text-stone-300 (11), text-neutral-600 (11), plus des
   slate-*, emerald-*, amber-*, blue-*.

   Fichiers les plus touchés :
   - components/client-directory/ClientDirectoryRecordInfoGrid.tsx (83)
   - components/pricing-references/.../classification-drilldown.tsx (48)
   - components/pricing-references/.../import-detail-dialog.tsx (43)
   - components/client-directory/ClientDirectoryRecordHistoryPanel.tsx (37)
   - components/client-form/ClientFormContactSection.tsx (34)
   - components/client-directory/ClientDirectoryInteractionSection.tsx (34)

3. Une palette morte dans tailwind.config.cjs : cir.red (#c92b1f), cir.dark
   (#342b27), cir.gray (#f5f2ee). Vérifie-le, mais elle n'est utilisée NULLE PART
   dans frontend/src. Le rouge #c92b1f est de plus presque mais pas exactement
   égal à --primary hsl(6 72% 45%).

4. Le système de toasts sonner, configuré avec richColors dans
   frontend/src/main.tsx ligne 55, qui apporte ses propres vert/rouge/bleu. C'est
   la palette que l'utilisateur voit à CHAQUE erreur.

Point positif à préserver : aucun hex n'est codé en dur dans les composants.

TÂCHE
1. Établis d'abord une table de correspondance explicite entre les classes brutes
   et les tokens (par exemple text-stone-500 -> text-muted-foreground,
   bg-neutral-50 -> bg-surface-1, border-neutral-200 -> border-border...).
   Écris cette table dans ton rapport AVANT de modifier quoi que ce soit, et
   vérifie chaque correspondance en comparant les valeurs réelles.
2. Applique la correspondance sur frontend/src. Procède fichier par fichier en
   commençant par les 6 plus touchés, et vérifie visuellement après chaque
   fichier important.
3. Supprime la palette cir.* de tailwind.config.cjs après avoir confirmé qu'elle
   n'est utilisée nulle part.
4. Retire l'option richColors du Toaster dans frontend/src/main.tsx et stylise
   les toasts avec les tokens du produit (sonner accepte toastOptions.classNames).
   Les toasts sont la surface d'erreur la plus vue du produit : ils doivent
   ressembler au produit.
5. Ne touche PAS aux valeurs des tokens eux-mêmes dans index.css : c'est une
   autre tâche (contraste AA).

CRITÈRES D'ACCEPTATION
- `rg '(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}' frontend/src`
  ne retourne rien.
- Aucune régression visuelle sur : /cockpit, /dashboard, /clients, /clients/:id,
  /clients/new, /remises/referentiels, /admin, /settings.
- Les toasts d'erreur et de succès utilisent les tokens du produit.

QA
Lance `pnpm run qa:front`. Fournis la table de correspondance et les captures
avant/après des 8 écrans.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T4.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T4.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T4.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T4.2 — Ombres : retour à `shadow-soft`

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** faible · **Dépendance** aucune

**Constat.** La règle dit « élévation par surface, pas par ombre ; seulement
`shadow-soft` ». Réalité : `shadow-soft` 11 usages, contre `shadow-sm` 101,
`shadow-md` 13, `shadow-xl` 7, `shadow-2xl` 7, `shadow-lg` 5, `shadow-inner` 1.
92 % hors règle.

**Checkpoint**

- [ ] Seuls `shadow-soft` et `shadow-none` subsistent.
- [ ] L'élévation est portée par `surface-1/2/3` et les bordures.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le skill design du projet pose : "Elevation by surface, not shadow: background ->
surface-1/2/3, border vs border-subtle, white card. Only shadow-soft; no heavy
shadows, no gradients."

Réalité mesurée dans frontend/src :
  shadow-sm ..... 101
  shadow-none .... 69
  shadow-md ...... 13
  shadow-soft .... 11   <- la seule autorisée
  shadow-xl ....... 7
  shadow-2xl ...... 7
  shadow-lg ....... 5
  shadow-inner .... 1

Soit 134 usages hors règle contre 11 conformes. shadow-soft est défini dans
frontend/tailwind.config.cjs : "0 1px 2px 0 rgba(0, 0, 0, 0.05)".

Les shadow-2xl sont notamment sur les grands panneaux latéraux
(components/client-directory/edit/EntityEditPanel.tsx ligne 668 et
components/EntityOnboardingDialog.tsx ligne 561).

Il y a aussi 6 gradients (bg-gradient / linear-gradient) alors que la règle dit
"no gradients", dans components/admin-suppliers/create-wizard/search-step/
search-results-list.tsx et components/ErrorJournalExport.tsx.

TÂCHE
1. Remplace toutes les ombres par shadow-soft ou shadow-none.
2. Quand une ombre portait une hiérarchie réelle (un panneau au-dessus du
   contenu, un menu déroulant), remplace-la par le mécanisme prévu : un fond
   surface-1/2/3 différent et/ou une bordure border vs border-subtle. Ne te
   contente pas de supprimer : vérifie que la hiérarchie visuelle survit.
3. Cas des overlays (Dialog, DropdownMenu, Popover, Tooltip, Sheet) : un menu
   flottant a besoin d'être détaché du fond. Si shadow-soft ne suffit pas,
   propose une exception nommée et documentée dans le skill design plutôt que de
   laisser 6 valeurs d'ombre différentes traîner.
4. Supprime les 6 gradients ou justifie individuellement chacun.

CRITÈRES D'ACCEPTATION
- `rg 'shadow-(sm|md|lg|xl|2xl|inner)' frontend/src` ne retourne rien, ou
  uniquement les exceptions documentées.
- Les menus, dialogues et infobulles restent lisibles et détachés du fond.
- Aucune perte de hiérarchie visuelle sur les 8 écrans principaux.

QA
Lance `pnpm run qa:front`. Liste les exceptions que tu as éventuellement retenues
et pourquoi.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T4.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T4.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T4.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T4.3 — Rayons : retour à l'échelle sm/md/lg

**Statut** ⬜ non commencée · **Impact** faible · **Effort** faible · **Dépendance** aucune

**Constat.** L'échelle déclarée est sm 0,25rem / md 0,375rem / lg 0,625rem.
442 usages sont sur l'échelle, mais 95 `rounded-xl` et 14 `rounded-2xl`
retombent sur les valeurs Tailwind par défaut, hors système. 102 `rounded-full`
créent en plus trois formes de bouton sur un même écran.

**Checkpoint**

- [ ] Plus aucun `rounded-xl`, `rounded-2xl` ou `rounded-3xl`.
- [ ] `rounded-full` est réservé aux avatars, points d'état et pastilles rondes.
- [ ] Une seule forme de bouton par niveau hiérarchique.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
L'échelle de rayon déclarée dans frontend/tailwind.config.cjs est :
  sm = 0.25rem, md = 0.375rem (défaut), lg = 0.625rem.

Usage réel dans frontend/src :
  rounded-md ... 269   (sur l'échelle)
  rounded-lg ... 147   (sur l'échelle)
  rounded-sm .... 26   (sur l'échelle)
  rounded-full . 102
  rounded-xl .... 95   <- hors échelle, retombe sur le défaut Tailwind 0.75rem
  rounded-2xl ... 14   <- hors échelle, retombe sur 1rem
  rounded-none .. 14

Conséquence visible : sur l'écran de saisie (/cockpit) coexistent trois formes de
bouton — "Créer un client à terme" en pilule (rounded-full), "Continuer" en
rectangle arrondi (rounded-md), "Voir tout" en pilule. Rien ne distingue leur
niveau hiérarchique par la forme, la forme varie au hasard.

TÂCHE
1. Mappe rounded-xl et rounded-2xl vers rounded-lg (ou md selon le contexte :
   un grand panneau prend lg, un petit chip prend md).
2. Restreins rounded-full à ce qui est vraiment circulaire : avatars, points
   d'état, pastilles de compteur, boutons icône ronds. Les boutons à libellé
   texte ne sont pas des pilules.
3. Fixe une règle simple et applique-la : une forme par niveau hiérarchique.
   Par exemple boutons et champs en md, panneaux et cartes en lg, chips et
   badges en sm. Documente-la dans .agents/skills/cir-cockpit-design/SKILL.md.
4. Vérifie visuellement les écrans où plusieurs boutons cohabitent : /cockpit,
   /dashboard, /clients, /remises/referentiels.

CRITÈRES D'ACCEPTATION
- `rg 'rounded-(xl|2xl|3xl)' frontend/src` ne retourne rien.
- Un seul type de forme par niveau hiérarchique sur chaque écran.
- Aucun bouton à libellé texte en pilule, sauf décision documentée.

QA
Lance `pnpm run qa:front`. Fournis des captures des écrans à boutons multiples.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T4.3" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T4.3 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T4.3, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T4.4 — Trancher la règle Sheet contre Dialog

**Statut** ⬜ non commencée · **Impact** élevé · **Effort** élevé · **Dépendance** décision PO préalable

**Constat.** La règle PO la plus répétée du projet — « aucune Sheet latérale,
tout détail ou édition en Dialog centré » — est violée par les plus gros
composants du produit :

| Fichier | Largeur | Rôle |
| --- | --- | --- |
| `client-directory/edit/EntityEditPanel.tsx:664` | 1 180 px | Édition de fiche |
| `EntityOnboardingDialog.tsx:557` | 1 240 px | Création de fiche |
| `client-directory/ClientDirectoryInteractionDetailsSheet.tsx:42` | 672 px | Détail d'interaction |
| `AppLayout.tsx:187` | 380 px | Panneau « Mon compte » |
| `settings/integrity/IntegrityInteractionsSheet.tsx:109` | 768 px | Inspection |
| `settings/integrity/IntegritySection.tsx:100` | défaut | Rattachement |

Une Sheet de 1 240 px sur un écran de 1 440 px n'est plus un tiroir : c'est une
page, avec un overlay en plus et sans les bénéfices d'une route. Deux d'entre
elles ajoutent `shadow-2xl`, également interdit.

**Checkpoint**

- [ ] Décision PO tranchée et écrite : migration ou amendement de la règle.
- [ ] Si migration : les 6 Sheets deviennent des Dialogs centrés.
- [ ] Si amendement : la règle est réécrite avec ses conditions d'exception.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design` — il contient la règle en cause.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Le skill design du projet (.agents/skills/cir-cockpit-design/SKILL.md, section
"Product-Owner Rules (non negotiable)") pose : "No right-side Sheets/drawers.
Every detail or edit view opens as a centered Dialog."

Cette règle est violée par les plus gros composants du produit :

  frontend/src/components/client-directory/edit/EntityEditPanel.tsx:664
      side="right", 1180px, + shadow-2xl. Fichier de 1422 lignes.
  frontend/src/components/EntityOnboardingDialog.tsx:557
      side="right", 1240px, + shadow-2xl. Nommé "Dialog" mais rend un Sheet.
  frontend/src/components/client-directory/ClientDirectoryInteractionDetailsSheet.tsx:42
      side="right", 672px. Détail d'interaction.
  frontend/src/components/AppLayout.tsx:187
      side="right", 380px. Panneau "Mon compte".
  frontend/src/components/settings/integrity/IntegrityInteractionsSheet.tsx:109
      côté par défaut (right), 768px.
  frontend/src/components/settings/integrity/IntegritySection.tsx:100
      côté par défaut (right).

Cas à part, probablement légitime : DirectoryMobileFilterSheet.tsx (filtres sur
mobile).

Observation : une Sheet de 1240px sur un écran de 1440px n'est plus un tiroir,
c'est une page — avec un overlay en plus et sans les bénéfices d'une route.
L'assistant de création change d'ailleurs déjà l'URL (/clients/new) tout en étant
rendu comme un tiroir : c'est un hybride qui ne tient ni de l'un ni de l'autre.

TÂCHE
C'est une tâche à décision. Commence par POSER LA QUESTION au PO avant de coder,
en présentant les deux options avec leurs conséquences :

  Option A — Appliquer la règle. Les 6 Sheets deviennent des Dialogs centrés.
  Coût élevé sur EntityEditPanel (1422 lignes) et EntityOnboardingDialog. Gain :
  la règle redevient vraie et exécutable.

  Option B — Amender la règle. Elle devient par exemple "pas de Sheet pour
  consulter un détail ; Sheet autorisée pour l'édition longue au-delà de N
  champs". Coût faible, mais il faut réécrire la règle avec ses conditions
  précises et migrer les cas qui restent hors conditions.

Recommande une option en t'appuyant sur ce que tu observes réellement à l'écran,
puis exécute celle que le PO retient. Ne choisis pas silencieusement.

Dans les deux cas :
- Les deux shadow-2xl doivent partir (la règle "shadow-soft uniquement" n'est
  pas en débat).
- Les panneaux de plus de 1000px de large doivent devenir des routes à part
  entière ou des dialogues plein écran, pas des tiroirs.
- La règle finale doit être écrite noir sur blanc dans
  .agents/skills/cir-cockpit-design/SKILL.md, sans ambiguïté.

CRITÈRES D'ACCEPTATION
- La règle écrite et le code disent la même chose.
- Escape ferme, le focus est piégé, le focus revient au déclencheur.
- Aucune perte fonctionnelle sur l'édition et la création de fiche : teste les
  deux parcours de bout en bout dans le navigateur.

QA
Lance `pnpm run qa:front`. Rapporte la décision retenue et sa justification.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T4.4" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T4.4 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T4.4, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T4.5 — Unification des onglets et des badges

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance** aucune

**Constat.** Quatre traitements de `TabsList` coexistent, dont trois utilisent
des couleurs brutes (`neutral-*`, `stone-*`) au lieu des tokens. Plus de cinq
formes de badge : `CLIENT` vert, `PROSPECT` bleu, `ACTIF` vert à pastille,
`ATTENTE ÉLÉMENT…` en capitales tronqué, `Par défaut` en casse phrase,
`Client` / `Compte à terme` en contour.

**Checkpoint**

- [ ] Un seul composant d'onglets avec au plus deux variantes justifiées.
- [ ] Un seul système de badge, avec des variantes sémantiques nommées.
- [ ] Plus aucune couleur brute dans les onglets et badges.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
ONGLETS. Quatre traitements différents de TabsList coexistent, trois d'entre eux
en couleurs brutes hors tokens :
  "flex h-8 items-center bg-neutral-100/80 p-0.5 rounded border border-neutral-200"
  "h-9 rounded border border-neutral-200 bg-neutral-50/80 p-0.5"
  "h-9 w-full min-w-max justify-start gap-5 rounded-none border-0 border-b border-stone-200/60 bg-transparent"
  "flex h-auto w-full flex-wrap justify-start gap-1 bg-surface-1 p-1"

Visuellement : /remises/referentiels et /admin utilisent des onglets soulignés,
/clients/:id et /settings des onglets en pilule. Le composant de base est
frontend/src/components/ui/navigation/Tabs.tsx.

BADGES. Au moins cinq formes coexistent :
  /clients ............. "CLIENT" (vert), "PROSPECT" (bleu) — capitales, plein
  /admin ............... "ACTIF" — capitales, vert, avec pastille
  /dashboard ........... "ATTENTE ÉLÉMENT…" — capitales, tronqué en plein mot
  /settings ............ "Par défaut" — casse phrase, rouge clair
  /clients/:id ......... "Client", "Compte à terme" — casse phrase, contour

Le composant existe : frontend/src/components/ui/data-display/Badge.tsx.

TÂCHE
1. Onglets : ramène tout à deux variantes MAXIMUM, et seulement si la distinction
   porte du sens (par exemple "onglets de page" contre "onglets dans un panneau").
   Ajoute-les comme variantes du composant Tabs plutôt qu'en className ad hoc.
   Supprime toutes les couleurs brutes.
2. Badges : définis un système unique avec des variantes SÉMANTIQUES nommées
   (neutre, succès, avertissement, danger, information) plutôt que des couleurs
   choisies au cas par cas. Fixe une règle de casse unique — mon conseil : casse
   phrase, les capitales sont déjà surexploitées dans le produit.
3. Aucun badge ne doit pouvoir être tronqué en plein mot : la troncature se fait
   à la source, avec une infobulle.
4. Migre tous les appels.

CRITÈRES D'ACCEPTATION
- Au plus deux variantes d'onglets, justifiées.
- Un seul système de badge avec des variantes nommées par leur sens, pas par
  leur couleur.
- Plus aucune couleur brute dans les onglets et les badges.
- Une seule règle de casse pour tous les badges.

QA
Lance `pnpm run qa:front`. Fournis des captures des 5 écrans concernés.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T4.5" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T4.5 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T4.5, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Phase 5 — Finitions

Faible impact unitaire, effet cumulé important sur la perception de qualité.

## T5.1 — Selects natifs vers le composant `Select`

**Statut** ⬜ non commencée · **Impact** faible · **Effort** faible · **Dépendance** aucune

**Constat.** 7 `<select>` natifs non stylés cohabitent avec le composant
`Select`, visibles côte à côte sur Référentiels (« Liaison : toutes » utilise le
composant, « Lignes : 50 » un select natif).

**Fichiers.** `components/admin-ai/AiAccessTab.tsx`,
`components/admin-ai/AiQuotasTab.tsx` (3 occurrences),
`components/admin-ai/AiUsageTab.tsx` (3),
`components/client-directory/ClientDirectoryRecordHistoryPanel.tsx:237`,
`components/pricing-references/components/table/pagination-bar.tsx:45`,
`components/pricing-references/pricing-reference-import-dialog.tsx:683` et `:762`

**Checkpoint**

- [ ] Plus aucun `<select>` natif dans `frontend/src`.
- [ ] Les libellés et l'accessibilité sont préservés.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit dispose d'un composant Select
(frontend/src/components/ui/inputs/selects/Select.tsx, basé sur Radix, avec des
variantes de densité). Pourtant 7 <select> natifs non stylés subsistent. Ils sont
visibles côte à côte sur /remises/referentiels : la barre d'outils affiche
"Liaison : toutes" via le composant Select, et la pagination affiche
"Lignes : [50]" via un select natif avec la flèche du système.

Emplacements :
- components/admin-ai/AiAccessTab.tsx ligne 24
- components/admin-ai/AiQuotasTab.tsx ligne 28 (3 selects)
- components/admin-ai/AiUsageTab.tsx ligne 17 (3 selects)
- components/client-directory/ClientDirectoryRecordHistoryPanel.tsx ligne 237
- components/pricing-references/components/table/pagination-bar.tsx ligne 45
- components/pricing-references/pricing-reference-import-dialog.tsx lignes 683 et 762

Note : les trois fichiers admin-ai sont écrits en JSX d'une seule ligne, très
peu lisibles. Tu peux les reformater dans le cadre de cette tâche.

TÂCHE
1. Remplace chaque <select> natif par le composant Select, en respectant la
   densité de son contexte (les triggers acceptent une prop density).
2. Préserve les aria-label existants et les libellés associés.
3. Vérifie que la valeur contrôlée, le onChange et l'état disabled se comportent
   à l'identique.
4. Vérifie le rendu réel dans le navigateur, notamment la pagination de
   /remises/referentiels où le select est très petit.

CRITÈRES D'ACCEPTATION
- `rg '<select' frontend/src --type tsx` ne retourne rien.
- Navigation clavier fonctionnelle sur chaque select migré (flèches, Entrée,
  Escape, saisie de la première lettre).
- Aucune régression de comportement.

QA
Lance `pnpm run qa:front`. Liste les 7 emplacements migrés.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T5.2 — Boutons bruts vers le primitif `Button`

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance** aucune

**Constat.** 105 `<button>` bruts contre 257 `<Button>` — 29 % contournent le
kit. Environ la moitié des boutons bruts n'ont pas d'anneau de focus explicite,
et leurs états hover, actif et désactivé sont réimplémentés au cas par cas.

**Checkpoint**

- [ ] Les boutons bruts sont migrés, sauf exceptions justifiées (déclencheurs
      Radix `asChild`, éléments de liste interactifs).
- [ ] Chaque bouton restant a un anneau de focus visible.
- [ ] Chaque bouton icône a un `aria-label`.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `web-design-guidelines`.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit a un primitif Button
(frontend/src/components/ui/inputs/basic/Button.tsx) utilisé 257 fois. Mais 105
<button> bruts existent en parallèle, soit 29% des boutons. Chacun réimplémente
à sa façon les états hover, focus, actif et désactivé. Environ la moitié n'a
aucun focus-visible explicite : au clavier, l'utilisateur ne sait pas où il est.

Il existe une constante partagée pour cela :
frontend/src/components/app-shell/appShellTokens.ts expose APP_SHELL_CLASSES avec
focusRing, control, controlRound, navItem. Elle n'est utilisée que dans le shell.

TÂCHE
1. Recense les 105 <button> bruts (`rg '<button' frontend/src --type tsx`) et
   classe-les en trois catégories :
   a. Migrables vers Button sans perte — migre-les.
   b. Déclencheurs Radix (DropdownMenuTrigger, TooltipTrigger... en asChild) et
      éléments de liste interactifs (lignes cliquables, chips de filtre) — garde
      le <button> mais applique APP_SHELL_CLASSES.focusRing et harmonise les
      états hover / actif / désactivé.
   c. Cas particuliers — justifie-les un par un.
2. Chaque bouton restant, quelle que soit la catégorie, doit avoir :
   - un anneau de focus visible au clavier ;
   - un aria-label s'il n'a pas de texte ;
   - un état désactivé distinct qui ne ressemble PAS à un primaire délavé.
3. Point d'attention relevé pendant l'audit : sur /cockpit et /settings, le
   bouton primaire désactivé est rendu en rouge très clair, ce qui le rend
   indiscernable d'un primaire actif à faible contraste. Traite l'état désactivé
   comme un état à part entière (fond neutre).

CRITÈRES D'ACCEPTATION
- Le nombre de <button> bruts baisse d'au moins 60%.
- Aucun bouton sans focus visible au clavier : parcours les 8 écrans principaux
  à la touche Tab pour le vérifier.
- Aucun bouton icône sans aria-label.
- L'état désactivé est visuellement distinct de l'état actif partout.

QA
Lance `pnpm run qa:front`. Rapporte le décompte avant/après et la liste des
exceptions retenues.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T5.3 — Troncatures et alignements

**Statut** ⬜ non commencée · **Impact** faible · **Effort** faible · **Dépendance** aucune

**Constat.** Trois troncatures en plein mot avec de l'espace disponible à côté :
l'instruction d'en-tête de Paramètres se coupe sur « sont signalé… » avec 40 px
de marge libre, le badge `ATTENTE ÉLÉMENT…` de Pilotage, les libellés catalogue
de Référentiels sans infobulle de secours. Et un désalignement de colonne dans
Paramètres → Statuts : le select de la première ligne commence 64 px avant les
autres, poussé par le badge « Par défaut ».

**Checkpoint**

- [ ] Aucune troncature en plein mot quand l'espace est disponible.
- [ ] Toute troncature volontaire porte une infobulle.
- [ ] Les colonnes des listes répétitives ont des gouttières fixes.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000). Vérifie en
1440x900 ET en 1280x720.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Quatre défauts de mise en page constatés à l'écran :

1. /settings : l'instruction d'en-tête se coupe sur "...les valeurs utilisées
   dans l'historique sont signalé…" avec environ 40px d'espace libre à sa droite.
   C'est une instruction importante, tronquée pour rien.
   Composant : frontend/src/components/settings/SettingsHeader.tsx.

2. /dashboard : dans la table "Dossiers en cours", le badge de statut affiche
   "ATTENTE ÉLÉMENT…" — tronqué en plein mot alors que la colonne STATUT est
   large. Composant : components/dashboard/overview/DashboardDossiersTable.tsx.

3. /remises/referentiels : la colonne "Libellé cat fab" tronque
   ("SERIE 40000V - TOUT METAL JOI…", "SERIE 8000 -BOUCHONS POLYME…") sans
   infobulle de secours. Les largeurs de colonnes ne sont pas proportionnées au
   contenu : des colonnes de codes courts sont larges, la colonne de libellés est
   étroite.

4. /settings > Statuts interactions : dans la liste des statuts, le select de la
   PREMIÈRE ligne commence à x=659 alors que ceux des lignes 2, 3 et 4 commencent
   à x=723. Le badge "Par défaut" présent uniquement sur la première ligne pousse
   la colonne. Une liste de rangs identiques doit avoir des gouttières fixes.
   Composant : frontend/src/components/settings/kanban/.

TÂCHE
1. Corrige les trois troncatures. Règle générale : ne tronque que si l'espace
   manque réellement, et dans ce cas ajoute une infobulle avec le texte complet
   (composant Tooltip dans components/ui/feedback/Tooltip.tsx).
2. Rééquilibre les largeurs de colonnes de la table Référentiels au prorata de
   la longueur réelle du contenu.
3. Corrige le désalignement de la liste des statuts : réserve l'espace du badge
   "Par défaut" sur toutes les lignes, ou sors-le du flux.
4. Vérifie qu'aucune autre liste répétitive du produit n'a le même défaut de
   gouttière variable.

CRITÈRES D'ACCEPTATION
- Aucune troncature quand l'espace est disponible.
- Toute troncature volontaire a une infobulle.
- Dans une liste de rangs identiques, chaque colonne commence au même x.
- Vérifié en 1440x900 et 1280x720.

QA
Lance `pnpm run qa:front`. Fournis les captures avant/après aux deux résolutions.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.3" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.3 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.3, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T5.4 — Densité verticale des pages

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance conseillée** T3.1

**Constat.** Le produit se revendique dense, base 13 px, grille de 4 px. Les
composants le sont ; les pages ne le sont pas.

| Écran | Contenu utile | Vide en 1440×900 |
| --- | --- | --- |
| Clients | 4 lignes | ~50 % |
| Fiche client | 3 cartes + 10 propriétés | ~50 % |
| Admin utilisateurs | 2 lignes | ~30 % |
| Création de fiche | 4 choix | rail droit vide à 100 % |
| Saisie, étape 4 | 1 contact | rail droit vide sur 450 px |
| Référentiels | 18 lignes | dense — la référence |

**Checkpoint**

- [ ] Les tables s'étirent jusqu'au bas de la fenêtre, pagination en pied fixe.
- [ ] Aucune page principale n'a de zone morte de plus de 150 px en 1440×900.
- [ ] Les rails contextuels vides ne sont pas rendus.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000). Mesure en
1440x900 et 1280x720.
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
Le produit se revendique "dense professional SaaS", base 13px, grille de 4px. Ses
COMPOSANTS sont effectivement denses (lignes de tableau à 32px, contrôles à 32px).
Ses PAGES ne le sont pas : elles s'arrêtent à mi-hauteur et laissent le reste vide.

Mesures en 1440x900 :
  /clients ......... 4 lignes de tableau, puis 450px de blanc
  /clients/:id ..... colonne principale s'arrête à y=450, la page fait 900
  /admin ........... 2 lignes de tableau, puis 270px de blanc
  /clients/new ..... rail droit de 400x780 entièrement vide à l'étape 1
  /cockpit étape 4 . rail droit vide sur 450px
  /remises/referentiels ... 18 lignes, pagination en pied — DENSE, c'est la référence

TÂCHE
1. Va d'abord regarder /remises/referentiels : c'est le seul écran qui remplit sa
   fenêtre correctement (table étirée, pagination en pied, méta en ligne). C'est
   le modèle à généraliser, pas à retoucher.
2. Applique ce modèle aux pages à table : /clients et /admin. La table occupe la
   hauteur disponible, la pagination reste collée en bas, le corps défile à
   l'intérieur du conteneur de table.
3. /clients/:id : la colonne principale contient 3 petites cartes et le rail droit
   porte l'essentiel du contenu. Rééquilibre — soit le contenu principal se
   développe, soit la mise en page passe en colonne unique plus large.
4. Rails contextuels vides (/clients/new étape 1, /cockpit étape 4) : ne les rends
   pas quand ils n'ont rien à montrer, ou fais-les se réduire.
5. Ne comble pas le vide avec du remplissage. La bonne réponse est soit plus de
   contenu réel visible, soit une mise en page plus étroite et centrée — pas une
   carte décorative de plus.

CRITÈRES D'ACCEPTATION
- Aucune page principale n'a de zone morte de plus de 150px en 1440x900.
- Les tables affichent le maximum de lignes que la fenêtre permet.
- Le comportement reste correct en 1280x720 : pas de débordement horizontal du
  body, pas de pagination qui sort de l'écran.

QA
Lance `pnpm run qa:front`. Fournis les captures avant/après aux deux résolutions
et le nombre de lignes visibles avant/après sur /clients et /admin.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.4" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.4 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.4, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T5.5 — Passage design sur les onglets IA

**Statut** ⬜ non commencée · **Impact** faible · **Effort** moyen · **Dépendance** aucune

**Constat.** `AiAccessTab.tsx`, `AiQuotasTab.tsx` et `AiUsageTab.tsx` sont écrits
en JSX d'une seule ligne, avec des `<select>` natifs, un `<table>` brut et un
histogramme fait de `div` à hauteur calculée. Ces écrans n'ont jamais eu de
traitement visuel.

**Checkpoint**

- [ ] Les trois fichiers sont reformatés et lisibles.
- [ ] Les primitifs du produit sont utilisés (Select, Table, Badge, Card).
- [ ] L'histogramme est accessible ou remplacé.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000), route
/admin, onglet "IA".
Contraintes : minimum utile, worktree sale respecté, UI en français.

CONTEXTE
Les onglets IA de l'administration n'ont jamais eu de passage design :
- frontend/src/components/admin-ai/AiAccessTab.tsx
- frontend/src/components/admin-ai/AiQuotasTab.tsx
- frontend/src/components/admin-ai/AiUsageTab.tsx
- frontend/src/components/admin-ai/AdminAiPanel.tsx (conteneur)

Chacun est écrit en JSX d'UNE SEULE LIGNE, ce qui les rend illisibles. Ils
utilisent des <select> natifs, un <table> brut avec des classes de padding
manuelles, et un histogramme construit avec des <div> dont la hauteur est
calculée en style inline avec un attribut title comme seule infobulle.

TÂCHE
1. Reformate les quatre fichiers en JSX lisible.
2. Remplace les <select> natifs par le composant Select
   (components/ui/inputs/selects/Select.tsx).
3. Remplace le <table> brut par le composant Table
   (components/ui/data-display/Table.tsx) et applique les classes de densité de
   APP_SHELL_CLASSES (dataHeader, dataCell, dataRow) définies dans
   components/app-shell/appShellTokens.ts.
4. L'histogramme "Évolution quotidienne" : donne-lui un axe Y avec au moins une
   graduation, une infobulle réelle, et un état vide. S'il n'apporte rien avec
   les volumes actuels, remplace-le par une métrique chiffrée — regarde les
   données réelles avant de décider.
5. Harmonise les cartes de métriques avec le reste du produit (une seule
   anatomie, pas de pastille d'icône décorative).
6. Ne change PAS la logique métier ni les appels tRPC.

CRITÈRES D'ACCEPTATION
- Les quatre fichiers sont lisibles.
- Plus aucun <select> natif ni <table> brut dans admin-ai.
- La densité est cohérente avec /admin > Utilisateurs et /remises/referentiels.
- États vides, chargement et erreur traités.

QA
Lance `pnpm run qa:front`. Fournis les captures des 3 onglets avant/après.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.5" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.5 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.5, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T5.6 — Affordances trompeuses dans les tableaux

**Statut** ⬜ non commencée · **Impact** faible · **Effort** faible · **Dépendance** aucune

**Constat.** Sur la page Clients, la ligne porte `hover:bg-muted/35` — signal
universel d'interactivité — alors que seul le texte de la colonne « Nom » est un
lien. 90 % de la surface de ligne ne fait rien. Par ailleurs, les doubles
chevrons de tri sont affichés en permanence sur chaque colonne, y compris non
triables.

**Checkpoint**

- [ ] La ligne entière est cliquable, ou le survol ne suggère plus l'interactivité.
- [ ] Les indicateurs de tri n'apparaissent qu'au survol ou à l'état actif.
- [ ] Les mêmes vérifications sont faites sur les autres tables du produit.
- [ ] `pnpm run qa:front` passe.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque les skills `cir-cockpit-design` puis `web-design-guidelines`.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000).
Contraintes : minimum utile, worktree sale respecté.

CONTEXTE
1. AFFORDANCE MENSONGÈRE. Sur /clients, chaque ligne de tableau porte la classe
   hover:bg-muted/35 — le signal universel "cette ligne est cliquable". Mais un
   clic ne fait rien : seul le texte de la colonne "Nom" est un <a href>. 90% de
   la surface de la ligne est morte. Vérifié en inspectant le DOM : la ligne n'a
   ni role, ni tabindex, ni onClick ; elle contient un seul <a> avec
   aria-label="Ouvrir la fiche ...".
   Composants : frontend/src/components/client-directory/.

2. BRUIT DE TRI. Les en-têtes de colonnes affichent un double chevron de tri en
   permanence sur chaque colonne. La convention est de ne le montrer qu'au survol
   ou quand le tri est actif.
   Composant : components/client-directory/data-table/DataTableColumnHeader.tsx.

TÂCHE
1. Tranche entre les deux options et applique :
   a. Rendre la ligne entière navigable (recommandé pour un annuaire). Attention :
      il faut que ça reste accessible — la ligne doit être atteignable au clavier
      et annoncée correctement. Un <a> qui couvre la cellule principale plus un
      onClick sur la ligne est un motif courant ; garde le lien réel pour le
      clic milieu et le "ouvrir dans un nouvel onglet".
   b. Retirer le hover de la ligne et le mettre uniquement sur le lien.
   Ne laisse pas l'état actuel.
2. Indicateurs de tri : visibles au survol de l'en-tête et à l'état actif
   seulement. Aucun indicateur sur une colonne non triable.
3. Vérifie les autres tables du produit (/remises/referentiels, /admin,
   /dashboard) et applique la même règle.

CRITÈRES D'ACCEPTATION
- Aucune surface avec un état de survol qui ne réagit pas au clic.
- Navigation clavier fonctionnelle sur les lignes de tableau.
- Le clic milieu et Ctrl+clic ouvrent toujours la fiche dans un nouvel onglet.
- Les en-têtes sont visuellement plus calmes.

QA
Lance `pnpm run qa:front`. Décris l'option retenue et pourquoi.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T5.6" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T5.6 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T5.6, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Phase 6 — Décisions produit

Ces deux points sortent du champ UI : l'interface expose fidèlement le modèle de
données. C'est le modèle qu'il faut trancher, pas l'affichage. Décision PO requise
avant tout code.

## T6.1 — « Sollicitation » dans la colonne « Top clients »

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** variable · **Dépendance** décision PO

**Constat.** Le panneau « Top clients » de Pilotage affiche « Sollicitation » —
qui n'est pas un client mais un type d'interaction. Soit l'agrégat pointe la
mauvaise dimension, soit les données de test le font croire.

**Checkpoint**

- [ ] La cause est établie : agrégat fautif ou données de test.
- [ ] La décision PO est écrite.
- [ ] La correction est appliquée à la source, pas masquée dans l'affichage.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Supabase MCP est requis pour toute inspection de données ; utilise-le en lecture
seule d'abord.
Contraintes : minimum utile, worktree sale respecté, ne trancher aucune décision
produit sans le PO.

CONTEXTE
Sur la page Pilotage (/dashboard), le panneau "Top clients" affiche une seule
entrée : "Sollicitation — 4,8 k€". Or "Sollicitation" n'est pas un nom de client,
c'est un type d'interaction. Le même libellé apparaît d'ailleurs comme sujet dans
"File de priorité" et dans "Dossiers en cours".

Deux hypothèses :
a. L'agrégat "Top clients" groupe sur la mauvaise dimension (le sujet ou le type
   d'interaction au lieu du tiers).
b. Les données locales sont incomplètes : l'interaction n'a pas de tiers rattaché,
   et le code retombe sur un autre champ.

TÂCHE
1. Établis la cause. Lis frontend/src/utils/dashboard/dashboardAggregates.ts et
   dashboardOverview.ts, puis vérifie les données réelles via le MCP Supabase en
   lecture seule.
2. Si c'est l'agrégat : corrige-le à la source et ajoute un test dans
   frontend/src/utils/dashboard/__tests__/.
3. Si ce sont les données : ne masque PAS le symptôme dans l'affichage. Détermine
   si le modèle autorise une interaction sans tiers, et si oui ce que "Top clients"
   doit faire dans ce cas. Pose la question au PO avec une recommandation.
4. Dans les deux cas, l'affichage ne doit jamais présenter une valeur d'une
   dimension sous l'étiquette d'une autre.

CRITÈRES D'ACCEPTATION
- La cause est établie avec des preuves (requête SQL en lecture, ou test).
- La correction est à la source.
- Un test verrouille le comportement.

QA
Lance `pnpm run qa:front`. Rapporte la cause établie et la décision retenue.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T6.1" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T6.1 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T6.1, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

## T6.2 — Colonnes booléennes brutes et codes de segment

**Statut** ⬜ non commencée · **Impact** moyen · **Effort** moyen · **Dépendance** décision PO

**Constat.** Sur Référentiels CIR, les colonnes « Stratégique » et « Tarif fab »
affichent des `0` et des `1` bruts. La colonne « Segment » affiche des codes
(`0-R`, `0ED`, `0D\`, `0DÊ`, `0D*`, `0D?`, `0È<`) rendus sans distinction, si
bien que l'utilisateur ne peut pas savoir si `0D\` est une donnée valide ou une
corruption d'encodage.

**Checkpoint**

- [ ] La nature des codes de segment est confirmée avec le PO.
- [ ] Les colonnes booléennes sont rendues comme des booléens.
- [ ] Les codes reçoivent un traitement qui lève l'ambiguïté.

**Preuve réelle.** _à compléter par l'agent qui exécute la tâche._

```text
Repo : C:\GitHub\CIR_Cockpit\CIR-Cockpit (branche main). Lis AGENTS.md avant d'agir.
Invoque le skill `cir-cockpit-design`. Supabase MCP est requis pour inspecter les
données ; lecture seule d'abord.
L'application se lance avec `pnpm --dir frontend run dev` (port 3000), route
/remises/referentiels.
Contraintes : minimum utile, worktree sale respecté, ne trancher aucune décision
produit sans le PO.

CONTEXTE
Table des segments sur /remises/referentiels (9 248 lignes, 13 colonnes) :

1. Les colonnes "Stratégique" et "Tarif fab" affichent des 0 et des 1 bruts. Ce
   sont des booléens exposés tels quels depuis la base, sans traduction en
   langage d'interface.

2. La colonne "Segment" affiche des codes courts en monospace : 0-R, 0ED, 0D\,
   0DÊ, 0D*, 0DR, 0DT, 0D+, 0D?, 0DS, 0D], 0D<, 0D), 0D(, 0È<, 0DÙ. Certains
   ressemblent à de la corruption d'encodage (0DÊ, 0È<, 0DÙ) mais sont
   probablement des codes métier valides. Rendus sans distinction ni explication,
   l'utilisateur ne peut pas faire la différence entre une donnée valide et une
   donnée corrompue.

TÂCHE
1. CONFIRME D'ABORD avec le PO que ces codes de segment sont bien des valeurs
   métier légitimes et non un problème d'encodage à l'import. Vérifie aussi côté
   base via le MCP Supabase (encodage de la colonne, échantillon de valeurs).
   Ne corrige rien tant que ce point n'est pas tranché.
2. Booléens : rends-les comme des booléens. Pour une colonne dense, une coche
   discrète ou une pastille vaut mieux qu'un 0/1, et un tri reste possible.
   Regarde comment le produit rend déjà des états booléens ailleurs avant de
   choisir.
3. Codes de segment : donne-leur un traitement qui lève l'ambiguïté. Options à
   évaluer — une infobulle expliquant le schéma de codage, un libellé long en
   regard, ou un état "Anomalie" quand le code ne respecte pas le schéma attendu.
   L'onglet "Anomalies" existe déjà sur cette page : vérifie s'il couvre déjà ce
   cas.
4. Ne masque aucune donnée : l'objectif est de rendre lisible, pas de cacher.

CRITÈRES D'ACCEPTATION
- La nature des codes est confirmée par une preuve (requête en lecture seule).
- Les colonnes booléennes ne montrent plus de 0/1.
- Le tri et le filtrage restent fonctionnels sur les colonnes modifiées.
- La densité de la table est préservée : c'est la page de référence du produit.

QA
Lance `pnpm run qa:front`. Rapporte ce que la base contient réellement et la
décision PO.

SUIVI (obligatoire, avant de rendre la main)
Tu dois mettre à jour deux fichiers du dépôt. Ce n'est pas optionnel : sans
cette mise à jour, le travail est considéré comme non livré.

1. docs/UI_UX/plan-refonte-ui.md, section "T6.2" :
   - coche uniquement les cases du checkpoint que tu as RÉELLEMENT satisfaites ;
     laisse décochées celles que tu n'as pas faites et explique pourquoi dans ton
     rapport final ;
   - remplis la ligne "**Preuve réelle.**" avec une preuve vérifiable : la
     commande exacte que tu as lancée et son résultat, le chemin d'une capture,
     le nom d'un test ajouté. "Fait" n'est pas une preuve ;
   - passe le champ "**Statut**" de la ligne d'en-tête de T6.2 à
     "✅ terminée", "🟡 partielle" ou "⬜ non commencée" selon la réalité ;
   - si toutes les tâches de la phase sont terminées, mets aussi à jour la ligne
     de la phase dans le tableau "Situation" en haut du fichier.

2. docs/UI_UX/changelog.md : ajoute UNE ligne en haut du tableau "Journal", en
   respectant le format décrit dans ce fichier (date du jour, identifiant de la
   tâche T6.2, statut, ce qui a changé, preuve). Ne réécris aucune ligne
   existante.

Règles : ne coche jamais une case sans preuve nommée. Si tu n'as pas pu terminer,
dis-le explicitement, mets 🟡 partielle et décris ce qui reste ouvert — c'est une
information utile, pas un échec à masquer.
```

---

# Changelog

Le journal des travaux vit dans un fichier séparé : **`docs/UI_UX/changelog.md`**.

Il est distinct de ce plan pour deux raisons : les tâches sont conçues pour être
exécutées en parallèle dans des conversations séparées, et un fichier dédié limite
les conflits d'écriture ; et ce plan doit rester lisible comme un état courant, pas
comme un historique.
