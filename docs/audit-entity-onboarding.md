# Audit complet — Création d'un nouveau client (`/clients/new`)

> Date : 2026-05-11
> Périmètre : route `/clients/new`, composant `EntityOnboardingDialog` et toute la chaîne de réutilisation (Saisie/Cockpit, conversion prospect→client, édition).
> Statut : audit lecture seule + plan de refactor exécutable. **Aucun code modifié.**

---

## Contexte

L'objectif est de comprendre **en ultra détails** le flux derrière `/clients/new` (design, logique, gestion d'erreurs, algorithme) et de cartographier où réutiliser ce module sur le reste de l'app (Saisie, etc.).

**Découverte centrale** : le module est **déjà** l'unique point d'entrée de création d'entité dans toute l'app. Il est utilisé en page (`/clients/new`, `/clients/prospects/$id/convert`) **et** en dialog depuis Saisie (Cockpit) — création prospect et conversion prospect→client.

Il subsiste toutefois :
- un wrapper `ClientFormDialog` qui choisit entre `EntityOnboardingDialog` (nouveau) et `ClientFormDialogLegacy` (ancien formulaire RHF mono-écran),
- deux services parallèles `saveClient.ts` / `saveEntity.ts` qui tapent finalement la même mutation tRPC `data.entities`,
- un orchestrateur hook (`useEntityOnboardingFlow.ts`) toujours flagué comme hotspot (~1138 LOC cumulées sur 10 sous-hooks).

---

## A. Cartographie complète du flux `/clients/new`

### A.1 Routing — TanStack Router

`frontend/src/app/router.tsx:53-58`

```ts
export const clientsCreateRoute = createRoute({
  getParentRoute: () => clientsRoute,
  path: 'new',
  validateSearch: validateDirectorySearch,
  component: ClientDirectoryCreatePage
});
```

`/clients/new` est une route enfant de `/clients`. La `validateSearch` propage les filtres annuaire (scope d'agences, `includeArchived`) pour pouvoir revenir au listing exactement dans son état.

### A.2 Page wrapper — `ClientDirectoryCreatePage.tsx` (116 LOC)

`frontend/src/components/client-directory/ClientDirectoryCreatePage.tsx`

- Récupère session + scope (rôle, agences sélectionnées, `includeArchived`).
- Charge `useAgencies()` et `useDirectoryOptionCommercials()` (gates conditionnels via `canLoadDirectory`).
- Garde-fou si pas d'agence active (`l.58-64`).
- Instancie deux mutations : `useSaveClient(primaryAgencyId, includeArchived)` et `useSaveProspect(...)`.
- Rend `EntityOnboardingDialog` avec `surface="page"`, `open={true}`, et **gère lui-même** :
  - la navigation back (`globalThis.history.back()` puis fallback `/clients`),
  - le `onComplete` qui route vers `/clients/$clientNumber` ou `/clients/prospects/$prospectId`,
  - `onOpenDuplicate` pour ouvrir la fiche d'un doublon détecté.

**Conclusion** : la page n'a **aucune logique métier**. C'est un host qui injecte un `surface` et deux fonctions de save.

### A.3 Orchestrateur — `EntityOnboardingDialog.tsx` (557 LOC)

`frontend/src/components/EntityOnboardingDialog.tsx`

Composant unique pour **toutes** les variantes (create/convert × dialog/page × client/prospect/particulier). Props clés (`l.50-72`) :

| Prop | Rôle |
|---|---|
| `mode` | `'create' \| 'convert'` |
| `defaultIntent` / `allowedIntents` | force ou borne le type d'entité (`client`/`prospect`) |
| `initialEntity` | seed (édition ou conversion) |
| `surface` | `'dialog'` (modal) ou `'page'` (plein écran) |
| `onSaveClient` / `onSaveProspect` | callbacks fournies par les hooks de mutation |
| `onComplete` | callback final → routage |
| `onOpenDuplicate` | callback pour ouvrir un doublon |

**Layout (`l.220-505`)** :
- Header sticky h-14 : back contextuel (page only), badges (`Nouveau`/`Conversion`, `sourceLabel`, badge `Officiel` si data sirene), breadcrumb d'étapes cliquable rétroactivement (`goToCompletedStep`), boutons Retour/Annuler/Continuer.
- Body 2 colonnes (`xl:flex-row`) : zone d'étape (gauche, max-w-2xl/3xl centré) + `EntityOnboardingSidebar` (droite, conditionnelle).
- 4 étapes orchestrées par `AnimatePresence` (motion/react) :
  1. **intent** — `EntityOnboardingIntentStep` : client/prospect + (si client) company/individual.
  2. **company** — `EntityOnboardingSearchStep` (~36 KB) : recherche entreprise via API Recherche Entreprises, filtres département/statut, manual entry toggle, duplicate detection inline.
  3. **details** — `EntityOnboardingDetailsStep` : RHF fields (agence, commercial, adresse, contact si individual), checklist de champs manquants.
  4. **review** — `EntityOnboardingReviewStep` : récap read-only avant commit.
- `AlertDialog` de confirmation de fermeture si l'utilisateur a saisi des données (cf. `useOnboardingCloseGuard`).

### A.4 Hook d'orchestration — `useEntityOnboardingFlow.ts` (292 LOC + 10 sous-hooks)

`frontend/src/components/entity-onboarding/`

Compose 10 sous-hooks (dispatch des responsabilités) :

1. `useEntityOnboardingStepper` — machine d'état des 4 étapes.
2. `useOnboardingConfig` — charge config agence (`manual_entry_enabled`, départements autorisés).
3. `useOnboardingLocalState` — `searchDraft`, filtres, `manualEntry`.
4. `useOnboardingValues` — `watch()` form → dérive `effectiveIntent`, `isIndividualClient`, etc.
5. `useOnboardingCompanyData` — queries directory (search, duplicates, details d'établissement).
6. `useOnboardingFlowEffects` — synchronisation form ↔ state ↔ query params à l'ouverture/changement d'intent.
7. `useOnboardingFlowActions` — handlers (`handleIntentChange`, `handleGroupSelect`, `applyCompany`, `handleCompanyNext`, `handleDetailsNext`, `handleSubmit`).
8. `useOnboardingSubmit` — validation finale (`clientFormSchema` / `prospectFormSchema`) + appel des mutations.
9. `useOnboardingCloseGuard` — gestion AlertDialog de fermeture.
10. `useOnboardingIntentControls` — toggles intent/clientKind avec règles métier (cash forcé pour particulier).

**Form** : `useForm<OnboardingFormInput, unknown, OnboardingValues>` + `zodResolver(onboardingFormSchema)` — schéma à 97 LOC dans `entityOnboarding.schema.ts` avec un `superRefine` riche pour les particuliers (first/last/phone-ou-email/postal_code obligatoires, `account_type='cash'` forcé, `cir_commercial_id` interdit).

### A.5 Services — duplication `saveClient.ts` vs `saveEntity.ts`

Les deux frappent la **même** mutation tRPC `data.entities` côté backend mais ont des APIs différentes :

| Aspect | `services/clients/saveClient.ts` (136 LOC) | `services/entities/saveEntity.ts` (133 LOC) |
|---|---|---|
| Type entrée | `ClientPayload` (champs Client only + `primary_contact`) | `EntityPayload` (générique, `entity_type: string`) |
| Sortie | `ResultAsync<Client, AppError>` | `ResultAsync<Entity, AppError>` |
| Validation préalable | `agency_id`, `client_number`, et `primary_contact` (individual) | `agency_id`, puis champs requis selon type |
| Branchement | 2 branches (`company` / `individual`) | 3 branches (`Client` / `Prospect` / `Fournisseur`) |
| Mutation | `api.data.entities.mutate({ action: 'save', entity_type: 'Client', entity })` | idem |
| Default `account_type` | impose `'cash'` pour individual | `'term'` par défaut |
| `address/postal_code/department` Client | obligatoires (throws `VALIDATION_ERROR`) | obligatoires (throws `VALIDATION_ERROR`) |

**Risque** : `saveEntity` pour `entity_type='Client'` est techniquement utilisable mais ne gère pas `client_kind='individual'` ni le `primary_contact`. En pratique :
- `EntityOnboardingDialog` côté création client appelle **toujours** `saveClient` (via `useSaveClient`).
- `saveEntity` n'est utilisé que pour **prospect** et fournisseur — la branche `Client` est du **code mort exploitable par erreur**.

### A.6 Mutations — `useSaveClient` / `useSaveProspect`

`frontend/src/hooks/useSaveClient.ts` (34 LOC) — pattern de référence :

```ts
return useMutation({
  mutationFn: (payload: ClientPayload) =>
    saveClient(payload).match(
      (client) => client,
      (error) => { throw error; }
    ),
  onSuccess: () => {
    void invalidateClientsQueries(queryClient, agencyId, includeArchived);
    void invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived);
    void invalidateDirectoryQueries(queryClient);
  },
  onError: (error) => {
    handleUiError(error, "Impossible d'enregistrer le client.", { source: 'useSaveClient.onError' });
  }
});
```

Pipeline d'erreur correct : `safeTrpc` retourne un `ResultAsync<T, AppError>` → unwrap via `.match()` qui rethrow → TanStack Query attrape → `onError` appelle `handleUiError` qui normalise + reporte + notifie via toast Sonner. **Conforme aux patterns B + D du CLAUDE.md.**

### A.7 Backend — tRPC `data.entities`

`backend/functions/api/trpc/router.ts:112-116`

```ts
data: router({
  entities: authedProcedure
    .input(dataEntitiesPayloadSchema)
    .output(dataEntitiesRouteResponseSchema)
    .mutation(withAuthedDualDbHandler(handleDataEntitiesAction, selectDataEntitiesDb)),
```

Input = `z.union([saveClientEntitySchema, saveProspectEntitySchema, saveSupplierEntitySchema, convertSchema, archiveSchema])` — pas `z.discriminatedUnion` car plusieurs variantes partagent `action: 'save'` (cf. règle Zod backend CLAUDE.md).

Handler `handleDataEntitiesAction` (`dataEntities.ts`) :
1. `ensureAgencyAccess(authContext, data.agency_id)` — RLS check (multi-tenant).
2. `saveEntity(db, payload, agencyId, userId)` (`dataEntitiesSave.ts`, 57 LOC).
3. Build rows via `buildSaveEntityRows()` (génère `client_number` si insert).
4. Si `isIndividualClient` → `db.transaction(...)` qui persiste l'entity + `primary_contact` atomiquement.
5. Sur erreur DB → `httpError(500, 'DB_WRITE_FAILED', ..., extractDbErrorDetails(error))` — pattern C backend.
6. Réponse : `{ request_id, ok: true, entity }`.

### A.8 Algorithme global (vue d'ensemble)

```
URL /clients/new
   │
   ▼
ClientDirectoryCreatePage  ─── fournit save mutations + onComplete
   │
   ▼
EntityOnboardingDialog (surface="page")
   │
   ├── intent step ─── choisit client/prospect + company/individual
   │       │
   ▼       ▼
   useEntityOnboardingFlow (10 sous-hooks)
   │
   ├── company step ─── search/select via API Recherche Entreprises
   │       └── duplicate detection (sidebar + inline)
   │
   ├── details step ─── RHF + Zod superRefine (champs conditionnels)
   │
   ├── review step ─── récap + missing checklist
   │
   ▼
useOnboardingSubmit
   │
   ├─[client]── saveClient(payload) → safeTrpc → api.data.entities.mutate(save Client)
   │
   └─[prospect]── saveEntity(payload) → safeTrpc → api.data.entities.mutate(save Prospect)
                        │
                        ▼
              tRPC authedProcedure
                        │
                        ▼
              handleDataEntitiesAction
                        │
                        ├── ensureAgencyAccess (RLS)
                        ├── buildSaveEntityRows
                        └── persistEntityRow [+ persistPrimaryContact si individual] (transaction)
                        │
                        ▼
              { ok: true, entity }
                        │
                        ▼
   invalidate caches (clients, search index, directory)
                        │
                        ▼
   onComplete → navigate /clients/$clientNumber ou /clients/prospects/$id
```

---

## B. Revue design / UX

### B.1 Forces

- **Hiérarchie cognitive claire** : 4 étapes, breadcrumb cliquable rétroactivement (`goToCompletedStep`), badge `Nouveau`/`Conversion` + `sourceLabel` + `Officiel` quand data sirene chargée → l'utilisateur sait toujours **où il est, d'où il vient, et la fiabilité de la donnée**.
- **Sidebar intelligente** (`EntityOnboardingSidebar`) : montre détails entreprise officielle, doublons, checklist `missingChecklist`, et `stepError` — la cognition est déportée hors du flux principal.
- **Reduced motion** respecté (`l.210-217`) — bonne accessibilité.
- **Surfaces interchangeables** : un seul composant gère dialog modale **et** page plein écran via `surface` (responsive + cohérent).
- **Garde de fermeture** (`AlertDialog`) — empêche la perte de saisie.
- **Filtre département + statut** dans la recherche entreprise + manuel fallback — couvre les particuliers et les cas API down.
- **Sonner toast + erreurs RHF inline** — double surface : champ (validation Zod) + global (réseau/DB).
- **`isSaving` désactive le bouton primary** + spinner `LoaderCircle` — pas de double-submit.

### B.2 Frictions UX identifiées

1. **Breadcrumb arrière uniquement** (`isClickable = index < currentStepIndex`, `l.272`) : on ne peut pas sauter en avant même si toutes les étapes en amont sont valides. Pour un parcours expert, c'est restrictif.
2. **Deux boutons "Retour"** dans le header (`showHeaderBack` quand `surface='page'` ET `showFooterBack` quand step ∈ {review, details, company}) — double UI possiblement confuse.
3. **Largeur fixe du dialog** : `w-[min(96vw,1320px)] h-[min(96vh,920px)]` → quasi-plein-écran sur la plupart des laptops, ce qui efface la distinction "modale vs page". Question : la modale a-t-elle encore un sens si elle prend 96% de l'écran ?
4. **`sourceLabel` non standardisé** : valeurs libres ("Annuaire", "Cockpit", "Edition client", "Fiche prospect", "Creation") — pas de type union. Risque de divergence visuelle.
5. **`createProspectFallback`/`saveProspectFallback`** : fonctions vides passées quand un seul intent est autorisé. Pollue les sites d'appel (3 occurrences).
6. **Pas de bouton "créer client" depuis la modale prospect** quand l'opérateur réalise mid-flow qu'il devait créer un client. L'`intent` est lockable côté API mais pas exposé dynamiquement aux callers.
7. **Sidebar non collapsible** sur écran moyen (entre `lg` et `xl`) — peut prendre 380px sur un viewport de 1280px.
8. **`title` du dialog en `sr-only`** mais sans `aria-describedby` explicite reliant la `DialogDescription` au flux multi-étape ; OK pour A11y de base, à confirmer avec lecteur d'écran.

### B.3 Cohérence avec le reste de l'app

- Utilise les bonnes primitives shadcn/ui (`Dialog`, `AlertDialog`, `Button`, `Badge`).
- Design tokens cohérents (`bg-surface-1`, `border-border-subtle`, `text-muted-foreground`).
- Animations `motion/react` alignées avec le reste de l'app.
- **Divergence** : `ClientFormDialogLegacy` (édition company existante) reste en formulaire mono-écran shadcn vanilla → expérience d'édition vs. création incohérente. Cf. section C.2.

---

## C. État de la réutilisation actuelle

### C.1 Callsites de `EntityOnboardingDialog` (7 occurrences)

| Fichier | Mode | Intent | Surface | Usage |
|---|---|---|---|---|
| `client-directory/ClientDirectoryCreatePage.tsx:68` | create | client/prospect | page | `/clients/new` |
| `client-directory/ClientDirectoryConvertPage.tsx:75` | convert | client | page | `/clients/prospects/$id/convert` |
| `ClientFormDialog.tsx:146` | create/edit | client | dialog | wrapper conditionnel |
| `ProspectFormDialog.tsx:119` | create | prospect | dialog | wrapper conditionnel |
| `cockpit/CockpitFormDialogs.tsx:62` | create | prospect | dialog | Saisie — création prospect |
| `cockpit/CockpitFormDialogs.tsx:84` | convert | client | dialog | Saisie — conversion prospect→client |
| `ConvertClientDialog.tsx:37` | convert | client | dialog | conversion modale |

### C.2 Wrappers résiduels

- **`ClientFormDialog`** : si `client === null` OR `client.client_kind === 'individual'` → `EntityOnboardingDialog`. Sinon → `ClientFormDialogLegacy` (édition company via `useClientFormDialog` + `useClientFormDialogFields`).
- **`ProspectFormDialog`** : si `prospect === null` → `EntityOnboardingDialog`. Sinon → `ProspectFormDialogLegacy`.

⇒ La **création** passe **systématiquement** par `EntityOnboardingDialog`. Le legacy ne sert plus qu'à **l'édition** company/prospect (mono-écran). Dette discrète mais non-bloquante.

### C.3 Saisie / Cockpit

Bouton **"+ Créer client / + Créer prospect"** dans `cockpit/left/CockpitSearchSection.tsx:44-48` → ouvre les dialogs depuis `CockpitFormDialogs`. **Réutilisation déjà en place.**

### C.4 Conclusion réutilisation

- ✅ `EntityOnboardingDialog` est **déjà** le hub unique de création d'entité (Annuaire + Saisie + Conversion).
- ⚠️ Wrappers `ClientFormDialog`/`ProspectFormDialog` mélangent legacy et nouveau → vecteur de confusion mais utile tant que le legacy d'édition existe.
- ⚠️ Service-layer dupliqué (`saveClient` vs `saveEntity` branche Client) → code mort exploitable par erreur.

---

## D. Plan de refactor exécutable (non appliqué)

### D.1 Lot 1 — Supprimer le code mort `saveEntity` branche Client

**Priorité haute · Risque faible**

**Fichier** : `frontend/src/services/entities/saveEntity.ts:82-105`

- Supprimer la branche `if (entityType === 'Client')`.
- Retirer `client_number`, `account_type`, `cir_commercial_id` de `EntityPayload` si non utilisés par les autres branches.
- Vérifier via grep qu'aucun appelant ne passe `entity_type: 'Client'` à `saveEntity`.
- Mettre à jour `resolvePayloadEntityType` pour ne plus accepter `'Client'`.

**Pourquoi** : forcer la séparation logique "Client → `saveClient`" et "Prospect/Fournisseur → `saveEntity`". Évite qu'on appelle `saveEntity({ entity_type: 'Client', ... })` sans `primary_contact` ou avec un `client_kind` invalide.

**Vérification** : `pnpm run typecheck` + `cd frontend && npx vitest run` + grep `entity_type: 'Client'.*saveEntity`.

### D.2 Lot 2 — Renommer pour clarifier

**Priorité moyenne · Risque faible**

- `frontend/src/services/entities/saveEntity.ts` → `saveProspectOrSupplier.ts` (et la fonction).
- Adapter tous les imports.

**Pourquoi** : nommer ce qui reste après le D.1. Évite la confusion "saveEntity = wrapper unifié".

### D.3 Lot 3 — Typer `sourceLabel`

**Priorité moyenne · Risque faible**

**Fichier** : `frontend/src/components/EntityOnboardingDialog.tsx:61`

- Remplacer `sourceLabel?: string` par une union typée :
  ```ts
  type OnboardingSourceLabel = 'Annuaire' | 'Cockpit' | 'Edition client' | 'Fiche prospect' | 'Creation';
  ```
- Centraliser les valeurs dans `entity-onboarding/entityOnboarding.types.ts`.

**Pourquoi** : la valeur apparaît dans le badge header — divergence visuelle si les callers tapent à la main.

### D.4 Lot 4 — Supprimer les `*Fallback` parasites

**Priorité moyenne · Risque faible**

**Fichiers** :
- `frontend/src/components/cockpit/CockpitFormDialogs.tsx:29-30`
- `frontend/src/components/ClientFormDialog.tsx:49,158`
- `frontend/src/components/ProspectFormDialog.tsx`

**Refactor** : rendre `onSaveClient` et `onSaveProspect` **optionnels** dans `EntityOnboardingDialogProps`. Dans `useOnboardingSubmit`, throw une `AppError` si la callback manquante correspond à l'intent choisi.

**Pourquoi** : élimine 3 fonctions fantôme et clarifie le contrat.

### D.5 Lot 5 — Migrer l'édition vers `EntityOnboardingDialog`

**Priorité moyenne · Risque moyen**

**Option A — Étendre `EntityOnboardingDialog` au mode édition** :
- Ajouter `mode: 'edit'` à `OnboardingMode`.
- Skip intent + company steps en mode edit → ouvrir directement sur `details`.
- Pré-remplir via `initialEntity` (déjà supporté).
- Supprimer `ClientFormDialogLegacy`, `ProspectFormDialogLegacy`, `useClientFormDialog`, `useClientFormDialogFields`, `ClientFormContent` et ses sous-composants `client-form/*`.

**Option B — Statu quo + lock** : marquer `ClientFormDialogLegacy` comme « édition company uniquement », documenter, ajouter un test snapshot.

**Recommandation** : Option A à terme (cohérence UX et suppression de ~6 fichiers). PR dédiée.

### D.6 Lot 6 — Documenter la décomposition de `useEntityOnboardingFlow.ts`

**Priorité basse · Risque moyen**

- Documenter le **graphe de dépendances** entre sous-hooks en tête de fichier.
- Identifier 1 ou 2 sous-hooks fusionnables (ex: `useOnboardingLocalState` + `useOnboardingIntentControls`) si cycles de vie identiques.
- Pas de réécriture massive — le découpage actuel est sain.

### D.7 Lot 7 — UX micro-fixes

**Priorité basse · Risque faible**

1. **Cacher le bouton "Retour" du footer** quand le bouton "Retour aux résultats" est visible dans le header (`surface='page'`).
2. **Sidebar collapsible sur `lg`** : `lg:max-w-[260px] xl:w-[380px]` pour récupérer de la largeur sur 1280px.
3. **Bouton breadcrumb avant** : autoriser `goToCompletedStep` sur étapes en aval **si** toutes les étapes en amont sont valides.
4. **Bouton "Annuler"** : appeler `requestClose()` au lieu de fermer directement (vérifier que la garde se déclenche bien à `surface='page'`).

### D.8 Lot 8 — Mémoire / docs

**Priorité basse**

- Mettre à jour `docs/plan.md` (Phase 4) avec un mini-diagramme du flux entity-onboarding.
- Acter que le hotspot `useEntityOnboardingFlow.ts` est **délibérément** décomposé.

---

## E. Fichiers critiques (rappel)

- `frontend/src/services/entities/saveEntity.ts` (lots 1, 2)
- `frontend/src/components/EntityOnboardingDialog.tsx` (lots 3, 4, 7)
- `frontend/src/components/cockpit/CockpitFormDialogs.tsx` (lot 4)
- `frontend/src/components/ClientFormDialog.tsx` (lots 4, 5)
- `frontend/src/components/ProspectFormDialog.tsx` (lots 4, 5)
- `frontend/src/components/entity-onboarding/entityOnboarding.types.ts` (lot 3)
- `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.ts` (lot 6)
- Fichiers legacy candidats à suppression (lot 5 option A) : `client-form/*`, `useClientFormDialog.ts`, `useClientFormDialogFields.ts`, `ClientFormDialogLegacy`, `ProspectFormDialogLegacy`.

---

## F. Vérification end-to-end (avant chaque merge)

Pour chaque lot :

1. `pnpm run qa:fast` (typecheck + lint + tests front + checks backend).
2. Test manuel browser sur `/clients/new` :
   - Créer un client company avec données API Recherche Entreprises → redirige vers `/clients/$clientNumber`.
   - Créer un client individual → vérifier `primary_contact` persisté.
   - Créer un prospect → redirige vers `/clients/prospects/$id`.
   - Tester duplicate detection (saisir un SIRET existant).
   - Tester garde de fermeture (saisir un champ → fermer → AlertDialog).
3. Test Cockpit : `/cockpit` → "+ Créer prospect" → vérifier que le dialog s'ouvre, save fonctionne, le prospect créé apparaît dans la recherche.
4. Test conversion : depuis Cockpit, sélectionner prospect → action "Convertir" → vérifier que `EntityOnboardingDialog mode="convert"` s'ouvre avec `initialEntity` pré-remplie et que le save retourne un client.
5. Avant livraison finale : `pnpm run qa` complet.
