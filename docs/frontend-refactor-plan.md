# Frontend Refactor Plan CIR Cockpit (UI/UX, frontend-only)

Date de reference: 2026-02-09
Auteur: Codex (audit code + captures UI + validation Context7)
Portee: `frontend/` uniquement. Aucun changement backend, DB, API, ni logique metier.

---

## 0) Resume decisionnel

### Objectif
Refondre integralement l'experience UI/UX pour obtenir une interface B2B sobre, moderne, lisible, ultra responsive, sans chevauchement, sans scroll parasite de panneaux, et sans regressions metier.

### Decisions fermees
1. Garder React 19 + Vite 7 + Tailwind 4 + shadcn/ui comme base.
2. Garder React Hook Form + Zod pour les formulaires.
3. Ajouter `@tanstack/react-table` + `@tanstack/react-virtual` pour les ecrans volumineux (Clients, listes Pilotage).
4. Garder `cmdk` et migrer la recherche globale vers un pattern `CommandDialog` shadcn (au lieu du modal custom actuel).
5. Exclure Tiptap pour ce cycle.
6. Exclure DnD/Kanban drag-and-drop pour ce cycle (non prioritaire produit).
7. Calendrier: retenir une option 100% OSS. Choix par defaut: FullCalendar en mode OSS uniquement (sans Scheduler/Resource Timeline premium).
8. Ne pas migrer le routing applicatif dans ce cycle UX (pas de TanStack Router maintenant) pour limiter le blast radius. URL sync minimale seulement pour etat UI critique.
9. P04 a P09: toutes les surfaces interactives utilisent des primitives shadcn/radix (aucun composant custom equivalent si la primitive existe deja).
10. P04 a P09: toutes les icones UI utilisent `lucide-react`.
11. P04 a P09: strategie mobile-first avec priorite lisibilite (fallback combobox/sheet/sections compactes plutot que densite desktop forcee).
12. Gestion des erreurs avancee obligatoire sur chaque lot: `createAppError`, mappers dedies, `normalizeError`, `handleUiError`, `reportError`, `notifyError`.

### Mise a jour de pilotage (2026-02-09)
- [x] Correctifs cockpit P03.1 a P03.5 traces dans ce document avec preuves et validations.
- [x] Exigences P04 a P09 verrouillees: shadcn/radix obligatoire sur les composants interactifs.
- [x] Exigences P04 a P09 verrouillees: `lucide-react` obligatoire pour toute iconographie UI.
- [x] Exigences P04 a P09 verrouillees: mobile-first ultra-responsive (fallback combobox/sheet avant scroll local).
- [x] Gestion des erreurs avancees elevee au rang de gate bloquante de livraison (`check:error-compliance` + pipeline AppError).

### Definition of Done globale
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run lint -- --max-warnings=0`
3. `cd frontend && npm run test`
4. `cd frontend && npm run test:e2e` (parcours critiques)
5. Aucun overlap UI sur la matrice responsive cible.
6. Zero `\u2026`/`\u00B0` visibles litteralement dans le rendu.
7. Zero `select` natif restant dans les zones ciblees refactor (sauf exception documentee).
8. Zero `console.error`, `toast.error()` et `throw new Error()` hors couches autorisees/tests, conforme aux regles projet.
9. `cd frontend && npm run check:error-compliance` vert sur chaque phase.
10. Zero warning accessibilite Radix bloquant (Dialog/Popover/Command/Combobox) sur les parcours critiques.
11. Tout nouvel element visuel d action/filtre/navigation est implemente via primitive shadcn + icones Lucide.

---

## 1) Audit critique ultra-detaille (etat actuel)

## 1.1 Scorecard rapide par domaine

| Domaine | Severite | Diagnostic |
|---|---|---|
| App Shell/Header | P0 | Navigation compacte et collisions a faible largeur, hierarchie visuelle faible |
| Cockpit (F1) | P0 | Defauts UX structurels: double scroll, footer instable, placeholders casses, surcharge visuelle |
| Recherche globale | P1 | Overlay custom non robuste mobile, lisibilite et ergonomie clavier perfectibles |
| Clients (F5) | P1 | Architecture split panel fragile en responsive et perf limitee pour gros volumes |
| Pilotage (F2) | P1 | Kanban scroll interne + densite incoherente, toolbar encore fragile |
| Admin (F4) | P1 | Incoherence composants, placeholders unicode, natif/select mixe |
| Login | P2 | Correct fonctionnellement mais trop basique et peu distinctif premium B2B |

## 1.2 Defauts transverses mesures dans le code

Mesures faites sur `frontend/src`:
1. Placeholders unicode litteraux (`\u2026`, `\u00B0`): 12 occurrences.
2. Balises `<select` natives: 11 occurrences.
3. Typographie compacte `text-[10px]` / `text-[11px]`: 92 occurrences.
4. `overflow-y-auto` en composants applicatifs: 11 occurrences (certaines legitimes, plusieurs nuisibles UX).

Implication UX:
1. Cohesion visuelle insuffisante.
2. Accessibilite degradee (taille texte et focus density).
3. Incoherence interactionnelle entre ecrans.
4. Regressions de rendu deja visibles en production (ex: `N\u00B0`, `Ville\u2026`).

## 1.3 Findings critiques par ecran

### A) App Shell / Header
Fichiers: `frontend/src/components/AppHeader.tsx`, `frontend/src/components/app-header/AppHeaderTabsSection.tsx`, `frontend/src/components/app-header/AppHeaderSearchButton.tsx`, `frontend/src/components/app-header/AppHeaderBrandSection.tsx`.

Problemes:
1. Header monolithique sans strategie d'overflow des tabs.
2. Bouton recherche avec largeur fixe (`w-10 sm:w-44 md:w-60`) en concurrence directe avec tabs et branding.
3. Multiples micro-textes en `text-[10px]/[11px]` qui nuisent a la lisibilite.
4. A faible largeur, icones/tabs se compressent et perdent leur semantique.

### B) Cockpit (F1)
Fichiers: `frontend/src/components/CockpitForm.tsx`, `frontend/src/components/cockpit/CockpitFormLeftPane.tsx`, `frontend/src/components/cockpit/CockpitFormRightPane.tsx`, `frontend/src/components/cockpit/right/CockpitFooterSection.tsx`, `frontend/src/components/cockpit/right/CockpitStatusControl.tsx`, `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`.

Problemes:
1. Double scroll pane gauche/droite (`overflow-y-auto` sur les 2 panneaux).
2. Footer cockpit trop dense (grille 3 colonnes) et non stable en largeur intermediaire.
3. Placeholder casse: `N\u00B0 Devis\u2026`.
4. Section relation avec fond gris et vide visuel a droite.
5. Ordre des sections non optimal pour le flux metier attendu.
6. Etat/status et reference dossier peu lisibles en mobile.

### C) Recherche globale
Fichiers: `frontend/src/components/AppSearchOverlay.tsx`, `frontend/src/components/app-search/AppSearchHeader.tsx`, `frontend/src/components/app-search/AppSearchFooter.tsx`.

Problemes:
1. Overlay custom avec hauteur `max-h-[60vh]` et structure non optimisee mobile.
2. Header de recherche compressible avec coupe de texte.
3. Footer hints en `text-[10px]` trop petit.
4. UX clavier correcte mais non industrialisee comme un vrai command palette.

### D) Clients (F5)
Fichiers: `frontend/src/components/clients/ClientsPanelContent.tsx`, `frontend/src/components/clients/ClientsPanelListPane.tsx`, `frontend/src/components/clients/ClientsPanelDetailPane.tsx`.

Problemes:
1. Split layout base sur `xl:grid-cols-12` seulement, transitions intermediaires fragiles.
2. Double logique de scroll pane list/detail, experience heterogene.
3. Pas de virtualisation: risque perf sur 50k+ clients.
4. Etats selection/recherche pas encore standardises URL-first.

### E) Pilotage (F2)
Fichiers: `frontend/src/components/Dashboard.tsx`, `frontend/src/components/dashboard/DashboardToolbar.tsx`, `frontend/src/components/dashboard/DashboardKanban.tsx`, `frontend/src/components/dashboard/kanban/KanbanColumn.tsx`.

Problemes:
1. Kanban en 3 colonnes fixe des `md`, mais ergonomie mobile et scroll colonne a clarifier.
2. Scroll interne colonne (`overflow-y-auto`) non harmonise avec experience globale.
3. Densite info cartes heterogene.

### F) Admin (F4)
Fichiers: `frontend/src/components/AdminPanel.tsx`, `frontend/src/components/users/UsersManagerSearch.tsx`, `frontend/src/components/audit-logs/AuditLogsFilters.tsx`.

Problemes:
1. Placeholders unicode visibles (`Rechercher un utilisateur\u2026`, etc.).
2. Usage de `select` natifs encore present.
3. Design et systeme de champs non unifies avec cockpit/clients.

### G) Login
Fichiers: `frontend/src/components/LoginScreen.tsx`, `frontend/src/components/login/LoginScreenForm.tsx`, `frontend/src/components/login/LoginScreenBrand.tsx`.

Problemes:
1. Ecran propre mais trop generique pour une image "ultra pro".
2. Hiarchie typo perfectible (micro-texte 10/11 px).
3. Pas de variation responsive avancee (densite/espacement).

## 1.4 Critique du plan Claude precedent

Points positifs:
1. Bonne detection de bugs critiques cockpit (unicode, footer, relation, scroll).
2. Bonne intention de phasage.

Points insuffisants:
1. Audit incomplet: focus quasi exclusif cockpit, pas assez systemique (header, clients, pilotage, admin, search).
2. Trop de decisions structurelles sans garde-fous de blast radius.
3. Pas assez de criteres de sortie mesurables par micro-etape.
4. Pas assez de lien explicite avec la standardisation de composants shadcn.
5. Manque un cadre d'industrialisation (a11y, perf, visual QA, rollback operationnel).

---

## 2) Stack frontend cible (janvier 2026) - validee Context7

## 2.1 Conserve (deja en place)
1. `react@19`, `react-dom@19`, `vite@7`, `tailwindcss@4`.
2. `@tanstack/react-query@5`.
3. `react-hook-form@7` + `zod@4`.
4. shadcn/ui + Radix.
5. `cmdk` pour command palette.

## 2.2 A ajouter maintenant
1. `@tanstack/react-table` (data grid headless robuste).
2. `@tanstack/react-virtual` (virtualisation des listes lourdes).
3. `@axe-core/react` + `eslint-plugin-jsx-a11y` (hardening accessibilite).

## 2.3 A garder optionnel / plus tard
1. `motion` (si animations critiques necessaires uniquement).
2. Calendar planning (si besoin produit explicitement priorise).

## 2.4 Exclusions explicites
1. Tiptap: exclu pour ce cycle.
2. `@dnd-kit/*`: exclu pour ce cycle.
3. Migration router complete: exclue pour ce cycle (cout/risque > gain UX immediat).

## 2.5 Decision calendrier open source
Choix par defaut: FullCalendar OSS uniquement (`@fullcalendar/core`, `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`).

Justification:
1. Context7 confirme que les vues resource timeline/scheduler demandent une `schedulerLicenseKey` (premium).
2. On reste donc sur un socle 100% OSS dans ce cycle.
3. Si timeline ressources devient prioritaire metier, arbitrage budget/licence dans un lot separe.

## 2.6 Pourquoi TanStack Table + Virtual: oui
1. Conformite avec volumetrie annoncee (50k+ clients, 800k refs produits).
2. Pattern stable avec shadcn DataTable (Context7) sans lock-in visuel.
3. Controle fin tri/filtres/selection + virtualisation performante.

---

## 3) Spec UX cible (non-negociable)

## 3.1 Principes
1. Sobre, professionnel, oriente efficacite B2B.
2. Densite maitrisee, lisibilite prioritaire.
3. Cohesion inter-ecrans via primitives partagees.
4. Navigation clavier complete sur parcours critiques.

## 3.2 Responsive contract
Breakpoints de recette obligatoires:
1. 320x568
2. 360x800
3. 390x844
4. 768x1024
5. 1024x768
6. 1280x800
7. 1440x900

Regles:
1. Aucun bouton/champ ne se chevauche.
2. Aucun texte critique ne sort de son container.
3. Aucun panneau gauche/droite ne cree un scroll interne non intentionnel.
4. Un seul axe de scroll principal par vue.

## 3.3 Formes et champs
1. Plus de `select` natif dans les zones refactorees: shadcn Select/NativeSelect standardise selon besoin.
2. Plus de placeholders unicode litteraux.
3. Taille mini recommandee texte UI: 12 px (exceptions rares documentees).

## 3.4 Erreurs et feedback
1. Pipeline erreur projet obligatoire (`createAppError`, mappers, `handleUiError`, `reportError`, `notifyError`).
2. Messages utilisateurs en francais.
3. Toast non bloquant sur mobile (position et largeur revues).

## 3.5 Standards P04-P09 (non-negociables)
1. Composants UI:
   - shadcn/radix obligatoire pour inputs, selects, combobox, dialogs, popovers, tabs, tables, sheets, tooltips.
   - interdiction d ajouter un composant custom equivalent si une primitive shadcn existe.
2. Iconographie:
   - `lucide-react` obligatoire pour toute icone UI.
   - aucun melange avec d autres packs.
3. Responsive:
   - mobile-first strict.
   - sur zone dense: fallback lisibilite (combobox/sheet/sections compactes) avant toute solution de scroll interne.
4. Gestion des erreurs avancee:
   - zero `throw new Error()` dans la couche app.
   - erreurs mappees en `AppError` avec code/domain/severity/fingerprint.
   - notification utilisateur via `notifyError`, journalisation via `reportError`, handling UI via `handleUiError`.
   - messages utilisateurs FR, concis, actionnables.

## 3.6 Gates qualite P04-P09 (release blockers)
1. Gate composants:
   - 100% des composants interactifs nouveaux ou refactores utilises via primitives shadcn/radix.
   - aucune regression vers un composant custom equivalent si la primitive existe.
2. Gate iconographie:
   - 100% des icones UI nouvelles ou refactorees issues de `lucide-react`.
3. Gate responsive:
   - zero overflow horizontal sur la matrice cible.
   - zero scroll interne parasite non justifie.
   - fallback obligatoire vers layout compact/combobox/sheet quand la densite depasse une ligne lisible.
4. Gate erreurs avancees:
   - conformite complete pipeline (`createAppError`/mappers -> `normalizeError` -> `handleUiError` -> `reportError` + `notifyError`).
   - zero `console.error`/`toast.error()`/`throw new Error()` hors couches autorisees et tests.
5. Gate accessibilite Radix:
   - zero warning critique de type `DialogContent requires DialogTitle` ou `Missing Description`.

---

## 4) Plan d execution detaille (ordre strict)

Convention statut micro-etape:
- `todo`
- `in_progress`
- `blocked`
- `done`
- `rollback_done`

## Phase P00 - Baseline et gouvernance de refactor

### Objectif
Geler la baseline et outiller le suivi pour eviter les regressions silencieuses.

### Micro-etapes
1. `P00-M01` Capturer baseline screenshots pour Login, Cockpit, Pilotage, Clients, Admin (7 breakpoints).
2. `P00-M02` Capturer baseline metriques code (unicode, selects natifs, typographies 10/11, overflow-y-auto).
3. `P00-M03` Creer checklist QA visuelle versionnee dans `docs/frontend-refactor-plan.md`.
4. `P00-M04` Definir regles de rollback par lot.

### Validation
1. Baseline complete et archivee.
2. Matrice de test approuvee.

### Rollback
Aucun (phase non-mutante sur metier).

### Execution P00 (realise le 2026-02-07)

Statut global P00: `done`

Artefacts racine:
1. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/`
2. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/manifest.automated.json`
3. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/manifest.mcp.json`
4. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/metrics.baseline.json`

Contexte d'execution:
1. Frontend uniquement (`frontend/`), sans modification backend/DB/API.
2. Auth e2e utilisee: role `super_admin`.
3. Mode de capture applique: hybride (Playwright automatise + Chrome DevTools MCP cible).

Skills/MCPs traces pendant P00:
1. Skills charges: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `cir-error-handling`, `supabase-postgres-best-practices` (N/A execution DB sur P00).
2. `web-design-guidelines`: source rafraichie depuis `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
3. MCP utilises: Chrome DevTools (captures ciblees), Context7 (Playwright screenshot/viewport), Supabase (inventaire projets pour contexte), shadcn (registre projet `@shadcn`).

Table de suivi micro-etapes:

| ID | Statut | Preuves | Notes |
|---|---|---|---|
| `P00-M01` | `done` | `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/automated/` | 35 captures automatisees (5 ecrans x 7 breakpoints) |
| `P00-M01` | `done` | `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/` | 5 captures MCP ciblees (header 390, search overlay 390, admin 1280, audit 1280, clients 768) |
| `P00-M02` | `done` | `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/metrics.baseline.json` | Metriques baseline et echantillons fichiers/lignes |
| `P00-M03` | `done` | Section \"Checklist QA visuelle P00\" ci-dessous | Checklist versionnee dans ce document |
| `P00-M04` | `done` | Section \"Rollback P00\" ci-dessous | Procedure rollback explicite par lot |

### Resultats P00-M01 (captures baseline)

Captures automatisees:
1. 35 captures creees (`login`, `cockpit`, `pilotage`, `clients`, `admin`) sur 7 breakpoints: `320x568`, `360x800`, `390x844`, `768x1024`, `1024x768`, `1280x800`, `1440x900`.
2. Manifest: `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/manifest.automated.json`.

Captures MCP ciblees:
1. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/cockpit-header-390x844.png`
2. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/search-overlay-390x844.png`
3. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/admin-users-1280x800.png`
4. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/admin-audit-filters-1280x800.png`
5. `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/screenshots/mcp/clients-768x1024.png`

### Resultats P00-M02 (metriques baseline)

Source detaillee: `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/metrics.baseline.json`

| Metrique | Valeur baseline |
|---|---|
| `unicode_literals` (`\u2026`, `\u00B0`) | 12 |
| `native_select` (`<select`) | 11 |
| `tiny_typography_total` (`text-[10px]` + `text-[11px]`) | 92 |
| `overflow_y_auto` | 11 |

### Checklist QA visuelle P00 (versionnee)

Rappel matrice de recette:
1. `320x568`
2. `360x800`
3. `390x844`
4. `768x1024`
5. `1024x768`
6. `1280x800`
7. `1440x900`

Checklist de completion baseline:
- [x] Login capture sur les 7 breakpoints
- [x] Cockpit capture sur les 7 breakpoints
- [x] Pilotage capture sur les 7 breakpoints
- [x] Clients capture sur les 7 breakpoints
- [x] Admin capture sur les 7 breakpoints
- [x] Cas limites header/search/admin captures via MCP
- [x] Preuves archivees dans `docs/frontend-baseline/p00/2026-02-07T15-11-03-643Z/`

Checklist de controle visuel a reutiliser pour P01+:
- [x] Verifier chevauchements (boutons/champs/tabs)
- [x] Verifier clipping texte (labels, badges, placeholders)
- [x] Verifier lisibilite CTA et hierarchie typographique
- [x] Verifier focus visible et navigation clavier critique
- [x] Verifier scroll parasite (double scroll pane/list/detail)
- [x] Verifier placeholders unicode visibles litteralement

### Rollback P00 (regles appliquees)

Statut: `done` (defini et versionne)

Procedure rollback P00:
1. Si baseline partielle ou invalide, supprimer uniquement le lot `docs/frontend-baseline/p00/<timestamp>/` concerne.
2. Revenir les statuts concernes dans ce fichier a `blocked` ou `todo`.
3. Conserver uniquement les preuves coherentes (manifest + captures + metriques).
4. Relancer uniquement les couples ecran/breakpoint manquants (pas de rerun global obligatoire).
5. Interdire validation P00 si la matrice 5 ecrans x 7 breakpoints n'est pas complete.

Conditions `blocked` explicites:
1. Login e2e indisponible.
2. Tab `admin` inaccessible avec role cible.
3. Echec de capture sur un breakpoint obligatoire.

### Validation technique P00 (2026-02-07)

- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 3/3 tests)

---

## Phase P01 - Fondations design system CIR

### Objectif
Standardiser tokens et primitives avant tout refactor ecran.

### Micro-etapes
1. `P01-M01` Stabiliser tokens semantiques dans `frontend/src/index.css` (couleurs CIR, surfaces, contrastes, radius, focus ring).
2. `P01-M02` Creer primitives partagees (ou consolider existantes) dans `frontend/src/components/ui/*`:
   - bouton
   - input
   - select
   - badge
   - card/section
   - toolbar row
3. `P01-M03` Definir variantes CVA coherentes (dense/comfortable, destructive, warning, ghost).
4. `P01-M04` Normaliser regles typo et enlever les usages 10/11 px hors exceptions explicitement documentees.
5. `P01-M05` Ajouter guide d usage court en tete de chaque primitive cle (commentaires concis).

### Validation
1. Build et tests verts.
2. Cohesion visuelle des primitives de base.

### Rollback
Rollback fichier par fichier via commits de phase.

### Execution P01 (realise le 2026-02-07)

Statut global P01: `done`

Portee appliquee:
1. Frontend uniquement (`frontend/`), sans modification backend/DB/API.
2. Portee typo large immediate: suppression des usages `text-[10px]` / `text-[11px]` sur `frontend/src`.
3. Stack typographique conservee (police existante), comme decide.

Skills/MCPs traces pendant P01:
1. Skills charges: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `cir-error-handling`, `supabase-postgres-best-practices` (N/A execution DB sur P01).
2. Context7 consulte pour CVA et shadcn patterns (variants, tailles, accessibilite).
3. MCP shadcn utilise (registre `@shadcn` et recherche composants).
4. MCP Chrome DevTools tente pour verification visuelle mais bloque par profil Chrome deja locke; fallback de validation UI via `playwright test` execute (3/3 OK).

Table de suivi micro-etapes:

| ID | Statut | Preuves | Notes |
|---|---|---|---|
| `P01-M01` | `done` | `frontend/src/index.css`, `frontend/tailwind.config.cjs` | Tokens semantiques etendus: `surface-*`, `warning`, ring offset |
| `P01-M02` | `done` | `frontend/src/components/ui/button.tsx`, `frontend/src/components/ui/input.tsx`, `frontend/src/components/ui/select.tsx`, `frontend/src/components/ui/badge.tsx`, `frontend/src/components/ui/card.tsx`, `frontend/src/components/ui/toolbar-row.tsx` | Primitives consolidees + creation `toolbar-row` |
| `P01-M02` | `done` | `frontend/src/components/dashboard/DashboardToolbar.tsx`, `frontend/src/components/clients/ClientsPanelToolbar.tsx` | Adoption ciblee `toolbar-row` sur 2 zones transverses |
| `P01-M03` | `done` | memes fichiers `ui/*` ci-dessus | Variantes CVA coherentes: `dense/comfortable`, `warning`, `destructive`, `ghost` |
| `P01-M04` | `done` | recherche `rg 'text-\\[(10|11)px\\]' frontend/src` => `0` occurrence | Normalisation typo terminee sans exception ouverte |
| `P01-M05` | `done` | entetes de guide ajoutes dans les primitives cles | Guides d usage concis en tete de fichier |

### Resultats P01-M04 (metriques post-refactor)

| Metrique | Baseline P00 | Post-P01 |
|---|---|---|
| `tiny_typography_total` (`text-[10px]` + `text-[11px]`) | 92 | 0 |
| `native_select` (`<select`) | 11 | 11 |
| `unicode_literals` (`\\u2026`, `\\u00B0`) | 12 | 12 |
| `overflow_y_auto` | 11 | 11 |

### Validation technique P01 (2026-02-07)

- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 3/3 tests)
- [x] `cd frontend && npm run check:error-compliance` (OK)

### Verification UI MCP post-P01 (2026-02-07)

Statut: `done`

Contexte:
1. Verification manuelle via Chrome DevTools MCP avec session authentifiee (`super_admin`).
2. Matrice testee: `390x844`, `768x1024`, `1024x768`.
3. Parcours testes: tabs `F1`, `F2`, `F5`, `F4` + ouverture overlay recherche globale.

Resultats:
1. `390x844`: aucun overlap detecte dans le header (`tablist`/recherche/profil), aucun overflow horizontal global.
2. `768x1024`: overlap reproductible du header entre `tablist` et bouton recherche rapide.
3. `1024x768`: plus d overlap detecte, overflow horizontal a `0`.
4. Overlay recherche globale: ouverture/fermeture OK et sans overflow horizontal sur les 3 viewports testes.

Mesure precise finding principal (MCP):
1. A `768x1024`, intersection `tablist` vs recherche: `overlapX = 157px`, `overlapY = 32px`.
2. Reproduit sur `F1`, `F2`, `F5`, `F4` (probleme structurel App Header, pas specifique ecran).

Decision de suivi:
1. Finding rattache a `P02-M02` (strategie overflow tabs) et `P02-M03` (search button non concurrent de la nav).
2. P01 reste valide (fondations design system), mais blocage responsive header conserve comme priorite P02.

---

## Phase P02 - App shell/header ultra-responsive

### Objectif
Supprimer collisions navigation/search/profil sur toutes largeurs.

### Micro-etapes
1. `P02-M01` Recomposer `AppHeader` en 3 zones explicites: brand, nav, utility.
2. `P02-M02` Implementer strategie overflow tabs (priorite tab active, compact mode, scroll horizontal controle ou menu "plus").
3. `P02-M03` Refaire `AppHeaderSearchButton` pour qu il ne concurrence pas la navigation.
4. `P02-M04` Clarifier profil/email (truncate + tooltip + aria labels).
5. `P02-M05` Nettoyer micro-typographie et contrastes.

### Validation
1. Zero collision a 390, 768, 1024.
2. Navigation clavier et tactile intacte.

### Rollback
Retour a l ancien header si P0 bloqueur navigation.

### Execution P02 (realise le 2026-02-07)

Statut global P02: `done`

Portee appliquee:
1. Frontend uniquement (`frontend/`), sans modification backend/DB/API.
2. Refactor strict App shell/header (brand/nav/utility) sans changement de logique metier.
3. Strategie retenue et appliquee: tabs en scroll horizontal controle + recherche icone `<1024` puis label+raccourci `>=1024`.

Skills/MCPs traces pendant P02:
1. Skills charges: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `cir-error-handling`, `supabase-postgres-best-practices` (N/A execution DB sur P02).
2. Context7 consulte pour rappel accessibilite Radix Tabs.
3. shadcn MCP consulte pour pattern `tabs`.
4. Supabase MCP consulte en lecture seule (inventaire projets, sans mutation).
5. Chrome DevTools MCP utilise pour verification UI manuelle (session navigateur). La verification collision header sur session authentifiee est finalisee via Playwright e2e.

Table de suivi micro-etapes:

| ID | Statut | Preuves | Notes |
|---|---|---|---|
| `P02-M01` | `done` | `frontend/src/components/AppHeader.tsx` | Header restructure en 3 zones explicites `brand/nav/utility` |
| `P02-M02` | `done` | `frontend/src/components/app-header/AppHeaderTabsSection.tsx` | Overflow tabs en scroll horizontal + recentrage tab active |
| `P02-M03` | `done` | `frontend/src/components/app-header/AppHeaderSearchButton.tsx` | Recherche compacte `<1024`, etendue `>=1024`, sans largeur fixe concurrente |
| `P02-M04` | `done` | `frontend/src/components/app-header/AppHeaderProfileMenu.tsx`, `frontend/src/components/app-header/AppHeaderStatusSection.tsx` | Truncate email + tooltip (`title`) + aria/testids + priorite visuelle status |
| `P02-M05` | `done` | `frontend/src/components/app-header/AppHeaderBrandSection.tsx`, `frontend/src/app/appConstants.tsx`, `frontend/src/components/app-header/AppHeader.types.ts` | Nettoyage densite/contraste + labels tabs explicites via `ariaLabel` |

### Renforcement tests P02

1. `frontend/e2e/navigation.spec.ts`: ajout test `header layout is collision-free on key breakpoints`.
2. Assertions ajoutees:
   - aucune collision geometrie tabs/recherche/profil sur `390x844`, `768x1024`, `1024x768`
   - aucun overflow horizontal global
   - comportement recherche conforme au contrat responsive (`label` visible seulement `>=1024`)
3. Test existant navigation conserve (`switch tabs between Cockpit and Dashboard`).

### Resultats P02 (metriques et checks)

Checks obligatoires:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 4/4 tests)
- [x] `cd frontend && npm run check:error-compliance` (OK)

Indicateurs post-P02:
1. Collision header `390/768/1024`: `0` (valide par e2e dedie P02).
2. Overflow horizontal global `390/768/1024`: `0` (valide par e2e dedie P02).
3. Metriques globales code apres P02:
   - `unicode_literals`: `13`
   - `native_select`: `11`
   - `tiny_typography_total`: `0`
   - `overflow_y_auto`: `11`

---

## Phase P03 - Cockpit F1 (refonte UX chirurgicale)

### Objectif
Rendre le formulaire cockpit stable, lisible, sans friction, sans scroll parasite.

### Micro-etapes
1. `P03-M01` Corriger immediatement tous placeholders unicode cockpit (`\u2026`, `\u00B0`).
2. `P03-M02` Retirer `overflow-y-auto` des panes gauche/droite et definir une seule strategie de scroll.
3. `P03-M03` Reordonner sections gauche: Canal -> Relation -> Recherche -> Type interaction -> Service -> Identite -> Contact.
4. `P03-M04` Refaire `CockpitRelationSection` sans fond gris inutile, style toggle coherent avec Canal/Service.
5. `P03-M05` Refaire footer cockpit en layout resilient:
   - ligne statut + ref dossier
   - ligne rappel + reset
   - fallback mono-colonne mobile
6. `P03-M06` Migrer statut vers composant shadcn 2 niveaux (`Popover + Command` dans `CockpitStatusControl`), retirer select natif.
7. `P03-M07` Stabiliser stepper (labels sur 1 ligne prioritaire, transitions discretes, scroll horizontal propre si necessaire).
8. `P03-M08` Corriger positionnement des toasts en mobile pour ne pas masquer les actions essentielles.

### Validation
1. Plus aucun overlap cockpit aux 7 breakpoints.
2. Plus aucun placeholder unicode visible.
3. Zero scroll interne de panneaux.
4. Parcours complet creation interaction OK clavier + souris.

### Rollback
Rollback local par sous-section (footer, relation, stepper, status).

### Execution P03 (realise le 2026-02-07)

Statut global P03: `done`

Portee Wave 1:
1. Suppression des scrollbars parasites sur panes cockpit (gauche/droite) avec strategie de scroll unique.
2. Refonte visuelle des blocs signales: stepper, relation, footer cockpit.
3. Stabilisation responsive pour eviter debordements horizontaux (desktop + mobile).

Portee Wave 2:
1. Finalisation placeholders cockpit (`\u2026`, `\u00B0`) avec rendu lisible (ex: `N° Devis…`).
2. Reordonnancement colonne gauche: `Canal -> Relation -> Recherche -> Type interaction -> Service -> Identite -> Contact`.
3. Migration `CockpitStatusControl` vers composant 2 niveaux `Popover + Command` (categorie puis statut), sans `select` natif.
4. Positionnement toasts mobile via `ResponsiveToaster` (`top-center` <= 768, `bottom-right` desktop).
5. Ajout test e2e cockpit dedie (layout fluide + selecteur statut + checks anti-overflow).

Skills/MCPs traces pendant P03:
1. Skills charges: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `cir-error-handling`, `supabase-postgres-best-practices` (N/A execution DB).
2. MCP Chrome DevTools: verification UI cockpit et captures post-wave2.
3. MCP shadcn: patterns `Popover`/`Command` confirmes pour la migration statut 2 niveaux.
4. Context7 conserve comme reference patterns UI/accessibilite pour composants Radix/shadcn.

Table de suivi micro-etapes:

| ID | Statut | Preuves | Notes |
|---|---|---|---|
| `P03-M01` | `done` | `frontend/src/components/cockpit/left/CockpitCompanyInput.tsx`, `frontend/src/components/cockpit/left/CockpitContactPositionField.tsx`, `frontend/src/components/cockpit/left/CockpitContactPhoneEmailFields.tsx`, `frontend/src/components/cockpit/left/CockpitContactPhoneField.tsx`, `frontend/src/components/cockpit/left/CockpitCompanyCityField.tsx`, `frontend/src/components/cockpit/left/CockpitContactNameFields.tsx`, `frontend/src/components/cockpit/right/CockpitFooterSection.tsx` | Placeholders cockpit normalises avec rendu unicode correct |
| `P03-M02` | `done` | `frontend/src/components/CockpitForm.tsx`, `frontend/src/components/cockpit/CockpitFormLeftPane.tsx`, `frontend/src/components/cockpit/CockpitFormRightPane.tsx` | Suppression `overflow-y-auto` sur panes + scroll unique sur `form` |
| `P03-M03` | `done` | `frontend/src/components/cockpit/CockpitFormLeftPane.tsx` | Ordre sections gauche conforme au flux cible |
| `P03-M04` | `done` | `frontend/src/components/cockpit/left/CockpitRelationSection.tsx` | Bloc relation modernise, suppression fond gris legacy |
| `P03-M05` | `done` | `frontend/src/components/cockpit/right/CockpitFooterSection.tsx`, `frontend/src/components/cockpit/right/CockpitReminderControl.tsx`, `frontend/src/components/cockpit/right/CockpitStatusControl.tsx` | Footer resilient sans overflow horizontal, badge statut 1 ligne |
| `P03-M06` | `done` | `frontend/src/components/cockpit/right/CockpitStatusControl.tsx`, `frontend/src/components/cockpit/CockpitPaneTypes.ts`, `frontend/src/hooks/useCockpitPaneProps.ts`, `frontend/src/hooks/useCockpitPaneProps.types.ts`, `frontend/src/hooks/useCockpitFormController.ts`, `frontend/src/hooks/useInteractionInvalidHandler.ts`, `frontend/src/hooks/useCockpitFormRefs.ts` | Migration statut vers UI 2 niveaux `Popover + Command` (zero `select` natif cockpit) |
| `P03-M07` | `done` | `frontend/src/components/InteractionStepper.tsx` | Stepper sans `overflow-x-auto`, wrap propre et connecteurs desktop |
| `P03-M08` | `done` | `frontend/src/main.tsx` | Toasts mobile via `ResponsiveToaster` en `top-center` sur petit viewport |

### Correctif P03 (retour UX, 2026-02-07)

Statut: `done`

1. Suppression du dernier `overflow-x-auto` cockpit sur les tags famille (`MOTORISATION`, etc.) pour eliminer le scroll horizontal local.
2. Passage en `flex-wrap` fluide sur la zone tags pour conserver une lecture propre sur mobile/tablette/desktop.
3. Renforcement e2e cockpit: assertion explicite "zone tags sans mode scroll horizontal".

Preuves:
1. `frontend/src/components/cockpit/right/CockpitSubjectSection.tsx`
2. `frontend/e2e/navigation.spec.ts`
3. `docs/frontend-baseline/p03/2026-02-07T23-30-00Z/cockpit-390x844-after-p03-hotfix-family-tags.png`
4. `docs/frontend-baseline/p03/2026-02-07T23-30-00Z/cockpit-1280x800-after-p03-hotfix-family-tags.png`

Verification MCP:
1. `390x844`: `documentHasHorizontalOverflow=false`, `familyTagsHasHorizontalOverflow=false`, `familyTagsOverflowX=visible`.
2. `1280x800`: `documentHasHorizontalOverflow=false`, `familyTagsHasHorizontalOverflow=false`, `familyTagsOverflowX=visible`.

### Correctif P03.1 (retour UX critique, 2026-02-08)

Statut: `done`

Objectif:
1. Supprimer les frictions UX remontees sur cockpit: selecteur statut en 3 clics, toast draft bloquant, et debordements mobile/horizontal.

Execution:
1. `CockpitStatusControl` refondu en liste groupee visible au premier clic (`A traiter`, `En cours`, `Termine`) avec recherche directe.
2. Flux draft robuste: `DRAFT_NOT_FOUND` traite sans toast ni bruit console utilisateur, avec nettoyage silencieux du draft invalide (journalisation seulement si le nettoyage echoue).
3. Refonte responsive cockpit mobile-first:
   - header cockpit replie et CTA sans clipping
   - stepper compact mono-ligne mobile (labels courts)
   - suppression des modes scroll horizontal recents/tags/status/footer
   - shell cockpit sans debordement horizontal.
4. Action principale de sauvegarde deplacee en bas du formulaire (`cockpit-submit-bar`) pour eviter le retour en haut.
5. Warnings accessibilite Radix `DialogContent` supprimes via ajout `DialogTitle`/`DialogDescription` sur les dialogs concernes.

Fichiers modifies:
1. `frontend/src/components/cockpit/right/CockpitStatusControl.tsx`
2. `frontend/src/hooks/useInteractionDraft.ts`
3. `frontend/src/components/CockpitForm.tsx`
4. `frontend/src/components/cockpit/CockpitFormHeader.tsx`
5. `frontend/src/components/InteractionStepper.tsx`
6. `frontend/src/components/cockpit/left/CockpitChannelSection.tsx`
7. `frontend/src/components/interaction-search/InteractionSearchRecents.tsx`
8. `frontend/src/components/interaction-search/InteractionSearchContainer.tsx`
9. `frontend/src/components/interaction-search/InteractionSearchFooter.tsx`
10. `frontend/src/components/cockpit/right/CockpitReminderControl.tsx`
11. `frontend/src/components/cockpit/right/CockpitFooterSection.tsx`
12. `frontend/src/components/cockpit/CockpitFormLeftPane.tsx`
13. `frontend/src/components/cockpit/CockpitFormRightPane.tsx`
14. `frontend/src/components/AppMainContent.tsx`
15. `frontend/e2e/navigation.spec.ts`
16. `frontend/src/components/ui/command.tsx`
17. `frontend/src/components/ClientFormDialog.tsx`
18. `frontend/src/components/ClientContactDialog.tsx`
19. `frontend/src/components/ConvertClientDialog.tsx`
20. `frontend/src/components/ProspectFormDialog.tsx`

Preuves visuelles:
1. `docs/frontend-baseline/p03/2026-02-08T00-30-00Z/cockpit-320x568-after-p03-1.png`
2. `docs/frontend-baseline/p03/2026-02-08T00-30-00Z/cockpit-390x844-after-p03-1.png`
3. `docs/frontend-baseline/p03/2026-02-08T00-30-00Z/cockpit-390x844-after-p03-1-open-status.png`
4. `docs/frontend-baseline/p03/2026-02-08T00-30-00Z/cockpit-1280x800-after-p03-1.png`
5. `docs/frontend-baseline/p03/2026-02-08T00-30-00Z/cockpit-1280x800-after-p03-1-open-status.png`

Verification MCP:
1. `390x844`:
   - `documentHasHorizontalOverflow=false`
   - `shellHasHorizontalOverflow=false`
   - `stepperHasHorizontalOverflow=false`
   - `recentsHasHorizontalOverflow=false`
   - `statusGroupCount=3`, `statusItemCount=4` des le premier clic.
2. `320x568`:
   - `documentHasHorizontalOverflow=false`
   - `shellHasHorizontalOverflow=false`
   - `stepperHasHorizontalOverflow=false`
   - `recentsHasHorizontalOverflow=false`
   - `headerActionsHasHorizontalOverflow=false`.
3. `1280x800`:
   - `documentHasHorizontalOverflow=false`
   - `shellHasHorizontalOverflow=false`
   - `recentsHasHorizontalOverflow=false`
   - `statusGroupCount=3`, `statusItemCount=4`.
4. Toast draft: `hasDraftNotFoundToast=false` apres ouverture cockpit.

Validation technique P03.1:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

### Correctif P03.2 (Relation shadcn + Lucide, 2026-02-08)

Statut: `done`

Objectif:
1. Uniformiser la section `Relation` avec les primitives shadcn/radix, ajouter des icones Lucide, et garantir un rendu 100% mobile responsive.

Analyse MCP shadcn:
1. `list_components`: validation du registre (56 composants disponibles).
2. `get_component_demo(toggle-group)`: pattern retenu pour options compactes + selection unique.
3. `get_component_demo(radio-group)` et `get_component_demo(tabs)`: rejetes pour ce cas (moins ergonomiques pour chips denses en wrap mobile).

Execution:
1. Refactor `CockpitRelationSection` vers `ToggleGroup`/`ToggleGroupItem` (shadcn/radix) en `type=\"single\"`.
2. Suppression du bloc container legacy (`rounded-lg border bg-white p-2`) au profit d un layout sobre `flex flex-wrap items-center gap-2`.
3. Ajout icones Lucide par relation:
   - `Client` -> `Building2`
   - `Prospect / Particulier` -> `UserRound`
   - `Fournisseur` -> `Factory`
   - `Sollicitation` -> `Megaphone`
   - fallback -> `Circle`
4. Etats actifs harmonises via classes `data-[state=on]`.

Fichier modifie:
1. `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`

Validation technique P03.2:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

### Correctif P03.3 (uniformisation compacte Canal/Relation, 2026-02-09)

Statut: `done`

Objectif:
1. Aligner visuellement `RELATION` sur `CANAL` avec une forme rectangulaire legerement arrondie.
2. Reduire la hauteur/perimetre des toggles pour une densite plus propre desktop/mobile.
3. Conserver un comportement 100% responsive sans scroll horizontal local.

Execution:
1. `CockpitRelationSection` ajuste en style compact:
   - conteneur `flex-wrap` avec `gap-2`
   - toggles `h-7`, `rounded-md`, `px-2`, `text-xs`, `whitespace-nowrap`
   - icones Lucide reduites a `12px`
2. `CockpitChannelSection` deja conserve en meme gabarit compact rectangulaire (`h-7`, `rounded-md`, `px-2`) pour coherence inter-sections.
3. Correction accessibilite dialogs Radix: ajout `DialogDescription` manquant sur les dialogs admin qui affichaient encore un warning `Missing Description`.
4. Verification navigateur (`localhost:3000`) apres reload:
   - aucun warning `DialogContent` actif sur session courante (uniquement logs dev Vite/React DevTools).

Fichier modifie:
1. `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`
2. `frontend/src/components/AgencyFormDialog.tsx`
3. `frontend/src/components/UserCreateDialog.tsx`
4. `frontend/src/components/TemporaryPasswordDialog.tsx`
5. `frontend/src/components/UserMembershipDialog.tsx`

Validation technique P03.3:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

Idees d'amelioration concretes pour la suite (P04+):
1. Standardiser un composant shared `CockpitToggleGroupField` (label + items + erreurs) pour eliminer les divergences futures Canal/Relation/Service.
2. Ajouter un test e2e dedie "chips wrap" sur `320x568` pour figer l'absence de scroll horizontal sur Canal/Relation/Service.
3. Introduire une regle visuelle unique de densite cockpit (tailles `h-7` mobile/desktop) dans les primitives UI de P04 pour eviter les regressions de taille.

### Correctif P03.4 (chips non-gras + service adaptatif, 2026-02-09)

Statut: `done`

Objectif:
1. Supprimer le rendu gras sur les boutons `Canal` et `Relation`.
2. Uniformiser `Service` sur le meme format visuel compact que `Canal`/`Relation`.
3. Forcer un alignement gauche explicite pour `Relation`.
4. Basculer automatiquement en combobox `Service` quand l UX en wrap devient sous-optimale (mobile ou multi-ligne).

Execution:
1. `Canal` et `Relation`:
   - classes harmonisees en `h-7`, `rounded-md`, `px-2`, `text-xs`, `font-medium`.
   - ajout `justify-start` explicite sur `Relation` pour neutraliser le centrage par defaut du `ToggleGroup`.
2. `Service`:
   - quick toggles alignes sur le meme gabarit compact (`h-7`, `rounded-md`, `px-2`, `font-medium`).
   - `CockpitServiceSection` refondu avec detection adaptative:
     - mobile (`<= 768`) -> mode combobox uniquement
     - desktop -> quick toggles par defaut, puis bascule combobox si wrap detecte.
3. `CockpitServicePicker` etendu:
   - mode `forceVisible` et `fullWidth` pour supporter le fallback combobox-only.
   - trigger harmonise visuellement (`h-7`, `font-medium`) + largeur responsive.
4. Renforcement e2e cockpit:
   - assertions non-gras `Canal/Relation/Service`
   - assertion alignement gauche `Relation`
   - assertion fallback `Service` (mobile combobox-only).

Fichiers modifies:
1. `frontend/src/components/cockpit/left/CockpitChannelSection.tsx`
2. `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`
3. `frontend/src/components/cockpit/left/CockpitServiceQuickToggles.tsx`
4. `frontend/src/components/cockpit/left/CockpitServicePicker.tsx`
5. `frontend/src/components/cockpit/left/CockpitServiceSection.tsx`
6. `frontend/e2e/navigation.spec.ts`

Validation technique P03.4:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

Idees d'amelioration concretes pour la suite (P04+):
1. Extraire un composant unique `CockpitChipsField` pour partager integralement les styles/etats `Canal`, `Relation`, `Service`.
2. Ajouter une metrique e2e de densite UI (hauteur max des chips) pour verrouiller le format compact dans le temps.
3. Ajouter un test e2e ciblant la bascule inverse `combobox -> quick toggles` apres agrandissement de viewport.

### Correctif P03.5 (combobox shadcn-style mobile first, 2026-02-09)

Statut: `done`

Objectif:
1. Appliquer un vrai rendu combobox moderne (style shadcn adapte CIR) a la place du trigger service juge trop brut.
2. Basculer `Canal` et `Relation` en combobox sur mobile pour supprimer les grilles de boutons cassees.
3. Supprimer totalement l effet gras sur les boutons desktop `Canal/Relation/Service`.

Execution:
1. Ajout d une primitive `ui/combobox` (Popover + Command) avec API dediee:
   - `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxEmpty`, `ComboboxList`, `ComboboxItem`
   - theme CIR: bordures slate, hover rouge CIR, check actif rouge CIR.
2. `CockpitServicePicker` migre vers cette primitive combobox.
3. `CockpitChannelSection`:
   - mobile (`<=768`): combobox
   - desktop (`>=769`): toggle group conserve
   - style desktop passe en `font-normal`.
4. `CockpitRelationSection`:
   - mobile (`<=768`): combobox
   - desktop (`>=769`): toggle group conserve, force `justify-start`
   - style desktop passe en `font-normal`.
5. `CockpitServiceQuickToggles`: style desktop passe en `font-normal`.
6. E2E cockpit renforce:
   - verification visibilite reelle (pas juste presence DOM) des triggers combobox mobile.
7. Stabilisation e2e globale:
   - `playwright.config.ts` fixe `workers: 1` pour eviter les interferences de session entre `auth.spec` (logout) et `navigation.spec`.

Fichiers modifies:
1. `frontend/src/components/ui/combobox.tsx`
2. `frontend/src/components/cockpit/left/CockpitServicePicker.tsx`
3. `frontend/src/components/cockpit/left/CockpitChannelSection.tsx`
4. `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`
5. `frontend/src/components/cockpit/left/CockpitServiceQuickToggles.tsx`
6. `frontend/e2e/navigation.spec.ts`
7. `frontend/playwright.config.ts`

Validation technique P03.5:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

Idees d'amelioration concretes pour la suite (P04+):
1. Ajouter le support options typées `{ value, label, icon }` dans `ui/combobox` pour afficher les icones Lucide directement dans les listes (Canal/Relation/Service).
2. Ajouter un test composant dedie `ui/combobox` (selection clavier, filtrage, fermeture apres selection).
3. Definir une guideline de breakpoint unique cockpit (`<=768`) dans une constante partagee pour eviter les divergences CSS/JS futures.

Resultats techniques P03:
1. Metriques cibles cockpit:
   - `p03_unicode_escape_count`: `0`
   - `p03_native_select_count`: `0`
   - `left_overflow_y_auto`: `0`
   - `right_overflow_y_auto`: `0`
   - `stepper_overflow_x_auto`: `0`
2. Captures cockpit post-modification:
   - Wave 1:
     - `docs/frontend-baseline/p03/2026-02-07T19-00-00Z/cockpit-390x844-after-p03-wave1.png`
     - `docs/frontend-baseline/p03/2026-02-07T19-00-00Z/cockpit-1280x800-after-p03-wave1.png`
   - Wave 2:
     - `docs/frontend-baseline/p03/2026-02-07T23-00-00Z/cockpit-390x844-after-p03-wave2.png`
     - `docs/frontend-baseline/p03/2026-02-07T23-00-00Z/cockpit-768x1024-after-p03-wave2.png`
     - `docs/frontend-baseline/p03/2026-02-07T23-00-00Z/cockpit-1024x768-after-p03-wave2.png`
     - `docs/frontend-baseline/p03/2026-02-07T23-00-00Z/cockpit-1280x800-after-p03-wave2.png`
     - `docs/frontend-baseline/p03/2026-02-07T23-00-00Z/cockpit-1440x900-after-p03-wave2.png`
3. Verification MCP (echantillon):
   - `390x844`: `documentHasHorizontalOverflow=false`, panes `overflowY=visible`, footer sans overflow horizontal, stepper sans overflow horizontal.
   - `768x1024`: memes contraintes validees.
   - `1440x900`: memes contraintes validees.

Validation technique P03:
- [x] `cd frontend && npm run typecheck` (OK)
- [x] `cd frontend && npm run lint -- --max-warnings=0` (OK)
- [x] `cd frontend && npm run test -- --run` (OK, 26 fichiers / 68 tests)
- [x] `cd frontend && npm run test:e2e` (OK, 5/5)
- [x] `cd frontend && npm run check:error-compliance` (OK)

---

## Phase P04 - Recherche globale (Command UX)

### Objectif
Transformer la recherche globale en command palette fiable, rapide, mobile-safe.

### Micro-etapes
1. `P04-M01` Migrer `AppSearchOverlay` vers pattern shadcn `CommandDialog` + `cmdk`.
2. `P04-M02` Standardiser sections resultats et etats empty/loading avec primitives shadcn uniquement.
3. `P04-M03` Uniformiser toutes les icones recherche en `lucide-react`.
4. `P04-M04` Gerer focus trap, Esc, Enter, fleches, aria-live correctement.
5. `P04-M05` Revoir gabarit mobile (largeur, hauteur, paddings, font-size >= 12, zero overflow horizontal).
6. `P04-M06` Integrer gestion erreurs avancee sur recherches/actions (mappers + `handleUiError` + `reportError` + `notifyError`).
7. `P04-M07` Ajouter tests e2e dedies recherche clavier + erreurs utilisateur.

### Validation
1. Recherche completement utilisable au clavier.
2. Pas de debordement mobile.
3. Deep focus vers Clients conserve.
4. Zero warning accessibilite dialog/command en console.
5. Erreurs de recherche correctement mappees/tracees/notifiees (sans `console.error` direct).

### Rollback
Retour temporaire overlay custom si blocage fonctionnel, sans toucher aux mappers d erreurs deja poses.

---

## Phase P05 - Clients F5 (data-heavy modernisation)

### Objectif
Industrialiser la vue clients pour gros volume sans casser le metier.

### Micro-etapes
1. `P05-M01` Recomposer toolbar clients (tabs, recherche, filtres, actions) avec primitives communes.
2. `P05-M02` Introduire DataTable shadcn + TanStack Table pour la liste clients/prospects.
3. `P05-M03` Ajouter virtualisation via TanStack Virtual.
4. `P05-M04` Supprimer `select` natifs restants dans la zone Clients (filtres, tri, toolbar) via primitives shadcn.
5. `P05-M05` Harmoniser selection list/detail et comportements responsive (split desktop, stack mobile lisible).
6. `P05-M06` Uniformiser etats loading/error/empty avec icones Lucide coherentes.
7. `P05-M07` Maintenir le focus programmatique client/contact depuis recherche globale.
8. `P05-M08` Integrer gestion erreurs avancee sur actions clients/prospects (CRUD + archivage + conversion).

### Validation
1. Scroll fluide sur gros jeu de donnees.
2. Temps de rendu liste stable.
3. Aucune regression sur edition/archivage/contact.
4. Zero `select` natif dans la zone Clients.
5. Flux erreurs conforme (`AppError` + pipeline UI) sur toutes les actions critiques.

### Rollback
Feature flag de virtualisation desactivable + rollback local des composants table sans retirer le hardening erreurs.

---

## Phase P06 - Pilotage F2 (lisibilite operationnelle)

### Objectif
Rendre Pilotage lisible et performant sans introduire DnD.

### Micro-etapes
1. `P06-M01` Recomposer toolbar filtres (periode, dates, recherche).
2. `P06-M02` Remplacer `select` natifs toolbar par primitives shadcn (`Select`/`Combobox` selon densite).
3. `P06-M03` Stabiliser la grille kanban en responsive (empilement progressif, hauteurs robustes, mobile-first lisible).
4. `P06-M04` Uniformiser cartes interaction (hierarchie visuelle, badges statut, icones Lucide).
5. `P06-M05` Ameliorer vue liste (densite + tri visuel + alignements) sans scroll parasite.
6. `P06-M06` Revoir overlay details pour coherence design system shadcn.
7. `P06-M07` Integrer gestion erreurs avancee sur filtres/periodes/actions de detail.

### Validation
1. Lisibilite immediate statut/priorite.
2. Aucun chevauchement toolbar/colonnes.
3. Perf stable sur navigation rapide.
4. Zero `select` natif restant dans zone Pilotage.
5. Erreurs filtres/actions correctement mappees et notifiees (pipeline conforme).

### Rollback
Fallback liste par defaut si kanban instable, en conservant la couche erreurs harmonisee.

---

## Phase P07 - Admin F4 + Settings (normalisation)

### Objectif
Supprimer incoherences UI sur zone admin.

### Micro-etapes
1. `P07-M01` Corriger tous placeholders unicode (`UsersManagerSearch`, `AgenciesManagerSearch`, `AuditLogsFilters`, etc.).
2. `P07-M02` Migrer selects natifs admin/settings vers primitives standard.
3. `P07-M03` Uniformiser toutes les actions admin/settings via primitives shadcn + icones Lucide.
4. `P07-M04` Harmoniser card/list actions (archives, create, edit, reset password) mobile-first.
5. `P07-M05` Uniformiser tab panels admin et etats d erreur.
6. `P07-M06` Integrer gestion erreurs avancee admin/settings (mappers dedies par domaine + notifications FR coherentes).

### Validation
1. Zero placeholder unicode restant en admin.
2. Zero select natif restant dans zones ciblees.
3. Zero icone hors Lucide dans Admin/Settings.
4. Erreurs admin/settings conformes au pipeline avance (sans `console.error`/`toast.error` directs).

### Rollback
Rollback par sous-module users/agencies/audit, sans supprimer le catalog/mappers deja poses.

---

## Phase P08 - Login et finition visuelle premium

### Objectif
Elever la perception qualite sans surcharge decorative.

### Micro-etapes
1. `P08-M01` Rehausser hierarchy visuelle login (espacements, labels, feedbacks) en restant sobre.
2. `P08-M02` Uniformiser composants login avec primitives P01.
3. `P08-M03` Uniformiser icones login en Lucide et renforcer lisibilite mobile-first.
4. `P08-M04` Ajuster etats focus/error/success avec feedback non ambigu.
5. `P08-M05` Integrer gestion erreurs avancee authentification (mapping FR + `handleUiError` + `notifyError`).

### Validation
1. Login coherent avec le reste de l app.
2. Accessibilite clavier et contraste conformes.
3. Erreurs login claires, tracees correctement, sans bruit console non conforme.

### Rollback
Rollback login uniquement, en conservant les mappers auth conformes.

---

## Phase P09 - Hardening final (a11y, perf, erreurs, tests)

### Objectif
Passer de "beau" a "industrialise".

### Micro-etapes
1. `P09-M01` Integrer audit a11y runtime dev (`@axe-core/react`) et corriger violations critiques.
2. `P09-M02` Ajouter/activer lint a11y (`eslint-plugin-jsx-a11y`).
3. `P09-M03` Passer revue perf React sur ecrans lourds (memo, deps, renders inutiles).
4. `P09-M04` Purger composants obsoletes/doublons post-refactor.
5. `P09-M05` Scanner final `select` natifs restants et les remplacer (ou documenter exception explicite validee).
6. `P09-M06` Recontrole strict pipeline erreurs avance (`AppError`, mappers, fingerprint, `normalizeError`, `handleUiError`, `reportError`, `notifyError`).
7. `P09-M07` Run e2e complet sur matrice responsive + verification console warnings critiques.
8. `P09-M08` Produire rapport final de non-regression UX + erreurs.

### Validation
1. Tous checks techniques verts.
2. Aucun bug bloqueur UX restant.
3. Aucun warning/error de conformite erreurs avancees.
4. Rapport final de non-regression produit.

### Rollback
Pas de release si un critere DoD global echoue.

---

## 5) Impacts interfaces/types publics (frontend)

Ce plan ne modifie pas les contrats backend/API/metier.

Changements frontend attendus:
1. Nouvelles primitives UI internes (types props stabilises).
2. Refactor de props de composants cockpit/clients/dashboard/admin pour harmoniser patterns.
3. Eventuelle couche utilitaire d URL-sync UI (sans migration router complete).
4. Renforcement de la couche erreurs front (mappers dedies par domaine, normalisation systematique, reporting/notifying unifies).

Contraintes:
1. Aucun changement de schema metier.
2. Aucun changement de payload API.
3. Aucun contournement du pipeline erreurs avancees du projet.

---

## 6) Plan de tests detaille

## 6.1 Checks obligatoires a chaque phase
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run lint -- --max-warnings=0`
3. `cd frontend && npm run test`
4. `cd frontend && npm run check:error-compliance`

## 6.2 Checks e2e obligatoires a partir de P02
1. `cd frontend && npm run test:e2e`
2. Parcours:
   - login
   - navigation header
   - saisie cockpit complete
   - recherche globale clavier
   - gestion clients
   - pilotage tableau/historique
   - admin users/agencies/audit

## 6.3 Assertions UX critiques
1. Aucun overlap visuel.
2. Aucun element actionnable hors viewport sans strategie explicite.
3. Focus visible partout.
4. Escape/Enter/Tab coherents.
5. Messages erreur FR et comprehensibles.
6. Zero warning accessibilite critique dans les overlays/dialogs/popovers.
7. Zero `console.error` direct et zero `toast.error()` direct dans le code livre.

## 6.4 Assertions compliance erreurs avancees
1. `cd frontend && npm run check:error-compliance` doit etre vert a chaque lot.
2. Scan anti-regression obligatoire (hors tests):
   - `rg -n "console\\.error\\(|toast\\.error\\(|throw new Error\\(" frontend/src`
3. Chaque action metier critique introduite/refactoree doit avoir:
   - mapping explicite vers `AppError` (code + domaine + severite),
   - gestion UI via `handleUiError`,
   - notification via `notifyError` et reporting via `reportError`.

---

## 7) Gestion des risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Regression cockpit en production | Tres fort | Decoupage P03 par sous-lots + rollback local rapide |
| Degradation perf clients apres table refactor | Fort | Feature flag virtualisation + benchmark avant/apres |
| Regressions clavier/a11y | Fort | Tests e2e clavier + axe runtime + lint jsx-a11y |
| Dilution visuelle entre ecrans | Moyen | Primitives P01 obligatoires avant refactor ecran |
| Incoherence pipeline erreurs | Tres fort | `check:error-compliance` a chaque phase + revue mappers/catalog + tests error-path |
| Derive de scope (backend/metier) | Tres fort | Gate CI + revue de diff stricte `frontend/` only |

---

## 8) Checklist de pilotage (suivi rigoureux)

- [x] P00 Baseline validee
- [x] P01 Design system verrouille
- [x] P02 Header/App shell responsive
- [x] P03 Cockpit stabilise
- [x] Retours UX P03 traces (P03.1 a P03.5)
- [x] Contraintes P04-P09 verrouillees (shadcn/radix + Lucide + mobile-first)
- [x] Contraintes P04-P09 verrouillees (gestion erreurs avancees)
- [ ] P04 Recherche globale command palette
- [ ] P05 Clients modernise (table + virtualisation)
- [ ] P06 Pilotage stabilise
- [ ] P07 Admin/Settings normalises
- [ ] P08 Login premium sobre
- [ ] P09 Hardening final
- [ ] DoD globale validee

---

## 9) Notes Context7 (decision evidence)

1. TanStack Table: patterns officiels de stable references (`data`, `columns`) et table state control.
2. TanStack Virtual: `useVirtualizer` / `useWindowVirtualizer` adaptes a listes lourdes.
3. shadcn/ui: DataTable + Select + Form patterns reutilisables (evite reinventer la roue).
4. FullCalendar docs: les features scheduler/resource timeline impliquent `schedulerLicenseKey` (premium), donc exclues de la baseline OSS.
5. Playwright: viewport deterministic + screenshot API (`page.screenshot({ fullPage: true })`) utilises pour la baseline P00.

---

## 10) Hypotheses explicites (defaults)

1. Le backend reste strictement inchange.
2. Les flows metier restent strictement inchanges.
3. Les captures fournies sont representatives des regressions UX principales.
4. Le plan est execute en lots incrementaux avec validation complete entre chaque lot.
5. Les exceptions (taille texte < 12px ou select natif) doivent etre documentees par ticket, sinon interdites.
6. P04 a P09 appliquent systematiquement shadcn/radix pour les composants interactifs.
7. P04 a P09 appliquent exclusivement Lucide pour l iconographie UI.
8. La gestion erreurs avancee est consideree comme critere bloquant de livraison (mappers + pipeline + compliance).

---

## 11) Idees d'ameliorations concretes (suite du refactor)

1. Ajouter un script CI de \"drift baseline\" comparant automatiquement les metriques P00 (`unicode`, `select`, `text-[10/11px]`, `overflow-y-auto`) a chaque PR frontend.
2. Ajouter une galerie HTML statique des captures P00 pour revue visuelle rapide (avant/apres par breakpoint).
3. Introduire un budget quantifie par phase (ex: -30% `text-[10/11px]` en P01/P02, -50% `native_select` en P03/P07).
4. Ajouter un test e2e visuel dedie header 390/768/1024 pour verrouiller la non-regression de collisions.
5. Preparer une convention de nommage unique des captures `phase__screen__breakpoint__kind.png` pour simplifier l'audit cross-phase.
6. Ajouter une regle automatique (lint ou script CI) qui bloque toute reintroduction de `text-[10px]` / `text-[11px]`.
7. Ajouter un test e2e d'accessibilite clavier du header (navigation tabs aux fleches + ouverture recherche + menu profil) sur `390` et `768`.
8. Ajouter une alerte CI qui echoue si `buildNavigationTabs` est modifie sans mise a jour des `ariaLabel` associes.
9. Ajouter un controle visuel automatique du mode recherche responsive (`icone` < 1024, `label+raccourci` >= 1024) pour eviter les regressions de layout.
10. Ajouter un test e2e dedie toasts mobile qui force l emission d un toast et valide explicitement la position `top-center` en viewport <= `768`.
11. Ajouter des tests composant pour `CockpitStatusControl` (navigation clavier, retour categorie, filtrage et selection).
12. Ajouter une verification visuelle automatique cockpit sur la matrice complete 7 breakpoints avec diff image avant/apres.
13. Ajouter un test e2e visuel dedie `320x568` sur cockpit (header + stepper + recents + footer) pour verrouiller la non-regression mobile extreme.
14. Ajouter un script de migration/cleanup des drafts invalides au login utilisateur pour eviter la persistance de payloads obsoletes.

