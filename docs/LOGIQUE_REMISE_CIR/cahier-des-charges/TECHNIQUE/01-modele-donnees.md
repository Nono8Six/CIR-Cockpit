# T1. Modele de donnees

[Sommaire](../00-sommaire.md)

---

## T1.1 - Diagramme des entites

```
                    ┌─────────────────────┐
                    │  pricing_families    │
                    │  (hierarchie CIR)   │
                    └─────────┬───────────┘
                              │ fsmega/fsfam/fssfa
                              │
┌──────────────────┐    ┌─────┴──────────────┐    ┌──────────────────────┐
│ supplier_products│───→│  pricing_segments   │←───│ pricing_conditions   │
│ (references fab) │    │  (7548 segments)    │    │ (toutes conditions)  │
└──────┬───────────┘    └────────────────────┘    └──────┬───────────────┘
       │                                                  │
       │                                                  │
┌──────┴──────────────┐                           ┌──────┴───────────────┐
│ supplier_pricelists │                           │ pricing_proposals    │
│ (fichiers importes) │                           │ (workflow validation)│
└─────────────────────┘                           └──────────────────────┘
       │
┌──────┴─────────────────┐     ┌───────────────────────┐
│ supplier_products_     │     │ supplier_derogations   │  ← NOUVEAU
│ history (historique)   │     │ (prix aides fournisseur)│
└────────────────────────┘     └───────────────────────┘

┌────────────────────┐     ┌───────────────────┐
│ bfa_rates          │     │ pricing_conditions │
│ (BFA fournisseur)  │     │ _global            │
└────────────────────┘     │ (promo, mini, coef)│
                           └───────────────────┘

┌────────────────────┐     ┌───────────────────┐
│ cl_coefficients    │     │ cl_config          │  ← NOUVEAU v3.1
│ (coef CL par       │     │ (frais ligne,      │
│  hierarchie)       │     │  frais port)       │
└────────────────────┘     └───────────────────┘
```

## T1.2 - Tables existantes (mises a jour)

### `pricing_families` - Hierarchie de classification CIR

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Identifiant unique |
| `fsmega` | smallint | NOT NULL | Code mega-famille (1-99) |
| `fsfam` | smallint | NOT NULL | Code famille (0-99) |
| `fssfa` | smallint | NOT NULL | Code sous-famille (0-99) |
| `libelle` | text | NOT NULL | Nom complet du noeud |
| `niveau` | text | NOT NULL, CHECK (mega, famille, sous_famille) | Niveau dans l'arbre |
| `created_at` | timestamptz | default now() | |

**Index** : `UNIQUE (fsmega, fsfam, fssfa)`

### `pricing_segments` - Referentiel des segments tarifaires

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | Code marque fournisseur |
| `cat_fab` | text | NOT NULL | Code categorie fabricant |
| `libelle_fab` | text | | Libelle categorie chez le fabricant |
| `fsmega` | smallint | NOT NULL, FK | Mapping mega-famille CIR |
| `fsfam` | smallint | NOT NULL, FK | Mapping famille CIR |
| `fssfa` | smallint | NOT NULL, FK | Mapping sous-famille CIR |
| `remise_standard_fab_pct` | decimal(5,2) | | Remise d'achat CIR par defaut |
| `coef_mini` | decimal(5,3) | default 1.000 | Coefficient minimum (plancher) |
| `remise_mini_pct` | decimal(5,2) | | Remise mini par defaut |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Index** : `UNIQUE (marque, cat_fab)` — confirme 2D (mapping 1:1)

### `supplier_pricelists` - Fichiers tarifs importes

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | Fabricant concerne |
| `nom_fichier` | text | NOT NULL | Nom du fichier original |
| `date_tarif` | date | | Date de validite du tarif fournisseur |
| `type_import` | text | NOT NULL, CHECK | 'tarif_complet', 'tarif_seul', 'remises_seules', 'pa_direct' |
| `nb_lignes_total` | integer | | Nombre total de lignes |
| `nb_lignes_importees` | integer | | Lignes importees avec succes |
| `nb_erreurs` | integer | default 0 | Lignes en erreur |
| `mapping_colonnes` | jsonb | | Mapping utilise |
| `rapport_erreurs` | jsonb | | Detail des lignes en erreur |
| `delta_summary` | jsonb | | Resume des deltas (hausse moy, nb references changees) |
| `importe_par` | uuid | FK users | |
| `statut` | text | CHECK (en_cours, termine, erreur) | |
| `created_at` | timestamptz | default now() | |

### `supplier_column_mappings` - Templates de mapping par fabricant

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | |
| `nom_template` | text | NOT NULL | |
| `mapping` | jsonb | NOT NULL | Configuration du mapping |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

### `supplier_products` - Catalogue de references fabricant

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | |
| `reference` | text | NOT NULL | Reference produit |
| `cat_fab` | text | NOT NULL | Categorie fabricant |
| `description` | text | | Designation produit |
| `description_famille` | text | | Description famille fabricant |
| `prix_public` | decimal(12,4) | NOT NULL | Prix tarif public HT |
| `remise_standard_fab_pct` | decimal(5,2) | | Remise par reference (si applicable) |
| `prix_achat_calcule` | decimal(12,4) | GENERATED | PA = prix_public * (1 - COALESCE(remise ref, remise segment) / 100) |
| `segment_id` | uuid | FK pricing_segments | Segment de rattachement |
| `pricelist_id` | uuid | FK supplier_pricelists | Fichier source |
| `actif` | boolean | default true | |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Index** :
- `UNIQUE (marque, reference)`
- `(segment_id)`
- `GIN (description gin_trgm_ops)` : recherche full-text
- `GIN (reference gin_trgm_ops)` : recherche fuzzy

**Volumetrie** : 500 000 a 2 000 000 lignes.

### `client_groups` - Groupements clients

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `code` | text | UNIQUE, NOT NULL | Code court |
| `libelle` | text | NOT NULL | Nom complet |
| `description` | text | | Description |
| `created_at` | timestamptz | default now() | |

### `pricing_conditions` - Conditions tarifaires (tous niveaux) - MISE A JOUR v3.0

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `hierarchy_level` | text | NOT NULL, CHECK enum | Niveau dans la hierarchie |
| `scope` | text | NOT NULL, CHECK (client, groupement) | Portee commerciale |
| `segment_id` | uuid | FK nullable | Si level = segment |
| `reference_id` | uuid | FK nullable | Si level = reference |
| `marque` | text | nullable | Si level = marque ou marque_globale |
| `fsmega` | smallint | nullable | |
| `fsfam` | smallint | nullable | |
| `fssfa` | smallint | nullable | |
| `client_id` | uuid | FK nullable | Si scope = client |
| `groupement_id` | uuid | FK nullable | Si scope = groupement |
| `valeur_remise_pct` | decimal(5,2) | nullable | Taux de remise |
| `valeur_prix_fixe` | decimal(12,4) | nullable | Prix fixe (prix marche) |
| `marque_force` | text | nullable | **NOUVEAU** : 'prioritaire', 'forte', 'standard', 'securite' (null si level != marque_globale) |
| `date_debut` | date | NOT NULL, default CURRENT_DATE | |
| `date_fin` | date | nullable | Null = permanente |
| `statut` | text | NOT NULL, default 'validee' | |
| `propose_par` | uuid | FK users, NOT NULL | |
| `valide_par` | uuid | FK users, nullable | |
| `date_validation` | timestamptz | nullable | |
| `source_copy_from` | uuid | FK pricing_conditions, nullable | **NOUVEAU** : si copie, reference la condition source |
| `commentaire` | text | nullable | |
| `agency_id` | uuid | FK agencies, NOT NULL | Pour RLS |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Enum `hierarchy_level`** (MISE A JOUR) :
```
reference        → prix marche par reference produit
segment          → remise par segment (marque x cat_fab)
marque           → remise par marque dans une sous-famille
marque_globale   → remise par marque sur TOUTES les sous-familles (NOUVEAU)
sous_famille     → remise par sous-famille CIR
famille          → remise par famille CIR
mega_famille     → remise par mega-famille CIR
```

**Enum `statut`** :
```
brouillon, en_attente, validee, refusee, archivee, expiree
```

**Index cles** :
- `(client_id, segment_id, hierarchy_level)` WHERE statut = 'validee'
- `(client_id, marque, fssfa, hierarchy_level)` WHERE statut = 'validee'
- `(client_id, marque, hierarchy_level)` WHERE statut = 'validee' AND hierarchy_level = 'marque_globale'
- `(client_id, fsmega, fsfam, fssfa, hierarchy_level)` WHERE statut = 'validee'
- `(client_id, fsmega, hierarchy_level)` WHERE statut = 'validee'
- Memes index pour `groupement_id`
- `(client_id, reference_id)` WHERE statut = 'validee' AND hierarchy_level = 'reference'
- `(agency_id)` : RLS

### `pricing_conditions_global` - Conditions globales (MISE A JOUR v3.0)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `type` | text | NOT NULL, CHECK (PRIX_PROMO, REMISE_MINI, COEF_MINI) | |
| `hierarchy_level` | text | NOT NULL | **NOUVEAU** : 'reference', 'segment', 'sous_famille', 'famille', 'mega_famille' |
| `segment_id` | uuid | FK nullable | Si hierarchy_level = segment |
| `reference_id` | uuid | FK nullable | **NOUVEAU** : si hierarchy_level = reference |
| `fsmega` | smallint | nullable | **NOUVEAU** : si hierarchy_level = mega/famille/sous_famille |
| `fsfam` | smallint | nullable | |
| `fssfa` | smallint | nullable | |
| `valeur_remise_pct` | decimal(5,2) | nullable | |
| `valeur_prix_fixe` | decimal(12,4) | nullable | |
| `valeur_coef` | decimal(5,3) | nullable | |
| `date_debut` | date | NOT NULL, default CURRENT_DATE | |
| `date_fin` | date | nullable | |
| `statut` | text | NOT NULL, default 'actif' | |
| `motif` | text | nullable | |
| `cree_par` | uuid | FK users, NOT NULL | |
| `agency_id` | uuid | FK agencies | Null = toutes agences |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Index** : `UNIQUE (type, hierarchy_level, segment_id, reference_id, fsmega, fsfam, fssfa)` WHERE statut = 'actif'

### `pricing_proposals` - Historique des propositions

(Inchange par rapport a v2.0, voir 04-modele-relationnel.md original)

### `client_consumption` - Consommation client par segment

(Enrichi en v3.0 avec donnees reelles au lieu de fictives)

## T1.3 - Nouvelles tables v3.0

### `supplier_derogations` - Derogations fournisseur (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | Fabricant |
| `portee` | text | NOT NULL, CHECK ('agence', 'nationale', 'globale') | Portee de la derogation |
| `cible` | text | NOT NULL, CHECK ('client', 'groupement', 'tous') | A qui s'applique |
| `client_id` | uuid | FK nullable | Si cible = client |
| `groupement_id` | uuid | FK nullable | Si cible = groupement |
| `level` | text | NOT NULL, CHECK ('reference', 'cat_fab', 'segment') | Niveau de la derogation |
| `reference` | text | nullable | Si level = reference |
| `cat_fab` | text | nullable | Si level = cat_fab ou segment |
| `segment_id` | uuid | FK nullable | Si level = segment |
| `type_valeur` | text | NOT NULL, CHECK ('prix_net', 'remise_pct', 'remise_supp_pct') | |
| `valeur` | decimal(12,4) | NOT NULL | |
| `date_debut` | date | NOT NULL | |
| `date_fin` | date | NOT NULL | **OBLIGATOIRE** (les offres fournisseurs ont toujours une fin) |
| `motif` | text | NOT NULL | Ex: "Offre prix FESTO Q1 2026" |
| `statut` | text | default 'actif', CHECK ('actif', 'expiree', 'archivee') | |
| `cree_par` | uuid | FK users | |
| `agency_id` | uuid | FK nullable | NOT NULL si portee = agence, NULL si nationale/globale |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

> **Note groupement trans-agences** : pour portee = agence + cible = groupement, la derogation ne couvre que les clients du groupement rattaches a cette agence. Pour couvrir tout le groupement toutes agences confondues, utiliser portee nationale/globale (creee par Direction uniquement).

**Index** :
- `(marque, client_id, level)` WHERE statut = 'actif'
- `(marque, groupement_id, level)` WHERE statut = 'actif'
- `(marque, cible, level)` WHERE statut = 'actif' AND cible = 'tous'
- `(agency_id)` : RLS
- `(date_fin)` : pour le job d'expiration

**Contraintes** :
- `CHECK (cible = 'client' AND client_id IS NOT NULL) OR (cible = 'groupement' AND groupement_id IS NOT NULL) OR (cible = 'tous' AND client_id IS NULL AND groupement_id IS NULL)`
- `CHECK (portee = 'agence' AND agency_id IS NOT NULL) OR (portee IN ('nationale', 'globale') AND agency_id IS NULL)`

### `bfa_rates` - Taux BFA par marque/CAT_FAB (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `marque` | text | NOT NULL | |
| `cat_fab` | text | nullable | Null = toute la marque, sinon specifique CAT_FAB |
| `taux_bfa_pct` | decimal(5,2) | NOT NULL | Taux effectif estime |
| `mode` | text | NOT NULL, CHECK ('fixe', 'palier_estime', 'variable') | Nature du BFA |
| `frequence` | text | NOT NULL, CHECK ('mensuel', 'trimestriel', 'annuel') | |
| `annee` | smallint | NOT NULL | |
| `fiabilite` | text | NOT NULL, CHECK ('confirme', 'estime', 'incertain') | |
| `note` | text | nullable | Description de la mecanique |
| `date_debut` | date | NOT NULL | |
| `date_fin` | date | NOT NULL | |
| `cree_par` | uuid | FK users | |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Contraintes temporelles (robustes en concurrence)** :
- `CHECK (date_fin >= date_debut)`
- Extension requise : `btree_gist`
- `EXCLUDE USING gist (marque WITH =, COALESCE(cat_fab, '*') WITH =, annee WITH =, daterange(date_debut, date_fin, '[]') WITH &&)`

**Index** :
- `(marque)` : lookup rapide

### `supplier_products_history` - Historique des prix fabricant (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK | |
| `reference_id` | uuid | FK supplier_products, NOT NULL | Reference concernee |
| `pricelist_id` | uuid | FK supplier_pricelists, NOT NULL | Import qui a cause le changement |
| `ancien_prix_public` | decimal(12,4) | | Prix public avant |
| `nouveau_prix_public` | decimal(12,4) | | Prix public apres |
| `ancienne_remise_fab` | decimal(5,2) | | Remise fab avant |
| `nouvelle_remise_fab` | decimal(5,2) | | Remise fab apres |
| `delta_prix_pct` | decimal(5,2) | GENERATED | Variation en % |
| `date_changement` | timestamptz | default now() | |

**Index** :
- `(reference_id, date_changement DESC)` : historique par reference
- `(pricelist_id)` : toutes les modifs d'un import

**Volumetrie estimee** : 1-5 M lignes (historique cumulatif).

### `cl_coefficients` - Coefficients Centre Logistique par hierarchie (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Identifiant unique |
| `fsmega` | smallint | NOT NULL | Code mega-famille |
| `fsfam` | smallint | nullable | Null = toute la mega-famille |
| `fssfa` | smallint | nullable | Null = toute la famille |
| `coef_cl` | decimal(6,4) | NOT NULL | Coefficient CL (ex: 1.0600) |
| `date_debut` | date | NOT NULL, default CURRENT_DATE | Date de debut de validite |
| `date_fin` | date | nullable | Null = permanent |
| `cree_par` | uuid | FK users, NOT NULL | Utilisateur ayant cree l'entree |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | |

**Contraintes temporelles (robustes en concurrence)** :
- `CHECK (date_fin IS NULL OR date_fin >= date_debut)`
- Extension requise : `btree_gist`
- `EXCLUDE USING gist (fsmega WITH =, COALESCE(fsfam, -1) WITH =, COALESCE(fssfa, -1) WITH =, daterange(date_debut, COALESCE(date_fin, 'infinity'::date), '[]') WITH &&)`

**Index** :
- `(fsmega)` : lookup rapide par mega-famille

**Heritage** : mega-famille → famille → sous-famille. Le niveau le plus specifique l'emporte. Si aucun coefficient n'est pose, le defaut est 1.0 (pas de surcout CL).

### `cl_config` - Configuration Centre Logistique (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Identifiant unique |
| `frais_ligne_cl` | decimal(8,2) | NOT NULL, DEFAULT 2.50 | Frais fixes par ligne de commande CL |
| `frais_port_inter_agence` | decimal(8,2) | NOT NULL, DEFAULT 12.00 | Frais de port pour approvisionnement inter-agence |
| `updated_at` | timestamptz | default now() | |
| `updated_by` | uuid | FK users | Dernier utilisateur ayant modifie |

**Note** : Table singleton (une seule ligne). Geree par super_admin uniquement.

### `pricing_global_config` - Configuration globale tarification (NOUVEAU)

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| `id` | uuid | PK, default gen_random_uuid() | Identifiant unique |
| `copy_min_marge_facture_pct` | decimal(5,2) | NOT NULL, DEFAULT 15.0 | Seuil global unique pour la strategie "prendre le meilleur" en copie |
| `updated_at` | timestamptz | default now() | |
| `updated_by` | uuid | FK users | Dernier utilisateur ayant modifie |

**Note** : Table singleton (une seule ligne). Source de verite pour les seuils globaux metier.

## T1.4 - Volumetrie globale

| Table | Lignes estimees | Croissance |
|-------|----------------|------------|
| pricing_families | ~570 | Stable |
| pricing_segments | ~7 548 | Lente |
| supplier_products | 500k - 2M | Par import tarif |
| supplier_products_history | 1-5M | Par import tarif |
| pricing_conditions | 10k - 100k | Par usage |
| pricing_conditions_global | ~500 | Lente |
| pricing_proposals | 10k - 200k/an | Par usage |
| supplier_derogations | 100 - 1 000 | Par negociation |
| bfa_rates | 50 - 200 | Annuel |
| cl_coefficients | 50 - 500 | Par gestion admin |
| cl_config | 1 | Singleton |
| pricing_global_config | 1 | Singleton |
| client_groups | 10 - 30 | Rare |
| client_consumption | 100k - 500k | Par import AS400 |
