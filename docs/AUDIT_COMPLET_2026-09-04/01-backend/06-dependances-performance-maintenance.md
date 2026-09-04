# 6. Dépendances, performance et maintenance

## BE-P1-09 — L'import XLSX expose le processus à un ZIP malformé ou disproportionné

- **Priorité :** P1
- **Statut :** CONFIRMÉ
- **Preuves dépendance :** `backend/package.json:18-30` fixe `fflate` à `0.8.2`. Cette version est concernée par une boucle infinie de `unzipSync` sur une archive ZIP64 malformée : [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98). La correction existe en `0.8.3`.
- **Preuves code :** le contrat limite le fichier compressé à 50 MB (`shared/schemas/pricing/references.schema.ts:325-353`), mais `backend/src/services/pricing/references/referenceExcelParser.ts:561-611` appelle `unzipSync` sur tout le classeur et matérialise ensuite les XML en mémoire (`backend/src/services/pricing/references/referenceExcelParser.ts:614-630`). `backend/src/services/pricing/references/referenceImports.ts:2073-2105` charge les deux fichiers simultanément avant parsing.
- **Audit dépendances :** `pnpm audit --prod` retourne 3 vulnérabilités modérées : fflate et deux avis `@hono/node-server` liés exclusivement à `serveStatic` ([GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m), [GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9)). La surface `serveStatic` n'est pas utilisée dans `backend/src/app.ts:1-26`, donc ces deux chemins ne sont pas atteignables dans l'application actuelle ; la version reste à mettre à jour.
- **Impact :** un classeur malformé peut bloquer le thread Node ; une archive à fort ratio peut provoquer une consommation mémoire disproportionnée. Deux classeurs en mémoire aggravent le pic.
- **Correction minimale :** mettre exactement `fflate` à `0.8.3` et `@hono/node-server` à `1.19.15` dans un lot dépendances borné ; avant décompression complète, imposer des plafonds simples et généreux sur le nombre d'entrées, la taille totale décompressée et le ratio d'expansion. Le streaming, les workers et l'optimisation des deux buffers ne se justifient que si une mesure ultérieure prouve encore un problème.
- **Non-objectifs :** ne pas changer toute la bibliothèque XLSX ni ajouter un cluster de workers sans mesure. Ne pas présenter les avis Hono comme exploitables tant que `serveStatic` reste absent.
- **Dépendances :** validation du lockfile et choix de plafonds largement supérieurs aux classeurs métier observés, qui culminent autour de 11 entrées, 10,9 Mio décompressés et un ratio de 8,4.
- **Preuve d'acceptation :** audit production sans les trois avis ; un classeur valide représentatif reste accepté ; une archive dépassant les plafonds est refusée avec un code CIR. Le pin `fflate@0.8.3` et l'audit prouvent la correction ZIP64 sans exécuter un PoC synchrone susceptible de bloquer le processus en cas de régression.

## BE-P2-07 — La liste Tasks charge les contributeurs par une requête supplémentaire pour chaque tâche

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code :** `backend/src/services/tasks/taskService.ts:1800-1820` charge page et compteur, puis `backend/src/services/tasks/taskService.ts:1821-1837` exécute une requête `task_participants` par ligne via `Promise.all`.
- **Impact :** le nombre de requêtes croît avec la taille de page ; les exécutions concurrentes sollicitent inutilement le pool et dégradent la latence à mesure que l'écran se remplit.
- **Correction minimale :** charger tous les contributeurs avec un unique `WHERE task_id IN (...)`, les grouper en mémoire par tâche puis construire la réponse. Garder les deux requêtes page/compteur existantes.
- **Non-objectifs :** ne pas réécrire `taskService.ts`, ajouter un dataloader global ou dénormaliser les participants.
- **Dépendances :** aucune migration ; test du cas page vide et des ordres/doublons attendus.
- **Preuve d'acceptation :** nombre de requêtes constant quelle que soit la taille de page ; réponse contractuellement identique ; test avec plusieurs tâches/participants ; mesure avant/après sur une page représentative.

## BE-P2-09 — Les gates donnent une impression de couverture supérieure à leur portée réelle

- **Priorité :** P2
- **Statut :** CONFIRMÉ
- **Preuves code/configuration :** `backend/package.json:10-16` définit `lint` comme un second `tsc`. `backend/tsconfig.json:18-27` exclut tests et intégrations et n'active pas de règle `noUnused*`. La CI copie `backend/.env.example` (`.github/workflows/qa.yml:29-42`), où `RUN_API_INTEGRATION=0` (`backend/.env.example:44-46`). `backend/vitest.integration.config.ts:14-20` autorise zéro test. `package.json:35` lance l'audit depuis `frontend`, mais l'exécution actuelle remonte bien les dépendances du lockfile workspace, y compris les chemins backend ; le défaut réel est un périmètre production/développement implicite et un seuil `high` qui ne ferme pas les avis modérés de production.
- **Preuve d'exécution :** typecheck backend, 342 tests/47 fichiers, contrat tRPC et repo check ont réussi. L'audit production a échoué comme attendu sur 3 avis modérés. La suite distante d'intégration n'a pas été lancée.
- **Impact :** `qa:ci` peut afficher vert avec toutes les intégrations ignorées ; tests/intégrations ne sont pas typecheckés par le tsconfig de production ; « lint » ne détecte ni imports/variables inutilisés ni règles de qualité ; l'audit mélange les avis de développement et de production et laisse passer les avis modérés de production.
- **Correction minimale :** dans le Lot 1, rendre `qa:audit` explicitement racine et production avec `pnpm audit --prod --audit-level=moderate`. Les changements de lint, de typecheck des tests et de job d'intégration restent des travaux séparés : ne pas les agréger au lot sécurité court.
- **Non-objectifs :** ne pas multiplier les matrices CI. Un seul job unitaire et un seul job d'intégration explicite, chacun honnête sur son périmètre, suffisent.
- **Dépendances :** autorisation séparée d'un environnement distant pour les intégrations et décision ultérieure sur un vrai lint minimal.
- **Preuve d'acceptation Lot 1 :** `pnpm run qa:audit` exécute une seule gate production explicite au niveau racine et échoue dès un avis modéré. Les autres lacunes de gate restent ouvertes sans multiplier les jobs ni les matrices dans ce lot.

## BE-P2-10 — La recherche Entreprises borne chaque fetch mais pas l'ensemble d'une recherche

- **Priorité :** P2
- **Statut :** À MESURER
- **Preuves code :** `backend/src/services/directory/company/directoryCompanyApi.ts:48-119` crée un timeout distinct pour un fetch. `shared/search/companySearch.ts:901-1068` peut parcourir plusieurs plans et pages séquentiellement et en injecter de nouveaux selon les résultats.
- **Impact :** chaque appel respecte son timeout, mais la somme peut dépasser largement l'attente utilisateur et consommer le quota externe. Un réseau lent peut transformer une recherche en série de délais sans budget global.
- **Correction minimale :** instrumenter nombre de tentatives/durée totale ; fixer un budget global et un nombre maximal d'appels par recherche, propagés via un même signal d'annulation ; mettre en cache brièvement les recherches exactes normalisées si les mesures montrent des répétitions.
- **Non-objectifs :** ne pas introduire Redis ni modifier le classement métier sans preuve. Un cache borné local ou DB n'est justifié que par l'usage.
- **Dépendances :** mesure de latence réelle, quota de l'API et définition produit du temps d'attente acceptable.
- **Preuve d'acceptation :** durée totale et tentatives visibles dans les logs ; budget dépassé produit une erreur/dégradation explicite ; test avec fetch lent ; mêmes résultats et ordre dans le budget nominal.

## Maintenance proportionnée

- Conserver les versions fixées et le lockfile reproductible ; mettre à jour par petits ensembles cohérents.
- Ne pas confondre « audit sans vulnérabilité connue » avec sécurité applicative : BE-P1-01 prime. BE-P0-01 reste un risque local accepté, hors roadmap produit.
- Mesurer CPU/mémoire sur l'import XLSX et latence SQL sur Tasks avant un refactoring de performance plus large.
- Le POC n'a pas besoin d'une plateforme d'observabilité ou de cache distribuée tant que les limites simples sont suffisantes.
