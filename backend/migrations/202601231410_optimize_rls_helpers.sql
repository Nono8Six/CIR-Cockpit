-- Optimize RLS helper functions (performance + security)
-- Use STABLE volatility and cached auth.uid() (select auth.uid()).
-- Enforce empty search_path and schema-qualify all references.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  select coalesce(
    (select p.is_super_admin
     from public.profiles p
     where p.id = (select auth.uid())),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(target_agency_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  select exists (
    select 1
    from public.agency_members m
    where m.agency_id = target_agency_id
      and m.user_id = (select auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.has_agency_role(
  target_agency_id uuid,
  roles user_role[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  select exists (
    select 1
    from public.agency_members m
    where m.agency_id = target_agency_id
      and m.user_id = (select auth.uid())
      and m.role = any(roles)
  );
$$;
