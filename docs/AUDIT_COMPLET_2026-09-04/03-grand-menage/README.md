# Étape 3 — Grand ménage

## Verdict

Le dépôt n'est pas encombré par des copies binaires identiques : **aucun doublon exact** n'a été trouvé parmi les fichiers suivis. La dette réelle est plus ciblée et plus utile à traiter : **37 fichiers candidats sans consommateur interne détecté**, trois blocs devenus inaccessibles dans des fichiers actifs, des contrats exportés sans usage interne, deux anciens plans IA qui pointent encore vers le backend Deno supprimé, et des dépendances à corriger sur preuve de vulnérabilité.

Après la dernière vérification des consommateurs externes, le nettoyage proposé peut retirer jusqu'à **2 925 lignes non vides** avant même les blocs internes. Il doit être exécuté par petits lots réversibles, sans créer une nouvelle couche d'abstraction « de ménage » et sans supprimer les migrations, types générés, fichiers métier Excel ou scripts d'exploitation légitimes.

## État mesuré

| Contrôle | Résultat au 4 septembre 2026 |
| --- | --- |
| Fichiers suivis inventoriés | 1 273 |
| Graphe d'import | 1 048 sources : 1 041 `.ts`/`.tsx` et 7 `.js`/`.mjs`/`.css` ; 3 899 arêtes |
| Migrations SQL inspectées | 143 |
| Fichiers sans consommateur interne détecté | 37 candidats, jusqu'à 2 925 lignes non vides après gate externe |
| Doublons de contenu exacts | 0 |
| Références locales obsolètes actionnables | 33, toutes dans les deux plans `docs/ASSISTANT_IA/` |
| Classeurs suivis | 8 `.xlsx`/`.xlsm`, huit empreintes distinctes |
| Audit de dépendances | 11 avis : 5 élevés, 4 modérés, 2 faibles |
| Dépendances en retard | 37, dont 20 dans le même majeur et 17 changements de majeur |
| Contrôles statiques | typecheck, lint et `repo:check:local` verts |

Un fichier « sans import entrant » reste un **candidat** tant qu'une résolution dynamique, un script externe ou un consommateur public n'a pas été exclu. Les suppressions ci-dessous intègrent cette dernière vérification dans leur gate.

## Priorités

| ID | Priorité | Statut | Décision |
| --- | --- | --- | --- |
| [`GM-DEP-01`](03-dependances-assets-generes.md#gm-dep-01--fflate-sur-le-chemin-dimport-utilisateur) | P1 | CONFIRMÉ | Mettre `fflate` à niveau : `unzipSync` traite les classeurs importés et la version 0.8.2 peut boucler sur un ZIP64 malformé. |
| [`GM-DEP-02`](03-dependances-assets-generes.md#gm-dep-02--xlsx0185-vulnérable-et-limité-aux-tests) | P1 | CONFIRMÉ | Retirer `xlsx@0.18.5`, limité à deux tests mais porteur de deux avis élevés sans correctif npm. |
| [`GM-DEAD-01…05`](01-code-mort-surfaces-fantomes.md#gm-dead-01--ancien-contrat-ia-et-sémantique-produit) | P2 | CONFIRMÉ DANS LE DÉPÔT | Supprimer les 37 candidats par lots cohérents après la gate des consommateurs externes, avec les tests et mocks devenus sans objet. |
| [`GM-DEAD-06`](01-code-mort-surfaces-fantomes.md#gm-dead-06--blocs-morts-dans-des-fichiers-actifs) | P2 | CONFIRMÉ | Retirer les anciens chemins de quota et d'agrégation tarifaire inaccessibles dans des fichiers encore actifs. |
| [`GM-DOC-01…04`](04-documentation-obsolete-liens.md#gm-doc-01--deux-autorités-ia-incompatibles) | P2 | CONFIRMÉ | Réaligner l'architecture et supprimer ou condenser les deux plans IA Deno supersédés. |
| [`GM-RUN-01`](03-dependances-assets-generes.md#gm-run-01--runner-dintégration-non-canonique) | P2 | CONFIRMÉ | Réparer le runner d'intégration : aujourd'hui il prépare un fichier d'environnement que Vitest ne charge pas. |
| [`GM-DEAD-07/08`](01-code-mort-surfaces-fantomes.md#gm-dead-07--exports-publics-candidats-pas-suppressions-automatiques) | P3 | À VALIDER | Réduire les exports et codes d'erreur « catalogue seulement » après vérification des consommateurs externes. |
| [`GM-DUP-01…07`](02-doublons-normalisation.md#gm-dup-01--dialogue-de-test-dun-provider-ia) | P2/P3 | CONFIRMÉ | Corriger deux duplications de vérité puis extraire seulement cinq petites duplications de composants au contact des écrans concernés. |
| [`GM-DEP-03`](03-dependances-assets-generes.md#gm-dep-03--huit-autres-avis-à-traiter-par-montée-bornée) | P1/P2 | CONFIRMÉ | Corriger les huit autres avis par montées patchées et preuve d'atteignabilité, sans override aveugle. |
| [`GM-DEP-04`](03-dependances-assets-generes.md#gm-dep-04--37-dépendances-en-retard) | P3 | À PLANIFIER | Mettre à niveau les dépendances par ensembles cohérents ; ne pas lancer une mise à jour générale vers les derniers majeurs. |

## Dossiers de décision

1. [Code mort et surfaces fantômes](01-code-mort-surfaces-fantomes.md) : les 37 fichiers, les blocs internes, exports et codes d'erreur candidats.
2. [Doublons et normalisation](02-doublons-normalisation.md) : ce qui est réellement dupliqué, ce qui ne l'est pas et les extractions maximales acceptables.
3. [Dépendances, assets et fichiers générés](03-dependances-assets-generes.md) : vulnérabilités, runner, classeurs, lockfile et artefacts à conserver.
4. [Documentation obsolète et liens](04-documentation-obsolete-liens.md) : corpus IA supersédé, 33 références cassées et neuf preuves historiques.
5. [Plan de suppression séquencé](05-plan-suppression-sequence.md) : ordre, gates et points d'arrêt.

## Principes de ménage

- Une migration appliquée est une preuve historique immuable, pas du code mort.
- Un type généré est jugé sur son générateur et sa reproductibilité, pas sur le nombre de lignes.
- Une duplication de 50 lignes ne justifie pas un framework générique.
- Un export sans usage interne n'est retiré qu'après recherche des consommateurs hors dépôt.
- Une preuve historique n'a pas à rester dans le corpus actif si son contenu utile est extrait dans un journal compact.
- Une dépendance majeure n'est jamais mise à jour dans un lot de suppression sans rapport avec elle.

## Non-objectifs

- Pas de refonte générale des composants, du routeur ou des services longs.
- Pas de réécriture des migrations ni de suppression des index sur intuition.
- Pas de suppression du runtime Edge distant au titre du « code mort » : son trafic récent l'interdit.
- Pas de normalisation cosmétique globale des libellés ou fichiers.
- Pas de modification de code, dépendance, lockfile, runtime ou documentation canonique dans cette livraison d'audit.
