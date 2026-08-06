# Hypothèses métier, taxonomies et calculs illustratifs

Ce document conserve les propositions techniques issues du brainstorm. Il ne constitue
ni un ruleset, ni une prescription constructeur, ni une autorisation de les implémenter.
**Chaque taxonomie, alerte, seuil et formulation doit être validé avec les experts métier
CIR et des cas réels avant implémentation.**

Statut : **matière C7-6**. C7 peut collecter les faits d'installation et afficher un contrôle
à effectuer. Le dimensionnement depuis l'application et les prescriptions associées relèvent
de C11 ; l'étude énergétique complète d'une référence terrain relève de C13.

---

## 1. Taxonomie des applications

Deux niveaux : 8 familles, 28 cas précis. Les anciennes clés `severity` et `suggest` issues
du prototype restent des hypothèses de classement : elles peuvent attirer l'attention sur
un contrôle ou un repère visuel, jamais produire une déduction technique.

Codes historiques `severity` : `shock` (chocs ou couple pulsé à vérifier) · `inertia`
(inertie à qualifier) · `axial` (charge axiale possible) · `brake` (besoin de freinage à
qualifier). Aucun de ces codes ne prouve le phénomène ni l'équipement requis.

### Pompage

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Pompe centrifuge accouplée | — | élastique |
| Pompe monobloc *(roue sur l'arbre moteur)* | `axial` | roue sur arbre |
| Pompe volumétrique *(engrenages, lobes, vis, péristaltique)* | `shock` | élastique, réducteur |
| Centrale hydraulique *(pompe à pistons)* | `shock` | élastique |

### Ventilation, soufflage

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Ventilateur hélicoïde en direct | `axial`, `inertia` | roue sur arbre |
| Ventilateur centrifuge à courroie | `inertia` | courroie trapézoïdale |
| Tour aéroréfrigérante | `inertia` | réducteur, courroie |
| Extracteur, dépoussiéreur | `inertia` | courroie, roue sur arbre |

### Compression

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Compresseur à vis | — | élastique, courroie |
| Compresseur à piston | `shock` | courroie |
| Soufflante, surpresseur *(Roots, canal latéral)* | — | courroie, élastique |

### Manutention, convoyage

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Convoyeur à bande | — | réducteur, chaîne |
| Rouleaux motorisés | — | chaîne, réducteur |
| Vis transporteuse | `shock` | réducteur |
| Élévateur à godets | `shock`, `inertia` | réducteur, chaîne |

### Broyage, malaxage

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Broyeur à marteaux ou couteaux | `shock`, `inertia` | courroie |
| Concasseur | `shock`, `inertia` | courroie |
| Malaxeur, pétrin | `shock` | réducteur, chaîne |

### Levage, translation

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Palan, treuil | `brake`, `shock` | réducteur |
| Translation de pont roulant | `brake` | réducteur |
| Enrouleur, dérouleur | — | réducteur, élastique |

### Agitation, mélange

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Agitateur vertical de cuve | `axial` | réducteur |
| Mélangeur horizontal | `shock` | réducteur, chaîne |
| Racleur, décanteur | — | réducteur |

### Machine, autre

| Cas | Contraintes | Accouplements fréquents |
| --- | --- | --- |
| Machine-outil, scie | `inertia` | courroie, courroie crantée |
| Centrifugeuse, essoreuse | `inertia` | courroie |
| Tambour rotatif, sécheur | `inertia`, `shock` | réducteur, chaîne |
| Autre machine | — | — |

> **À compléter avec les experts CIR.** L'hydraulique industrielle est nommée obligatoire
> pour C11 (décision PO du 31/07/2026) : `centrale_hydraulique` est un point d'entrée, pas
> une couverture complète.

### Matrice d'activation des questions — 28 cas

Cette matrice traduit la taxonomie en arbre conversationnel. Les noms de modules ci-dessous
sont descriptifs et ne constituent ni des codes de contrat ni un ruleset. Pour chaque cas,
le TCS reçoit deux à quatre questions contextuelles ; une réponse peut fermer le module
immédiatement ou ouvrir un contrôle plus profond.

#### Pompage

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Pompe centrifuge accouplée | Quel fluide et quelle fonction process ? Montage horizontal ou vertical ? Quel accouplement ? Besoin constant ou variable et régulation actuelle ? | Transmission ; charge axiale si verticale ; opportunité énergétique | Effort axial ; roulement ; variateur |
| Pompe monobloc | La roue est-elle réellement sur l'arbre moteur ? Fabricant/type de pompe ? Position du moteur ? Qui reprend la poussée et existe-t-il une documentation ? | Roue sur arbre ; charge axiale ; qualification spécialisée | Sens/valeur de poussée ; roulement ; interchangeabilité mécanique |
| Pompe volumétrique | Engrenages, lobes, vis ou autre technologie ? Accouplement direct ou réducteur ? Pression/débit et cycle déclarés ? Démarrage en charge ou dispositif de décharge ? | Transmission ; démarrage/service ; C11 process | Couple requis ; chocs ; puissance moteur |
| Centrale hydraulique | Type de pompe ? Phases pression-débit du cycle ? Accouplement ? Régulation, marche à vide ou décharge actuelle ? | C11 hydraulique ; transmission ; régulation/énergie | Puissance ; couple ; variateur |

#### Ventilation et soufflage

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Ventilateur hélicoïde en direct | La roue est-elle sur l'arbre moteur ? Position et sens de l'arbre ? Masse/inertie documentée ? Débit constant ou régulé ? | Roue sur arbre ; charge axiale ; démarrage/inertie ; énergie | Effort axial ; inertie ; roulement |
| Ventilateur centrifuge à courroie | Combien de poulies et de courroies ? Diamètre/porte-à-faux/tension côté moteur ? Intervention récente ou symptômes ? Débit constant ou régulé ? | Charge radiale ; cause de panne ; énergie | Type de roulement ; cause de panne ; gain énergétique |
| Tour aéroréfrigérante | Réducteur, arbre ou courroies ? Position du moteur ? Masse/inertie du ventilateur documentée ? Exposition à l'eau et mode de régulation ? | Transmission ; axial/radial selon montage ; environnement ; énergie | Charge ; protection ; roulement |
| Extracteur ou dépoussiéreur | Quelle matière ou poussière ? Zone ATEX déclarée ? Courroies ou roue sur arbre ? Colmatage, registre ou variation de débit ? | Dépistage ATEX ; charge radiale/axiale ; régulation/énergie | Classement ATEX ; charge ; variateur |

#### Compression

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Compresseur à vis | Accouplement ou courroies ? Pression et fonctionnement charge/à vide ? Mode de démarrage ? Refroidissement et température ambiante ? | Transmission ; démarrage ; service ; thermique | Couple ; roulement ; aptitude au service |
| Compresseur à piston | Montage des courroies ? Pression et fréquence des cycles ? Démarrage déchargé ou en charge ? Vibrations ou panne observées ? | Charge radiale ; service pulsé ; démarrage ; cause de panne | Roulement renforcé ; sévérité des chocs ; puissance |
| Soufflante ou surpresseur | Technologie exacte ? Accouplement ou courroies ? Pression/température et cycle ? Régulation actuelle ? | Transmission ; thermique ; service ; énergie | Couple ; charge ; technologie moteur |

#### Manutention et convoyage

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Convoyeur à bande | Réducteur, chaîne ou tambour moteur ? Démarrage chargé et pente ? Matière convoyée ? Blocages et fréquence des démarrages ? | Transmission ; démarrage/service ; dépistage ATEX selon matière | Couple ; frein ; ATEX |
| Rouleaux motorisés | Comment les rouleaux sont-ils entraînés ? Charge déplacée ? Marche continue ou cycles fréquents ? Coincements observés ? | Chaîne/réducteur ; service ; démarrage | Couple cumulé ; puissance ; roulement |
| Vis transporteuse | Accouplement et réducteur ? Matière transportée ? Démarrage vis pleine ou vide ? Bourrages et fréquence des cycles ? | Transmission ; dépistage ATEX ; démarrage/service | ATEX ; choc ; couple requis |
| Élévateur à godets | Transmission et position ? Dispositif antiretour ou frein existant ? Démarrage chargé ? Matière et poussières ? | Réducteur/chaîne ; freinage ; démarrage/inertie ; ATEX | Frein requis ; inertie ; classement ATEX |

#### Broyage et malaxage

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Broyeur à marteaux ou couteaux | Courroies ou autre transmission ? Rotor/inertie documentés ? Matière et poussières ? Blocages et démarrages chargés ? | Charge radiale ; inertie/démarrage ; service/chocs ; ATEX | Roulement ; inertie ; puissance |
| Concasseur | Type de transmission ? Démarrage chargé ? Blocages, inversions ou chocs observés ? Matière et environnement poussiéreux ? | Charge radiale ; démarrage ; service/chocs ; environnement/ATEX | Couple ; puissance ; roulement |
| Malaxeur ou pétrin | Réducteur ou chaîne ? Produit, densité ou viscosité ? Cycle et démarrage en charge ? Inversions ou blocages ? | Transmission ; service ; démarrage ; C11 process | Couple ; puissance ; sévérité des chocs |

#### Levage et translation

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Palan ou treuil | Charge maximale et sens de mouvement ? Frein existant et alimentation ? Service et démarrages par heure ? Type de réducteur ? | Freinage ; service intermittent ; transmission ; qualification spécialisée | Frein admissible ; couple ; service moteur |
| Translation de pont roulant | Masse déplacée et vitesse ? Réducteur/roue d'entraînement ? Frein présent ? Cycles et démarrages ? | Transmission ; freinage ; service | Frein requis ; puissance ; couple |
| Enrouleur ou dérouleur | Matière et tension demandée ? Diamètres minimal/maximal ? Accélérations/décélérations ? Régulation et freinage actuels ? | Couple variable ; régulation ; freinage ; C11 process | Couple moteur ; variateur ; récupération d'énergie |

#### Agitation et mélange

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Agitateur vertical de cuve | Mobile et réducteur ? Produit/densité/viscosité ? Qui reprend l'effort axial ? Vitesse fixe ou variable ? | Transmission ; charge axiale ; C11 process ; énergie | Effort axial ; roulement ; variateur |
| Mélangeur horizontal | Réducteur ou chaîne ? Produit traité ? Démarrage cuve chargée ? Cycles, inversions ou blocages ? | Transmission ; service/chocs ; démarrage | Couple ; puissance ; roulement |
| Racleur ou décanteur | Fonction exacte ? Transmission et vitesse lente ? Marche continue ou intermittente ? Immersion, corrosion ou température ? | Réducteur ; service ; environnement | Couple ; indice IP ; matériau moteur |

#### Machine et autres cas

| Cas | Questions contextuelles | Modules susceptibles de s'ouvrir | Ne permet jamais de déduire seul |
| --- | --- | --- | --- |
| Machine-outil ou scie | Outil et fonction exacte ? Courroies ou entraînement direct ? Cycles, freinage et variation de vitesse ? Blocages ou chocs observés ? | Charge radiale ; service ; freinage/vitesse | Inertie ; roulement ; variateur |
| Centrifugeuse ou essoreuse | Masse/diamètre du rotor ? Transmission ? Vitesse et rampes d'accélération/freinage ? Équilibrage et produit traité ? | Inertie ; transmission ; freinage ; qualification spécialisée | Inertie admissible ; roulement ; puissance |
| Tambour rotatif ou sécheur | Masse et charge du tambour ? Réducteur ou chaîne ? Démarrage chargé ? Température, poussières et matière ? | Transmission ; démarrage/inertie ; thermique ; ATEX | Couple ; choc ; classement ATEX |
| Autre machine | Que fait précisément la machine ? Que fait le moteur dans ce process ? Transmission ? Position, environnement et particularités visibles ? | Modules explicitement révélés ; qualification spécialisée si le risque reste non borné | Assimilation à un cas voisin ; charge ; équipement requis |

### Règles communes de la matrice

- Une question déjà répondue dans le tronc commun n'est jamais reposée.
- Les questions sont regroupables naturellement pendant l'appel ; les colonnes ne décrivent
  pas des écrans successifs.
- Une réponse standard ferme le module et évite les questions de détail.
- « Le client ne sait pas » conserve le fait inconnu et produit la bonne réserve.
- Les modules `C11 process` préparent une étude future ; ils ne dimensionnent rien en C7.
- `ATEX`, `axial`, `radial`, `shock`, `inertia` et `brake` désignent des contrôles à ouvrir,
  jamais des conclusions acquises.

---

## 2. Taxonomie des accouplements

| Code | Libellé | Contrôle ouvert — jamais une conclusion automatique |
| --- | --- | --- |
| `elastic` | Accouplement élastique *(manchon, broches, pneu)* | Alignement, réactions résiduelles et limites de l'accouplement à vérifier si le cas l'exige |
| `rigid` | Accouplement rigide | Alignement et efforts transmis à vérifier ; aucune absence de charge supposée |
| `gearbox` | Réducteur bridé sur le moteur *(lanterne)* | Interface, architecture interne et organe qui reprend réellement les charges à documenter |
| `vbelt` | Courroie trapézoïdale | Effort radial induit par la tension, poulie, porte-à-faux et limites constructeur à quantifier |
| `timing` | Courroie crantée | Tension, effort radial, poulie et porte-à-faux à quantifier |
| `chain` | Pignon-chaîne | Efforts radiaux et à-coups possibles à qualifier depuis le montage réel |
| `overhung` | Roue montée sur l'arbre moteur | Porte-à-faux et efforts radiaux/axiaux possibles à déterminer depuis la machine |
| `cardan` | Cardan, arbre de transmission | Angles, alignement, réactions et limites du montage à vérifier |

---

## 3. Positions IM (IEC 60034-7)

Les positions proposées sont **contextuelles à la fixation** : on ne montre jamais une
position impossible pour la construction retenue.

| Fixation | Positions proposées |
| --- | --- |
| **B3** — pattes | IM B3 (au sol) · IM B6 (mur, pattes à gauche) · IM B7 (mur, pattes à droite) · IM B8 (plafond) · IM V5 (vertical, arbre en bas) · IM V6 (vertical, arbre en haut) |
| **B5** — grande bride | IM B5 · IM V1 (arbre en bas) · IM V3 (arbre en haut) |
| **B14** — bride taraudée | IM B14 · IM V18 · IM V19 |
| **B35** — pattes + grande bride | IM B35 · IM V15 · IM V36 |
| **B34** — pattes + bride taraudée | IM B34 · verticales **consignées telles quelles**, code composé jamais inventé |

Chaque position est représentée par une icône du moteur dans sa position réelle, le trait
épais matérialisant la surface d'appui. **Le code IM se déduit de l'image choisie** — le TCS
ne récite jamais un code.

---

## 4. Hypothèses de contrôles et d'alertes — à valider

La cible future devra être **déterministe, versionnée et explicable**. Aujourd'hui, les
lignes ci-dessous sont des hypothèses de contrôles. Elles ne doivent pas produire seules
un type de roulement, un équipement ou une compatibilité.

| # | Constat | Contrôle ou alerte proposé | Cause affichée |
| --- | --- | --- | --- |
| R1 | Accouplement `vbelt`, `timing`, `chain` | Effort radial réel, montage de roulement et limites constructeur à vérifier | La tension et la géométrie de la transmission peuvent charger radialement l'arbre |
| R2 | Accouplement `overhung` | Efforts radiaux/axiaux et porte-à-faux à vérifier | La roue est montée directement sur l'arbre moteur, sans valeur de charge encore fondée |
| R3 | Cas d'application portant `shock` | Chocs, service, démarrage et choix de roulements à expertiser | Chocs ou couple pulsé de la machine |
| R4 | Cas portant `inertia` | Inertie admissible au démarrage à vérifier | Masse tournante élevée |
| R5 | Cas portant `axial`, hors `overhung` | Tenue à la charge axiale à vérifier | Nature de la machine |
| R6 | Cas portant `brake`, sans frein coché | Frein et service intermittent à confirmer | Charge suspendue |
| R7 | Position IM verticale (V1, V3, V5, V6, V15, V18, V19, V36, B34 verticales) | Sens, valeur et reprise de l'effort axial, graissage, butée et limites constructeur à vérifier | La charge peut être reprise différemment par la machine ou les roulements moteur |
| R8 | Alimentation par variateur | Mesures contre les courants de palier à déterminer selon fabricant, puissance, carcasse et installation | Courants de palier possibles avec la commutation |
| R9 | Liaison variateur-moteur longue | Préconisations du variateur et du moteur à vérifier ; aucun seuil universel C7 | Réflexions d'onde et fronts de tension |
| R10 | Environnement « lavage haute pression » | Indice IP, joints et aptitude au nettoyage à vérifier selon le matériel | Nettoyage haute pression |
| R11 | Environnement « Ta > 40 °C » | Déclassement et aptitude thermique constructeur à évaluer | Ambiante au-delà de 40 °C |
| R12 | Moteur vertical exposé aux intempéries ou ruissellements | Présence, géométrie et compatibilité du capot pare-pluie à confirmer, ainsi que la ventilation et l'évacuation des condensats | Protection contre l'eau sans dégrader le refroidissement |
| R13 | Marquage ATEX présent ou atmosphère explosive déclarée | Quitter le remplacement standard, conserver les faits et ouvrir une qualification spécialisée | Groupe, catégorie, gaz/poussières, température, certificat et zone doivent être compatibles |

**Cumul à étudier** : plusieurs contrôles peuvent être ouverts simultanément. Leur simple
addition ne prouve ni leur indépendance, ni une prescription finale.

**Gate** : aucune version 2 du ruleset n'est créée avant C7-6. Les règles validées devront
ensuite être **versionnées** comme le ruleset backend existant
(`motor.compatibility.cir`, version 1), jamais codées en dur dans le frontend.

---

## 5. Déductions de lecture

### Hypothèse désignation → hauteur d'axe

Certaines désignations IEC contiennent une carcasse correspondant à la hauteur d'axe, mais
un nombre constructeur ne doit jamais être assimilé automatiquement à cette carcasse. La
liste normalisée proposée pour une lecture assistée est :

```
56, 63, 71, 80, 90, 100, 112, 132, 160, 180, 200, 225, 250, 280, 315, 355, 400
```

Exemple à confirmer : `LSF 132 M` peut suggérer une carcasse IEC 132 et donc H = 132 mm,
seulement si la série et sa documentation confirment cette convention.

Conséquences :

- la suggestion est **affichée et à confirmer**, jamais silencieuse ;
- la question de mesure de H ne disparaît qu'après confirmation fiable de la carcasse IEC ;
- sans confirmation de série, H reste inconnu ou mesuré.

Le reste de la désignation est conservé : la **série** alimente le rapprochement constructeur
(599 corrélations en base), la **lettre de longueur** distingue un 132 S d'un 132 M — donc
une cote B différente.

### Vitesse → nombre de pôles

| Pôles | Synchronisme à 50 Hz | Plage retenue |
| --- | --- | --- |
| 2 | 3 000 tr/min | 2 700 – 3 000 |
| 4 | 1 500 tr/min | 1 350 – 1 500 |
| 6 | 1 000 tr/min | 900 – 1 000 |
| 8 | 750 tr/min | 675 – 750 |

Règle : `rpm ≤ synchronisme` et `rpm ≥ 0,9 × synchronisme`. Hors plage, la vitesse est
enregistrée telle quelle et aucune déduction n'est faite.

---

## 6. Calculs énergie illustratifs et décision d'alerte au-dessus de 11 kW

### Méthode

```
Consommation annuelle (kWh) = P (kW) × h (h/an) ÷ η
Gain (kWh/an)               = P × h × (1/η_actuel − 1/η_proposé)
Gain (€/an)                 = Gain (kWh/an) × prix du kWh
```

Prix du kWh retenu pour l'illustration : **0,18 €/kWh** — à paramétrer, ce n'est pas une
constante métier.

### Rendements de référence utilisés (4 pôles, 50 Hz, IEC 60034-30-1)

| Puissance | IE1 | IE2 | IE3 |
| --- | --- | --- | --- |
| 2,2 kW | — | 84,3 % | 86,7 % |
| 5,5 kW | — | 87,7 % | 89,6 % |
| 11 kW | 87,6 % | 89,8 % | 91,4 % |
| 22 kW | — | 91,6 % | 93,0 % |

> **Important pour l'implémentation** : ces valeurs ne doivent pas être codées en dur.
> La base contient déjà **705 seuils IEC chargés avec provenance**
> (`configurator.motor_iec_threshold` : 640 lignes + `motor_iec_vsd_threshold` : 65 lignes,
> cf. C2). La simulation doit les lire, et lire les rendements réels des candidats
> (`motor_efficiency_point`, 5 699 lignes) via `configurator.motor.energy.compute`, livré en C3-6.

### Gain annuel d'un passage IE2 → IE3

| Moteur | 2 000 h/an | 4 000 h/an | 6 000 h/an | 8 760 h/an |
| --- | ---: | ---: | ---: | ---: |
| 2,2 kW | 26 € | 52 € | 78 € | 114 € |
| 5,5 kW | 48 € | 96 € | 144 € | 210 € |
| 11 kW | 77 € | 155 € | 232 € | 339 € |
| 22 kW | 130 € | 260 € | 390 € | 569 € |
| **11 kW depuis IE1** | **188 €** | **376 €** | **565 €** | **824 €** |

### Lecture et limite de la conclusion

Le tableau ne démontre pas un seuil universel : un 2,2 kW utilisé 8 760 h/an dépasse
100 €/an dans l'illustration, tandis qu'un 11 kW utilisé 2 000 h/an reste sous 100 €/an.
La puissance, le temps, le rendement, le taux de charge et le prix de l'énergie influencent
l'intérêt de l'étude.

**Décision PO du 04/08/2026 : P > 11 kW déclenche une invitation énergétique majeure,**
que la classe IE soit connue ou non. Ce seuil ne prouve aucune économie, ne lance aucun
calcul et n'allonge pas automatiquement le remplacement : le client doit accepter la
simulation. Toute étude d'une référence terrain reste en C13.

La solution n'est pas choisie par marque ni par rendement nominal maximal. C11 qualifie
l'application, la variation du besoin et la régulation existante ; C13 compare les systèmes
compatibles — moteur seul ou moteur avec variateur — sur leur consommation annuelle au
profil réel, avec hypothèses et provenance.

### Contrainte réglementaire à exploiter

La réglementation européenne impose des niveaux minimaux selon la technologie, la puissance,
les pôles et les exclusions applicables ; IE3 couvre une large partie des moteurs triphasés,
et certains moteurs relèvent d'IE4. Le parcours doit qualifier son périmètre avant d'afficher
un message réglementaire, jamais transformer « IE1/IE2 » en conclusion universelle.

---

## 7. Vocabulaire imposé

Repris des décisions PO déjà verrouillées (31/07/2026) et étendu au parcours :

| Interdit | Obligatoire |
| --- | --- |
| « garantie », « compatible garanti » | Verdict du backend : satisfait / sous réserve / indéterminé / non satisfait |
| « économie de X € » | « économie **simulée** », « économie prévisionnelle **bornée** » |
| « économie constatée » sans mesures | Uniquement après mesures avant/après comparables |
| Valeur par défaut silencieuse | Fait manquant explicite |
| Tutoiement | Vouvoiement partout |

Aucun variateur n'est conseillé depuis le seul libellé d'une application.

---

## 8. Corpus technique de référence

### SKF — roulements des moteurs électriques et générateurs

| Métadonnée | Valeur |
| --- | --- |
| Document | *Rolling bearings and seals in electric motors and generators* |
| Éditeur | SKF Group |
| Référence | `PUB 54/P7 13459 EN` |
| Édition | Août 2013 |
| Support officiel | [PDF SKF](https://www.skf.com/binaries/pub12/Images/0901d196802b0348-13459-EN-Rolling-bearings-and-seals-in-electric-motors-and-generators_tcm_12-134586.pdf) |
| Ajout au corpus | 05/08/2026 |

Chapitres directement utiles au configurateur :

- chapitre 1, **exigences de conception et choix des roulements** : charges radiales et
  axiales, vitesse, transmission par accouplement/courroie/engrenage, montage vertical,
  environnement, lubrification et durée de vie ;
- chapitre 2, **systèmes de roulements** : architectures fixe/libre, montages verticaux,
  charges axiales modérées ou fortes et précharge par ressort ;
- chapitre 7, **dommages et actions correctives** : recherche de cause, charges trop faibles,
  glissement, échauffement et usure.

Règles d'usage dans C7/C11 :

1. Le document confirme que la transmission, l'orientation, la direction et la valeur des
   charges font partie des entrées du choix de roulements.
2. Une charge trop faible peut elle-même être défavorable à certains roulements ; un montage
   « renforcé axial » n'est donc jamais proposé par précaution sans vérifier sa charge
   minimale, sa précharge et son architecture complète.
3. La référence de roulement de l'ancien moteur est un fait observé, pas la preuve que le
   moteur installé était correctement dimensionné.
4. Aucune famille d'application, position verticale ou présence de courroies ne suffit à
   prescrire une référence de roulement. Ces faits ouvrent des contrôles explicites.
5. La compatibilité finale doit utiliser les limites actuelles publiées par le fabricant du
   moteur candidat et, lorsque nécessaire, les données de la machine entraînée. Ce guide de
   2013 fonde les questions et principes ; il ne remplace pas la documentation à jour du
   candidat.

Le PDF reste hébergé par SKF et n'est pas recopié dans le dépôt. Son contenu est protégé par
le droit d'auteur de l'éditeur ; le corpus conserve uniquement la référence, le lien et les
enseignements nécessaires au cadrage.
