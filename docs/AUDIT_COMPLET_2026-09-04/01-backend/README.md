# Étape 1 — Audit backend

## Verdict

Le backend Node constitue une base sérieuse, mais il n'est pas encore une frontière de sécurité exploitable comme runtime canonique unique. Le verdict de cette étape est donc : **NO-GO pour la Brique DBOS, pour une nouvelle brique métier et pour le retrait de l'Edge Function `api`** tant que les deux points suivants ne sont pas traités :

1. `userDb` et `db` désignent aujourd'hui le même pool PostgreSQL privilégié, donc les RLS ne constituent pas la seconde barrière annoncée ;
2. le runtime Node local et l'ancienne Edge Function distante reçoivent tous deux du trafic réel : il existe un dual-run de fait, sans cutover mesuré.

Les services Windows `LocalSystem` restent un risque hôte réel, mais le PO les a qualifiés de simples lanceurs de développement local et a accepté ce risque hors roadmap produit le 4 septembre 2026. Ils ne conditionnent donc plus DBOS ni la stack finale.

Ces blocages n'impliquent pas une réécriture du backend. La trajectoire la plus courte consiste à centraliser une transaction de requête portant l'identité PostgreSQL/RLS et l'acteur d'audit, puis migrer les consommateurs Edge action par action sur preuve.

## Ce qui est déjà solide

- La déclaration tRPC générée est à jour et le contrôle de contrat recense **91 procédures**.
- Les entrées sont majoritairement portées par des schémas Zod stricts partagés.
- La vérification JWT repose sur JWKS et ES256 ; les sondes sans jeton renvoient une erreur publique structurée avec `request_id`.
- Les **61 tables publiques** observées ont la RLS activée.
- Les mutations Tasks et l'activation d'un référentiel tarifaire utilisent des transactions et protègent des invariants métier utiles.
- La validation locale a réussi : typecheck backend, **342 tests dans 47 fichiers**, contrat tRPC et `repo:check:local`.

Ces acquis doivent être conservés. Les gros fichiers ne sont pas, à eux seuls, un motif de refonte.

## Échelle utilisée

| Niveau | Sens |
|---|---|
| `P0` | Risque de compromission du poste ou des secrets ; correction avant tout usage élargi. |
| `P1` | Risque d'isolement, d'intégrité ou d'exploitation ; bloque le prochain jalon. |
| `P2` | Dette importante, performance ou qualité de livraison ; à planifier après les P0/P1. |
| `P3` | Hygiène ciblée ; à faire uniquement au contact du code concerné. |

Les statuts sont : `CONFIRMÉ` lorsqu'une preuve de code et/ou runtime existe, `À MESURER` lorsqu'une mesure de charge ou d'usage est nécessaire, et `À VALIDER` lorsqu'une décision produit, sécurité ou conservation reste requise.

## Blocs de l'audit

1. [Sécurité, isolation et identités](01-securite-isolation-identites.md)
2. [Topologie runtime et cutover](02-topologie-runtime-cutover.md)
3. [Intégrité, transactions et audit](03-integrite-transactions-audit.md)
4. [Contrats, erreurs et observabilité](04-contrats-erreurs-observabilite.md)
5. [PostgreSQL, migrations et index](05-postgres-migrations-index.md)
6. [Dépendances, performance et maintenance](06-dependances-performance-maintenance.md)
7. [Refactorings ciblés](07-refactorings-cibles.md)

## Ordre d'exécution recommandé

1. **Fermer BE-P1-01 et BE-P1-05 ensemble** : une seule transaction de requête doit porter les claims RLS et l'acteur d'audit ; ajouter immédiatement des gardes d'appartenance sur les mutations existantes.
2. **Fermer BE-P1-02 et BE-P1-07** : changement de mot de passe imposé côté serveur et origine IA verrouillée.
3. **Réconcilier BE-P1-03** : cartographier les consommateurs de l'Edge Function, migrer et observer l'absence de trafic avant toute désactivation.
4. Traiter les intégrités transactionnelles P1, puis les P2 prouvés. Les refactorings de taille viennent seulement lorsqu'ils facilitent l'une de ces corrections.

## Périmètre et méthode

L'audit croise le code `backend/`, les contrats `shared/`, les migrations immuables, les configurations de service, les tests, les contrôles du dépôt et des preuves runtime en lecture seule : service Windows, sondes HTTP, rôles/policies/advisors Supabase, inventaire et journaux des Edge Functions. Aucun code, schéma, service, secret, migration ni runtime n'a été modifié.

Les références externes normatives utilisées sont les documentations et avis primaires : [rôles PostgreSQL Supabase et contournement RLS](https://supabase.com/docs/guides/database/postgres/roles), [protection des mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) et [avis fflate GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98).

## Limites explicites

- Les compteurs, journaux et advisors sont une photographie du 4 septembre 2026 ; ils ne remplacent pas une mesure continue.
- Une migration appliquée reste une preuve historique immuable : elle n'est jamais classée comme « code mort » à supprimer.
- Les 76 index signalés comme inutilisés ne doivent pas être supprimés sur le seul avis automatique.
- Les trois tables IA avec RLS sans policy peuvent être intentionnellement fermées au client ; le constat demande de vérifier leurs grants, pas d'ajouter une policy permissive.
- Aucun changement de production, déploiement, migration, commit ou publication n'est inclus dans cet audit.
