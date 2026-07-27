-- Configurateurs C2 - plusieurs fichiers par role dans un lot d'import.
--
-- Constat du chargement C2 : le lot moteur compte 17 fichiers source pour
-- 11 roles. `import_file_batch_role_unique (batch_id, file_role)` n'en admettait
-- qu'un seul par role, ce qui aurait force a n'enregistrer qu'une empreinte
-- agregee et aurait fait perdre la tracabilite fichier par fichier exigee par
-- le cadrage C0 §11.2.
--
-- `import_file_batch_sha_unique (batch_id, sha256)` est conservee : elle reste
-- la garantie contre un meme fichier enregistre deux fois dans un lot.
--
-- Table vide au moment de l'application : aucune donnee n'est touchee.

alter table configurator.import_file
  drop constraint import_file_batch_role_unique;

comment on column configurator.import_file.file_role is
  'Role du fichier dans le lot. Plusieurs fichiers peuvent partager un role : le lot moteur compte par exemple six fichiers de role models. L unicite porte sur l empreinte, pas sur le role.';
