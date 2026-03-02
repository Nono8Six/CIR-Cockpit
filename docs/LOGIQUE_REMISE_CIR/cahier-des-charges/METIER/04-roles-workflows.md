# 4. Roles et workflows

[← Logique de tarification](./03-logique-tarification.md) | [Sommaire](../00-sommaire.md) | [Ecrans utilisateur →](./05-ecrans-utilisateur.md)

---

## 4.1 - Matrice des droits

| Fonctionnalite | TCS | ROI | Direction | Super Admin |
|---------------|-----|-----|-----------|-------------|
| Rechercher un client / groupement | Agence | Agence | Toutes | Toutes |
| Voir les conditions d'un client / groupement | Agence | Agence | Toutes | Toutes |
| Voir le PA (prix d'achat) | Oui | Oui | Oui | Oui |
| Simuler un prix (popover calculette) | Oui | Oui | Oui | Oui |
| **Proposer** une condition (soumise a validation ROI) | **Oui** | - | - | - |
| **Appliquer** une condition (direct, sans validation) | **Non** | **Oui** | **Oui** | **Oui** |
| Appliquer des modifications en lot | Non | Oui | Oui | Oui |
| Valider/Refuser une proposition TCS | Non | **Oui** | Oui | Oui |
| Copier des conditions (client/groupement) | Oui (propose) | Oui (direct) | Oui (direct) | Oui |
| Importer un fichier tarif fabricant | Non | **Oui** | Oui | Oui |
| Importer des prix marche par reference | Oui (propose) | Oui (direct) | Oui (direct) | Oui |
| Creer/modifier des derogations agence | Non | **Oui** | Oui | Oui |
| Creer/modifier des derogations nationales | Non | Non | **Oui** | Oui |
| Creer/modifier des derogations globales | Non | Non | **Oui** | Oui |
| Gerer les taux BFA | Non | Non | **Oui** | Oui |
| Voir les taux BFA (lecture seule) | Non | Oui (LC) | Oui | Oui |
| Gerer les conditions globales (promo, mini, coef) | Non | Non | **Oui** | Oui |
| Gerer les groupements clients | Non | Non | **Oui** | Oui |
| Selectionner l'agence de travail | Non | Non | **Oui** | Oui |
| Poser une marque globale "Prioritaire" ou "Forte" | Non | **Oui** | Oui | Oui |
| Poser une marque globale "Standard" ou "Securite" | Oui (propose) | Oui (direct) | Oui (direct) | Oui |
| Voir le dashboard IA / consommation | Oui | Oui | Oui | Oui |
| Administrer les utilisateurs/roles | Non | Non | Non | **Oui** |

## 4.2 - Perimetre de visibilite (RLS)

- **TCS** : ne voit que les clients rattaches a son agence
- **ROI** : ne voit que les clients et propositions de son agence
- **Direction** : voit tous les clients et propositions de toutes les agences + peut selectionner l'agence de travail
- **Super Admin** : acces complet sans restriction

> Le modele RLS existant du CIR Cockpit (filtrage par `agency_id`) est reutilise tel quel.

## 4.3 - Workflow de validation par role

### Workflow TCS (validation obligatoire)

```
TCS propose une modification
    │
    ▼
Proposition statut = "en_attente"
    │
    ▼
ROI de l'agence recoit la notification
(badge dans la navigation : "Validation (N)")
    │
    ├── VALIDE (avec commentaire optionnel)
    │     → Condition precedente archivee (si modification)
    │     → Nouvelle condition activee (statut = "validee")
    │     → Proposition statut = "validee"
    │
    └── REFUSE (avec commentaire obligatoire)
          → Pas de modification de condition
          → Proposition statut = "refusee"
          → TCS notifie du refus + motif
```

### Workflow ROI / Direction / Super Admin (application directe)

```
ROI/Direction saisit une modification
    │
    ▼
Condition activee IMMEDIATEMENT (statut = "validee")
Proposition creee pour tracabilite (statut = "validee", valide_par = propose_par)
    │
    ▼
Audit trail enregistre : qui a applique, quand, valeur precedente
```

**Option secondaire pour le ROI** : Si le ROI souhaite un avis hierarchique avant d'appliquer, il peut choisir de "Proposer a la Direction" au lieu d'"Appliquer". La proposition suit alors le meme workflow que pour un TCS, mais validee par la Direction.

### Alertes non-bloquantes

Quand un ROI+ applique directement une condition :
- Si la condition est sous le coef_mini → alerte enregistree dans la proposition (tracabilite)
- Si la condition cree une incoherence (prix marche moins avantageux que remise segment) → alerte visible
- L'application n'est PAS bloquee, mais l'alerte est loguee pour audit

## 4.3b - Regles de gestion des conditions groupement multi-agences

| Portee condition | Qui peut creer/modifier | Regle |
|-----------------|------------------------|-------|
| Condition **client** (scope = client) | Chaque agence gere ses propres clients, meme s'ils font partie d'un groupement | Autonomie agence |
| Condition **groupement mono-agence** | ROI de l'agence (direct) | Tous les clients du groupement sont dans son agence |
| Condition **groupement multi-agences** | Direction ou Super Admin uniquement | Le ROI ne peut que proposer (statut = en_attente), validee par Direction |

**Regle** : le ROI peut creer une condition `scope = 'groupement'` en application directe **uniquement si tous les clients du groupement sont rattaches a son agence**. Si le groupement est multi-agences, le ROI propose et la Direction valide.

## 4.3c - Auto-validation TCS (non retenue)

L'auto-validation TCS est **supprimee**.

Regle definitive :
- Toute proposition emise par un TCS reste en statut `en_attente` jusqu'a validation/refus par un `agency_admin` (alias metier ROI)
- Les parametres `auto_valid_tcs_*` ne font pas partie du perimetre implemente

## 4.3d - Statut "demande_precision" (sans SLA automatique)

Le validateur peut demander des precisions avant decision finale.

Transitions autorisees :
- `en_attente -> demande_precision`
- `demande_precision -> en_attente` (reponse TCS)
- `demande_precision -> validee`
- `demande_precision -> refusee`

Regles :
- Commentaire obligatoire du validateur lors du passage en `demande_precision`
- Commentaire obligatoire du TCS lors de la reponse qui remet la proposition en `en_attente`
- Pas de SLA bloquant automatique sur `demande_precision`

---

## 4.4 - Gestion des derogations fournisseur par portee

Les derogations ont 3 portees, chacune avec ses propres droits de gestion :

| Portee | Description | Qui peut creer/modifier | Qui voit |
|--------|------------|------------------------|----------|
| **Agence** | Le ROI negocie avec le fournisseur local pour des clients de l'agence | ROI de l'agence, Direction | Agence + Direction |
| **Nationale** | La cellule marche CIR negocie pour des marches nationaux (clients multi-agences) | Direction, Super Admin | Toutes les agences concernees |
| **Globale** | Derogations d'achat obtenues par le service achats sur des volumes | Direction, Super Admin | Toutes les agences |

### Cibles des derogations

| Cible | Description | Exemples |
|-------|------------|---------|
| **Client** | Derogation pour un client specifique | SKF -70% sur Z16 pour AIRBUS |
| **Groupement** | Derogation pour tous les clients d'un groupement | FESTO prix net 75 EUR pour grp Aeronautique |
| **Tous** | Derogation globale beneficiant a tous les clients | PARKER -5% supp sur HYD_FLEX pour tous |

## 4.5 - Gestion des BFA

| Action | Direction | ROI | TCS |
|--------|-----------|-----|-----|
| Creer/modifier un taux BFA | Oui | Non | Non |
| Choisir le niveau de fiabilite (confirme/estime/incertain) | Oui | Non | Non |
| Voir les taux BFA | Oui | Oui (lecture seule) | Non |
| Voir la marge apres BFA sur les fiches | Oui | Oui | Non |
| Signaler un taux BFA incorrect | - | Oui (demande) | Non |

**Niveaux de fiabilite** :
- **Confirme** : le taux est valide par le fabricant (accord signe). Peut etre utilise pour le coef_mini.
- **Estime** : estimation basee sur les paliers connus. Affiche a titre indicatif, ne sert pas pour le coef_mini.
- **Incertain** : en cours de negociation. Affiche avec un indicateur d'incertitude (~).

## 4.6 - Boutons d'action par role

| Role | Bouton principal | Bouton secondaire |
|------|-----------------|-------------------|
| **TCS** | `[Proposer au ROI]` | - |
| **ROI** | `[Appliquer]` | `[Proposer a la Direction]` (optionnel) |
| **Direction** | `[Appliquer]` | - |
| **Super Admin** | `[Appliquer]` | - |

## 4.7 - Scenarios de workflow

### Scenario 1 : TCS pose une condition simple

1. TCS ouvre la fiche client DASSAULT → onglet Conditions
2. Clique [+] sur le segment SKF/Z16
3. Saisit -38% en remise → voit marge 42.4%, delta, contexte IA
4. Saisit le motif : "Alignement concurrent NTN"
5. Clique `[Proposer au ROI]`
6. Proposition creee en statut "en_attente"
7. ROI recoit la notification (badge "Validation (1)")
8. ROI ouvre la proposition, voit l'analyse IA (coherent/attention)
9. ROI clique `[Valider]` → condition activee

### Scenario 2 : ROI applique directement

1. ROI ouvre la fiche client AIRBUS → onglet Conditions
2. Modifie la condition mega ROULEMENTS : -35% → -38%
3. Voit le contexte : marge, delta, segments impactes
4. Saisit le motif : "Revision annuelle conditions AIRBUS"
5. Clique `[Appliquer]`
6. Condition activee immediatement
7. Ancienne condition (-35%) archivee
8. Audit trail : "ROI Marie a modifie mega ROULEMENTS AIRBUS : -35% → -38%"

### Scenario 3 : ROI gere une derogation agence

1. ROI ouvre la fiche client MECAPLUS → onglet "Derogations"
2. Clique "Ajouter une derogation"
3. Renseigne : marque FESTO, CAT_FAB VER_ISO, remise -55% (au lieu de -50% standard)
4. Portee : Agence, cible : Client MECAPLUS
5. Dates : 01/03/2026 au 30/06/2026
6. Motif : "Offre prix FESTO Q1-Q2 2026 pour volume 200 pieces"
7. Clique `[Appliquer]` → derogation active immediatement
8. L'impact est visible partout : le PA aide baisse, les marges affichees changent

### Scenario 4 : Copie de conditions entre clients

1. TCS ouvre la fiche client DASSAULT
2. Clique "Copier les conditions depuis..."
3. Selectionne "Client" → recherche SAFRAN → selectionne
4. Apercu : 18 conditions a copier, 4 conflits detectes
5. Strategie de conflit : "Prendre le meilleur"
6. Motif : "Alignement conditions groupe aeronautique"
7. Clique `[Proposer la copie au ROI]`
8. 18 propositions individuelles creees
