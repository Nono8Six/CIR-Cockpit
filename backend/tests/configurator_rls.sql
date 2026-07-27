-- Preuve RLS transactionnelle du schema configurator (C1, §8.8 du cadrage).
-- A executer en dev/staging. Transaction entierement annulee : aucune persistance.
--
-- Chaque cas leve une exception explicite en cas d'echec. Si le script atteint
-- le SELECT final, tous les cas sont passes.
--
-- Cas couverts :
--   1. anon refuse sur le catalogue et sur les configurations
--   2. catalogue lisible par tout utilisateur CIR authentifie
--   3. configuration personnelle isolee par proprietaire
--   4. configuration d'agence isolee entre agences
--   5. modification d'un partage : auteur, agency_admin, super_admin
--   6. import et activation reserves au super_admin
--   7. INSERT et UPDATE interdits hors perimetre
--
-- Les identifiants sont litteraux : ils doivent apparaitre tels quels dans les
-- claims JSON, et une table temporaire ne serait pas lisible sous le role
-- `authenticated`.
--
-- Le helper applicatif de claims, la garde statique sur saved_configuration et
-- les tests des services tRPC relevent de C3.

begin;

-- ---------------------------------------------------------------- fixtures --

insert into public.agencies (id, name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Agence RLS A'),
  ('00000000-0000-4000-8000-0000000000b1', 'Agence RLS B');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000f1', 'cfg_sa@test.invalid', '{"full_name":"Super Admin"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a2', 'cfg_aa@test.invalid', '{"full_name":"Admin A"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a3', 'cfg_t1@test.invalid', '{"full_name":"Tcs A1"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a4', 'cfg_t2@test.invalid', '{"full_name":"Tcs A2"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000b2', 'cfg_tb@test.invalid', '{"full_name":"Tcs B"}'::jsonb);

-- `private.handle_new_user` cree les profils avec le role par defaut `tcs`, et
-- `private.prevent_profile_role_change` interdit ensuite tout changement de role
-- a qui n'est pas deja super_admin. Les quatre declencheurs de `public.profiles`
-- portant uniquement sur UPDATE, les profils d'essai sont reecrits plutot que
-- modifies. Aucune garde n'est desactivee.

delete from public.profiles where id in (
  '00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000000a4',
  '00000000-0000-4000-8000-0000000000b2'
);

insert into public.profiles (id, email, last_name, role, active_agency_id) values
  ('00000000-0000-4000-8000-0000000000f1', 'cfg_sa@test.invalid', 'Super Admin',
   'super_admin',  '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a2', 'cfg_aa@test.invalid', 'Admin A',
   'agency_admin', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a3', 'cfg_t1@test.invalid', 'Tcs A1',
   'tcs',          '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a4', 'cfg_t2@test.invalid', 'Tcs A2',
   'tcs',          '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000b2', 'cfg_tb@test.invalid', 'Tcs B',
   'tcs',          '00000000-0000-4000-8000-0000000000b1');

-- `public.agency_members` ne porte que le rattachement ; le role est lu sur
-- `public.profiles` par `private.has_agency_role`.
insert into public.agency_members (agency_id, user_id) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000f1'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a3'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a4'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2');

-- ------------------------------------------- 1. anon : refus total attendu --

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare v_refuse boolean := false;
begin
  begin
    perform 1 from configurator.catalog_snapshot;
  exception when others then v_refuse := true;
  end;
  if not v_refuse then
    raise exception 'ECHEC 1a : anon a pu lire configurator.catalog_snapshot';
  end if;

  v_refuse := false;
  begin
    perform 1 from configurator.saved_configuration;
  exception when others then v_refuse := true;
  end;
  if not v_refuse then
    raise exception 'ECHEC 1b : anon a pu lire configurator.saved_configuration';
  end if;
end $$;

-- ---------------- 6a. import et activation : refus pour tcs et agency_admin --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

do $$
declare v_refuse boolean := false;
begin
  begin
    insert into configurator.catalog_snapshot (id, domain, label, created_by)
    values ('00000000-0000-4000-8000-0000000000c1', 'motor', 'Snapshot RLS',
            '00000000-0000-4000-8000-0000000000a3');
  exception when others then v_refuse := true;
  end;
  if not v_refuse then
    raise exception 'ECHEC 6a : tcs a pu creer un snapshot catalogue';
  end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

do $$
declare v_refuse boolean := false;
begin
  begin
    insert into configurator.import_batch (domain, candidate_snapshot_id, fingerprint_sha256, created_by)
    values ('motor', '00000000-0000-4000-8000-0000000000c1',
            repeat('a', 64), '00000000-0000-4000-8000-0000000000a2');
  exception when others then v_refuse := true;
  end;
  if not v_refuse then
    raise exception 'ECHEC 6b : agency_admin a pu creer un lot d import';
  end if;
end $$;

-- --------------------------- 6c. super_admin : import et snapshot autorises --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';

insert into configurator.catalog_snapshot (id, domain, label, created_by)
values ('00000000-0000-4000-8000-0000000000c1', 'motor', 'Snapshot RLS',
        '00000000-0000-4000-8000-0000000000f1');

insert into configurator.import_batch (domain, candidate_snapshot_id, fingerprint_sha256, created_by)
values ('motor', '00000000-0000-4000-8000-0000000000c1',
        repeat('a', 64), '00000000-0000-4000-8000-0000000000f1');

do $$
begin
  if (select count(*) from configurator.catalog_snapshot
      where id = '00000000-0000-4000-8000-0000000000c1') <> 1 then
    raise exception 'ECHEC 6c : super_admin n a pas cree le snapshot';
  end if;
end $$;

-- ------------------------- 6d. activation : refusee au tcs, gate obligatoire --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

do $$
declare v_message text := '';
begin
  begin
    perform configurator.activate_snapshot(
      '00000000-0000-4000-8000-0000000000c1', 'note', repeat('b', 64));
  exception when others then v_message := sqlerrm;
  end;
  if v_message not like '%CONFIGURATOR_ACTIVATION_FORBIDDEN%' then
    raise exception 'ECHEC 6d : activation par tcs non bloquee (%)', v_message;
  end if;
end $$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';

do $$
declare v_message text := '';
begin
  begin
    perform configurator.activate_snapshot(
      '00000000-0000-4000-8000-0000000000c1', 'note', repeat('b', 64));
  exception when others then v_message := sqlerrm;
  end;
  if v_message not like '%CONFIGURATOR_SNAPSHOT_NOT_READY%' then
    raise exception 'ECHEC 6e : gate d activation non applique (%)', v_message;
  end if;
end $$;

-- ------------------- 2. catalogue lisible par tout utilisateur CIR authentifie --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}';

do $$
begin
  if (select count(*) from configurator.catalog_snapshot
      where id = '00000000-0000-4000-8000-0000000000c1') <> 1 then
    raise exception 'ECHEC 2a : catalogue invisible depuis une autre agence';
  end if;
  if (select count(*) from configurator.motor_dimension_canonical) <> 13 then
    raise exception 'ECHEC 2b : vocabulaire canonique illisible';
  end if;
end $$;

-- -------------------------------- 3 et 4. configurations : seed puis isolation --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

insert into configurator.saved_configuration
  (id, schema_version, domain, scope, label, snapshot_id, configuration)
values
  ('00000000-0000-4000-8000-0000000000d1', 1, 'motor', 'personal',
   'Config personnelle', '00000000-0000-4000-8000-0000000000c1',
   '{"domain":"motor","payload_schema_version":1}'::jsonb),
  ('00000000-0000-4000-8000-0000000000d2', 1, 'motor', 'agency',
   'Config partagee', '00000000-0000-4000-8000-0000000000c1',
   '{"domain":"motor","payload_schema_version":1}'::jsonb);

do $$
begin
  -- owner_id et agency_id sont imposes par la session, jamais par le client
  if (select count(*) from configurator.saved_configuration
      where owner_id = '00000000-0000-4000-8000-0000000000a3'
        and agency_id = '00000000-0000-4000-8000-0000000000a1') <> 2 then
    raise exception 'ECHEC 3a : proprietaire ou agence non imposes par la session';
  end if;
end $$;

-- 3. autre utilisateur de la meme agence : ne voit que le partage
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}';

do $$
begin
  if (select count(*) from configurator.saved_configuration
      where id = '00000000-0000-4000-8000-0000000000d1') <> 0 then
    raise exception 'ECHEC 3b : configuration personnelle visible par un tiers';
  end if;
  if (select count(*) from configurator.saved_configuration
      where id = '00000000-0000-4000-8000-0000000000d2') <> 1 then
    raise exception 'ECHEC 3c : configuration d agence invisible dans son agence';
  end if;
end $$;

-- 4. autre agence : ne voit rien
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}';

do $$
begin
  if (select count(*) from configurator.saved_configuration) <> 0 then
    raise exception 'ECHEC 4a : configurations visibles depuis une autre agence';
  end if;
end $$;

-- --------------------- 5. modification d un partage : qui a le droit, qui non --

do $$
begin
  update configurator.saved_configuration set label = 'Pirate'
   where id = '00000000-0000-4000-8000-0000000000d2';
  if found then
    raise exception 'ECHEC 5a : partage modifie depuis une autre agence';
  end if;
end $$;

-- 5b. tiers de la meme agence, sans role d administration : refus
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a4","role":"authenticated"}';

do $$
begin
  update configurator.saved_configuration set label = 'Tiers agence'
   where id = '00000000-0000-4000-8000-0000000000d2';
  if found then
    raise exception 'ECHEC 5b : partage modifie par un tcs tiers de l agence';
  end if;
end $$;

-- 5c. auteur : autorise
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

do $$
begin
  update configurator.saved_configuration set label = 'Modifie par auteur'
   where id = '00000000-0000-4000-8000-0000000000d2';
  if not found then
    raise exception 'ECHEC 5c : l auteur ne peut pas modifier son partage';
  end if;
end $$;

-- 5d. agency_admin de l agence : autorise
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

do $$
begin
  update configurator.saved_configuration set label = 'Modifie par agency_admin'
   where id = '00000000-0000-4000-8000-0000000000d2';
  if not found then
    raise exception 'ECHEC 5d : agency_admin ne peut pas administrer le partage';
  end if;
end $$;

-- 5e. super_admin : autorise
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';

do $$
begin
  update configurator.saved_configuration set label = 'Modifie par super_admin'
   where id = '00000000-0000-4000-8000-0000000000d2';
  if not found then
    raise exception 'ECHEC 5e : super_admin ne peut pas administrer le partage';
  end if;
end $$;

-- ------------------------------- 7. INSERT et UPDATE interdits hors perimetre --

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

do $$
declare v_message text := '';
begin
  -- Identite d une configuration : immuable. Deux barrieres se succedent, et
  -- c est la premiere qui repond ici. `scope` n est pas dans le GRANT UPDATE
  -- par colonne, donc l ACL refuse avant meme que le declencheur
  -- `configurator_prepare_saved_configuration` ne soit atteint. Le test accepte
  -- l une ou l autre : ce qui compte est le refus.
  begin
    update configurator.saved_configuration
       set scope = 'personal'
     where id = '00000000-0000-4000-8000-0000000000d2';
  exception when others then v_message := sqlerrm;
  end;
  if v_message not like '%permission denied%'
     and v_message not like '%CONFIGURATOR_CONFIGURATION_IDENTITY_IMMUTABLE%' then
    raise exception 'ECHEC 7a : portee d une configuration modifiable (%)', v_message;
  end if;
end $$;

do $$
declare v_refuse boolean := false;
begin
  -- vocabulaire canonique : alimente par migration, jamais par un utilisateur
  begin
    insert into configurator.motor_dimension_canonical (code, label_fr, criterion_enabled)
    values ('A', 'Injection interdite', true);
  exception when others then v_refuse := true;
  end;
  if not v_refuse then
    raise exception 'ECHEC 7b : ecriture possible dans le vocabulaire canonique';
  end if;
end $$;

-- ------------------------------------------------------------------ rapport --

reset role;

select 'configurator RLS : tous les cas passes' as resultat;

rollback;
