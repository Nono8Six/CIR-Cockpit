# Prompt — exécution du Lot 1 dans une nouvelle conversation

Copier uniquement le bloc ci-dessous dans une nouvelle conversation Codex.

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Modèle
Utilise gpt-5.6-sol avec un effort medium.

Objectif
Exécute uniquement le « Lot 1 — Sécurité applicative courte » de docs/AUDIT_COMPLET_2026-09-04/PLAN_PRIORISE.md.

Ferme, avec les corrections locales les plus simples, cinq risques : réécriture d'un UUID Entity/Interaction d'une autre agence, contournement du mot de passe temporaire, suppression physique d'utilisateurs, fuite de clé vers un endpoint IA arbitraire et décompression XLSX disproportionnée.

État de départ
- Le Lot 0 est terminé et marqué GO. Ne le refactore pas.
- Le worktree peut contenir ses changements et le dossier d'audit non suivi par Git : tout cela appartient au PO et doit être préservé.
- `userDb` reste actuellement un alias privilégié. Sa vraie frontière transaction/RLS appartient au Lot 2 ; le présent lot pose seulement les gardes applicatives immédiates.
- Le flux mot de passe appelle aujourd'hui Supabase Auth, puis laisse le client déclarer `password_changed`.
- `delete` et `bulk_delete` utilisateur sont encore exposés par le contrat, le backend et l'UI ; `archive`, `unarchive` et l'archivage groupé existent déjà.
- Le test fournisseur IA peut utiliser `base_url` avant toute validation canonique et transmettre la clé en suivant les redirections.
- Le parser appelle `unzipSync` avec `fflate@0.8.2`.
- L'audit production trouve trois avis modérés : `fflate` et deux avis `@hono/node-server`. La commande actuelle voit déjà le lockfile workspace ; son défaut est de mélanger production et développement et d'utiliser le seuil `high`.
- Les classeurs métier observés culminent autour de 11 entrées, 10,9 Mio décompressés et un ratio d'expansion de 8,4.

Périmètre autorisé

1. Garde inter-agence des upserts existants
- Pour une sauvegarde Entity portant un ID existant, charger la ligne actuelle, vérifier son agence et son type, puis conditionner l'écriture par son ID et son périmètre actuel.
- Appliquer le même principe à Interaction : un membre de l'agence A ne doit jamais pouvoir réécrire un UUID de B en fournissant l'agence A dans le payload.
- Traiter correctement le conflit concurrent sans transformer une absence de ligne retournée en succès.
- Ne pas étendre cette tranche aux autres services ni construire la transaction RLS centrale.

2. Mot de passe temporaire réellement bloquant
- Ajouter `must_change_password` au contexte d'authentification backend.
- Refuser avec `403` toutes les procédures ordinaires et super-admin lorsque le flag est actif, sauf une seule procédure authentifiée dédiée au changement de mot de passe.
- Cette procédure reçoit le nouveau mot de passe, réutilise les validations existantes, met le secret à jour via Supabase Admin côté serveur, puis lève `must_change_password` seulement après le succès Auth.
- Si la mise à jour Auth réussit mais que la mise à jour du profil échoue, le compte reste fermé ; ne crée ni saga ni compensation. Une nouvelle réinitialisation administrative est la récupération acceptable du POC.
- Remplacer le double appel frontend par cette procédure unique et supprimer l'action déclarative `password_changed`.

3. Suppression utilisateur retirée
- Retirer réellement `delete` et `bulk_delete` du schéma Zod, des réponses partagées, du handler backend, de la projection tRPC et de l'interface Utilisateurs.
- Conserver `archive`, `unarchive` et l'archivage/restauration groupé existants.
- Supprimer uniquement les services, hooks, états, dialogs, helpers et tests devenus exclusivement orphelins de la suppression physique. Ne laisse pas de bouton décoratif désactivé.
- Régénérer la projection tRPC une seule fois, après les changements de contrat des tranches 2 et 3.

4. Endpoints IA canoniques
- Définir une seule validation réutilisée par la sauvegarde et le test fournisseur : HTTPS et base exacte déjà canonique pour `mistral` ou `openrouter`, sans userinfo, query, fragment, variante de domaine ou chemin ajouté.
- Refuser l'URL avant chiffrement/déchiffrement ou envoi d'une clé.
- Appeler `fetch` avec `redirect: "error"`.
- Ne pas ajouter de fournisseur, de résolution DNS, de proxy sortant ou de compatibilité « OpenAI-like ».

5. XLSX et dépendances
- Avec pnpm, passer exactement `fflate` à `0.8.3` et `@hono/node-server` à `1.19.15`. Limiter le lockfile à ces mises à jour.
- Ajouter près du parser trois plafonds simples, centralisés et généreux : nombre d'entrées, taille totale décompressée et ratio d'expansion. Ils doivent rester largement au-dessus des classeurs métier observés.
- Rendre `qa:audit` explicitement racine et production : `pnpm audit --prod --audit-level=moderate`. Remplacer la commande existante ; ne pas en ajouter une seconde.
- Ne pas traiter les avis `xlsx` de développement dans ce lot.

Limites strictes
- Aucune migration, écriture de données ou modification de configuration Supabase pendant cette tâche. Les tests du nouveau flux Auth mockent la frontière Supabase Admin.
- Ne pas activer ici la protection Supabase distante contre les mots de passe compromis ; elle reste un suivi séparé et ne bloque pas le GO local.
- Aucun travail sur Edge, DBOS, Windows, Servy, les ACL, le packaging ou la stack finale.
- Aucune décision de rétention et aucune saga de suppression.
- Aucun E2E, test contre Supabase distant, suite exhaustive, `qa:fast`, `qa`, coverage, build, benchmark général ou matrice de tests.
- Ne jamais exécuter un PoC ZIP64 synchrone susceptible de bloquer le processus. La version corrigée et l'audit couvrent l'avis ; un test d'archive trop expansive couvre notre garde.
- Aucun stage, commit, push, PR, stash, reset ou nettoyage du worktree.
- Ne commence pas le Lot 2.

Sources canoniques à relire
- AGENTS.md
- docs/AUDIT_COMPLET_2026-09-04/PLAN_PRIORISE.md, section Lot 1
- docs/AUDIT_COMPLET_2026-09-04/01-backend/01-securite-isolation-identites.md : BE-P1-01, BE-P1-02 et BE-P1-07
- docs/AUDIT_COMPLET_2026-09-04/01-backend/03-integrite-transactions-audit.md : BE-P1-04
- docs/AUDIT_COMPLET_2026-09-04/01-backend/06-dependances-performance-maintenance.md : BE-P1-09 et BE-P2-09
- backend/src/services/entities/core/dataEntities.ts
- backend/src/services/entities/actions/dataEntitiesSavePersistence.ts
- backend/src/services/entities/interactions/dataInteractions.ts
- backend/src/middleware/auth/buildAuthContext.ts
- backend/src/middleware/auth/auth.ts
- backend/src/trpc/procedures.ts
- backend/src/trpc/router.ts
- backend/src/services/data/dataProfile.ts
- backend/src/services/admin/adminUsers.ts
- backend/src/services/ai/aiGovernance.ts
- backend/src/services/ai/runtime/providerRegistry.ts
- backend/src/services/pricing/references/referenceExcelParser.ts
- shared/schemas/admin/user.schema.ts
- shared/schemas/system/data.schema.ts
- package.json et backend/package.json

Preuves de fin proportionnées
- Un test Entity et un test Interaction prouvent qu'un UUID existant d'une autre agence est refusé sans écriture.
- Un test de procédure prouve à la fois le `403` métier pour `must_change_password` et l'accès à la seule procédure dédiée ; le contrat rejette l'ancienne déclaration client.
- Un test de contrat rejette `delete` et `bulk_delete`, et un test UI Utilisateurs existant est adapté pour prouver que l'archivage reste disponible sans commande de suppression.
- Un seul test tabulaire IA couvre base canonique acceptée, base étrangère refusée sans `fetch`, et redirection refusée.
- Un fixture XLSX valide reste accepté ; une archive dépassant les plafonds est refusée. N'ajoute pas d'autres cas si ces deux preuves couvrent le changement.
- Exécuter uniquement les fichiers de tests directement concernés, puis :
  - `pnpm run backend:typecheck` ;
  - `pnpm run frontend:typecheck` ;
  - `pnpm run contract:trpc:check` ;
  - `pnpm run qa:audit` ;
  - `git diff --check` sur les fichiers du lot.

Exécution
Applique AGENTS.md. Charge d'abord `cir-cockpit-agent-router`, puis seulement les fichiers et skills qu'il sélectionne, notamment ceux requis par les contrats API, les erreurs, Supabase Auth, pnpm et la validation finale.

Inspecte le worktree avant toute modification. Implémente les cinq sous-tranches sans mécanisme générique, adapte seulement les tests existants directement concernés et va jusqu'au résultat sans questionnaire tant qu'aucune décision réellement bloquante n'apparaît.

Si toutes les preuves passent, coche uniquement le Lot 1 dans PLAN_PRIORISE.md et note que la protection Supabase distante reste ouverte hors périmètre. Termine par le verdict GO ou NO-GO, les fichiers modifiés, les commandes réellement exécutées et les seules réserves encore réelles.

Arrêt strict
Après le verdict Lot 1, arrête-toi. Ne commence ni Lot 2, ni migration, ni déploiement, ni modification distante, ni commit/push.
```

## Conseil d'exécution

- **Modèle :** `gpt-5.6-sol`
- **Effort :** `medium`
- **Tâche :** nouvelle tâche
- **Pourquoi :** le lot traverse sécurité backend, contrat partagé et deux surfaces frontend, mais chaque invariant et chaque preuve restent strictement bornés.
