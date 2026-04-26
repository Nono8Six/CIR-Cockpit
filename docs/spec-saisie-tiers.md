# Spécification — Saisie : modèle de données unifié pour tous types de tiers

> Document complet de cadrage pour le dev frontend.
> Statut : **brainstorm validé avec le PO** (2026-04-26). Aucune ligne de code écrite à ce stade — ce doc est la source unique avant implémentation.
> Scope : logique de données + recherche + création inline. **Aucun redesign visuel ici.**

## Sommaire

1. [Contexte](#1-contexte)
2. [Glossaire métier](#2-glossaire-métier-définitions-arrêtées)
3. [Boutons « Type de tiers » (UI)](#3-boutons--type-de-tiers--6-boutons)
4. [Matrice création par type — le cœur du doc](#4-matrice-création-inline-par-type)
5. [Modèle de données cible](#5-modèle-de-données-cible)
6. [Vue SQL `search_entities`](#6-vue-sql-publicsearch_entities)
7. [Flow Saisie & recherche multi-critères](#7-flow-saisie--recherche-multi-critères)
8. [EntityOnboardingDialog : refonte des intents](#8-entityonboardingdialog--refonte-des-intents)
9. [Conversions entre types](#9-conversions-entre-types)
10. [Directory : onglets par type](#10-directory--onglets-par-type)
11. [API tRPC](#11-api-trpc)
12. [Migrations SQL](#12-migrations-sql-ordre-dapplication)
13. [Fichiers à modifier](#13-fichiers-à-modifier)
14. [Vérification end-to-end](#14-vérification-end-to-end)
15. [Points en suspens à confirmer](#15-points-en-suspens--à-confirmer-avant-impl)
16. [Annexe A — Trace décisionnelle (Q&A)](#annexe-a--trace-décisionnelle-qa)

---

## 1. Contexte

L'onglet **Saisie** (`/cockpit`) propose 5 modes de relation dans l'UI : Client, Prospect / Particulier, Fournisseur, Sollicitation, Interne (CIR). Mais le code et la base ne supportent pleinement que Client et Prospect :

- `data.schema.ts` n'accepte que `Client | Prospect | Fournisseur` au save.
- `EntityOnboardingDialog` n'a que les intents `client | prospect`.
- `dataEntitiesList.ts` ne liste que Client + Prospect.
- **Sollicitation** et **Interne (CIR)** bypassent totalement `entities` (texte libre + lookup `agency_members` / `profiles`). → Aucune réutilisation cross-interactions, aucune recherche croisée.

### État DB vérifié via Supabase MCP (2026-04-26)

| Élément | État |
|---|---|
| `entities.entity_type` | `text` libre, pas d'enum SQL → DB extensible sans DDL bloquant |
| `entities.client_kind` | `'company' \| 'individual'` ou NULL |
| `entities.account_type` | enum `'term' \| 'cash'` ou NULL |
| `entities.client_number` | text optionnel (regex `^[0-9]{1,10}$`) |
| `agency_entities` (agence active) | contient déjà 5 labels FR |
| `entities` (rows) | 4 Client + 1 « Prospect / Particulier » legacy |
| `entities.primary_phone/email` | **n'existent pas** |
| `profiles.phone` | **n'existe pas** |
| Internes externes | aucun stockage actuel |
| `cir_agencies` (table de référence) | n'existe pas |

### Objectif

Faire de `entities` le référentiel unique multi-types. Exposer une recherche cross-type via une vue SQL UNION sur `profiles` (pour les internes-members). Permettre la création inline ultra-courte par type. Permettre la conversion contrôlée d'un type vers un autre.

---

## 2. Glossaire métier (définitions arrêtées)

| Terme métier | Définition validée | Mapping DB cible |
|---|---|---|
| **Client (compte à terme)** | Personne morale ou physique avec un numéro de client, paiement à terme. | `entity_type='Client'`, `account_type='term'`, `client_number` rempli, `client_kind` = `company` ou `individual` |
| **Particulier** *(comptant)* | **Client qui paie au comptant. A un numéro de client.** Peut être personne physique ou morale (toute société payant cash). C'est un Client, distinct d'un Prospect. | `entity_type='Client'`, `account_type='cash'`, `client_number` rempli, `client_kind` = `company` ou `individual` (default `individual`) |
| **Prospect** | Personne morale ou physique **sans compte ni numéro de client**, même pas en comptant. C'est un contact qu'on espère convertir. **N'a pas de commercial CIR rattaché.** | `entity_type='Prospect'`, `account_type` NULL, `client_number` NULL, `cir_commercial_id` NULL |
| **Fournisseur** | Tiers qui fournit l'agence. Peut avoir un siglet interne 4 caractères (ex: ROCK pour Rockwell, SIEM pour Siemens). | `entity_type='Fournisseur'`, optionnels : `supplier_code` (4 chars), `siret`, `notes` |
| **Sollicitation** | Démarcheur entrant (numéro inconnu qui appelle pour vendre). Persisté pour reconnaître le numéro lors d'appels suivants. | `entity_type='Sollicitation'`, `primary_phone` requis, `name` default `'Inconnu'` |
| **Interne (CIR) — member** | Collègue de la plateforme (utilisateur authentifié, ligne dans `profiles` + `agency_members`). | Pas dupliqué dans `entities` ; recherche via vue UNION sur `profiles` |
| **Interne (CIR) — externe** | Collègue d'une agence CIR qui n'est PAS user de la plateforme, mais qu'on veut tracer dans nos interactions. Saisie ouverte depuis l'onglet Saisie. | `entity_type='Interne (CIR)'`, `first_name`, `last_name`, `cir_agency_id` (FK vers nouvelle table `cir_agencies`) |

> **Note importante** : « Particulier » dans le lexique du projet ≠ sens grand public. Ici c'est **un client comptant**, peu importe sa nature juridique. Ce qui le distingue d'un Prospect : il a un numéro de client (compte ouvert).

---

## 3. Boutons « Type de tiers » (6 boutons)

L'étape 2 du wizard Saisie passe de 5 à **6 boutons** distincts (validation utilisateur 2026-04-26). On sépare Client à terme et Particulier au lieu de fusionner sous « Client » avec sub-toggle.

| # | Bouton UI | entity_type DB | Filtres lecture (recherche) | Création crée | Icône (existante / suggérée) |
|---|---|---|---|---|---|
| 1 | **Client à terme** | `Client` | `entity_type='Client' AND account_type='term'` | `Client`, `account_type='term'`, `client_number` requis | `Building2` |
| 2 | **Particulier** *(comptant)* | `Client` | `entity_type='Client' AND account_type='cash'` | `Client`, `account_type='cash'`, `client_number` requis, `client_kind` default `individual` | `UserRound` |
| 3 | **Prospect** | `Prospect` | `entity_type='Prospect'` | `Prospect`, pas de `client_number`, pas d'`account_type`, pas de `cir_commercial_id` | `Sprout` (ou `UserRound`) |
| 4 | **Fournisseur** | `Fournisseur` | `entity_type='Fournisseur'` | `Fournisseur`, optionnel `supplier_code` | `Factory` |
| 5 | **Sollicitation** | `Sollicitation` | `entity_type='Sollicitation'` | `Sollicitation` (téléphone seul suffit) | `Megaphone` |
| 6 | **Interne (CIR)** | `Interne (CIR)` (entities) **OU** profiles via UNION | `entity_type='Interne (CIR)'` OU `source='profile'` | Création autorisée **uniquement** pour Interne externe (`entities` row) ; jamais pour les members | `Users` |

> Le bouton « Tout » (filter `''`) reste en place pour la recherche transverse (statu quo de `CockpitGuidedRelationQuestion.tsx:22-29`).

---

## 4. Matrice création inline (par type)

> **Tableau central du document** : ce qui est demandé dans le dialog minimal quand l'utilisateur clique « Créer » après une recherche infructueuse. La query déjà tapée (téléphone ou texte) **pré-remplit** automatiquement le champ correspondant.

### 4.1 Tableau récapitulatif

| Bouton UI | Champs requis | Champs optionnels | Champs cachés / défauts auto |
|---|---|---|---|
| **Client à terme** | `name`, `client_number`, `postal_code`, `city`, `account_type='term'` (auto) | `client_kind` (default `company`), `siren`, `naf_code`, `address`, `primary_phone`, `primary_email`, `cir_commercial_id` | `entity_type='Client'`, `agency_id=currentAgency` |
| **Particulier** | `name` (ou `first_name`+`last_name` si `client_kind='individual'`), `client_number`, `account_type='cash'` (auto), **(`primary_phone` OU `primary_email`)** | `client_kind` (default `individual`, toggle visible), `postal_code`, `city`, `address` | `entity_type='Client'`, `agency_id=currentAgency` |
| **Prospect** | **`name` uniquement** | `postal_code`, `city`, `primary_phone`, `primary_email`, `address` | `entity_type='Prospect'`, `account_type=NULL`, `client_number=NULL`, **`cir_commercial_id=NULL` (jamais rempli)**, `agency_id=currentAgency` |
| **Fournisseur** | `name`, **(`primary_phone` OU `primary_email`)** | `supplier_code` (4 chars uppercase + chiffres), `siret`, `address`, `city`, `postal_code`, `notes`, contacts complets via `entity_contacts` | `entity_type='Fournisseur'`, `agency_id=currentAgency` |
| **Sollicitation** | `primary_phone` | `name` (default `'Inconnu'`), `notes` | `entity_type='Sollicitation'`, `agency_id=currentAgency` |
| **Interne (CIR) externe** | `first_name`, `last_name`, `cir_agency_id` (FK `cir_agencies`) | `primary_phone`, `primary_email`, `notes` | `entity_type='Interne (CIR)'`, `agency_id=currentAgency`, `client_kind='individual'`, `account_type=NULL`, `client_number=NULL` |
| **Interne (CIR) member** | (création non disponible — sélection uniquement) | — | source = `profiles` |

### 4.2 Détail par cas

#### 4.2.1 Client à terme

- Statu quo de l'EntityOnboardingDialog actuel (intent `'client-term'`).
- 4 steps : Intent → Company search (recherche officielle SIRET) → Details (adresse, contact, commercial) → Review.
- Préservé tel quel dans la branche multi-step.

#### 4.2.2 Particulier (Client comptant)

- Nouveau mode Quick (1 écran) du dialog.
- Champs visibles à l'écran :
  - Toggle `client_kind` : `Particulier (personne physique)` (default) | `Société comptant`.
  - Si `individual` : `first_name` + `last_name` (concaténés en `name` au save).
  - Si `company` : `name` direct.
  - `client_number` (requis).
  - `primary_phone` + `primary_email` (au moins un des deux requis).
  - Optionnels visibles : `postal_code`, `city`.
- Pré-remplissage : si la query était numérique → `primary_phone` ; sinon → `name`/`last_name`.

#### 4.2.3 Prospect

- Nouveau mode Quick (1 écran) du dialog.
- **Seul `name` est requis.** Le reste est optionnel.
- ⚠️ **Contradiction à confirmer** dans la session de validation : à la question « tel ou email obligatoire ? », l'utilisateur a répondu « Oui » mais aussi a écrit en libre « Au moins le nom, et après optionnel numéro de tel/mail, adresse etc... ». La version libre prime ici. À reconfirmer avant implémentation (cf §15).
- **Aucun `cir_commercial_id`** : un Prospect n'a pas de commercial rattaché par décision métier. Le champ est masqué et forcé à NULL au save.

#### 4.2.4 Fournisseur

- Nouveau mode Quick (1 écran), avec section « Enrichir » expandable pour les champs optionnels.
- Champs requis : `name`, `primary_phone` OU `primary_email`.
- Champs optionnels visibles dans le panneau « Enrichir » :
  - `supplier_code` : 4 caractères uppercase + chiffres (regex `^[A-Z0-9]{1,4}$`). Ex: ROCK, SIEM, 3M.
  - `siret` : 14 chiffres.
  - `address`, `city`, `postal_code`.
  - `notes`.
  - Contacts : possibilité d'ajouter un ou plusieurs `entity_contacts` (commercial fournisseur, SAV, comptabilité…).

#### 4.2.5 Sollicitation

- Mode Quick **mono-champ** (le plus court de tous).
- Seul champ requis : `primary_phone` (souvent déjà pré-rempli depuis la query).
- Champs optionnels visibles : `notes` (origine du démarchage : pub, formation, téléphonie…).
- Au save : si `name` vide → `'Inconnu'`.
- Au prochain appel du même numéro → `primary_phone` matche → entité Sollicitation existante remonte → on peut l'enrichir (nom du démarcheur, société démarcheuse).

#### 4.2.6 Interne (CIR) — externe

- Mode Quick (1 écran).
- Champs requis : `first_name`, `last_name`, `cir_agency_id` (liste déroulante alimentée par la table `cir_agencies`).
- Champs optionnels : `primary_phone`, `primary_email`, `notes`.
- Le `name` est calculé : `concat(first_name, ' ', last_name)`.
- `entity_type='Interne (CIR)'`.

#### 4.2.7 Interne (CIR) — member

- Pas de création depuis Saisie. Les members sont gérés via l'admin agence (`adminUsers`).
- Recherche : la vue `search_entities` les expose avec `source='profile'`.
- Un member peut renseigner son `phone` via son profil utilisateur (nouveau champ `profiles.phone` édité par l'utilisateur lui-même).

---

## 5. Modèle de données cible

### 5.1 Table `entities` — colonnes ajoutées

| Colonne | Type | NULL | Index | Rôle |
|---|---|---|---|---|
| `primary_phone` | `text` | oui | btrim B-tree | Téléphone principal de l'entité (E.164 normalisé). Mirror auto depuis le contact primary. |
| `primary_email` | `text` | oui | btrim B-tree | Email principal. Mirror auto. |
| `supplier_code` | `text` | oui | unique partiel `WHERE entity_type='Fournisseur'` | Siglet interne 4 chars uppercase + chiffres. Regex `^[A-Z0-9]{1,4}$`. Spécifique Fournisseur. |
| `cir_agency_id` | `uuid` | oui | btrim B-tree | FK vers `cir_agencies.id`. Spécifique Interne (CIR) externe. |

> **Justification de la dénormalisation `primary_phone`/`primary_email`** :
> - Sollicitation et Particulier ne nécessitent pas forcément un `entity_contacts` distinct → on doit pouvoir stocker la coordonnée directement sur l'entité.
> - Recherche en O(1) sans LEFT JOIN obligatoire.
> - Le trigger §5.4 maintient la cohérence avec `entity_contacts`.

### 5.2 Table `entity_contacts` — ajout flag

| Colonne | Type | Default | Contrainte |
|---|---|---|---|
| `is_primary` | `boolean` | `false` | Index unique partiel `(entity_id) WHERE is_primary = true` (un seul contact primary par entité) |

**Backfill** : pour chaque entité existante, le contact ayant le `created_at` le plus ancien devient primary.

### 5.3 Table `profiles` — ajout colonne

| Colonne | Type | NULL | Rôle |
|---|---|---|---|
| `phone` | `text` | oui | Téléphone professionnel de l'utilisateur CIR. Édité par l'utilisateur lui-même depuis son profil. Permet la recherche d'un member par tel via la vue `search_entities`. |

### 5.4 Trigger de synchronisation `entities` ↔ `entity_contacts`

```sql
CREATE OR REPLACE FUNCTION public.tg_sync_entity_primary_contact()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.entities e
    SET primary_phone = NEW.phone,
        primary_email = NEW.email,
        updated_at    = now()
    WHERE e.id = NEW.entity_id;
  ELSIF (
    SELECT primary_phone FROM public.entities WHERE id = NEW.entity_id
  ) IS NULL THEN
    UPDATE public.entities e
    SET primary_phone = COALESCE(e.primary_phone, NEW.phone),
        primary_email = COALESCE(e.primary_email, NEW.email),
        updated_at    = now()
    WHERE e.id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_entity_primary_contact
AFTER INSERT OR UPDATE OF phone, email, is_primary
ON public.entity_contacts
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_entity_primary_contact();
```

> Le `SECURITY DEFINER` doit être audité côté RLS. Sinon : passer à `SECURITY INVOKER` après vérification que l'utilisateur appelant a bien les droits sur `entities`.

### 5.5 Nouvelle table `public.cir_agencies` (référentiel)

| Colonne | Type | NULL | Default | Rôle |
|---|---|---|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | PK |
| `name` | `text` | non | — | Ex: « CIR Lyon Centre », « CIR Bordeaux Nord » |
| `region` | `text` | oui | — | Ex: « Auvergne-Rhône-Alpes » |
| `city` | `text` | oui | — | Ville principale |
| `created_at` | `timestamptz` | non | `now()` | |
| `updated_at` | `timestamptz` | non | `now()` | |
| `archived_at` | `timestamptz` | oui | — | |

- RLS : lecture autorisée à tous les users authentifiés (référentiel statique).
- Modification : `super_admin` uniquement (à confirmer).
- Seed : à fournir séparément (liste des agences CIR connues).
- Index : btrim B-tree sur `name`.

### 5.6 Migration legacy

```sql
-- Avant déploiement frontend
UPDATE public.entities
SET entity_type = 'Prospect'
WHERE entity_type = 'Prospect / Particulier';

-- Cleanup des labels agency_entities
UPDATE public.agency_entities
SET label = 'Prospect'
WHERE label = 'Prospect / Particulier';

-- Insérer le label 'Particulier' si absent dans agency_entities
INSERT INTO public.agency_entities (agency_id, label, sort_order)
SELECT a.id, 'Particulier', 2
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_entities ae
  WHERE ae.agency_id = a.id AND ae.label = 'Particulier'
);

-- Remap interactions historiques
UPDATE public.interactions
SET entity_type = 'Prospect'
WHERE entity_type = 'Prospect / Particulier';
```

---

## 6. Vue SQL `public.search_entities`

```sql
CREATE OR REPLACE VIEW public.search_entities AS
SELECT
  e.id::text             AS id,
  'entity'::text         AS source,
  e.entity_type          AS entity_type,
  e.client_kind          AS client_kind,
  e.account_type::text   AS account_type,
  e.name                 AS display_name,
  e.primary_phone        AS phone,
  e.primary_email        AS email,
  e.client_number        AS client_number,
  e.supplier_code        AS supplier_code,
  e.cir_agency_id        AS cir_agency_id,
  e.city                 AS city,
  e.agency_id            AS agency_id,
  e.archived_at          AS archived_at
FROM public.entities e
UNION ALL
SELECT
  p.id::text             AS id,
  'profile'::text        AS source,
  'Interne (CIR)'::text  AS entity_type,
  NULL::text             AS client_kind,
  NULL::text             AS account_type,
  COALESCE(
    p.display_name,
    NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), '')
  )                      AS display_name,
  p.phone                AS phone,
  p.email                AS email,
  NULL::text             AS client_number,
  NULL::text             AS supplier_code,
  NULL::uuid             AS cir_agency_id,
  NULL::text             AS city,
  am.agency_id           AS agency_id,
  p.archived_at          AS archived_at
FROM public.profiles p
JOIN public.agency_members am ON am.user_id = p.id;
```

- RLS : la vue hérite des politiques sous-jacentes (`entities`, `profiles`, `agency_members`).
- L'onglet « Internes » du Directory (cf §10) requête cette vue avec filtre `entity_type='Interne (CIR)'`. Il voit donc à la fois les members (source=`'profile'`) et les externes (source=`'entity'`).

---

## 7. Flow Saisie & recherche multi-critères

### 7.1 Ordre du flow (inchangé visuellement)

```
[Étape 1 Canal]
    ↓
[Étape 2 Type de tiers] (6 boutons + Tout)
    ↓
[Étape 3 Recherche multi-critères] (un seul champ texte)
    ↓
   ┌── match ──┴── pas de match ──┐
   ↓                                ↓
Sélection                  Bouton « Créer »
   ↓                                ↓
[Étape 4 Contact]          EntityOnboardingDialog
   ↓                       (mode quick selon type)
[Étape 5 Qualification]            ↓
   ↓                       Sélection auto
[Étape 6 Sujet]                     ↓
   ↓                       [Étape 4 Contact]
Submit                              ...
```

> Pas de step « téléphone-first » dédié. Le téléphone est une des entrées possibles dans le champ unique de recherche.

### 7.2 Recherche multi-critères — comportement frontend

```ts
function detectQueryMode(input: string): 'phone' | 'text' {
  const trimmed = input.trim();
  if (/^[\d+\s\-().]{4,}$/.test(trimmed)) return 'phone';
  return 'text';
}
```

| Mode détecté | Colonnes matchées (vue `search_entities`) | Tri |
|---|---|---|
| `phone` | `phone` ILIKE + `client_number` ILIKE + `supplier_code` ILIKE | match exact > préfixe > sous-chaîne, **score combiné par longueur/exactitude** (pas de hiérarchie absolue phone vs client_number vs supplier_code) |
| `text` | `display_name` ILIKE + `email` ILIKE | exact `display_name` > préfixe > sous-chaîne > préfixe `email` |

### 7.3 Filtres serveur appliqués

Toujours appliqués automatiquement :
- `agency_id = currentAgency` (RLS + filtre explicite).
- `archived_at IS NULL` (sauf si toggle « inclure archivées » activé).
- Filtres du bouton Type courant (cf §3 colonne « Filtres lecture »).

### 7.4 Cross-type avec hint

Si le bouton courant est « Client à terme » mais la query matche aussi un Particulier (cash) — ou un Prospect, ou un Fournisseur — le résultat est **affiché malgré le filtre**, avec un hint visuel discret type :

> « Cette entité est dans **Particulier**. Voulez-vous changer le type de tiers ? »

Évite les doublons par erreur de bouton.

### 7.5 Résultats UX

- **Limite** : 10 résultats.
- **0 résultat** : bouton « Créer un nouveau {type} » avec pré-remplissage automatique de la query (tel ou nom).
- **1..N résultats** : liste cliquable avec, par item :
  - Badge `entity_type`.
  - `display_name` mis en évidence.
  - Sous-ligne : `city` + `phone` + `client_number` (selon disponibilité).
  - Si cross-type : badge couleur différente + hint au survol.
- **Toggle « Inclure archivées »** : caché par défaut, visible en dépliant un panneau « Plus d'options ».

### 7.6 Réponse API attendue

```ts
type SearchResult = {
  id: string;                          // entity.id ou profile.id
  source: 'entity' | 'profile';
  entityType: string;                  // 'Client' | 'Prospect' | 'Fournisseur' | 'Sollicitation' | 'Interne (CIR)'
  clientKind: 'company' | 'individual' | null;
  accountType: 'term' | 'cash' | null;
  displayName: string;
  phone: string | null;                // E.164
  email: string | null;
  clientNumber: string | null;
  supplierCode: string | null;
  cirAgencyId: string | null;
  city: string | null;
};
```

---

## 8. EntityOnboardingDialog : refonte des intents

### 8.1 Intents élargis

`frontend/src/components/entity-onboarding/entityOnboarding.types.ts`, ligne 11 actuelle :

```ts
// Avant
export type OnboardingIntent = 'client' | 'prospect';

// Après
export type OnboardingIntent =
  | 'client-term'        // Client compte à terme
  | 'client-cash'        // Particulier (= Client comptant)
  | 'prospect'
  | 'fournisseur'
  | 'sollicitation'
  | 'interne-external';  // Interne CIR externe (pas user de la plateforme)
```

> Pas d'intent `'interne-member'` : la création d'un member passe par l'admin.

### 8.2 Steps activés par intent

| Intent | Mode | Steps |
|---|---|---|
| `client-term` | Multi-step (existant) | Intent → Company search → Details → Review |
| `client-cash` | **Quick** mono-écran | toggle kind + name + client_number + (phone OU email) + city/postal_code optionnels |
| `prospect` | **Quick** mono-écran | name (seul requis) + optionnels (phone/email/city/postal_code/address) |
| `fournisseur` | **Quick** mono-écran avec section « Enrichir » | name + (phone OU email) + optionnels (supplier_code/siret/adresse/notes) |
| `sollicitation` | **Quick** ultra-court | primary_phone + notes optionnel |
| `interne-external` | **Quick** mono-écran | first_name + last_name + cir_agency_id (Select) + optionnels (phone/email) |

### 8.3 Schémas Zod par intent

À ajouter dans `frontend/src/components/entity-onboarding/entityOnboarding.schema.ts` (composer avec union au sommet) :

```ts
import { z } from 'zod';
import { phoneSchema, postalCodeSchema, clientNumberSchema } from '@/shared/schemas';

const sollicitationSchema = z.object({
  intent: z.literal('sollicitation'),
  primaryPhone: phoneSchema,                       // requis
  name: z.string().trim().optional(),              // si vide → 'Inconnu' au save
  notes: z.string().trim().optional(),
});

const fournisseurSchema = z.object({
  intent: z.literal('fournisseur'),
  name: z.string().trim().min(1),
  primaryPhone: phoneSchema.nullable(),
  primaryEmail: z.string().email().nullable(),
  supplierCode: z.string().regex(/^[A-Z0-9]{1,4}$/).optional(),
  siret: z.string().regex(/^\d{14}$/).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postalCode: postalCodeSchema.optional(),
  notes: z.string().trim().optional(),
}).refine(d => d.primaryPhone || d.primaryEmail, {
  message: 'Téléphone ou email requis',
});

const particulierSchema = z.object({
  intent: z.literal('client-cash'),
  clientKind: z.enum(['company', 'individual']).default('individual'),
  name: z.string().trim().min(1),                  // raison sociale ou « Prénom Nom »
  clientNumber: clientNumberSchema,                // requis
  primaryPhone: phoneSchema.nullable(),
  primaryEmail: z.string().email().nullable(),
  postalCode: postalCodeSchema.optional(),
  city: z.string().trim().optional(),
}).refine(d => d.primaryPhone || d.primaryEmail, {
  message: 'Téléphone ou email requis',
});

const prospectQuickSchema = z.object({
  intent: z.literal('prospect'),
  name: z.string().trim().min(1),                  // SEUL requis
  city: z.string().trim().optional(),
  postalCode: postalCodeSchema.optional(),
  primaryPhone: phoneSchema.nullable().optional(),
  primaryEmail: z.string().email().nullable().optional(),
  address: z.string().trim().optional(),
});

const interneExternalSchema = z.object({
  intent: z.literal('interne-external'),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  cirAgencyId: z.string().uuid(),                  // FK cir_agencies.id
  primaryPhone: phoneSchema.nullable().optional(),
  primaryEmail: z.string().email().nullable().optional(),
  notes: z.string().trim().optional(),
});

export const onboardingFormSchema = z.union([
  // Existants à préserver
  /* clientTermSchema, ... existants ... */,
  particulierSchema,
  prospectQuickSchema,
  fournisseurSchema,
  sollicitationSchema,
  interneExternalSchema,
]);
```

> Conserver `z.union()` (règle Zod du projet sur actions partagées — cf CLAUDE.md).

---

## 9. Conversions entre types

Une entité = un seul type à la fois (validation utilisateur). Les changements de type se font via des actions de **conversion** explicites, qui mutent `entity_type` et les colonnes associées (et créent une trace dans `audit_logs`).

| Conversion | Cas d'usage | Action backend |
|---|---|---|
| `Sollicitation` → `Prospect` | Le démarcheur s'avère être un prospect sérieux à recontacter | Garder `primary_phone`, vider `notes` legacy si besoin, set `entity_type='Prospect'` |
| `Sollicitation` → `Fournisseur` | Le démarcheur devient un fournisseur potentiel après vérification | Set `entity_type='Fournisseur'`, ouvrir le dialog d'enrichissement |
| `Prospect` → `Client` | Existant (`convert_to_client`). Continue à fonctionner. | Ouvre le wizard pour saisir `client_number`, `account_type`, etc. |
| `Particulier (Client cash)` ↔ `Client à terme` | Changement de mode de paiement | **Pas une conversion** : juste update `account_type` (même `entity_type='Client'`). Bouton dédié dans la fiche entité. |
| Autres conversions | Bloquées par défaut (pas de cas d'usage validé) | — |

### 9.1 Endpoint backend

Étendre `dataEntitiesMutations.ts` avec une fonction générique `convertEntityType(entityId, newEntityType, payload)` qui :
1. Vérifie la transition autorisée (matrice ci-dessus).
2. Update les colonnes en conséquence.
3. Trace dans `audit_logs` (action='update', metadata `{ from_type, to_type }`).

---

## 10. Directory : onglets par type

Le Directory (vue principale liste de référence) gagne un onglet par type pour exposer le référentiel complet :

| Onglet | Source | Filtre |
|---|---|---|
| Clients à terme | `entities` | `entity_type='Client' AND account_type='term'` |
| Particuliers | `entities` | `entity_type='Client' AND account_type='cash'` |
| Prospects | `entities` | `entity_type='Prospect'` |
| Fournisseurs | `entities` | `entity_type='Fournisseur'` |
| Sollicitations | `entities` | `entity_type='Sollicitation'` |
| Internes (CIR) | `search_entities` (vue UNION) | `entity_type='Interne (CIR)'`, sub-filtre member/externe |

> Les onglets respectent les permissions agence (RLS sur `agency_id`).

---

## 11. API tRPC

### 11.1 Nouveau endpoint `data.searchEntitiesUnified`

| Élément | Détail |
|---|---|
| Procedure | `authedProcedure.input(...).query(...)` |
| Service | `backend/functions/api/services/dataSearch.ts` *(nouveau)* |
| Routeur | `backend/functions/api/trpc/data.ts` (ajout) |
| Input | `{ agencyId: string, query: string, filters: { entityType: string, accountType?: 'term'\|'cash', clientKind?: 'company'\|'individual', includeArchived?: boolean }, limit?: number = 10 }` |
| Output | `SearchResult[]` (cf §7.6) |
| Source SQL | SELECT sur vue `public.search_entities` |
| Tri | match exact > préfixe > sous-chaîne, score combiné (cf §7.2) |
| Cross-type | retourne aussi les matches hors filtre, avec un flag `crossType: boolean` dans la réponse pour permettre au frontend d'afficher le hint |

### 11.2 Élargir `data.entities` action `save`

`shared/schemas/data.schema.ts:29-52` — élargir l'union `z.union()` (pas `discriminatedUnion`, règle Zod) :

- Ajouter `saveSollicitationEntitySchema`.
- Ajouter `saveInterneExternalEntitySchema`.
- Le Particulier tombe dans `saveClientEntitySchema` existant avec `account_type='cash'`.
- Renommer le legacy `saveSupplierEntitySchema` en `saveFournisseurEntitySchema` (+ nouvel attribut `supplier_code`).

### 11.3 Élargir `data.entities` action `list`

`shared/schemas/data.schema.ts:62` — étendre l'enum à `['Client', 'Prospect', 'Fournisseur', 'Sollicitation', 'Interne (CIR)']` + filtres optionnels `clientKind` / `accountType`.

`backend/functions/api/services/dataEntitiesList.ts:47-56` : adapter la WHERE clause.

### 11.4 Nouveau endpoint `data.cirAgencies.list`

Lecture publique (pour tous les users authentifiés) du référentiel `cir_agencies`. Alimente le Select du dialog Interne externe.

### 11.5 Nouveau endpoint `data.entities.convertType`

Pour les transitions §9 (Sollicitation → Prospect, etc.).

### 11.6 Endpoints à dépréciser

- `frontend/src/services/interactions/getKnownCompanies.ts` → migrer consommateurs vers `searchEntitiesUnified`, supprimer si plus utilisé.
- `useCockpitPhoneLookup.ts` (smart-detect inclus dans le champ unique).
- `useCockpitAgencyMembers` côté `CockpitInternalLookup` → remplacé par `searchEntitiesUnified` filtré Interne.

---

## 12. Migrations SQL (ordre d'application)

| # | Fichier | Contenu |
|---|---|---|
| 1 | `<ts>_cir_agencies_table.sql` | Création table `cir_agencies` + RLS + seed initial (à fournir) |
| 2 | `<ts>_entities_phone_email_columns.sql` | `ALTER TABLE entities ADD primary_phone, primary_email` + 2 indexes |
| 3 | `<ts>_entities_supplier_code.sql` | `ALTER TABLE entities ADD supplier_code` + index unique partiel `WHERE entity_type='Fournisseur'` |
| 4 | `<ts>_entities_cir_agency_id.sql` | `ALTER TABLE entities ADD cir_agency_id` (FK vers `cir_agencies`) + index |
| 5 | `<ts>_entity_contacts_is_primary.sql` | `ALTER TABLE entity_contacts ADD is_primary` + index unique partiel + backfill |
| 6 | `<ts>_entity_contacts_mirror_trigger.sql` | Function + trigger §5.4 |
| 7 | `<ts>_profiles_phone_column.sql` | `ALTER TABLE profiles ADD phone` |
| 8 | `<ts>_search_entities_view.sql` | Création vue §6 |
| 9 | `<ts>_entities_legacy_label_cleanup.sql` | Migration legacy §5.6 |

À chaque migration ajoutant des colonnes à des tables référencées par les types Supabase, **régénérer** :

```bash
supabase gen types typescript --project-id <id> --schema public > shared/supabase.types.ts
```

---

## 13. Fichiers à modifier

### 13.1 Schémas partagés
- `shared/schemas/data.schema.ts:29-52` — élargir union `save` (cf §11.2)
- `shared/schemas/data.schema.ts:62` — élargir enum `list` (cf §11.3)
- `shared/schemas/interaction.schema.ts` — vérifier que `entity_type` reste free-text
- `shared/schemas/cir-agency.schema.ts` *(nouveau)* — schéma Zod pour `cir_agencies`
- `shared/supabase.types.ts` — régénérer

### 13.2 Backend
- `backend/functions/api/services/dataEntitiesList.ts:47-56` — filtres entity_type + sub-filtres clientKind/accountType + includeArchived
- `backend/functions/api/services/dataEntitiesSave.ts:29-33` — accepter Sollicitation/Interne externe + `supplier_code` + `cir_agency_id`
- `backend/functions/api/services/dataEntitiesMutations.ts` — étendre avec `convertEntityType`
- `backend/functions/api/services/dataSearch.ts` *(nouveau)* — implémentation `searchEntitiesUnified`
- `backend/functions/api/services/dataCirAgencies.ts` *(nouveau)* — `listCirAgencies`
- `backend/functions/api/trpc/data.ts` (ou équivalent) — ajouter procedures `searchEntitiesUnified`, `cirAgencies.list`, `entities.convertType`
- Tests Deno : `dataEntitiesList_test.ts`, `dataEntitiesSave_test.ts`, `dataSearch_test.ts` *(nouveau)*, `dataCirAgencies_test.ts` *(nouveau)*, `dataEntitiesMutations_test.ts` (cas convertType)

### 13.3 Frontend — services
- `frontend/src/services/entities/searchUnified.ts` *(nouveau)* — wrapper tRPC + smart-detect client
- `frontend/src/services/cir-agencies/listCirAgencies.ts` *(nouveau)*
- `frontend/src/services/entities/convertEntityType.ts` *(nouveau)*

### 13.4 Frontend — entity onboarding
- `frontend/src/components/entity-onboarding/entityOnboarding.types.ts:11` — intents élargis (cf §8.1)
- `frontend/src/components/entity-onboarding/entityOnboarding.schema.ts:15-91` — nouveaux schémas Zod (cf §8.3)
- `frontend/src/components/entity-onboarding/useEntityOnboardingFlow.ts` — branche « Quick » pour intents minimaux (sollicitation, particulier, prospect quick, fournisseur, interne-external)
- `frontend/src/components/entity-onboarding/EntityOnboardingQuickStep.tsx` *(nouveau)* — composant générique mono-écran configurable par intent (champs + validation)
- `frontend/src/components/entity-onboarding/EntityOnboardingIntentStep.tsx` — afficher les 6 intents

### 13.5 Frontend — cockpit guidé
- `frontend/src/components/cockpit/guided/CockpitGuidedRelationQuestion.tsx:22-29` — passer de 5 à **6 boutons** (Client à terme, Particulier, Prospect, Fournisseur, Sollicitation, Interne CIR) + bouton Tout
- `frontend/src/components/cockpit/guided/CockpitGuidedSearchQuestion.tsx:24-58` — routage tous modes vers `searchUnified`
- `frontend/src/components/cockpit/guided/CockpitInternalLookup.tsx` — refactor → `searchUnified` filtré Interne (CIR), bouton « Créer interne externe » qui ouvre EntityOnboardingDialog intent=`interne-external`
- `frontend/src/components/cockpit/guided/CockpitSolicitationLookup.tsx` — refactor → `searchUnified` filtré Sollicitation + bouton « Créer Sollicitation » (intent=`sollicitation`)
- `frontend/src/components/cockpit/guided/CockpitGuidedFlow.ts` — pas de changement (le wizard reste 6 étapes)

### 13.6 Frontend — constantes
- `frontend/src/constants/relations.ts:4-35` — refondre `RelationMode` :
  ```ts
  type RelationMode =
    | 'client-term'
    | 'client-cash'      // Particulier
    | 'prospect'
    | 'fournisseur'
    | 'sollicitation'
    | 'internal'
    | 'all';             // Tout
  ```
- Ajouter helpers : `getEntityFiltersFromMode(mode)` qui retourne `{ entityType, accountType?, clientKind? }`.

### 13.7 Frontend — Directory
- Ajouter un onglet par type (cf §10).
- Réutiliser le composant Directory existant avec un filtre `entityType`.

### 13.8 Tests Vitest
- `__tests__/searchUnified.test.ts`
- `__tests__/EntityOnboardingDialog.particulier.test.tsx`
- `__tests__/EntityOnboardingDialog.sollicitation.test.tsx`
- `__tests__/EntityOnboardingDialog.fournisseur.test.tsx`
- `__tests__/EntityOnboardingDialog.interneExternal.test.tsx`
- `__tests__/EntityOnboardingDialog.prospectQuick.test.tsx`
- `__tests__/CockpitGuidedRelationQuestion.6buttons.test.tsx`

---

## 14. Vérification end-to-end

1. **Migrations** : appliquer dans l'ordre §12 en local.
   - Vérifier `\d+ entities` (nouvelles colonnes).
   - Vérifier `\d+ entity_contacts` (`is_primary`).
   - Vérifier `\d+ profiles` (`phone`).
   - Vérifier `\d+ cir_agencies`.
   - Vérifier `\d+ search_entities` (vue).
2. **Backend** : `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` — tous verts.
3. **Frontend** : depuis `frontend/` → `pnpm run typecheck && pnpm run lint && pnpm run test`.
4. **Parcours manuel** sur `http://localhost:3000/cockpit` (via Chrome MCP) :
   - **Client à terme** : taper un tel existant → match instantané + auto-remplissage.
   - **Particulier** : taper un nom → match si existant. Sinon → dialog quick (toggle individual/company + nom + numéro client + (tel OU email)) → save → entité bien créée comme `Client(account_type='cash')`.
   - **Prospect** : taper un nom inconnu → bouton « Créer » → dialog quick (nom seul) → save → vérifier `cir_commercial_id IS NULL`.
   - **Fournisseur** : taper un nom inconnu → bouton « Créer » → dialog quick (nom + tel/email) + section « Enrichir » avec siglet ROCK → save.
   - **Sollicitation** : taper un tel inconnu → bouton « Créer » → dialog mono-champ (tel pré-rempli) → save. Refaire l'opération avec le même tel → la Sollicitation existante remonte.
   - **Interne externe** : taper un nom inconnu → bouton « Créer interne externe » → dialog quick (prénom + nom + agence CIR depuis liste déroulante) → save.
   - **Interne member** : taper le nom d'un collègue dont `profiles.phone` rempli → match via vue.
   - **Cross-type** : choisir Client à terme, taper le nom d'un Particulier existant → résultat affiché avec hint.
   - **Conversion** : depuis la fiche d'une Sollicitation → bouton « Convertir en Prospect » → entity_type passe à 'Prospect', audit log créé.
5. **QA gate** : `pnpm run qa:fast` pendant l'implémentation, `pnpm run qa` avant livraison.

---

## 15. Points en suspens — à confirmer avant impl

### 15.1 Prospect : tel/email requis ou pas ?

**Contradiction détectée** dans la session de validation :
- Réponse libre du PO : « Au moins le nom, et après optionnel numéro de tel/mail, adresse etc... »
- Réponse à la question dédiée : « Oui, au moins un des deux (recommandé) »

→ Doc actuel : **seul `name` est requis**, le reste optionnel (version libre, plus permissive).

**À confirmer** : version libre OK, ou bien tel/email requis comme garde-fou de qualité ?

### 15.2 Seed initial de `cir_agencies`

La table de référence des agences CIR doit être peuplée. Sources possibles :
- Liste fournie par le PO (le plus simple).
- Import depuis un référentiel externe (ex: site CIR officiel).

**À fournir** : la liste des agences CIR (nom + région + ville).

### 15.3 Fonction `tg_sync_entity_primary_contact` — `SECURITY DEFINER` ?

Cf §5.4 : à passer en revue lors de l'audit RLS du repo (le projet a une politique stricte sur les fonctions DEFINER, dans le schéma `private` selon CLAUDE.md). Décision implémentation : peut-être placer la fonction dans `private.*` plutôt que `public.*`.

### 15.4 Suppression de `agency_entities` ?

Avec la liste des 6 boutons fixée côté UI, la table `agency_entities` (labels par agence) devient en partie redondante. Elle reste utile si une agence veut renommer un libellé (ex: « Particulier » → « Client comptant »). Garder ou supprimer ?

**Recommandation** : garder, mais aligner les labels avec les 6 types fixes lors de la migration de cleanup.

### 15.5 Permissions de modification de `cir_agencies`

Par défaut : `super_admin` uniquement. Mais le PO sera utilisateur unique pendant un certain temps. À confirmer.

### 15.6 Numéro fournisseur vs siglet

Pendant la session, le PO a mentionné « numéro fournisseur (code interne si il est créé) » ET « siglet interne 4 chars ROCK/SIEM ». **Hypothèse retenue** : c'est la même chose, stockée dans `supplier_code`.

**À confirmer** : un seul champ `supplier_code` 4 chars ? Ou deux champs distincts (`supplier_code` siglet + `supplier_number` numéro interne plus long) ?

---

## 16. Ce qui n'est PAS dans ce plan

- **Aucun changement visuel** : composants, styles, layout, animations restent inchangés.
- Pas de refonte du wizard guidé (`CockpitGuidedEntry.tsx`).
- Pas de changement sur les autres onglets (Suivi, Pilotage, Archives, Admin…).
- Pas de changement sur les hooks de drafts (`useInteractionDraft`).
- Pas de modification du système d'erreurs (`shared/errors/`).
- Pas d'ajout de table « personne universelle » au-dessus des entités (rejet de l'option multi-rôles).

Ces sujets sont identifiés comme prochaines étapes après stabilisation de la structure de données.

---

## Annexe A — Trace décisionnelle (Q&A)

> Toutes les décisions reportées dans le doc sont issues d'une session de questions/réponses entre le PO (Arnaud) et l'assistant le 2026-04-26. Trace complète ci-dessous.

### A.1 — Structure générale

| Question | Réponse |
|---|---|
| Sollicitation persistante ? | Oui, créer une entité. Au prochain appel du même tel, on retombe dessus. |
| Interne (CIR) modélisation ? | Vue UNION sur `profiles` (members). Création d'internes externes possible depuis Saisie. |
| Particulier modélisation ? | Pas un `entity_type` distinct. C'est un Client comptant (`account_type='cash'`) avec numéro de client. |
| Téléphone-first universel ? | **Non.** L'ordre reste Canal → Type → Recherche multi-critères. |
| Recherche multi-critères ? | Champ unique smart-detect (chiffres → tel/numéro client/siglet ; texte → nom/email). |
| Création inline ? | Pré-remplit le champ détecté + dialog minimal spécifique au type. |
| Périmètre visuel ? | Aucun redesign. Logique et structure uniquement. |

### A.2 — Cas par cas

#### A.2.1 Bouton Client (un ou deux ?)
**Réponse** : Deux boutons distincts (« Client à terme » + « Particulier (comptant) »).

#### A.2.2 Sollicitation
| Question | Réponse |
|---|---|
| Tel seul suffit-il ? | Oui. |
| Default si pas de nom ? | « Inconnu ». |
| Création sans tel (email pur) ? | Non, tel toujours requis. |
| Champ notes ? | Optionnel visible. |

#### A.2.3 Particulier
| Question | Réponse |
|---|---|
| `client_number` requis création ? | Oui. |
| `client_kind` default ? | `individual`, toggle accessible. |
| `postal_code` + `city` requis ? | Optionnels. |
| Tel OU email obligatoire ? | Oui. |

#### A.2.4 Prospect
| Question | Réponse |
|---|---|
| Statu quo (name+city) ? | « Au moins le nom, le reste optionnel. » (= name uniquement requis) |
| Tel ou email requis ? | « Oui au moins un des deux » → contradiction signalée §15.1 |
| `cir_commercial_id` requis ? | **Non** : « un Prospect n'a pas de commercial ». |

#### A.2.5 Fournisseur
| Question | Réponse |
|---|---|
| name + (tel OU email) suffisent ? | Oui, avec possibilité d'enrichir (adresse, contact complet, numéro fournisseur). |
| SIRET requis ? | Optionnel. |
| Catégorisation produit ? | **Pas demandé**. À la place : siglet interne 4 chars (ex: ROCK, SIEM, optionnel). |

#### A.2.6 Interne (CIR)
| Question | Réponse |
|---|---|
| Création depuis Saisie ? | **Oui** pour les internes externes (membres d'autres agences CIR pas encore users de la plateforme). « Si quelqu'un appelle, j'aimerai quand même le renseigner. » |
| Champs requis interne externe ? | Prénom + Nom + Agence CIR. |
| Agence CIR : champ libre ou liste ? | Liste déroulante (table de référence `cir_agencies`). |

#### A.2.7 Recherche
| Question | Réponse |
|---|---|
| Limite résultats ? | 10. |
| Archives affichées ? | Non par défaut + toggle. |
| Cross-type (résultat hors filtre) ? | Oui, avec hint discret. |
| Numérique : prio client_number ou phone ? | Score combiné par longueur/exactitude. |

#### A.2.8 Migration & cleanup
| Question | Réponse |
|---|---|
| Rows `'Prospect / Particulier'` → `'Prospect'` ? | Oui. |
| Cleanup `agency_entities` ? | Oui (cleanup complet, alignement avec les 6 boutons). |
| Interactions historiques remappées ? | Oui (cohérence des libellés). |

#### A.2.9 Phone des members CIR
**Réponse** : Ajouter `profiles.phone`, édité par l'utilisateur.

#### A.2.10 Directory
**Réponse** : Tous les types visibles, un onglet par type (Clients à terme, Particuliers, Prospects, Fournisseurs, Sollicitations, Internes).

#### A.2.11 Multi-rôles ?
**Réponse** : Une entité = un seul type à la fois. Conversions explicites via boutons dédiés.

### A.3 — Citations directes du PO

> « le numéro de téléphone non on dois pas le taper direct. Avant on choisis le canal, ensuite type de tiers et après on a une recherche multiple pour les clients ou quoi et on tape le numéro ou le nom du client ou le prénom etc... et ça cherche partout et nous propose des choses »

> « il y a les clients en compte a termes avec un numéro de client etc... et les clients comptant qui ont également un numéro de clients mais qui paie au comptant (particulier, société en paiement comptant, etc..) »

> « particulier est un client qui paie en cash. Et prospect c'est une personne qui n'a pas de compte ou numéro de client associé, même comptant »

> « Au moins le nom, et après optionnel numéro de tel/mail, adresse etc... » *(à propos de Prospect)*

> « Non un prospect n'a pas de commercial »

> « Oui avec possibilité d'enrichir, nom du fournisseur, ensuite le contact complet etc... adresse, numéro fournisseur (code interne si il est créé) tout ça optionnel bien sur »

> « Oui on doit pouvoir assigner le fournisseur a un ciglet interne exemple ROCKWELL donne : ROCK, SIEMENS donne SIEM etc... en 4 caractères et il peu y avoir des chiffres. (optionnel encore) »

> « On doit pouvoir créer en mettant l'agence et le nom et prénom, car la pour l'instant je vais être tout seul a l'utiliser et je vais pas créer d'autre agence sur le site, mais si quelqu'un appel j'aimerai quand même le renseigner » *(à propos de Interne CIR)*
