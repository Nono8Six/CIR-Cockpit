# Brainstorm complet — refonte UX du parcours Remplacement

Session du **04/08/2026**, entre le PO (Arnaud Ferron) et un agent Claude Code.
Point de départ : l'écran livré en C6 sur `/configurateurs/moteurs/remplacement`.

**Statut de ce document : historique de séance, pas validation produit.** Les
mentions « décidé », « retenu » ou « validé » ci-dessous décrivent les choix du
brainstorm au moment où ils ont été formulés. Elles ne remplacent ni l'observation
de scénarios d'appel C7-1, ni la validation métier C7-6, ni une recette versionnée.

**Suite C7-1 du 04/08/2026 :** cinq simulations de co-conception ont depuis
invalidé plusieurs choix de cette séance. Les photos sont conditionnelles, l'application
et la fonction sont obligatoires avant solution techniquement validée, l'ordre reste adaptable et
aucun roulement n'est prescrit depuis application × accouplement. La source de travail
courante est `02-specification-parcours-cible.md` ; le prototype v6 est archivé.

**Correction PO du 05/08/2026 :** les mentions historiques de devis, stock,
disponibilité ou proposition commerciale ci-dessous décrivent le langage employé pendant
la séance ; elles ne font pas partie du modèle C7. Le vocabulaire courant est : recherche
préliminaire, candidat technique, solution techniquement validée et qualification
spécialisée requise. Pour ATEX, C7 qualifie les faits et la compatibilité technique ; il ne
prépare ni ne valide un devis.

Chaque section reprend le retour du PO **verbatim**, puis ce qui en a été décidé et
produit. Les retours sont conservés tels quels parce qu'ils portent des arbitrages
métier que la reformulation aurait dilués.

---

## Tour 1 — Le rejet de C6 et la direction « client au téléphone »

> Regarde ce qu'on viens de faire (C6) `http://localhost:3000/configurateurs/moteurs/remplacement`
> je n'aime pas du tout. Vraiment. C'est le fouillit pas du tout optimisé ui/ux le design
> est a chié. On ne comprends rien, c'est absolument pas compréhensible par un TCS ou
> n'importe qui. NON. On va repartir a 0. On doit avancer par étape. On a le client au
> téléphone, chaque question arrive avec un visuel clair. Limite avec une plaque
> signalétique et l'info entouré, et également l'info sur le moteur en 2D ou 3D ou photo.
> Tu vois. On va brainstormer au max avant de faire quoi que ce soit, créer une expérience
> utilisateur parfaite. Vraiment utilise tes recherche web, mcp, et skills.

### Diagnostic de l'existant

L'écran C6 (`frontend/src/components/configurator/pages/MotorReplacementPage.tsx` et
`MotorNameplateForm.tsx`) a été inspecté en fonctionnement. Les défauts constatés :

- **~12 champs affichés simultanément** sur l'étape « L'essentiel » : puissance, fréquence,
  alimentation, pôles, vitesse, tension, courant, réseau, couplage, classe IE.
- Un **pseudo-stepper** (« L'essentiel / Le montage / Les cotes ») qui n'ordonne rien :
  les trois onglets sont librement accessibles et ne portent aucune progression réelle.
- L'**aide visuelle existe mais est enterrée** : le schéma coté (`MotorSchematic`) et la vue
  réaliste quatre angles (`MotorVisualExplorer`) ne s'affichent qu'à la troisième étape,
  alors que c'est le seul contenu qui aide vraiment un TCS au téléphone.
- Le vocabulaire est **technique avant d'être conversationnel** : les libellés décrivent des
  champs de formulaire, pas des questions à poser à un client.

Verdict : les briques sont bonnes, la **composition** est le problème. Ce n'est pas un
formulaire qu'il faut à un TCS au téléphone, c'est un souffleur de questions.

### Recherche mobilisée

- **GOV.UK — « one thing per page »** : une question par écran ; les utilisateurs peu
  confiants s'en sortent mieux, la gestion des erreurs, branchements et reprises est plus
  simple. Réserve documentée : les utilisateurs fréquents fatiguent du clic-par-question —
  d'où le mode expert resté en question ouverte.
- **Sélecteurs constructeurs** : ABB Drive and Motor Selector fonctionne par « une série de
  questions simples » ; WEG Motor Cross part de la référence. Confirme la viabilité du
  guidé, mais aucun ne traite le cas « moteur en place hors catalogue », qui est le nôtre.
- **Lecture de plaque IEC 60034-1** : structure canonique (Type, tableau V/Hz/tr·min⁻¹/kW/A/cos φ,
  ligne IP/Icl/IE/η/masse/Ta, ligne roulements). A servi à dessiner la plaque générique
  du prototype et à formuler les questions dans l'ordre de lecture réel.
- **Guided selling / configurateurs** : progression du plus structurant au plus fin, retour
  visuel immédiat, prévention des configurations invalides plutôt que correction après coup.
- **Skills dépôt** : `cir-cockpit-agent-router`, `cir-cockpit-design` (tokens réels, thème
  clair unique, plancher typographique 11 px, dialogs centrés jamais de sheets latérales).

### Décisions du tour 1

1. **Une question par écran**, formulée telle qu'elle se dit au client, avec un bandeau
   « À dire au client » et la phrase entre guillemets.
2. **La plaque signalétique devient la carte de navigation** : plaque IEC générique en SVG,
   zone concernée entourée en rouge, reste estompé.
3. **« Le client ne sait pas » est une réponse de premier rang** : chaque écran a son
   échappatoire qui crée un fait *à demander*, jamais une valeur inventée.
4. **Le relevé se construit sous les yeux du TCS** en chips cliquables avec provenance.
5. **Vérification finale « relisez au client »** avant la recherche explicite.

### Produit

Prototype **v1** : écran d'entrée (3 portes), 5 questions, récapitulatif.

---

## Tour 2 — Hauteur d'axe sur la plaque, suppression de l'entrée catalogue, balayage exhaustif

> la hauteur d'axe est également souvent indiqué sur la plaque signalétique. J'aime bien
> ton approche "le client lit la plaque". Après la référence déjà identifiée non oublie car
> ce ne sont pas des références complète dans ma base de données. Aussi il faut faire gaffe
> au option possible genre l'ip, si il y a un frein, si il y a des roulements spécifique,
> dans quelle sens est le moteur (si c'est en V1 avec roulement spécifique) etc... si il y
> a une classe de température élevé, ventilation forcée etc... il ne faut passer a côté de
> rien !!

> même des choses que j'ai pas forcement pensé !!

### Décisions du tour 2

1. **La hauteur d'axe se lit d'abord sur la plaque**, via la désignation : « LSF **132** M »
   → carcasse 132 → H ≈ 132 mm. Extraction automatique du nombre, déduction affichée.
2. **L'entrée « référence déjà au catalogue » est supprimée** : la base ne contient pas de
   références constructeur complètes. La plaque devient la seule vérité d'entrée.
   *Cette décision annule l'entrée secondaire livrée en C6* (`equivalents.fromMotor` depuis
   `MotorReferencePicker`).
3. **Balayage « tour du moteur »** ajouté, en écrans multi-choix : l'arrière (frein, codeur,
   ventilation forcée, 2ᵉ bout d'arbre), l'entraînement (courroie, 2 vitesses, boîte à bornes,
   sens imposé), l'environnement (ATEX, lavage HP, corrosif, Ta > 40 °C).
4. Ajout dans le chapitre plaque : IP, classe d'isolation B/F/H + Ta, ligne roulements.
5. Sur la demande « même des choses que j'ai pas forcément pensé », un inventaire élargi a
   été documenté : service S1/S3/S4, bi-tension, bi-fréquence 50/60 Hz, roulement isolé,
   motoréducteur intégré non-IEC (les Bonfiglioli M/ME/MX déjà en base), masse et levage,
   déclassement altitude, et l'angle réglementaire **IE1/IE2 → IE3 minimum** au remplacement.

### Produit

Prototype **v2**.

---

## Tour 3 — Roulements plus faciles, toutes les brides, positions IM normalisées

> on ne sais pas comment intégré par exemple les roulements ça doit être plus facile, aussi
> il manque des type de bride, également la position du moteur exact. avec le choix de tous
> les positions possible, tu vois la position doit pouvoir être sélectionné avec les icones
> de moteur dans la position et le nom de la norme IM B3 etc... tu vois ? le but est de ne
> faire AUCUNE erreur de détermination. Vraiment. Et aider le client a avoir le meilleur
> moteur avec la configuration optimal pour son application, en faisant le max d'économie
> d'énergie

### Décisions du tour 3

1. **Fixations complètes** : B3, B5 (grande bride à trous lisses), B14 (petite bride
   taraudée), B35, B34 — reconnaissables à l'image, jamais au code.
2. **Position exacte en codes IM (IEC 60034-7), choisie par icônes**, avec la liste
   contextuelle de la fixation retenue. Le trait épais de chaque icône matérialise la
   surface d'appui (sol, mur, plafond, machine). Objectif énoncé par le PO :
   **aucune erreur de détermination possible**.
3. **Roulements déduits** au lieu d'être demandés (première formulation) : courroie →
   renforcé côté accouplement, position verticale → adapté, variateur → isolé NDE.
4. **Profil d'usage (h/an)** introduit pour ouvrir l'angle économie d'énergie, appuyé sur
   `configurator.motor.energy.compute` déjà livré en C3-6.

### Produit

Prototype **v3**.

---

## Tour 4 — Adaptativité, application obligatoire, déterminisme

> Pour la hauteur d'axe attention il faut juste écrire "132" le LSF ne sert a rien ? sauf si
> je me trompe ? et le "M" non plus ? aussi le fonctionnement sur réseau ou variateur ? ça a
> un gros intéret ? plutot vers la fin ? je sais pas. Et aussi peut être demandé la distance
> entre le moteur et variateur si il y en a un, mais peut être aussi définir une certaine
> puissance pour poser ces questions ? genre un 5,5kw on s'en fous de la longueur de câble ou
> de l'économie d'énergie qui est minime ? il doit y avoir une puissance mini ou les économie
> sont pertinente ? je sais pas a voir fais des calculs. pour la question 9/14 tu redemande la
> hauteur d'axe alors qu'on la déjà définit avant et en plus tu demande la hauteur d'axe alors
> que c'est un moteur B5 .... compliqué a mesurer ? pour le 10/14 fais ça sous forme de
> questionnaire rapide plutot que le tcs va demander au client, y a t-il des options
> particulière frein, ventilation séparé, codeur, etc... ? avec l'impact etc... Sur la question
> 13/14 pareil c'est un peu flous, on peut répondre ce qu'on veut c'est pas assez déterministe
> il n'y aura pas d'ia pour interpreter.... Et du coup tu as carrement supprimer la demande sur
> les roulements !! il faut la remettre ! aussi la question sur l'usage est pas assez poussé,
> tu ne demande même pas d'écrire le rendement et l'ie du moteur il le faut pouvoir faire les
> simulation d'économie !! et vraiment on doit pouvoir mettre un nombre d'heure spécifique par
> jour ou ans etc... !! et aussi a aucun moment tu demande l'application !! c'est impératif.
> Après ça fais beaucoup de question effectivement pour 75% des demandes ça va pas servir a
> grand chose, genre un mec qui veut changer son moteur 2,2kw il y a juste besoin de 3-4
> questions, pas besoin d'aller plus loins, mais a partir d'une certaine puissance, on peu
> apporter une vrai plus value au client ! tu comprends ?

### Réponses et décisions du tour 4

**Sur la désignation « LSF 132 M »** — le PO avait raison à moitié. Le **nombre** seul donne
la hauteur d'axe et il est extrait automatiquement. Mais le reste n'est pas inutile :

- la série (« LSF ») alimente le rapprochement constructeur — la base porte
  **599 corrélations** (`motor_vendor_correlation`) ;
- la lettre (« M ») distingue un 132 **S** d'un 132 **M**, longueurs de carcasse différentes,
  donc cote **B** différente.

Décision : **le TCS lit la ligne entière d'une traite** (coût nul), l'outil fait le tri.

**Sur réseau/variateur** — déplacé en fin de parcours, mais **conservé obligatoire** : la
recherche a besoin du bon point de fonctionnement (les 59 PMaSynRM Leroy-Somer du catalogue
n'existent qu'en variateur, cf. C2d).

**Sur le seuil de puissance — calculs faits.** Voir `03-regles-metier-et-calculs.md` pour la
méthode et le tableau complet. Conclusion : sous 11 kW, le gain d'un passage IE2 → IE3 reste
sous ~100 €/an dans la plupart des usages. Le critère retenu à ce tour était P × heures ;
il a été simplifié au tour 5.

**Bugs signalés, corrigés :**

- la cote H était **redemandée** alors que la désignation l'avait déjà donnée → elle n'est
  plus jamais redemandée dans ce cas ;
- la cote H était demandée **sur un moteur B5**, où elle n'a pas de sens (pas de pattes) →
  en bride seule, c'est l'**entraxe M** qui est mesuré, tracé en rouge sur la vue de face.

**Autres décisions :**

- **Options en questionnaire rapide déterministe** : une checklist « Y a-t-il… ? » avec
  l'impact de chaque ligne, à la place des cartes-images.
- **Suppression du champ de texte libre** : « c'est pas assez déterministe, il n'y aura pas
  d'IA pour interpréter ». Sondes et réchauffage deviennent des cases structurées.
- **Roulements réintégrés** en lecture DE / NDE (le PO a explicitement refusé leur suppression).
- **Usage précis** : heures/an en chiffre exact, préréglages 24/7 · 3×8 · 2×8 · journée.
- **Rendement η et classe IE lus sur la plaque**, indispensables aux simulations.
- **L'application devient obligatoire** : pompe, ventilation, compression, convoyage,
  broyage, levage, agitation — vocabulaire aligné sur la décision PO du 31/07/2026 pour C11.
- **Parcours adaptatif** : socle court pour un petit moteur, modules ouverts quand l'enjeu
  le justifie, avec bandeau explicite et bascule manuelle possible.

### Produit

Prototype **v4**.

---

## Tour 5 — Seuil net, détails d'options, courroie, rapport client

> En dessous de 11kw ne pose pas de question de nombre d'heure par an ! c'est pas
> intéressant. pour la question sur le frein il faut pouvoir donner les infos du frein du
> coup ! avec un petit truc qui s'ouvre si il a un frein ! pareil pour le reste, il faut
> toutes les infos pour définir correctement le moteur. Pareil 'entrainement par courroie,
> c'est pas une option il y a énormément de client qui entraine une courroie mais qui n'ont
> pas de roulement spécifique et c'est la plus valu qu'on veut faire valoir : poser la
> question et proposer un moteur avec le bon roulement ! On dois pouvoir envoyer un rapport
> au client après l'appel avec toutes les infos qu'il nous a communiquer, avec simulation
> d'économie d'énergie vs le moteur que l'on propose etc..... tu vois ?

### Décisions du tour 5

1. **Sous 11 kW, la question des heures n'est pas posée du tout** — pas seulement le module :
   la question elle-même disparaît. Le critère devient la **puissance seule**, plus simple
   à expliquer et connue dès la première question.
2. **Chaque option cochée ouvre ses champs de détail**, en choix fermés :
   frein → tension (24 / 103 / 180 V DC, 230/400 V, non lue), ventilation forcée →
   alimentation, codeur → type, 2ᵉ bout d'arbre → usage, 2 vitesses → les deux vitesses lues,
   boîte à bornes → position, sens imposé → horaire/antihoraire, sondes → CTP/PT100/thermostat,
   réchauffage → tension, ATEX → zone, Ta élevée → température estimée.
3. **La courroie sort des options et devient une question de transmission à part entière**,
   posée à chaque appel. Justification PO : « énormément de clients entraînent une courroie
   mais n'ont pas de roulement spécifique, et c'est la plus-value qu'on veut faire valoir ».
   Le client ne sait pas qu'il a un problème — c'est à CIR de proposer le bon roulement.
4. **Le rapport client devient un livrable du parcours** : compte rendu d'appel avec le
   relevé complet, les exigences déduites, le moteur proposé et la simulation d'économie
   chiffrée en kWh/an et €/an. Cible : PDF envoyé après l'appel.

### Produit

Prototype **v5**.

---

## Tour 6 — Photos systématiques, application d'abord, roulement déduit

> Ok pareil en fonction de l'application et de l'accouplement pas besoin de demander le type
> de roulement ? je sais pas, faudrait vraiment commencer par l'application, avec pas mal de
> cas différents, pareil pareil pour les différents accouplement ! et après déroulé sachant
> qu'on demande systematiquement que le client nous envoie une photo de la plaque
> signalétique ainsi qu'une photo du moteur prise de loins dans son ensemble pour définir la
> position, l'application / accouplement et possible option que le client n'a pas su nous dire.

### Décisions du tour 6

1. **Deux photos demandées systématiquement, en ouverture du parcours** :
   - la **plaque cadrée**, à plat, sans reflet ;
   - le **moteur entier vu de loin**, avec la machine entraînée et l'environnement.

   Le premier écran porte la phrase à dire au client, les deux cadrages illustrés, et ce que
   chaque photo permet de déterminer. Trois portes ensuite : les deux reçues / plaque seule /
   aucune. Le parcours ne bloque jamais sur l'absence de photo.

2. **Une photo est une preuve, un dire n'en est pas une.** Nouveau modèle de provenance :
   « lu sur photo » (fort, vert) vs « dicté » (faible, orange). Quand les photos sont là, les
   questions changent de ton — « Relevez la puissance sur la photo » au lieu de « Demandez au
   client » — et le TCS travaille en autonomie.

3. **Le parcours commence par l'application**, en deux temps : 8 familles puis 28 cas précis.
   La distinction porte : *pompe centrifuge accouplée* vs *pompe monobloc* (roue sur l'arbre
   moteur), *compresseur à vis* vs *à piston* (couple pulsé), *broyeur* vs *malaxeur*.

4. **Puis l'accouplement**, 8 types dessinés, avec repère « fréquent ici » selon la machine
   choisie — indication, jamais présélection.

5. **Le roulement n'est plus demandé : il est déduit d'application × accouplement**, avec sa
   cause affichée en direct, au récapitulatif et dans le rapport client.

   Nuance retenue sur le « je sais pas » du PO : la ligne « Roulements » de la plaque est
   **lue sur photo** quand elle existe (gratuit, fiable, c'est le TCS qui lit), **jamais
   dictée** par téléphone. Sans photo, l'étape n'existe pas. Le meilleur des deux : jamais
   pénible, capté quand c'est gratuit, exigence toujours déduite.

### Produit

Prototype **v6**, état final de la séance. Un harnais de test fonctionnel non
versionné a été annoncé (DOM simulé, **42 contrôles** sur deux scénarios : 22 kW
broyeur à courroie avec photos et 4 kW pompe monobloc sans photo). Cette assertion
n'est pas reproductible depuis le dépôt et ne constitue donc ni une preuve QA ni
une validation du parcours.

---

## Décisions explicitement rejetées — ne pas les reproposer

| Direction | Statut | Raison |
| --- | --- | --- |
| Formulaire dense multi-champs comme entrée par défaut | **Rejeté** | Le rejet initial de C6 porte précisément là-dessus. |
| Entrée « référence déjà au catalogue » | **Supprimée** | La base ne contient pas de références constructeur complètes. |
| Champ de texte libre pour les particularités | **Supprimé** | Pas d'IA pour interpréter — donnée morte. |
| Suppression pure et simple de la lecture des roulements | **Refusée par le PO** | Réintroduite en lecture sur photo. |
| Question « heures par an » sur les petits moteurs | **Interdite sous 11 kW** | Gain marginal, question inutile. |
| Courroie traitée comme une option cochable | **Rejetée** | C'est une question de transmission systématique, et la plus-value CIR. |
| Sheets latérales pour le détail | **Interdit (règle PO globale)** | Tout détail s'ouvre en dialog centré. |

## Sources externes consultées

- GOV.UK Design System / Service Manual — *one thing per page*, structuration des formulaires.
- ABB Drive and Motor Selector, WEG Motor Cross — sélecteurs guidés constructeurs.
- Documentation de lecture de plaques IEC 60034-1.
- Littérature guided selling / configurateurs produit.
- IEC 60034-7 pour les codes de position IM, IEC 60034-30-1 pour les classes de rendement.
