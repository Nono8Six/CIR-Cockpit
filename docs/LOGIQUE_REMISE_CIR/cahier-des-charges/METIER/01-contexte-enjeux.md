# 1. Contexte et enjeux

[← Sommaire](../00-sommaire.md) | [Hierarchie produit →](./02-hierarchie-produit.md)

---

## 1.1 - La societe CIR

La **Compagnie Industrielle du Roulement** (CIR) est un multi-specialiste du negoce technique industriel fonde en 1933 a Toulouse. L'entreprise distribue des composants mecaniques, pneumatiques, hydrauliques, d'automatisme et de maintenance pour l'industrie du Grand Sud de la France.

**Chiffres cles (2024)** :
- Chiffre d'affaires consolide : **109 M EUR**
- Collaborateurs : **380** (dont 40 TCS itinerants, 150 TCS sedentaires)
- Agences : **14** (Occitanie + Nouvelle-Aquitaine)
- Clients actifs : **12 000**
- References en stock : **70 000** (12 M EUR d'immobilisation)
- References actives : **30 000**
- Familles de produits : **11 mega-familles** techniques
- Segments tarifaires : **7 548**

## 1.2 - Le probleme reel

Le systeme de gestion des prix utilise l'**AS400** (IBM iSeries) comme outil quotidien pour la saisie des devis et la recherche de prix en temps reel (au telephone avec le client). L'AS400 reste performant pour cet usage operationnel.

**Le vrai probleme** : il existe deja une **interface web de gestion des conditions commerciales**, mais elle est **si compliquee a exploiter que personne ne l'utilise**. Cette interface souffre de 7 problemes majeurs :

| # | Probleme | Impact | Notre reponse |
|---|---------|--------|---------------|
| P1 | **Deux modes isoles** : soit CIR (mega/fam/sfam), soit fournisseur (segment/cat_fab/marque). Pas de vue unifiee | L'utilisateur ne voit JAMAIS la combinaison des deux hierarchies | Notre arbre combine les 2 dimensions dans une seule vue hierarchique |
| P2 | **L'ordre de selection determine la priorite** : ce qu'on selectionne en premier prend le pas | Confusion, erreurs, cascade incomprehensible pour l'utilisateur | Notre cascade est FIXE et deterministe. L'utilisateur n'a pas a deviner l'ordre |
| P3 | **Conditions invisibles apres validation** : une fois validees, les conditions sont archivees et introuvables | Impossible de VOIR les conditions actives d'un client a un instant T | Notre outil montre TOUTES les conditions actives en permanence (arbre + tableau) |
| P4 | **Zero contexte** : on saisit une marge/remise a l'aveugle, sans connaitre le PA, le volume de vente, l'historique | Decisions deconnectees de la realite commerciale | Notre simulateur montre PA, PV, remise, marge, volume, historique, cascade complete |
| P5 | **Pas de gestion des derogations fournisseur** | Les prix aides sont geres en dehors de l'outil (Excel, email, papier) | Entite dediee `supplier_derogations` avec 3 portees (agence, nationale, globale) |
| P6 | **BFA non visible** | Aucune visibilite sur la marge reelle apres avoir commercial du fournisseur | Double affichage marge (facture + BFA) avec indicateur de fiabilite |
| P7 | **Prix marche via Excel** : gestion des prix net et marche exclusivement via fichiers externes | Aucune tracabilite, pas de lien avec les conditions, risque d'erreur | Import wizard + onglet prix marche integre + historique complet |

Le resultat : des conditions tarifaires opaques, des marges non maitrisees, une dependance totale a des fichiers Excel volants, et aucune vision consolidee de la politique tarifaire par client ou groupement.

## 1.3 - L'objectif

Creer un **module web de back-office integre au CIR Cockpit** existant qui permet aux TCS, ROI et Direction de gerer l'ensemble des conditions tarifaires de leurs clients et groupements.

> **Clarification importante** : Cet outil n'est PAS un outil de front-office pour chercher un prix en temps reel pendant un appel client. La consultation de prix et la saisie des devis restent sur l'AS400. Ce module est un **outil de back-office commercial** utilise a son bureau pour :

1. **Consulter** les conditions tarifaires d'un client ou d'un groupement, a tous les niveaux de la hierarchie produit, avec le contexte complet (PA, marge, volume, source, cascade)
2. **Poser** des conditions tarifaires (remises) du niveau le plus large (mega-famille) au plus fin (segment), avec heritage automatique et apercu cascade en temps reel
3. **Gerer** des prix marche par reference produit (prix fixes negocies) pour un client OU un groupement
4. **Integrer** les derogations fournisseur (prix aides) par client, groupement ou global, avec 3 portees (agence, nationale, globale)
5. **Visualiser** les BFA (Bonus de Fin d'Annee) et leur impact sur la marge reelle
6. **Simuler** l'impact de modifications (marge / remise / prix) avant de proposer, avec contexte IA
7. **Soumettre** des propositions de modification via un workflow adapte au role (TCS → ROI, ROI/Direction → application directe)
8. **Copier** des conditions entre clients et/ou groupements avec detection de conflits
9. **Importer** des fichiers tarifs fabricant (4 modes) et des listes de prix marche par reference
10. **Analyser** la consommation historique (multi-annee) et les tendances avec aide IA
11. **Preparer** la connexion future avec l'AS400

## 1.4 - Les 5 principes anti-patterns

Pour eviter de reproduire les erreurs de l'interface existante, le module respecte 5 principes fondamentaux :

1. **UNE SEULE VUE** : jamais 2 modes separes. L'arbre hierarchique combine produits CIR + marques + segments dans une vue unifiee
2. **CASCADE DETERMINISTE** : l'utilisateur ne choisit pas l'ordre. La hierarchie est fixe et documentee. L'apercu cascade montre le resultat a chaque edition
3. **TOUT EST VISIBLE** : les conditions actives sont TOUJOURS consultables. L'archivage est dans l'historique, pas dans la vue principale
4. **CONTEXTE OMNI-PRESENT** : a chaque edition, on montre PA (standard + aide), PV, marge (facture + BFA), remise, volume, source, comparaison avant/apres
5. **TOUT DANS L'OUTIL** : derogations, BFA, prix marche, tarifs fabricant - tout est gere dans CIR Cockpit, pas dans des fichiers Excel volants

---

## 2. Glossaire metier

| Terme | Definition | Exemple |
|-------|-----------|---------|
| **Mega-Famille** | Premier niveau de la classification CIR (FSMEGA). 11 categories techniques principales. | `1` = ROULEMENTS, `4` = PNEUMATIQUE |
| **Famille** | Deuxieme niveau (FSFAM). 82 sous-categories. | `1_10` = ROULEMENTS > STANDARDS |
| **Sous-famille** | Troisieme niveau (FSSFA). 473 terminaisons. | `1_10_10` = ROULEMENTS > STANDARDS > RIGIDES A BILLES 6000 |
| **Marque** | Code du fabricant/fournisseur. Peut etre posee dans une sous-famille (condition fine) ou en marque globale (condition large). | SKF, FESTO, TIMKEN, PARKER |
| **Marque globale** | Condition posee sur une marque pour TOUTES les sous-familles. 4 niveaux de force possibles (prioritaire, forte, standard, securite). | SKF -35% en mode "standard" |
| **Segment tarifaire** | Croisement Marque x Categorie fabricant (CAT_FAB). 7 548 segments. Unite atomique de tarification. | SKF + Z16 = segment #1234 |
| **CAT_FAB** | Code de la categorie/famille de remise propre au fabricant. | SKF : "Z16", FESTO : "VER_ISO" |
| **Reference produit** | Article specifique d'un fabricant. Niveau le plus fin de la hierarchie. | SKF 6205-2RSH |
| **Groupement** | Regroupement commercial de clients partageant des conditions. | "Aeronautique", "Agro-alimentaire" |
| **Prix tarif** | Prix public catalogue du fabricant. Base de calcul des remises. | Roulement SKF 6205 : 12.50 EUR tarif |
| **Prix tarif CIR** | Prix calcule par CIR quand le fabricant ne publie pas de tarif. Formule : PA x Coefficient. | PA 5.00 EUR x coef 2.5 = 12.50 EUR tarif CIR |
| **Remise** | Pourcentage de reduction applique sur le prix tarif. Toute condition (hors prix marche) est stockee en remise %. | -35% sur tarif = prix net 8.13 EUR |
| **Marge** | Pourcentage du prix de vente qui constitue le benefice. Formule : (PV - PA) / PV. | Marge 25% = le PA represente 75% du PV |
| **Marge facture** | Marge calculee sur le PA standard (facture fournisseur). | (7.50 - 4.50) / 7.50 = 40% |
| **Marge reelle (apres BFA)** | Marge calculee sur le PA effectif (apres BFA). Plus fiable que la marge facture. | (7.50 - 4.35) / 7.50 = 42% |
| **Prix marche** | Prix fixe negocie pour un client ou groupement sur une reference produit specifique. Niveau le plus prioritaire. | Client AIRBUS : SKF 6205 = 7.80 EUR net |
| **Derogation fournisseur** | Prix aide accorde par un fabricant a CIR pour un client ou groupement. Change le PA, pas le PV. | SKF accorde -70% (au lieu de -64%) sur Z16 pour AIRBUS |
| **BFA** | Bonus de Fin d'Annee. Avoir commercial du fabricant base sur les volumes vendus. Reduit le PA reel apres declaration. | SKF : BFA 3.5% = PA reel = PA facture x (1 - 0.035) |
| **Coef mini** | Coefficient multiplicateur minimum (plancher absolu). PV >= PA x Coef Mini. | Coef 1.15 = PV minimum = PA x 1.15 |
| **Remise mini** | Remise par defaut appliquee si aucune condition specifique. Filet de securite. | -20% sur tarif pour le segment SKF Z16 |
| **Condition** | Entree dans le systeme definissant une remise a un niveau de la hierarchie pour un client ou groupement. | Remise client -35% sur mega-famille ROULEMENTS |
| **Proposition** | Demande de creation/modification/suppression d'une condition, soumise a validation (TCS uniquement). | TCS demande passage de -30% a -35% |
| **Heritage** | Mecanisme par lequel une condition posee a un niveau large s'applique automatiquement a tous les niveaux inferieurs, sauf si une condition plus specifique existe. | -35% sur ROULEMENTS s'applique a tous les segments sauf SKF/Z16 qui a -40% |
| **PA** | Prix d'achat net CIR aupres du fournisseur (facture). | SKF 6205 : PA = 4.50 EUR |
| **PA effectif** | PA reel apres prise en compte des derogations et BFA. | SKF 6205 : PA aide = 3.80 EUR (derog) ou PA apres BFA = 4.34 EUR |
| **PV** | Prix de vente au client. | SKF 6205 : PV = 7.80 EUR |
| **ROI** | Responsable Organisation Interne. Manage l'equipe d'une agence. | ROI agence Bordeaux |
| **TCS** | Technico-Commercial Sedentaire. | TCS agence Bordeaux |
| **Direction** | Directeur d'agence ou responsable national. Vue multi-agence. | Directeur agence Toulouse |
| **Cellule marche** | Equipe nationale qui negocie les conditions avec les fournisseurs pour les grands comptes. | Negocie les derogations nationales |
| **Centre Logistique (CL)** | Plateforme logistique centrale CIR qui distribue les produits aux agences. Applique un surcout interne (coefficient CL + frais de ligne) sur les produits qu'il approvisionne. La source CL est determinee a la commande, pas au catalogue. | Roulement SKF commande via CL → PA majore du coef CL |
| **Coef CL** | Coefficient multiplicateur applique sur le PA effectif quand le produit est approvisionne via le Centre Logistique. Suit un heritage mega-famille → famille → sous-famille (le plus specifique l'emporte). Defaut : 1.0 (pas de surcout). | Coef CL 1.06 sur ROULEMENTS → PA 10€ devient 10.60€ |
| **Frais de ligne CL** | Forfait fixe par ligne de commande pour les produits du Centre Logistique, independant de la quantite commandee. Non integre au PA unitaire car par commande. | 2.50€/ligne : impact unitaire variable (qty=1 → +2.50€, qty=100 → +0.025€) |
