# T5. Import / Export

[← RLS et securite](./04-rls-securite.md) | [Sommaire](../00-sommaire.md) | [Plan de livraison →](./06-plan-livraison.md)

---

## T5.1 - Import tarifs fabricant

### Quatre modes d'import

| Mode | Description | Colonnes attendues | Usage |
|------|-------------|-------------------|-------|
| Tarif complet | Prix public + remises | reference, description, cat_fab, prix_tarif, remise_achat | Cas le plus riche |
| Tarif seul | Prix public uniquement | reference, description, cat_fab, prix_tarif | Remises a saisir manuellement |
| Remises seules | Remises a appliquer sur tarif existant | reference OU cat_fab, remise_achat | Enrichissement d'un import precedent |
| PA direct | Prix net d'achat | reference, description, cat_fab, prix_net_achat | Quand le fournisseur donne le PA direct |

### Workflow d'import (5 etapes)

**Etape 1 - Upload + type**

- Upload du fichier (Excel ou CSV)
- Selection du mode d'import parmi les quatre ci-dessus
- Selection de la marque cible
- Validation du format : extension autorisee (.xlsx, .xls, .csv), taille max 10 Mo, 50 000 lignes max
- Parsing cote frontend via SheetJS (xlsx)

**Etape 2 - Mapping des colonnes**

- Auto-mapping IA (Mistral Small 3) propose un mapping colonnes fichier → schema attendu
- L'utilisateur corrige manuellement si necessaire
- Les templates de mapping sont sauvegardables par marque pour reutilisation

**Etape 3 - Preview et validation**

- Affichage des N premieres lignes avec indicateurs visuels :
  - Ligne valide : validation passee sans erreur
  - Warning : valeur acceptable mais inhabituelle (ex. remise > 60%, prix = 0)
  - Erreur : valeur manquante ou incoherente (ex. reference vide, prix negatif)
- Statistiques affichees : X lignes valides, Y warnings, Z erreurs
- L'utilisateur peut corriger les warnings inline avant de poursuivre

**Etape 4 - Analyse delta**

- Comparaison automatique avec le dernier import de la meme marque
- Metriques calculees :
  - Hausse/baisse moyenne des prix (en %)
  - Nombre de references nouvelles (absentes du precedent import)
  - Nombre de references disparues (presentes avant, absentes maintenant)
  - Impact estime sur les marges (simulation sur le CA des 12 derniers mois)
- Resume genere par IA (Mistral Small 3) : synthese en langage naturel des changements
- Cout estime de l'appel IA : ~0.0005 EUR par import

**Etape 5 - Execution batch (import en 2 phases)**

> **Probleme resolu** : l'import transactionnel de 50k lignes avec ecriture ligne par ligne
> dans `supplier_products_history` depuis une Edge Function provoquerait des timeouts
> (limite 60s Supabase). La solution ci-dessous traite tout en SQL pur, sans limite de temps.

**Phase A - Chargement (Edge Function, < 10s)**

1. L'Edge Function insere les lignes validees dans une table
   temporaire `import_staging` (UNLOGGED, pas de RLS)
2. Appelle la fonction SQL `process_import(pricelist_id)` en async
3. Retourne immediatement un statut `en_cours` au frontend

**Phase B - Traitement (Fonction SQL, pas de timeout)**

La fonction `process_import()` fait tout en SQL pur :

```sql
CREATE OR REPLACE FUNCTION process_import(p_pricelist_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- 1. Historisation batch (INSERT INTO ... SELECT ...)
  INSERT INTO supplier_products_history
    (supplier_product_id, pricelist_id, prix_avant, prix_apres,
     delta_pct, remise_avant, remise_apres, action)
  SELECT
    sp.id,
    p_pricelist_id,
    sp.prix_public,
    stg.prix_public,
    CASE WHEN sp.prix_public > 0
      THEN ((stg.prix_public - sp.prix_public) / sp.prix_public * 100)
      ELSE NULL END,
    sp.remise_standard_fab_pct,
    stg.remise_standard_fab_pct,
    CASE WHEN sp.id IS NULL THEN 'created' ELSE 'updated' END
  FROM import_staging stg
  LEFT JOIN supplier_products sp
    ON sp.marque = stg.marque AND sp.reference = stg.reference
  WHERE stg.pricelist_id = p_pricelist_id;

  -- 2. Upsert produits batch
  INSERT INTO supplier_products (marque, reference, cat_fab, description,
    prix_public, remise_standard_fab_pct, pricelist_id)
  SELECT marque, reference, cat_fab, description,
    prix_public, remise_standard_fab_pct, p_pricelist_id
  FROM import_staging
  WHERE pricelist_id = p_pricelist_id
  ON CONFLICT (marque, reference) DO UPDATE SET
    prix_public = EXCLUDED.prix_public,
    remise_standard_fab_pct = EXCLUDED.remise_standard_fab_pct,
    description = EXCLUDED.description,
    pricelist_id = EXCLUDED.pricelist_id,
    updated_at = NOW();

  -- 3. Cleanup
  DELETE FROM import_staging WHERE pricelist_id = p_pricelist_id;

  -- 4. Update statut
  UPDATE supplier_pricelists
  SET statut = 'termine',
      nb_lignes_importees = (
        SELECT COUNT(*) FROM supplier_products_history
        WHERE pricelist_id = p_pricelist_id
      )
  WHERE id = p_pricelist_id;
END;
$$;
```

**Phase C - Polling (Frontend)**

- Le frontend poll toutes les 3s via tRPC `import.status`
- Affiche une barre de progression basee sur le statut du `supplier_pricelists`
- Notification toast a la fin

**Avantages de cette architecture** :

- Zero timeout : le traitement SQL pur n'a pas de limite de temps Edge Function
- Performance : `INSERT INTO ... SELECT` est ~100x plus rapide que du ligne par ligne
- Transactionnel : la fonction SQL entiere est dans une transaction
- Le frontend reste reactif (pas de spinner bloque)

**Alternative consideree et rejetee** : pg_cron / background task (trop complexe pour un seul use case) et Edge Function background (pas encore stable dans Supabase)

Un recu d'import est genere avec le resume des actions effectuees

### Auto-mapping IA (IA-3)

Fonctionnement de l'appel Mistral Small 3 :

- **Input** :
  - Noms des colonnes du fichier uploade
  - Echantillon des 5 premieres lignes de donnees
  - Schema attendu (reference, description, cat_fab, prix, remise)
- **Output** : JSON structuré
  ```json
  {
    "mappings": [
      { "file_column": "Art. No.", "schema_field": "reference", "confidence": 95 },
      { "file_column": "Désignation", "schema_field": "description", "confidence": 90 },
      { "file_column": "Cat.", "schema_field": "cat_fab", "confidence": 85 },
      { "file_column": "PV HT", "schema_field": "prix_tarif", "confidence": 80 }
    ]
  }
  ```
- **Seuil de confiance** : en dessous de 70%, le champ est marque "a confirmer" et l'utilisateur doit mapper manuellement
- **Cout** : ~0.0002 EUR par import (un seul appel par fichier)

### Historisation stricte

Table `supplier_products_history` :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| supplier_product_id | uuid | FK vers supplier_products |
| pricelist_id | uuid | FK vers supplier_pricelists (import source) |
| prix_avant | numeric(10,4) | Prix avant modification |
| prix_apres | numeric(10,4) | Prix apres modification |
| delta_pct | numeric(6,2) | Variation en pourcentage |
| remise_avant | numeric(6,2) | Remise avant modification |
| remise_apres | numeric(6,2) | Remise apres modification |
| action | text | 'created', 'updated', 'deleted' |
| created_at | timestamptz | Date de l'enregistrement |

Fonctionnalites associees :

- Vue "evolution des prix" par reference (timeline graphique)
- Alerte a l'import : "147 references modifiees. Delta moyen : +3.2%. 12 references avec hausse > 10%"
- Filtrage par plage de dates, par marque, par amplitude de variation

### Template de mapping

Table `supplier_column_mappings` :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| agency_id | uuid | FK vers agencies (RLS) |
| marque | text | Marque associee |
| name | text | Nom du template |
| columns | jsonb | Configuration du mapping |
| created_by | uuid | Utilisateur createur |
| created_at | timestamptz | Date de creation |

Format du champ `columns` :

```json
{
  "columns": [
    { "source": "Art. No.", "target": "reference", "type": "text" },
    { "source": "Designation", "target": "description", "type": "text" },
    { "source": "Categorie", "target": "cat_fab", "type": "text" },
    { "source": "Prix Public", "target": "prix_tarif", "type": "numeric" },
    { "source": "Remise %", "target": "remise_achat", "type": "numeric" }
  ]
}
```

Comportement :

- Sauvegardable par marque avec un nom libre
- Reutilisable lors du prochain import de la meme marque
- Modifiable et supprimable par le createur ou un ROI+
- Propose automatiquement si un template existe pour la marque selectionnee

### Parsing Excel

- Librairie : SheetJS (xlsx), parsing cote frontend
- Formats supportes : .xlsx, .xls, .csv
- Taille maximale : 10 Mo
- Nombre maximum de lignes : 50 000
- Encodage CSV : UTF-8 avec detection automatique du separateur (, ou ;)
- Gestion des feuilles multiples : selection de la feuille a importer si le fichier en contient plusieurs

---

## T5.2 - Import prix marche par reference

### Workflow (3 etapes)

**Etape 1 - Upload**

- Fichier Excel avec colonnes : reference, prix_net OU remise_pct, description (optionnel)
- Selection de la marque cible
- Memes contraintes de format que l'import tarifs (10 Mo, 50 000 lignes)

**Etape 2 - Verification**

Chaque ligne est verifiee contre la table `supplier_products` :

- **Correspondance exacte** : la reference est trouvee dans la marque. La ligne est validee.
- **Correspondance floue** : la reference n'est pas trouvee mais une reference similaire existe (distance de Levenshtein < 3). Suggestion affichee, l'utilisateur confirme ou rejette.
- **Non trouve** : aucune correspondance. La ligne est ignoree avec motif.

### Recherche floue

Deux strategies disponibles, selectionnees selon les extensions PostgreSQL installees.

**Option 1 - Levenshtein (fuzzystrmatch)** :

```sql
SELECT reference, description, marque,
       levenshtein(reference, p_search) AS distance
FROM supplier_products
WHERE marque = p_marque
  AND levenshtein(reference, p_search) <= 3
ORDER BY distance
LIMIT 5;
```

**Option 2 - Trigrammes (pg_trgm)** :

```sql
SELECT reference, description, marque,
       similarity(reference, p_search) AS sim
FROM supplier_products
WHERE marque = p_marque
  AND similarity(reference, p_search) > 0.3
ORDER BY sim DESC
LIMIT 5;
```

La strategie pg_trgm est preferee car elle beneficie d'un index GIN et performe mieux sur les volumes importants.

**Etape 3 - Confirmation**

- Les lignes valides + les lignes floues corrigees par l'utilisateur sont importees
- Les lignes non trouvees sont listees dans le rapport d'import
- Si le taux de lignes non trouvees depasse 5%, l'import est bloque (pas de forcage)
- L'import cree ou met a jour les entrees dans `market_prices`

### Alerte de coherence

Si un prix marche est MOINS favorable que la remise segment applicable :

```
⚠ Prix marche SKF 6205 : 8.50 EUR mais remise segment -40% donnerait 7.50 EUR
  Le client paierait PLUS cher avec le prix marche.
  Action recommandee : supprimer le prix marche ou ajuster la remise segment.
```

Cette alerte est affichee :
- A l'import (etape preview)
- Dans la fiche client (section conditions)
- Dans le tableau de bord alertes

### Comportement selon le role

| Role | Comportement a l'import |
|------|------------------------|
| TCS | L'import cree des propositions soumises a validation ROI |
| ROI+ | L'import s'applique directement avec trace d'audit |
| Admin agence | Meme comportement que ROI+ |

---

## T5.3 - Import derogations fournisseur

### Workflow

Assistant similaire pour l'import en masse de derogations fournisseur.

**Format attendu du fichier Excel** :

| Colonne | Type | Obligatoire | Description |
|---------|------|-------------|-------------|
| marque | text | Oui | Marque concernee |
| cat_fab | text | Conditionnel | Categorie fabricant (si derogation par categorie) |
| reference | text | Conditionnel | Reference produit (si derogation par reference) |
| type_valeur | text | Oui | 'prix_net', 'remise_pct' ou 'remise_supp_pct' |
| valeur | numeric | Oui | Valeur de la derogation |
| date_debut | date | Oui | Date de debut de validite |
| date_fin | date | Oui | Date de fin de validite |
| cible | text | Oui | 'client' ou 'groupement' |
| client_code | text | Conditionnel | Code client (si cible = client) |
| group_code | text | Conditionnel | Code groupement (si cible = groupement) |

### Validations appliquees

- `marque` doit exister dans `supplier_brands`
- `cat_fab` ou `reference` doit exister dans `supplier_products` (selon le niveau)
- `client_code` ou `group_code` doit correspondre a une entite existante
- `date_fin` est obligatoire (pas de derogation sans echeance)
- `date_fin` doit etre posterieure a `date_debut`
- `type_valeur` doit etre parmi les trois valeurs autorisees
- Verification de permission selon la portee de la derogation (cf. T4 - RLS)

### Gestion des conflits

Si une derogation importee entre en conflit avec une derogation existante sur la meme cible et le meme perimetre produit :

- Alerte affichee avec comparaison ancien/nouveau
- L'utilisateur choisit : remplacer, ignorer ou creer en parallele (chevauchement de dates)
- En cas de remplacement, l'ancienne derogation est archivee (pas supprimee)

---

## T5.4 - Export

### Export CSV des conditions

Export de toutes les conditions actives pour un client ou un groupement.

**Colonnes exportees** :

| Colonne | Description |
|---------|-------------|
| niveau | Niveau de la condition (mega_famille, famille, sous_famille, cat_fab, reference) |
| marque | Marque concernee |
| cat_fab | Categorie fabricant |
| sous_famille | Sous-famille CIR |
| famille | Famille CIR |
| mega_famille | Mega-famille CIR |
| remise | Remise appliquee (en %) |
| source | Origine de la condition (segment, client, derogation, prix marche) |
| date_debut | Date de debut de validite |
| date_fin | Date de fin de validite (vide si indefinie) |
| marge_facture | Marge sur facture calculee (en %) |
| marge_bfa | Marge BFA calculee (en %) |

**Filtres disponibles** (identiques a ceux de l'interface) :

- Par marque
- Par mega-famille / famille / sous-famille
- Par source de condition
- Par plage de marge (seuil min/max)
- Par statut de validite (actif, expire, a venir)

**Format** : CSV avec separateur point-virgule, encodage UTF-8 BOM (compatibilite Excel France).

### Export PDF recapitulatif

Document destine aux visites terrain des TCS.

**Contenu du PDF** :

1. **En-tete client** :
   - Raison sociale, code client, groupement d'appartenance
   - Chiffre d'affaires 12 derniers mois
   - Marge moyenne ponderee
   - Nombre de conditions actives

2. **Tableau des conditions par mega-famille** :
   - Une section par mega-famille avec sous-total
   - Colonnes : famille, sous-famille, remise, source, marge facture, marge BFA
   - Mise en forme conditionnelle : marge critique en rouge, marge cible en vert

3. **Top 10 segments par CA** :
   - Les 10 segments (cat_fab) les plus achetes par le client
   - CA, marge, remise appliquee, remise segment theorique, ecart

4. **Alertes** :
   - Conditions expirant dans les 30 prochains jours
   - Marges en dessous du seuil critique
   - Prix marche moins favorables que la remise segment

**Implementation** :

- Option 1 : generation cote serveur (Edge Function) avec template HTML → PDF via Puppeteer/Chromium
- Option 2 : generation cote client via react-pdf
- La decision sera prise en phase de developpement selon les contraintes de deploiement Supabase

---

## T5.5 - Transactions et rollback

### Principe transactionnel

Tous les imports sont executes dans une transaction PostgreSQL. En cas d'erreur, l'ensemble est annule.

```sql
BEGIN;

  -- Creation de l'entree pricelist (import)
  INSERT INTO supplier_pricelists (id, marque, filename, mode, row_count, agency_id, created_by)
  VALUES (gen_random_uuid(), p_marque, p_filename, p_mode, p_row_count, p_agency_id, p_user_id)
  RETURNING id INTO v_pricelist_id;

  -- Insertion des produits valides
  INSERT INTO supplier_products (reference, description, cat_fab, prix_tarif, remise_achat, marque, pricelist_id, agency_id)
  SELECT reference, description, cat_fab, prix_tarif, remise_achat, p_marque, v_pricelist_id, p_agency_id
  FROM temp_import
  WHERE valid = true;

  -- Historisation des deltas
  INSERT INTO supplier_products_history (supplier_product_id, pricelist_id, prix_avant, prix_apres, delta_pct, action)
  SELECT sp.id, v_pricelist_id, sp.prix_tarif, ti.prix_tarif,
         ROUND(((ti.prix_tarif - sp.prix_tarif) / NULLIF(sp.prix_tarif, 0)) * 100, 2),
         'updated'
  FROM temp_import ti
  JOIN supplier_products sp ON sp.reference = ti.reference AND sp.marque = p_marque
  WHERE ti.valid = true
    AND sp.prix_tarif IS DISTINCT FROM ti.prix_tarif;

  -- Si erreur systeme a n'importe quelle etape : ROLLBACK automatique

COMMIT;
```

### Gestion des erreurs de validation

- Les erreurs de validation sont collectees ligne par ligne (pas de throw)
- Seules les lignes reellement valides sont incluses dans la transaction
- Si le taux de lignes valides est inferieur au seuil configurable (defaut : 90%), un avertissement est affiche avant confirmation
- L'utilisateur confirme explicitement l'import partiel controle des seules lignes valides ou annule
- Si les lignes non trouvees depassent 5% du fichier, l'import est bloque (pas de forcage)

### Recu d'import

Apres chaque import, un recu est genere et stocke :

| Information | Exemple |
|-------------|---------|
| Date et heure | 2026-03-01 14:32:05 |
| Utilisateur | Jean Dupont (ROI) |
| Marque | SKF |
| Mode | Tarif complet |
| Fichier source | SKF_tarif_2026_Q1.xlsx |
| Lignes totales | 12 450 |
| Lignes importees | 12 380 |
| Lignes ignorees | 70 |
| References nouvelles | 245 |
| References mises a jour | 12 135 |
| References disparues | 89 |
| Delta prix moyen | +2.8% |
| Duree d'execution | 4.2 secondes |

Le recu est consultable depuis l'historique des imports et exportable en PDF.

---

## T5.6 - Synchronisation AS400 (Phase 3)

### Contexte

Le systeme AS400 est le referentiel historique des conditions commerciales et des donnees de consommation. La phase 3 prevoit une synchronisation bidirectionnelle entre CIR Cockpit et l'AS400.

### Flux de lecture (AS400 → CIR Cockpit)

**Donnees de consommation** :

- Source : extractions periodiques depuis l'AS400
- Destination : table `client_consumption` dans CIR Cockpit
- Frequence : quotidienne (batch de nuit) ou hebdomadaire selon le volume
- Contenu : CA par client, par segment (cat_fab), par periode
- Format : fichier plat (CSV) ou API REST (a definir avec l'equipe AS400)

**Conditions existantes** :

- Import initial des conditions actuellement gerees dans l'AS400
- Objectif : migration progressive des conditions vers CIR Cockpit
- Reconciliation avec les conditions deja saisies dans CIR Cockpit

### Flux d'ecriture (CIR Cockpit → AS400)

- Les conditions validees dans CIR Cockpit sont exportees vers l'AS400
- Seules les conditions au statut "validees" et "actives" sont synchronisees
- Format de sortie : fichier plat conforme au format d'import AS400 (a specifier)
- Frequence : a la demande ou batch quotidien

### Reconciliation

Processus de comparaison entre les deux systemes :

1. Extraction des conditions actives des deux cotes
2. Comparaison par cle (client + marque + niveau + perimetre)
3. Identification des ecarts :
   - Condition presente dans CIR Cockpit mais absente de l'AS400
   - Condition presente dans l'AS400 mais absente de CIR Cockpit
   - Condition presente des deux cotes mais avec des valeurs differentes
4. Rapport d'ecarts genere pour arbitrage manuel
5. Actions possibles : aligner sur CIR Cockpit, aligner sur AS400, ignorer l'ecart

### Prerequis techniques

- Definition du format d'echange avec l'equipe AS400 (fichier plat, API, middleware)
- Mise en place d'un espace de depot securise (SFTP ou equivalent)
- Definition des regles de priorite en cas de conflit (quel systeme fait autorite)
- Tests de reconciliation sur un echantillon avant activation en production

### Planning previsionnel

| Jalon | Contenu | Dependance |
|-------|---------|------------|
| Phase 3a | Import consommation AS400 (lecture seule) | Format d'echange defini |
| Phase 3b | Import conditions AS400 (migration initiale) | Reconciliation validee |
| Phase 3c | Export conditions vers AS400 (ecriture) | Validation metier du flux |
| Phase 3d | Synchronisation bidirectionnelle automatisee | Toutes les phases precedentes |

---

*Document technique v3.0 - Module Import/Export - CIR Cockpit*
