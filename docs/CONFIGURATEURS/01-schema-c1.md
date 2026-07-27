# Configurateurs — C1 Schéma PostgreSQL

| Élément | État au 26/07/2026 |
| --- | --- |
| Périmètre | Schéma `configurator` : tables, contraintes, index, RLS, ACL |
| Projet | `CIR_Cockpit` — `rbjtrcorlezvocayluok`, PostgreSQL 17.6 |
| Migrations appliquées | 5, via `apply_migration` du MCP Supabase |
| Historique local | `backend/migrations/`, parité vérifiée |
| **Décision C1** | **GO vers C2** — preuve RLS exécutée et passée, voir §4 et §9 |

> La preuve RLS exigée au §8.8 est versionnée, a été exécutée, a révélé un
> défaut réel sur `configurator.activate_snapshot`, et passe intégralement après
> correctif.

## 1. Migrations

Appliquées sur le projet lié, puis extraites sans transcription manuelle dans
l'historique global conformément à la convention MCP-first.

| Version | Nom | SQL normalisé |
| --- | --- | ---: |
| `20260726153751` | `configurator_foundation` | 13 772 car. |
| `20260726153801` | `configurator_motor_catalog` | 32 077 car. |
| `20260726153809` | `configurator_rls_and_grants` | 14 540 car. |
| `20260726154032` | `configurator_rls_actor_helper` | 1 962 car. |
| `20260726173238` | `configurator_activate_snapshot_actor_fix` | 3 143 car. |

La quatrième corrige un appel non autorisé à `private.audit_actor_id()` détecté
pendant l'exécution des preuves RLS. Elle expose un helper `SECURITY DEFINER`
borné, `private.configurator_actor_id()`, sans ouvrir le schéma `private`.

La cinquième complète cette correction : elle avait laissé
`configurator.activate_snapshot` sur `audit_actor_id`. Défaut trouvé par la
preuve, voir §4.1. Seul l'appel change ; corps, contrôles, verrous, messages et
privilèges sont inchangés.

## 2. Objets créés

| Objet | Nombre |
| --- | ---: |
| Tables | 20 |
| Index | 95 |
| Contraintes `CHECK` | 115 |
| Clés étrangères | 45 |
| Contraintes d'unicité | 20 |
| Déclencheurs | 6 |
| Fonctions `configurator.*` | 5 |
| Fonctions `private.configurator_*` | 7 |
| Politiques RLS | 44 |

Données présentes : **13 lignes**, exclusivement le vocabulaire canonique de
`motor_dimension_canonical`. Les 19 autres tables sont vides — aucune donnée de
test n'a été laissée.

### 2.1 Noyau commun

`catalog_snapshot`, `source_document`, `source_ref`, `import_batch`,
`import_file`, `import_issue`, `saved_configuration`.

### 2.2 Module moteur

`motor_dimension_canonical`, `motor_model`, `motor_operating_point`,
`motor_efficiency_point`, `motor_torque_point`, `motor_dimension_definition`,
`motor_dimension`, `motor_flange_option`, `motor_brake_option`,
`motor_vendor_correlation`, `motor_iec_threshold`, `motor_iec_vsd_threshold`,
`motor_validation_issue`.

### 2.3 Décisions structurantes matérialisées

| Décision | Matérialisation |
| --- | --- |
| Un seul snapshot actif par domaine | index unique partiel `catalog_snapshot_one_active_per_domain_idx` sur `(domain) WHERE is_active` |
| Activation jamais silencieuse | `catalog_snapshot_activation_state_check` lie `is_active` au gate, à l'auteur, à la note et à l'empreinte du diff |
| Aucun lien inter-snapshots | clés étrangères composites `(snapshot_id, id)` sur toutes les tables techniques |
| Unicité du point de fonctionnement | `unique nulls not distinct (snapshot_id, model_id, poles, supply_mode, frequency_hz, voltage_v, coupling)` — indispensable, `voltage_v` et `coupling` étant nullables |
| `model_key` stable et versionné | colonne matérialisée + `motor_model_key_rule_check` et `motor_model_key_components_check` |
| Discriminateur d'identité versionné | `identity_discriminator_rule` + `motor_model_discriminator_rule_check` |
| Deux vocabulaires de cotes | `motor_dimension_canonical` global (13 codes) et `motor_dimension_definition` par snapshot (codes publiés) |
| Cotes par montage **et** par polarité | `motor_dimension.mounting` + `motor_dimension.polarity` nullable |
| IE5 réservé au variateur | `motor_operating_point_ie5_vfd_check` |
| Synchrone réservé au variateur | déclencheurs de contrainte différables sur `motor_model` et `motor_operating_point`, couvrant aussi la suppression du dernier point VFD |
| Bride cohérente | `num_nonnulls(dim_s_mm, dim_s_thread) = 1` + cohérence avec `bore_type` |
| Frein hors parcours phase 1 | `motor_brake_option` isolée |
| Cycle de vie | `motor_model.lifecycle` ∈ `current` / `legacy` |
| `cos φ` à charge partielle | `motor_efficiency_point.cos_phi` |

## 3. Vérifications distantes en lecture seule

Toutes exécutées le 26/07/2026 via `execute_sql` du MCP. **Aucune écriture.**

### 3.1 RLS

| Contrôle | Résultat |
| --- | --- |
| `relrowsecurity` | ✅ 20 / 20 |
| `relforcerowsecurity` | ✅ 20 / 20 |
| Tables sans politique | ✅ 0 |

Couverture par commande : `SELECT` sur les 20 tables ; `INSERT` sur 19
(`motor_dimension_canonical` est en lecture seule, alimentée par migration) ;
`UPDATE` sur `catalog_snapshot`, `import_batch`, `import_file`, `import_issue`
et `saved_configuration`. **Aucune politique `DELETE`** : l'archivage est la
seule voie de retrait.

### 3.2 ACL

| Rôle | `USAGE` sur `configurator` | Privilèges de table |
| --- | --- | --- |
| `anon` | ✅ non | ✅ aucun |
| `service_role` | ✅ non | ✅ aucun |
| `PUBLIC` | — | ✅ aucun |
| `authenticated` | oui | `SELECT`, `INSERT`, `UPDATE` selon la table |

`saved_configuration` restreint l'`UPDATE` au niveau **colonne** :
`label`, `client_entity_id`, `snapshot_id`, `configuration`, `archived_at`.
`owner_id`, `agency_id` et `scope` ne sont donc pas modifiables, même sans
passer par le déclencheur. Ce dernier ajoute une seconde barrière : à
l'insertion il **impose** `owner_id` et `agency_id` depuis la session, jamais
depuis le client, et il rejette toute tentative de mutation de l'identité.

### 3.3 Fonctions `SECURITY DEFINER`

| Fonction | Schéma | `search_path` | `EXECUTE` |
| --- | --- | --- | --- |
| `configurator_actor_id` | `private` | ✅ `""` | `authenticated` |
| `configurator_actor_is_active` | `private` | ✅ `""` | `authenticated` |
| `configurator_current_agency_id` | `private` | ✅ `""` | `authenticated` |
| `configurator_snapshot_is_mutable` | `private` | ✅ `""` | `authenticated` |
| `configurator_prepare_saved_configuration` | `private` | ✅ `""` | ✅ aucun |

Aucune fonction `SECURITY DEFINER` hors du schéma `private`. Aucun `EXECUTE`
accordé à `PUBLIC` ni à `anon`. Les 5 fonctions `configurator.*`
(`activate_snapshot`, `canonical_numeric_token_v1`,
`normalize_motor_designation_v1`, `derive_motor_identity_discriminator_v1`,
`derive_motor_model_key_v1`) sont en `SECURITY INVOKER` avec `search_path`
verrouillé : la RLS s'applique donc bien à `activate_snapshot`.

### 3.4 Index des prédicats RLS

| Prédicat | Index |
| --- | --- |
| `owner_id` | `saved_configuration_owner_idx` et `saved_configuration_owner_active_idx (owner_id, updated_at DESC) WHERE archived_at IS NULL` |
| `agency_id` + `scope` | `saved_configuration_agency_idx` et `saved_configuration_agency_scope_active_idx (agency_id, scope, updated_at DESC) WHERE archived_at IS NULL` |
| `snapshot_id` | `saved_configuration_snapshot_idx` |
| `client_entity_id` | `saved_configuration_client_idx`, partiel |
| Snapshot actif | `catalog_snapshot_one_active_per_domain_idx`, unique partiel |

### 3.5 Exposition Data API — vérification incomplète

Ce qui est établi côté base : `anon` et `service_role` n'ont ni `USAGE` sur le
schéma ni aucun privilège de table. Une exposition accidentelle ne donnerait
donc **rien** à `anon`.

Ce qui **n'est pas vérifiable depuis la base** : la liste des schémas exposés
est un réglage de projet, absent de `pg_db_role_setting` pour le rôle
`authenticator`. Le risque résiduel est précis et limité : si `configurator`
était ajouté aux schémas exposés, un JWT `authenticated` pourrait atteindre les
tables **directement par PostgREST**, en contournant la frontière tRPC exigée au
§4.1 du cadrage. La RLS resterait appliquée, mais la frontière architecturale
serait franchie.

À contrôler dans les réglages API du projet : `configurator` ne doit pas
figurer dans « Exposed schemas », qui doit rester `public, graphql_public`.

## 4. Matrice RLS — exécutée et passée

Preuve transactionnelle : `backend/tests/configurator_rls.sql`, terminée par
`ROLLBACK`. Le fichier crée ses propres agences, utilisateurs et rôles, puis
enchaîne les cas sous `SET LOCAL ROLE` avec `request.jwt.claims` injectés.
Chaque cas lève une exception nommée en cas d'échec ; atteindre le `SELECT`
final vaut succès complet.

| # | Cas | Résultat |
| ---: | --- | --- |
| 1a | `anon` lit `catalog_snapshot` | ✅ refusé |
| 1b | `anon` lit `saved_configuration` | ✅ refusé |
| 6a | `tcs` crée un snapshot catalogue | ✅ refusé |
| 6b | `agency_admin` crée un lot d'import | ✅ refusé |
| 6c | `super_admin` crée snapshot et lot | ✅ autorisé |
| 6d | `tcs` appelle `activate_snapshot` | ✅ `CONFIGURATOR_ACTIVATION_FORBIDDEN` |
| 6e | `super_admin`, gate non passé | ✅ `CONFIGURATOR_SNAPSHOT_NOT_READY` |
| 2a | Catalogue lu depuis une autre agence | ✅ visible |
| 2b | Vocabulaire canonique lisible | ✅ 13 codes |
| 3a | `owner_id` et `agency_id` imposés par la session | ✅ imposés |
| 3b | Configuration personnelle vue par un tiers de l'agence | ✅ 0 ligne |
| 3c | Configuration d'agence vue dans son agence | ✅ visible |
| 4a | Configurations vues depuis une autre agence | ✅ 0 ligne |
| 5a | Partage modifié depuis une autre agence | ✅ refusé |
| 5b | Partage modifié par un `tcs` tiers de l'agence | ✅ refusé |
| 5c | Partage modifié par son auteur | ✅ autorisé |
| 5d | Partage administré par l'`agency_admin` de l'agence | ✅ autorisé |
| 5e | Partage administré par le `super_admin` | ✅ autorisé |
| 7a | Portée d'une configuration immuable | ✅ refusé |
| 7b | Écriture dans le vocabulaire canonique | ✅ refusé |

Deux exécutions ont eu lieu, toutes deux annulées. Aucune donnée persistée :
après coup, 0 agence d'essai, 0 utilisateur d'essai, 0 snapshot, 0
configuration, et `configurator` toujours à 13 lignes.

### 4.1 Défaut trouvé par la preuve, puis corrigé

Première exécution, cas 6d :

```
ECHEC 6d : activation par tcs non bloquee
           (permission denied for function audit_actor_id)
```

`configurator.activate_snapshot` est en `SECURITY INVOKER` et appelait
`private.audit_actor_id()`, dont l'`EXECUTE` n'est accordé qu'à `postgres`.
La migration `configurator_rls_actor_helper` avait introduit
`private.configurator_actor_id()` pour ce motif et corrigé les trois politiques
de `saved_configuration`, mais pas cette fonction.

| Aspect | Effet |
| --- | --- |
| Sécurité | aucune exposition : la fonction échouait fermée pour tout le monde |
| Fonctionnel | `activate_snapshot` inutilisable par tout appelant `authenticated`, `super_admin` compris |
| Conséquence | activation et rollback d'un snapshot inopérants, c'est-à-dire le terme même de C2 |

Corrigé par `20260726173238_configurator_activate_snapshot_actor_fix`. Après
correctif, les cas 6d et 6e passent : le contrôle métier répond avant tout
problème de privilège.

### 4.2 Attente de test corrigée

Le cas 7a attendait le message du déclencheur
`CONFIGURATOR_CONFIGURATION_IDENTITY_IMMUTABLE`. La base répond en réalité
`permission denied for table saved_configuration` : `scope` n'appartient pas au
`GRANT UPDATE` par colonne, donc l'ACL refuse **avant** que le déclencheur ne
soit atteint. Deux barrières se succèdent et c'est la première qui répond. Le
test accepte désormais l'une ou l'autre ; c'est le refus qui compte. Aucun
changement de schéma n'a été nécessaire.

### 4.3 Reporté en C3

Par décision du 26/07/2026 : helper applicatif de claims, garde statique sur les
accès à `saved_configuration`, tests des services tRPC.

## 5. Parité local / distant

Vérifiée le 26/07/2026, en lecture seule, sur texte normalisé — CRLF ramenés en
LF, sauts de ligne finaux retirés.

| Version | Nom | Longueur | md5 distant / local |
| --- | --- | ---: | --- |
| `20260726153751` | `configurator_foundation` | 13 772 | `e4d1ed78…` = `e4d1ed78…` |
| `20260726153801` | `configurator_motor_catalog` | 32 077 | `cd2fe5cd…` = `cd2fe5cd…` |
| `20260726153809` | `configurator_rls_and_grants` | 14 540 | `e9d681d5…` = `e9d681d5…` |
| `20260726154032` | `configurator_rls_actor_helper` | 1 962 | `724fa5b1…` = `724fa5b1…` |
| `20260726173238` | `configurator_activate_snapshot_actor_fix` | 3 143 | `95741da5…` = `95741da5…` |

Empreinte ponctuelle, non conservée : la convention interdit toute liste durable
de checksums. `pnpm run repo:check` passe, la parité étant assurée par la
correspondance directe entre version distante et nom de fichier.

Migrations distantes : **123**. Fichiers `.sql` locaux : **128**. L'écart
correspond aux compatibilités historiques déjà gérées par
`scripts/check-repo-state.mjs`, antérieures aux Configurateurs.

## 6. Advisors

### 6.1 Sécurité

Aucune alerte sur `configurator`. Les alertes restantes sont préexistantes :

| Alerte | Niveau | Objet |
| --- | --- | --- |
| `rls_enabled_no_policy` | INFO | `public.ai_feature_model_assignments`, `public.ai_request_reservations`, `public.ai_usage_daily_aggregates` |
| `auth_leaked_password_protection` | WARN | réglage Auth du projet |

### 6.2 Performance

119 avertissements au total, dont **51 sur `configurator`**, tous de type
`unused_index` et de niveau INFO. C'est le comportement attendu : les tables
sont vides et aucune charge réelle ne sollicite encore les index. Ils devront
être réévalués après C2, avec des données.

Sur `configurator` : **zéro** `unindexed_foreign_keys`, **zéro**
`duplicate_index`, **zéro** alerte de niveau WARN.

Préexistant hors `configurator` : 60 `unused_index`, 7
`unindexed_foreign_keys`, 1 `duplicate_index` en WARN. Sans rapport avec C1.

## 7. Rollback

Aucune donnée métier n'existe : les 13 lignes présentes sont le vocabulaire
canonique, recréé par migration.

| Portée | Procédure |
| --- | --- |
| Annuler C1 en entier | nouvelle migration additive `drop schema configurator cascade`, plus retrait des 7 fonctions `private.configurator_*`. Aucune table hors `configurator` n'est touchée : les seules dépendances sortantes sont des clés étrangères **vers** `public.profiles`, `public.agencies` et `public.entities`. |
| Annuler une migration | interdit. La convention impose une nouvelle migration additive ; une migration appliquée n'est jamais modifiée ni supprimée. |
| Rollback fonctionnel d'un catalogue | `configurator.activate_snapshot` sur un snapshot `retired` : réactivation sans suppression physique, l'ancien actif repassant en `retired`. |

## 8. Écarts sans rapport avec C1

| Écart | Nature |
| --- | --- |
| 3 tables `public.ai_*` avec RLS sans politique | antérieur, zone IA |
| Protection contre les mots de passe compromis désactivée | réglage Auth du projet |
| 7 clés étrangères non indexées et 1 index dupliqué hors `configurator` | antérieur |
| Avertissements Git `LF will be replaced by CRLF` sur `AGENTS.md`, `CLAUDE.md`, `docs/architecture-cible-cir-cockpit.md` | fins de ligne, `qa:docs` sort en code 0 |
| Modifications Dashboard dans le worktree | hors périmètre, laissées intactes |

## 9. Décision

### GO vers C2

La structure est conforme et vérifiée : 20 tables, RLS activée **et forcée**
partout, `anon` et `service_role` sans le moindre privilège, fonctions
`SECURITY DEFINER` confinées à `private` avec `search_path` verrouillé, index
présents sur tous les prédicats, aucun advisor défavorable sur le schéma,
parité locale prouvée sur les cinq migrations.

La preuve RLS du §8.8 existe, est versionnée dans `backend/tests/`, a été
exécutée contre le projet lié et passe intégralement. Elle a fait son travail :
elle a trouvé un défaut réel que trois vérifications structurelles successives
n'avaient pas vu, parce qu'aucune ne franchissait le chemin d'exécution
`authenticated`.

Un seul point n'a pas pu être vérifié : la liste des schémas exposés à la Data
API est un réglage de projet, illisible depuis la base comme depuis le MCP
(§3.5). L'effet pratique est nul pour `anon`, qui n'a ni `USAGE` ni privilège.
Reste un contrôle visuel à faire une fois dans les réglages API :
« Exposed schemas » doit valoir `public, graphql_public`.

C2 est autorisée : import des jeux validés, déduplication par `model_key`,
provenance intégrale, contrôles de non-régression.
