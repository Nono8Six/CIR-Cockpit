# Plan priorisé sans sur-ingénierie

## Verdict de séquence

La priorité n’est ni un redesign général ni DBOS. Le chemin le plus court vers un produit fiable est : **sécuriser → rendre les frontières vraies → rendre les écrans honnêtes → supprimer → reprendre la trajectoire**.

Chaque lot ci-dessous doit faire l’objet d’une autorisation d’implémentation séparée. Migration, publication, déploiement Edge et suppression distante restent des arrêts explicites. Les services Windows de développement sont hors roadmap produit par décision du PO du 4 septembre 2026.

## Lot 0 — Stop immédiat

Plan exécutable : [LOT_0_PLAN_EXECUTION.md](./LOT_0_PLAN_EXECUTION.md). Prompt autonome : [PROMPT_LOT_0.md](./PROMPT_LOT_0.md).

- [x] **Lot 0 terminé — GO le 4 septembre 2026.**

### Objectif

Empêcher une vue conservée mais inactive d’agir hors du contexte visible de l’utilisateur.

### Contenu

1. scoper les hotkeys Cockpit/Dashboard à la vue active et rendre les vues masquées `inert` ;
2. couvrir également les listeners globaux du parcours guidé Cockpit ;
3. laisser F1–F9 au seul shell et retirer les interceptions F1/F2 non annoncées du Cockpit ;
4. ajouter une recette ciblée prouvant qu’aucun raccourci d’une vue masquée ne soumet, n’efface ou ne déplace un focus.

### Non-objectifs

- aucune modification Windows, Servy, ACL, `.env`, runtime ou packaging backend ;
- pas de suppression du keep-alive avant décision sur les brouillons ;
- pas de refonte générale du système de raccourcis.

### Sortie

Une route inactive ne peut plus agir et les raccourcis globaux n’ont qu’un propriétaire visible.

## Lot 1 — Sécurité applicative courte

Prompt autonome : [PROMPT_LOT_1.md](./PROMPT_LOT_1.md).

- [x] **Lot 1 terminé — GO le 5 septembre 2026 pour le backend Node et la Data API Supabase.** Les six sous-tranches applicatives sont présentes et la migration `20260905041426_revoke_authenticated_profiles_update` retire le droit `UPDATE` de `authenticated` sur `public.profiles` tout en conservant `SELECT` et les accès de `service_role`.

### Contenu

1. garde inter-agence sur les upserts Entity/Interaction existants ;
2. blocage backend des comptes `must_change_password` hors parcours dédié ;
3. désactivation de `delete`/`bulk_delete` utilisateur au profit d’`archive` tant que la rétention multi-domaines n’est pas décidée ;
4. validation stricte des endpoints IA avant envoi d’une clé fournisseur ;
5. passage de `fflate` à la version corrigée et limites sur la décompression ;
6. gate racine explicite pour l'audit des seules dépendances de production, au seuil `moderate`.

### Preuves minimales

- tests adversariaux avec deux agences et UUID étranger ;
- appel API direct d’un compte à mot de passe temporaire refusé ;
- suppression physique indisponible ou atomique ;
- URL IA privée/non canonique refusée ;
- version corrigée de `fflate`, audit production vert et archive trop expansive refusée rapidement.

### Bornes acquises

- la clôture visée couvre le backend Node et la Data API Supabase ;
- l'Edge Function obsolète `api` a été retirée le 5 septembre 2026 sur autorisation explicite du PO ; l'ancien endpoint répond désormais `404` et ne peut plus exposer le contrat `password_changed` ;
- la transaction RLS centrale est désormais acquise par le Lot 2B ;
- la protection Supabase distante contre les mots de passe compromis reste ouverte et sa configuration n'a pas été modifiée ; en revanche, la migration ACL `20260905041426_revoke_authenticated_profiles_update` a bien été appliquée ;
- aucune décision de rétention, saga de suppression ou nouvelle architecture de sécurité ;
- aucun PoC ZIP64 synchrone, benchmark général, E2E ou matrice de tests.

## Lot 2 — Frontière données canonique

**État runtime au 5 septembre 2026 :** l'Edge Function `api` v227 a été retirée après vérification des logs disponibles. Les appels observés provenaient des probes automatisés du 4 septembre ; le PO a explicitement accepté le risque résiduel d'un ancien consommateur absent de la fenêtre de 24 heures. `gestion-utilisateurs`, fonction distincte, reste active et devra être examinée séparément.

- [x] **Lot 2B terminé — GO le 5 septembre 2026.** L'alias `userDb: db` a disparu ; les transactions utilisateur RLS, privilégiées avec acteur, sans DB et mixtes en phases courtes sont implémentées. La preuve distante A → B → A confirme l'absence de fuite inter-agence et la mutation imbriquée confirme `audit_logs.actor_id`. Aucun nouveau DDL n'est requis par l'état distant vérifié.

### Contenu

1. une transaction de requête pose l’identité, les claims RLS et l’acteur d’audit ;
2. le client privilégié devient explicite et réservé aux opérations système/super-admin ;
3. les handlers sans DB n'ouvrent aucune transaction métier ;
4. les appels réseau sont séparés des transactions DB longues.

### Décisions closes le 5 septembre 2026

- la frontière utilisateur utilise `SET LOCAL ROLE authenticated` et des claims locaux dans une transaction sur Supavisor Transaction `6543` ;
- les appels observés sur l'Edge `api` provenaient des probes automatisés du 4 septembre ; le PO accepte le risque d'un ancien consommateur absent de la fenêtre de 24 heures ;
- retrait immédiat de l'Edge `api` par suppression de la fonction distante ; tout ancien consommateur reçoit désormais `404` et doit rejoindre Node.

### Sujet séparé — `gestion-utilisateurs`

La fonction `gestion-utilisateurs`, distincte de l'ancienne Edge `api`, reste active. Son usage et son devenir devront être examinés séparément, sans préjuger ici de sa conservation ou de sa suppression.

### Sortie

Une requête utilisateur ordinaire ne contourne plus RLS, `audit_logs.actor_id` est renseigné et une seule frontière sert chaque mutation.

## Lot 3 — Vérité des écrans

### Contenu

1. annuaire Clients : total réel ou vraie pagination sans total ;
2. état `indisponible` persistant pour Annuaire, Contacts, Tâches, Référentiels, Paramètres et IA ;
3. Pilotage : afficher honnêtement une vue Activités ou attendre les objets métier stables ;
4. supprimer le sous-comptage silencieux des 200 Activités ;
5. protéger les brouillons lors d’un changement d’agence ou de fermeture de dialogue ;
6. centraliser les dates civiles Europe/Paris et le rollover d’une application ouverte toute la journée ;
7. aligner le vocabulaire visible sur Activité/Tâche/Opportunité.

### Décisions `À VALIDER`

- conserver temporairement un Pilotage limité aux Activités ou le retirer jusqu’à la Brique 6 ;
- permettre l’affectation directe d’une tâche à un collègue ;
- conserver une exception Sheet pour les seuls filtres mobiles.

## Lot 4 — Ménage sûr

### Contenu

1. après contrôle des consommateurs externes, supprimer les clusters sans consommateur interne détecté avec leurs tests devenus orphelins ;
2. retirer les helpers morts à l’intérieur de `referenceImports.ts` et `aiRunContext.ts` ;
3. corriger les liens cassés et sortir les plans Assistant IA supersédés du corpus actif ;
4. [normaliser le nom du responsable Tâche](./03-grand-menage/02-doublons-normalisation.md#gm-dup-06--le-nom-du-responsable-concatène-deux-représentations-complètes) : `backend/src/services/tasks/taskService.ts:1806` concatène actuellement `display_name`, prénom et nom ; le test de fin doit prouver un seul nom visible ;
5. [retirer les callbacks no-op du shell](./03-grand-menage/01-code-mort-surfaces-fantomes.md#gm-dead-10--deux-callbacks-obligatoires-ne-font-rien-avant-dêtre-écrasés-par-le-shell) et corriger la légende `? Aide` couverte par UI-16 ;
6. mettre à jour `DESIGN.md` sans toucher à l’historique des migrations.

### À conserver

- migrations appliquées ;
- types tRPC/Supabase générés ;
- sources Excel métier tant qu’une provenance de remplacement n’est pas décidée ;
- preuves E2E historiques, si elles sont déplacées/étiquetées comme telles ;
- modules longs mais cohérents comme `taskService.ts`.

## Lot 5 — Cohérence visuelle progressive

Traiter les violations `text-[10px]`, couleurs froides, `transition-all`, gradients, ombres et Sheets au fil des composants déjà ouverts par les lots précédents. Ajouter quelques garde-fous statiques ciblés ; ne pas lancer une réécriture CSS générale.

La page Login, les détails Tiers, les imports Référentiels et l’Administration sont les foyers prioritaires. Le plancher de 11 px, les tokens chauds et les Dialogs centrés sont déjà des décisions produit, pas de nouvelles orientations graphiques.

## Lot 6 — Reprise de trajectoire

DBOS ou une nouvelle brique ne redevient évaluable qu’après :

- frontière RLS réellement active ;
- runtime unique prouvé ;
- audit acteur fiable ;
- opérations longues d’import verrouillées/idempotentes ;
- écrans critiques ne transformant plus les erreurs en vérités métier.

À ce moment seulement, un spike DBOS borné peut décider si `approve → createTask` justifie le moteur durable. Cette décision ne doit pas servir à réparer rétroactivement les défauts de base listés ci-dessus.
