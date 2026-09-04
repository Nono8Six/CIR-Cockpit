# Étape 2 — Audit UI, UX et design

## Verdict

L’interface est déjà exploitable, dense et globalement cohérente sur les parcours principaux. Le shell, l’annuaire, les tâches, les référentiels et la gouvernance IA forment une base de POC sérieuse. Le problème prioritaire n’est donc pas une refonte esthétique générale.

La livraison UI ne doit toutefois pas être considérée comme stabilisée tant que les raccourcis des vues masquées peuvent agir sur la vue active. Le mécanisme de conservation des onglets monte toutes les vues visitées, puis les masque seulement avec `hidden`; leurs écouteurs `window` restent actifs. C’est un risque direct de navigation, de remise à zéro ou de soumission depuis le mauvais écran.

Après ce P0, trois corrections donnent le meilleur rendement utilisateur :

1. rendre le Pilotage honnête par rapport au modèle métier et à la pagination réelle ;
2. ne plus transformer une erreur de lecture en liste vide, compteur nul ou état « À jour » ;
3. sécuriser les changements d’agence et les fermetures de formulaires contenant des données non enregistrées.

Une refonte visuelle globale serait du sur-engineering. La bonne stratégie est de corriger les primitives et les quelques surfaces qui propagent les écarts : activation des vues, états de requête, ligne de propriété, copie presse-papiers, date civile, garde de brouillon, puis migration opportuniste des écrans concernés.

## Périmètre et méthode

L’audit porte sur le frontend React/Vite, ses contrats partagés visibles, les lectures backend qui conditionnent la vérité affichée, ainsi que les documents canoniques produit et design.

Les sources directrices sont :

- `PRODUCT.md:9-27` pour les rôles, le contexte de travail, les volumes cibles et la promesse métier ;
- `PRODUCT.md:31-68` pour le ton, la densité, les états et le plancher typographique ;
- `DESIGN.md:164-181` pour la direction « Plan coté », la palette chaude et la liste des dérives connues ;
- `DESIGN.md:260-339` pour les primitives, les six états, les dialogs centrés et les interdits ;
- `docs/architecture-cible-cir-cockpit.md:204-218` pour les frontières métier ;
- `docs/architecture-cible-cir-cockpit.md:221-257` pour le vocabulaire canonique ;
- `docs/architecture-cible-cir-cockpit.md:315-383` pour Activité, Tâche, Opportunité, Affaires et Pilotage ;
- les [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), relues dans leur version courante le 4 septembre 2026, uniquement comme contrôle secondaire d’accessibilité et de comportement web.

La preuve combine :

- lecture statique des 862 fichiers suivis sous `frontend/`, dont 828 sous `frontend/src`, complétée par les contrats et documents directement liés ;
- inventaires mécaniques sur les classes, éléments natifs et états de requête ;
- navigation locale authentifiée en `super_admin` à 1440 × 900 et 390 × 844, sans action métier mutante ;
- lecture du DOM et de l’arbre d’accessibilité sur les parcours visités ;
- rapprochement entre ce que l’écran affirme et les contrats effectivement consommés.

Les registres exhaustifs fichier par fichier sont produits séparément par l’audit maître. Ce dossier documente les écarts structurants et leur traitement.

## Légende

### Priorité

- **P0** — risque immédiat de déclencher une action dans le mauvais contexte ou de perdre une saisie ; à corriger avant tout enrichissement UI.
- **P1** — information métier fausse, perte de saisie probable, erreur masquée ou contradiction directe avec une règle produit.
- **P2** — friction récurrente, dette d’accessibilité ou incohérence qui dégrade la confiance sans bloquer le POC.
- **P3** — finition ou nettoyage à prendre au fil de l’eau.

### Statut de preuve

- **[NAV]** — reproduit ou constaté dans le navigateur local.
- **[CODE]** — démontré par le code, le contrat ou l’inventaire statique.
- **[À VALIDER]** — décision produit, comportement métier ou preuve E2E encore nécessaire. Un point ainsi marqué ne doit pas être tranché silencieusement.

## Carte des constats

| ID | Priorité | Sujet | Statut | Détail |
| --- | --- | --- | --- | --- |
| UI-01 | P0 | Raccourcis des vues masquées encore actifs | [NAV] [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-01--les-vues-masquées-continuent-à-écouter-le-clavier) |
| UI-02 | P1 | Pilotage construit sur des Activités tronquées | [CODE] | [Vérité métier](./01-verite-metier-et-ia.md#ui-02--le-pilotage-affiche-un-pseudo-pipeline-à-partir-dactivités) |
| UI-03 | P1 | KPI et filtres ne portent pas le même périmètre | [CODE] | [Vérité métier](./01-verite-metier-et-ia.md#ui-03--les-kpi-ne-répondent-pas-aux-filtres-visuellement-globaux) |
| UI-04 | P1 | Pagination Clients inventée quand le total est absent | [NAV] [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-04--lannuaire-invente-un-total-implicite-et-une-page-suivante) |
| UI-05 | P1 | Erreurs rendues comme zéro, vide ou « À jour » | [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-05--plusieurs-écrans-confondent-erreur-et-absence-de-données) |
| UI-06 | P1 | Brouillon Paramètres conservé lors d’un changement d’agence | [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-06--un-brouillon-paramètres-peut-rester-rattaché-à-lancienne-agence) |
| UI-07 | P1 | Dates civiles Tâches calculées en UTC et figées | [CODE] | [Vérité métier](./01-verite-metier-et-ia.md#ui-07--les-dates-civiles-des-tâches-ne-sont-pas-calées-sur-europeparis) |
| UI-08 | P1 | État de dialogs réutilisé entre deux tâches | [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-08--les-dialogs-tâches-peuvent-réutiliser-un-état-précédent) |
| UI-09 | P1 | Brouillon Prompt Studio fermable sans garde | [CODE] | [Vérité métier et IA](./01-verite-metier-et-ia.md#ui-09--le-prompt-studio-protège-la-publication-mais-pas-le-brouillon-local) |
| UI-10 | P1 | Sheets latéraux contraires à la décision design | [CODE] | [Design system](./03-design-system-et-coherence.md#ui-10--les-sheets-latéraux-contredisent-la-règle-de-dialog-centré) |
| UI-11 | P2 | Vocabulaire « Interaction » encore visible | [CODE] [À VALIDER] | [Vérité métier](./01-verite-metier-et-ia.md#ui-11--le-vocabulaire-visible-na-pas-fini-la-bascule-vers-activité) |
| UI-12 | P2 | État d’écran insuffisamment porté par l’URL | [CODE] | [Responsive et état URL](./05-responsive-performance-et-etat-url.md#ui-12--les-écrans-de-travail-restent-difficiles-à-partager-ou-restaurer) |
| UI-13 | P2 | Recherche globale non bornée à l’échelle cible | [CODE] | [Responsive et performance](./05-responsive-performance-et-etat-url.md#ui-13--lindex-de-recherche-front-nest-pas-compatible-avec-12-000-clients) |
| UI-14 | P1 | Dérive visuelle concentrée sur Login et fiches | [NAV] [CODE] | [Design system](./03-design-system-et-coherence.md#ui-14--deux-familles-décrans-contournent-le-design-system) |
| UI-15 | P2 | Plancher 11 px encore violé à grande échelle | [CODE] | [Accessibilité](./04-accessibilite-et-clavier.md#ui-15--le-plancher-typographique-de-11-px-nest-pas-respecté) |
| UI-16 | P2 | Focus retiré et contrôles faussement cliquables | [CODE] | [Accessibilité](./04-accessibilite-et-clavier.md#ui-16--certaines-affordances-et-focus-ne-disent-pas-la-vérité) |
| UI-17 | P2 | Repères accessibles incomplets | [NAV] [CODE] | [Accessibilité](./04-accessibilite-et-clavier.md#ui-17--les-repères-accessibles-restent-incomplets-sur-quelques-surfaces) |
| UI-18 | P2 | Copie presse-papiers annonce un succès avant confirmation | [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-18--la-copie-presse-papiers-peut-annoncer-un-faux-succès) |
| UI-19 | P2 | Fermeture de l’assistant d’import incohérente | [CODE] | [Parcours et états](./02-parcours-et-etats.md#ui-19--toutes-les-fermetures-de-lassistant-dimport-ne-réinitialisent-pas-le-même-état) |
| UI-20 | P2 | Vues IA bloquées par une requête secondaire | [CODE] | [Vérité métier et IA](./01-verite-metier-et-ia.md#ui-20--une-requête-ia-secondaire-peut-masquer-toute-la-vue) |
| UI-21 | P2 | Densité Cockpit inégale et demi-bloc vide | [NAV] [CODE] | [Responsive et performance](./05-responsive-performance-et-etat-url.md#ui-21--le-cockpit-perd-de-la-densité-sur-le-bloc-suivi) |
| UI-22 | P3 | Texte français et états de chargement à normaliser | [CODE] | [Design system](./03-design-system-et-coherence.md#ui-22--la-qualité-rédactionnelle-est-inégale) |
| UI-23 | P2 | Landmarks principaux imbriqués | [NAV] [CODE] | [Accessibilité](./04-accessibilite-et-clavier.md#ui-23--plusieurs-landmarks-principaux-sont-imbriqués) |

Les seams minimaux proposés pour traiter ces constats, sans chantier d’abstraction autonome, sont détaillés dans [Refactorings frontend ciblés](./06-refactorings-frontend-cibles.md).

## Ce qui fonctionne et doit être préservé

- Le shell possède un lien d’évitement, une navigation hiérarchisée et une palette de commandes (`frontend/src/components/AppLayout.tsx:173-180`, `frontend/src/components/app-header/AppHeaderSearchButton.tsx:25-58`).
- L’annuaire encode déjà recherche, filtres, tri, densité et pagination dans l’URL ; le problème porte sur la vérité du total, pas sur l’architecture de route (`frontend/src/components/client-directory/clientDirectorySearch.ts:77-173`).
- La page Tâches distingue chargement, erreur, vide et données sur sa zone principale et offre un retry explicite (`frontend/src/components/tasks/TasksPage.tsx:77-90`).
- Les actions destructrices majeures passent généralement par une confirmation ; le raccourci Suppr du Pilotage ouvre lui aussi le dialog d’archivage (`frontend/src/components/Dashboard.tsx:165-181`, `frontend/src/components/Dashboard.tsx:263-277`).
- Les formulaires Login portent de vrais labels, `name`, `type`, `autocomplete`, `aria-invalid` et `aria-describedby` (`frontend/src/components/login/LoginScreenForm.tsx:51-103`).
- Le mode mouvement réduit est prévu dans la feuille globale conformément à `PRODUCT.md:62-68`.
- Le test de navigation mobile à 390 × 844 n’a pas révélé de débordement horizontal global. Le produit reste néanmoins desktop-first, comme le verrouille `PRODUCT.md:17` ; aucun chantier « mobile app » n’est justifié.

## Ordre recommandé

### Lot A — Sécurité d’interaction

Corriger UI-01, UI-06, UI-08 et UI-09. Ce lot protège les saisies et empêche les effets croisés entre vues. Il ne doit pas modifier le modèle métier.

### Lot B — Vérité affichée

Corriger UI-02 à UI-05 et UI-07. Tant qu’une donnée est partielle ou indisponible, afficher explicitement `Partiel`, `Indisponible` ou `—`; jamais un zéro ou une page suivante fabriqués.

### Lot C — Cohérence des surfaces

Traiter UI-10, UI-14 à UI-17, UI-21 et UI-23 en corrigeant d’abord les primitives ou composants locaux qui propagent l’écart. Aucun redesign global, aucune bibliothèque supplémentaire.

### Lot D — Scalabilité et finition

Traiter UI-12, UI-13, UI-18 à UI-20 et UI-22. Ce lot peut être fractionné par écran, sans bloquer les corrections précédentes.

## Limites de la preuve

- Aucun scénario E2E mutateur n’a été rejoué : création, archivage, sauvegarde de Paramètres, publication de prompt et import sont analysés dans le code seulement.
- L’audit navigateur utilise le jeu de données local/remote actuellement visible ; il ne prouve pas le comportement sous 12 000 clients ou centaines de milliers de références.
- Le choix entre conserver les onglets montés et remonter une vue à chaque navigation est un arbitrage produit portant sur les brouillons. Le présent audit prescrit l’isolation des effets, pas la suppression automatique du keep-alive.
- Les responsabilités « collègue » dans Tâches, les étapes d’Opportunité et les futures surfaces IA restent des décisions métier à valider, pas des fonctionnalités à inventer pendant la correction UI.
