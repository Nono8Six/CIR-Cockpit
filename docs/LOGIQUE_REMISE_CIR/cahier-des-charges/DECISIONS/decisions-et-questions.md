# Decisions et questions

[Sommaire](../00-sommaire.md)

---

Ce document centralise **toutes les decisions actees** et les **questions** (resolues ou ouvertes) du module de tarification CIR, de la v1.0 a la v3.0.

Il constitue la **reference unique** pour arbitrer les choix d'implementation. Tout participant au projet (Direction, ROI, equipe technique) peut s'y referer pour comprendre le raisonnement derriere chaque choix.

**Convention de numerotation :**

- `Dxx` = Decision actee (irreversible sauf nouvelle decision explicite)
- `Qxx` = Question (ouverte ou resolue)

**Statistiques :**

- 51 decisions actees (D1-D51)
- 10 questions resolues (Q1, Q4, Q6, Q9-Q15)
- 9 questions ouvertes (Q2, Q3, Q5, Q7, Q8, Q16-Q19)

**Convention cascade (v3.2)** :

- **19 niveaux metier** = convention de pilotage/gouvernance
- **21 positions techniques effectives** = detail d'implementation du moteur (insertion des 4 forces de marque globale x 2 portees)
- Les deux formulations sont valides selon le contexte de discussion

---

## 1. Decisions actees

### 1.1 Decisions v1.0

Decisions fondatrices posees lors de la specification initiale. Elles definissent le perimetre de base du module : formule de marge, visibilite des prix d'achat, workflow de validation, et integration au CIR Cockpit existant.

| # | Decision | Choix | Date |
|---|----------|-------|------|
| D1 | Formule de marge | `(PV - PA) / PV x 100` | v1.0 |
| D2 | Colonnes tarifaires | Supprimees (simplification) | v1.0 |
| D3 | Visibilite PA | Visible par tous les TCS | v1.0 |
| D4 | Multi-agence | Non : 1 client = 1 agence | v1.0 |
| D5 | Validation | TCS -> ROI, tout passe par validation | v1.0 |
| D6 | Remise fabricant | Par famille OU par reference selon le fabricant | v1.0 |
| D7 | Format fichiers tarif | Chaque fabricant a son format, mapping dynamique | v1.0 |
| D8 | Architecture | Integre au CIR Cockpit existant | v1.0 |
| D9 | Connexion AS400 | Preparation uniquement, pas de connexion directe en v1 | v1.0 |
| D10 | Donnees POC | Vraies donnees, pas de donnees fictives | v1.0 -> v3.0 (corrigee) |

**Notes :**

- D1 : La formule de marge sur PV (et non sur PA) est le standard du negoce CIR. Elle ne change pas. Cette formule est utilisee partout : simulateur, tableau des conditions, alertes de marge, et export.
- D2 : Les colonnes tarifaires de l'ancien systeme (T1, T2, T3...) ajoutaient de la complexite sans valeur. Supprimees au profit d'un prix unique par reference.
- D3 : Choix delibere de transparence. Le TCS a besoin du PA pour negocier efficacement au telephone.
- D6 : Certains fabricants donnent des remises par famille (ex: toute la robinetterie a -35%), d'autres par reference unitaire. Le systeme doit gerer les deux.
- D9 : L'AS400 sera connecte en Phase 6. En v1, les donnees sont importees manuellement via les fichiers tarif fabricant.
- D10 : Initialement prevue avec un POC fictif, cette decision a ete corrigee en v3.0 (voir D36).

---

### 1.2 Decisions v2.0

Refonte majeure de l'UX. Introduction de la hierarchie des conditions, du simulateur de prix, et de la double portee client/groupement.

| # | Decision | Choix | Date |
|---|----------|-------|------|
| D11 | Nature de l'outil | Back-office commercial (pas de pricing temps reel telephone). La consultation de prix reste sur l'AS400. | v2.0 |
| D12 | Hierarchie des conditions | 7 niveaux : mega > famille > sous-fam > marque dans sfam > marque globale > segment > reference | v2.0 -> v3.0 (elargie) |
| D13 | Heritage | Le plus specifique l'emporte toujours, heritage automatique du large vers le fin | v2.0 |
| D14 | Double portee | Client (prioritaire) et Groupement (secondaire) a chaque niveau | v2.0 |
| D15 | Stockage | Toute condition stockee en remise % (sauf prix marche ref en EUR ou remise %) | v2.0 |
| D16 | Point d'entree | Deux modes de recherche : client et groupement | v2.0 |
| D17 | Prix marche par reference | Onglet dedie (pas dans l'arbre des conditions) | v2.0 |
| D18 | Affichage conditions | Deux modes : arbre hierarchique + tableau plat avec filtres | v2.0 |
| D19 | Edition | Inline dans le tableau/arbre (pas de Dialog pour l'edition unitaire) | v2.0 |
| D20 | Selection multiple | Toutes les actions disponibles en lot | v2.0 |
| D21 | Simulateur | Popover (pas Sheet lateral), 3 modes, cascade complete visible | v2.0 |
| D22 | Import prix marche | Excel avec verification (valide/warning/erreur), recherche fuzzy, alerte coherence | v2.0 |
| D23 | Groupement = meme logique | Les groupements ont des conditions a tous les niveaux, comme les clients | v2.0 |

**Notes :**

- D11 : Decision structurante. L'outil n'est pas un substitut a l'AS400 mais un complement pour la gestion des conditions. Le TCS continue de consulter les prix au telephone via l'AS400.
- D12 : Elargie en v3.0 avec l'ajout de la marque globale a 4 forces et la cascade 19 niveaux (voir D29 et D40).
- D14 : Le client prime toujours sur le groupement. C'est la regle de base de la cascade. Un client peut beneficier des conditions de son groupement si aucune condition client n'existe a ce niveau.
- D18 : Les deux modes (arbre et tableau) sont complementaires. L'arbre montre la hierarchie, le tableau permet la recherche et l'edition en masse.
- D19 : L'edition inline evite les aller-retours. Le TCS modifie directement dans le contexte, sans ouvrir de formulaire separe.
- D21 : Le simulateur en Popover reste a portee de clic sans quitter la vue courante. Les 3 modes sont : reference, panier, et comparaison client/groupement.
- D23 : Symetrie complete entre client et groupement. Cela simplifie le modele de donnees et l'UX.

---

### 1.3 Decisions v3.0

Refonte complete du modele. Cette version introduit la cascade a 19 niveaux, les derogations fournisseur, le BFA flexible, la marque globale a 4 forces, l'intelligence artificielle, la copie de conditions, et la separation METIER/TECHNIQUE des documents.

| # | Decision | Choix | Date | Source |
|---|----------|-------|------|--------|
| D24 | Prix marche GROUPEMENT | Ajoute dans la cascade en priorite 2 (apres prix marche client). Un prix marche groupement s'applique a tous les clients du groupement sauf si le client a son propre prix marche. | v3.0 | Retour revu.md |
| D25 | Auto-validation ROI / Direction | Le ROI et le directeur d'agence peuvent appliquer des conditions directement sans workflow de validation. Tracabilite complete via proposal auto-validee (statut='validee', valide_par=propose_par). Seul le TCS passe obligatoirement par la validation ROI. | v3.0 | Retour revu.md |
| D26 | Probleme reel identifie | Le probleme n'est pas l'AS400 (qui reste fonctionnel pour le pricing temps reel) mais l'interface web existante de gestion des conditions commerciales, trop complexe et inutilisee. 7 anti-patterns identifies. | v3.0 | Retour revu.md |
| D27 | Derogations fournisseur | Nouvelle entite `supplier_derogations` avec 3 portees (agence/nationale/globale), 3 cibles (client/groupement/tous), 3 types de valeur (prix_net/remise_pct/remise_supp_pct). Date de fin obligatoire. Impact le PA effectif utilise dans tous les calculs de marge. | v3.0 | Brainstorm |
| D28 | BFA flexible | Nouvelle entite `bfa_rates` avec taux par marque/CAT_FAB. 3 niveaux de fiabilite (confirme/estime/incertain). Double affichage marge (facture + BFA) partout. Direction gere les taux, ROI voit en lecture seule. Le coef_mini utilise PA apres BFA uniquement si fiabilite='confirme'. | v3.0 | Brainstorm |
| D29 | Marque globale a 4 forces | La marque globale peut etre posee avec 4 niveaux de force : prioritaire (surcharge sfam/fam/mega), forte (surcharge fam/mega), standard (surcharge mega), securite (filet de securite). TCS limite a standard/securite. Apercu cascade en temps reel montre l'impact de chaque force. | v3.0 | Brainstorm |
| D30 | Segment tarifaire 2D | Confirme : le segment reste un croisement 2D (marque x CAT_FAB) avec mapping 1:1 vers la sous-famille CIR. La cle unique est UNIQUE(marque, cat_fab). | v3.0 | Question resolue |
| D31 | Prix promo multi-niveau | Le prix promo n'est plus limite au segment. Il peut etre pose sur une reference, un segment, une sous-famille, une famille, ou une mega-famille. La regle "promo uniquement si plus favorable" reste la meme. | v3.0 | Retour revu.md |
| D32 | Remise mini / coef mini en cascade | Les filets de securite (remise mini, coef mini) suivent leur propre heritage : segment -> sous-famille -> famille -> mega-famille. Pas besoin de poser un coef mini sur chaque segment. | v3.0 | Retour revu.md |
| D33 | Copie de conditions | 3 directions possibles : client->client, groupement->groupement, client->groupement. Apercu avant/apres avec detection conflits. 3 strategies de resolution (garder existant, ecraser, prendre le meilleur). Les conditions copiees passent par le workflow normal. | v3.0 | Retour revu.md |
| D34 | Dates de validite renforcees | Date de fin avec presets (3m, 6m, 1an, permanent). Alertes d'expiration (badge nav + email). Derogations : date de fin obligatoire (pas de permanent). Conditions expirees tombent automatiquement au niveau parent. | v3.0 | Retour revu.md |
| D35 | Separation METIER / TECHNIQUE | Les documents du cahier des charges sont separes en METIER/ (Direction, ROI, commerciaux) et TECHNIQUE/ (equipe dev). Plus un dossier DECISIONS/ pour tous. | v3.0 | Retour revu.md |
| D36 | Donnees reelles uniquement | Pas de POC fictif. L'outil sera alimente avec les vraies hierarchies CIR, segments, clients, tarifs fabricant. | v3.0 | Retour revu.md |
| D37 | Intelligence artificielle | 8 cas d'usage IA integres des la v1, en 3 couches de cout (SQL gratuit, Mistral Small 3 faible cout, Mistral Medium 3 a la demande). Budget estime ~48 EUR/an. | v3.0 | Brainstorm |
| D38 | Filtres enrichis | Recherche par departement, ville, commercial, groupement, code client, SIRET. Selecteur agence visible pour Direction et Super Admin uniquement. | v3.0 | Retour revu.md |
| D39 | Consommation multi-annee | Selecteur de periode (annee en cours, N-1, personnalise). Comparaison N-1. Filtre segments avec/sans CA. Historique des marges par segment. | v3.0 | Retour revu.md |
| D40 | Cascade v3.0 a 19 niveaux | La cascade complete integre : ref clt/grp -> segment clt/grp -> marque/sfam clt/grp -> marque globale PRIO clt/grp -> sfam clt/grp -> marque globale SECU clt/grp -> fam clt/grp -> mega clt/grp -> promo -> mini -> coef -> tarif | v3.0 | Brainstorm |
| D41 | Apercu cascade temps reel | Toutes les interfaces d'edition montrent l'apercu cascade en temps reel. L'utilisateur voit le resultat concret de sa modification avant de proposer. | v3.0 | Brainstorm |
| D42 | Import tarif 4 modes | Tarif complet, tarif seul, remises seules, PA direct. Chaque fabricant ayant un format different, l'import s'adapte. | v3.0 | Retour revu.md |
| D43 | Historisation stricte des prix | Chaque import cree des entrees dans supplier_products_history avec prix avant/apres, delta, et pricelist source. | v3.0 | Retour revu.md |
| D44 | Derogations : qui gere | Portee agence = ROI + Direction. Portee nationale = Direction + cellule marche. Portee globale = Direction + service achats. | v3.0 | Question resolue |
| D45 | BFA : qui gere | Direction gere les taux. ROI voit en lecture seule et peut signaler des incoherences. TCS ne voit pas les taux bruts mais voit la marge BFA calculee. | v3.0 | Question resolue |
| D46 | Alertes | In-app (badge + filtre "expire bientot") + email recapitulatif hebdomadaire (conditions expirant dans 15 jours). | v3.0 | Question resolue |
| D47 | Centre Logistique : coefficient interne + frais de ligne | Le CL applique un surcout interne via un coefficient multiplicateur (coef_CL) sur le PA effectif + frais de ligne fixes (2.50€/ligne). Le coef CL suit l'heritage mega → famille → sous-famille (le plus specifique l'emporte). Les frais de ligne sont par commande et non integres au PA unitaire. Table `cl_coefficients` + `cl_config`. | v3.1 | Brainstorm |
| D48 | Source d'approvisionnement determinee a la commande | La source (stock agence, Centre Logistique, autre agence, achat direct) est determinee a la commande, pas au catalogue. L'outil back-office ne peut pas savoir a l'avance si un produit viendra du CL. Il simule donc les marges avec et sans CL (double/triple affichage). Les conditions de remise restent independantes de la source. | v3.1 | Brainstorm |
| D49 | Triple affichage marge : facture, CL, BFA | Partout ou une marge est affichee, l'outil montre trois valeurs : marge facture (PA effectif), marge CL (PA x coef_CL, indicative), marge BFA (PA apres BFA). Le toggle "Produit du CL ?" dans le simulateur permet de recalculer. Le coef_mini reste base sur le PA_effectif sans CL. | v3.1 | Brainstorm |
| D50 | Modele de roles canonique | Les roles techniques de reference sont `super_admin`, `agency_admin`, `tcs`. Les termes `direction` et `roi` restent des labels metier (alias) mappes sur ces roles techniques selon le perimetre. | v3.2 | Arbitrage pilotage |
| D51 | Auto-validation TCS | Supprimee. Toute proposition TCS passe obligatoirement par validation `agency_admin` (alias metier ROI). | v3.2 | Arbitrage pilotage |

**Notes :**

- D24 : Le prix marche groupement comble un manque identifie en v2.0. Sans ce mecanisme, chaque client du groupement devait avoir son propre prix marche, ce qui creait de la duplication.
- D25 : Cette decision simplifie considerablement le workflow pour le ROI. Le systeme de proposals est conserve pour la tracabilite, mais le ROI n'attend pas de validation. Cela reflete la realite terrain : le ROI est deja habilite a decider.
- D26 : Decision cle qui recadre l'objectif du projet. L'AS400 n'est pas le probleme ; c'est l'interface web de gestion des conditions qui doit etre remplacee. Les 7 anti-patterns identifies justifient une refonte complete de l'UI.
- D27-D28 : Les derogations fournisseur et le BFA sont les deux ajouts majeurs de la v3.0 en termes de modele de donnees. Ils permettent enfin de calculer la marge reelle (pas seulement la marge facture).
- D29 : La marque globale a 4 forces est le mecanisme le plus complexe de la cascade. L'apercu en temps reel (D41) est indispensable pour que l'utilisateur comprenne l'impact de son choix de force.
- D31 : L'extension du prix promo a tous les niveaux de la hierarchie permet des operations promotionnelles plus larges (ex: -5% sur toute la famille chauffage pendant un mois).
- D33 : La copie de conditions est un gain de temps majeur pour le ROI lors de l'ouverture d'un nouveau client similaire a un client existant.
- D34 : Les dates de validite renforcees evitent les conditions "oubliees" qui restent actives indefiniment. Le mecanisme de tombee automatique au niveau parent garantit la coherence.
- D37 : L'IA est un differenciateur. Les 8 cas d'usage ont ete choisis pour leur ROI immediat, pas pour l'effet vitrine.
- D40 : La cascade 19 niveaux est le coeur du moteur de calcul. Toute modification de la cascade doit etre documentee ici et validee par la Direction.
- D42-D43 : L'import tarif est le point d'entree des donnees fournisseur. L'historisation stricte permet de tracer l'evolution des prix d'achat dans le temps.
- D47-D49 : Le Centre Logistique introduit un mecanisme de surcout interne qui n'affecte PAS la cascade des conditions. C'est un calcul de marge supplementaire (indicatif) pour que le commercial visualise l'impact si le produit est approvisionne via le CL. Les creations simplifiees (stock agence, achat direct) ne rentrent pas dans le processus de conditions. Le triple affichage marge (facture/CL/BFA) remplace le double affichage precedent.
- D50 : Le mapping des droits et policies RLS doit s'appuyer sur les roles techniques existants dans le codebase. Les libelles metier "ROI/Direction" sont conserves pour l'UX et la gouvernance.
- D51 : Le workflow TCS est strictement "proposer -> valider/refuser". Aucune auto-validation TCS, meme en dessous d'un seuil.

---

## 2. Questions resolues (v3.0)

Questions posees lors des versions precedentes et resolues dans le cadre de la v3.0. Chaque resolution renvoie vers la decision correspondante.

La resolution de ces 10 questions a permis de debloquer la specification complete de la v3.0, notamment la cascade 19 niveaux (Q9, Q10), les droits d'acces (Q4, Q11, Q13), et le perimetre fonctionnel (Q6, Q12, Q14, Q15).

| # | Question originale | Resolution | Source |
|---|-------------------|------------|--------|
| Q1 | Categorie tarifaire (ancien niveau) | Inclus dans le segment via cat_fab. Pas de niveau separe. | v2.0 |
| Q4 | Le ROI peut-il valider ses propres propositions ? | OUI - auto-validation. Le ROI applique directement (D25). | v3.0 |
| Q6 | Condition par marque : dans une sous-famille ou globale ? | LES DEUX. Marque dans sous-famille (condition fine) + marque globale avec 4 forces (D29). | v3.0 |
| Q9 | Position marque dans la cascade | 4 niveaux de force (prioritaire/forte/standard/securite). Choix a la pose avec apercu cascade temps reel. | v3.0 |
| Q10 | Segment 2D ou 5D ? | 2D confirme (marque x cat_fab, mapping 1:1 vers sous-famille CIR). | v3.0 |
| Q11 | Derogations : qui gere quoi ? | 3 portees, 3 niveaux de permission (D44). | v3.0 |
| Q12 | BFA : detail mecanique | Modele flexible avec fiabilite, pas de modelisation des paliers complexes (D28). | v3.0 |
| Q13 | BFA : qui gere les taux ? | Direction uniquement, ROI en lecture seule (D45). | v3.0 |
| Q14 | Interface existante : quel probleme exact ? | 7 problemes identifies : 2 modes isoles, ordre selection = priorite, conditions invisibles, zero contexte, pas de derogations, BFA invisible, prix marche via Excel (D26). | v3.0 |
| Q15 | Derogations globales : beneficiaires ? | Toutes les agences (D27). | v3.0 |

---

## 3. Questions ouvertes

Questions restant a trancher. Classees par priorite pour faciliter le suivi en reunion de pilotage.

Les questions ouvertes sont revues en reunion de pilotage. Lorsqu'une question est tranchee, elle est deplacee dans la section "Questions resolues" avec la reference de la decision correspondante et la date de resolution.

### 3.1 Priorite moyenne

Ces questions doivent etre tranchees avant la fin de la Phase 3 (UI conditions). Elles impactent directement l'experience utilisateur et le dimensionnement technique.

| # | Question | Impact | Priorite |
|---|----------|--------|----------|
| Q3 | Volume reel de references produit par client pour les prix marche ? | Dimensionnement pagination, UX de l'onglet Prix marche. Si plus de 500 refs par client, la virtualisation est necessaire. | Moyenne |
| Q7 | Nombre de niveaux de l'arbre (profondeur) | 7+ niveaux peuvent rendre l'arbre profond. Collapsing automatique des niveaux vides recommande. Test UX a prevoir avec un ROI. | Moyenne |
| Q8 | Conditions groupement sur fiche client : detail cascade visible ? | Si cascade groupement visible, le TCS comprend mieux la provenance d'une condition. Recommande : afficher la source (badge "Grp") + tooltip detail. | Moyenne |
| Q19 | Categorie tarifaire complete : mecanisme detaille ? | Cat_fab est deja dans le segment, mais le mecanisme de mapping AS400 doit etre clarifie pour l'import initial des donnees. | Moyenne (Phase 6) |

### 3.2 Priorite basse

Ces questions peuvent attendre les phases ulterieures (Phase 5+). Elles n'impactent pas les phases de developpement initiales mais doivent etre anticipees dans l'architecture.

| # | Question | Impact | Priorite |
|---|----------|--------|----------|
| Q2 | Politique de revision periodique formalisee ? | Pourrait generer des "revisions a faire" automatiquement. Mode revision propose dans les idees IA. Non bloquant pour les phases 1-4. | Basse (Phase 5) |
| Q5 | Notifications : quel canal exact ? | In-app (badge) + email hebdomadaire decides (D46). Notifications push Supabase Realtime a evaluer pour les alertes urgentes. | Basse (Phase 5) |
| Q16 | Connexion AS400 : API ou fichier plat ? | Impact architecture Phase 6. A definir avec l'equipe IT/AS400. Determinera si l'export est temps reel ou batch. | Basse (Phase 6) |
| Q17 | Export AS400 : quelles conditions synchroniser ? | Toutes les validees ? Seulement les nouvelles ? Delta depuis dernier export ? La reponse impacte la volumetrie et la frequence. | Basse (Phase 6) |
| Q18 | Dashboard direction : quels KPIs ? | Marge par agence, par famille, tendances, top/flop clients, anomalies. A brainstormer avec la Direction avant la Phase 5. | Basse (Phase 5+) |

---

## 4. Synthese des evolutions entre versions

Le tableau suivant resume les axes d'evolution majeurs entre les trois versions du cahier des charges :

| Axe | v1.0 | v2.0 | v3.0 |
|-----|------|------|------|
| **Cascade** | Concept de hierarchie | 7 niveaux formalises | 19 niveaux avec double portee |
| **Marque globale** | -- | 1 niveau unique | 4 forces (PRIO/FORTE/STD/SECU) |
| **Portee** | Client uniquement | Client + Groupement | Client + Groupement + prix marche grp |
| **Derogations** | -- | -- | 3 portees, 3 cibles, 3 types |
| **BFA** | -- | -- | Taux flexibles, 3 fiabilites |
| **Promos** | -- | Segment uniquement | Multi-niveau (ref a mega) |
| **Validation** | TCS -> ROI | TCS -> ROI | TCS -> ROI, ROI/Direction auto-valide (pas d'auto-validation TCS) |
| **Import tarif** | Fichier fabricant | Fichier + prix marche Excel | 4 modes + historisation stricte |
| **Dates** | -- | Date debut/fin basique | Presets, alertes, tombee auto |
| **IA** | -- | -- | 8 cas d'usage, 3 couches de cout |
| **Copie conditions** | -- | -- | 3 directions, 3 strategies conflits |
| **Centre Logistique** | -- | -- | Coef CL + frais ligne, triple marge |
| **Filets securite** | -- | Coef mini basique | Remise mini + coef mini en cascade |

---

## 5. Regles d'arbitrage

Ces regles s'appliquent a la gestion de ce document :

1. **Ajout de decision** : toute nouvelle decision recoit un numero sequentiel (D47, D48...) avec date et source.
2. **Resolution de question** : la question passe de "ouvertes" a "resolues" avec la reference de la decision correspondante.
3. **Conflit entre decisions** : la plus recente l'emporte, sauf mention contraire explicite dans la nouvelle decision.
4. **Decisions corrigees** : les decisions modifiees conservent la mention "(corrigee)" avec la plage de versions (ex: `v1.0 -> v3.0`).
5. **Nouvelles questions** : numerotation sequentielle (Q20, Q21...) avec priorite et phase cible.
6. **Validation** : toute decision impactant le modele metier (cascade, droits, workflow) doit etre validee par la Direction avant implementation.

---

## 6. Matrice de tracabilite

Liens entre les decisions et les documents de specification :

| Decision | Document METIER | Document TECHNIQUE |
|----------|----------------|--------------------|
| D1, D15, D40 | Cascade et calcul de prix | Schema de donnees, moteur de calcul |
| D5, D25, D33 | Workflow de validation | Tables proposals, triggers |
| D11, D26 | Positionnement du produit | -- |
| D12, D13, D14, D29 | Hierarchie des conditions | Fonction `resolve_cascade()` |
| D17, D22, D24 | Prix marche | Import Excel, onglet prix marche |
| D27, D44 | Derogations fournisseur | Table `supplier_derogations`, RLS |
| D28, D45 | BFA | Table `bfa_rates`, calcul marge BFA |
| D34, D46 | Dates et alertes | Cron alertes, email hebdomadaire |
| D37 | Intelligence artificielle | Couches IA, budget, prompts |
| D38, D39 | Filtres et consommation | Requetes, indexes, pagination |
| D42, D43 | Import tarifs fabricant | Pipeline d'import, historisation |
| D47, D48, D49 | Centre Logistique | Tables `cl_coefficients`, `cl_config`, fonction `resolve_cl_coefficient()`, RLS, triple marge |
| D50, D51 | Roles et workflow | Mapping roles techniques canonique, suppression auto-validation TCS |

---

## 7. Glossaire des termes utilises dans les decisions

| Terme | Definition |
|-------|-----------|
| **PA** | Prix d'Achat. Prix auquel CIR achete le produit au fournisseur. |
| **PV** | Prix de Vente. Prix propose au client. |
| **BFA** | Bonus de Fin d'Annee. Ristourne versee par le fournisseur sur le CA annuel. |
| **CAT_FAB** | Categorie tarifaire fabricant. Classification propre au fournisseur. |
| **TCS** | Technico-Commercial Sedentaire. Operateur principal de l'outil. |
| **ROI** | Responsable des Operations Interieures. Valide les conditions proposees par les TCS. |
| **Cascade** | Algorithme de resolution des conditions. Parcourt 19 niveaux du plus specifique (reference) au plus general (tarif fabricant). |
| **Segment** | Croisement 2D (marque x cat_fab) avec mapping vers la sous-famille CIR. |
| **Derogation** | Condition speciale accordee par un fournisseur, limitee dans le temps. |
| **Proposal** | Proposition de condition par un TCS, soumise a validation ROI. |
| **Centre Logistique (CL)** | Plateforme logistique centrale CIR. Applique un surcout interne (coef CL + frais de ligne) sur les produits qu'il distribue aux agences. |
| **Coef CL** | Coefficient multiplicateur applique sur le PA effectif quand le produit vient du CL. Heritage mega → famille → sous-famille. |
| **Groupement** | Regroupement de clients partageant des conditions commerciales communes. |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 28/02/2026 | Specification initiale (D1-D10, Q1-Q5) |
| 2.0 | 28/02/2026 | Refonte majeure UX (D11-D23, Q6-Q8) |
| 3.0 | 01/03/2026 | Refonte complete : cascade 19 niveaux, derogations, BFA, marque globale 4 forces, IA, copie conditions, separation METIER/TECHNIQUE (D24-D46, Q9-Q19 resolues/ouvertes) |
| 3.1 | 01/03/2026 | Integration Centre Logistique : coefficient CL par hierarchie produit, frais de ligne, triple affichage marge, ecran admin CL, regles R67-R72 (D47-D49) |
| 3.2 | 01/03/2026 | Alignements de gouvernance : roles techniques canonique (`super_admin`, `agency_admin`, `tcs`), suppression auto-validation TCS, convention "19 niveaux metier / 21 positions techniques" (D50-D51) |
