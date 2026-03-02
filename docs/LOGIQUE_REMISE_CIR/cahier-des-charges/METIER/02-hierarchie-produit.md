# 2. Hierarchie produit

[← Contexte](./01-contexte-enjeux.md) | [Sommaire](../00-sommaire.md) | [Logique de tarification →](./03-logique-tarification.md)

---

## 2.1 - Classification CIR (3 niveaux)

La CIR normalise l'ensemble de son offre technique dans une arborescence a trois niveaux :

```
MEGA-FAMILLE (FSMEGA)          11 noeuds
  └── FAMILLE (FSFAM)          82 noeuds
        └── SOUS-FAMILLE (FSSFA)  473 noeuds
```

**Cle de classification** : `{FSMEGA}_{FSFAM}_{FSSFA}`

**Exemples concrets** :

| Cle | Mega-Famille | Famille | Sous-famille |
|-----|-------------|---------|--------------|
| `1_10_10` | ROULEMENTS | STANDARDS | RIGIDES A BILLES 6000 |
| `1_10_20` | ROULEMENTS | STANDARDS | ROTULE SUR ROULEAUX 22000 |
| `1_30_10` | ROULEMENTS | PALIERS | FONTE |
| `4_30_10` | PNEUMATIQUE | COMPOSANTS | VERINS CNOMO |
| `4_30_35` | PNEUMATIQUE | COMPOSANTS | DISTRIBUTEURS/ELECTRODISTRIBUTEURS |
| `3_10_10` | HYDRAULIQUE | CONNECTIQUE | TUYAUX TRESSES |
| `5_20_10` | TRANSMISSION | COURROIES | COURROIES TRAPEZOIDALES |
| `6_30_10` | AUTOMATISME | CAPTEURS ET CODEURS | CAPTEURS INDUCTIFS |

**Liste complete des 11 Mega-Familles** :

| FSMEGA | Libelle | % CA |
|--------|---------|------|
| 1 | ROULEMENTS | 18.7% |
| 2 | ETANCHEITE | 6.5% |
| 3 | HYDRAULIQUE | 8.8% |
| 4 | PNEUMATIQUE | 14.7% |
| 5 | TRANSMISSION | 23.0% |
| 6 | AUTOMATISME | 9.4% |
| 7 | MOTORISATION | 4.1% |
| 8 | AIR COMPRIME | 6.3% |
| 9 | FLUIDES PROCESS | 5.3% |
| 10 | PRODUITS DE MAINTENANCE | 3.2% |
| 99 | DIVERS | - |

## 2.2 - Segments tarifaires

Un **segment tarifaire** materialise le croisement entre :
- Une **marque** fournisseur (ex: SKF)
- Une **categorie fabricant** (CAT_FAB) propre a ce fournisseur (ex: Z16)

C'est l'unite atomique de tarification chez CIR. Il y en a **7 548**.

Chaque segment est **mappe** vers exactement une sous-famille CIR. Le mapping est 1:1 : un couple (marque, CAT_FAB) ne peut pointer que vers une seule sous-famille (contrainte UNIQUE marque + cat_fab confirmee).

**Exemple de mapping** :

| Segment ID | Marque | CAT_FAB | Libelle fabricant | → FSMEGA | FSFAM | FSSFA |
|-----------|--------|---------|-------------------|----------|-------|-------|
| 1001 | SKF | Z16 | Roulements rigides a billes | → 1 | 10 | 10 |
| 1002 | SKF | Z18 | Roulements a rouleaux coniques | → 1 | 10 | 30 |
| 1003 | TIMKEN | SET_BR | Bearing Sets | → 1 | 10 | 40 |
| 2001 | FESTO | VER_ISO | Verins ISO | → 4 | 30 | 15 |
| 2002 | SMC | ACT_CYL | Pneumatic Cylinders | → 4 | 30 | 15 |
| 3001 | PARKER | HYD_FLEX | Flexible hydrauliques | → 3 | 10 | 10 |

> **Note** : Plusieurs segments de fabricants differents peuvent pointer vers la meme sous-famille CIR. Par exemple, les verins ISO de FESTO (segment 2001) et de SMC (segment 2002) convergent tous deux vers `4_30_15`.

## 2.3 - Hierarchie complete des conditions tarifaires (v3.0)

Les conditions tarifaires peuvent etre posees a **7 niveaux de granularite**, du plus large au plus fin. Le niveau le plus specifique l'emporte toujours (heritage avec surcharge).

```
MEGA-FAMILLE (FSMEGA)              11 noeuds     ← le plus large
  └── FAMILLE (FSFAM)              82 noeuds
        └── SOUS-FAMILLE (FSSFA)   473 noeuds
              ├── MARQUE (dans sfam) ~200 marques ← condition par marque dans une sous-famille
              └── MARQUE GLOBALE     ~200 marques ← condition par marque sur TOUTES les sfam
                    └── SEGMENT     7 548 segments ← croisement marque x cat_fab
                          └── REFERENCE  ~500k+   ← le plus fin (prix marche)
```

### Niveaux de la hierarchie produit (du plus fin au plus large)

| Prio | Niveau | Granularite | Type de valeur |
|------|--------|-------------|---------------|
| **1** | Reference produit | 1 reference precise | Prix fixe EUR, remise % ou marge % (prix marche) |
| **2** | Segment | Marque x CAT_FAB | Remise % sur tarif |
| **3** | Marque dans sous-fam | Toutes les CAT_FAB d'une marque dans une sous-famille | Remise % sur tarif |
| **4** | Marque globale | Toutes les CAT_FAB d'une marque, toutes sous-familles | Remise % sur tarif (4 forces) |
| **5** | Sous-famille | Tous les segments d'une sous-famille CIR | Remise % sur tarif |
| **6** | Famille | Toutes les sous-familles d'une famille CIR | Remise % sur tarif |
| **7** | Mega-famille | Toutes les familles d'une mega-famille CIR | Remise % sur tarif |

### Portees commerciales (a chaque niveau de hierarchie)

| Portee | Description | Priorite |
|--------|-------------|----------|
| **Client** | Condition specifique a un client | Prioritaire |
| **Groupement** | Condition partagee par tous les clients du groupement | Secondaire |

> A chaque niveau de la hierarchie, le moteur cherche d'abord une condition **client**. S'il n'en trouve pas, il cherche une condition **groupement**. S'il n'en trouve pas non plus, il **remonte au niveau superieur**.

## 2.4 - La marque globale : un concept a 4 forces

La marque est une dimension **horizontale** qui traverse l'arbre vertical des produits CIR :

```
                ROULEMENTS (mega)
               /         \
          STANDARDS    PALIERS     ← hierarchie CIR (vertical)
         /    \          \
    RIGIDES  CONIQUES   FONTE
       |        |         |
      SKF     SKF       SKF       ← marque (horizontal, traverse tout l'arbre)
```

Quand on pose une condition sur une marque, deux options :
- **Marque dans une sous-famille** (ex: SKF dans RIGIDES A BILLES) → condition fine, s'applique uniquement aux segments SKF dans cette sous-famille
- **Marque globale** (ex: SKF partout) → condition large, s'applique a TOUS les segments SKF dans toutes les sous-familles

Pour la marque globale, l'utilisateur choisit la **force** de sa condition, qui determine sa position dans la cascade :

| Force | Position | Surchargee par | Surcharge | Cas d'usage |
|-------|----------|---------------|-----------|-------------|
| **Prioritaire** | Apres marque/sous-fam | Ref, Segment, Marque/sfam | Sfam, Fam, Mega | "Accord cadre SKF tres avantageux, prime partout" |
| **Forte** | Apres sous-famille | + Sous-famille | Fam, Mega | "Bon deal SKF, mais conditions sous-fam specifiques priment" |
| **Standard** (recommande) | Apres famille | + Famille | Mega seulement | "Deal SKF en complement de la politique produit" |
| **Securite** | Apres mega-famille | + Mega (tout la surcharge) | Rien | "Filet de securite si rien d'autre n'existe" |

**Gardes-fous** :
- Un TCS peut uniquement creer en mode "Standard" ou "Securite"
- Les modes "Forte" et "Prioritaire" sont reserves au ROI et a la Direction
- L'apercu cascade montre en temps reel l'impact de chaque choix de force
- Un badge colore identifie la force dans l'arbre des conditions

### Exemple de cascade par heritage (v3.0)

```
Client AIRBUS, mega-famille ROULEMENTS :

Niveau           │ Condition posee       │ Remise effective │ Explication
─────────────────┼───────────────────────┼──────────────────┼──────────────────────────
ROULEMENTS       │ -35% client           │ -35%             │ Condition directe
  STANDARDS      │ (aucune)              │ -35%             │ Herite de mega ROULEMENTS
    RIG. BILLES  │ (aucune)              │ -35%             │ Herite de mega ROULEMENTS
      SKF (sfam) │ -38% client           │ -38%             │ Surcharge : plus specifique
        SKF/Z16  │ -40% client           │ -40%             │ Surcharge : plus specifique
          6205   │ prix 7.80 EUR         │ 7.80 EUR fixe    │ Prix marche reference
        SKF/Z18  │ (aucune)              │ -38%             │ Herite de marque SKF/sfam
      TIMKEN     │ (aucune)              │ -35%             │ Herite de mega ROULEMENTS
        TIM/SET  │ -25% groupement       │ -25%             │ Grp Aeronautique (pas de cond client)
  PALIERS        │ (aucune)              │ -35%             │ Herite de mega ROULEMENTS

SKF globale      │ -33% standard         │ (non appliquee)  │ Ecrasee par les conditions plus fines
```

> **Regle fondamentale** : A chaque niveau, le systeme cherche d'abord une condition **client**. S'il n'en trouve pas, il cherche une condition **groupement**. S'il n'en trouve pas non plus, il remonte au niveau superieur. Ce mecanisme se repete jusqu'a trouver une condition ou atteindre les valeurs par defaut (remise mini, coef mini, prix tarif).

## 2.5 - Catalogue produit (references fabricant)

Chaque fabricant fournit un **fichier tarif** (Excel) contenant ses references produit. Ce fichier est la source de verite pour les prix publics et les conditions d'achat CIR.

**Donnees par reference produit** :

| Champ | Description | Exemple |
|-------|-------------|---------|
| Marque | Code fabricant | "SKF" |
| Reference | Reference unique fabricant | "6205-2RSH" |
| CAT_FAB | Categorie/famille de remise fabricant | "Z16" |
| Description | Designation du produit | "Rlt rigide a billes 25x52x15 2RS" |
| Prix public | Prix tarif public HT | 12.50 EUR |
| Remise fabricant | Remise d'achat negociee CIR | 64.0% |

**Prix d'achat calcule** : `PA = Prix Public x (1 - Remise Fabricant / 100)`

**Exemple** : SKF 6205-2RSH, prix public 12.50 EUR, remise fab 64% → PA = 4.50 EUR

### Remise fabricant : deux modes

Les fabricants gerent leurs remises d'achat de deux manieres :

**Mode 1 : Remise par famille (CAT_FAB)** - Toutes les references d'une meme categorie partagent la meme remise.
```
SKF CAT_FAB "Z16" : remise 64% → s'applique a toutes les references Z16
  - SKF 6205-2RSH : 12.50 EUR tarif → PA = 4.50 EUR
  - SKF 6206-2RSH : 15.80 EUR tarif → PA = 5.69 EUR
```

**Mode 2 : Remise par reference** - Chaque reference a sa propre remise d'achat.
```
TIMKEN (remises variables par reference) :
  - TIMKEN 32205 : 35.00 EUR tarif, remise 58% → PA = 14.70 EUR
  - TIMKEN 32206 : 42.00 EUR tarif, remise 55% → PA = 18.90 EUR
```

L'outil gere les deux modes de maniere transparente.

## 2.6 - Complexite des fichiers tarifs fabricant

Chaque fabricant fournit son fichier tarif dans **son propre format Excel**. Les formats sont heterogenes :

| Cas | Description | Gestion dans l'outil |
|-----|-------------|---------------------|
| **Cas 1** | Un fichier avec prix tarif et remises par ligne | Import standard (le plus riche) |
| **Cas 2** | Un fichier avec uniquement le prix tarif (pas de remises) | Mode "Tarif seul" : remises a saisir manuellement ou reprises du precedent import |
| **Cas 3** | Un fichier avec uniquement les remises par CAT_FAB | Mode "Remises seules" : a appliquer sur un tarif existant |
| **Cas 4** | Un fichier avec des prix net d'achat (PA direct) | Mode "PA direct" : pas de prix tarif public |
| **Cas 5** | Deux fichiers distincts (tarif + remises separement) | Import en 2 temps avec fusion sur la reference |

L'assistant d'import propose ces 4 modes au demarrage et adapte le mapping des colonnes en consequence.

### Historisation stricte des prix fabricant

Chaque import cree une version. L'historique complet est conserve :
- Table d'archive avec prix avant/apres, date de changement, id du fichier source
- Vue "evolution des prix" par reference
- Alerte a l'import : "147 references ont change de prix. Delta moyen : +3.2%. 12 references avec hausse > 10%"
- Suivi strict : date du fichier fournisseur (pas la date d'import), date de prochaine mise a jour attendue (optionnel), indicateur "tarif perime" si la derniere mise a jour a plus de X mois
