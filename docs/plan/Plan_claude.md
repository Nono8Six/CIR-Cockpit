# Refonte UI/UX Module Clients - Inspiration Linear.app

## Contexte

Le module clients (`/clients`) est fonctionnel mais visuellement en retard : trop de bordures, labels verbeux en UPPERCASE, cartes generiques, formulaire dialog lourd (25 props drilling dans `ClientFormContent`), empty states nus, zero animation. L'objectif est d'atteindre un niveau de polish proche de Linear.app tout en gardant le rouge CIR comme brand color.

**Systeme actif** : `frontend/src/components/client-directory/` (21 fichiers source + 7 fichiers test = 28 total)
- Route : `frontend/src/app/router.tsx:34` -> `ClientDirectoryPage`
- L'onglet `clients` dans `AppMainTabContent.tsx:141` utilise `<Outlet />` (TanStack Router)

**Ancien systeme** : `frontend/src/components/clients/` (17 fichiers) n'est plus dans l'arbre de rendu runtime, mais des hooks/types/prefetch y sont encore lies (`useClientsPanelState`, `queryPrefetch`). Ce n'est pas du dead code au sens strict repo - nettoyage hors scope.

**Flux actifs a couvrir** :
1. **Liste annuaire** : `ClientDirectoryPage.tsx` -> `ClientDirectoryTable.tsx`
2. **Page detail client** : `ClientDirectoryDetailPage.tsx` (routeRef client_number)
3. **Page detail prospect** : meme `ClientDirectoryDetailPage.tsx` (routeRef prospect_id)
4. **Edition client company** : `ClientFormDialog.tsx` (composant local `ClientFormDialogLegacy`, ligne 51)
5. **Edition client individual / Creation** : `EntityOnboardingDialog.tsx` (1068 lignes, mode page ou dialog)
6. **Edition prospect** : `ProspectFormDialog.tsx` (composant local `ProspectFormDialogLegacy`)
7. **Creation** : `ClientDirectoryCreatePage.tsx` -> `EntityOnboardingDialog` surface="page"
8. **Conversion prospect->client** : `ClientDirectoryConvertPage.tsx`
9. **Filtres desktop** : `ClientDirectoryFilters.tsx` -> `DirectoryDesktopFiltersRow.tsx`
10. **Filtres mobile** : `ClientDirectoryFilters.tsx:184` -> `DirectoryMobileFilterSheet.tsx`

## Decisions utilisateur

- **Perimetre** : `client-directory/` et composants partages (formulaires, UI)
- **Couleur** : Garder le rouge CIR, adoucir l'usage (moins omnipresent, mieux dose)
- **Animations** : Ajouter `motion` (package `motion`, import depuis `motion/react`)
- **Priorite** : Visuel d'abord (phases 1-4), refactor technique ensuite (hors scope initial)

---

## Scoring actuel (/100)

| Zone | Score | Problemes cles |
|------|-------|----------------|
| Liste/Table (`ClientDirectoryTable`) | 48 | Table generique, pas de status dots, zebra striping inutile, hover trop discret |
| Filtres desktop (`DirectoryDesktopFiltersRow`) | 52 | Fonctionnellement riche mais labels UPPERCASE partout, trop de bordures |
| Filtres mobile (`DirectoryMobileFilterSheet`) | 45 | Sheet fonctionnel mais style incoherent avec desktop, padding trop genereux |
| Page detail (`ClientDirectoryDetailPage`) | 35 | Building2 dans box grise 56px, cartes Info/Notes quasi vides, contacts sans avatar, dates absolues |
| Form edit client legacy (`ClientFormDialogLegacy` dans ClientFormDialog.tsx:51) | 30 | 25 props drilling, hidden input hacks, textarea brut, footer bruit |
| Form edit prospect (`ProspectFormDialogLegacy` dans ProspectFormDialog.tsx) | 30 | Memes problemes que le form client legacy |
| Wizard creation (`EntityOnboardingDialog`) | 45 | Stepper correct, mais 1068 lignes, textes trop verbeux, cartes de choix lourdes |
| Couleurs/Theme | 40 | Rouge agressif partout en primary, surfaces quasi indistinguables |
| Empty states | 25 | Tous identiques : "Aucun resultat" + icone, zero CTA actionnable |
| Animations/Transitions | 15 | Zero AnimatePresence, dialogs ont fade CSS natif via Radix |

**Score global : 37/100**

---

## Contraintes techniques

- `Ctrl+K` est deja lie a la recherche globale (`frontend/src/app/useAppShortcuts.ts:29`) et affiche dans `AppHeaderSearchButton`. Ne PAS re-utiliser ce raccourci ailleurs.
- `frontend/src/components/ui/dialog.tsx:24` a deja des animations CSS Radix (`animate-in`/`animate-out`, `fade-in-0`/`fade-out-0`). Ne PAS superposer motion sur DialogContent pour eviter double animation.
- `DirectoryRecord` (dans `shared/schemas/directory.schema.ts`) n'a PAS de champ "last activity" - seulement `updated_at` et `created_at`. Ne pas inventer de donnees.
- `StatusDot` doit gerer 2 axes independants : `entity_type` (Client/Prospect) ET `archived_at` (null = actif, date = archive). Un prospect peut etre archive.
- `frontend/src/components/ui/skeleton.tsx` n'existe PAS encore - a creer.
- Le package correct est `motion` (pas `framer-motion`), import depuis `motion/react`. Cf. motion.dev/docs/react-installation.
- Honorer `prefers-reduced-motion` : utiliser `useReducedMotion()` de motion pour desactiver les animations.
- Le script `test` dans `frontend/package.json:15` est `vitest` (mode interactif/watch). Utiliser `test:run` (`vitest run`) pour la gate QA.

## Skills obligatoires (CLAUDE.md)

Avant implementation, invoquer :
- `vercel-react-best-practices` avant modifications composants React
- `vercel-composition-patterns` si refactoring composition
- `web-design-guidelines` pour audit UI/accessibilite
- `taste-skill` (nom registre: `taste-skill`) pour decisions design
- `vitest` pour tout nouveau test
- `pnpm` pour install dependencies
- Context7 pour verifier compat React 19 + motion

---

## Phase 1 : Fondation Theme + Utilitaires (jour 1)

### 1A. Installer motion

```bash
cd frontend && pnpm add motion
```

### 1B. Ajuster les tokens CSS

**Fichiers** : `frontend/src/index.css` + `frontend/tailwind.config.cjs`

**Impact** : Ces fichiers sont **repo-wide** (globaux au frontend). Les tokens ajoutes sont conservateurs et ne modifient pas `--primary` ni `--border` existants, mais tout composant frontend pourra les utiliser.

Changements :
- Ajouter `--surface-3: 220 16% 92%` pour profondeur nested
- Ajouter `--border-subtle: 220 13% 95%` pour separateurs internes legers
- Ajouter ces tokens dans `tailwind.config.cjs` : `surface-3`, `border-subtle`

### 1C. Nouveaux composants UI

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `StatusDot` | `frontend/src/components/ui/status-dot.tsx` | Props: `entityType: 'Client' \| 'Prospect'`, `archivedAt: string \| null`. Logique: archive=amber, client actif=vert, prospect actif=bleu |
| `AvatarInitials` | `frontend/src/components/ui/avatar-initials.tsx` | Props: `name: string`, `size: 'sm' \| 'md'`. Cercle avec initiales, couleur deterministe par hash |
| `Skeleton` | `frontend/src/components/ui/skeleton.tsx` | Shimmer loading standard shadcn (a creer, n'existe pas) |

### 1D. Utilitaire temps relatif

**Fichier** : `frontend/src/utils/date/formatRelativeTime.ts`
- Wrapper `formatDistanceToNow` (date-fns 4.1.0, deja installe) avec `{ locale: fr, addSuffix: true }`
- Usage : "il y a 2 h", "il y a 3 jours"
- **Test** : `frontend/src/utils/date/__tests__/formatRelativeTime.test.ts`

---

## Phase 2 : Refonte Liste/Table (jours 2-3)

**Fichiers** :
- `frontend/src/components/client-directory/ClientDirectoryTable.tsx`
- `frontend/src/components/client-directory/data-table/DataTableColumnHeader.tsx`

### Changements

1. **Colonne entity_type** : Remplacer `<Badge variant="secondary">` par `<StatusDot>` + texte label a cote. Le StatusDot gere les 2 axes (type + archive).
2. **Hover rows** : `hover:bg-accent/35` -> `hover:bg-primary/[0.03]` (plus subtil a la Linear)
3. **Zebra striping** : Retirer `index % 2 === 1 && 'bg-muted/20'` (Linear n'en a pas)
4. **Nom clickable** : Ajouter `hover:text-primary/80` avec transition CSS smooth
5. **Headers** : Simplifier `DataTableColumnHeader` - reduire padding, style plus leger
6. **Date updated_at** : Remplacer `formatDate` par `formatRelativeTime` ("il y a 3j")
7. **Empty state** : Garder le pattern actuel (SearchX + texte) mais enrichir le texte, ajouter une description secondaire. PAS de CTA "Nouvelle fiche" (necessiterait un nouveau contrat `onCreate` non existant dans `ClientDirectoryTable`).
8. **Animation mount** : Ajouter `motion.div` uniquement sur le wrapper table, avec `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` simple. PAS de `motion.tr` sur chaque row (performance + reduced-motion). Checker `useReducedMotion()`.

### Utilitaires existants a reutiliser
- `formatClientNumber` : `frontend/src/utils/clients/formatClientNumber.ts`
- `getDirectoryTypeLabel` : `frontend/src/components/client-directory/clientDirectorySearch.ts`
- `cn()` : `frontend/src/lib/utils.ts`
- `DIRECTORY_COLUMN_LABELS` : `frontend/src/components/client-directory/directoryGridConfig.ts`

---

## Phase 3 : Refonte Filtres Desktop + Mobile (jour 3)

**Fichiers desktop** :
- `frontend/src/components/client-directory/ClientDirectoryFilters.tsx`
- `frontend/src/components/client-directory/directory-filters/DirectoryDesktopFiltersRow.tsx`
- `frontend/src/components/client-directory/directory-filters/DirectorySearchInput.tsx`
- `frontend/src/components/client-directory/directory-filters/DirectoryTypeFilter.tsx`

**Fichiers mobile** (coherence obligatoire) :
- `frontend/src/components/client-directory/DirectoryMobileFilterSheet.tsx`

### Changements

1. **Labels UPPERCASE** : Remplacer tous les `uppercase tracking-[0.16em]` par `text-xs font-medium` (sentence case) dans les deux vues (desktop ET mobile)
2. **Titre "Clients et prospects"** dans `ClientDirectoryPage.tsx` : `text-lg` OK, mais badge count plus discret (`variant="ghost"` ou `text-muted-foreground`)
3. **Input recherche** : PAS de hint Ctrl+K (deja utilise globalement). Simplifier le placeholder.
4. **Filtres row desktop** : Reduire padding `py-2` a `py-1.5`, border-b `border-border/40` -> `border-border-subtle`
5. **Type filter pills** : Transitions hover plus smooth (`transition-colors duration-150`)
6. **Mobile sheet** : Appliquer les memes changements de labels, padding, et style que desktop pour coherence
7. **Bouton "Nouvelle fiche"** : Garder style actuel (primary = rouge CIR). C'est le bon usage du rouge.

---

## Phase 4 : Refonte Page Detail (jours 4-5)

**Fichier principal** : `frontend/src/components/client-directory/ClientDirectoryDetailPage.tsx`

### Header (lignes 156-193)
1. **Supprimer l'icone Building2** dans le box 56px (`h-14 w-14 rounded-2xl border bg-muted/40`). Remplacer par `StatusDot` inline avant les badges.
2. **Badges** : Garder mais affiner - `variant="outline"` plus leger, reduire le nombre si redondant
3. **Nom** : `text-2xl` -> `text-xl font-semibold tracking-tight`
4. **Adresse/Agence/Commercial** : `text-sm` -> `text-[13px]`
5. **Dates** : Utiliser `formatRelativeTime` pour `updated_at`. Garder `formatDate` pour `created_at` (date de creation reste absolue).

### Cartes Info (lignes 196-210)
1. **Labels** : `uppercase tracking-[0.16em]` -> `text-xs font-medium` sentence case
2. **Bordures** : `rounded-2xl border-border/70` -> `rounded-xl border-border/50`
3. **Notes vide** : "Aucune note enregistree." -> afficher en `italic text-muted-foreground/60`
4. **PAS d'ajout "derniere activite"** dans la card Informations (`DirectoryRecord` n'a pas ce champ)

### Contacts (lignes 212-232)
1. **Ajouter `AvatarInitials`** devant chaque contact
2. **Email** : Wrapper dans `<a href="mailto:...">` clickable
3. **Phone** : Wrapper dans `<a href="tel:...">` clickable
4. **Hover** : `hover:bg-surface-1 transition-colors` sur chaque contact card

### Activite Recente (lignes 234-252)
1. **Date** : Remplacer `formatDate + " a " + formatTime` par `formatRelativeTime`
2. **PAS de cursor-pointer** sur les interaction cards (aucun handler d'ouverture n'existe dans ce composant, pas de `onOpenInteraction` prop)
3. **Style cards** : `rounded-xl` -> ajouter `hover:bg-surface-1` seulement si on ajoute un handler (hors scope)

### Animation page
- Wrapper le contenu `<section>` principal dans `motion.section` avec `initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}`
- Conditionner avec `useReducedMotion()` : si reduced, pas d'animation

---

## Phase 5 : Polish Formulaires (jours 5-6)

### 5A. Form edit client legacy (`ClientFormDialog.tsx:51`)

**Fichiers** :
- `frontend/src/components/client-form/ClientFormHeader.tsx`
- `frontend/src/components/client-form/ClientFormFooter.tsx`
- `frontend/src/components/client-form/ClientFormNotesSection.tsx`
- `frontend/src/components/client-form/ClientFormContent.tsx`

**Changements visuels uniquement** (pas de refactor archi) :
1. **Header** : Supprimer le box `h-9 w-9 rounded-xl bg-primary/10` avec Building2. Juste "Modifier le client" en `text-base font-semibold`. Supprimer le label "CLIENT" uppercase.
2. **Footer** : Supprimer `ClipboardList` icon + "Champs obligatoires pour creer la fiche client."
3. **Textarea Notes** : Remplacer `<textarea>` brut par un import de `@/components/ui/textarea` (existe deja dans `ui/textarea.tsx`). Reduire a 3 rows.
4. **Labels** : `text-xs font-medium text-muted-foreground` -> `text-sm font-medium text-foreground`
5. **Espacement** : `space-y-6` -> `space-y-4` dans le `<form>`
6. **PAS de motion sur Dialog** : Les animations Radix CSS existantes dans `ui/dialog.tsx:24` suffisent.

### 5B. Form edit prospect (`ProspectFormDialog.tsx`)

**Fichiers** (structure miroir de client-form) :
- `frontend/src/components/prospect-form/ProspectFormHeader.tsx` - Supprimer icon box + label uppercase
- `frontend/src/components/prospect-form/ProspectFormFooter.tsx` - Supprimer ClipboardList + texte bruit
- `frontend/src/components/prospect-form/ProspectFormNotesSection.tsx` - Textarea shadcn (meme fix que client)
- `frontend/src/components/prospect-form/ProspectFormContent.tsx` - Spacing `space-y-6` -> `space-y-4`
- `frontend/src/components/prospect-form/ProspectFormIdentitySection.tsx` - Labels sentence case
- `frontend/src/components/prospect-form/ProspectFormAddressSection.tsx` - Labels sentence case
- `frontend/src/components/prospect-form/ProspectFormMetaSection.tsx` - Labels sentence case

Appliquer les memes changements visuels que 5A sur chaque sous-fichier correspondant.

### 5C. Wizard creation (`EntityOnboardingDialog.tsx` + sous-composants)

**Fichiers** :
- `frontend/src/components/EntityOnboardingDialog.tsx` - Titre "CREATION ANNUAIRE" -> sentence case, textes verbeux, padding cartes choix, sidebar
- `frontend/src/components/entity-onboarding/EntityOnboardingSearchStep.tsx` - Labels, padding, style cards resultats recherche
- `frontend/src/components/entity-onboarding/EntityOnboardingReviewStep.tsx` - Labels, espacement, style recap
- `frontend/src/components/entity-onboarding/EntityOnboardingStepRail.tsx` - Style stepper rail
- `frontend/src/components/entity-onboarding/entityOnboarding.types.ts` - Aucun changement (reference)
- `frontend/src/components/entity-onboarding/entityOnboarding.schema.ts` - Aucun changement (reference)
- `frontend/src/components/entity-onboarding/entityOnboarding.utils.ts` - Aucun changement (reference)

**NOTE** : `EntityOnboardingDetailsStep.tsx` a deja des labels en sentence case (`text-sm font-medium text-foreground` via `FieldShell`). Pas de changement necessaire sur les labels de cette etape.

**Changements visuels** :
1. "CREATION ANNUAIRE" uppercase -> "Creation annuaire" sentence case (dans `EntityOnboardingDialog.tsx`)
2. Textes trop verbeux : raccourcir subtitles et footer messages (dans `EntityOnboardingDialog.tsx`)
3. Cartes de choix (Type de fiche) : reduire padding, rendre plus compact (dans `EntityOnboardingDialog.tsx`)
4. Sidebar explicative : condenser les textes (dans `EntityOnboardingDialog.tsx`)
5. `EntityOnboardingSearchStep.tsx` : labels et style des resultats de recherche
6. `EntityOnboardingReviewStep.tsx` : style recap, espacement
7. Animation transitions stepper : utiliser `AnimatePresence` de motion/react pour les transitions entre steps, avec `useReducedMotion()` guard

---

## Phase 6 : Quick Wins Cross-Module (jour 7)

1. **Supprimer TOUS les `uppercase tracking-widest` et `uppercase tracking-[0.16em]`** restants dans le perimetre client-directory
2. **Homogeneiser les bordures** : `border-border/70` -> `border-border/50` dans tout le module
3. **Homogeneiser les radius** : `rounded-2xl` -> `rounded-xl` (plus sobre)
4. **Loading states** : Utiliser le nouveau `Skeleton` dans le detail page (remplacer le texte "Chargement de la fiche...")
5. **Verifier coherence responsive** : passer en revue `DirectoryMobileFilterSheet` et s'assurer que tous les changements desktop sont repercutes

---

## Fichiers a modifier (recap)

### Core (impact repo-wide frontend)
- `frontend/src/index.css` - Ajout tokens `surface-3`, `border-subtle` (PAS de modif primary/border)
- `frontend/tailwind.config.cjs` - Ajout tokens Tailwind correspondants
- `frontend/package.json` - Ajout dep `motion`
- `pnpm-lock.yaml` - Auto-update

### Nouveaux fichiers
- `frontend/src/components/ui/status-dot.tsx`
- `frontend/src/components/ui/avatar-initials.tsx`
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/utils/date/formatRelativeTime.ts`
- `frontend/src/utils/date/__tests__/formatRelativeTime.test.ts`

### client-directory/ (systeme actif - 10 fichiers)
- `ClientDirectoryPage.tsx` - Badge count, titre
- `ClientDirectoryTable.tsx` - StatusDot, hover, zebra, animation, date relative
- `ClientDirectoryDetailPage.tsx` - Refonte majeure header/cards/contacts/activite
- `ClientDirectoryFilters.tsx` - Labels, padding
- `DirectoryMobileFilterSheet.tsx` - Coherence labels/padding avec desktop
- `directory-filters/DirectoryDesktopFiltersRow.tsx` - Labels sentence case
- `directory-filters/DirectorySearchInput.tsx` - Simplifier placeholder
- `directory-filters/DirectoryTypeFilter.tsx` - Transitions hover
- `data-table/DataTableColumnHeader.tsx` - Headers plus legers
- `directoryGridConfig.ts` - Eventuel ajustement labels

### Formulaires partages (17 fichiers)

**client-form/ (4 fichiers)** :
- `client-form/ClientFormHeader.tsx` - Supprimer icon box + label uppercase
- `client-form/ClientFormFooter.tsx` - Supprimer ClipboardList + texte
- `client-form/ClientFormNotesSection.tsx` - Import Textarea shadcn (existe deja)
- `client-form/ClientFormContent.tsx` - Spacing

**prospect-form/ (7 fichiers)** :
- `prospect-form/ProspectFormHeader.tsx` - Supprimer icon box + label uppercase
- `prospect-form/ProspectFormFooter.tsx` - Supprimer ClipboardList + texte
- `prospect-form/ProspectFormNotesSection.tsx` - Import Textarea shadcn
- `prospect-form/ProspectFormContent.tsx` - Spacing
- `prospect-form/ProspectFormIdentitySection.tsx` - Labels sentence case
- `prospect-form/ProspectFormAddressSection.tsx` - Labels sentence case
- `prospect-form/ProspectFormMetaSection.tsx` - Labels sentence case

**entity-onboarding/ (3 fichiers modifies + 3 reference)** :
- `EntityOnboardingDialog.tsx` - Titre, textes, padding, animation stepper
- `entity-onboarding/EntityOnboardingSearchStep.tsx` - Labels, style cards
- `entity-onboarding/EntityOnboardingReviewStep.tsx` - Style recap
- `entity-onboarding/EntityOnboardingStepRail.tsx` - Style stepper rail
- ~~`entity-onboarding/EntityOnboardingDetailsStep.tsx`~~ - PAS de changement (labels deja sentence case)

---

## Verification

### Gate QA (conformement a CLAUDE.md et docs/qa-runbook.md)

```bash
# Pendant implementation - boucle rapide
pnpm run qa:fast

# Avant livraison - gate complete
pnpm run qa

# Commandes detaillees si besoin
cd frontend && pnpm run typecheck        # Zero erreur TS
cd frontend && pnpm run lint             # --max-warnings=0
cd frontend && pnpm run test:run         # vitest run (PAS vitest interactif)
cd frontend && pnpm run check:error-compliance  # Conformite erreurs
cd frontend && pnpm run build            # Build production OK
```

### Verification visuelle (Chrome DevTools MCP)
1. `/clients` - Liste : StatusDots, hover subtil, pas de zebra, date relative, skeleton loading
2. `/clients` filtres - Labels sentence case, padding reduit, coherence desktop/mobile
3. `/clients/116277` - Detail : pas de Building2 box, StatusDot inline, avatars contacts, dates relatives
4. `/clients/116277` + click "Modifier" - Dialog simplifie, pas de Building2 header, pas de ClipboardList footer
5. `/clients/new` - Wizard : labels sentence case, textes condenses, animation stepper
6. Tester prospect detail + edit prospect (meme coherence que client)
7. Tester responsive : resize viewport, verifier `DirectoryMobileFilterSheet` coherent
8. Tester `prefers-reduced-motion: reduce` : animations desactivees

### Tests existants a maintenir (7 fichiers)
- `client-directory/__tests__/ClientDirectoryPage.test.tsx`
- `client-directory/__tests__/ClientDirectoryDetailPage.test.tsx`
- `client-directory/__tests__/ClientDirectoryTable.test.tsx`
- `client-directory/__tests__/ClientDirectoryFilters.test.tsx`
- `client-directory/__tests__/DirectoryTablePagination.test.tsx`
- `client-directory/__tests__/clientDirectorySearch.test.ts`
- `client-directory/__tests__/directoryGridConfig.test.ts`

### Nouveaux tests
- `frontend/src/utils/date/__tests__/formatRelativeTime.test.ts` - Unitaire formatRelativeTime

### Tests existants a mettre a jour (impact des changements UI)

Les tests existants mockent les sous-composants (`ClientDirectoryFilters`, `ClientDirectoryTable`, `DirectorySavedViewsBar` dans `ClientDirectoryPage.test.tsx`, dialogs dans `ClientDirectoryDetailPage.test.tsx`). Pour les modifications visuelles qui changent le rendu visible :

1. **`ClientDirectoryTable.test.tsx`** - Mettre a jour les assertions qui referencent `<Badge>` entity_type (remplace par `<StatusDot>`), et les assertions sur le zebra striping si testé
2. **`ClientDirectoryDetailPage.test.tsx`** - Mettre a jour assertions sur Building2 icon (supprimé), labels uppercase (sentence case), ajout AvatarInitials dans contacts
3. **`ClientDirectoryFilters.test.tsx`** - Verifier que les assertions sur les labels ne dependent pas du texte uppercase
4. **`ui/status-dot.tsx`** - Ajouter test unitaire: `frontend/src/components/ui/__tests__/status-dot.test.tsx` couvrant les 4 combinaisons (client actif, client archive, prospect actif, prospect archive)
5. **`ui/avatar-initials.tsx`** - Ajouter test unitaire: `frontend/src/components/ui/__tests__/avatar-initials.test.tsx` couvrant initiales, couleur deterministe, props size
