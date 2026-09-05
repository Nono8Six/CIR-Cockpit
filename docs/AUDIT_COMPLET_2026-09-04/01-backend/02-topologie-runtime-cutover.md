# 2. Topologie runtime et cutover

## BE-P1-03 — Le remplacement Edge → Node n'est pas achevé dans le runtime réel

- **Priorité :** P1
- **Statut :** RÉSOLU LE 5 SEPTEMBRE 2026 — EDGE `api` RETIRÉE
- **Preuves documentaires :** `docs/architecture-cible-cir-cockpit.md:67-75`, `docs/architecture-cible-cir-cockpit.md:675-683` et `docs/architecture-cible-cir-cockpit.md:1108-1134` décrivent un backend Node canonique et excluent le dual-run. `docs/stack.md:7-16` et `docs/stack.md:169-180` présentent aussi Node comme runtime actif.
- **Preuves locales :** le frontend de développement vise `/trpc`, proxifié vers le service Node local ; `/health` répond `200` et une requête tRPC sans jeton renvoie le contrat d'erreur attendu.
- **Preuves distantes au snapshot initial :** l'Edge Function Supabase `api` était `ACTIVE`, version 227. Son artefact distant contenait 120 fichiers et environ 44 649 lignes correspondant à l'ancien backend Deno supprimé localement. `gestion-utilisateurs` était également active.
- **Preuves d'usage sur 24 h :** les logs Edge montrent notamment `data.interactions` (10 succès), `tasks.change-status` (8 succès), `tasks.create` (7 succès et 4 erreurs 400), `admin.users` (5 succès), `tasks.recurrence` (5 succès) et `data.entities` (5 succès). Trois appels à `configurator.motor.catalog.list` ont reçu `404`, alors que le configurateur moteur vient d'être retiré.
- **Décision et exécution du 5 septembre 2026 :** les logs disponibles ne montraient que les probes automatisés du 4 septembre, identifiés par les user-agents `Deno/2.9.4` et PowerShell. Le PO a explicitement autorisé le retrait immédiat et accepté le risque résiduel d'un ancien consommateur absent de la fenêtre de 24 heures. La fonction `api` a été supprimée ; l'inventaire distant ne contient plus que `gestion-utilisateurs` et une sonde sur `/functions/v1/api/health` répond `404 NOT_FOUND` avec `Requested function was not found`.
- **Impact actuel :** le runtime applicatif canonique est désormais Node. Tout ancien client encore configuré sur `/functions/v1/api` échoue explicitement en `404` et doit être corrigé côté consommateur ; il n'existe plus de backend Deno divergent à maintenir.
- **Non-objectifs :** ne pas remettre en place un adaptateur permanent, un dual-write ou une couche de compatibilité générale. Ne pas redéployer l'ancien backend Deno pour masquer un consommateur resté sur l'ancienne URL.
- **Dépendances :** accès aux journaux avec métadonnées suffisantes ; inventaire des builds/frontends/automatisations encore actifs ; validation du PO sur la fenêtre d'observation et la fin du configurateur moteur.
- **Preuve d'acceptation :** matrice exhaustive des actions observées et de leurs consommateurs ; chaque consommateur utilise la procédure tRPC cible et réussit son parcours ; aucune action retirée ne produit de `404` ; aucune requête métier vers `functions/v1/api` pendant la fenêtre définie ; seulement alors, plan de désactivation et sonde post-cutover. La documentation `architecture-cible` et `stack` reflète le runtime réellement servi.

## Décision de séquencement

La Brique DBOS est **conditionnée**, pas abandonnée. Elle ne doit commencer qu'après :

1. la frontière DB/RLS de BE-P1-01 et l'acteur d'audit de BE-P1-05 ;
2. la fin mesurée de BE-P1-03 ;
3. la stabilisation des réservations IA de BE-P2-02.

Ce séquencement évite de rendre durable une topologie dont l'autorité n'est pas encore établie.

## Matrice observée au snapshot initial et issue du cutover

| Action Edge | Volume observé | Cible Node | Consommateur observé | Issue au 5 septembre 2026 |
|---|---:|---|---|---|
| `data.interactions` | 10 × 200 | procédure tRPC correspondante | probe `Deno/2.9.4` | Edge retirée |
| `tasks.change-status` | 8 × 200 | Tasks tRPC | probe `Deno/2.9.4` | Edge retirée |
| `tasks.create` | 7 × 200, 4 × 400 | Tasks tRPC | probe `Deno/2.9.4` | Edge retirée |
| `admin.users` | 5 × 200 | Admin tRPC | probe `Deno/2.9.4` | Edge retirée |
| `tasks.recurrence` | 5 × 200 | Tasks tRPC | probe `Deno/2.9.4` | Edge retirée |
| `data.entities` | 5 × 200 | Tiers tRPC | probe `Deno/2.9.4` | Edge retirée |
| `configurator.motor.catalog.list` | 3 × 404 | aucune, fonctionnalité retirée | probe PowerShell | Edge retirée |

La fenêtre de logs ne prouve pas l'absence absolue d'un ancien consommateur. Le retrait immédiat repose sur l'acceptation explicite de ce risque par le PO ; aucun consommateur absent de l'échantillon n'est présenté comme migré.
