# Refonte UX du parcours Remplacement — dossier de reprise

Ce dossier contient l'intégralité du brainstorm produit-design mené le **04/08/2026**
après le rejet, par le PO, de l'interface livrée en tranche **C6**, puis son audit
de reprise. Il conserve les idées utiles sans les présenter comme une
spécification d'implémentation. La structure C7-3 est validée et C7-4 a produit un
prototype testable autonome ; le code applicatif, les contrats et le stockage
restent hors périmètre.

Il est écrit pour être repris **sans le contexte de la conversation d'origine**, par
un humain ou par un autre agent.

## Statut

| Élément | État |
| --- | --- |
| Direction UX | **C7-1 v2 validée par le PO à partir des cinq simulations de co-conception** |
| Prototype cliquable | **`prototype-c7-4-remplacement-moteur.html`** — prototype testable C7-4, autonome et sans stockage. L'archive v6 reste obsolète et ne doit pas servir de cible |
| Code applicatif `frontend/` | **Aucune ligne modifiée** — la refonte n'a pas commencé |
| Backend / contrats / migrations | **Aucun changement** |
| Tranche porteuse | **C7 — Parcours Remplacement complet**, C7-0 à C7-4 terminés |
| Décision actuelle | **C7-4 livrée le 06/08/2026 sur GO PO distinct ; NO-GO C7-5, contrats, code produit, stockage et migration sans décision distincte** |

**Rien de ce dossier n'a valeur de livraison.** C6 reste une livraison technique
historique, mais son expérience a été rejetée par le PO. Son GO d'implémentation
C7 reste soumis à des décisions de sortie distinctes pour chaque checkpoint.

## Cadre de reprise C7

| Checkpoint | Objet | Gate |
| --- | --- | --- |
| **C7-0** | Corriger les statuts, séparer hypothèses et décisions, verrouiller les frontières de tranche | Terminé par cette reprise documentaire |
| **C7-1** | Jouer les cinq scénarios, relever les questions naturelles et consolider la matière du parcours | Terminé : cinq simulations de co-conception et décision PO du 05/08/2026 |
| **C7-2** | Définir les objets, états, niveaux de preuve et informations indispensables | Terminé : modèle, relations, états et cinq scénarios vérifiés |
| **C7-3** | Définir la structure du parcours, dont l'arbre déterministe, l'autonomie guidée du TCS, la photo conditionnelle, l'attente et la reprise | Terminé : validation PO du 06/08/2026 après intégration de deux corrections |
| **C7-4** | Produire un prototype testable du parcours | Terminé : `prototype-c7-4-remplacement-moteur.html`, parcours rejoués dans le navigateur, `qa:docs` vert |
| **C7-5** | Faire la recette PO du parcours testable sur les scénarios et le corriger | Non commencé ; bloque le code |
| **C7-6** | Faire valider les alertes et règles techniques par les experts métier CIR | Non commencé ; bloque toute prescription |
| **C7-7** | Décider les extensions de contrats strictement nécessaires | Non commencé |
| **C7-8** | Implémenter la tranche autorisée | Non autorisé |
| **C7-9** | Recette réelle, accessibilité, responsive, reprise et erreurs | Non autorisé |

## Contenu

| Fichier | Contenu |
| --- | --- |
| [`01-brainstorm-conversation.md`](01-brainstorm-conversation.md) | Le brainstorm complet, tour par tour : retours PO verbatim, décisions prises, version du prototype produite à chaque itération. |
| [`02-specification-parcours-cible.md`](02-specification-parcours-cible.md) | Source validée de C7-1 v2 : décisions acquises, breadboard, cinq simulations de co-conception et décision de sortie PO. |
| [`03-regles-metier-et-calculs.md`](03-regles-metier-et-calculs.md) | Taxonomies et hypothèses techniques à faire valider ; calculs illustratifs, sans seuil métier verrouillé. |
| [`04-ecarts-backend-et-questions-ouvertes.md`](04-ecarts-backend-et-questions-ouvertes.md) | Frontières C7/C8/C9/C11/C13, écarts contractuels, questions ouvertes et gates de reprise. |
| [`05-modele-conceptuel.md`](05-modele-conceptuel.md) | Modèle métier C7-2 : objets, faits et preuves, relations, quatre états, contrôles, rejeu S1–S5 et vocabulaire commun. |
| [`06-structure-parcours.md`](06-structure-parcours.md) | Livrable C7-3 validé : cinq lieux logiques, arbre déterministe, autonomie guidée du TCS, attente/reprise, corrections, branches et qualification spécialisée en dernier recours. |
| [`prototype-c7-4-remplacement-moteur.html`](prototype-c7-4-remplacement-moteur.html) | **Livrable C7-4** : prototype testable du configurateur technique. Une étape active à la fois, arbre déterministe, contrôles conditionnels, mesures guidées, photo ciblée avec attente et reprise exacte, corrections rouvrant les dépendances, recherche explicite, quatre états et scénarios S1 à S5. Chaque étape porte son repère visuel : plaque signalétique fidèle, schémas 2D cotés et coupes, avec l'information demandée entourée en rouge. Les six vignettes de construction sont tracées **à l'échelle** depuis les cotes réelles de la carcasse 132 ; la planche des positions de montage **est** le sélecteur ; l'étape des équipements ouvre un **balayage guidé** en quatre zones. |
| [`validation-c7-3.html`](validation-c7-3.html) | Support express de revue PO : 5 décisions, une seule affichée à la fois, réponse oui/non/incertain, commentaire facultatif, sauvegarde locale et exports Markdown/JSON. |
| [`prototype/configurateur-remplacement-concept.html`](prototype/configurateur-remplacement-concept.html) | Archive cliquable v6, conservée pour comprendre les directions rejetées ; ne pas utiliser comme cible. |

## Valider C7-3 de manière interactive

Ouvrir `validation-c7-3.html` dans un navigateur. Le support ramène le livrable à
5 décisions PO, présentées une par une, et conserve les réponses et commentaires
uniquement dans le stockage local du navigateur. Le compte rendu s'exporte en
Markdown ou JSON. Il s'agit d'un outil de revue documentaire C7-3, pas du prototype
produit C7-4.

## Ouvrir le prototype testable C7-4

Le fichier est autonome : aucune dépendance, aucun appel réseau, aucune donnée
enregistrée, aucun catalogue interrogé.

```bash
start docs/CONFIGURATEURS/refonte-ux-remplacement/prototype-c7-4-remplacement-moteur.html
```

Le bouton **Guide** rappelle en une fenêtre ce que le prototype teste, les quatre
états, les règles visibles à l'écran et les raccourcis clavier. Cinq scénarios
documentés S1 à S5 démarrent un parcours neuf en consignant d'emblée les faits que
le client a donnés spontanément ; une entrée distincte reprend un parcours
interrompu en attente de photo.

Ce prototype sert la recette C7-5. Il ne contient ni code applicatif, ni contrat,
ni stockage : les verdicts sont calculés à partir du relevé saisi et aucune
référence catalogue n'est simulée.

## Ouvrir le prototype archivé

Le fichier est autonome : aucune dépendance, aucun appel réseau, aucune donnée réelle.

```bash
start docs/CONFIGURATEURS/refonte-ux-remplacement/prototype/configurateur-remplacement-concept.html
```

Il reproduit les tokens réels du design system (`frontend/src/index.css`) mais n'est
**pas** du code applicatif. Il est désormais **obsolète** : photos systématiques,
application rigide en ouverture, déductions de roulement et ancien parcours énergétique
contredisent les décisions C7-1. Il ne doit pas être importé ni corrigé par petites touches.

Deux scénarios peuvent encore être joués pour comprendre les hypothèses rejetées de la v6 :

1. **22 kW, broyeur à courroie, deux photos reçues** — montre pourquoi les photos
   obligatoires et les prescriptions automatiques ne sont plus retenues.
2. **4 kW, pompe monobloc, aucune photo** — parcours minimal proposé par la v6,
   utile pour repérer les questions ou conclusions que le prototype saute à tort.

## Ce qu'il faut lire avant de reprendre

Dans l'ordre, et seulement ce qui est utile :

1. Ce README.
2. `01-brainstorm-conversation.md` pour comprendre **pourquoi** chaque hypothèse a émergé
   — plusieurs directions ont été explicitement rejetées par le PO, les reproposer serait
   une régression, mais le dernier tour ne vaut pas validation du prototype v6.
3. `02-specification-parcours-cible.md` comme source C7-1, puis
   `03-regles-metier-et-calculs.md` comme matière technique à confronter aux experts.
4. `05-modele-conceptuel.md`, puis `06-structure-parcours.md` pour les objets C7-2 et la
   logique d'interaction C7-3 validée par le PO.
5. `04-ecarts-backend-et-questions-ouvertes.md` **avant d'écrire du code** : plusieurs faits
   du parcours n'existent pas dans les contrats backend actuels.
6. `docs/CONFIGURATEURS/plan-execution.md` pour l'état réel de la brique.
7. `AGENTS.md` pour les règles de travail du dépôt (zéro donnée mockée, Zod strict,
   système d'erreurs CIR, skills obligatoires, politique QA par impact).

## Trois règles non négociables issues de ce brainstorm

Elles reprennent des décisions PO déjà verrouillées ailleurs dans la brique et les
étendent au parcours guidé :

1. **Aucune valeur n'est inventée.** Un fait inconnu reste un fait manquant visible,
   jamais une valeur par défaut, jamais un zéro de remplacement.
2. **Chaque fait distingue sa source et son canal de preuve.** Une valeur de plaque
   reste une valeur de plaque, qu'elle soit lue sur une photo ou déclarée au téléphone ;
   une déduction affiche toujours sa règle et ses entrées.
3. **Aucun texte libre destiné à être interprété.** Il n'y a pas d'IA dans ce parcours :
   toute information exploitée par la recherche vient d'un choix fermé ou d'un nombre.

## Décisions UX actuelles

- L'application et la fonction réelle du moteur sont obligatoires avant toute solution
  techniquement validée, même si le client ne les donne pas spontanément.
- Le TCS suit l'arbre de décision étape par étape. Le configurateur pose une question
  active à la fois, indique où trouver l'information et saute les nœuds déjà satisfaits
  par une réponse spontanée.
- Le chemin standard vise rapidement un candidat technique avec puissance, application,
  carcasse, fixation, vitesse et alimentation, puis les seuls contrôles nécessaires.
- Toutes les constructions de bride sont présentées visuellement ; le TCS n'a pas à
  connaître les codes ni à inventer la cote à demander.
- La photo est conditionnelle et reste un moyen d'information guidé pour le TCS. Un
  spécialiste n'intervient qu'après épuisement des questions, repères, mesures, documents
  ou photos accessibles au TCS, sauf expertise explicitement réservée.
- Un candidat technique conserve ses réserves ; une solution techniquement validée
  constitue un niveau distinct.
- L'étude énergétique est facultative, fortement proposée au-dessus de 11 kW et neutre
  entre les technologies et fournisseurs.

## Frontières non négociables de la reprise

- **C7** mène l'appel, collecte les faits, guide les mesures, recherche et explique
  la compatibilité documentaire.
- **C8** porte la sauvegarde et la reprise du relevé structuré. La photo reçue par email
  reste hors du configurateur et n'y est pas téléversée.
- **C9** porte la fiche technique PDF et son identité validée.
- **C11** dimensionne depuis le process et valide les prescriptions liées à l'application.
- **C13** modélise la référence terrain énergétique, les profils, scénarios, kWh et euros.

C7 peut collecter l'application, la transmission et l'environnement pour préparer ces
briques. Il ne transforme pas leur simple libellé en prescription technique ou en économie.
