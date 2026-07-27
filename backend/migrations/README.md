# Migrations Supabase

Ce repertoire est l'historique SQL durable et reconstructible de toutes les
migrations Supabase du projet, quels que soient la brique et le schema.

| Responsabilite | Autorite |
| --- | --- |
| Etat reellement execute | projet Supabase distant lie |
| Canal d'ecriture du schema | `apply_migration` via le MCP Supabase |
| Historique SQL versionne | `backend/migrations/` |
| Parite local/distant | `pnpm run repo:check` |

Une migration n'est terminee que si le distant et ce repertoire contiennent la
meme version, le meme nom et le meme SQL.

## Flux MCP-first obligatoire

1. Inspecter en lecture seule l'etat distant, les migrations existantes et les
   objets touches.
2. Preparer le SQL complet. Privilegier une migration additive, transactionnelle
   quand PostgreSQL le permet, avec preuves post-migration et rollback definis.
3. Apres autorisation explicite du PO, appeler `apply_migration` une seule fois
   avec un nom descriptif en `snake_case`.
4. Verifier les objets, contraintes, donnees ciblees, RLS, ACL et advisors
   pertinents sur le projet distant.
5. Relire immediatement la ligne creee dans
   `supabase_migrations.schema_migrations`.
6. Recuperer le SQL exact enregistre par Supabase et l'ecrire sans transcription
   manuelle dans :

   ```text
   backend/migrations/<version_distante>_<nom>.sql
   ```

7. Comparer pendant l'extraction la version, le nom et l'empreinte du SQL
   normalise entre le distant et le fichier genere.
8. Lancer `pnpm run repo:check` puis la QA proportionnee au changement.

Si l'ecriture locale ou la parite echoue apres `apply_migration`, ne pas
appliquer de migration suivante. Corriger d'abord l'historique incomplet.

## Interdictions

- pas de `supabase db push` vers le projet lie ;
- pas de SQL Editor du Dashboard ni de connexion directe comme voie d'ecriture
  concurrente ;
- pas de fichier SQL retape ou reconstitue manuellement ;
- pas de migration distante sans fichier correspondant dans ce repertoire ;
- pas de dossier miroir ou de liste `remote-only` propre a une brique ;
- pas de manifeste de checksums maintenu manuellement ;
- aucune modification ou suppression d'une migration historique deja appliquee.

Une correction de schema ou de donnees passe toujours par une nouvelle
migration additive. Les compatibilites historiques deja presentes dans
`scripts/check-repo-state.mjs` ne doivent etre modifiees que lors d'une
reconciliation explicitement autorisee.
