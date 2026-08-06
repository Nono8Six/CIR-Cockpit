---
name: CIR Cockpit
description: Plateforme opérationnelle dense pour un distributeur industriel B2B, traitée comme un plan coté.
colors:
  background: "#fdfdfc"
  foreground: "#2f2b27"
  surface-1: "#fbfbf8"
  surface-2: "#f7f6f3"
  surface-3: "#edebe8"
  card: "#ffffff"
  border: "#e4e1dd"
  border-subtle: "#f4f3f0"
  primary: "#c53120"
  primary-foreground: "#fafafa"
  accent: "#fbf0ef"
  accent-foreground: "#842015"
  secondary: "#f7f6f2"
  muted: "#f7f6f2"
  muted-foreground: "#756e66"
  warning: "#de9a1b"
  warning-foreground: "#463110"
  warning-strong: "#92610c"
  success: "#2b7d51"
  destructive: "#dd1313"
typography:
  headline:
    fontFamily: "Inter Tight, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Tight, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter Tight, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
    fontFeature: "cv11, ss01, ss03"
  body-dense:
    fontFamily: "Inter Tight, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Inter Tight, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.025em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.625rem"
spacing:
  hairline: "4px"
  tight: "6px"
  dense: "10px"
  base: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "#d14e3e"
  button-solid:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
  button-outline-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
  button-data-row:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 8px"
    height: "28px"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  input-dense:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-section:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  kbd:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "18px"
---

# Design System: CIR Cockpit

## 1. Overview

**Creative North Star: "Le Plan Coté"**

L'écran est traité comme un plan coté, pas comme une page marketing. Cette phrase n'est pas une intention rétrospective : elle est déjà écrite en commentaire dans `frontend/src/index.css`, au-dessus des surfaces techniques de la brique Configurateurs. Le système entier en découle. Un plan coté ne décore pas, il mesure. Il utilise des filets de 1 px, des croix aux intersections, des trames imprimées. Sa profondeur vient de la trame et du filet, jamais de l'ombre portée. Une case vide n'existe pas : l'absence de donnée est hachurée, parce qu'un blanc sur un plan est une erreur de lecture et pas une information.

La densité est la fonctionnalité principale, pas un effet secondaire. Le corps de texte est à 13 px, le vrai cheval de bataille des tables est à 12 px, et le plancher absolu est 11 px. Les contrôles font 32 px de haut, les lignes de données 28 px. Un technico-commercial passe huit heures par jour dans cet outil sur un poste fixe : chaque ligne gagnée à l'écran est une recherche évitée. Le thème est clair uniquement, et c'est une décision, pas un oubli.

Ce système rejette explicitement quatre familles nommées dans `PRODUCT.md` : l'ERP legacy (SAP, Sage) et sa densité subie, le SaaS IA générique avec ses dégradés violets et son gabarit hero-metric, le CRM grand public (HubSpot, Salesforce) et ses illustrations mascottes, et le dashboard Material ou Bootstrap avec ses ombres portées lourdes. La ligne de partage est simple : CIR Cockpit est dense par décision, jamais par abandon.

**Key Characteristics:**

- Palette neutre chaude (teintes 30 à 48), fond crème et non blanc, aucun gris froid.
- Élévation par surface et non par ombre : `background`, puis `surface-1/2/3`, puis `card` blanc.
- Une seule ombre autorisée dans tout le système (`shadow-soft`), plus le filet d'1 px de `tech-raised`.
- Rouge CIR rare et sémantique, jamais décoratif.
- Grille de 4 px, alignement vérifié sur les cellules, labels et icônes.
- Français, vouvoiement systématique, aucune chaîne décorative ni donnée factice.

**Dérives connues, à ne pas propager.** Deux écarts existent entre l'intention documentée ici et le code livré. Premier écart : `Inter Tight` et `JetBrains Mono` sont déclarées dans `index.css` mais jamais chargées (aucun `@font-face`, aucun lien de police, `frontend/public/` ne contient pas de fichier de fonte), donc le rendu réel tombe sur la pile système. Second écart : `frontend/index.html` porte encore `bg-slate-50 text-slate-900` et `selection:bg-red-100` sur le `<body>`, soit des gris froids et un rouge Tailwind qui contredisent les tokens chauds. Les valeurs de ce document décrivent le système cible et les tokens réellement définis ; ne pas s'aligner sur ces deux dérives.

## 2. Colors: La Palette Papier et Repère

Une palette de papier technique chaud sur laquelle un seul rouge a le droit de parler.

### Primary

- **Rouge Repère** (`#c53120`, `hsl(6 72% 45%)`) : l'unique accent identitaire. Il marque l'action primaire et l'état bloquant, rien d'autre. `Button.tsx` documente déjà la contrepartie de cette rareté : le variant `solid` existe précisément pour offrir une action primaire neutre « pour libérer le rouge CIR pour la seule sémantique d'état bloquant, dans les écrans où les deux se côtoieraient ».
- **Rouge Repère Profond** (`#842015`, `hsl(6 72% 30%)`) : le texte et les icônes posés sur un fond `accent`. Assez sombre pour rester lisible sur crème rosé.
- **Voile Repère** (`#fbf0ef`, `hsl(7 58% 96%)`) : le fond de survol et de sélection. C'est la seule dilution du rouge autorisée en surface.

### Secondary

- **Papier Sable** (`#f7f6f2`, `hsl(44 24% 96%)`) : les fonds de contrôles secondaires et les zones atténuées. `secondary` et `muted` partagent volontairement cette valeur : ce sont deux usages du même papier, pas deux couleurs.

### Tertiary

- **Ambre Avertissement** (`#de9a1b`, `hsl(39 78% 49%)`) : les fonds et pastilles d'avertissement.
- **Ambre Lisible** (`#92610c`, `hsl(38 85% 31%)`) : le texte d'avertissement. Cette couleur existe pour une seule raison, notée dans le code : l'ambre de fond ne peut pas tenir 4,5:1 en texte sans virer au brun.
- **Vert Sourd** (`#2b7d51`, `hsl(148 49% 33%)`) : la validation et l'état conforme. Désaturé exprès pour ne jamais concurrencer le rouge.
- **Rouge Destructif** (`#dd1313`, `hsl(0 84.2% 47%)`) : la suppression et l'erreur dure. Distinct du Rouge Repère, plus saturé et plus froid, parce qu'il ne dit pas la même chose.

### Neutral

- **Crème Plan** (`#fdfdfc`, `hsl(48 30% 99%)`) : le fond de l'application. Presque blanc, jamais blanc.
- **Encre Graphite** (`#2f2b27`, `hsl(30 9% 17%)`) : le texte principal, et le fond du bouton `solid`. Un brun-gris très sombre, jamais du noir.
- **Papier 1 / 2 / 3** (`#fbfbf8`, `#f7f6f3`, `#edebe8`) : les trois strates d'empilement. C'est le mécanisme d'élévation du système, décrit en section 4.
- **Blanc Fiche** (`#ffffff`) : réservé aux cartes, popovers et dialogs. Le blanc pur est un signal de premier plan, pas une couleur de fond.
- **Mine Atténuée** (`#756e66`, `hsl(31 7% 43%)`) : les labels, aides et textes secondaires.
- **Filet** (`#e4e1dd`, `hsl(36 12% 88%)`) et **Filet Discret** (`#f4f3f0`, `hsl(40 16% 95%)`) : les deux graisses de séparation. Le filet discret sépare à l'intérieur d'un bloc, le filet normal sépare des blocs.

### Named Rules

**The Single Marker Rule.** Le Rouge Repère occupe 10 % au maximum d'un écran donné. Sa rareté est ce qui le rend lisible. Si deux éléments rouges sont visibles simultanément sans être l'action primaire et une alerte, un des deux est faux.

**The Warm Paper Rule.** Aucun `#000`, aucun `#fff` en texte ou en fond de page, et aucun gris froid. Toute neutre est teintée entre 30 et 48 de teinte. Les classes `slate-*`, `gray-*`, `zinc-*` de Tailwind sont interdites : elles cassent la chaleur de la palette. Test d'audit : si un aplat posé à côté du fond paraît bleuté, il vient de la mauvaise famille.

**The Token-Only Rule.** Aucun littéral hexadécimal dans un composant. Les couleurs passent par les variables CSS et les classes Tailwind qui les exposent. Les valeurs hexadécimales de ce document servent la documentation et l'outillage, pas le code.

## 3. Typography

**Body Font:** Inter Tight (with Inter, -apple-system, Segoe UI, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, Menlo, Consolas)

**Character:** une sans-serif resserrée qui gagne de la largeur sans perdre en lisibilité, doublée d'un monospace pour tout ce qui se compare verticalement. Le système n'a volontairement aucune police d'affichage, ce qui est cohérent avec « l'outil disparaît derrière la donnée » : la hiérarchie se fait par la graisse et l'échelle, jamais par un changement de famille décoratif. Le corps porte `font-feature-settings: "cv11", "ss01", "ss03"`.

### Hierarchy

- **Headline** (600, 24 px, interligne 1.2, `tracking-tight`): les titres de page. Volontairement rare, 11 occurrences dans tout le frontend.
- **Title** (600, 16 px, interligne 1.3): les titres de section, de carte et de dialog. `CardTitle` applique `font-semibold leading-none tracking-tight`.
- **Body** (400, 13 px, interligne 1.5): la base de `<body>`, les champs de saisie confortables, la prose.
- **Body dense** (400, 12 px, interligne 1.45): le vrai corps de texte de l'application. 560 occurrences, contre 238 pour le 14 px. Les tables, listes, boutons et contrôles vivent ici.
- **Label** (600, 11 px, `tracking-wide` au maximum): les micro-labels, badges, chips et en-têtes de colonne. C'est le plancher absolu.
- **Data** (JetBrains Mono, 500, 12 px, `tabular-nums`): les identifiants, références, codes et colonnes numériques.

### Named Rules

**The 11px Floor Rule.** Aucune chaîne visible ne descend sous 11 px, badges, chips, `kbd` et micro-labels compris. Quand un label doit peser moins, compenser par une graisse plus basse et un `tracking-wide`, jamais en réduisant la taille. Les 239 `text-[10px]` encore présents dans le code sont une dette identifiée, pas une permission.

**The Aligned Figures Rule.** Toute colonne numérique comparée verticalement (montants, quantités, remises, paliers) passe en `tabular-nums`. Un chiffre qui danse d'une ligne à l'autre rend une table illisible pour la seule tâche qui compte : repérer l'écart.

**The Weight-Before-Size Rule.** La hiérarchie se construit par contraste de graisse à échelle constante. Monter d'un cran de taille est le dernier recours, parce que chaque pixel de hauteur est une ligne perdue.

## 4. Elevation

Ce système n'utilise pratiquement pas d'ombre. La profondeur vient de l'empilement de surfaces teintées et du filet d'1 px. Une carte ne flotte pas au-dessus de la page, elle est posée sur un papier légèrement plus clair, cernée d'un filet. L'échelle est explicite : `background` (le fond de page) porte `surface-1`, qui porte `surface-2`, qui porte `surface-3`, et `card` blanc marque le premier plan absolu. Choisir la strate est le geste d'élévation ; ajouter une ombre n'en est pas un.

### Shadow Vocabulary

- **shadow-soft** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): la seule ombre déclarée dans `tailwind.config.cjs`. Réservée aux éléments réellement détachés du flux (popover, menu déroulant, tooltip).
- **tech-raised** (`box-shadow: 0 1px 2px hsl(30 9% 17% / 0.04), 0 0 0 1px hsl(36 12% 88% / 0.7)`): un pixel d'ombre plus un filet. Suffit à détacher une surface blanche du fond chaud sans jamais peser.
- **tech-raised-hover** (`box-shadow: 0 2px 8px hsl(30 9% 17% / 0.06), 0 0 0 1px hsl(36 12% 88%)`): la réponse au survol, transition de 150 ms sur `box-shadow` et `transform`.
- **kbd-key** (`box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05)`): le relief d'une touche de clavier sur le composant `Kbd`.

### Texture Vocabulary

Les trames remplacent l'ombre partout où il s'agit de qualifier une surface plutôt que de la soulever.

- **tech-dots** (`radial-gradient(hsl(30 9% 17% / 0.085) 1px, transparent 1px)`, trame de 16 px): la trame de fond des surfaces techniques. Le décalage de `-1px -1px` fait tomber les points sur les intersections.
- **tech-hatch** (`repeating-linear-gradient(-45deg, hsl(30 9% 17% / 0.14) 0 1px, transparent 1px 5px)`): l'absence de donnée. Jamais une case vide, jamais un zéro.

### Named Rules

**The Layer-Before-Shadow Rule.** Pour détacher un bloc, monter d'une surface. Si le contraste ne suffit pas, ajouter un filet. Si le filet ne suffit pas encore, alors seulement envisager `tech-raised`. Test d'audit : si un écran comporte plus de deux valeurs de `box-shadow` distinctes, l'élévation a été traitée à l'ombre au lieu de la strate.

**The White-Is-Foreground Rule.** Le blanc pur (`card`) signifie « ceci est au premier plan ». L'utiliser comme fond de page ou de section détruit tout le vocabulaire d'élévation.

**The Hatch-Not-Blank Rule.** Une donnée absente est hachurée (`tech-hatch`), pas remplacée par une case vide ni par un zéro. Un zéro affiché est une valeur mesurée ; un vide est une question sans réponse. Les deux ne se confondent pas.

## 5. Components

Les primitifs vivent dans `frontend/src/components/ui/` (`inputs/basic`, `data-display`, `feedback`, `navigation`). Réutiliser le composant frère le plus proche avant d'inventer un pattern.

Philosophie transverse : **sobres et exacts**. Rien ne bouge sans raison, tout s'aligne sur la grille de 4 px. Le composant est un contenant transparent : filet d'1 px, fond de surface, aucun effet.

### Buttons

- **Shape:** angles nettement arrondis (`rounded-lg`, 0.625rem). Noter que le bouton et le champ utilisent `lg` et non le `--radius` par défaut (0.375rem), qui reste celui des badges.
- **Primary:** Rouge Repère sur texte quasi blanc, `h-8 px-3`, sans ombre. Survol à `bg-primary/90`.
- **Solid:** Encre Graphite sur fond de page. C'est l'action primaire **neutre**, à préférer dès qu'un écran doit aussi porter du rouge sémantique.
- **Hover / Focus:** transition de 150 ms sur couleur, fond, bordure, ombre et transform. `active:scale-[0.98]` donne le retour tactile. Focus : `ring-2 ring-ring/45 ring-offset-2 ring-offset-background`.
- **Outline / Secondary / Ghost / Link:** `outline` prend un filet `border-input` sur fond de page et bascule sur `accent` au survol ; `ghost` n'a de fond qu'au survol ; `link` souligne à 4 px de décalage.
- **Sizes:** neuf tailles, toutes à 32 px de haut sauf trois : `comfortable` (36 px), `lg` (40 px) et `dataRow` (28 px, texte 11 px). `icon` et `control` sont carrés en 32 px. La densité se choisit par la taille, pas par une classe ad hoc.

### Chips (Badges)

- **Style:** `rounded-md` (0.375rem), filet transparent sur les variants pleins, `font-semibold`.
- **Density:** `dense` (`px-2 py-0.5`, 12 px) par défaut, `comfortable` (`px-2.5 py-1`, 14 px) en exception.
- **State:** sept variants sémantiques (`default`, `secondary`, `destructive`, `warning`, `success`, `ghost`, `outline`). `ghost` est le badge sans poids, pour une métadonnée qui doit rester lisible sans attirer l'œil.

### Cards / Containers

- **Corner Style:** `rounded-lg` (0.625rem).
- **Background:** trois variants seulement. `default` sur `card` blanc, `section` sur `surface-1`, `ghost` transparent.
- **Shadow Strategy:** `shadow-none` sur les trois. Voir section 4 : la carte se détache par sa surface et son filet.
- **Border:** filet d'1 px sur `border`.
- **Internal Padding:** 24 px (`p-6`) dans `CardHeader`, `CardContent` et `CardFooter`. `CardSection` découpe une carte en bandes séparées par un filet horizontal (`border-t px-6 py-4`, supprimé sur la première).

### Inputs / Fields

- **Style:** filet `border-input` sur fond de page, `rounded-lg`, `shadow-none`.
- **Density:** `comfortable` par défaut (36 px, 14 px de texte), `dense` / `control` / `toolbar` à 32 px et 12 px.
- **Hover:** le filet se renforce (`border-border/90`). C'est le seul retour au survol.
- **Focus:** `ring-2 ring-ring/45 ring-offset-2`. Le ring est rouge, dérivé de `--ring`.
- **Error:** piloté par `aria-invalid`, pas par une prop : `aria-invalid:border-destructive/60` et ring destructif. L'état d'erreur est donc accessible par construction.
- **Tone:** `warning` et `destructive` permettent un état pré-validation sans attendre `aria-invalid`.

### Navigation

- **Command palette (Ctrl+K)** : l'entrée privilégiée pour la navigation et les actions globales. Les raccourcis s'affichent en `Kbd`.
- **`Kbd`** : 18 px de haut, `rounded-[3px]`, fond `surface-2`, filet `border`, monospace, `shadow-[0_1px_0_rgba(0,0,0,0.05)]` qui imite le relief d'une touche. Son `text-[10px]` actuel viole le plancher à 11 px : c'est de la dette.
- **Dialogs centrés uniquement.** Les Sheets latéraux sont proscrits (voir Do's and Don'ts). Un `Sheet.tsx` subsiste dans `feedback/` par héritage ; ne pas l'utiliser pour un nouvel écran.
- **Tabs, DropdownMenu, Popover** : primitifs Radix, densité alignée sur 32 px.

### Skeleton (composant signature)

`.skeleton-shimmer` balaie un dégradé sur `muted` en 1,4 s, `ease-in-out`, en boucle. Sous `prefers-reduced-motion: reduce`, l'animation s'arrête et le dégradé se fige à sa position initiale : le squelette reste visible et lisible, il cesse seulement de défiler. C'est le modèle à suivre pour toute animation du système, une dégradation qui préserve l'information.

## 6. Do's and Don'ts

### Do:

- **Do** passer par les tokens (`hsl(var(--token))` ou les classes Tailwind qui les exposent) pour toute couleur.
- **Do** monter d'une strate de surface (`background` vers `surface-1/2/3` vers `card`) pour détacher un bloc, avant même de penser à une ombre.
- **Do** réserver le Rouge Repère (`#c53120`) à l'action primaire et à l'état bloquant, sous 10 % de l'écran. Utiliser le variant `solid` (Encre Graphite) dès qu'un écran porte déjà du rouge sémantique.
- **Do** utiliser `--warning-strong` pour le texte d'avertissement et `--warning` pour les fonds.
- **Do** appliquer `tabular-nums` à toute colonne numérique comparée verticalement.
- **Do** tenir le plancher de 11 px, en compensant par la graisse et le `tracking` plutôt qu'en descendant.
- **Do** hachurer l'absence de donnée avec `.tech-hatch`, jamais laisser une case vide ni afficher un zéro à la place.
- **Do** concevoir les six états avant de livrer : survol, `focus-visible`, désactivé, chargement (`skeleton-shimmer`), vide, erreur.
- **Do** écrire en français, au vouvoiement, en phrases courtes (« Saisissez un numéro », « Avec qui avez-vous échangé ? »).
- **Do** ouvrir tout détail ou toute édition dans un Dialog centré.
- **Do** aligner sur la grille de 4 px et vérifier qu'aucune marge orpheline ne se bat avec un `gap` de flex ou de grid.

### Don't:

- **Don't** ressembler à un **ERP legacy (SAP, Sage)** : grilles grises indifférenciées, icônes de 2008, densité subie sans hiérarchie visuelle. La densité ici est choisie, donc elle doit être hiérarchisée.
- **Don't** ressembler à un **SaaS IA générique** : pas de dark mode, pas de dégradés violets, pas d'accents néon, pas de glassmorphism, et surtout pas le gabarit hero-metric (gros chiffre, petit label, stats de soutien, accent en dégradé).
- **Don't** ressembler à un **CRM grand public (HubSpot, Salesforce)** : pas de chrome coloré, pas d'illustrations mascottes, pas de cartes identiques répétées à l'infini, pas de ton commercial enjoué.
- **Don't** ressembler à un **dashboard Material ou Bootstrap** : pas d'ombres portées lourdes, pas de cartes empilées, pas de boutons pleine largeur, pas de palette bleu par défaut.
- **Don't** utiliser `#000`, `#fff` en texte ou fond de page, ni aucun gris froid (`slate-*`, `gray-*`, `zinc-*`). Test d'audit : un aplat qui paraît bleuté à côté du fond crème vient de la mauvaise famille.
- **Don't** écrire un littéral hexadécimal dans un composant.
- **Don't** ouvrir un Sheet ou un drawer latéral droit. Décision produit non négociable : tout détail s'ouvre en Dialog centré.
- **Don't** utiliser un `border-left` ou `border-right` de plus d'1 px comme accent coloré sur une carte, une ligne ou une alerte. Remplacer par un filet complet, un fond teinté, ou rien.
- **Don't** appliquer un dégradé sur du texte (`background-clip: text`).
- **Don't** empiler une carte dans une carte. Utiliser `CardSection` pour découper, ou une strate de surface.
- **Don't** descendre sous 11 px. Les 239 `text-[10px]` restants sont une dette, pas un précédent.
- **Don't** ajouter une deuxième ombre à un écran qui en a déjà une. Si l'élévation ne se lit pas, c'est la strate qui est fausse.
- **Don't** animer une propriété de mise en page, ni utiliser un `bounce` ou un `elastic`. Transitions de 150 ms, sorties en exponentielle.
- **Don't** livrer du texte décoratif, un faux libellé ou une donnée factice.
- **Don't** tutoyer l'utilisateur.
