# Frontend Refactor Plan CIR Cockpit (UI/UX, frontend-only)

Date de reference: 2026-02-07
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

### Definition of Done globale
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run lint -- --max-warnings=0`
3. `cd frontend && npm run test`
4. `cd frontend && npm run test:e2e` (parcours critiques)
5. Aucun overlap UI sur la matrice responsive cible.
6. Zero `\u2026`/`\u00B0` visibles litteralement dans le rendu.
7. Zero `select` natif restant dans les zones ciblees refactor (sauf exception documentee).
8. Zero `console.error`, `toast.error()` et `throw new Error()` hors couches autorisees/tests, conforme aux regles projet.

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
6. `P03-M06` Migrer statut vers shadcn Select (`CockpitStatusControl`), retirer select natif.
7. `P03-M07` Stabiliser stepper (labels sur 1 ligne prioritaire, transitions discretes, scroll horizontal propre si necessaire).
8. `P03-M08` Corriger positionnement des toasts en mobile pour ne pas masquer les actions essentielles.

### Validation
1. Plus aucun overlap cockpit aux 7 breakpoints.
2. Plus aucun placeholder unicode visible.
3. Zero scroll interne de panneaux.
4. Parcours complet creation interaction OK clavier + souris.

### Rollback
Rollback local par sous-section (footer, relation, stepper, status).

---

## Phase P04 - Recherche globale (Command UX)

### Objectif
Transformer la recherche globale en command palette fiable, rapide, mobile-safe.

### Micro-etapes
1. `P04-M01` Migrer `AppSearchOverlay` vers pattern shadcn `CommandDialog` + `cmdk`.
2. `P04-M02` Standardiser sections resultats et etats empty/loading.
3. `P04-M03` Gerer focus trap, Esc, Enter, fleches, aria-live correctement.
4. `P04-M04` Revoir gabarit mobile (largeur, hauteur, paddings, font-size >= 12).
5. `P04-M05` Ajouter tests e2e dedies recherche clavier.

### Validation
1. Recherche completement utilisable au clavier.
2. Pas de debordement mobile.
3. Deep focus vers Clients conserve.

### Rollback
Retour temporaire overlay custom si blocage fonctionnel.

---

## Phase P05 - Clients F5 (data-heavy modernisation)

### Objectif
Industrialiser la vue clients pour gros volume sans casser le metier.

### Micro-etapes
1. `P05-M01` Recomposer toolbar clients (tabs, recherche, filtres, actions) avec primitives communes.
2. `P05-M02` Introduire DataTable shadcn + TanStack Table pour la liste clients/prospects.
3. `P05-M03` Ajouter virtualisation via TanStack Virtual.
4. `P05-M04` Harmoniser selection list/detail et comportements responsive (split desktop, stack mobile).
5. `P05-M05` Uniformiser etats loading/error/empty.
6. `P05-M06` Maintenir le focus programmatique client/contact depuis recherche globale.

### Validation
1. Scroll fluide sur gros jeu de donnees.
2. Temps de rendu liste stable.
3. Aucune regression sur edition/archivage/contact.

### Rollback
Feature flag de virtualisation desactivable.

---

## Phase P06 - Pilotage F2 (lisibilite operationnelle)

### Objectif
Rendre Pilotage lisible et performant sans introduire DnD.

### Micro-etapes
1. `P06-M01` Recomposer toolbar filtres (periode, dates, recherche).
2. `P06-M02` Stabiliser la grille kanban en responsive (empilement progressif, hauteurs robustes).
3. `P06-M03` Uniformiser cartes interaction (hierarchie visuelle, badges statut).
4. `P06-M04` Ameliorer vue liste (densite + tri visuel + alignements).
5. `P06-M05` Revoir overlay details pour coherence design system.

### Validation
1. Lisibilite immediate statut/priorite.
2. Aucun chevauchement toolbar/colonnes.
3. Perf stable sur navigation rapide.

### Rollback
Fallback liste par defaut si kanban instable.

---

## Phase P07 - Admin F4 + Settings (normalisation)

### Objectif
Supprimer incoherences UI sur zone admin.

### Micro-etapes
1. `P07-M01` Corriger tous placeholders unicode (`UsersManagerSearch`, `AgenciesManagerSearch`, `AuditLogsFilters`, etc.).
2. `P07-M02` Migrer selects natifs admin/settings vers primitives standard.
3. `P07-M03` Harmoniser card/list actions (archives, create, edit, reset password).
4. `P07-M04` Uniformiser tab panels admin et etats d erreur.

### Validation
1. Zero placeholder unicode restant en admin.
2. Zero select natif restant dans zones ciblees.

### Rollback
Rollback par sous-module users/agencies/audit.

---

## Phase P08 - Login et finition visuelle premium

### Objectif
Elever la perception qualite sans surcharge decorative.

### Micro-etapes
1. `P08-M01` Rehausser hierarchy visuelle login (espacements, labels, feedbacks) en restant sobre.
2. `P08-M02` Uniformiser composants login avec primitives P01.
3. `P08-M03` Ajuster etats focus/error/success.

### Validation
1. Login coherent avec le reste de l app.
2. Accessibilite clavier et contraste conformes.

### Rollback
Rollback login uniquement.

---

## Phase P09 - Hardening final (a11y, perf, erreurs, tests)

### Objectif
Passer de "beau" a "industrialise".

### Micro-etapes
1. `P09-M01` Integrer audit a11y runtime dev (`@axe-core/react`) et corriger violations critiques.
2. `P09-M02` Ajouter/activer lint a11y (`eslint-plugin-jsx-a11y`).
3. `P09-M03` Passer revue perf React sur ecrans lourds (memo, deps, renders inutiles).
4. `P09-M04` Purger composants obsoletes/doublons post-refactor.
5. `P09-M05` Recontrole strict pipeline erreurs (`reportError`, `notifyError`, mappers).
6. `P09-M06` Run e2e complet sur matrice responsive.

### Validation
1. Tous checks techniques verts.
2. Aucun bug bloqueur UX restant.
3. Rapport final de non-regression produit.

### Rollback
Pas de release si un critere DoD global echoue.

---

## 5) Impacts interfaces/types publics (frontend)

Ce plan ne modifie pas les contrats backend/API/metier.

Changements frontend attendus:
1. Nouvelles primitives UI internes (types props stabilises).
2. Refactor de props de composants cockpit/clients/dashboard/admin pour harmoniser patterns.
3. Eventuelle couche utilitaire d URL-sync UI (sans migration router complete).

Contraintes:
1. Aucun changement de schema metier.
2. Aucun changement de payload API.

---

## 6) Plan de tests detaille

## 6.1 Checks obligatoires a chaque phase
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run lint -- --max-warnings=0`
3. `cd frontend && npm run test`

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

---

## 7) Gestion des risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Regression cockpit en production | Tres fort | Decoupage P03 par sous-lots + rollback local rapide |
| Degradation perf clients apres table refactor | Fort | Feature flag virtualisation + benchmark avant/apres |
| Regressions clavier/a11y | Fort | Tests e2e clavier + axe runtime + lint jsx-a11y |
| Dilution visuelle entre ecrans | Moyen | Primitives P01 obligatoires avant refactor ecran |
| Derive de scope (backend/metier) | Tres fort | Gate CI + revue de diff stricte `frontend/` only |

---

## 8) Checklist de pilotage (suivi rigoureux)

- [ ] P00 Baseline validee
- [ ] P01 Design system verrouille
- [ ] P02 Header/App shell responsive
- [ ] P03 Cockpit stabilise
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

---

## 10) Hypotheses explicites (defaults)

1. Le backend reste strictement inchange.
2. Les flows metier restent strictement inchanges.
3. Les captures fournies sont representatives des regressions UX principales.
4. Le plan est execute en lots incrementaux avec validation complete entre chaque lot.
5. Les exceptions (taille texte < 12px ou select natif) doivent etre documentees par ticket, sinon interdites.

