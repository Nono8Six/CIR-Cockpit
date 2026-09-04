# 2. Topologie runtime et cutover

## BE-P1-03 — Le remplacement Edge → Node n'est pas achevé dans le runtime réel

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves documentaires :** `docs/architecture-cible-cir-cockpit.md:67-75`, `docs/architecture-cible-cir-cockpit.md:675-683` et `docs/architecture-cible-cir-cockpit.md:1108-1134` décrivent un backend Node canonique et excluent le dual-run. `docs/stack.md:7-16` et `docs/stack.md:169-180` présentent aussi Node comme runtime actif.
- **Preuves locales :** le frontend de développement vise `/trpc`, proxifié vers le service Node local ; `/health` répond `200` et une requête tRPC sans jeton renvoie le contrat d'erreur attendu.
- **Preuves distantes :** l'Edge Function Supabase `api` est toujours `ACTIVE`, version 227. Son artefact distant contient 120 fichiers et environ 44 649 lignes correspondant à l'ancien backend Deno supprimé localement. `gestion-utilisateurs` est également active.
- **Preuves d'usage sur 24 h :** les logs Edge montrent notamment `data.interactions` (10 succès), `tasks.change-status` (8 succès), `tasks.create` (7 succès et 4 erreurs 400), `admin.users` (5 succès), `tasks.recurrence` (5 succès) et `data.entities` (5 succès). Trois appels à `configurator.motor.catalog.list` ont reçu `404`, alors que le configurateur moteur vient d'être retiré.
- **Impact :** deux implémentations backend peuvent diverger en autorisation, contrat, bugfix, donnée et audit. Supprimer l'Edge Function maintenant casserait des consommateurs actifs ; poursuivre DBOS ou une nouvelle brique augmenterait encore le nombre de variables avant d'avoir une autorité runtime unique. Les `404` du configurateur prouvent déjà qu'au moins un consommateur n'a pas suivi la suppression.
- **Correction minimale :** extraire pour chaque action Edge son volume, origine, user-agent et identité ; associer chaque consommateur à un propriétaire ; établir une matrice action Edge → procédure tRPC Node ; migrer un consommateur à la fois ; corriger ou retirer l'appel du configurateur ; observer une fenêtre convenue sans trafic fonctionnel avant de désactiver l'Edge Function. Examiner séparément `gestion-utilisateurs` au lieu de la supposer morte.
- **Non-objectifs :** ne pas remettre en place un adaptateur permanent, un dual-write ou une couche de compatibilité générale. L'Edge Function n'est conservée que le temps du cutover prouvé. Ne pas déployer ni désactiver dans le cadre du présent audit.
- **Dépendances :** accès aux journaux avec métadonnées suffisantes ; inventaire des builds/frontends/automatisations encore actifs ; validation du PO sur la fenêtre d'observation et la fin du configurateur moteur.
- **Preuve d'acceptation :** matrice exhaustive des actions observées et de leurs consommateurs ; chaque consommateur utilise la procédure tRPC cible et réussit son parcours ; aucune action retirée ne produit de `404` ; aucune requête métier vers `functions/v1/api` pendant la fenêtre définie ; seulement alors, plan de désactivation et sonde post-cutover. La documentation `architecture-cible` et `stack` reflète le runtime réellement servi.

## Décision de séquencement

La Brique DBOS est **conditionnée**, pas abandonnée. Elle ne doit commencer qu'après :

1. la frontière DB/RLS de BE-P1-01 et l'acteur d'audit de BE-P1-05 ;
2. la fin mesurée de BE-P1-03 ;
3. la stabilisation des réservations IA de BE-P2-02.

Ce séquencement évite de rendre durable une topologie dont l'autorité n'est pas encore établie.

## Matrice de cutover minimale attendue

| Action Edge | Volume observé | Cible Node | Consommateur | État |
|---|---:|---|---|---|
| `data.interactions` | 10 × 200 | procédure tRPC correspondante | À identifier | À migrer |
| `tasks.change-status` | 8 × 200 | Tasks tRPC | À identifier | À migrer |
| `tasks.create` | 7 × 200, 4 × 400 | Tasks tRPC | À identifier | À diagnostiquer puis migrer |
| `admin.users` | 5 × 200 | Admin tRPC | À identifier | À migrer |
| `tasks.recurrence` | 5 × 200 | Tasks tRPC | À identifier | À migrer |
| `data.entities` | 5 × 200 | Tiers tRPC | À identifier | À migrer |
| `configurator.motor.catalog.list` | 3 × 404 | aucune, fonctionnalité retirée | À identifier | À supprimer côté consommateur |

Cette table doit être complétée depuis les logs ; elle n'autorise aucune déduction silencieuse sur les consommateurs absents de l'échantillon.
