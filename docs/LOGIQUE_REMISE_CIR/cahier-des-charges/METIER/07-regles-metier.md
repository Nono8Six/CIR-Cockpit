# 7. Regles metier

[← Prix, derogations et BFA](./06-ecrans-prix-derogations.md) | [Sommaire](../00-sommaire.md) | [Intelligence artificielle →](./08-intelligence-artificielle.md)

---

## 7.1 - Regles de la cascade et de l'heritage

| # | Regle | Impact |
|---|-------|--------|
| R1 | **Le plus specifique l'emporte** : une condition au niveau segment surcharge une condition au niveau marque, qui surcharge sous-famille, etc. | Fondement de toute la logique de tarification |
| R2 | **Client prioritaire sur groupement** : a chaque niveau de hierarchie, une condition client surcharge une condition groupement | Le moteur cherche d'abord client, puis groupement, puis remonte |
| R3 | **Heritage automatique** : une condition posee a un niveau large (ex: mega-famille) s'applique automatiquement a tous les niveaux inferieurs qui n'ont pas de condition plus specifique | Pas besoin de dupliquer une condition sur chaque segment |
| R4 | **Le prix marche est prioritaire sur la promo** : si la source gagnante est un prix marche (client ou groupement), la promo ne s'applique pas | Protection des accords prix marche |
| R5 | **Le coef mini est un seuil d'alerte** : verifier `PV >= PA_effectif x Coef Mini` sans blocage automatique | Alerte (non bloquante) si une condition viole le seuil |
| R6 | **La remise mini est le defaut** en l'absence de toute condition specifique | S'applique si aucune condition client/groupement n'est trouvee a aucun niveau |
| R7 | **Une condition expiree tombe automatiquement** au niveau suivant | Gere par `date_fin` : quand depassee, le moteur l'ignore et remonte |
| R8 | **Unicite des conditions** : une seule condition active par (scope, client/group, hierarchy_level, niveau de hierarchie) | Toute nouvelle condition archive la precedente |
| R9 | **Prix marche groupement** : un prix marche peut etre pose au niveau groupement. Il s'applique a tous les clients du groupement sauf si le client a son propre prix marche sur cette reference | Priorite 2 dans la cascade, apres le prix marche client |
| R10 | **Remise mini / coef mini en cascade** : ces filets de securite suivent leur propre heritage (segment > sous-famille > famille > mega-famille) | Pas besoin de poser un coef mini sur chaque segment |

## 7.2 - Regles de la marque globale

| # | Regle | Impact |
|---|-------|--------|
| R11 | **4 forces possibles** : prioritaire, forte, standard, securite. La force determine la position dans la cascade | L'utilisateur choisit au moment de la pose, avec apercu en temps reel |
| R12 | **TCS limite a standard/securite** : seuls ROI+ peuvent poser des marques globales en mode prioritaire ou forte | Protection contre les abus |
| R13 | **Alerte de surcharge** : quand une marque globale surcharge des conditions existantes, une alerte est affichee | "Cette condition marque ecrase 3 conditions famille existantes" |
| R14 | **Badge de force visible** : chaque condition marque globale affiche sa force en badge colore dans l'arbre | Lisibilite immediate (🔴 Prio, 🟠 Forte, 🟢 Standard, ⚪ Securite) |

## 7.3 - Regles de validation

| # | Regle | Impact |
|---|-------|--------|
| R15 | **TCS : toute modification passe par validation ROI** | Le TCS propose, le ROI valide ou refuse |
| R16 | **ROI / Direction / Super Admin : application directe** | Pas de workflow de validation, mais tracabilite complete |
| R17 | **Le commentaire est obligatoire sur un refus** | Le TCS doit comprendre pourquoi sa proposition est refusee |
| R18 | **Le motif est obligatoire sur une proposition** (min 10 caracteres) | Le ROI doit comprendre pourquoi le TCS propose ce changement |
| R19 | **L'historique est immutable** : on archive, on ne modifie jamais | Tracabilite complete des modifications |
| R20 | **Les propositions en lot** creent N propositions individuelles avec un motif commun | Le ROI peut valider/refuser chacune independamment |
| R21 | **Les alertes coef mini et coherence** sont transmises au ROI | L'alerte est visible dans le tableau de validation |
| R22 | **Auto-validation ROI** : quand un ROI+ applique une condition, une proposition est quand meme creee pour la tracabilite (statut = 'validee', valide_par = propose_par) | Audit trail complet meme pour les applications directes |

## 7.3b - Regle TCS (sans auto-validation)

| # | Regle | Impact |
|---|-------|--------|
| R22b | **Aucune auto-validation TCS** : toute proposition TCS reste soumise a validation `agency_admin` (alias metier ROI) | Workflow uniforme et controle |

## 7.4 - Regles des derogations fournisseur

| # | Regle | Impact |
|---|-------|--------|
| R23 | **Date de fin obligatoire** : toute derogation fournisseur a une date d'expiration (pas de "permanent") | Les offres fournisseurs ont toujours une echeance |
| R24 | **Cascade de resolution du PA** : reference client > reference groupement > reference globale > CAT_FAB client > CAT_FAB groupement > CAT_FAB globale > PA standard | Le PA le plus specifique l'emporte |
| R25 | **Impact global** : quand une derogation change le PA, TOUTES les marges affichees (arbre, tableau, simulateur) utilisent le PA aide | Le TCS voit la marge reelle, pas la marge theorique |
| R26 | **Alerte d'expiration** : 15 jours avant l'expiration d'une derogation, alerte au ROI et au TCS | Anticipation de la baisse de marge |
| R27 | **Portee Agence** : seul le ROI de l'agence (ou Direction) peut creer/modifier | Protection du perimetre |
| R28 | **Portee Nationale/Globale** : seule la Direction peut creer/modifier | Controle centralise |

## 7.5 - Regles des BFA

| # | Regle | Impact |
|---|-------|--------|
| R29 | **Double affichage marge** : partout ou une marge est affichee, montrer la marge facture ET la marge apres BFA | Le TCS voit la marge reelle |
| R30 | **Fiabilite conditionne le coef_mini** : si BFA 'confirme', le coef_mini utilise le PA apres BFA. Si 'estime' ou 'incertain', le coef_mini utilise le PA facture | Protection contre les calculs sur des donnees incertaines |
| R31 | **Gestion Direction uniquement** : seule la Direction peut creer/modifier les taux BFA | Controle centralise de l'information sensible |
| R32 | **ROI en lecture seule** : le ROI voit les taux BFA mais ne peut pas les modifier | Visibilite sans risque de modification |

## 7.6 - Regles de stockage

| # | Regle | Impact |
|---|-------|--------|
| R33 | **Toute condition (hors prix marche ref) est stockee en remise %** | Le TCS raisonne en marge via le simulateur, conversion a la saisie |
| R34 | **Les prix marche par reference** sont stockes en prix fixe EUR ou en remise % selon le choix | Le type de valeur est conserve |
| R35 | **Les conditions globales** (promo, mini, coef) sont dans une table separee | Pas de confusion avec les conditions client/groupement |

## 7.7 - Regles d'import de tarifs fabricant

| # | Regle | Impact |
|---|-------|--------|
| R36 | **4 modes d'import** : tarif complet, tarif seul, remises seules, PA direct | S'adapte a tous les formats fabricant |
| R37 | Une reference existante est mise a jour, jamais dupliquee | Cle unique (marque, reference) |
| R38 | Les references absentes d'un reimport ne sont pas supprimees | Conservation de l'historique |
| R39 | **Import partiel controle** : seules les lignes valides sont importees apres confirmation explicite de l'utilisateur, avec rapport detaille des rejets | Coherence + pragmatisme operationnel |
| R40 | Le template de mapping est sauvegardable et reutilisable | Gain de temps sur reimports |
| R41 | **Historisation stricte** : chaque import cree une version avec prix avant/apres | Tracabilite complete des changements de prix |
| R42 | **Analyse delta** : a chaque import, comparaison avec l'import precedent (hausse/baisse, impact marges) | Le ROI sait immediatement l'impact d'une hausse tarif |

## 7.8 - Regles d'import de prix marche par reference

| # | Regle | Impact |
|---|-------|--------|
| R43 | **Recherche fuzzy** pour les references inconnues : le systeme propose des correspondances proches | L'utilisateur corrige en un clic |
| R44 | Les references non trouvees et non corrigees sont **rejetees et tracees** dans le rapport d'import | Pas de donnees orphelines |
| R44b | **Blocage qualite** : si le taux de references non trouvees depasse 5% du fichier, l'import est bloque (pas de forcage) | Evite les imports partiels de faible qualite |
| R45 | **Alerte de coherence** : si un prix marche est moins avantageux que la remise segment, l'utilisateur est averti | Le prix marche est prioritaire, le client paierait plus cher |
| R46 | L'import de prix marche par un TCS cree des **propositions** soumises a validation ROI. Un ROI+ importe directement. | Workflow adapte au role |

## 7.9 - Regles de copie de conditions

| # | Regle | Impact |
|---|-------|--------|
| R47 | **3 directions de copie** : client → client, groupement → groupement, client → groupement | Flexibilite maximale |
| R48 | **Apercu avant/apres** obligatoire avec detection des conflits | Pas de copie a l'aveugle |
| R49 | **3 strategies de resolution de conflit** : garder existant, ecraser, prendre le meilleur | L'utilisateur choisit la strategie |
| R49b | **Definition de "prendre le meilleur"** : choisir la condition qui donne le **PV client le plus bas** tout en respectant `marge_facture >= seuil_global_unique` | Resolution deterministe des conflits |
| R50 | **Tracabilite** : chaque condition copiee est marquee avec la source (champ `source_copy_from`) | On sait d'ou vient la copie |
| R51 | Toutes les conditions copiees passent par le **workflow normal** (TCS → proposition, ROI+ → direct) | Pas de raccourci |

## 7.10 - Regles de dates de validite

| # | Regle | Impact |
|---|-------|--------|
| R52 | **Choix explicite** de la date de fin a la creation : presets 3 mois, 6 mois, 1 an, Permanente | Le TCS fait un choix conscient |
| R53 | **Derogations : date de fin obligatoire** (pas de "permanent" pour les derogations) | Les offres fournisseurs ont toujours une echeance |
| R54 | **Alerte d'expiration** : badge dans la navigation quand des conditions expirent dans les 30 jours | Anticipation |
| R55 | **Email recapitulatif** hebdomadaire : liste des conditions qui expirent bientot | Le ROI ne rate rien |
| R56 | **Expiration automatique** : quand `date_fin` est depassee, la condition passe en statut 'expiree' et le niveau parent reprend | Pas d'intervention manuelle necessaire |

## 7.11 - Regles d'affichage

| # | Regle | Impact |
|---|-------|--------|
| R57 | **La source de chaque condition** est toujours visible (client direct, groupement, herite de parent, mini, coef) | Le TCS comprend d'ou vient le prix |
| R58 | **La marge est coloree** selon les seuils (< 15% rouge, 15-25% orange, 25-35% jaune, > 35% vert) | Reperage visuel immediat |
| R59 | **Les conditions groupement sont en lecture seule** sur la fiche client | Pour les modifier, aller sur la fiche groupement |
| R60 | **Les prix marche sont signales** dans l'arbre (`📌 N prix marche`) avec lien vers l'onglet Prix marche | Navigation fluide |
| R61 | **Le PA effectif** est affiche partout (avec indicateur si derogation ou BFA actif) | Contexte complet |
| R62 | **L'apercu cascade est visible en temps reel** dans toutes les interfaces d'edition | L'utilisateur voit le resultat avant de proposer |
| R63 | **Le verdict** est affiche lors de l'edition : remise plus favorable au client ou a CIR | Decision eclairee en un coup d'oeil |

## 7.12 - Regles de detection d'incoherences

| # | Regle | Impact |
|---|-------|--------|
| R64 | **Ecart segment/parent** : si une condition segment est plus genereuse que la condition parent de > X pp, signaler | "SKF/Z16 -40% mais sous-fam RIGIDES -30% : ecart 10pp, normal ?" |
| R65 | **Condition sans vente** : si une condition active n'a genere aucune vente depuis > 12 mois, signaler | "TIMKEN/SET_BR : 0 ventes en 12 mois malgre condition -28%" |
| R66 | **Marge critique** : si une condition produit une marge < seuil critique ET n'a pas ete revisee depuis > Y mois, signaler | "FESTO/VER_ISO MECAPLUS : marge 14.2%, non revisee depuis 14 mois" |

## 7.13 - Regles du Centre Logistique

| # | Regle | Impact |
|---|-------|--------|
| R67 | **Heritage du coef CL** : le coefficient CL suit l'heritage mega-famille → famille → sous-famille. Le niveau le plus specifique l'emporte. Si aucun coefficient n'est pose, le defaut est 1.0 (pas de surcout). | Meme logique que remise_mini / coef_mini |
| R68 | **Application conditionnelle** : le coef CL ne s'applique que lorsque le produit est approvisionne via le Centre Logistique. La source d'approvisionnement est determinee a la commande, pas au catalogue. | L'outil simule la marge CL mais ne peut pas savoir a l'avance si le produit viendra du CL |
| R69 | **Frais de ligne fixes** : les frais de ligne CL (2.50€) sont un forfait fixe par ligne de commande, independant de la quantite commandee. Ils ne sont PAS integres au PA unitaire. | Mentionnes a titre indicatif dans le simulateur avec impact estime selon la quantite |
| R70 | **Independance des conditions** : les conditions de remise (cascade des 19 niveaux) sont independantes de la source d'approvisionnement. Le CL ne modifie pas la cascade ni le PV client. | Le CL n'affecte que le PA vu par l'agence et donc la marge affichee |
| R71 | **Affichage indicatif** : l'affichage marge CL est une simulation (indicative) dans l'outil back-office. Le triple affichage marge (facture, CL, BFA) permet au commercial de voir l'impact du CL. | Le TCS visualise la marge degradee si le produit vient du CL |
| R72 | **Gestion des coefficients CL** : seuls les super_admin et agency_admin peuvent modifier les coefficients CL et la configuration CL (frais de ligne, frais de port inter-agence). | Controle centralise des parametres CL |

## 7.14 - Decisions structurantes documentees

### Remises quantitatives (Decision : hors perimetre v3.0)

| # | Regle | Impact |
|---|-------|--------|
| D1 | **Pas de champ `quantite_minimum`** dans cette version. Les conditions CIR sont des remises negociees par segment/marque, pas par volume de commande. | Simplifie la cascade (19 niveaux x N paliers = explosion combinatoire evitee) |
| D2 | **Les remises quantitatives sont gerees cote AS400** (commandes/facturation). Si le besoin emerge, il sera traite en Phase 6 lors de la sync AS400, ou via un champ `commentaire` sur la condition. | Separation des responsabilites CIR Cockpit (negociation) vs AS400 (execution) |

### BFA et derogation prix_net : cumul

| # | Regle | Impact |
|---|-------|--------|
| D3 | **Le BFA s'applique toujours sur le PA effectif** (apres derogation eventuelle). Les deux mecanismes sont cumulatifs et independants. | Formule : `PA_apres_bfa = PA_effectif_deroge x (1 - taux_bfa / 100)` |
| D4 | **Justification** : le BFA est un accord annuel distinct entre CIR et le fournisseur (ristourne de fin d'annee). Une derogation prix_net est une aide ponctuelle sur une operation specifique. Les deux negociations sont independantes. | Coherent avec le code SQL existant (`v_pa_apres_bfa := v_pa_effectif * (1 - v_taux_bfa / 100)`) |
