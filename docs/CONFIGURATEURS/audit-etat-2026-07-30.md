# Audit avancé Configurateurs — état au 30/07/2026

## 1. Verdict exécutif

La fondation Configurateurs est solide jusqu'à C2d :

- le cadrage, les contrats initiaux, le schéma, la sécurité et le catalogue
  technique moteur sont réalisés ;
- le catalogue actif est distant, versionné, sourcé, contrôlé et réversible ;
- les inconnues restantes sont explicites et ne sont pas remplacées par des
  valeurs inventées ;
- les données autorisent l'ouverture de C3.

La fonctionnalité applicative n'est toutefois pas livrée :

- aucun service métier Configurateurs n'existe dans le backend API ;
- aucune procédure tRPC Configurateurs n'est enregistrée ;
- aucun service ou écran Configurateurs n'existe dans le frontend ;
- la procédure distante `configurator.motor.catalog.list` répond
  `404 NOT_FOUND`.

Décision au 30/07/2026 :

| Question | Décision |
| --- | --- |
| Le socle C0–C2d est-il exploitable comme point de départ ? | **Oui** |
| C3 peut-il commencer ? | **Oui, après autorisation explicite** |
| Configurateurs est-il utilisable dans CIR Cockpit ? | **Non** |
| Peut-on annoncer C3 comme commencé ? | **Non** |
| Peut-on annoncer les données comme exactes à 100 % ? | **Non** |

## 2. Périmètre et preuves relues

L'audit croise cinq sources :

1. les décisions directrices de
   `docs/architecture-cible-cir-cockpit.md` ;
2. les documents de tranche sous `docs/CONFIGURATEURS/` ;
3. le code, les migrations, les tests, les scripts et le worktree local ;
4. Git local et `origin/main` ;
5. Supabase distant via MCP et une probe HTTP de l'Edge Function.

Les faits distants ci-dessous ont été relus le 30/07/2026 sur le projet
`CIR_Cockpit` (`rbjtrcorlezvocayluok`). Ils ne sont pas repris d'un ancien
compte rendu.

## 3. Avancement par tranche

| Tranche | État réel | Preuve principale | Sortie |
| --- | --- | --- | --- |
| C0 — cadrage | Terminée | `00-cadrage-c0.md`, contrats Zod | GO C1 |
| C1 — PostgreSQL/RLS | Terminée | 20 tables, RLS forcée, 44 policies | GO C2 |
| C2 — import/activation | Terminée | lot déterministe, snapshot actif | GO C3 |
| C2b — cotes B/K | Terminée | migration K et activation contrôlée | Correctif clos |
| C2c — K/H/provenance/JSONB | Terminée | migration `20260728045157` | Correctif clos |
| C2d — qualifications/incertitudes | Terminée | migration `20260728120556` | Correctif clos |
| C3 — services de compatibilité | Non commencée | route runtime absente | À autoriser |
| C4 | Absorbée par C3 | plan C3 | Pas de tranche séparée |
| C5 à C14 | Non commencées | aucun code applicatif associé | Non autorisées |

Il faut distinguer le **GO de données vers C3** de la livraison de C3. Les
correctifs C2c/C2d rendent le catalogue apte aux futurs calculs ; ils ne
constituent ni les calculs, ni les routes, ni l'interface.

## 4. État du dépôt local

### 4.1 Ce qui existe

- trois contrats partagés sous `shared/schemas/configurator/` :
  vocabulaire commun, moteur et configurations sauvegardées ;
- deux fichiers de tests ciblés pour ces contrats ;
- dix migrations Configurateurs versionnées de C1 à C2d ;
- un test SQL transactionnel RLS :
  `backend/tests/configurator_rls.sql` ;
- le pipeline déterministe
  `scripts/configurator-c2-import.mjs` ;
- le chargeur transactionnel et idempotent
  `scripts/configurator-c2-load.ts` ;
- les extracteurs et tests fabricants sous `tools/extract/`.

Les contrats utilisent des objets Zod stricts, conservent les quatre verdicts
`satisfied`, `under_reservation`, `not_satisfied`, `indeterminate` et portent
la provenance. Ils restent une fondation de contrat, pas une preuve de service
runtime.

### 4.2 Ce qui manque pour C3

La recherche locale trouve :

- zéro référence Configurateurs dans `backend/functions/api` ;
- zéro référence Configurateurs dans `frontend/src` ;
- aucun routeur `configurator.motor.*` ;
- aucun exécuteur PostgreSQL read-only dédié ;
- aucun service catalogue, équivalence, conseil, énergie ou comparaison ;
- aucun test d'intégration C3 ;
- aucun écran ou parcours utilisateur.

La dette fonctionnelle n'est donc pas une finition : toute la tranche
applicative C3 reste à construire.

## 5. État Supabase distant

### 5.1 Projet et historique

| Élément | Valeur constatée |
| --- | --- |
| Projet | `CIR_Cockpit` |
| Référence | `rbjtrcorlezvocayluok` |
| État | `ACTIVE_HEALTHY` |
| PostgreSQL | 17.6 |
| Migrations totales | 128 |
| Migrations Configurateurs | 10 |

La dernière migration Configurateurs distante est
`20260728120556_configurator_c2d_motor_qualifications`.

Sa parité avec
`backend/migrations/20260728120556_configurator_c2d_motor_qualifications.sql`
est prouvée sur le SQL normalisé :

- longueur : 1 339 caractères ;
- MD5 : `05eb28807759b04565d099047d89821c`.

### 5.2 Catalogue actif

| Contrôle | Valeur distante |
| --- | ---: |
| Snapshots actifs moteur | 1 |
| Snapshot | `6fbf4046-be74-4422-9fe8-2d2d8a8d9157` |
| Statut / gate | `active` / `passed` |
| Lot | `cc5689ac-cbf1-45e8-a079-62df8f77dfd8` |
| Empreinte | `5db53991095401581953e48fd9b4bbba68c8a8be5b4d5f8c227456fc14256bdb` |
| Modèles physiques | 1 665 |
| Points de fonctionnement | 2 355 |
| Points de rendement | 5 699 |
| Points de couple | 2 370 |
| Cotes | 45 568 |
| Brides | 7 940 |
| Freins | 256 |
| Corrélations | 599 |
| Issues moteur | 141 |
| Issues d'import | 704 |
| Issues d'import bloquantes non résolues | 0 |

Qualifications vérifiées :

- 59 modèles imposent un variateur ;
- 109 modèles sont explicitement non-IEC ;
- aucun modèle actif n'a une qualification C2d nulle ;
- aucun moteur non-IEC ne porte une fausse `frame_size` IEC.

Les 141 issues moteur restent une restriction active, détaillée dans
`c2d/incertitudes-restantes.md`. Elles ne doivent pas être confondues avec les
704 observations du pipeline d'import, dont aucune n'est bloquante sur le lot
actif.

### 5.3 Sécurité et exploitation

- 20 tables Configurateurs ;
- RLS activée et forcée sur les 20 tables ;
- 44 policies ;
- aucun advisor de sécurité propre au schéma `configurator` ;
- 15 index Configurateurs signalés `unused_index` au niveau information.

Ces index ne doivent pas être supprimés avant C3 sur la seule base de leur
absence d'utilisation actuelle : les requêtes applicatives n'existent pas
encore. La décision se prendra avec les `EXPLAIN ANALYZE` réels de C3.

Advisors hors périmètre Configurateurs :

- protection contre les mots de passe compromis désactivée, niveau warning ;
- index dupliqué sur `public.ai_model_configs`, niveau warning ;
- trois tables IA avec RLS mais sans policy, niveau information.

Ils ne bloquent pas le GO de données C3, mais ne doivent pas être masqués par un
verdict global « tout est vert ».

### 5.4 Runtime API

L'Edge Function `api` est active :

| Élément | Valeur |
| --- | --- |
| Version | 198 |
| Entrypoint | `source/supabase/functions/api/index.ts` |
| Import map | `source/deno.json` |
| `verify_jwt` | `false` |

`verify_jwt=false` est conforme au contrat du dépôt parce que
l'authentification est réalisée dans le backend applicatif.

Probe du 30/07/2026 :

```text
POST /functions/v1/api/trpc/configurator.motor.catalog.list
404 NOT_FOUND
No procedure found on path "configurator.motor.catalog.list"
```

Cette réponse prouve que le runtime distant ne porte pas encore la première
procédure C3. Aucun déploiement n'a été effectué pendant cet audit.

## 6. Fiabilité des données et limites

Le catalogue est sourcé et contrôlé, mais pas certifié constructeur cellule par
cellule. La formulation autorisée est :

> Donnée sourcée et contrôlée sans anomalie actuellement détectée.

Les restrictions prioritaires restent :

1. 7 jeux de cotes IEC incomplets ;
2. 20 alertes de seuil IE ;
3. 4 courants et 16 couples à réconcilier ;
4. 65 modèles Leroy-Somer sans masse/inertie prouvée ;
5. 6 variantes Bonfiglioli BY sans IP unique ;
6. 1 inertie Innomotics contradictoire ;
7. 18 courbes de rendement et 4 inerties spécifiques à confirmer.

C3 doit produire `indeterminate` dès qu'un fait décisif manque. Une valeur
calculée peut contrôler une donnée publiée, jamais la remplacer silencieusement.

## 7. Risques de démarrage C3

| Risque | Effet | Garde obligatoire |
| --- | --- | --- |
| Lire un snapshot retiré | verdict fondé sur une ancienne donnée | jointure explicite sur l'unique actif |
| Utiliser un accès DB privilégié | contournement de la RLS | transaction read-only sous rôle authentifié |
| Fusionner des variantes | compatibilité fausse | identités modèle/point/bride distinctes |
| Transformer une absence en succès | verdict trop rassurant | statut `indeterminate` et preuve manquante |
| Utiliser un score global | blocage essentiel masqué | priorité déterministe des verdicts |
| Utiliser les 141 alertes sans restriction | calcul trompeur | appliquer le registre C2d par champ |
| Coupler au catalogue commercial | dérive de responsabilité | aucun prix, stock, remise, devis ou commande |
| Ajouter l'IA trop tôt | faits non déterministes | aucun outil IA Configurateurs en phase 1 |

## 8. Prochaine tranche exécutable

Le prochain travail autorisable est C3, dans l'ordre du plan :

1. contrats et règles versionnées ;
2. exécuteur PostgreSQL read-only et erreurs CIR ;
3. lecture catalogue actif et normalisation ;
4. compatibilité mécanique ;
5. compatibilité électrique et applicative ;
6. équivalences, conseil, énergie et comparaison ;
7. surface tRPC ;
8. QA, performance, déploiement MCP et probes distantes.

La première preuve de progrès C3 ne sera pas un nouveau document ni une
migration C2 : elle sera un checkpoint C3-1 ou C3-2 réellement implémenté et
testé. Le tracker `plan-execution.md` ne devra passer C3 à « en cours » qu'à ce
moment.

## 9. Rapport QA de l'audit

### Résultats verts

- `pnpm run qa:docs` ;
- 13 tests d'extraction fabricants ;
- 17 tests de contrats Configurateurs ;
- `repo:check` avec parité distante ;
- frontend typecheck et lint ;
- 159 fichiers et 735 tests frontend ;
- couverture globale : 60,49 % statements, 53,27 % branches, 55,10 %
  fonctions, 61,97 % lignes ;
- conformité du système d'erreurs ;
- build frontend ;
- backend lint et typecheck ;
- 449 tests backend réussis, 14 intégrations conditionnelles ignorées.

Le seuil historique de
`useDashboardStatusHelpers.ts` a été corrigé par quatre tests de branches. Une
assertion `EntityOnboardingDialog` restée sur l'ancien texte « Sélectionne » a
été alignée sur le composant « Sélectionnez » ; le fichier repasse 14/14.

### Blocage externe de l'étape 9

La dernière étape de `pnpm run qa`, les intégrations distantes, rapporte :

- 3 tests réussis ;
- 6 tests échoués ;
- 6 tests ignorés.

Les six échecs ont la même cause racine : la connexion du compte fixture
`AUDIT_20260604_api_int_user@cir.invalid` renvoie HTTP 400. Les logs Supabase
Auth confirment `invalid_credentials`, et la lecture de `auth.users` confirme
que ce compte n'existe plus.

Restaurer une identité distante est une mutation Auth hors périmètre de cet
audit et n'a pas été effectué. Ce blocage ne remet pas en cause les preuves
Configurateurs lues directement, mais il interdit d'annoncer la gate finale
comme entièrement verte.

### Skips

- E2E navigateur non lancé : aucun parcours Configurateurs n'existe encore et
  la demande ne portait pas sur un parcours UI automatisé.
- Aucun déploiement, migration ou changement Auth Supabase pendant l'audit.
