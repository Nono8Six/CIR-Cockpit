# 5. PostgreSQL, migrations et index

## État observé

- Les migrations locales et l'historique distant sont réconciliés au contrôle du dépôt ; la migration de retrait du configurateur moteur `20260904091933_retire_motor_configurator` est appliquée.
- Les 61 tables du schéma public observées ont la RLS activée.
- Les policies principales existent sur les domaines Tiers, Interactions, Activities et Tasks, mais BE-P1-01 démontre que le pool Node courant les contourne.
- Les migrations appliquées constituent un journal immuable. Une incohérence de commentaire ou une correction de fonction doit être portée par une **nouvelle** migration, jamais par l'édition/suppression d'une migration appliquée.

## BE-P2-08 — Les advisors signalent 11 FK sans index et un index réellement dupliqué ; 76 « unused » restent à mesurer

- **Priorité :** P2
- **Statut :** À MESURER
- **Preuves runtime :** l'advisor performance Supabase a remonté 11 clés étrangères sans index couvrant, un doublon d'index et 76 index non utilisés dans sa fenêtre statistique.
- **FK signalées :**
  - `ai_model_configs.provider_config_id` ;
  - `ai_response_cache.prompt_version_id` ;
  - `ai_usage_events.model_config_id` ;
  - `ai_usage_events.prompt_version_id` ;
  - `customer_account_secondary_commercials.created_by` ;
  - `customer_accounts.created_by` ;
  - `organization_business_profiles.created_by` ;
  - `pricing_reference_column_mapping_profiles.created_by` ;
  - `pricing_reference_column_mapping_profiles.updated_by` ;
  - `pricing_reference_import_files.mapping_confirmed_by` ;
  - `tier_roles.created_by`.
- **Doublon signalé :** sur `ai_model_configs(provider, model_id)`, l'index `ai_model_configs_provider_model_id_idx` recouvre la clé/contrainte unique `ai_model_configs_provider_model_id_key`.
- **Impact :** les FK non indexées peuvent rendre coûteux joins, suppressions et contrôles de référence à mesure que les volumes augmentent. Le doublon consomme écriture et stockage. À l'inverse, supprimer aveuglément les 76 index « inutilisés » peut dégrader des parcours peu fréquents, futurs ou simplement absents depuis le dernier reset des statistiques.
- **Correction minimale :** pour chaque FK, rechercher les requêtes JOIN/WHERE et inspecter `EXPLAIN (ANALYZE, BUFFERS)` sur un volume représentatif ; créer seulement les index justifiés, en regroupant éventuellement avec un index composite déjà nécessaire. Vérifier la définition exacte du doublon puis supprimer uniquement l'index non contraignant redondant. Pour les 76, collecter `pg_stat_user_indexes`, date de reset et charge représentative avant décision.
- **Non-objectifs :** ne pas créer les 11 index ni supprimer les 76 en bloc sur la seule parole de l'advisor ; ne pas lancer `EXPLAIN ANALYZE` sur une écriture non encapsulée.
- **Dépendances :** fenêtre de mesure représentative ; requêtes cibles et volumétrie ; nouvelle migration additive/concurrente adaptée au service distant.
- **Preuve d'acceptation :** dossier avant/après par index retenu avec requête, plan, buffers, cardinalité, temps et coût d'écriture ; aucune contrainte unique supprimée ; advisor du doublon résolu ; décision explicite « garder/supprimer/attendre » pour chaque index unused réellement étudié.

## RLS sans policy

Le constat [BE-P2-12](01-securite-isolation-identites.md#be-p2-12--trois-tables-ia-sont-rls-sans-policy--fermeture-volontaire-à-prouver) couvre les trois tables IA signalées. L'absence de policy est restrictive par défaut ; le bon contrôle est la matrice grants/consommateurs, pas une policy permissive automatique.

## Discipline de migration à conserver

1. Inspecter la définition distante et l'historique appliqué avant d'écrire.
2. Ajouter une migration unique, monotone et réexécutable dans un environnement de test dédié.
3. Garder fonctions/policies/index dans un état canonique unique ; pas de dual-write de transition hypothétique.
4. Tester l'identité SQL réelle (`anon`, `authenticated`, rôle backend privilégié et futur rôle utilisateur backend).
5. Pour une correction de fonction SQL appliquée, utiliser `CREATE OR REPLACE FUNCTION` dans une nouvelle migration et réappliquer explicitement owner, grants et search path.
6. Ne jamais conclure qu'un test mocké ou un typecheck prouve la politique distante.

## Mesures prioritaires, sans matrice exhaustive

- Le premier travail SQL n'est pas l'optimisation d'index : c'est la frontière RLS de BE-P1-01.
- Les index liés aux tables IA à forte croissance (`ai_usage_events`, cache, réservations) viennent ensuite.
- Les index `created_by` ne sont utiles que si joins, suppressions/rétention ou investigations les emploient réellement.
- La suppression du doublon `ai_model_configs` est le nettoyage le plus simple, après confirmation par `pg_indexes` et contraintes.
