# 3. Logique de tarification

[← Hierarchie produit](./02-hierarchie-produit.md) | [Sommaire](../00-sommaire.md) | [Roles et workflows →](./04-roles-workflows.md)

---

## 3.1 - Vue d'ensemble du calcul de prix

Le prix net client est determine en **deux etapes** :
1. **Resolution du PA effectif** : determiner le vrai prix d'achat (derogations fournisseur, BFA)
2. **Resolution du PV** : appliquer la cascade de remises pour trouver le prix de vente

Puis deux controles :
3. **Comparaison promo** : uniquement si la source gagnante n'est pas un prix marche
4. **Verification coef mini** : signaler si le prix est en dessous du seuil

## 3.2 - Etape 1 : Resolution du PA effectif

Le PA standard est calcule a partir du prix public et de la remise fabricant :
```
PA standard = Prix public x (1 - Remise fabricant / 100)
```

Mais le PA reel peut etre different grace a deux mecanismes :

### Derogations fournisseur (prix aides)

Un fabricant peut accorder un prix special a CIR pour un client ou groupement specifique. Ca change le **PA**, pas le PV directement.

**Cascade de resolution du PA** :
```
Pour une reference R, un client C dans le groupement G :

  1. Derogation reference pour C ?              → PA = prix aide
  2. Derogation reference pour G ?              → PA = prix aide
  3. Derogation reference globale (tous) ?      → PA = prix aide
  4. Derogation CAT_FAB pour C ?                → PA = prix_public x (1 - derog%)
  5. Derogation CAT_FAB pour G ?                → PA = prix_public x (1 - derog%)
  6. Derogation CAT_FAB globale (tous) ?        → PA = prix_public x (1 - derog%)
  7. Sinon : PA standard                        → PA = prix_public x (1 - remise_fab)
```

Si le type de derogation est "remise supplementaire", c'est un cumul :
```
PA = PA_standard x (1 - remise_supp / 100)
```

**Exemples concrets** :
- SKF accorde un prix aide a -70% (au lieu de -64% standard) sur Z16 pour AIRBUS → PA = 12.50 x 0.30 = 3.75 EUR (au lieu de 4.50 EUR)
- FESTO accorde un prix net de 75 EUR (au lieu de 92.50 EUR PA standard) sur les verins ISO pour le groupement Aeronautique
- PARKER donne une remise supplementaire de 5% sur HYD_FLEX pour SAFRAN → PA = PA_standard x 0.95

### Surcout Centre Logistique (CL)

Le Centre Logistique (CL) de CIR distribue les produits aux agences et applique un **surcout interne** sur les produits qu'il approvisionne. Ce mecanisme finance le fonctionnement du CL.

**4 sources d'approvisionnement** :
1. **Stock agence** → pas de surcout
2. **Centre Logistique** → coef_CL + 2.50€/ligne
3. **Autre agence** → coefficient + 12€ frais de port (+ eventuellement 2.50€/ligne)
4. **Achat direct fournisseur** → pas de surcout

**Coefficient CL** : multiplie le PA effectif pour obtenir le PA vu par l'agence :
```
PA_agence_CL = PA_effectif x coef_CL
```

Le coef CL suit un **heritage** : mega-famille → famille → sous-famille. Le niveau le plus specifique l'emporte. Si aucun coefficient n'est pose, le defaut est **1.0** (pas de surcout). Le responsable produit de chaque famille gere les coefficients CL.

**Frais de ligne** : +2.50€ par ligne de commande (fixe, independant de la quantite). Ces frais sont **hors calcul unitaire** car ils dependent de la commande, pas du produit. A titre indicatif dans le simulateur :
```
Note : frais de ligne CL +2.50€/ligne non inclus dans le PA unitaire
Impact si qty=1 : +2.50€/unite | qty=10 : +0.25€/unite | qty=100 : +0.025€/unite
```

> **Important** : Les conditions de remise (la cascade des 19 niveaux) restent **100% independantes** de la source d'approvisionnement. Le CL n'affecte que le PA vu par l'agence, donc la marge affichee. Le PV client ne change pas.

> **Note coef_mini** : Le coef_mini utilise le PA_effectif (sans CL) pour la verification plancher. Le CL est un mecanisme interne qui ne doit pas rendre les conditions plus restrictives pour les commerciaux.

### BFA (Bonus de Fin d'Annee)

Le BFA est une remise fournisseur **differee** :
1. CIR achete au PA standard (la marge instantanee peut etre negative)
2. CIR vend les produits
3. Periodiquement, CIR declare les volumes vendus au fabricant
4. Le fabricant emet un avoir commercial (credit note)
5. Le "vrai" cout d'achat est : PA facture - BFA recupere

```
PA apres BFA = PA x (1 - taux_BFA / 100)
```

**Affichage triple marge** : Partout ou une marge est affichee, l'outil montre TROIS valeurs :
```
Marge facture  : 12.3%          (basee sur PA effectif)
Marge CL       :  8.1% 📦       (basee sur PA effectif x coef_CL, si produit du CL)
Marge apres BFA: 15.8% ~        (basee sur PA effectif x (1-BFA))
                  📦 = surcout Centre Logistique
                  ~  = estime si fiabilite BFA != confirme
```

**Regle coef_mini et BFA** :
- Si le taux BFA est `confirme` → le coef_mini peut utiliser le PA apres BFA
- Si le taux BFA est `estime` ou `incertain` → le coef_mini utilise le PA facture (conservateur)

## 3.3 - Etape 2 : Resolution du PV (cascade des remises)

Le moteur descend la hierarchie produit et, a chaque niveau, cherche d'abord une condition client, puis groupement. **Le premier trouve s'applique (STOP).**

### Algorithme de resolution complet

```
Pour une reference produit donnee, pour un client donne :

1. PRIX MARCHE REFERENCE
   → Chercher un prix marche client sur cette reference exacte → Si trouve : FIN
   → Chercher un prix marche groupement sur cette reference → Si trouve : FIN

2. DESCENTE DE LA HIERARCHIE
   Pour chaque niveau du plus fin au plus large :

   a) SEGMENT (Marque x CAT_FAB)
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   b) MARQUE DANS SOUS-FAMILLE
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   c) MARQUE GLOBALE PRIORITAIRE (si existe avec force = prioritaire)
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   d) SOUS-FAMILLE
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   e) MARQUE GLOBALE SECURITE (si existe avec force = securite)
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   f) FAMILLE
      → Condition client ? STOP.
      → Condition groupement ? STOP.

   g) MEGA-FAMILLE
      → Condition client ? STOP.
      → Condition groupement ? STOP.

3. SI AUCUNE CONDITION TROUVEE :
   → Chercher remise mini (cascade segment > sfam > fam > mega)
   → Si pas de remise mini : appliquer coef mini
   → Si pas de coef mini : prix = prix tarif
```

### Grille de priorite complete (19 niveaux)

```
Prio │ Niveau              │ Portee     │ Description
─────┼─────────────────────┼────────────┼─────────────────────────────────────────────
 1   │ Reference           │ Client     │ Prix marche client par reference
 2   │ Reference           │ Groupement │ Prix marche groupement par reference
 3   │ Segment             │ Client     │ Remise client par segment
 4   │ Segment             │ Groupement │ Remise groupement par segment
 5   │ Marque/sous-fam     │ Client     │ Remise client par marque (dans la sous-fam)
 6   │ Marque/sous-fam     │ Groupement │ Remise groupement par marque (dans la sous-fam)
 7*  │ Marque glob. PRIO   │ Client     │ Marque globale en mode prioritaire
 8*  │ Marque glob. PRIO   │ Groupement │ (optionnel, selon force choisie)
 9   │ Sous-famille        │ Client     │ Remise client par sous-famille
 10  │ Sous-famille        │ Groupement │ Remise groupement par sous-famille
 11* │ Marque glob. SECU   │ Client     │ Marque globale en mode securite
 12* │ Marque glob. SECU   │ Groupement │ (filet de securite)
 13  │ Famille             │ Client     │ Remise client par famille
 14  │ Famille             │ Groupement │ Remise groupement par famille
 15  │ Mega-famille        │ Client     │ Remise client par mega-famille
 16  │ Mega-famille        │ Groupement │ Remise groupement par mega-famille
 --  │ (special)           │ Tous       │ Prix promo (si plus avantageux que la cascade)
 17  │ (global)            │ Tous       │ Remise mini (cascade segment > sfam > fam > mega)
 18  │ (global)            │ Tous       │ Coef mini (plancher)
 19  │ (global)            │ Tous       │ Prix tarif (base)
```

> **Convention de lecture** : la gouvernance metier parle de **19 niveaux**. Cote moteur SQL, l'insertion des forces de marque globale peut etre detaillee en **21 positions techniques effectives**.

\* Les positions de la marque globale dependent de la force choisie :
- Force "Prioritaire" → positions 7-8 (avant sous-famille)
- Force "Forte" → positions apres sous-famille (entre 10 et 11)
- Force "Standard" → positions apres famille (entre 14 et 15)
- Force "Securite" → positions 11-12 (apres sous-famille, avant famille)

> **Important** : Le prix promo est un cas special. Il n'interrompt pas la cascade. Le moteur calcule d'abord le prix selon la cascade, puis compare avec le prix promo et prend le plus avantageux pour le client, **sauf si la source gagnante est un prix marche**.

## 3.4 - Etape 3 : Comparaison prix promo

Le prix promo est une **exception** : il ne s'applique que s'il est **plus favorable au client** que le prix issu de la cascade.

Exception de priorite :
- Si la source gagnante de la cascade est un **prix marche** (client ou groupement), la promo est ignoree.

```
prix_cascade = resoudre_cascade(niveaux 1 a 16 + remise mini)
si source_cascade in ('prix_marche_client', 'prix_marche_groupement') :
    prix_final = prix_cascade
sinon si prix_promo existe ET prix_promo < prix_cascade :
    prix_final = prix_promo
sinon :
    prix_final = prix_cascade
```

Les prix promo peuvent etre poses a plusieurs niveaux :
- Par **reference** precise (ex: FESTO DSBC-40-100 a 120 EUR)
- Par **segment** entier (ex: FESTO/VER_ISO a 150 EUR)
- Par **sous-famille** / **famille** / **mega-famille**

## 3.5 - Etape 4 : Verification coef mini (alerte)

Le coef mini est un **seuil de controle** : `PV >= PA_effectif x Coef Mini`

Si une condition produit un prix inferieur au seuil, le moteur **alerte** l'utilisateur et le ROI. Ce n'est pas un blocage technique.

Le coef mini et la remise mini suivent leur propre cascade d'heritage :
```
1. Chercher coef/remise mini au niveau segment
2. Si pas trouve, chercher au niveau sous-famille
3. Si pas trouve, chercher au niveau famille
4. Si pas trouve, chercher au niveau mega-famille
5. Si rien : prix tarif brut
```

## 3.6 - Formules de conversion

### Marge commerciale (formule CIR)
```
Marge % = (PV - PA) / PV x 100
```

### Prix de vente depuis une marge cible
```
PV = PA / (1 - Marge% / 100)
```

### Remise depuis un prix de vente
```
Remise % = (1 - PV / Prix Tarif) x 100
```

### Conversion directe Marge → Remise
```
PV = PA / (1 - Marge%/100)
Remise % = (1 - PV / Prix Tarif) x 100
```

### Conversion directe Remise → Marge
```
PV = Prix Tarif x (1 - Remise%/100)
Marge % = (1 - PA / PV) x 100
```

> **Note** : Le TCS peut raisonner en marge, en remise ou en prix fixe grace au simulateur. Mais toute condition (hors prix marche par reference) est **stockee en remise %** sur le prix tarif.

## 3.7 - Exemples de calcul complets

### Exemple 1 : Cascade simple avec derogation fournisseur

```
Produit     : SKF 6205-2RSH (segment SKF/Z16, sous-fam 1_10_10, fam 1_10, mega 1)
Prix tarif  : 12.50 EUR
PA standard : 4.50 EUR (remise fab 64%)
Derogation  : SKF accorde -70% sur Z16 pour AIRBUS → PA aide = 3.75 EUR
BFA SKF     : 3.5% (confirme) → PA apres BFA = 3.75 x 0.965 = 3.62 EUR

Client      : AIRBUS Toulouse
Groupement  : Aeronautique

Conditions existantes :
  - Segment SKF/Z16 : client AIRBUS -40%

Resolution PA :
  Derogation reference 6205-2RSH client ? NON
  Derogation CAT_FAB Z16 client ? OUI → PA aide = 12.50 x 0.30 = 3.75 EUR
  BFA : 3.5% confirme → PA reel = 3.62 EUR

Resolution PV :
  Prio 1 - Prix marche reference ? NON
  Prio 3 - Segment SKF/Z16 client ? OUI → -40%
    PV = 12.50 x 0.60 = 7.50 EUR

Resultat :
  PV = 7.50 EUR
  Marge facture = (7.50 - 3.75) / 7.50 = 50.0% (avec derog)
  Marge apres BFA = (7.50 - 3.62) / 7.50 = 51.7%
  Sans derogation : Marge = (7.50 - 4.50) / 7.50 = 40.0%
```

### Exemple 2 : Heritage depuis la mega-famille

```
Produit     : SKF 22205 E (segment SKF/Z18, sous-fam 1_10_20, fam 1_10, mega 1)
Prix tarif  : 45.20 EUR
PA standard : 18.08 EUR (remise fab 60%)
Pas de derogation

Client      : AIRBUS Toulouse

Conditions existantes :
  - Mega-famille ROULEMENTS (mega 1) : client AIRBUS -35%
  (aucune condition plus fine sur SKF/Z18, ni sur la marque SKF dans 1_10_20)

Resolution :
  Prio 1-2  : Prix marche ?              NON
  Prio 3-4  : Segment SKF/Z18 ?          NON
  Prio 5-6  : Marque SKF dans sfam ?     NON
  Prio 7-8  : Marque globale prio ?      NON
  Prio 9-10 : Sous-famille 1_10_20 ?     NON
  Prio 11-12: Marque globale secu ?      NON
  Prio 13-14: Famille 1_10 ?             NON
  Prio 15   : Mega-famille 1 client ?    OUI → AIRBUS -35%

  PV = 45.20 x 0.65 = 29.38 EUR
  Marge = (29.38 - 18.08) / 29.38 = 38.5%
```

### Exemple 3 : Condition groupement quand pas de condition client

```
Produit     : TIMKEN 32205 (segment TIMKEN/SET_BR, sous-fam 1_10_40, mega 1)
Prix tarif  : 35.00 EUR
PA standard : 14.70 EUR (remise fab 58%)

Client      : SAFRAN Bordeaux
Groupement  : Aeronautique

Conditions existantes :
  - Segment TIMKEN/SET_BR : groupement Aeronautique -28%
  (aucune condition client SAFRAN)

Resolution :
  Prio 3 - Segment client ? NON
  Prio 4 - Segment groupement ? OUI → Aeronautique -28%
    PV = 35.00 x 0.72 = 25.20 EUR
    Marge = (25.20 - 14.70) / 25.20 = 41.7%
```

### Exemple 4 : Prix promo plus favorable que la cascade

```
Produit     : FESTO DSBC-40-100 (segment FESTO/VER_ISO)
Prix tarif  : 185.00 EUR
PA standard : 92.50 EUR (remise fab 50%)

Client      : MECAPLUS (petit client, aucune condition)
Promo active: FESTO VER_ISO a 150.00 EUR net jusqu'au 31/03/2026

Resolution cascade :
  Prio 1-16 : aucune condition client ni groupement
  Global : Remise mini -15%
    PV_cascade = 185.00 x 0.85 = 157.25 EUR

Verification promo :
  Prix promo = 150.00 EUR < PV_cascade = 157.25 EUR
  → Le prix promo EST plus avantageux → il s'applique

Resultat : PV = 150.00 EUR | Marge = 38.3% | Source = Prix promo
```

### Exemple 5 : Marque globale en mode "standard"

```
Client AIRBUS, produit SKF 7205 BEP (segment SKF/Z22, sous-fam 1_10_20)

Conditions existantes :
  - Mega ROULEMENTS : client AIRBUS -35%
  - SKF globale mode "standard" : client AIRBUS -33%
  - (pas de condition sous-fam, famille, marque/sfam, segment)

Resolution :
  Prio 3-6  : Segment / Marque dans sfam ?   NON
  Prio 9-10 : Sous-famille ?                  NON
  (Mode standard = apres famille)
  Prio 13-14: Famille ?                        NON
  → Check marque globale standard : OUI → SKF -33%

  Mais attendons : Prio 15 - Mega client → AIRBUS -35%
  La mega est APRES la marque standard dans la cascade.
  Donc SKF globale -33% est trouvee EN PREMIER → elle s'applique.

  PV = 32.00 x 0.67 = 21.44 EUR
  Marge = (21.44 - 12.80) / 21.44 = 40.3%

  Note : si SKF etait en mode "securite" (apres mega), la mega -35%
  aurait ete trouvee en premier → -35% au lieu de -33%.
```

### Exemple 6 : Impact du Centre Logistique sur la marge

```
Produit     : SKF 6205-2RSH (segment SKF/Z16, sous-fam 1_10_10)
Prix tarif  : 12.50 EUR
PA standard : 4.50 EUR (remise fab 64%)
Derogation  : aucune
BFA SKF     : 3.5% (confirme)

Client      : MECAPLUS Bordeaux
Conditions  : segment SKF/Z16 client -40%

Coef CL     : 1.06 sur mega ROULEMENTS (heritage mega → sfam)

PV = 12.50 x 0.60 = 7.50 EUR

Triple affichage marge :
  Marge facture  : (7.50 - 4.50) / 7.50 = 40.0%     (PA effectif)
  Marge CL       : (7.50 - 4.77) / 7.50 = 36.4% 📦  (PA 4.50 x 1.06 = 4.77)
  Marge BFA      : (7.50 - 4.34) / 7.50 = 42.1% ~   (PA 4.50 x 0.965 = 4.34)

Note : frais de ligne CL +2.50€/ligne non inclus dans le PA unitaire
Impact si qty=1 : +2.50€/unite | qty=10 : +0.25€/unite | qty=100 : +0.025€/unite
```

### Exemple 7 : Simulation en mode marge (conversion automatique)

```
Le TCS veut proposer 25% de marge sur SKF/Z16 pour DASSAULT.

PA          : 4.50 EUR
Prix tarif  : 12.50 EUR
Marge cible : 25%

Calcul :
  PV = 4.50 / (1 - 0.25) = 6.00 EUR
  Remise = (1 - 6.00 / 12.50) x 100 = 52.0%

  → Condition STOCKEE comme remise -52% (pas comme marge 25%)
  → Verification coef mini : si coef_mini = 1.10, PV min = 4.50 x 1.10 = 4.95 EUR
    6.00 > 4.95 → OK

  Si derogation active (PA aide 3.80 EUR) :
  Marge reelle = (6.00 - 3.80) / 6.00 = 36.7% (bien meilleur que les 25% affiches)
```

## 3.8 - Cascade complete v3.0 (resume algorithmique)

```
Pour une reference R, un client C dans le groupement G :

ETAPE 1 - RESOLUTION DU PA EFFECTIF
  1. Derogation fournisseur reference pour C ?           → PA = derog
  2. Derogation fournisseur reference pour G ?           → PA = derog
  3. Derogation fournisseur reference globale ?          → PA = derog
  4. Derogation fournisseur CAT_FAB pour C ?             → PA = f(derog)
  5. Derogation fournisseur CAT_FAB pour G ?             → PA = f(derog)
  6. Derogation fournisseur CAT_FAB globale ?            → PA = f(derog)
  7. Sinon : PA standard                                 → PA = prix_pub x (1 - remise_fab)
  (si BFA actif : PA_reel = PA x (1 - taux_bfa))

ETAPE 2 - RESOLUTION DU PV (cascade remises)
  1.  Prix marche reference C ?                          → PV = prix. FIN
  2.  Prix marche reference G ?                          → PV = prix. FIN
  3.  Segment C ?                                        → remise. STOP
  4.  Segment G ?                                        → remise. STOP
  5.  Marque dans sous-famille C ?                       → remise. STOP
  6.  Marque dans sous-famille G ?                       → remise. STOP
  7.  Marque globale PRIORITAIRE C ?                     → remise. STOP (optionnel)
  8.  Marque globale PRIORITAIRE G ?                     → remise. STOP (optionnel)
  9.  Sous-famille C ?                                   → remise. STOP
  10. Sous-famille G ?                                   → remise. STOP
  11. Marque globale SECURITE C ?                        → remise. STOP
  12. Marque globale SECURITE G ?                        → remise. STOP
  13. Famille C ?                                        → remise. STOP
  14. Famille G ?                                        → remise. STOP
  15. Mega-famille C ?                                   → remise. STOP
  16. Mega-famille G ?                                   → remise. STOP
  17. Remise mini (cascade segment > sfam > fam > mega)  → remise
  18. Coef mini (cascade segment > sfam > fam > mega)    → PV plancher
  19. Prix tarif                                         → PV = tarif

ETAPE 3 - COMPARAISON PROMO
  Si source_cascade n'est PAS un prix marche ET prix promo actif sur ce segment/reference :
    PV_final = min(PV_cascade, PV_promo)

ETAPE 4 - VERIFICATION PLANCHER
  Si PV_final < PA_effectif x coef_mini :
    → Alerte (non bloquante)
    → Afficher marge facture ET marge apres BFA si applicable

ETAPE 5 - SIMULATION CENTRE LOGISTIQUE (indicatif)
  Si coef_CL > 1.0 pour ce segment (heritage mega > fam > sfam) :
    PA_agence_CL = PA_effectif x coef_CL
    Marge_CL = (PV_final - PA_agence_CL) / PV_final x 100
    (frais de ligne 2.50€/ligne non inclus, mentionnes en info)

RESULTAT :
  PV_final, remise %, marge facture %, marge CL % (indicatif), marge BFA % (si applicable)
  Source : d'ou vient la condition (niveau, portee, id)
```

## 3.9 - L'apercu cascade en temps reel

Le vrai pouvoir du systeme est la **visualisation en direct**. Au moment ou l'utilisateur pose ou modifie une condition, il VOIT :

- Ou sa condition se place dans la cascade
- Quelle condition existante elle surcharge ou non
- Le prix final pour une reference d'exemple
- La comparaison entre les 4 modes de force (pour la marque globale)

L'utilisateur n'a pas besoin de comprendre la theorie de la cascade. Il voit le **RESULTAT** concret et choisit en connaissance de cause.

```
─── Apercu cascade pour SKF 6205-2RSH ───

Prio 1  Reference 6205-2RSH client  : (aucune)
Prio 3  Segment SKF/Z16 client      : -40%
Prio 5  SKF dans Rigides client     : -38%  ← surchargee par segment
★ NEW  Marque globale SKF client   : -35%  ← VOTRE CONDITION
Prio 9  Sous-fam Rigides client     : (aucune)
Prio 13 Famille Standards client    : (aucune)
Prio 15 Mega Roulements client      : -35%  ← surchargee par votre condition

Resultat : -40% (segment gagne car plus specifique)
```
