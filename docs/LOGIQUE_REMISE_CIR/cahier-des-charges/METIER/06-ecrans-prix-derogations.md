# 6. Prix marche, derogations fournisseur et BFA

[← Ecrans utilisateur](./05-ecrans-utilisateur.md) | [Sommaire](../00-sommaire.md) | [Regles metier →](./07-regles-metier.md)

---

## 6.1 - Onglet Prix marche (fiche client / groupement)

### Vue d'ensemble

L'onglet "Prix marche" liste tous les prix fixes negocies par reference pour ce client (ou groupement). Un prix marche est le niveau le plus prioritaire de la cascade : il s'applique toujours, quelle que soit la remise segment ou mega.

**Nouveau en v3.0** : Les prix marche peuvent etre poses au niveau **groupement** en plus du niveau client. Un prix marche groupement s'applique a toutes les references des clients du groupement, sauf si le client a son propre prix marche sur cette reference.

### Tableau des prix marche

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ PRIX MARCHE - AIRBUS OPERATIONS (47 references)                                      │
│                                                                                      │
│ [🔍 Rechercher une reference...] [+ Ajouter] [Importer Excel]                       │
│ Filtre: [Toutes marques ▼] [Avec ecart ⚠]                                          │
│                                                                                      │
│ │ Marque │ Reference   │ Description          │ Type  │ Valeur │ PV net │ Marge │ PA │
│ │────────┼─────────────┼──────────────────────┼───────┼────────┼────────┼───────┼────│
│ │ SKF    │ 6205-2RSH   │ Rlt rigide 25x52     │ Prix  │ 7.80€  │ 7.80€  │ 42.3% │4.50│
│ │ SKF    │ 6206-2RSH   │ Rlt rigide 30x62     │ Prix  │ 9.20€  │ 9.20€  │ 38.2% │5.69│
│ │ SKF    │ 6207-2RSH   │ Rlt rigide 35x72     │ Rem%  │ -37.6% │ 11.99€ │ 42.4% │6.91│
│ │ TIMKEN │ 32205       │ Rlt conique           │ Prix  │ 22.00€ │ 22.00€ │ 33.2% │14.7│
│ │        │             │                      │       │        │        │       │    │
│ │ ⚠ SKF │ 6308-2RSH   │ Rlt rigide 40x90     │ Prix  │ 15.00€ │ 15.00€ │ 28.1% │10.8│
│ │        │             │ Ecart: remise segment = 14.40€ (meilleur) │      │       │    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Alerte de coherence** (⚠) : quand un prix marche est MOINS avantageux que la remise segment, le client paierait plus cher avec le prix marche. L'alerte est affichee et le TCS peut corriger.

### Ajout unitaire d'un prix marche

```
┌──────────────────────────────────────────────────────────────────┐
│ AJOUTER UN PRIX MARCHE                                            │
│                                                                   │
│ Reference : [6205____] 🔍                                        │
│ → SKF 6205-2RSH - Rlt rigide a billes 25x52x15 2RS              │
│   Segment: SKF / Z16  |  PA: 4.50€  |  Tarif: 12.50€           │
│   Si derogation: PA aide 3.80€                                   │
│                                                                   │
│ Type de valeur : [Prix fixe EUR ●] [Remise % ○] [Marge % ○]     │
│ Valeur : [____7.80____] EUR                                      │
│                                                                   │
│ Resultat :                                                        │
│   Marge : 42.3% ✅  |  Marge reelle (PA aide) : 51.3%           │
│   Remise equivalente : -37.6%                                    │
│   Condition actuelle : remise grp Aero -28% (= 9.00€)           │
│   → Ce prix (7.80€) est PLUS avantageux que le grp (9.00€) ✅   │
│                                                                   │
│ Date fin : [31/12/2026] ou [Permanente]                          │
│ Motif * : [Prix negocie contrat cadre 2026_____________]         │
│                                                                   │
│ [ Annuler ]                              [ Proposer au ROI ]     │
└──────────────────────────────────────────────────────────────────┘
```

### Import Excel de prix marche

Wizard en 3 etapes :
1. **Upload** : selectionner le fichier, choisir le type de valeur (prix fixe / remise % / marge %)
2. **Mapping** : associer les colonnes du fichier aux champs attendus (reference, marque, valeur, date fin)
3. **Verification** : tableau avec statut par ligne (✅ trouve, ⚠ suggestion fuzzy, ❌ non trouve)
4. **Confirmation** : resume + motif + soumission

---

## 6.2 - Derogations fournisseur (NOUVEAU)

### Concept

Une derogation fournisseur est un prix aide accorde par un fabricant a CIR, specifiquement pour un client ou un groupement. Ca change le **PA** (prix d'achat), pas directement le PV. Le TCS doit connaitre les derogations actives pour savoir qu'il a plus de marge de manoeuvre.

### Les 3 portees

| Portee | Qui gere | Visibilite | Exemples |
|--------|---------|------------|---------|
| **Agence** | ROI de l'agence | Agence + Direction | SKF -70% sur Z16 pour AIRBUS (negocie localement) |
| **Nationale** | Direction / Cellule marche | Toutes agences concernees | FESTO prix net 75€ VER_ISO pour grp Aeronautique |
| **Globale** | Direction / Service achats | Toutes agences | PARKER -5% supp sur HYD_FLEX pour tous les clients |

### Les 3 cibles

| Cible | Description |
|-------|------------|
| **Client** | Derogation pour un client specifique |
| **Groupement** | Derogation pour tous les clients d'un groupement |
| **Tous** | Derogation beneficiant a tous les clients (globale) |

### Les 3 types de valeur

| Type | Description | Exemple |
|------|------------|---------|
| **Prix net** | PA fixe en EUR | FESTO DSBC-40-100 = 75 EUR pour AIRBUS |
| **Remise %** | Remise d'achat specifique (remplace la remise standard) | SKF Z16 = -70% (au lieu de -64%) pour AIRBUS |
| **Remise supplementaire %** | Remise en plus de la remise standard | PARKER HYD_FLEX = -5% supp pour SAFRAN |

### Ecran "Derogations" (onglet fiche client/groupement)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ DEROGATIONS FOURNISSEUR - AIRBUS OPERATIONS                                          │
│                                                                                      │
│ [+ Ajouter] (ROI+)   [Importer Excel] (Direction+)                                  │
│                                                                                      │
│ ── Derogations specifiques a ce client ──                                            │
│ │ Marque │ Niveau    │ Reference/CAT_FAB │ Type     │ Valeur │ PA aide │ Portee │ Fin│
│ │────────┼───────────┼───────────────────┼──────────┼────────┼─────────┼────────┼────│
│ │ SKF    │ CAT_FAB   │ Z16               │ Remise   │ -70%   │ 3.75€   │ Agence │06/26│
│ │ FESTO  │ Reference │ DSBC-40-100       │ Prix net │ 75.00€ │ 75.00€  │ Nation.│12/26│
│                                                                                      │
│ ── Derogations du groupement Aeronautique ──                                         │
│ │ PARKER │ CAT_FAB   │ HYD_FLEX          │ Rem supp │ -5%    │ calc.   │ Nation.│03/27│
│                                                                                      │
│ ── Derogations globales (tous clients) ──                                            │
│ │ TIMKEN │ CAT_FAB   │ SET_BR            │ Remise   │ -62%   │ 13.30€  │ Global │12/26│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Impact visuel partout

Quand une derogation est active, l'impact est visible dans TOUTE l'interface :

```
PA: 4.50€ → 3.75€ (derog SKF -70%)   Marge: 40% → 50.0%
```

Un indicateur visuel (icone ou badge) signale qu'un PA aide est actif sur cette reference/segment.

### Formulaire d'ajout de derogation

```
┌──────────────────────────────────────────────────────────────────┐
│ NOUVELLE DEROGATION FOURNISSEUR                                   │
│                                                                   │
│ Marque * : [SKF ▼]                                               │
│                                                                   │
│ Niveau :  [● Reference] [○ CAT_FAB] [○ Segment]                 │
│ Reference/CAT_FAB : [Z16______]                                  │
│                                                                   │
│ Portee :  [● Agence] [○ Nationale] [○ Globale]                  │
│ Cible :   [● Client] [○ Groupement] [○ Tous]                    │
│ Client :  AIRBUS OPERATIONS                                      │
│                                                                   │
│ Type :    [● Remise %] [○ Prix net] [○ Remise supp %]           │
│ Valeur :  [-70-] %                                               │
│                                                                   │
│ PA standard : 4.50€ (remise fab 64%)                             │
│ PA aide     : 3.75€ (remise 70%)                                 │
│ Gain PA     : -0.75€ (-16.7%)                                   │
│                                                                   │
│ Date debut * : [01/03/2026]                                      │
│ Date fin *   : [30/06/2026]   (obligatoire pour les derogations) │
│ Motif *      : [Offre prix SKF Q1-Q2 2026 volume___]            │
│                                                                   │
│ [ Annuler ]                              [ Appliquer ]           │
└──────────────────────────────────────────────────────────────────┘
```

### Alertes d'expiration de derogations

Quand une derogation expire :
- Les marges baissent automatiquement (PA revient au standard)
- Alerte : "Derogation SKF Z16 AIRBUS expire le 30/06. Impact : marge passe de 50% a 40%"
- Le ROI peut prolonger, renouveler ou laisser expirer

---

## 6.3 - Administration des BFA (Direction+)

### Concept

Le BFA (Bonus de Fin d'Annee) est un avoir commercial du fabricant base sur les volumes vendus. Chaque fabricant a sa propre mecanique (fixe, paliers, variable). L'outil stocke le **taux effectif estime** par marque/CAT_FAB.

### Ecran de gestion BFA

```
┌──────────────────────────────────────────────────────────────────┐
│ GESTION DES BFA - 2026                                            │
│                                                                   │
│ [+ Ajouter]  [Importer]                                         │
│                                                                   │
│ │ Marque  │ CAT_FAB    │ Taux │ Mode         │ Fiabilite │ Note │
│ │─────────┼────────────┼──────┼──────────────┼───────────┼──────│
│ │ SKF     │ (global)   │ 3.5% │ Fixe         │ ✅ Confirme│ Accord annuel 2026 │
│ │ FESTO   │ VER_ISO    │ 2.0% │ Palier est.  │ ~ Estime  │ Palier 1 sur 3     │
│ │ FESTO   │ DIST_ELEC  │ 4.0% │ Palier est.  │ ~ Estime  │ Palier 2 sur 3     │
│ │ PARKER  │ (global)   │ 1.5% │ Variable     │ ? Incertain│ En negociation    │
│ │ TIMKEN  │ (global)   │ 0%   │ Fixe         │ ✅ Confirme│ Pas de BFA         │
└──────────────────────────────────────────────────────────────────┘
```

### Niveaux de fiabilite

| Fiabilite | Icone | Usage coef_mini | Description |
|-----------|-------|----------------|-------------|
| **Confirme** | ✅ | Oui (PA apres BFA) | Accord signe avec le fabricant |
| **Estime** | ~ | Non (PA facture) | Estimation basee sur paliers connus |
| **Incertain** | ? | Non (PA facture) | En cours de negociation ou inconnu |

### Affichage de la marge BFA

Partout ou une marge est affichee, si un BFA est actif :

```
Marge : -2.1% (⚡ +3.5% BFA ~ → marge reelle estimee : 1.4%)
```

Ou en format compact :
```
Marge facture : 12.3%  │  Marge apres BFA : 15.8% ~
```

Le `~` signifie "estime" (fiabilite != confirme).

---

## 6.4 - Administration des conditions globales (Direction+)

### Ecran de gestion des promos

```
┌──────────────────────────────────────────────────────────────────┐
│ PROMOTIONS ACTIVES                                                │
│                                                                   │
│ [+ Nouvelle promo]                                               │
│                                                                   │
│ │ Niveau    │ Cible           │ Valeur   │ Debut    │ Fin      │ │
│ │───────────┼─────────────────┼──────────┼──────────┼──────────│ │
│ │ Segment   │ FESTO / VER_ISO │ 150.00€  │ 01/03/26 │ 31/03/26 │ │
│ │ Reference │ SKF 6205-2RSH   │ 6.50€    │ 15/02/26 │ 30/04/26 │ │
│ │ Sfam      │ Rigides a billes│ -25%     │ 01/01/26 │ 30/06/26 │ │
└──────────────────────────────────────────────────────────────────┘
```

Les promos peuvent desormais etre posees par **reference**, **segment**, **sous-famille**, **famille** ou **mega-famille**.

### Ecran de gestion des remises mini / coef mini

Les remises mini et coef mini suivent leur propre cascade d'heritage (segment > sous-famille > famille > mega-famille). L'ecran permet de poser des valeurs a chaque niveau.

---

## 6.5 - Import tarifs fabricant (ROI+)

### Type d'import (choix au demarrage)

```
┌──────────────────────────────────────────────────────────────────┐
│ IMPORT TARIF FABRICANT                                            │
│                                                                   │
│ Fabricant : [SKF ▼]                                              │
│                                                                   │
│ Type d'import :                                                   │
│ [● Tarif complet] Prix public + remises dans le meme fichier     │
│ [○ Tarif seul]    Prix public uniquement (remises a part)        │
│ [○ Remises seules] A appliquer sur un tarif existant             │
│ [○ PA direct]     Prix net d'achat (pas de prix public)          │
│                                                                   │
│ Fichier : [ Parcourir... ] tarif_SKF_2026.xlsx                   │
│                                                                   │
│ Template de mapping : [SKF France 2026 ▼] ou [Nouveau mapping]  │
│                                                                   │
│ [ Suivant → ]                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Etapes de l'import

1. **Upload + type** : choix du fabricant, type d'import, fichier, template
2. **Mapping colonnes** : association colonnes fichier → champs systeme (avec auto-mapping IA)
3. **Preview** : visualisation des donnees transformees, detection des erreurs
4. **Analyse delta** : comparaison avec l'import precedent (hausse/baisse prix, nouvelles references, references supprimees)
5. **Confirmation** : lancement de l'import

### Analyse delta a l'import (avec IA)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🤖 ANALYSE DE L'IMPORT SKF 2026                                  │
│                                                                   │
│ • 12 340 references mises a jour                                 │
│ • Hausse moyenne : +3.2% sur les prix tarif                     │
│ • 47 references avec hausse > 10%                                │
│ • 12 references a fort CA avec hausse significative              │
│                                                                   │
│ Impact sur les marges :                                           │
│ • 23 conditions client seront sous le seuil 15%                  │
│ • Segments les plus impactes : Z16 (+4.1%), Z22 (+5.8%)         │
│                                                                   │
│ Recommandation : reviser les conditions des 23 clients impactes  │
│ [Voir la liste] [Lancer une campagne de revision]                │
│                                                                   │
│ [ Annuler ]                              [ Confirmer l'import ]  │
└──────────────────────────────────────────────────────────────────┘
```
