# Cahier des charges - Pilotage F2 (suivi affaires A a Z)

Date: 2026-02-10  
Auteur: Codex  
Portee: Frontend + Backend + DB (Supabase) pour l'evolution de Pilotage (F2)

---

## 1) Contexte et objectif

Pilotage (F2) doit devenir un outil de suivi d'affaires complet, dynamique et exploitable au quotidien:

- Dossiers simples: traitement rapide, sans surcharge.
- Dossiers complexes: suivi rigoureux, relances, collaboration, historique complet.
- Cas fournisseur: suivi de la demande de prix/commande, numerotation AS400, relances et pilotage.

Objectif principal:

- Couvrir le suivi de bout en bout d'une affaire dans un seul flux (creation, actions, relances, transitions, cloture, historique, dashboard).

---

## 2) Decisions produit verrouillees

Ces decisions sont considerees comme verrouillees pour V1:

1. Multi-agence: partage explicite par dossier (pas de visibilite globale par defaut).
2. Workflow: transitions controlees entre statuts.
3. Numero d'ordre: saisi manuellement (source AS400), pas de generation applicative.
4. Validation numero d'ordre: format 6 chiffres + unicite par agence.
5. Obligation numero d'ordre: uniquement pour les actions externes fournisseur.
6. Relance: date de relance manuelle (pas de SLA automatique en V1).
7. Assignation: 1 responsable + N contributeurs.
8. Permissions V1: tous les participants peuvent modifier les champs critiques.
9. Notifications V1: in-app uniquement.
10. Historique: audit complet visible par defaut.
11. Dashboard V1: vue perso + vue equipe, priorite relances dues/en retard + attente fournisseur.
12. Typologie: basee sur les types d'interaction existants (configurable ensuite).

---

## 3) Perimetre fonctionnel

### 3.1 In scope

- Configuration de types de dossier via les types d'interaction.
- Regles metier par type de dossier (obligations champs, transitions).
- Suivi d'actions dans un dossier (appel, email, visite, demande fournisseur, etc.).
- Gestion des relances et de l'assignation collaborative.
- Historique complet avec tracabilite forte.
- Kanban + historique + dashboards operationnels.
- Partage inter-agence cible par dossier.

### 3.2 Out of scope V1

- SLA automatique calcule par statut.
- Notifications email/SMS.
- Moteur BPM enterprise externe.
- IA de recommandation de relance.

---

## 4) Existant technique (constats repo + Supabase)

### 4.1 Tables existantes pertinentes

- `public.interactions`
- `public.agency_interaction_types`
- `public.agency_statuses`
- `public.agency_members`
- `public.profiles`
- `public.entities`
- `public.entity_contacts`

### 4.2 Champs existants utiles dans `interactions`

- `interaction_type` (text)
- `status` + `status_id` + `status_is_terminal`
- `order_ref`
- `reminder_at`
- `timeline` (jsonb)
- `last_action_at`
- `entity_id`, `contact_id`
- `created_by`, `updated_by`

### 4.3 Points forts existants

- RLS multi-tenant deja active.
- Table de types d'interaction deja disponible (`agency_interaction_types`).
- Status model deja structure (`agency_statuses` avec categorie).
- `last_action_at` deja exploite en front pour l'affichage operationnel.

### 4.4 Limites actuelles

- `timeline` en jsonb limite l'audit structure et la requetabilite.
- Pas de modele robuste pour participants multi-utilisateurs par dossier.
- Pas de partage inter-agence explicite par dossier.
- Pas de matrice de transitions configurable par type de dossier.

---

## 5) Vision metier cible (A a Z)

Un dossier peut inclure plusieurs actions dans le temps:

- Appel de qualification
- Demande de prix fournisseur
- Relance telephonique
- Visite de presentation
- Reponse client
- Envoi d'offre
- Suivi de conversion

Chaque action doit:

- Etre tracable (qui, quand, quoi, resultat).
- Impacter le statut si necessaire.
- Mettre a jour `last_action_at`.
- Apparaitre dans l'historique detail du dossier.

---

## 6) Typologie configurable des dossiers

## 6.1 Principe

Les types de dossier sont bases sur `agency_interaction_types` et doivent rester parametrables par agence.

## 6.2 Besoin supplementaire

Ajouter une couche de parametrage metier par type:

- champs obligatoires
- canaux autorises
- transitions autorisees
- exigence numero AS400
- relance obligatoire ou non

### 6.3 Proposition DB

Nouvelle table `interaction_type_rules`:

- `id uuid pk`
- `agency_id uuid not null`
- `interaction_type_id uuid not null` (FK `agency_interaction_types.id`)
- `requires_order_ref boolean not null default false`
- `requires_followup_date boolean not null default false`
- `allowed_channels text[] not null default '{}'`
- `default_status_id uuid null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contrainte:

- unicite `(agency_id, interaction_type_id)`.

---

## 7) Workflow et transitions controlees

## 7.1 Principe

Un changement de statut doit respecter une regle explicite.

## 7.2 Proposition DB

Nouvelle table `interaction_status_transitions`:

- `id uuid pk`
- `agency_id uuid not null`
- `from_status_id uuid not null`
- `to_status_id uuid not null`
- `interaction_type_id uuid null` (null = regle globale agence)
- `requires_order_ref boolean not null default false`
- `requires_followup_date boolean not null default false`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Contrainte:

- unicite `(agency_id, from_status_id, to_status_id, interaction_type_id)`.

## 7.3 Regles metier

1. Transition refusee si absente de la matrice active.
2. Si regle exige `order_ref`, format 6 chiffres obligatoire.
3. Si regle exige relance, `next_followup_at` obligatoire.
4. Reponse erreur en FR via AppError mappe.

---

## 8) Numero d'ordre AS400

## 8.1 Regle officielle

- Saisi manuellement par utilisateur (source AS400).
- Format exact: `^[0-9]{6}$`.
- Unicite au niveau agence.
- Obligatoire uniquement pour actions externes fournisseur.

## 8.2 Evolution schema

Dans `interactions`:

- conserver `order_ref` (text)
- ajouter check SQL format 6 chiffres quand non null
- ajouter index unique partiel `(agency_id, order_ref)` where `order_ref is not null`
- ajouter `is_supplier_external boolean not null default false`

---

## 9) Suivi des actions dans le dossier

## 9.1 Probleme actuel

`timeline` jsonb est pratique pour UI, mais insuffisant pour audit et dashboard avance.

## 9.2 Proposition

Conserver `timeline` en compat V1, ajouter une table d'evenements structuree.

Nouvelle table `interaction_events`:

- `id uuid pk`
- `interaction_id text not null` (FK `interactions.id`)
- `agency_id uuid not null`
- `actor_user_id uuid not null`
- `event_type text not null`
- `channel text null` (`Telephone`, `Email`, `Comptoir`, `Visite`, etc.)
- `occurred_at timestamptz not null default now()`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Types d'evenements initiaux:

- `creation`
- `status_change`
- `note_added`
- `followup_changed`
- `order_ref_changed`
- `supplier_quote_requested`
- `supplier_quote_received`
- `customer_offer_sent`
- `customer_followup`
- `assignment_changed`
- `share_changed`

Regles:

- append-only cote app
- jamais de suppression hard des evenements metier

---

## 10) Collaboration et partage multi-agence

## 10.1 Participants dossier

Nouvelle table `interaction_participants`:

- `id uuid pk`
- `interaction_id text not null`
- `agency_id uuid not null`
- `user_id uuid not null`
- `role text not null` (`owner`, `contributor`)
- `created_at timestamptz not null default now()`
- `created_by uuid not null`

Contraintes:

- unicite `(interaction_id, user_id)`
- un seul `owner` actif par dossier

## 10.2 Partage inter-agence cible

Nouvelle table `interaction_shares`:

- `id uuid pk`
- `interaction_id text not null`
- `owner_agency_id uuid not null`
- `shared_with_agency_id uuid not null`
- `permission text not null` (`read`, `write`)
- `created_at timestamptz not null default now()`
- `created_by uuid not null`

Contrainte:

- unicite `(interaction_id, shared_with_agency_id)`.

---

## 11) Relances et priorisation

## 11.1 Regle V1

- Date de relance definie manuellement.
- Champs:
  - `next_followup_at` (nouveau champ propose dans `interactions`)
  - `reminder_at` (legacy, a aligner vers `next_followup_at`).

## 11.2 Vues operationnelles

- `Relances a faire aujourd'hui`
- `Relances en retard`
- `Relances a venir`
- `Attente reponse fournisseur`

## 11.3 Regles d'affichage

- Tous ces widgets utilisent `next_followup_at` et `last_action_at`.
- Filtrage date homogene: toujours base sur date de reference explicite (pas mix implicite `created_at`).

---

## 12) UX/UI cible (shadcn/radix strict)

## 12.1 Regle globale UI

- Composants interactifs: shadcn/radix uniquement.
- Icones: `lucide-react` uniquement.
- Mobile-first, zero overflow horizontal.

## 12.2 Mapping composants obligatoires

Toolbar Pilotage:

- `Tabs` pour `Tableau` / `Historique`
- `Select` pour preset periode
- `Popover` + `Calendar` mode range pour plage date
- `Input` pour recherche
- `Tooltip` pour aide contextuelle

Kanban:

- `Card` / `Badge` / `Button` / `Separator`
- variantes couleurs par categorie:
  - a traiter: rouge
  - en cours: ambre
  - termine: vert

Detail dossier:

- `Sheet` (une seule croix de fermeture)
- `Form` + `Field` + `Select` + `Combobox` + `Textarea`
- `Tabs` internes si necessaire (`Timeline`, `Actions`, `Suivi`)

Historique:

- `Table` shadcn + pagination/virtualisation si volume

## 12.3 Range calendar UX attendu

Comportement obligatoire:

1. En mode range, premier clic ne doit pas fermer le calendrier.
2. Fermeture apres plage complete (`from` + `to`) ou action explicite (`Appliquer` / `Annuler`).
3. Support selection libre de date debut avant/after date courante.
4. Theme visuel aligne tokens CIR.

## 12.4 Accessibilite et clavier

- Navigation `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`.
- `Sheet` avec `SheetTitle` + `SheetDescription`.
- Aucun warning Radix critique en console.

---

## 13) Regles de filtrage date et affichage kanban

Regle de base:

- Les filtres de periode Pilotage doivent etre appliques de facon uniforme sur toutes colonnes.

Source temporelle:

- priorite `last_action_at`
- fallback `updated_at`
- fallback `created_at`

Resultat attendu:

- En mode "Aujourd'hui", aucun dossier hors plage du jour.
- Date + heure visibles sur chaque carte pour contexte reel.

---

## 14) Dashboards V1

## 14.1 Dashboard perso

- Nombre de relances dues aujourd'hui
- Nombre de relances en retard
- Nombre de dossiers attente fournisseur
- Liste priorisee de ses dossiers a actionner

## 14.2 Dashboard equipe

- Meme KPIs agreges equipe/agence
- Repartition par membre
- Retards critiques par type de dossier

---

## 15) Erreurs et observabilite (conformite projet)

Obligatoire:

- `createAppError`
- mappers metier dedies
- `normalizeError`
- `handleUiError`
- `reportError`
- `notifyError`
- messages FR

Interdit:

- `throw new Error()` dans la couche app
- `console.error` direct
- `toast.error()` direct

Codes erreurs a introduire:

- `INTERACTION_TRANSITION_FORBIDDEN`
- `INTERACTION_ORDER_REF_REQUIRED`
- `INTERACTION_ORDER_REF_INVALID`
- `INTERACTION_ORDER_REF_DUPLICATE`
- `INTERACTION_PARTICIPANT_INVALID`
- `INTERACTION_SHARE_FORBIDDEN`
- `INTERACTION_FOLLOWUP_REQUIRED`

---

## 16) Securite et RLS

## 16.1 Principes

- Respect multi-tenant strict.
- Lecture/ecriture autorisee seulement si:
  - membre agence proprietaire, ou
  - membre agence partagee avec permission adequate.

## 16.2 Policies a creer/adapter

- `interaction_participants`: select/insert/update/delete scopes.
- `interaction_shares`: controle owner agency + role admin/super_admin selon politique.
- `interaction_events`: insert autorise participants, update/delete refuse (append-only).

---

## 17) Architecture applicative cible

## 17.1 Frontend

Impacts principaux:

- `frontend/src/components/dashboard/*`
- `frontend/src/components/interactions/*`
- `frontend/src/hooks/useDashboardState.tsx`
- `frontend/src/hooks/useInteractionDetailsState.ts`
- `frontend/src/services/interactions/*`
- `frontend/src/schemas/interactionSchema.ts`

## 17.2 Backend

Option recommandee:

- Etendre Edge Function API (`backend/functions/api`) pour mutations critiques:
  - transition statut
  - gestion participants
  - partage inter-agence
  - relance
  - ajout evenement timeline structure

Pourquoi:

- centraliser validations metier + RLS + erreurs.
- reduire logique critique dupliquee cote front.

## 17.3 Types partages

- Mise a jour `shared/supabase.types.ts` apres migrations.
- Mise a jour schemas partages si nouveaux payloads API.

---

## 18) Plan de migration DB

Ordre d'execution recommande:

1. Ajouter nouvelles tables (`interaction_type_rules`, `interaction_status_transitions`, `interaction_participants`, `interaction_shares`, `interaction_events`).
2. Ajouter colonnes `interactions` (`is_supplier_external`, `next_followup_at`).
3. Ajouter contraintes `order_ref` format + unicite partielle.
4. Ajouter indexes de perf:
   - `(agency_id, next_followup_at)`
   - `(agency_id, last_action_at desc)`
   - `(interaction_id, occurred_at desc)` sur events
5. Ajouter policies RLS.
6. Backfill optionnel:
   - events initiaux depuis `timeline` existante.
7. Regenerer types Supabase.

---

## 19) Plan de livraison incremental

Phase A - Fondations data:

- migrations + RLS + types

Phase B - API metier:

- endpoints mutations critiques + mapping erreurs

Phase C - UI Pilotage:

- toolbar/date range
- kanban/list
- detail sheet suivi rigoureux

Phase D - dashboard et industrialisation:

- KPIs perso/equipe
- non-regression + hardening

---

## 20) Plan de tests

## 20.1 Unit tests

- Validation `order_ref` format/unicite/obligation conditionnelle.
- Moteur de transitions (allowed/blocked).
- Mappers erreurs AppError F2.
- Fonctions de filtrage date (`last_action_at`).

## 20.2 Integration tests

- CRUD dossier simple.
- Dossier fournisseur avec numero AS400.
- Assignation owner + contributeurs.
- Partage inter-agence dossier.
- Ajout action (appel/visite/demande fournisseur) + event audit.

## 20.3 E2E

Parcours minimaux:

1. Creation dossier simple.
2. Creation dossier fournisseur + saisie `order_ref`.
3. Passage en `Attente reponse fournisseur`.
4. Planification relance + affichage dashboard.
5. Ajout contributeur + action collaborative.
6. Consultation historique complet.
7. Filtre `Aujourd'hui` sans dossier hors plage.
8. Range calendar fluide (pas fermeture au premier clic).
9. Responsive anti-overflow:
   - 320x568
   - 390x844
   - 768x1024
   - 1024x768
   - 1280x800
10. Navigation clavier coherent et zero warning Radix critique.

## 20.4 Commandes de validation

Frontend (depuis `frontend/`):

- `npm run typecheck`
- `npm run lint -- --max-warnings=0`
- `npm run test -- --run`
- `npm run test:e2e`
- `npm run check:error-compliance`

Backend (depuis racine):

- `deno test --allow-env --no-check --config backend/deno.json backend/functions/api`

---

## 21) Criteres d'acceptation (DoD)

Fonctionnel:

1. Un dossier peut etre suivi de A a Z avec actions successives.
2. Les types de dossier restent parametrables via types d'interaction.
3. Les transitions sont controlees et expliquees en erreur FR si refusees.
4. Le numero AS400 est valide, unique par agence, obligatoire quand requis.
5. Les relances manuelles pilotent effectivement les listes d'actions.
6. Tout changement critique apparait dans l'historique.

Technique:

1. RLS conforme multi-tenant + partage cible.
2. Types Supabase regeneres et utilises sans `any`.
3. Zero regression pipeline erreurs.
4. Zero composant interactif hors shadcn/radix.
5. Zero icone hors Lucide.

UX:

1. Zero overflow horizontal sur la matrice cible.
2. Range calendar fluide et comprehensible.
3. Densite lisible desktop et mobile.
4. Detail dossier coherent, une seule action de fermeture visuelle.

---

## 22) Risques et mitigations

1. Risque: complexite RLS multi-agence.
   - mitigation: tests integration policy par cas limites (owner, contributor, shared read, shared write).

2. Risque: incoherence entre `timeline` jsonb legacy et `interaction_events`.
   - mitigation: backfill controle + fallback lecture progressive + observabilite.

3. Risque: volume events degrade perf dashboard.
   - mitigation: index temporels + pagination + virtualisation table.

4. Risque: mauvaise adoption utilisateur des nouveaux champs.
   - mitigation: aide contextuelle inline + microcopy claire + vues simplifiees pour dossiers simples.

---

## 23) Annexes implementation cible

## 23.1 Evolutions schema resumees

- `interactions`:
  - add `is_supplier_external`
  - add `next_followup_at`
  - constrain `order_ref` regex 6 digits
  - unique partial index `(agency_id, order_ref)`

- new:
  - `interaction_type_rules`
  - `interaction_status_transitions`
  - `interaction_participants`
  - `interaction_shares`
  - `interaction_events`

## 23.2 Regles UI resumees

- Toolbar: `Tabs`, `Select`, `Popover`, `Calendar`, `Input`, `Tooltip`.
- Detail: `Sheet` + `Form` + `Select`/`Combobox`.
- Historique: `Table`.
- Tous les composants interactifs en shadcn/radix.

## 23.3 Regles erreurs resumees

- Mapper toute erreur metier vers AppError.
- Notifier en FR via pipeline standard.
- Reporter systematiquement.

---

## 24) Versioning et gouvernance

- Ce document est la reference produit/technique pour l'evolution Pilotage F2.
- Toute modification de regle metier doit etre tracee ici avant implementation.
- Tout ecart implementation vs spec doit etre documente dans une section "ecarts valides".
