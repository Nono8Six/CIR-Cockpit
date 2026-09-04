# Audit complet CIR Cockpit — 4 septembre 2026

| Champ | Valeur |
| --- | --- |
| Dépôt audité | `C:\GitHub\CIR_Cockpit\CIR-Cockpit` |
| Branche / commit de référence | `main` / `0ee15a69861f0817b459bee4d2b375e56584a590` |
| État initial | worktree propre |
| Portée | backend, Supabase distant, frontend, expérience utilisateur, dépendances, tests, documentation, scripts, assets et code mort |
| Inventaire | 1 273 fichiers suivis par Git |
| Nature du dossier | audit initial, suivi d’exécution du Lot 0 et handoff du Lot 1 |
| Mutations exclues | aucun correctif applicatif, aucune migration, aucun déploiement, aucun commit, aucun push, aucune écriture métier distante |

## Conclusion

CIR Cockpit n’est pas à refaire. Le socle est déjà substantiel : contrats Zod stricts, tRPC généré et synchronisé, erreurs partagées, RLS présente sur les tables publiques, modèle Tiers/Activités/Tâches avancé, référentiels tarifaires riches, UI dense, routage par URL solide sur les annuaires, et suites unitaires vertes.

En revanche, l’état actuel ne permet pas encore de qualifier l’ensemble de **runtime canonique, sûr et honnête**. Deux faits produit dominent :

1. le backend Node utilise le même client PostgreSQL privilégié pour `db` et `userDb`, ce qui neutralise la défense RLS attendue et laisse des mutations inter-agence contournables par identifiant connu ;
2. l’Edge Function Deno `api` v227 reçoit encore des écritures réelles alors que les documents annoncent un cutover Node sans dual-run.

Les deux services Windows exécutent par ailleurs le checkout modifiable en `LocalSystem`. Le PO a confirmé le 4 septembre 2026 qu’ils servent uniquement de lanceurs pour le développement local et ne constituent pas la stack finale. Ce risque hôte reste factuellement présent, mais il est accepté comme risque d’environnement local et sorti de la roadmap produit.

Côté utilisateur, deux risques passent avant toute retouche esthétique : des raccourcis de vues conservées mais masquées peuvent agir hors contexte, et plusieurs écrans rendent une erreur ou une donnée partielle comme un résultat métier complet. Le Pilotage matérialise par ailleurs un pseudo-pipeline d’« affaires » depuis les Activités, alors que le modèle canonique réserve cette projection aux futurs objets Opportunité, Devis et Commande.

**Décision d’audit : NO-GO pour l’Étape 5 DBOS, une nouvelle brique métier ou le retrait de l’Edge tant que les prérequis d’isolation applicative et de topologie ne sont pas réconciliés.** Ce NO-GO n’interdit pas les corrections ciblées décrites dans le plan priorisé.

## Avancement

- [x] **Lot 0 — Isolation des vues et raccourcis : GO le 4 septembre 2026.**
- [ ] **Lot 1 — Sécurité applicative courte : prompt prêt, non exécuté.**

## Les trois étapes

### [Étape 1 — Backend](./01-backend/README.md)

Sécurité applicative et secrets, authentification, isolation multi-agence, topologie Node/Edge, contrats, transactions, audit, PostgreSQL, imports, IA, dépendances, performance et exploitation.

### [Étape 2 — UI / UX / Design](./02-ui-ux-design/README.md)

Parcours et rôles, vérité métier, erreurs et états incomplets, raccourcis, formulaires, dates, accessibilité, design system, densité, responsive, URLs et performance perçue.

### [Étape 3 — Grand ménage](./03-grand-menage/README.md)

Code mort, surfaces fantômes, doublons exacts et sémantiques, dépendances, fichiers générés, assets, preuves historiques, documentation supersédée et séquence de suppression sûre.

## Ordre recommandé

Le détail est dans le [plan priorisé](./PLAN_PRIORISE.md). L’ordre court est le suivant :

1. neutraliser les actions UI des vues conservées mais masquées ;
2. fermer les contournements d’authentification, les mutations inter-agence et les opérations destructives partielles ;
3. inventorier les consommateurs Edge puis choisir et prouver une frontière runtime unique ;
4. corriger les lectures UI mensongères et les sémantiques Pilotage/Activité ;
5. supprimer les clusters morts et réaligner le corpus documentaire ;
6. seulement ensuite, réévaluer DBOS et la brique métier suivante.

Le [plan d’exécution du Lot 0](./LOT_0_PLAN_EXECUTION.md) et son [prompt historique](./PROMPT_LOT_0.md) documentent la tranche désormais terminée. Le [prompt Lot 1](./PROMPT_LOT_1.md) est prêt à être envoyé dans une nouvelle conversation.

## Ce qu’il ne faut pas faire

- Ne pas supprimer l’Edge Function parce que le code Deno a disparu du dépôt : son trafic récent prouve encore des consommateurs.
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
- au snapshot initial, `git status` ne montrait que le nouveau dossier d'audit ; le worktree courant contient désormais les changements frontend du Lot 0, conservés sans commit ni push.

Les audits de dépendances restent volontairement rouges tant que les versions signalées ne sont pas corrigées. Ce résultat est un constat du présent audit, pas un échec masqué de la livraison documentaire.

## Niveaux de priorité

| Niveau | Sens dans cet audit |
| --- | --- |
| `P0` | risque immédiat d’intégrité ou d’action invisible dans le produit ; à traiter avant toute suite. Un risque d’environnement explicitement accepté reste documenté mais sort de cette séquence |
| `P1` | défaut métier, sécurité applicative, topologie ou UX pouvant produire une décision ou une écriture fausse |
| `P2` | dette importante de fiabilité, performance, accessibilité ou maintenabilité |
| `P3` | cohérence, lisibilité, nettoyage ou optimisation opportuniste bornée |

Un `P2` confirmé n’est pas automatiquement moins certain qu’un `P1` : la priorité exprime l’urgence et l’impact, pas la qualité de la preuve.
