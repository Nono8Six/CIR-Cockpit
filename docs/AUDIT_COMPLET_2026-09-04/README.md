# Audit complet CIR Cockpit — 4 septembre 2026

| Champ | Valeur |
| --- | --- |
| Dépôt audité | `C:\GitHub\CIR_Cockpit\CIR-Cockpit` |
| Branche / commit du snapshot initial | `main` / `0ee15a69861f0817b459bee4d2b375e56584a590` |
| État initial | worktree propre |
| Portée | backend, Supabase distant, frontend, expérience utilisateur, dépendances, tests, documentation, scripts, assets et code mort |
| Inventaire | 1 273 fichiers suivis par Git |
| Nature du dossier | audit initial et suivi d’exécution des Lots 0 et 1 terminés |
| Restrictions du snapshot initial | aucun correctif applicatif, aucune migration, aucun déploiement, aucun commit, aucun push, aucune écriture métier distante |
| État actuel documenté | Lots 0, 1 et 2B terminés ; migration ACL appliquée ; Edge `api` retirée |

## Conclusion

CIR Cockpit n’est pas à refaire. Le socle est déjà substantiel : contrats Zod stricts, tRPC généré et synchronisé, erreurs partagées, RLS présente sur les tables publiques, modèle Tiers/Activités/Tâches avancé, référentiels tarifaires riches, UI dense, routage par URL solide sur les annuaires, et suites unitaires vertes.

Au snapshot initial, deux faits produit dominaient et empêchaient de qualifier l’ensemble de **runtime canonique, sûr et honnête** :

1. le backend Node utilisait le même client PostgreSQL privilégié pour `db` et `userDb`, ce qui neutralisait la défense RLS attendue et laissait des mutations inter-agence contournables par identifiant connu ;
2. l’Edge Function Deno `api` v227 recevait encore des écritures de probes automatisés alors que les documents annonçaient un cutover Node sans dual-run.

Depuis ce snapshot, l’Edge `api` a été retirée le 5 septembre 2026 sur autorisation explicite du PO et l’ancien endpoint répond désormais `404`. Le Lot 2B a aussi établi la frontière DB/RLS et l'acteur d'audit, avec preuve distante à deux identités et nettoyage des fixtures.

Les deux services Windows exécutent par ailleurs le checkout modifiable en `LocalSystem`. Le PO a confirmé le 4 septembre 2026 qu’ils servent uniquement de lanceurs pour le développement local et ne constituent pas la stack finale. Ce risque hôte reste factuellement présent, mais il est accepté comme risque d’environnement local et sorti de la roadmap produit.

Le risque de raccourcis agissant depuis des vues conservées mais masquées a été fermé par le Lot 0 et la frontière DB/RLS par le Lot 2B. Les risques actuels passent avant toute retouche esthétique : plusieurs écrans rendent une erreur ou une donnée partielle comme un résultat métier complet, et le Pilotage matérialise un pseudo-pipeline d’« affaires » depuis les Activités alors que le modèle canonique réserve cette projection aux futurs objets Opportunité, Devis et Commande.

**Décision d’audit initiale : NO-GO pour l’Étape 5 DBOS, une nouvelle brique métier ou le retrait de l’Edge tant que les prérequis d’isolation applicative et de topologie ne sont pas réconciliés.** Mise à jour du 5 septembre 2026 : les conditions de topologie et de frontière DB/RLS sont levées ; les autres lots du plan restent à traiter avant de réévaluer DBOS ou une nouvelle brique.

## Avancement

- [x] **Lot 0 — Isolation des vues et raccourcis : GO le 4 septembre 2026.**
- [x] **Lot 1 — Sécurité applicative courte : GO le 5 septembre 2026 pour le backend Node et la Data API Supabase.** Les six sous-tranches applicatives sont présentes et la migration `20260905041426_revoke_authenticated_profiles_update` retire le droit `UPDATE` de `authenticated` sur `public.profiles` tout en conservant `SELECT` et les accès de `service_role`.
- [x] **Lot 2B — Frontière DB/RLS : GO le 5 septembre 2026.** Quatre chemins explicites remplacent l'alias privilégié ; les preuves distantes confirment l'isolation inter-agence, l'absence de fuite de contexte et l'acteur d'audit.

Ce GO porte exactement sur le backend Node et la Data API Supabase. L'Edge Function obsolète `api`, qui conservait l'ancien contrat `password_changed` sans le nouveau garde `must_change_password`, a été retirée séparément le 5 septembre 2026. `gestion-utilisateurs` reste active et hors de ce verdict.

## Les trois étapes

### [Étape 1 — Backend](./01-backend/README.md)

Sécurité applicative et secrets, authentification, isolation multi-agence, topologie Node/Edge, contrats, transactions, audit, PostgreSQL, imports, IA, dépendances, performance et exploitation.

### [Étape 2 — UI / UX / Design](./02-ui-ux-design/README.md)

Parcours et rôles, vérité métier, erreurs et états incomplets, raccourcis, formulaires, dates, accessibilité, design system, densité, responsive, URLs et performance perçue.

### [Étape 3 — Grand ménage](./03-grand-menage/README.md)

Code mort, surfaces fantômes, doublons exacts et sémantiques, dépendances, fichiers générés, assets, preuves historiques, documentation supersédée et séquence de suppression sûre.

## Ordre recommandé

Le détail est dans le [plan priorisé](./PLAN_PRIORISE.md). Les priorités d'isolation des vues, de sécurité applicative courte et de frontière DB/RLS sont acquises avec les Lots 0, 1 et 2B. L’ordre restant est le suivant :

1. examiner séparément `gestion-utilisateurs`, sans préjuger de sa suppression ;
2. corriger les lectures UI mensongères et les sémantiques Pilotage/Activité ;
3. supprimer les clusters morts et réaligner le corpus documentaire ;
4. seulement ensuite, réévaluer DBOS et la brique métier suivante.

Le [plan d’exécution du Lot 0](./LOT_0_PLAN_EXECUTION.md) et son [prompt historique](./PROMPT_LOT_0.md) documentent la tranche désormais terminée. Le [prompt Lot 1](./PROMPT_LOT_1.md) documente la tranche clôturée dans son périmètre Node/Data API.

## Ce qu’il ne faut pas faire

- Ne pas redéployer l’ancienne Edge Function `api` : le runtime canonique est Node. Tout ancien consommateur recevant désormais `404` doit être migré vers l’API Node, sans recréer de dual-run.
- Ne pas ajouter des policies permissives aux trois tables IA uniquement pour faire disparaître un advisor Supabase.
- Ne pas supprimer 76 index sur le seul signal « unused » ; il faut connaître la fenêtre de statistiques et les requêtes réelles.
- Ne pas réécrire `taskService.ts`, le routeur tRPC ou les types générés uniquement parce qu’ils sont longs.
- Ne pas créer une plateforme de sagas, un dual-run ou un système de feature flags générique pour ce POC.
- Ne pas confondre cet audit avec une autorisation de migration, de déploiement ou de suppression.

## Lecture du dossier

Chaque constat détaillé contient :

- un identifiant stable ;
- une priorité `P0` à `P3` ;
- un statut de preuve ;
- les chemins et lignes concernés ;
- l’impact métier ou utilisateur ;
- le correctif minimal recommandé ;
- les non-objectifs qui évitent la sur-ingénierie ;
- la preuve d’acceptation attendue.

La [méthodologie et ses limites](./METHODOLOGIE_ET_PREUVES.md) expliquent ce qui a été lu, mesuré ou observé. Le [registre des 1 273 fichiers](./REGISTRE_1273_FICHIERS.md) donne un verdict individuel et empêche qu’un dossier, une migration, un test ou un asset disparaisse derrière une conclusion globale.

## Validation du dossier livré

- 28 fichiers Markdown, répartis dans les trois étapes et la racine de l'audit ;
- 1 273 lignes de registre pour 1 273 fichiers suivis au snapshot ;
- `pnpm run qa:docs` vert : contrat tRPC à jour et contrôle local du dépôt réussi ;
- liens relatifs et ancres du dossier contrôlés, aucune cible manquante ;
- 349 références complètes `chemin:ligne` contrôlées, aucune ligne hors fichier ;
- aucun espace final ni motif de secret détecté dans le dossier ;
- au snapshot initial, `git status` ne montrait que le nouveau dossier d'audit ; après clôture et publication des Lots 0 et 1, le worktree était propre au commit `22c7675` avant le présent réalignement documentaire et le test ciblé.

Le constat rouge appartient au snapshot initial. Le Lot 1 a ensuite porté la dépendance directe `fflate` à `0.8.3`, configuré `qa:audit` sur les seules dépendances de production au seuil `moderate` et validé cette gate lors de sa clôture. Aucun nouvel audit de dépendances n'est exécuté dans le présent réalignement.

## Niveaux de priorité

| Niveau | Sens dans cet audit |
| --- | --- |
| `P0` | risque immédiat d’intégrité ou d’action invisible dans le produit ; à traiter avant toute suite. Un risque d’environnement explicitement accepté reste documenté mais sort de cette séquence |
| `P1` | défaut métier, sécurité applicative, topologie ou UX pouvant produire une décision ou une écriture fausse |
| `P2` | dette importante de fiabilité, performance, accessibilité ou maintenabilité |
| `P3` | cohérence, lisibilité, nettoyage ou optimisation opportuniste bornée |

Un `P2` confirmé n’est pas automatiquement moins certain qu’un `P1` : la priorité exprime l’urgence et l’impact, pas la qualité de la preuve.
