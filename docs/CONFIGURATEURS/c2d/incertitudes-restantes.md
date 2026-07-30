# Registre des incertitudes et alertes moteur restantes

État du snapshot actif Supabase
`6fbf4046-be74-4422-9fe8-2d2d8a8d9157`, contrôlé le 28/07/2026.

## Réponse sur le niveau de certitude

Non, il ne serait pas rigoureux d'affirmer que « tout le reste est sûr à
100 % ».

Le catalogue actif respecte les contraintes de schéma, les règles
d'import et les contrôles automatisés actuellement définis. Il a zéro anomalie
**bloquante d'import**. Cela signifie que les données sont traçables,
structurellement cohérentes et utilisables selon leurs restrictions. Cela ne
constitue pas une certification constructeur exhaustive de chaque cellule.

Le registre actif contient exactement **141 alertes** :

| Catégorie | Code | Nombre | Nature |
| --- | --- | ---: | --- |
| Donnée non résolue | `PHYSICAL_ATTRIBUTES_UNRESOLVED` | 65 | masse et inertie absentes |
| Donnée non résolue | `IEC_DIMENSIONS_UNRESOLVED` | 7 | jeu de cotes IEC incomplet |
| Donnée non résolue | `PROTECTION_IP_VARIANT_UNRESOLVED` | 6 | IP55/IP56 non discriminé |
| Source contradictoire | `INERTIA_SOURCE_CONFLICT` | 1 | inertie imprimée ambiguë |
| Écart de cohérence | `CURRENT_MISMATCH` | 4 | courant publié à revérifier |
| Écart de cohérence | `TORQUE_MISMATCH` | 16 | couple publié à revérifier |
| Écart de cohérence | `IE_BELOW_THRESHOLD` | 20 | rendement/classe IE à qualifier |
| Écart de cohérence | `EFFICIENCY_CURVE` | 18 | courbe de rendement inhabituelle |
| Écart de cohérence | `INERTIA_IMPLAUSIBLE` | 4 | inertie spécifique sous le seuil de garde |
| **Total** |  | **141** |  |

En dehors de ces 141 alertes, aucune autre anomalie n'est détectée par les
validateurs actuels. La formulation correcte est donc :

> Donnée sourcée et contrôlée sans anomalie actuellement détectée.

La formulation « certifiée exacte à 100 % » est réservée à une valeur relue
sur la page constructeur exacte, avec la bonne série, variante, polarité,
fréquence, alimentation et forme de montage.

## 1. Cotes IEC incomplètes — 7 modèles

Fichier attendu pour les six Bonfiglioli :
`Catalogue_BONFIGLIOLI_Moteur.pdf`. Les pages indiquées sont celles de la
fiche électrique ayant fourni masse et inertie ; elles ne prouvent pas les
cotes manquantes. Il faut retrouver le plan dimensionnel correspondant.

| Marque | Désignation | Pôles | Carcasse | Cotes manquantes | Cotes déjà présentes | Page source actuelle |
| --- | --- | ---: | ---: | --- | --- | ---: |
| Bonfiglioli | BN 56A | 4 | 56 | A, B, C, H, K | D, E, F | PDF 99 / catalogue 97 |
| Bonfiglioli | BN 56B | 4 | 56 | A, B, C, H, K | D, E, F | PDF 99 / catalogue 97 |
| Bonfiglioli | BN 160MR | 2 | 160 | A, B, C, H, K | D, E, F | PDF 98 / catalogue 96 |
| Bonfiglioli | BN 160MR | 4 | 160 | A, B, C, H, K | D, E, F | PDF 99 / catalogue 97 |
| Bonfiglioli | BN 180M | 2 | 180 | A, B, C, H, K, E | D, F | PDF 98 / catalogue 96 |
| Bonfiglioli | BN 180M | 4 | 180 | A, B, C, H, K, E | D, F | PDF 99 / catalogue 97 |
| Innomotics | 1LE1003-1BD2 | 8 | 112 | A, B, C, H, K | D, E, F | PDF 161 |

Clés techniques :

| Désignation | `model_key` |
| --- | --- |
| BN 56A | `bonfiglioli:bn56a:j-0p00015000000000000001-m-3p1` |
| BN 56B | `bonfiglioli:bn56b:j-0p00015000000000000001-m-3p1` |
| BN 160MR, 2 pôles | `bonfiglioli:bn160mr:j-0p021-m-65` |
| BN 160MR, 4 pôles | `bonfiglioli:bn160mr:j-0p036000000000000004-m-70` |
| BN 180M, 2 pôles | `bonfiglioli:bn180m:j-0p049-m-109` |
| BN 180M, 4 pôles | `bonfiglioli:bn180m:j-0p079-m-115` |
| 1LE1003-1BD2 | `innomotics:1le10031bd2:j-0p028-m-34` |

Restriction : ne pas conclure à la compatibilité des pattes pour ces sept
modèles. Pour BN 180M, ne pas conclure non plus sur la longueur d'arbre E.

## 2. Masse et inertie Leroy-Somer — 65 modèles

Pour ces lignes VFD asynchrones, la désignation, les pôles et les points
électriques existent. La masse et l'inertie restent nulles parce que plusieurs
variantes physiques sont possibles ou qu'aucune ligne réseau identique ne
permet un rapprochement unique.

La preuve attendue est une ligne constructeur portant la désignation exacte,
la polarité, la puissance ou variante physique, la masse, l'inertie et, si elle
est publiée, la forme de montage.

### FLSES — 29 modèles

Source actuelle : `Catalogue_LS_LSES.pdf`, page PDF/catalogue 90.

| Désignation | Pôles | Carcasse | `model_key` |
| --- | ---: | ---: | --- |
| FLSES 80 L | 2 | 80 | `leroy-somer:flses80l:standard` |
| FLSES 80 LG | 2 | 80 | `leroy-somer:flses80lg:standard` |
| FLSES 90 LU | 2 | 90 | `leroy-somer:flses90lu:standard` |
| FLSES 90 SL | 2 | 90 | `leroy-somer:flses90sl:standard` |
| FLSES 100 L | 2 | 100 | `leroy-somer:flses100l:standard` |
| FLSES 100 LG | 4 | 100 | `leroy-somer:flses100lg:standard` |
| FLSES 100 LR | 4 | 100 | `leroy-somer:flses100lr:standard` |
| FLSES 112 MG | 2 | 112 | `leroy-somer:flses112mg:standard` |
| FLSES 112 MU | 4 | 112 | `leroy-somer:flses112mu:standard` |
| FLSES 132 M | 2 | 132 | `leroy-somer:flses132m:standard` |
| FLSES 132 MR | 4 | 132 | `leroy-somer:flses132mr:standard` |
| FLSES 132 MU | 6 | 132 | `leroy-somer:flses132mu:standard` |
| FLSES 132 SM | 2 | 132 | `leroy-somer:flses132sm:standard` |
| FLSES 160 LUR | 2 | 160 | `leroy-somer:flses160lur:standard` |
| FLSES 160 M | 2 | 160 | `leroy-somer:flses160m:standard` |
| FLSES 160 MU | 6 | 160 | `leroy-somer:flses160mu:standard` |
| FLSES 180 L | 6 | 180 | `leroy-somer:flses180l:standard` |
| FLSES 180 LUR | 4 | 180 | `leroy-somer:flses180lur:standard` |
| FLSES 180 M | 4 | 180 | `leroy-somer:flses180m:standard` |
| FLSES 200 LU | 4 | 200 | `leroy-somer:flses200lu:standard` |
| FLSES 225 M | 4 | 225 | `leroy-somer:flses225m:standard` |
| FLSES 225 S | 4 | 225 | `leroy-somer:flses225s:standard` |
| FLSES 250 M | 6 | 250 | `leroy-somer:flses250m:standard` |
| FLSES 250 MR | 4 | 250 | `leroy-somer:flses250mr:standard` |
| FLSES 280 S | 2 | 280 | `leroy-somer:flses280s:standard` |
| FLSES 315 LA | 2 | 315 | `leroy-somer:flses315la:standard` |
| FLSES 315 M | 2 | 315 | `leroy-somer:flses315m:standard` |
| FLSES 315 S | 2 | 315 | `leroy-somer:flses315s:standard` |
| FLSES 450 LD | 6 | 450 | `leroy-somer:flses450ld:standard` |

### LSES — 27 modèles

Source actuelle : `Catalogue_LS_LSES.pdf`, page PDF/catalogue 62.

| Désignation | Pôles | Carcasse | `model_key` |
| --- | ---: | ---: | --- |
| LSES 80 L | 2 | 80 | `leroy-somer:lses80l:standard` |
| LSES 80 LG | 2 | 80 | `leroy-somer:lses80lg:standard` |
| LSES 90 LU | 2 | 90 | `leroy-somer:lses90lu:standard` |
| LSES 90 SL | 2 | 90 | `leroy-somer:lses90sl:standard` |
| LSES 100 L | 2 | 100 | `leroy-somer:lses100l:standard` |
| LSES 100 LG | 4 | 100 | `leroy-somer:lses100lg:standard` |
| LSES 100 LR | 4 | 100 | `leroy-somer:lses100lr:standard` |
| LSES 112 MG | 2 | 112 | `leroy-somer:lses112mg:standard` |
| LSES 112 MU | 4 | 112 | `leroy-somer:lses112mu:standard` |
| LSES 132 M | 2 | 132 | `leroy-somer:lses132m:standard` |
| LSES 132 MU | 6 | 132 | `leroy-somer:lses132mu:standard` |
| LSES 132 S | 2 | 132 | `leroy-somer:lses132s:standard` |
| LSES 132 SM | 2 | 132 | `leroy-somer:lses132sm:standard` |
| LSES 160 L | 2 | 160 | `leroy-somer:lses160l:standard` |
| LSES 160 MP | 2 | 160 | `leroy-somer:lses160mp:standard` |
| LSES 160 MR | 4 | 160 | `leroy-somer:lses160mr:standard` |
| LSES 160 MU | 6 | 160 | `leroy-somer:lses160mu:standard` |
| LSES 180 L | 6 | 180 | `leroy-somer:lses180l:standard` |
| LSES 180 LUR | 4 | 180 | `leroy-somer:lses180lur:standard` |
| LSES 180 M | 4 | 180 | `leroy-somer:lses180m:standard` |
| LSES 180 MR | 2 | 180 | `leroy-somer:lses180mr:standard` |
| LSES 200 L | 6 | 200 | `leroy-somer:lses200l:standard` |
| LSES 200 LR | 2 | 200 | `leroy-somer:lses200lr:standard` |
| LSES 200 LU | 4 | 200 | `leroy-somer:lses200lu:standard` |
| LSES 225 MG | 4 | 225 | `leroy-somer:lses225mg:standard` |
| LSES 225 SR | 4 | 225 | `leroy-somer:lses225sr:standard` |
| LSES 250 ME | 4 | 250 | `leroy-somer:lses250me:standard` |

### PLSES — 9 modèles

Source actuelle : `Catalogue_LS_LSES.pdf`, page PDF/catalogue 120.

| Désignation | Pôles | Carcasse | `model_key` |
| --- | ---: | ---: | --- |
| PLSES 315 LG | 2 | 315 | `leroy-somer:plses315lg:standard` |
| PLSES 315 MGU | 2 | 315 | `leroy-somer:plses315mgu:standard` |
| PLSES 315 VLG | 2 | 315 | `leroy-somer:plses315vlg:standard` |
| PLSES 315 VLGU | 2 | 315 | `leroy-somer:plses315vlgu:standard` |
| PLSES 355 LA | 2 | 355 | `leroy-somer:plses355la:standard` |
| PLSES 355 LB | 2 | 355 | `leroy-somer:plses355lb:standard` |
| PLSES 355 MA | 2 | 355 | `leroy-somer:plses355ma:standard` |
| PLSES 355 MB | 2 | 355 | `leroy-somer:plses355mb:standard` |
| PLSES 355 MC | 2 | 355 | `leroy-somer:plses355mc:standard` |

Restriction commune aux 65 modèles : aucune comparaison, sélection ou calcul
fondé sur la masse ou l'inertie tant que la variante physique exacte n'est pas
confirmée.

## 3. Indice de protection Bonfiglioli BY — 6 modèles

Le catalogue qualifie la gamme avec IP55/IP56, mais la ligne moteur actuelle
ne porte pas le discriminateur permettant de choisir factuellement l'un des
deux. `protection_ip` reste donc nul.

Source actuelle : `Catalogue_BONFIGLIOLI_Moteur.pdf`, page PDF 57,
page catalogue M12.

| Désignation | Pôles | Carcasse | Masse kg | Inertie kg·m² | `model_key` |
| --- | ---: | ---: | ---: | ---: | --- |
| BY 280MAK | 4 | 280 | 840 | 2,3 | `bonfiglioli:by280mak:j-2p3-m-840` |
| BY 280SCK | 4 | 280 | 725 | 1,9 | `bonfiglioli:by280sck:j-1p9-m-725` |
| BY 315MBK | 4 | 315 | 1 220 | 3,9 | `bonfiglioli:by315mbk:j-3p9-m-1220` |
| BY 315SCK | 4 | 315 | 1 000 | 2,9 | `bonfiglioli:by315sck:j-2p9-m-1000` |
| BY 315SDK | 4 | 315 | 1 065 | 3,2 | `bonfiglioli:by315sdk:j-3p2-m-1065` |
| BY 355SAK | 4 | 355 | 1 610 | 5,9 | `bonfiglioli:by355sak:j-5p9-m-1610` |

Preuve attendue : tableau d'options, code de commande ou fiche technique
associant sans ambiguïté chaque variante à IP55 ou IP56.

## 4. Inertie Innomotics contradictoire — 1 modèle

| Désignation | Pôles | Carcasse | Masse | Valeur imprimée | Page |
| --- | ---: | ---: | ---: | --- | ---: |
| 1LE1583-3AB5 | 4 | 315 | 1 300 kg | `3443 kg·m²` sans séparateur décimal exploitable | PDF 176 |

`model_key` :
`innomotics:1le15833ab5:j-na-m-1300`.

La valeur est physiquement suspecte mais aucun déplacement arbitraire de la
virgule n'est autorisé. `inertia_kgm2` reste nul jusqu'à obtention d'une fiche
constructeur non ambiguë.

## 5. Courants publiés à revérifier — 4 points

Le contrôle compare le courant publié à une enveloppe électrique théorique.
Un écart ne prouve pas que la valeur catalogue est fausse : tension, couplage,
convention de courant ou variante peuvent expliquer la différence.

| Marque | Désignation | Pôles | Puissance | Vitesse | Courant publié | Attendu par le garde | Page |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Bonfiglioli | BE 71A | 4 | 0,25 kW | 1 700 rpm | 1,04 A | 0,61 A | 85 |
| Bonfiglioli | ME 1SA | 4 | 0,25 kW | 1 700 rpm | 1,04 A | 0,61 A | 89 |
| Innomotics | 1LE1011-1DJ6 | 4/2 | 16 kW | 2 920 rpm | 35,5 A | 28,57 A | 242 |
| Leroy-Somer | FLSES 160MU | 6 | 7,5 kW | 978 rpm | 17,4 A | 15,71 A | 88 |

Preuve attendue : relire tension, couplage, fréquence et colonne de courant de
la même ligne catalogue. Ne pas corriger avec la valeur théorique.

## 6. Couples publiés à revérifier — 16 points

Le contrôle compare le couple publié à `9550 × P / N` avec sa tolérance. La
valeur publiée reste conservée, mais elle ne doit pas être présentée comme
réconciliée tant que l'unité, la vitesse et la nature du couple ne sont pas
confirmées.

| Marque | Désignation | Pôles | kW | rpm | Couple publié Nm | Plage calculée Nm | Page |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: |
| Bonfiglioli | BE 112M | 4 | 3,7 | 1 445 | 27 | 24,040–24,870 | 83 |
| Bonfiglioli | BE 132MA | 4 | 7,5 | 1 760 | 43 | 40,310–41,084 | 85 |
| Bonfiglioli | BN 132S | 4 | 5,5 | 1 730 | 30,8 | 29,999–30,726 | 102 |
| Bonfiglioli | BN 132SA | 2 | 5,5 | 3 490 | 15,3 | 14,892–15,209 | 101 |
| Bonfiglioli | BN 160L | 2 | 18,5 | 3 520 | 50,7 | 49,985–50,399 | 101 |
| Bonfiglioli | BN 180M | 4 | 18,5 | 1 760 | 101,1 | 99,829–100,942 | 102 |
| Bonfiglioli | BN 71B | 2 | 0,55 | 3 450 | 1,55 | 1,506–1,539 | 101 |
| Bonfiglioli | M 05A | 2 | 0,18 | 3 380 | 0,53 | 0,494–0,523 | 106 |
| Bonfiglioli | M 1LA | 4 | 0,55 | 1 710 | 3,12 | 3,035–3,109 | 107 |
| Bonfiglioli | M 1SD | 2 | 0,55 | 3 450 | 1,55 | 1,506–1,539 | 106 |
| Bonfiglioli | M 3LB | 2 | 3,7 | 3 490 | 10,4 | 9,974–10,276 | 106 |
| Bonfiglioli | M 4SA | 2 | 5,5 | 3 490 | 15,3 | 14,892–15,209 | 106 |
| Bonfiglioli | M 4SA | 4 | 5,5 | 1 730 | 30,8 | 29,999–30,726 | 107 |
| Bonfiglioli | M 5SC | 2 | 18,5 | 3 520 | 50,7 | 49,985–50,399 | 106 |
| Bonfiglioli | ME 4LA | 4 | 7,5 | 1 760 | 43 | 40,310–41,084 | 89 |
| Bonfiglioli | ME 4SA | 4 | 3,7 | 1 460 | 27 | 23,794–24,613 | 87 |

## 7. Rendement sous le seuil de classe IE — 20 points

Ces alertes peuvent provenir d'un mauvais rattachement de classe, d'un point
haute vitesse/VFD comparé au mauvais référentiel, d'une convention de
rendement différente ou d'une valeur réellement incompatible. Aucune
conformité IE ne doit être affirmée sur ces points avant réconciliation.

| Marque | Désignation | kW | rpm | Rendement publié % | Seuil % | Page |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Bonfiglioli | BN 100LC | 4 | 1 400 | 82,7 | 83,1 | 99 |
| Bonfiglioli | BN 63B | 0,18 | 1 320 | 54,8 | 57,0 | 99 |
| Bonfiglioli | BN 71C | 0,55 | 1 380 | 69,0 | 70,0 | 99 |
| Bonfiglioli | M 05B | 0,18 | 1 320 | 54,8 | 57,0 | 104 |
| Bonfiglioli | M 1LA | 0,55 | 1 380 | 69,0 | 70,0 | 104 |
| Bonfiglioli | M 3LC | 4 | 1 400 | 82,7 | 83,1 | 104 |
| Leroy-Somer | FLSHRM 280MA | 90 | 3 600 | 95,8 | 96,1 | 43 |
| Leroy-Somer | FLSHRM 280SA | 75 | 3 600 | 94,2 | 96,0 | 43 |
| Leroy-Somer | FLSHRM 315MT | 132 | 3 600 | 95,4 | 96,2 | 43 |
| Leroy-Somer | FLSHRM 355LTC | 75 | 3 000 | 95,8 | 96,0 | 43 |
| Leroy-Somer | LSHRM 160LR3 | 37 | 3 000 | 94,9 | 95,2 | 47 |
| Leroy-Somer | LSHRM 160LR3 | 37 | 3 600 | 93,7 | 95,2 | 47 |
| Leroy-Somer | LSHRM 200LQ1 | 30 | 3 600 | 93,7 | 94,9 | 39 |
| Leroy-Somer | LSHRM 250ME | 55 | 3 000 | 95,6 | 95,7 | 39 |
| Leroy-Somer | LSHRM 250ME | 55 | 3 600 | 94,6 | 95,7 | 39 |
| Leroy-Somer | LSHRM 280MC | 90 | 3 600 | 95,8 | 96,1 | 39 |
| Leroy-Somer | LSHRM 280SC | 75 | 3 000 | 95,9 | 96,0 | 39 |
| Leroy-Somer | LSHRM 280SC | 75 | 3 600 | 94,2 | 96,0 | 39 |
| Leroy-Somer | LSHRM 315MN1 | 132 | 3 600 | 95,4 | 96,2 | 39 |
| Leroy-Somer | PLSES 355LB | 450 | 992 | 94,6 | 95,8 | 118 |

## 8. Courbes de rendement inhabituelles — 18 points

Le garde signale un rendement à 50 % de charge supérieur au rendement nominal
de plus de 1,5 point. Il faut vérifier les colonnes 50/75/100 %, le sens de
lecture et le point de fonctionnement.

| Marque | Désignation | kW | rpm | Rendement 50 % observé | Maximum attendu par le garde | Page |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Innomotics | 1LE1001-0DA2 | 0,75 | 2 805 | 80,1 | 78,9 | 178 |
| Innomotics | 1LE1001-0DA6 | 1,5 | 2 830 | 83,6 | 82,8 | 182 |
| Innomotics | 1LE1001-1CA6 | 11 | 2 915 | 92,2 | 90,9 | 182 |
| Innomotics | 1LE1001-2AD5 | 15 | 718 | 89,9 | 89,5 | 181 |
| Innomotics | 1LE1001-2AD6 | 18,5 | 720 | 90,2 | 90,1 | 183 |
| Innomotics | 1LE1002-0EA4 | 2,2 | 2 855 | 81,3 | 81,2 | 196 |
| Innomotics | 1LE1002-2AD5 | 15 | 718 | 88,4 | 87,7 | 198 |
| Innomotics | 1LE1501-0DA2 | 0,75 | 2 805 | 80,1 | 78,9 | 184 |
| Innomotics | 1LE1501-1CA6 | 11 | 2 915 | 92,2 | 90,9 | 192 |
| Innomotics | 1LE1501-2AD5 | 15 | 718 | 89,9 | 89,5 | 187 |
| Innomotics | 1LE1501-2AD6 | 18,5 | 720 | 90,2 | 90,1 | 193 |
| Innomotics | 1LE1502-2AD5 | 15 | 718 | 88,4 | 87,7 | 203 |
| Innomotics | 1LE1502-2DD2 | 45 | 735 | 90,8 | 90,7 | 203 |
| Innomotics | 1LE1601-1CA6 | 11 | 2 915 | 92,2 | 90,9 | 194 |
| Innomotics | 1LE1601-2AD5 | 15 | 718 | 89,9 | 89,5 | 191 |
| Innomotics | 1LE1601-2AD6 | 18,5 | 720 | 90,2 | 90,1 | 195 |
| Leroy-Somer | LSHRM 160LR1 | 18,5 | 1 800 | 94,6 | 94,1 | 45 |
| Leroy-Somer | LSHRM 250ME | 55 | 1 500 | 98,2 | 97,7 | 37 |

## 9. Inerties spécifiques sous le seuil de garde — 4 points

Les quatre alertes concernent deux modèles LSHRM à très haute vitesse. Une
inertie faible peut être réelle ; le contrôle demande seulement une
confirmation de l'unité et de l'identité de variante.

| Désignation | kW | rpm | Inertie spécifique observée kg·m²/kW | Seuil bas | Page |
| --- | ---: | ---: | ---: | ---: | ---: |
| LSHRM 132MU3 | 56 | 5 200 | 0,0004678571 | 0,0005 | 47 |
| LSHRM 132MU3 | 57 | 6 000 | 0,0004596491 | 0,0005 | 49 |
| LSHRM 160LR3 | 65 | 5 200 | 0,0004753846 | 0,0005 | 47 |
| LSHRM 160LR3 | 65 | 6 000 | 0,0004753846 | 0,0005 | 49 |

## Ordre conseillé pour la vérification catalogue

1. Les 7 jeux de cotes IEC, car ils conditionnent directement la compatibilité
   mécanique.
2. Les 20 alertes de classe IE, car elles conditionnent une affirmation
   réglementaire et énergétique.
3. Les 4 courants et 16 couples.
4. Les 65 masses/inerties Leroy-Somer.
5. Les 6 variantes IP BY et l'inertie Innomotics contradictoire.
6. Les 18 courbes de rendement et 4 inerties spécifiques, qui peuvent être
   techniquement réelles mais doivent être confirmées.

À chaque correction, conserver la valeur publiée, le fichier, la page, la
colonne ou le tableau, la variante exacte et la méthode de lecture. Une valeur
calculée peut servir de contrôle, jamais de remplacement silencieux d'une
valeur constructeur.
