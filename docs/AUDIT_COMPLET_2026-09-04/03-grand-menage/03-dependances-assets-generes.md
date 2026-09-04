# Dépendances, assets et fichiers générés

## `GM-DEP-01` — `fflate` sur le chemin d'import utilisateur

**Priorité : P1 · Statut : confirmé · Verdict : mettre à niveau avant tout nouvel import exposé.**

- Preuve dépendance : `backend/package.json:26` fixe `fflate` à `0.8.2`.
- Preuve d'atteignabilité : `backend/src/services/pricing/references/referenceExcelParser.ts:1` importe `unzipSync`; `backend/src/services/pricing/references/referenceImports.ts:2` importe les utilitaires ZIP. Les classeurs `.xlsx` fournis par un utilisateur passent donc par ce code.
- Avis : `GHSA-px8p-9vwx-vf98` décrit une boucle infinie sur une archive ZIP64 malformée ; correctif disponible à partir de `0.8.3`.
- Impact : déni de service du backend lors de l'analyse d'un fichier forgé.
- Lot minimal : passer à `fflate >= 0.8.3` dans le même majeur, conserver la limite de taille existante et ajouter un fixture ZIP64 malformé avec une durée bornée. Vérifier également un plafond sur taille décompressée, nombre d'entrées et XML traité ; ne pas écrire un sandbox d'archive.
- Fichiers/tests associés : parser/import Référentiels et leurs tests ; lockfile.
- Gate : tests parser/import/export XLSX, typecheck/lint backend, audit sans l'avis `fflate`, essai de fichier malformé qui échoue sans bloquer le process.
- Non-objectifs : ne pas changer le format métier ni remplacer tout le parseur XLSX.

## `GM-DEP-02` — `xlsx@0.18.5` vulnérable et limité aux tests

**Priorité : P1 · Statut : confirmé · Verdict : supprimer la dépendance npm.**

- Preuve dépendance : `backend/package.json:37` déclare `xlsx` en développement.
- Usages exacts : `backend/src/services/pricing/references/referenceExcelParser_test.ts:3,23-47` fabrique des classeurs ; `backend/src/trpc/pricingReferenceContracts_test.ts:3,1094-1113` relit un export.
- Avis : deux avis élevés, pollution de prototype (`GHSA-4r6h-8v6p-xvw6`) et ReDoS (`GHSA-5pgg-2g8v-p4x9`), sans version corrigée publiée sur npm.
- Impact : le package n'est pas sur le runtime de production, mais l'audit CI reste rouge et des fixtures pourraient un jour lire un fichier non maîtrisé.
- Lot minimal : après mise à niveau de `fflate`, créer un helper **test-only** minimal qui produit/lit le ZIP OOXML nécessaire aux deux suites, ou utiliser des petites fixtures binaires revues. Supprimer ensuite l'import et `xlsx` du package/lockfile.
- Fichiers/tests associés : les deux tests ci-dessus, `backend/package.json`, `pnpm-lock.yaml`.
- Gate : mêmes assertions de parser et d'export, tests backend complets, audit sans les deux avis `xlsx`.
- Non-objectifs : ne pas introduire une autre bibliothèque de tableur générale ni faire lire les huit classeurs métier aux tests unitaires.

## `GM-DEP-03` — Huit autres avis à traiter par montée bornée

**Priorité : P1/P2 · Statut : confirmé par `pnpm audit` · Verdict : corriger par version patchée, sans mise à jour globale.**

| Chaîne | Version observée | Minimum corrigé / décision | Portée réelle |
| --- | ---: | ---: | --- |
| `backend > @hono/node-server` | 1.19.11 | `>=1.19.15` | deux avis modérés de `serveStatic`; l'application ne paraît pas appeler `serveStatic`, mais la mise à niveau même-majeur est peu risquée |
| `frontend > vite > postcss > nanoid` | 3.3.17 | `>=3.3.18` | avis élevé ; transitif de build |
| `frontend > @vitejs/plugin-react > … > browserslist` | 4.28.1 | `>=4.28.7` | deux avis élevés ; transitif de build |
| `frontend > eslint > @humanfs/node` | 0.16.7 | `>=0.16.8` | avis modéré ; outil de développement |
| `backend > tsx > esbuild` | 0.27.3 | `>=0.28.1` | avis faible, serveur de développement Windows ; le service exécute `tsx`, vérifier la résolution obtenue |
| `frontend > @vitejs/plugin-react > @babel/core` | 7.29.0 | `>=7.29.6` | avis faible, compilation de source malveillante ; transitif de build |

Le total de l'audit est bien **11 avis** avec `xlsx` et `fflate` : 5 élevés, 4 modérés et 2 faibles. Une mise à niveau n'est close qu'après `pnpm why <package>`, modification du parent direct ou résolution cohérente, puis audit renouvelé. Éviter d'empiler des overrides permanents sans ticket de retrait.

**Gate.** Installation figée, audit, typecheck/lint/tests des deux workspaces, build frontend, démarrage/health backend. Les scripts de production restent hors mutation sans autorisation.

## `GM-DEP-04` — 37 dépendances en retard

**Priorité : P3 · Statut : à planifier · Verdict : lots cohérents, pas de “latest” global.**

Le relevé compte 20 montées dans le même majeur et 17 changements de majeur, notamment ESLint 10, Vite 8, Vitest 5, TypeScript 7, `jose` 6, Motion 13 et Lucide 1.

1. traiter d'abord les versions nécessaires aux avis ci-dessus ;
2. regrouper les 20 mises à jour même-majeur par workspace ;
3. ouvrir un lot séparé par famille majeure avec lecture du changelog et preuve ciblée ;
4. ne pas coupler TypeScript, Vite, Vitest et ESLint dans un même changement.

**Gate.** Plus petit gate de la couche puis `qa:fast` pour un ensemble transversal. **Non-objectif :** obtenir artificiellement zéro ligne dans `outdated`.

## `GM-RUN-01` — Runner d'intégration non canonique

**Priorité : P2 · Statut : confirmé · Verdict : unifier sur un seul chemin.**

- `scripts/run-backend-integration-tests.mjs:7-30` prépare `VITEST_ENV_FILE` ;
- `backend/src/integration/env.ts:10-24` lit directement `process.env` ;
- `backend/vitest.integration.config.ts:16-19` ne charge pas ce fichier ;
- `backend/package.json:15` appelle directement Vitest ; `package.json:27-28` expose deux aliases racine identiques ;
- `backend/vitest.integration.config.ts:19` autorise `passWithNoTests`, ce qui peut rendre verte une gate qui n'a rien exécuté.

**Impact.** Un opérateur peut croire qu'un environnement d'intégration a été chargé ou qu'une suite a tourné alors que ce n'est pas le cas.

**Lot minimal.** Choisir le runner direct Vitest **ou** le script Node. Si le script est supprimé avec les 37 fichiers morts, faire charger explicitement l'environnement par la config canonique et retirer l'alias racine doublonné. Retirer `passWithNoTests` de la gate finale ; le garder uniquement pour une commande `changed` justifiée.

**Fichiers/tests/mocks associés.** Les cinq emplacements ci-dessus et `.env.test.example`, sans valeur secrète.

**Gate.** Une exécution sans environnement échoue explicitement ; une exécution configurée découvre au moins un test et rapporte son nombre ; `repo:check:local` reste vert.

**Non-objectifs.** Ne pas créer un orchestrateur de tests ni copier les secrets dans un fichier suivi.

## `GM-ASSET-01` — Classeurs métier suivis

**Priorité : conservation · Statut : confirmé par empreintes · Verdict : conserver.**

Les huit fichiers suivants ont huit empreintes différentes :

- `docs/Import 07-07-26/Classification_produit_07-07-2026_16-36-34.xlsx` ;
- `docs/Import 07-07-26/SEG_GRI_HA_07-07-2026_16-36-41.xlsx` ;
- `docs/LOGIQUE_REMISE_CIR/Classification_produit_08-04-2026_09-46-26.xlsx` ;
- `docs/LOGIQUE_REMISE_CIR/Classification_produits.xlsx` ;
- `docs/LOGIQUE_REMISE_CIR/SEGMENTS TARIFAIRES.xlsx` ;
- `docs/LOGIQUE_REMISE_CIR/SEG_GRI_HA_08-04-2026_09-03-28.xlsx` ;
- `docs/LOGIQUE_REMISE_CIR/outil_remises_niveaux_v11q.xlsm` ;
- `docs/LOGIQUE_REMISE_CIR/outil_remises_niveaux_v11t.xlsm`.

`v11q` et `v11t` ne sont donc pas des copies exactes. Leur éventuelle obsolescence est une décision métier/provenance, pas une déduplication technique.

**Lot minimal futur.** Ajouter un petit manifeste de provenance (date, rôle, source, remplaçant éventuel) si le PO veut distinguer référence active et archive. **Gate :** validation métier explicite avant tout déplacement ou suppression.

## `GM-GEN-01` — Générés et fichiers d'exploitation

**Verdict : conserver.**

- `shared/api/trpc.generated.d.ts` : généré et vérifié par `contract:trpc:check` ;
- `shared/supabase.types.ts` : snapshot de types distant canonique pour le code ;
- les 143 migrations, y compris le nom réconcilié atypique : historique immuable ;
- `backend/src/services/ai/runtime/deterministicRuntime.ts` et les helpers/environnements d'intégration : atteignables par configuration/tests ;
- `.impeccable/design.json` : configuration de design, pas un asset orphelin ;
- `scripts/servy/CIR-Cockpit-API.json`, `scripts/servy/CIR_Cockpit.json` et `scripts/codex-cockpit.ps1` : exploitation locale actuelle/conditionnelle.

La bonne gate pour les générés est un rejeu du générateur avec diff nul. Les modifier à la main ou les supprimer pour réduire le dépôt serait une fausse optimisation.

## `GM-LOCK-01` — Déduplication du lockfile

**Priorité : P3 · Statut : confirmé · Verdict : lot mécanique séparé.**

`pnpm dedupe --check` indique qu'une déduplication est possible et sort avec le code attendu d'un contrôle non satisfait. Exécuter la déduplication après les mises à jour de sécurité, inspecter uniquement le diff `pnpm-lock.yaml`, puis réinstaller en mode frozen.

**Gate.** `pnpm install --frozen-lockfile`, audit, typecheck/tests pertinents. **Non-objectif :** mélanger cette réécriture mécanique à une suppression de code pour masquer son diff.
