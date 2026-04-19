create table if not exists public.app_settings (
  id integer primary key,
  feature_flags jsonb not null,
  onboarding jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

create table if not exists public.agency_settings (
  agency_id uuid primary key references public.agencies(id) on delete cascade,
  onboarding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reference_departments (
  code text primary key,
  label text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_departments_code_trim check (btrim(code) <> ''),
  constraint reference_departments_label_trim check (btrim(label) <> '')
);

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings
  before update on public.app_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_agency_settings on public.agency_settings;
create trigger set_updated_at_agency_settings
  before update on public.agency_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_reference_departments on public.reference_departments;
create trigger set_updated_at_reference_departments
  before update on public.reference_departments
  for each row execute function public.set_updated_at();

insert into public.app_settings (id, feature_flags, onboarding)
values (
  1,
  '{"ui_shell_v2": false}'::jsonb,
  '{
    "allow_manual_entry": true,
    "default_account_type_company": "term",
    "default_account_type_individual": "cash"
  }'::jsonb
)
on conflict (id) do nothing;

with seeded_departments(code, label, sort_order) as (
  values
    ('01', 'Ain', 1),
    ('02', 'Aisne', 2),
    ('03', 'Allier', 3),
    ('04', 'Alpes-de-Haute-Provence', 4),
    ('05', 'Hautes-Alpes', 5),
    ('06', 'Alpes-Maritimes', 6),
    ('07', 'Ardeche', 7),
    ('08', 'Ardennes', 8),
    ('09', 'Ariege', 9),
    ('10', 'Aube', 10),
    ('11', 'Aude', 11),
    ('12', 'Aveyron', 12),
    ('13', 'Bouches-du-Rhone', 13),
    ('14', 'Calvados', 14),
    ('15', 'Cantal', 15),
    ('16', 'Charente', 16),
    ('17', 'Charente-Maritime', 17),
    ('18', 'Cher', 18),
    ('19', 'Correze', 19),
    ('21', 'Cote-d''Or', 20),
    ('22', 'Cotes-d''Armor', 21),
    ('23', 'Creuse', 22),
    ('24', 'Dordogne', 23),
    ('25', 'Doubs', 24),
    ('26', 'Drome', 25),
    ('27', 'Eure', 26),
    ('28', 'Eure-et-Loir', 27),
    ('29', 'Finistere', 28),
    ('2A', 'Corse-du-Sud', 29),
    ('2B', 'Haute-Corse', 30),
    ('30', 'Gard', 31),
    ('31', 'Haute-Garonne', 32),
    ('32', 'Gers', 33),
    ('33', 'Gironde', 34),
    ('34', 'Herault', 35),
    ('35', 'Ille-et-Vilaine', 36),
    ('36', 'Indre', 37),
    ('37', 'Indre-et-Loire', 38),
    ('38', 'Isere', 39),
    ('39', 'Jura', 40),
    ('40', 'Landes', 41),
    ('41', 'Loir-et-Cher', 42),
    ('42', 'Loire', 43),
    ('43', 'Haute-Loire', 44),
    ('44', 'Loire-Atlantique', 45),
    ('45', 'Loiret', 46),
    ('46', 'Lot', 47),
    ('47', 'Lot-et-Garonne', 48),
    ('48', 'Lozere', 49),
    ('49', 'Maine-et-Loire', 50),
    ('50', 'Manche', 51),
    ('51', 'Marne', 52),
    ('52', 'Haute-Marne', 53),
    ('53', 'Mayenne', 54),
    ('54', 'Meurthe-et-Moselle', 55),
    ('55', 'Meuse', 56),
    ('56', 'Morbihan', 57),
    ('57', 'Moselle', 58),
    ('58', 'Nievre', 59),
    ('59', 'Nord', 60),
    ('60', 'Oise', 61),
    ('61', 'Orne', 62),
    ('62', 'Pas-de-Calais', 63),
    ('63', 'Puy-de-Dome', 64),
    ('64', 'Pyrenees-Atlantiques', 65),
    ('65', 'Hautes-Pyrenees', 66),
    ('66', 'Pyrenees-Orientales', 67),
    ('67', 'Bas-Rhin', 68),
    ('68', 'Haut-Rhin', 69),
    ('69', 'Rhone', 70),
    ('70', 'Haute-Saone', 71),
    ('71', 'Saone-et-Loire', 72),
    ('72', 'Sarthe', 73),
    ('73', 'Savoie', 74),
    ('74', 'Haute-Savoie', 75),
    ('75', 'Paris', 76),
    ('76', 'Seine-Maritime', 77),
    ('77', 'Seine-et-Marne', 78),
    ('78', 'Yvelines', 79),
    ('79', 'Deux-Sevres', 80),
    ('80', 'Somme', 81),
    ('81', 'Tarn', 82),
    ('82', 'Tarn-et-Garonne', 83),
    ('83', 'Var', 84),
    ('84', 'Vaucluse', 85),
    ('85', 'Vendee', 86),
    ('86', 'Vienne', 87),
    ('87', 'Haute-Vienne', 88),
    ('88', 'Vosges', 89),
    ('89', 'Yonne', 90),
    ('90', 'Territoire de Belfort', 91),
    ('91', 'Essonne', 92),
    ('92', 'Hauts-de-Seine', 93),
    ('93', 'Seine-Saint-Denis', 94),
    ('94', 'Val-de-Marne', 95),
    ('95', 'Val-d''Oise', 96),
    ('971', 'Guadeloupe', 97),
    ('972', 'Martinique', 98),
    ('973', 'Guyane', 99),
    ('974', 'La Reunion', 100),
    ('976', 'Mayotte', 101)
)
insert into public.reference_departments (code, label, sort_order, is_active)
select code, label, sort_order, true
from seeded_departments
on conflict (code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.app_settings enable row level security;
alter table public.agency_settings enable row level security;
alter table public.reference_departments enable row level security;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists app_settings_insert on public.app_settings;
create policy app_settings_insert
  on public.app_settings
  for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update
  on public.app_settings
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists app_settings_delete on public.app_settings;
create policy app_settings_delete
  on public.app_settings
  for delete
  to authenticated
  using (public.is_super_admin());

drop policy if exists agency_settings_select on public.agency_settings;
create policy agency_settings_select
  on public.agency_settings
  for select
  to authenticated
  using (public.is_super_admin() or public.is_member(agency_id));

drop policy if exists agency_settings_insert on public.agency_settings;
create policy agency_settings_insert
  on public.agency_settings
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_settings_update on public.agency_settings;
create policy agency_settings_update
  on public.agency_settings
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_settings_delete on public.agency_settings;
create policy agency_settings_delete
  on public.agency_settings
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists reference_departments_select on public.reference_departments;
create policy reference_departments_select
  on public.reference_departments
  for select
  to authenticated
  using (true);

drop policy if exists agency_statuses_insert on public.agency_statuses;
create policy agency_statuses_insert
  on public.agency_statuses
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_statuses_update on public.agency_statuses;
create policy agency_statuses_update
  on public.agency_statuses
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_statuses_delete on public.agency_statuses;
create policy agency_statuses_delete
  on public.agency_statuses
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_services_insert on public.agency_services;
create policy agency_services_insert
  on public.agency_services
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_services_update on public.agency_services;
create policy agency_services_update
  on public.agency_services
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_services_delete on public.agency_services;
create policy agency_services_delete
  on public.agency_services
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_entities_insert on public.agency_entities;
create policy agency_entities_insert
  on public.agency_entities
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_entities_update on public.agency_entities;
create policy agency_entities_update
  on public.agency_entities
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_entities_delete on public.agency_entities;
create policy agency_entities_delete
  on public.agency_entities
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_families_insert on public.agency_families;
create policy agency_families_insert
  on public.agency_families
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_families_update on public.agency_families;
create policy agency_families_update
  on public.agency_families
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_families_delete on public.agency_families;
create policy agency_families_delete
  on public.agency_families
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_interaction_types_insert on public.agency_interaction_types;
create policy agency_interaction_types_insert
  on public.agency_interaction_types
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_interaction_types_update on public.agency_interaction_types;
create policy agency_interaction_types_update
  on public.agency_interaction_types
  for update
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  )
  with check (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

drop policy if exists agency_interaction_types_delete on public.agency_interaction_types;
create policy agency_interaction_types_delete
  on public.agency_interaction_types
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or public.has_agency_role(agency_id, array['agency_admin']::public.user_role[])
  );

grant select, insert, update, delete on table public.app_settings to authenticated;
grant select, insert, update, delete on table public.agency_settings to authenticated;
grant select on table public.reference_departments to authenticated;
grant select, insert, update, delete on table public.agency_statuses to authenticated;
grant select, insert, update, delete on table public.agency_services to authenticated;
grant select, insert, update, delete on table public.agency_entities to authenticated;
grant select, insert, update, delete on table public.agency_families to authenticated;
grant select, insert, update, delete on table public.agency_interaction_types to authenticated;
