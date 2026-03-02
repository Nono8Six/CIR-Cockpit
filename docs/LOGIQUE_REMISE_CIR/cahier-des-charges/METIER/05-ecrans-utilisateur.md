# 5. Ecrans utilisateur

[← Roles et workflows](./04-roles-workflows.md) | [Sommaire](../00-sommaire.md) | [Prix, derogations et BFA →](./06-ecrans-prix-derogations.md)

---

## 5.1 - Navigation et structure

Le module Remises s'integre dans le CIR Cockpit via un nouvel onglet dans la navigation principale :

```
CIR Cockpit
├── Dashboard (existant)
├── Clients (existant)
├── Prospects (existant)
├── Interactions (existant)
├── Remises ← NOUVEAU
│   ├── Recherche client / groupement (page d'accueil)
│   ├── Fiche conditions client (/remises/client/:id)
│   ├── Fiche conditions groupement (/remises/groupement/:id)
│   ├── Validation (ROI+) (/remises/validation)
│   ├── Import tarifs (ROI+) (/remises/import)
│   └── Administration (Direction+) (/remises/admin)
│       ├── Conditions globales
│       └── Centre Logistique ← NOUVEAU
└── Parametres (existant)
```

## 5.2 - Page d'accueil : Recherche enrichie (`/remises`)

### Selecteur d'agence (Direction + Super Admin uniquement)

```
┌─────────────────────────────────────────────────────────────────┐
│ Agence: [Toulouse ▼]  ou [Toutes les agences]                  │
│ (Ce selecteur n'apparait PAS pour TCS/ROI - ils voient leur agence)
└─────────────────────────────────────────────────────────────────┘
```

### Recherche client / groupement

La page offre **deux modes de recherche** via un toggle :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REMISES                                                                    │
│                                                                             │
│  [● Client]  [○ Groupement]                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Rechercher un client (nom, code, SIRET, ville...)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Filtres additionnels :                                                     │
│    Departement: [31 - Haute-Garonne ▼]    Ville: [________________]        │
│    Commercial:  [Jean DUPONT ▼]            Groupement: [Aeronautique ▼]    │
│    Code client: [________________]         SIRET: [________________]       │
│                                                                             │
│  Resultats :                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  AIRBUS OPERATIONS SAS     │ CLI-4521 │ Aeronautique │ Toulouse │      │
│  │  AIRBUS DEFENCE & SPACE    │ CLI-4522 │ Aeronautique │ Toulouse │      │
│  │  AIR LIQUIDE FRANCE        │ CLI-3301 │ Industrie    │ Bordeaux │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Filtres** : Tous les filtres sont combinatoires (ET) avec la recherche texte. Le filtre "Commercial" est utile pour un ROI qui veut voir "tous les clients suivis par tel TCS".

**Mode Groupement** : Affiche la liste complete des groupements avec recherche. Chaque groupement montre : code, libelle, nombre de clients, nombre de conditions.

## 5.3 - Fiche Client (`/remises/client/:id`)

### En-tete

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Retour    [Rechercher un autre client : _______________▼]                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AIRBUS OPERATIONS SAS                                      Code: CLI-4521 │
│  Groupement: [Aeronautique →]  │ Agence: Toulouse │ CA N: 234 580 EUR     │
│  47 segments │ 23 conditions client │ Marge moy: 28.4%                     │
│  3 conditions expirent dans 30j ⏰                                          │
│                                                                             │
│  ┌─ 🤖 Apercu IA ──────────────────────────────────────────────────────┐  │
│  │ • Marge moy 28.4% — au-dessus de la moyenne agence (24.1%)          │  │
│  │ • 3 conditions expirent dans 30 jours                                │  │
│  │ • Ecart avec groupement Aero : +5pp en moyenne                       │  │
│  │ [Voir le detail]  [Demander a l'IA ✨]                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Conditions] [Prix marche (47)] [Derogations] [Consommation] [Historique]  │
│ [Propositions (2)]                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  (contenu de l'onglet actif)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Onglets** :

| Onglet | Contenu |
|--------|---------|
| **Conditions** | Arbre/tableau des conditions par hierarchie (principal) |
| **Prix marche** | Prix fixes par reference produit (badge = nombre) |
| **Derogations** | Derogations fournisseur actives pour ce client |
| **Consommation** | CA, volumes, marges par segment (multi-annee) |
| **Historique** | Journal chronologique des modifications |
| **Propositions** | Propositions en cours (badge = nombre) |

### Fiche Groupement (`/remises/groupement/:id`)

Meme structure que la fiche client. Differences :
- En-tete affiche le nombre de clients du groupement et le CA total
- Onglet supplementaire "Clients du groupement" avec lien vers chaque fiche client
- Les conditions editables sont de portee "groupement"

## 5.4 - Onglet Conditions : filtres

### Niveau 1 - Filtres rapides (chips toggleables)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Mega: [ROULEMENTS ×] [PNEUMATIQUE ×] [+3...]                                │
│ Marque: [SKF ×] [+...]                                                       │
│ Source: [● Tout] [Client] [Groupement] [Herite] [Sans condition]             │
│ Marge: [< 15% ⚠] [15-25%] [25-35%] [> 35%]                                 │
│ Validite: [Expire bientot ⏰] [Permanentes] [Avec date fin]                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Niveau 2 - Filtres avances (panneau depliable)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ▼ Filtres avances                                                            │
│ Famille:       [multi-select ▼]     Sous-famille:  [multi-select ▼]         │
│ CAT_FAB:       [multi-select ▼]     Segment:       [recherche ▼]            │
│ Remise:        [min __] a [max __]  CA annuel:     [min __] a [max __]      │
│ Avec condition: [Oui/Non/Tous]      Date modif:    [du __] au [__]          │
└───────────────────────────────────────────────────────────────────────────────┘
```

Tous les filtres sont combinatoires (ET entre categories, OU au sein d'une categorie). L'URL reflete les filtres actifs (partage de vue possible).

## 5.5 - Onglet Conditions : vue Arbre (defaut)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Vue: [● Arbre] [○ Tableau]  │  12 resultats  │  [☐ Tout selectionner]             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ Hierarchie                     │ Condition        │ Remise │ Marge │ Source    │     │
│────────────────────────────────┼──────────────────┼────────┼───────┼──────────┼─────│
│ ☐ ▼ ROULEMENTS                 │ 🟢 -35%          │ -35%   │ ~48%  │ Client   │ ✏️🗑 │
│ │                              │                  │        │       │          │     │
│ │ ☐ ▼ STANDARDS                │ ── ↑ mega ──     │ -35%   │ ~48%  │ Herite   │  +  │
│ │ │                            │                  │        │       │          │     │
│ │ │ ☐ ▼ RIGIDES A BILLES      │ ── ↑ mega ──     │ -35%   │ ~48%  │ Herite   │  +  │
│ │ │ │                          │                  │        │       │          │     │
│ │ │ │ ☐ ▼ SKF                  │ 🟢 -38%          │ -38%   │ ~44%  │ Client   │ ✏️🗑 │
│ │ │ │ │                        │  surcharge mega  │  exp.  │       │ 31/03    │     │
│ │ │ │ │                        │                  │        │       │          │     │
│ │ │ │ │ ☐  SKF / Z16          │ 🟢 -40%          │ -40%   │ 40.0% │ Client   │ ✏️🗑 │
│ │ │ │ │    Rigides a billes    │  surcharge mrq   │        │       │          │     │
│ │ │ │ │    📌 3 prix marche    │                  │        │       │          │     │
│ │ │ │ │                        │                  │        │       │          │     │
│ │ │ │ │ ☐  SKF / Z18          │ ── ↑ marque ──   │ -38%   │ 33.2% │ Herite   │  +  │
│ │ │ │                          │                  │        │       │          │     │
│ │ │ │ ☐ ▶ TIMKEN               │ 🔵 -25%          │ -25%   │ ~27%  │ Grp Aero │  +  │
│ │                              │                  │        │       │          │     │
│ ☐ ▶ PNEUMATIQUE               │ ── aucune ──     │ varies │ varies│          │  +  │
│                                │                  │        │       │          │     │
│ ☐ ▶ HYDRAULIQUE               │ 🔵 -20%          │ -20%   │ ~35%  │ Grp Aero │  +  │
│                                │                  │        │       │          │     │
│ ── SKF GLOBALE ────            │ 🟢 -33% std      │ -33%   │ ~45%  │ Client   │ ✏️🗑 │
│    (marque globale standard)   │  🟢 badge vert   │        │       │          │     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Legende des sources** :

| Affichage | Signification |
|-----------|---------------|
| 🟢 -35% Client | Condition posee directement pour ce client |
| 🔵 -25% Grp Aero | Condition heritee du groupement |
| ── ↑ mega ── Herite | Heritage d'un niveau parent |
| ── aucune ── | Aucune condition, tombe sur remise mini/coef |

**Indicateurs de date de validite** :
- `exp. 31/03` : la condition expire bientot (< 30 jours)
- Pas d'indicateur si la condition est permanente

**Actions selon le contexte** :

| Situation | Actions |
|-----------|---------|
| Condition client directe | ✏️ Modifier, 🗑 Supprimer |
| Condition groupement (lecture seule) | + Creer une condition client (surcharge) |
| Herite du parent | + Creer une condition specifique |
| Aucune condition | + Creer |

**Marques globales** : Les marques globales sont affichees dans une section separee en bas de l'arbre, avec un badge indiquant leur force (🔴 Prio, 🟠 Forte, 🟢 Standard, ⚪ Securite).

## 5.6 - Onglet Conditions : vue Tableau plat

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Vue: [○ Arbre] [● Tableau]   Filtres: Marque: SKF     8 resultats                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ☐ │ Segment        │ Sous-famille       │ Condition        │ Remise │ Marge │Source│
│───┼────────────────┼────────────────────┼──────────────────┼────────┼───────┼──────│
│ ☐ │ SKF / Z16      │ Rigides a billes   │ 🟢 -40% Client   │ -40%   │ 40.0% │Clnt │
│ ☐ │ SKF / Z18      │ Roul. coniques     │ ── ↑ marque ──   │ -38%   │ 33.2% │Mrq  │
│ ☐ │ SKF / Z22      │ Roul. a rotule     │ ── ↑ marque ──   │ -38%   │ 45.1% │Mrq  │
│ ☐ │ SKF / P_FTE    │ Paliers fonte      │ 🟢 -42% Client   │ -42%   │ 36.8% │Clnt │
│ ☐ │ SKF / P_INX    │ Paliers inox       │ ── ↑ mega ──     │ -35%   │ 51.2% │Mega │
│ ☐ │ SKF / LBR_STD  │ Roul. lineaires    │ 🔵 -25% Grp      │ -25%   │ 58.3% │Grp  │
│ ☐ │ SKF / JNT_RAD  │ Joints radiaux     │ ── aucune ──     │ -20%   │ 55.0% │Mini │
│ ☐ │ SKF / CRX_OSC  │ Roul. oscillants   │ ── aucune ──     │ -15%   │ 62.1% │Mini │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.7 - Codes couleur

### Couleurs de marge

| Seuil | Couleur | Signification |
|-------|---------|---------------|
| < 15% | Rouge | Marge critique |
| 15-25% | Orange | Marge faible |
| 25-35% | Jaune | Marge acceptable |
| > 35% | Vert | Marge saine |

### Couleurs de source (badges)

| Source | Couleur |
|--------|---------|
| 🟢 Client | Vert |
| 🔵 Groupement | Bleu |
| Gris clair | Heritage |
| Gris | Aucune condition |

### Badges de force marque globale

| Force | Badge |
|-------|-------|
| Prioritaire | 🔴 |
| Forte | 🟠 |
| Standard | 🟢 |
| Securite | ⚪ |

## 5.8 - Edition inline avec contexte enrichi

### Edition d'une condition existante (clic ✏️)

```
│ SKF / Z16          │ Editer la remise :                                     │
│ Rigides a billes   │                                                         │
│                    │ ┌─ CONTEXTE ACTUEL ──────────────────────────────┐     │
│                    │ │ Remise actuelle : -40% (source: Client direct)  │     │
│                    │ │ Marge actuelle  : 40.0%                         │     │
│                    │ │ Marge CL        : 36.4% 📦 (PA x coef 1.06)    │     │
│                    │ │ PV actuel       : 7.50€ (PA: 4.50€)            │     │
│                    │ │ Si derogation   : PA aide 3.80€ → marge 49.3%  │     │
│                    │ └────────────────────────────────────────────────┘     │
│                    │                                                         │
│                    │ Nouvelle remise : [-42-] %                              │
│                    │                                                         │
│                    │ ┌─ RESULTAT ─────────────────────────────────────┐     │
│                    │ │ Nouvelle marge  : 36.8%  (↓ -3.2pp)            │     │
│                    │ │ Nouveau PV      : 7.25€  (↓ -0.25€)           │     │
│                    │ │ Verdict         : 🔴 Remise PLUS favorable au  │     │
│                    │ │                    client (-2pp de marge perdue)│     │
│                    │ │ Plancher coef   : 4.95€  ✅ respecte           │     │
│                    │ └────────────────────────────────────────────────┘     │
│                    │                                                         │
│                    │ Date fin : [30/06/2026] ou [Permanente]                │
│                    │ Motif * : [________________________] [Proposer] [✗]    │
│                    │                                                         │
│                    │ 🤖 Suggestion: -38% (marge cible 42.4%)  [Appliquer]  │
```

**Elements cles de l'edition** :
- **Contexte actuel** : PA, PV, marge, source, derogation active
- **Resultat en temps reel** : marge, PV, delta, verdict
- **Verdict** : en un coup d'oeil, le TCS sait si sa modification est en faveur du client ou de CIR
- **Date de fin** : presets "3 mois", "6 mois", "1 an", "Permanente"
- **Suggestion IA** : si disponible, la suggestion contextuelle s'affiche

### Pose d'une condition marque globale

```
┌──────────────────────────────────────────────────────────────────┐
│ CONDITION MARQUE GLOBALE - SKF                                    │
│                                                                   │
│ Remise : [-35-] %                                                │
│                                                                   │
│ Force de la condition :                                           │
│ [○] Prioritaire    Surcharge sfam, fam, mega                     │
│ [○] Forte          Surcharge fam, mega                            │
│ [●] Standard       Surcharge mega seulement (recommande)         │
│ [○] Securite       Ne surcharge rien (filet de securite)          │
│                                                                   │
│ ─── Apercu cascade pour SKF 6205-2RSH ───                        │
│ Prio 1  Reference client       : (aucune)                        │
│ Prio 3  Segment SKF/Z16 client : -40%                            │
│ Prio 5  SKF dans Rigides client: -38%                            │
│ ★ NEW  Marque globale SKF     : -35% ← VOTRE CONDITION          │
│ Prio 9  Sous-fam Rigides client: (aucune)                        │
│ Prio 15 Mega Roulements client : -35%                            │
│                                                                   │
│ Resultat : -40% (segment gagne car plus specifique)              │
└──────────────────────────────────────────────────────────────────┘
```

## 5.9 - Selection multiple et actions en lot

### Barre d'actions sticky (apparait quand >= 1 ligne selectionnee)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  3 elements selectionnes                                                            │
│  [ Appliquer une remise... ] [ Supprimer les conditions ] [ Copier vers... ]        │
│  [ Exporter CSV ]                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Dialog "Appliquer en lot"

```
┌──────────────────────────────────────────────────────────────────┐
│ APPLIQUER EN LOT                                                  │
│                                                                   │
│ 3 segments selectionnes :                                         │
│  • SKF / Z18 - Roul. coniques                                    │
│  • SKF / Z22 - Roul. a rotule                                    │
│  • SKF / LBR_STD - Roul. lineaires                               │
│                                                                   │
│ Mode : [Remise % ●] [Marge % ○]                                  │
│ Remise : [____38____] %                                           │
│                                                                   │
│ Apercu :                                                          │
│ ┌──────────────────┬──────────────┬──────────────┬───────┐       │
│ │ Segment          │ Avant        │ Apres        │ Delta │       │
│ ├──────────────────┼──────────────┼──────────────┼───────┤       │
│ │ SKF / Z18        │ -35% ↑mega   │ -38%         │ +3pp  │       │
│ │ SKF / Z22        │ -35% ↑mega   │ -38%         │ +3pp  │       │
│ │ SKF / LBR_STD    │ -25% grp     │ -38%         │ +13pp │       │
│ └──────────────────┴──────────────┴──────────────┴───────┘       │
│                                                                   │
│ Marge moyenne resultante : ~41.2%                                 │
│ Date fin : [30/06/2026] ou [Permanente]                          │
│ Motif * : [______________________________________]               │
│                                                                   │
│ [ Annuler ]                         [ Proposer les 3 au ROI ]    │
└──────────────────────────────────────────────────────────────────┘
```

## 5.10 - Copie de conditions

Bouton "Copier les conditions depuis..." disponible sur la fiche client/groupement :

```
┌──────────────────────────────────────────────────────────────────┐
│ COPIER LES CONDITIONS                                             │
│                                                                   │
│ Source : [● Client] [○ Groupement]                               │
│ Depuis : [_________] 🔍  → SAFRAN NACELLES                      │
│                                                                   │
│ Apercu : 18 conditions a copier                                  │
│                                                                   │
│ │ Niveau         │ Condition source │ Condition actuelle │ Action │
│ │ Mega ROULEMENTS│ -35%             │ (aucune)           │ Copier │
│ │ SKF / Z16      │ -40%             │ -38%               │ ⚠ Conflit │
│ │ FESTO / VER_ISO│ -30%             │ -30%               │ Identique│
│                                                                   │
│ En cas de conflit :                                               │
│ [● Garder l'existant] [○ Ecraser] [○ Prendre le meilleur]       │
│                                                                   │
│ Motif * : [Alignement conditions groupe aero_______________]     │
│                                                                   │
│ [ Annuler ]                         [ Proposer la copie au ROI ] │
└──────────────────────────────────────────────────────────────────┘
```

**Points cles** :
- Apercu avant/apres avec detection des conflits
- 3 strategies de resolution : garder existant / ecraser / prendre le meilleur (`PV` le plus bas avec `marge facture >= seuil global unique`)
- Toutes les conditions copiees passent par le workflow normal
- L'historique trace que c'est une copie (champ `source_copy_from`)

## 5.11 - Dates de validite

### Saisie

Presets : "3 mois", "6 mois", "1 an", "Permanente". Le choix "Permanente" met `date_fin = null` mais c'est un choix explicite.

### Indicateurs visuels dans l'arbre

```
│ SKF / Z16 │ -40% Client │ expire le 31/03 (dans 30j) │ ⏰ │
│ FESTO/VER │ -30% Client │ permanent                   │    │
```

### Alertes d'expiration

- Badge dans la navigation : "3 conditions expirent dans les 30 jours"
- Filtre rapide : "Expire bientot" (< 30j)
- Email/notification recapitulatif hebdomadaire au TCS et ROI

### Actions sur expiration

- **Prolonger** : modifier la date_fin (cree une proposal si TCS)
- **Renouveler** : creer une nouvelle condition identique avec nouvelles dates
- **Laisser expirer** : la condition passe en statut 'expiree', le niveau parent reprend

## 5.12 - Simulateur rapide (popover)

```
                    ┌─────────────────────────────────┐
                    │ SIMULATEUR RAPIDE                │
│ SKF / Z16  -40%  │                                   │
│ Rigides... [Sim]──│ PA: 4.50€  Tarif: 12.50€        │
                    │ PA aide: 3.80€ (derog SKF)       │
                    │                                   │
                    │ Actuel : -40% (marge 40.0%)       │
                    │ Marge CL: 36.4% 📦 (PA x 1.06)   │
                    │ Marge reelle: 49.3% (PA aide)     │
                    │                                   │
                    │ [Remise % ●] [Marge % ○] [Prix ○] │
                    │ Valeur: [___45___] %               │
                    │                                   │
                    │ Produit du CL ? [○ Oui] [● Non]   │
                    │                                   │
                    │ Resultat :                         │
                    │ Net: 6.88€   Marge: 34.6%         │
                    │ Marge CL: 30.8% 📦 (si CL)       │
                    │ Marge reelle: 44.8% (PA aide)     │
                    │ Delta: -0.62€ vs actuel            │
                    │ Plancher coef: 4.95€ ✅           │
                    │                                   │
                    │ ─── Cascade complete ───          │
                    │ Niv 1  Ref 6205 client  : 7.80€  │
                    │ Niv 3  Segment SKF/Z16  : -40% ◄ │
                    │ Niv 5  Marque SKF/sfam  : -38%   │
                    │ Niv 15 Mega ROULEMENTS  : -35%   │
                    │ Niv G  Remise mini      : -20%   │
                    │ Niv G  Coef mini        : x1.10  │
                    │                                   │
                    │ 🤖 IA: historique moy -39.2%     │
                    │                                   │
                    │ [ Appliquer cette valeur ]         │
                    └─────────────────────────────────┘
```

**3 modes de saisie** : Remise %, Marge %, Prix fixe EUR. Bascule instantanee sans perdre le contexte. Le bouton "Appliquer" remplit le champ d'edition inline.

## 5.13 - Onglet Consommation enrichi

### Selecteur de periode

```
Periode : [2026 ●] [2025] [2024] [Personnalise: du [__] au [__]]
         [☐ Comparer avec N-1]
```

### Filtres de consommation

```
[● Segments avec CA] [○ Tous les segments]
```

### Tableau de consommation

```
│ Segment        │ CA 2026 │ CA 2025 │ Evol │ Qty │ Marge moy │ Dern. marge │ Dern. cmd │
│────────────────┼─────────┼─────────┼──────┼─────┼───────────┼─────────────┼───────────│
│ SKF / Z16      │ 12.4k€  │ 11.2k€  │ +11% │ 234 │ 38.2%     │ 35.1%       │ 15/01/26  │
│ FESTO / VER_ISO│ 8.7k€   │ 9.1k€   │ -4%  │  12 │ 24.6%     │ 22.0%       │ 28/02/26  │
```

### Detail au clic (historique par segment)

```
SKF / Z16 - Historique des ventes (AIRBUS)
│ Date       │ Reference   │ Qty │ PV unit │ PA unit │ Marge │ Remise │
│ 15/01/2026 │ 6205-2RSH   │  50 │ 7.50€   │ 4.50€   │ 40.0% │ -40%   │
│ 22/11/2025 │ 6206-2RSH   │  25 │ 9.80€   │ 5.69€   │ 41.9% │ -38%   │

Resume : 10 ventes sur 3 ans, marge moyenne 39.4%, min 35.1%, max 42.3%

💡 Suggestion IA : figer une remise a -39% (marge cible ~39%)
   [Appliquer cette suggestion →]
```

## 5.14 - Page de validation ROI (`/remises/validation`)

```
┌──────────────────────────────────────────────────────────────────┐
│ VALIDATION DES PROPOSITIONS                        12 en attente │
│                                                                   │
│ Tri: [Priorite ▼]  Filtre: [Tous] [Critiques] [Lots]            │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ☐ Proposition #234 - Jean (TCS) - il y a 2h                 │ │
│ │ SKF/Z16 AIRBUS : -40% → -45%                                │ │
│ │ Motif : "Alignement concurrent NTN"                          │ │
│ │                                                               │ │
│ │ 🤖 ✅ Coherent                                              │ │
│ │ • Remise -45% dans la fourchette Aero (-30% a -48%)         │ │
│ │ • Marge resultante 34.6% > seuil critique 15%               │ │
│ │                                                               │ │
│ │ [Valider ✓] [Refuser ✗] [Demander precision]               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ☐ Proposition #235 - Paul (TCS) - il y a 5h                 │ │
│ │ PARKER/HYD_FLEX MECAPLUS : -35% → -52%                      │ │
│ │ Motif : "Demande du client"                                  │ │
│ │                                                               │ │
│ │ 🤖 ⚠️ Points d'attention                                   │ │
│ │ • Saut de 17pp inhabituel                                    │ │
│ │ • Marge resultante 14.8% — sous le seuil 15%                │ │
│ │ • Motif generique                                            │ │
│ │                                                               │ │
│ │ [Valider ✓] [Refuser ✗] [Demander precision]               │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Regles d'etat pour `Demander precision` :
- Passage `en_attente -> demande_precision` avec commentaire obligatoire du validateur
- Reponse TCS obligatoire avec commentaire pour retour `demande_precision -> en_attente`
- Cloture possible depuis `demande_precision` vers `validee` ou `refusee`
- Pas de SLA automatique bloquant sur cet etat

## 5.15 - Comparaison de conditions entre 2 clients

Accessible via un bouton "Comparer avec..." sur la fiche client :

```
┌────────────── AIRBUS ──────────────┬────────────── SAFRAN ─────────────┐
│ SKF/Z16      -40% Client  40.0%   │ SKF/Z16      -35% Grp    42.3%   │
│ FESTO/VER    -30% Client  38.3%   │ FESTO/VER    (aucune)    -       │
│ Mega ROUL    -35% Client  48%     │ Mega ROUL    -25% Grp    52%     │
└────────────────────────────────────┴───────────────────────────────────┘
```

Utile pour harmoniser les conditions entre clients similaires et preparer des copies.

## 5.16 - Ecran Administration : Coefficients Centre Logistique

Accessible depuis `/remises/admin` → onglet "Centre Logistique". Permet de gerer les coefficients CL appliques aux produits approvisionnes via le Centre Logistique.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ADMINISTRATION > Centre Logistique                                           │
│                                                                              │
│ ┌─ CONFIGURATION GENERALE ──────────────────────────────────────────────┐   │
│ │ Frais de ligne CL     : [2.50] €  (fixe, par ligne de commande)      │   │
│ │ Frais de port inter-agence : [12.00] €                                │   │
│ │                                                    [Enregistrer]      │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌─ COEFFICIENTS PAR HIERARCHIE PRODUIT ──────────────────────────────────┐  │
│ │                                                                        │  │
│ │ Recherche : [_______________] 🔍    [+ Ajouter un coefficient]        │  │
│ │                                                                        │  │
│ │ │ Mega-famille   │ Famille        │ Sous-famille   │ Coef CL  │ Actif │  │
│ │ │────────────────┼────────────────┼────────────────┼──────────┼───────│  │
│ │ │ ROULEMENTS     │ (herite)       │ (herite)       │ 1.0600   │ ✅ ✏️🗑│  │
│ │ │ ROULEMENTS     │ STANDARDS      │ (herite)       │ —        │       │  │
│ │ │ ROULEMENTS     │ STANDARDS      │ RIGIDES        │ 1.0800   │ ✅ ✏️🗑│  │
│ │ │ ETANCHEITE     │ (herite)       │ (herite)       │ 1.0600   │ ✅ ✏️🗑│  │
│ │ │ PNEUMATIQUE    │ (herite)       │ (herite)       │ 1.0400   │ ✅ ✏️🗑│  │
│ │ │ HYDRAULIQUE    │ RACCORDS       │ (herite)       │ 1.0500   │ ✅ ✏️🗑│  │
│ │ └──────────────────────────────────────────────────────────────────────┘  │
│ │                                                                        │  │
│ │ Legende :                                                              │  │
│ │   (herite) = prend le coef du niveau parent                            │  │
│ │   — = pas de coef specifique, herite du parent                         │  │
│ │   Defaut si aucun coef : 1.0 (pas de surcout CL)                      │  │
│ │                                                                        │  │
│ │ Gere par : Super Admin, Agency Admin                                   │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌─ AIDE ─────────────────────────────────────────────────────────────────┐  │
│ │ Le coefficient CL s'applique UNIQUEMENT quand un produit est           │  │
│ │ approvisionne via le Centre Logistique (determine a la commande).      │  │
│ │                                                                        │  │
│ │ Formule : PA_agence_CL = PA_effectif x coef_CL                        │  │
│ │                                                                        │  │
│ │ Les frais de ligne (2.50€) sont par commande et ne sont PAS integres   │  │
│ │ au PA unitaire. Ils apparaissent a titre indicatif dans le simulateur. │  │
│ │                                                                        │  │
│ │ Les conditions de remise (cascade) sont independantes de la source.     │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Points cles** :
- **Configuration generale** : frais de ligne CL et frais de port inter-agence, modifiables uniquement par super_admin
- **Tableau des coefficients** : liste tous les coefficients CL poses par hierarchie produit, avec heritage visible
- **Heritage** : un coefficient pose sur une mega-famille s'applique a toutes les familles et sous-familles qui n'ont pas de coefficient plus specifique
- **Actions** : ✏️ editer le coefficient, 🗑 supprimer (le produit retombe sur le coefficient parent ou 1.0 par defaut)

## 5.17 - Journal de bord par client (onglet Historique)

Timeline chronologique des modifications :

```
28/02/2026 - Jean (TCS) a modifie SKF/Z16 : -38% → -40%
             Motif: "Alignement concurrent"
             Valide par Marie (ROI)

15/01/2026 - Import prix marche : 12 references ajoutees
             Source: "Contrat cadre 2026"
             Valide par Marie (ROI)

08/12/2025 - Pierre (ROI) a copie les conditions de SAFRAN → AIRBUS
             8 conditions copiees, 2 conflits resolus (meilleur sous contrainte marge)
```
