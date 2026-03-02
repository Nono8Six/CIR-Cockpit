# T2. Moteur de calcul SQL

[← Modele de donnees](./01-modele-donnees.md) | [Sommaire](../00-sommaire.md) | [Architecture API →](./03-architecture-api.md)

---

## T2.1 - Vue d'ensemble du moteur

Le moteur de tarification CIR v3.0 fonctionne en **deux etapes sequentielles** pour resoudre le prix de vente final d'un segment (reference ou categorie) pour un client donne.

### Etape 1 : Resolution du PA effectif (prix d'achat)

La fonction `resolve_effective_pa()` determine le prix d'achat reel en appliquant :

1. **Cascade des derogations fournisseur** : 7 niveaux de priorite (reference client → reference groupement → reference globale → cat_fab client → cat_fab groupement → cat_fab globale → standard).
2. **Application du BFA** (Bonus de Fin d'Annee) : reduction supplementaire sur le PA effectif, avec indicateur de fiabilite.

Le PA effectif est le socle de toutes les verifications de marge en aval.

### Etape 2 : Resolution du PV (prix de vente)

La fonction `resolve_client_price()` parcourt une cascade de **19 niveaux** de conditions tarifaires, du plus specifique (reference client) au plus generique (prix tarif). A chaque niveau, si une condition active est trouvee, le prix net correspondant est calcule et la cascade s'arrete.

Apres la cascade, deux controles supplementaires sont appliques :

- **Comparaison promo** : si un prix promotionnel existe et est plus favorable, il remplace le prix cascade **sauf si la source gagnante est un prix marche**.
- **Controle coef mini** : le seuil `PA_effectif x coef_mini` est verifie, avec alerte non bloquante en cas de violation.

> **Convention de lecture** : la spec metier parle de 19 niveaux. Le moteur detaille 21 positions techniques effectives dues a l'insertion dynamique de la marque globale.

### Schema de flux

```
Client + Segment
      │
      ├──► resolve_effective_pa()
      │         │
      │         ├── Cascade derogations fournisseur (7 niveaux)
      │         ├── Application BFA
      │         └── Retour: PA_standard, PA_effectif, PA_apres_bfa
      │
      ├──► resolve_cl_coefficient()          ← NOUVEAU
      │         │
      │         ├── Heritage sous-famille → famille → mega-famille
      │         └── Retour: coef_cl, source_level
      │
      └──► resolve_client_price()
                │
                ├── Appel interne a resolve_effective_pa()
                ├── Appel interne a resolve_cl_coefficient()  ← NOUVEAU
                ├── Cascade 19 niveaux conditions tarifaires
                ├── Comparaison prix promo (resolve_promo_price)
                ├── Controle coef_mini (alerte) (resolve_safety_net)
                └── Retour: PV final, marge tarif, marge CL, marge BFA, source
```

---

## T2.1b - Fonction resolve_cl_coefficient() (NOUVEAU)

Cette fonction resout le coefficient Centre Logistique pour un produit donne, en suivant l'heritage mega-famille → famille → sous-famille.

### Signature

```sql
CREATE OR REPLACE FUNCTION resolve_cl_coefficient(
  p_fsmega smallint,
  p_fsfam smallint,
  p_fssfa smallint
)
RETURNS TABLE (
  coef_cl decimal,
  source_level text   -- 'sous_famille', 'famille', 'mega_famille', 'defaut'
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_coef_cl      decimal;
  v_source_level text;
BEGIN
  -- ---------------------------------------------------------------
  -- Heritage : sous-famille → famille → mega-famille → defaut 1.0
  -- Le niveau le plus specifique l'emporte.
  -- ---------------------------------------------------------------

  -- Niveau 1 : Sous-famille specifique
  SELECT cc.coef_cl INTO v_coef_cl
    FROM cl_coefficients cc
   WHERE cc.fsmega = p_fsmega
     AND cc.fsfam = p_fsfam
     AND cc.fssfa = p_fssfa
     AND (cc.date_fin IS NULL OR cc.date_fin >= CURRENT_DATE)
   ORDER BY cc.date_debut DESC
   LIMIT 1;

  IF FOUND THEN
    v_source_level := 'sous_famille';
  ELSE
    -- Niveau 2 : Famille (fssfa = NULL)
    SELECT cc.coef_cl INTO v_coef_cl
      FROM cl_coefficients cc
     WHERE cc.fsmega = p_fsmega
       AND cc.fsfam = p_fsfam
       AND cc.fssfa IS NULL
       AND (cc.date_fin IS NULL OR cc.date_fin >= CURRENT_DATE)
     ORDER BY cc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_level := 'famille';
    ELSE
      -- Niveau 3 : Mega-famille (fsfam = NULL, fssfa = NULL)
      SELECT cc.coef_cl INTO v_coef_cl
        FROM cl_coefficients cc
       WHERE cc.fsmega = p_fsmega
         AND cc.fsfam IS NULL
         AND cc.fssfa IS NULL
         AND (cc.date_fin IS NULL OR cc.date_fin >= CURRENT_DATE)
       ORDER BY cc.date_debut DESC
       LIMIT 1;

      IF FOUND THEN
        v_source_level := 'mega_famille';
      ELSE
        -- Defaut : pas de surcout CL
        v_coef_cl := 1.0;
        v_source_level := 'defaut';
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_coef_cl, v_source_level;
END;
$$;
```

### Resume de l'heritage CL

| Niveau | Cle de recherche | Exemple |
|--------|-----------------|---------|
| 1 | Sous-famille (fsmega + fsfam + fssfa) | ROULEMENTS > STANDARDS > RIGIDES : coef 1.08 |
| 2 | Famille (fsmega + fsfam) | ROULEMENTS > STANDARDS : coef 1.06 |
| 3 | Mega-famille (fsmega seul) | ROULEMENTS : coef 1.06 |
| 4 | Defaut | Aucun coef pose → 1.0 (pas de surcout) |

### Formules de marge CL

```
PA_agence_CL = PA_effectif x coef_CL
Marge_CL = (PV - PA_agence_CL) / PV x 100
```

> **Note** : Le coef_mini utilise le PA_effectif (sans CL) pour la verification plancher. Le CL est un mecanisme interne qui ne doit pas bloquer les conditions commerciales.

> **Note** : Les frais de ligne CL (2.50€ par defaut) sont par commande et ne sont PAS integres au PA unitaire. Ils sont mentionnes a titre indicatif dans l'interface.

### Exemple de resolution CL

```
Produit : SKF 6205-2RSH (fsmega=1, fsfam=10, fssfa=10)

Coefficients poses :
  - Mega ROULEMENTS (fsmega=1, fsfam=NULL, fssfa=NULL) : coef 1.06
  - Sfam RIGIDES (fsmega=1, fsfam=10, fssfa=10) : coef 1.08

Resolution :
  Niveau 1 : sfam (1, 10, 10) → TROUVE coef 1.08
  → Resultat : coef_cl = 1.08, source = 'sous_famille'

PA effectif = 4.50€
PA agence CL = 4.50 x 1.08 = 4.86€
PV = 7.50€
Marge facture = (7.50 - 4.50) / 7.50 = 40.0%
Marge CL      = (7.50 - 4.86) / 7.50 = 35.2%
```

---

## T2.2 - Fonction resolve_effective_pa()

Cette fonction resout le prix d'achat effectif pour un couple (client, segment/reference).

### Signature

```sql
CREATE OR REPLACE FUNCTION resolve_effective_pa(
  p_client_id uuid,
  p_segment_id uuid,
  p_reference_id uuid DEFAULT NULL
)
RETURNS TABLE (
  pa_standard decimal,
  pa_effectif decimal,
  source_derog text,
  derog_id uuid,
  taux_bfa decimal,
  fiabilite_bfa text,
  pa_apres_bfa decimal,
  marge_tarif_base decimal,
  marge_tarif_bfa_base decimal
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_marque_id         uuid;
  v_cat_fab           text;
  v_prix_public       decimal;
  v_remise_fab_std    decimal;
  v_pa_standard       decimal;
  v_pa_effectif       decimal;
  v_source_derog      text     := 'standard';
  v_derog_id          uuid;
  v_groupement_id     uuid;
  -- Variables derogation
  v_derog_type        text;
  v_derog_valeur      decimal;
  -- Variables BFA
  v_taux_bfa          decimal  := 0;
  v_fiabilite_bfa     text     := 'incertain';
  v_pa_apres_bfa      decimal;
  -- Prix tarif pour calcul marge
  v_prix_tarif        decimal;
BEGIN
  -- ---------------------------------------------------------------
  -- 1. Recuperer les donnees segment (marque, cat_fab, prix public)
  -- ---------------------------------------------------------------
  SELECT s.marque_id, s.cat_fab, s.prix_public, s.remise_fab_standard, s.prix_tarif
    INTO v_marque_id, v_cat_fab, v_prix_public, v_remise_fab_std, v_prix_tarif
    FROM segments s
   WHERE s.id = p_segment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segment % introuvable', p_segment_id;
  END IF;

  -- ---------------------------------------------------------------
  -- 2. Calculer le PA standard (avant derogation)
  -- ---------------------------------------------------------------
  v_pa_standard := v_prix_public * (1 - COALESCE(v_remise_fab_std, 0) / 100);

  -- ---------------------------------------------------------------
  -- 3. Recuperer le groupement du client (si existant)
  -- ---------------------------------------------------------------
  SELECT c.groupement_id
    INTO v_groupement_id
    FROM clients c
   WHERE c.id = p_client_id;

  -- ---------------------------------------------------------------
  -- 4. Cascade des derogations fournisseur (7 niveaux)
  -- ---------------------------------------------------------------

  -- Niveau 1 : Derogation reference pour ce client
  IF p_reference_id IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'reference'
       AND sd.reference_id = p_reference_id
       AND sd.cible_type = 'client'
       AND sd.cible_id = p_client_id
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'reference_client';
    END IF;
  END IF;

  -- Niveau 2 : Derogation reference pour le groupement
  IF v_source_derog = 'standard' AND p_reference_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'reference'
       AND sd.reference_id = p_reference_id
       AND sd.cible_type = 'groupement'
       AND sd.cible_id = v_groupement_id
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'reference_groupement';
    END IF;
  END IF;

  -- Niveau 3 : Derogation reference globale (cible='tous')
  IF v_source_derog = 'standard' AND p_reference_id IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'reference'
       AND sd.reference_id = p_reference_id
       AND sd.cible_type = 'tous'
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'reference_globale';
    END IF;
  END IF;

  -- Niveau 4 : Derogation cat_fab pour ce client
  IF v_source_derog = 'standard' AND v_cat_fab IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'cat_fab'
       AND sd.cat_fab = v_cat_fab
       AND sd.cible_type = 'client'
       AND sd.cible_id = p_client_id
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'cat_fab_client';
    END IF;
  END IF;

  -- Niveau 5 : Derogation cat_fab pour le groupement
  IF v_source_derog = 'standard' AND v_cat_fab IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'cat_fab'
       AND sd.cat_fab = v_cat_fab
       AND sd.cible_type = 'groupement'
       AND sd.cible_id = v_groupement_id
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'cat_fab_groupement';
    END IF;
  END IF;

  -- Niveau 6 : Derogation cat_fab globale
  IF v_source_derog = 'standard' AND v_cat_fab IS NOT NULL THEN
    SELECT sd.id, sd.type_derog, sd.valeur
      INTO v_derog_id, v_derog_type, v_derog_valeur
      FROM supplier_derogations sd
     WHERE sd.marque_id = v_marque_id
       AND sd.level = 'cat_fab'
       AND sd.cat_fab = v_cat_fab
       AND sd.cible_type = 'tous'
       AND sd.statut = 'actif'
       AND (sd.date_fin IS NULL OR sd.date_fin >= CURRENT_DATE)
     ORDER BY sd.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_source_derog := 'cat_fab_globale';
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- 5. Calculer le PA effectif selon le type de derogation
  -- ---------------------------------------------------------------
  IF v_source_derog = 'standard' THEN
    -- Niveau 7 : Aucune derogation, PA standard
    v_pa_effectif := v_pa_standard;
    v_derog_id := NULL;
  ELSE
    CASE v_derog_type
      WHEN 'remise_supp_pct' THEN
        -- Remise supplementaire sur le PA standard
        v_pa_effectif := v_pa_standard * (1 - v_derog_valeur / 100);
      WHEN 'prix_net' THEN
        -- Prix net impose par le fournisseur
        v_pa_effectif := v_derog_valeur;
      WHEN 'remise_totale_pct' THEN
        -- Remise totale sur le prix public (remplace la remise fab)
        v_pa_effectif := v_prix_public * (1 - v_derog_valeur / 100);
      ELSE
        -- Type inconnu : fallback PA standard
        v_pa_effectif := v_pa_standard;
        v_source_derog := 'standard';
    END CASE;
  END IF;

  -- ---------------------------------------------------------------
  -- 6. Application du BFA (Bonus de Fin d'Annee)
  -- ---------------------------------------------------------------

  -- Recherche BFA specifique (marque + cat_fab)
  SELECT br.taux, br.fiabilite
    INTO v_taux_bfa, v_fiabilite_bfa
    FROM bfa_rates br
   WHERE br.marque_id = v_marque_id
     AND br.cat_fab = v_cat_fab
     AND br.annee = EXTRACT(YEAR FROM CURRENT_DATE)::int
     AND br.statut = 'actif'
   LIMIT 1;

  -- Si pas de BFA specifique, recherche BFA global marque
  IF NOT FOUND THEN
    SELECT br.taux, br.fiabilite
      INTO v_taux_bfa, v_fiabilite_bfa
      FROM bfa_rates br
     WHERE br.marque_id = v_marque_id
       AND br.cat_fab IS NULL
       AND br.annee = EXTRACT(YEAR FROM CURRENT_DATE)::int
       AND br.statut = 'actif'
     LIMIT 1;

    IF NOT FOUND THEN
      v_taux_bfa := 0;
      v_fiabilite_bfa := 'incertain';
    END IF;
  END IF;

  -- PA apres BFA
  v_pa_apres_bfa := v_pa_effectif * (1 - v_taux_bfa / 100);

  -- ---------------------------------------------------------------
  -- 7. Retour
  -- ---------------------------------------------------------------
  RETURN QUERY SELECT
    v_pa_standard,
    v_pa_effectif,
    v_source_derog,
    v_derog_id,
    v_taux_bfa,
    v_fiabilite_bfa,
    v_pa_apres_bfa,
    -- Marge tarif de base : ecart PA effectif vs prix tarif (indicateur de potentiel avant PV)
    CASE WHEN v_prix_tarif > 0
      THEN ((v_prix_tarif - v_pa_effectif) / v_prix_tarif * 100)
      ELSE 0
    END,
    -- Marge tarif BFA : ecart PA apres BFA vs prix tarif
    CASE WHEN v_prix_tarif > 0
      THEN ((v_prix_tarif - v_pa_apres_bfa) / v_prix_tarif * 100)
      ELSE 0
    END;
END;
$$;
```

### Resume de la cascade des derogations

| Niveau | Source | Cle de recherche |
|--------|--------|-----------------|
| 1 | Derogation reference client | marque + reference + client |
| 2 | Derogation reference groupement | marque + reference + groupement |
| 3 | Derogation reference globale | marque + reference + tous |
| 4 | Derogation cat_fab client | marque + cat_fab + client |
| 5 | Derogation cat_fab groupement | marque + cat_fab + groupement |
| 6 | Derogation cat_fab globale | marque + cat_fab + tous |
| 7 | Standard | prix_public x (1 - remise_fab_standard) |

---

## T2.3 - Fonction resolve_client_price()

Fonction principale du moteur v3.0. Elle parcourt 19 niveaux de conditions tarifaires pour determiner le prix de vente client.

### Signature

```sql
CREATE OR REPLACE FUNCTION resolve_client_price(
  p_client_id uuid,
  p_segment_id uuid,
  p_reference_id uuid DEFAULT NULL
)
RETURNS TABLE (
  hierarchy_level text,
  scope text,
  prix_net decimal,
  remise_pct decimal,
  marge_facture decimal,
  marge_bfa decimal,
  prix_tarif decimal,
  pa_standard decimal,
  pa_effectif decimal,
  pa_apres_bfa decimal,
  condition_id uuid,
  source_label text,
  marque_force text
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  -- Donnees segment
  v_segment         RECORD;
  v_groupement_id   uuid;
  -- PA resolu
  v_pa              RECORD;
  -- Resultat cascade
  v_found           boolean := false;
  v_prix_net        decimal;
  v_remise_pct      decimal;
  v_condition_id    uuid;
  v_hierarchy_level text;
  v_scope           text;
  v_source_label    text;
  v_marque_force    text;
  -- Condition de travail
  v_cond            RECORD;
  -- Promo
  v_promo           RECORD;
  -- Safety net
  v_safety          RECORD;
  -- Plancher
  v_prix_plancher   decimal;
  -- Marge calculee
  v_marge_facture   decimal;
  v_marge_bfa       decimal;
BEGIN
  -- ===============================================================
  -- A. Recuperer les donnees du segment
  -- ===============================================================
  SELECT s.id, s.marque_id, s.cat_fab, s.prix_public,
         s.remise_fab_standard, s.prix_tarif,
         s.sous_famille_id, s.famille_id, s.mega_famille_id
    INTO v_segment
    FROM segments s
   WHERE s.id = p_segment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segment % introuvable', p_segment_id;
  END IF;

  -- ===============================================================
  -- B. Recuperer le groupement du client
  -- ===============================================================
  SELECT c.groupement_id
    INTO v_groupement_id
    FROM clients c
   WHERE c.id = p_client_id;

  -- ===============================================================
  -- C. Resoudre le PA effectif
  -- ===============================================================
  SELECT * INTO v_pa
    FROM resolve_effective_pa(p_client_id, p_segment_id, p_reference_id);

  -- ===============================================================
  -- D. Cascade des 19 niveaux de conditions tarifaires
  -- ===============================================================
  -- Chaque niveau suit la meme logique :
  --   1. Chercher une condition active a ce niveau
  --   2. Si trouvee, calculer le prix net et sortir de la cascade
  --
  -- INSERTION MARQUE GLOBALE - 4 forces :
  --   - 'prioritaire' : positions 7-8  (apres marque/sous-fam, AVANT sous-famille seule)
  --   - 'forte'       : positions 11-12 (apres sous-famille, AVANT famille)
  --   - 'standard'    : positions 13-14 remplacees (apres famille, AVANT mega-famille)
  --   - 'securite'    : positions 15-16 remplacees (apres mega-famille, dernier filet)
  -- ===============================================================

  -- ----- Niveau 1 : Reference client (prix marche) -----
  IF NOT v_found AND p_reference_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'reference'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.reference_id = p_reference_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'reference';
      v_scope := 'client';
      v_source_label := 'Reference client (prix marche)';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 2 : Reference groupement (prix marche) -----
  IF NOT v_found AND p_reference_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'reference'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.reference_id = p_reference_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'reference';
      v_scope := 'groupement';
      v_source_label := 'Reference groupement (prix marche)';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 3 : Segment client -----
  IF NOT v_found THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'segment'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.segment_id = p_segment_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'segment';
      v_scope := 'client';
      v_source_label := 'Segment client';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 4 : Segment groupement -----
  IF NOT v_found AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'segment'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.segment_id = p_segment_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'segment';
      v_scope := 'groupement';
      v_source_label := 'Segment groupement';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 5 : Marque dans sous-famille client -----
  IF NOT v_found AND v_segment.sous_famille_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_sous_famille'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.sous_famille_id = v_segment.sous_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_sous_famille';
      v_scope := 'client';
      v_source_label := 'Marque dans sous-famille client';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 6 : Marque dans sous-famille groupement -----
  IF NOT v_found AND v_segment.sous_famille_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_sous_famille'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.sous_famille_id = v_segment.sous_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_sous_famille';
      v_scope := 'groupement';
      v_source_label := 'Marque dans sous-famille groupement';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 7 : Marque globale PRIORITAIRE client -----
  -- Force 'prioritaire' : s'insere ICI, avant les sous-familles seules.
  -- Cas d'usage : marque strategique qui doit toujours primer sur la sous-famille.
  IF NOT v_found THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'prioritaire'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'client';
      v_source_label := 'Marque globale PRIORITAIRE client';
      v_marque_force := 'prioritaire';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 8 : Marque globale PRIORITAIRE groupement -----
  IF NOT v_found AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'prioritaire'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'groupement';
      v_source_label := 'Marque globale PRIORITAIRE groupement';
      v_marque_force := 'prioritaire';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 9 : Sous-famille client -----
  IF NOT v_found AND v_segment.sous_famille_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'sous_famille'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.sous_famille_id = v_segment.sous_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'sous_famille';
      v_scope := 'client';
      v_source_label := 'Sous-famille client';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 10 : Sous-famille groupement -----
  IF NOT v_found AND v_segment.sous_famille_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'sous_famille'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.sous_famille_id = v_segment.sous_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'sous_famille';
      v_scope := 'groupement';
      v_source_label := 'Sous-famille groupement';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 11 : Marque globale FORTE client -----
  -- Force 'forte' : s'insere ICI, apres sous-famille, avant famille.
  -- Cas d'usage : marque importante qui prime sur la famille mais cede devant la sous-famille.
  IF NOT v_found THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'forte'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'client';
      v_source_label := 'Marque globale FORTE client';
      v_marque_force := 'forte';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 12 : Marque globale FORTE groupement -----
  IF NOT v_found AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'forte'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'groupement';
      v_source_label := 'Marque globale FORTE groupement';
      v_marque_force := 'forte';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 13 : Famille client -----
  IF NOT v_found AND v_segment.famille_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'famille'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.famille_id = v_segment.famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'famille';
      v_scope := 'client';
      v_source_label := 'Famille client';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 14 : Famille groupement -----
  IF NOT v_found AND v_segment.famille_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'famille'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.famille_id = v_segment.famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'famille';
      v_scope := 'groupement';
      v_source_label := 'Famille groupement';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 15 : Marque globale STANDARD client -----
  -- Force 'standard' : s'insere ICI, apres famille, avant mega-famille.
  -- Cas d'usage : condition marque par defaut, ecrasee par famille/sous-famille si existantes.
  IF NOT v_found THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'standard'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'client';
      v_source_label := 'Marque globale STANDARD client';
      v_marque_force := 'standard';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 16 : Marque globale STANDARD groupement -----
  IF NOT v_found AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'standard'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'groupement';
      v_source_label := 'Marque globale STANDARD groupement';
      v_marque_force := 'standard';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 17 : Mega-famille client -----
  IF NOT v_found AND v_segment.mega_famille_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'mega_famille'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.mega_famille_id = v_segment.mega_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'mega_famille';
      v_scope := 'client';
      v_source_label := 'Mega-famille client';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 18 : Mega-famille groupement -----
  IF NOT v_found AND v_segment.mega_famille_id IS NOT NULL AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'mega_famille'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.mega_famille_id = v_segment.mega_famille_id
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'mega_famille';
      v_scope := 'groupement';
      v_source_label := 'Mega-famille groupement';
      v_marque_force := NULL;
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 19 : Marque globale SECURITE client -----
  -- Force 'securite' : dernier filet avant les globaux.
  -- Cas d'usage : filet de securite marque, uniquement si rien d'autre n'a matche.
  IF NOT v_found THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'client'
       AND pc.client_id = p_client_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'securite'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'client';
      v_source_label := 'Marque globale SECURITE client';
      v_marque_force := 'securite';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ----- Niveau 20 (implicite) : Marque globale SECURITE groupement -----
  IF NOT v_found AND v_groupement_id IS NOT NULL THEN
    SELECT pc.id, pc.prix_net, pc.remise_pct, pc.marque_force
      INTO v_cond
      FROM pricing_conditions pc
     WHERE pc.hierarchy_level = 'marque_globale'
       AND pc.scope = 'groupement'
       AND pc.groupement_id = v_groupement_id
       AND pc.marque_id = v_segment.marque_id
       AND pc.marque_force = 'securite'
       AND pc.statut = 'actif'
       AND (pc.date_fin IS NULL OR pc.date_fin >= CURRENT_DATE)
     ORDER BY pc.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_found := true;
      v_condition_id := v_cond.id;
      v_hierarchy_level := 'marque_globale';
      v_scope := 'groupement';
      v_source_label := 'Marque globale SECURITE groupement';
      v_marque_force := 'securite';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_net := v_cond.valeur_prix_fixe;
        v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
          THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
      ELSE
        v_remise_pct := v_cond.valeur_remise_pct;
        v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ===============================================================
  -- E. Fallback : prix tarif (aucune condition trouvee)
  -- ===============================================================
  IF NOT v_found THEN
    v_prix_net := v_segment.prix_tarif;
    v_remise_pct := 0;
    v_condition_id := NULL;
    v_hierarchy_level := 'prix_tarif';
    v_scope := 'defaut';
    v_source_label := 'Prix tarif (aucune condition)';
    v_marque_force := NULL;
  END IF;

  -- ===============================================================
  -- F. Comparaison prix promo (hors prix marche)
  -- ===============================================================
  SELECT * INTO v_promo
    FROM resolve_promo_price(p_segment_id, p_reference_id, v_prix_net);

  -- Les niveaux 1-2 (reference client/groupement) sont des prix marche.
  -- Si le prix marche gagne deja la cascade, la promo ne s'applique pas.
  IF v_hierarchy_level <> 'reference'
     AND v_promo.has_promo
     AND v_promo.is_more_favorable THEN
    v_prix_net := v_promo.prix_promo;
    v_remise_pct := CASE WHEN v_segment.prix_tarif > 0
      THEN (1 - v_prix_net / v_segment.prix_tarif) * 100 ELSE 0 END;
    v_source_label := v_source_label || ' -> PROMO (' || v_promo.promo_source || ')';
  END IF;

  -- ===============================================================
  -- G. Controle coef_mini + remise_mini
  -- ===============================================================
  SELECT * INTO v_safety
    FROM resolve_safety_net(p_segment_id);

  -- Controle coef_mini : PV >= PA_effectif x coef_mini (alerte non bloquante)
  IF v_safety.coef_mini IS NOT NULL AND v_safety.coef_mini > 0 THEN
    v_prix_plancher := v_pa.pa_effectif * v_safety.coef_mini;
    IF v_prix_net < v_prix_plancher THEN
      -- Pas de correction automatique du PV : on trace une alerte metier.
      v_source_label := v_source_label || ' [ALERTE coef_mini=' || v_safety.coef_mini || ']';
    END IF;
  END IF;

  -- Plancher remise_mini : la remise ne peut pas depasser remise_mini
  IF v_safety.remise_mini IS NOT NULL AND v_remise_pct > v_safety.remise_mini THEN
    v_remise_pct := v_safety.remise_mini;
    v_prix_net := v_segment.prix_tarif * (1 - v_remise_pct / 100);
    v_source_label := v_source_label || ' [PLANCHER remise_mini=' || v_safety.remise_mini || '%]';
  END IF;

  -- ===============================================================
  -- H. Calcul des marges finales
  -- ===============================================================
  -- Marge facturee = (PV - PA_effectif) / PV x 100
  v_marge_facture := CASE WHEN v_prix_net > 0
    THEN ((v_prix_net - v_pa.pa_effectif) / v_prix_net) * 100
    ELSE 0
  END;

  -- Marge BFA = (PV - PA_apres_bfa) / PV x 100
  v_marge_bfa := CASE WHEN v_prix_net > 0
    THEN ((v_prix_net - v_pa.pa_apres_bfa) / v_prix_net) * 100
    ELSE 0
  END;

  -- ===============================================================
  -- I. Retour
  -- ===============================================================
  RETURN QUERY SELECT
    v_hierarchy_level,
    v_scope,
    v_prix_net,
    v_remise_pct,
    v_marge_facture,
    v_marge_bfa,
    v_segment.prix_tarif,
    v_pa.pa_standard,
    v_pa.pa_effectif,
    v_pa.pa_apres_bfa,
    v_condition_id,
    v_source_label,
    v_marque_force;
END;
$$;
```

### Recapitulatif de la cascade avec positions marque globale

| Pos. | Niveau | Scope | Marque force |
|------|--------|-------|-------------|
| 1 | Reference | client | - |
| 2 | Reference | groupement | - |
| 3 | Segment | client | - |
| 4 | Segment | groupement | - |
| 5 | Marque dans sous-famille | client | - |
| 6 | Marque dans sous-famille | groupement | - |
| **7** | **Marque globale** | **client** | **prioritaire** |
| **8** | **Marque globale** | **groupement** | **prioritaire** |
| 9 | Sous-famille | client | - |
| 10 | Sous-famille | groupement | - |
| **11** | **Marque globale** | **client** | **forte** |
| **12** | **Marque globale** | **groupement** | **forte** |
| 13 | Famille | client | - |
| 14 | Famille | groupement | - |
| **15** | **Marque globale** | **client** | **standard** |
| **16** | **Marque globale** | **groupement** | **standard** |
| 17 | Mega-famille | client | - |
| 18 | Mega-famille | groupement | - |
| **19** | **Marque globale** | **client** | **securite** |
| **20** | **Marque globale** | **groupement** | **securite** |
| 21 | Prix tarif | defaut | - |

> **Note** : bien que la spec initiale parle de 19 niveaux, les 4 forces de marque globale x 2 scopes (client/groupement) produisent 8 points d'insertion dans la cascade, ce qui donne 21 positions effectives. Les niveaux 19-20 (securite) et 21 (prix tarif) sont des filets de securite rarement atteints en production.

---

## T2.4 - Formules de conversion

Toutes les formules utilisees dans le moteur de calcul. Elles sont centrales pour la coherence entre les differentes vues (grille, simulation, export).

### Formules de base

| Formule | Expression | Usage |
|---------|-----------|-------|
| **Marge %** | `(PV - PA) / PV x 100` | Marge commerciale classique (sur PV) |
| **PV depuis marge** | `PA / (1 - Marge% / 100)` | Reconstituer le PV a partir d'un objectif de marge |
| **Remise %** | `(1 - PV / Prix_Tarif) x 100` | Remise accordee par rapport au prix tarif |
| **PV depuis remise** | `Prix_Tarif x (1 - Remise% / 100)` | Reconstituer le PV a partir d'une remise |

### Conversions directes marge <-> remise

Pour convertir directement entre marge et remise sans passer par le PV intermediaire :

```
Remise% = 1 - (PA / Prix_Tarif) / (1 - Marge% / 100) x 100

Marge%  = 1 - PA / (Prix_Tarif x (1 - Remise% / 100)) x 100
```

Forme simplifiee :

```
Remise% = (1 - PA / (Prix_Tarif x (1 - Marge%/100))) x 100
Marge%  = ((Prix_Tarif x (1 - Remise%/100)) - PA) / (Prix_Tarif x (1 - Remise%/100)) x 100
```

### Marge facturee vs Marge BFA

| Type | Formule | Signification |
|------|---------|--------------|
| **Marge facturee** | `(PV - PA_effectif) / PV x 100` | Marge reellement realisee sur la facture |
| **Marge BFA** | `(PV - PA_apres_bfa) / PV x 100` | Marge apres prise en compte du BFA (marge reelle) |
| **Gain BFA** | `Marge_BFA - Marge_facturee` | Contribution du BFA a la marge |

### Application numerique

Soit : `Prix_Tarif = 100`, `PA_effectif = 60`, `BFA = 5%`

```
PA_apres_bfa  = 60 x (1 - 5/100) = 57.00
PV (remise 30%) = 100 x (1 - 30/100) = 70.00
Marge facturee  = (70 - 60) / 70 x 100 = 14.29%
Marge BFA       = (70 - 57) / 70 x 100 = 18.57%
Gain BFA        = 18.57 - 14.29 = 4.29 pts
```

### Contraintes de validite

- `PV > 0` (division par zero protegee dans toutes les fonctions)
- `Prix_Tarif > 0` (idem)
- `Marge% < 100` (sinon PA negatif, absurde)
- `Remise% < 100` (sinon PV = 0, absurde)
- `PA_effectif >= 0` (le PA ne peut pas etre negatif)

---

## T2.5 - Resolution des remise mini et coef mini en cascade

La remise mini et le coef mini sont des garde-fous qui evitent de vendre en dessous d'un seuil de rentabilite. Ils suivent leur propre cascade d'heritage dans la hierarchie produit.

### Principe de cascade

La resolution cherche la valeur la plus specifique, puis remonte :

1. **Segment** : valeur directe sur le segment
2. **Sous-famille** : si pas de valeur au segment, heritage de la sous-famille
3. **Famille** : si pas de valeur a la sous-famille, heritage de la famille
4. **Mega-famille** : dernier niveau, valeur par defaut la plus globale

Chaque valeur (remise_mini et coef_mini) est resolue **independamment**. Il est possible d'avoir une remise_mini au niveau famille et un coef_mini au niveau segment.

### Implementation

```sql
CREATE OR REPLACE FUNCTION resolve_safety_net(
  p_segment_id uuid
)
RETURNS TABLE (
  remise_mini decimal,
  remise_mini_level text,
  coef_mini decimal,
  coef_mini_level text
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_segment           RECORD;
  v_remise_mini       decimal;
  v_remise_mini_level text;
  v_coef_mini         decimal;
  v_coef_mini_level   text;
  v_val               decimal;
BEGIN
  -- Recuperer la hierarchie du segment
  SELECT s.id, s.sous_famille_id, s.famille_id, s.mega_famille_id,
         s.remise_mini AS seg_remise_mini,
         s.coef_mini AS seg_coef_mini
    INTO v_segment
    FROM segments s
   WHERE s.id = p_segment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segment % introuvable', p_segment_id;
  END IF;

  -- ---------------------------------------------------------------
  -- Resolution remise_mini
  -- ---------------------------------------------------------------

  -- Niveau 1 : Segment
  IF v_segment.seg_remise_mini IS NOT NULL THEN
    v_remise_mini := v_segment.seg_remise_mini;
    v_remise_mini_level := 'segment';
  END IF;

  -- Niveau 2 : Sous-famille
  IF v_remise_mini IS NULL AND v_segment.sous_famille_id IS NOT NULL THEN
    SELECT sf.remise_mini INTO v_val
      FROM sous_familles sf
     WHERE sf.id = v_segment.sous_famille_id;
    IF v_val IS NOT NULL THEN
      v_remise_mini := v_val;
      v_remise_mini_level := 'sous_famille';
    END IF;
  END IF;

  -- Niveau 3 : Famille
  IF v_remise_mini IS NULL AND v_segment.famille_id IS NOT NULL THEN
    SELECT f.remise_mini INTO v_val
      FROM familles f
     WHERE f.id = v_segment.famille_id;
    IF v_val IS NOT NULL THEN
      v_remise_mini := v_val;
      v_remise_mini_level := 'famille';
    END IF;
  END IF;

  -- Niveau 4 : Mega-famille
  IF v_remise_mini IS NULL AND v_segment.mega_famille_id IS NOT NULL THEN
    SELECT mf.remise_mini INTO v_val
      FROM mega_familles mf
     WHERE mf.id = v_segment.mega_famille_id;
    IF v_val IS NOT NULL THEN
      v_remise_mini := v_val;
      v_remise_mini_level := 'mega_famille';
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Resolution coef_mini
  -- ---------------------------------------------------------------

  -- Niveau 1 : Segment
  IF v_segment.seg_coef_mini IS NOT NULL THEN
    v_coef_mini := v_segment.seg_coef_mini;
    v_coef_mini_level := 'segment';
  END IF;

  -- Niveau 2 : Sous-famille
  IF v_coef_mini IS NULL AND v_segment.sous_famille_id IS NOT NULL THEN
    SELECT sf.coef_mini INTO v_val
      FROM sous_familles sf
     WHERE sf.id = v_segment.sous_famille_id;
    IF v_val IS NOT NULL THEN
      v_coef_mini := v_val;
      v_coef_mini_level := 'sous_famille';
    END IF;
  END IF;

  -- Niveau 3 : Famille
  IF v_coef_mini IS NULL AND v_segment.famille_id IS NOT NULL THEN
    SELECT f.coef_mini INTO v_val
      FROM familles f
     WHERE f.id = v_segment.famille_id;
    IF v_val IS NOT NULL THEN
      v_coef_mini := v_val;
      v_coef_mini_level := 'famille';
    END IF;
  END IF;

  -- Niveau 4 : Mega-famille
  IF v_coef_mini IS NULL AND v_segment.mega_famille_id IS NOT NULL THEN
    SELECT mf.coef_mini INTO v_val
      FROM mega_familles mf
     WHERE mf.id = v_segment.mega_famille_id;
    IF v_val IS NOT NULL THEN
      v_coef_mini := v_val;
      v_coef_mini_level := 'mega_famille';
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Retour
  -- ---------------------------------------------------------------
  RETURN QUERY SELECT
    v_remise_mini,
    v_remise_mini_level,
    v_coef_mini,
    v_coef_mini_level;
END;
$$;
```

### Comportement quand aucune valeur n'est trouvee

Si apres les 4 niveaux aucune valeur n'est definie :
- `remise_mini = NULL` : pas de plafond de remise (la remise cascade est appliquee telle quelle).
- `coef_mini = NULL` : pas de plancher de coefficient (le PV peut theoriquement descendre en dessous du PA).

En pratique, il est recommande de toujours definir un `coef_mini` au minimum au niveau mega-famille pour eviter les ventes a perte.

---

## T2.6 - Resolution du prix promo

Les promotions sont des conditions tarifaires temporaires qui peuvent surcharger le prix cascade si elles sont plus favorables pour le client.

### Niveaux de promotion

Les promotions peuvent exister a differents niveaux de la hierarchie produit :

| Niveau | Description | Type de valeur |
|--------|------------|---------------|
| Reference | Promo sur un produit specifique | Prix net |
| Segment | Promo sur un segment | Prix net ou remise % |
| Sous-famille | Promo sur toute une sous-famille | Remise % |
| Famille | Promo sur toute une famille | Remise % |
| Mega-famille | Promo sur toute une mega-famille | Remise % |

### Implementation

```sql
CREATE OR REPLACE FUNCTION resolve_promo_price(
  p_segment_id uuid,
  p_reference_id uuid DEFAULT NULL,
  p_prix_cascade decimal
)
RETURNS TABLE (
  has_promo boolean,
  prix_promo decimal,
  promo_source text,
  is_more_favorable boolean
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_segment         RECORD;
  v_has_promo       boolean := false;
  v_prix_promo      decimal;
  v_promo_source    text;
  v_cond            RECORD;
BEGIN
  -- Recuperer les donnees du segment
  SELECT s.id, s.prix_tarif, s.sous_famille_id, s.famille_id, s.mega_famille_id
    INTO v_segment
    FROM segments s
   WHERE s.id = p_segment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Segment % introuvable', p_segment_id;
  END IF;

  -- ---------------------------------------------------------------
  -- Niveau 1 : Promo reference (produit specifique)
  -- ---------------------------------------------------------------
  IF p_reference_id IS NOT NULL THEN
    SELECT pp.id, pp.valeur_prix_fixe, pp.valeur_remise_pct
      INTO v_cond
     FROM pricing_conditions_global pp
     WHERE pp.type = 'PRIX_PROMO'
       AND pp.hierarchy_level = 'reference'
       AND pp.reference_id = p_reference_id
       AND pp.statut = 'actif'
       AND pp.date_debut <= CURRENT_DATE
       AND (pp.date_fin IS NULL OR pp.date_fin >= CURRENT_DATE)
     ORDER BY pp.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_has_promo := true;
      v_promo_source := 'reference';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_promo := v_cond.valeur_prix_fixe;
      ELSE
        v_prix_promo := v_segment.prix_tarif * (1 - v_cond.valeur_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Niveau 2 : Promo segment
  -- ---------------------------------------------------------------
  IF NOT v_has_promo THEN
    SELECT pp.id, pp.valeur_prix_fixe, pp.valeur_remise_pct
      INTO v_cond
     FROM pricing_conditions_global pp
     WHERE pp.type = 'PRIX_PROMO'
       AND pp.hierarchy_level = 'segment'
       AND pp.segment_id = p_segment_id
       AND pp.statut = 'actif'
       AND pp.date_debut <= CURRENT_DATE
       AND (pp.date_fin IS NULL OR pp.date_fin >= CURRENT_DATE)
     ORDER BY pp.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_has_promo := true;
      v_promo_source := 'segment';
      IF v_cond.valeur_prix_fixe IS NOT NULL THEN
        v_prix_promo := v_cond.valeur_prix_fixe;
      ELSE
        v_prix_promo := v_segment.prix_tarif * (1 - v_cond.valeur_remise_pct / 100);
      END IF;
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Niveau 3 : Promo sous-famille
  -- ---------------------------------------------------------------
  IF NOT v_has_promo AND v_segment.sous_famille_id IS NOT NULL THEN
    SELECT pp.id, pp.valeur_remise_pct
      INTO v_cond
     FROM pricing_conditions_global pp
     WHERE pp.type = 'PRIX_PROMO'
       AND pp.hierarchy_level = 'sous_famille'
       AND pp.sous_famille_id = v_segment.sous_famille_id
       AND pp.statut = 'actif'
       AND pp.date_debut <= CURRENT_DATE
       AND (pp.date_fin IS NULL OR pp.date_fin >= CURRENT_DATE)
     ORDER BY pp.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_has_promo := true;
      v_promo_source := 'sous_famille';
      v_prix_promo := v_segment.prix_tarif * (1 - v_cond.valeur_remise_pct / 100);
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Niveau 4 : Promo famille
  -- ---------------------------------------------------------------
  IF NOT v_has_promo AND v_segment.famille_id IS NOT NULL THEN
    SELECT pp.id, pp.valeur_remise_pct
      INTO v_cond
     FROM pricing_conditions_global pp
     WHERE pp.type = 'PRIX_PROMO'
       AND pp.hierarchy_level = 'famille'
       AND pp.famille_id = v_segment.famille_id
       AND pp.statut = 'actif'
       AND pp.date_debut <= CURRENT_DATE
       AND (pp.date_fin IS NULL OR pp.date_fin >= CURRENT_DATE)
     ORDER BY pp.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_has_promo := true;
      v_promo_source := 'famille';
      v_prix_promo := v_segment.prix_tarif * (1 - v_cond.valeur_remise_pct / 100);
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Niveau 5 : Promo mega-famille
  -- ---------------------------------------------------------------
  IF NOT v_has_promo AND v_segment.mega_famille_id IS NOT NULL THEN
    SELECT pp.id, pp.valeur_remise_pct
      INTO v_cond
     FROM pricing_conditions_global pp
     WHERE pp.type = 'PRIX_PROMO'
       AND pp.hierarchy_level = 'mega_famille'
       AND pp.mega_famille_id = v_segment.mega_famille_id
       AND pp.statut = 'actif'
       AND pp.date_debut <= CURRENT_DATE
       AND (pp.date_fin IS NULL OR pp.date_fin >= CURRENT_DATE)
     ORDER BY pp.date_debut DESC
     LIMIT 1;

    IF FOUND THEN
      v_has_promo := true;
      v_promo_source := 'mega_famille';
      v_prix_promo := v_segment.prix_tarif * (1 - v_cond.valeur_remise_pct / 100);
    END IF;
  END IF;

  -- ---------------------------------------------------------------
  -- Retour
  -- ---------------------------------------------------------------
  RETURN QUERY SELECT
    v_has_promo,
    v_prix_promo,
    v_promo_source,
    CASE WHEN v_has_promo AND v_prix_promo < p_prix_cascade
      THEN true ELSE false END;
END;
$$;
```

### Regle metier : plus favorable pour le client

La promo ne remplace le prix cascade **que si elle est strictement inferieure** et que la source gagnante n'est pas un prix marche (reference client/groupement). Si le prix cascade est deja plus bas, la promo est ignoree.

---

## T2.7 - Exemples de resolution complets

### Exemple 1 : Derogation fournisseur + BFA

**Contexte** : Client "Plomberie Martin" (groupement "GPE-IDF"), segment "Mitigeur Thermostatique GROHE XR-2000".

| Donnee | Valeur |
|--------|--------|
| Prix public | 250.00 EUR |
| Remise fab standard | 40% |
| Prix tarif | 150.00 EUR |
| Derogation fournisseur | remise_supp_pct 8% (cat_fab GROHE/Mitigeurs, cible=client) |
| BFA GROHE | 3.5% (fiabilite: confirme) |

**Etape 1 : resolve_effective_pa()**

```
PA_standard   = 250.00 x (1 - 40/100) = 150.00 EUR
                (Pas de derog reference → Derog cat_fab client trouvee, niveau 4)
PA_effectif   = 150.00 x (1 - 8/100) = 138.00 EUR
Source        = 'cat_fab_client'
PA_apres_bfa  = 138.00 x (1 - 3.5/100) = 133.17 EUR
Fiabilite BFA = 'confirme'
```

**Etape 2 : resolve_client_price()**

Cascade : pas de condition reference ni segment. Condition trouvee au **niveau 5 (marque dans sous-famille client)** avec remise 25%.

```
PV = 150.00 x (1 - 25/100) = 112.50 EUR

Marge facturee = (112.50 - 138.00) / 112.50 x 100 = -22.67%  ← ALERTE : marge negative !
```

Le controle `coef_mini = 1.10` (herite de la famille "Robinetterie") detecte une alerte :

```
Prix plancher = 138.00 x 1.10 = 151.80 EUR
PV final      = 112.50 EUR    (pas de correction automatique)
Remise finale = (1 - 112.50 / 150.00) x 100 = 25.00%

Marge facturee finale = (112.50 - 138.00) / 112.50 x 100 = -22.67%
Marge BFA finale      = (112.50 - 133.17) / 112.50 x 100 = -18.37%
Source = 'Marque dans sous-famille client [ALERTE coef_mini=1.10]'
```

### Exemple 2 : Marque globale avec impact de la force

**Contexte** : Client "Electricite Dupont", segment "Disjoncteur Schneider C60N 16A".

| Donnee | Valeur |
|--------|--------|
| Prix tarif | 45.00 EUR |
| PA effectif | 28.00 EUR |
| Condition sous-famille client "Disjoncteurs" | remise 20% |
| Marque globale Schneider (force='prioritaire') | remise 25% |
| Marque globale Schneider (force='standard') | remise 15% |

**Avec force='prioritaire'** (positions 7-8, AVANT sous-famille) :

```
Cascade : niveaux 1-6 → rien
Niveau 7 : Marque globale PRIORITAIRE client → remise 25%
PV = 45.00 x (1 - 25/100) = 33.75 EUR
La sous-famille client (remise 20%) n'est jamais atteinte.
Source = 'Marque globale PRIORITAIRE client'
```

**Si la force etait 'standard'** (positions 15-16, APRES famille) :

```
Cascade : niveaux 1-8 → rien
Niveau 9 : Sous-famille client → remise 20%
PV = 45.00 x (1 - 20/100) = 36.00 EUR
La marque globale STANDARD (remise 15%) n'est jamais atteinte car la sous-famille a matche avant.
Source = 'Sous-famille client'
```

**Si la force etait 'forte'** (positions 11-12, APRES sous-famille mais AVANT famille) :

```
Cascade : niveaux 1-8 → rien
Niveau 9 : Sous-famille client → remise 20%
PV = 45.00 x (1 - 20/100) = 36.00 EUR
La marque globale FORTE (remise 25%) n'est jamais atteinte non plus.
Source = 'Sous-famille client'
```

> La force determine **ou** la marque globale s'insere dans la cascade. Plus la force est haute, plus elle a de chances de prendre le pas sur les conditions hierarchiques.

### Exemple 3 : Comparaison promo

**Contexte** : Client "Chauffage Bernard", segment "Radiateur Atlantic F617 1000W".

| Donnee | Valeur |
|--------|--------|
| Prix tarif | 320.00 EUR |
| PA effectif | 180.00 EUR |
| Condition famille client "Radiateurs" | remise 18% |
| Promo segment "Radiateur Atlantic F617" | prix net 245.00 EUR, valide du 01/03 au 31/03 |
| coef_mini (mega-famille "Chauffage") | 1.15 |

**Etape cascade :**

```
Cascade : niveaux 1-12 → rien
Niveau 13 : Famille client "Radiateurs" → remise 18%
PV cascade = 320.00 x (1 - 18/100) = 262.40 EUR
```

**Comparaison promo :**

```
Prix promo segment = 245.00 EUR
245.00 < 262.40 → promo plus favorable
PV apres promo = 245.00 EUR
```

**Verification plancher :**

```
Prix plancher = 180.00 x 1.15 = 207.00 EUR
245.00 >= 207.00 → plancher respecte
PV final = 245.00 EUR
```

**Resultat final :**

```
PV            = 245.00 EUR
Remise        = (1 - 245/320) x 100 = 23.44%
Marge facturee = (245 - 180) / 245 x 100 = 26.53%
Source        = 'Famille client -> PROMO (segment)'
```

---

## T2.8 - Indexation et performance

### Index recommandes

#### Table `pricing_conditions`

```sql
-- Index principal pour la cascade : recherche par niveau + scope + client
CREATE INDEX idx_pc_cascade_client
  ON pricing_conditions (hierarchy_level, scope, client_id, statut)
  WHERE statut = 'actif';

-- Index pour les recherches groupement
CREATE INDEX idx_pc_cascade_groupement
  ON pricing_conditions (hierarchy_level, scope, groupement_id, statut)
  WHERE statut = 'actif';

-- Index pour les recherches par marque (marque globale et marque/sous-famille)
CREATE INDEX idx_pc_marque_force
  ON pricing_conditions (hierarchy_level, marque_id, marque_force, scope, statut)
  WHERE hierarchy_level = 'marque_globale' AND statut = 'actif';

-- Index pour les conditions segment
CREATE INDEX idx_pc_segment
  ON pricing_conditions (hierarchy_level, segment_id, client_id, statut)
  WHERE hierarchy_level = 'segment' AND statut = 'actif';

-- Index pour les conditions reference (prix marche)
CREATE INDEX idx_pc_reference
  ON pricing_conditions (hierarchy_level, reference_id, client_id, statut)
  WHERE hierarchy_level = 'reference' AND statut = 'actif';

-- Index pour la validite temporelle
CREATE INDEX idx_pc_dates
  ON pricing_conditions (date_fin, date_debut)
  WHERE statut = 'actif';
```

#### Table `supplier_derogations`

```sql
-- Index principal pour la cascade derogation
CREATE INDEX idx_sd_cascade
  ON supplier_derogations (marque_id, level, cible_type, cible_id, statut)
  WHERE statut = 'actif';

-- Index pour les derogations reference
CREATE INDEX idx_sd_reference
  ON supplier_derogations (marque_id, level, reference_id, cible_type, statut)
  WHERE level = 'reference' AND statut = 'actif';

-- Index pour les derogations cat_fab
CREATE INDEX idx_sd_cat_fab
  ON supplier_derogations (marque_id, level, cat_fab, cible_type, statut)
  WHERE level = 'cat_fab' AND statut = 'actif';
```

#### Table `bfa_rates`

```sql
-- Index pour la recherche BFA (marque + cat_fab + annee)
CREATE INDEX idx_bfa_lookup
  ON bfa_rates (marque_id, cat_fab, annee, statut)
  WHERE statut = 'actif';

-- Index pour le BFA global marque (sans cat_fab)
CREATE INDEX idx_bfa_global
  ON bfa_rates (marque_id, annee, statut)
  WHERE cat_fab IS NULL AND statut = 'actif';
```

#### Table `pricing_conditions_global`

```sql
-- Index pour les promos par niveau
CREATE INDEX idx_promo_reference
  ON pricing_conditions_global (hierarchy_level, reference_id, statut, date_debut, date_fin)
  WHERE type = 'PRIX_PROMO' AND hierarchy_level = 'reference' AND statut = 'actif';

CREATE INDEX idx_promo_segment
  ON pricing_conditions_global (hierarchy_level, segment_id, statut, date_debut, date_fin)
  WHERE type = 'PRIX_PROMO' AND hierarchy_level = 'segment' AND statut = 'actif';

CREATE INDEX idx_promo_hierarchie
  ON pricing_conditions_global (hierarchy_level, sous_famille_id, famille_id, mega_famille_id, statut)
  WHERE type = 'PRIX_PROMO' AND statut = 'actif';
```

#### Tables hierarchie produit (pour resolve_safety_net)

```sql
-- Acces rapide aux valeurs de garde-fou
CREATE INDEX idx_sfam_safety ON sous_familles (id) INCLUDE (remise_mini, coef_mini);
CREATE INDEX idx_fam_safety ON familles (id) INCLUDE (remise_mini, coef_mini);
CREATE INDEX idx_mega_safety ON mega_familles (id) INCLUDE (remise_mini, coef_mini);
```

### Objectifs de performance

| Fonction | Cible | Seuil d'alerte |
|----------|-------|----------------|
| `resolve_effective_pa()` | < 10 ms | > 25 ms |
| `resolve_client_price()` (1 segment) | < 50 ms | > 100 ms |
| `resolve_promo_price()` | < 5 ms | > 15 ms |
| `resolve_safety_net()` | < 3 ms | > 10 ms |
| **Batch 100 segments** | < 500 ms | > 1 s |
| **Batch 1000 segments** | < 5 s | > 10 s |

### Strategie EXPLAIN ANALYZE

Pour valider les performances, executer systematiquement les analyses suivantes :

```sql
-- Analyse resolve_client_price unitaire
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM resolve_client_price(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  '11111111-2222-3333-4444-555555555555'::uuid
);

-- Analyse batch (100 segments pour un client)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT s.id, rcp.*
  FROM segments s
 CROSS JOIN LATERAL resolve_client_price(
   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
   s.id
 ) rcp
 WHERE s.marque_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
 LIMIT 100;
```

### Points de vigilance

1. **Index partiels** : tous les index utilisent `WHERE statut = 'actif'` pour limiter la taille de l'index aux donnees pertinentes.
2. **LIMIT 1** : chaque requete dans la cascade utilise `LIMIT 1` pour arreter le scan des que la premiere condition est trouvee.
3. **Short-circuit** : le flag `v_found` evite d'executer les requetes des niveaux inferieurs une fois qu'une condition est trouvee.
4. **STABLE** : toutes les fonctions sont marquees `STABLE` (pas d'effets de bord), ce qui permet au planificateur de les optimiser dans les requetes batch.
5. **Pas de CTE recursif** : la cascade est imperativement procedurale (IF/THEN) pour garantir le short-circuit. Un CTE UNION ALL executerait tous les niveaux systematiquement.
6. **Monitoring** : en production, instrumenter les appels avec `pg_stat_user_functions` pour detecter les regressions de performance.

```sql
-- Activer le suivi des fonctions
ALTER SYSTEM SET track_functions = 'all';
SELECT pg_reload_conf();

-- Consulter les statistiques
SELECT funcname, calls, total_time, self_time, total_time / calls AS avg_time
  FROM pg_stat_user_functions
 WHERE funcname LIKE 'resolve_%'
 ORDER BY total_time DESC;
```
