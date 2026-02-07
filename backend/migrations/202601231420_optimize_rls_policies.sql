-- Optimize RLS policies by caching auth.uid() via SELECT
-- See Supabase RLS performance recommendations.

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (id = (select auth.uid()))
);

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR (id = (select auth.uid()))
)
WITH CHECK (
  is_super_admin()
  OR (
    (id = (select auth.uid()))
    AND (is_super_admin = false)
    AND (
      email = (
        select p.email
        from public.profiles p
        where p.id = (select auth.uid())
      )
    )
    AND (
      created_at = (
        select p.created_at
        from public.profiles p
        where p.id = (select auth.uid())
      )
    )
    AND ((active_agency_id IS NULL) OR is_member(active_agency_id))
    AND (must_change_password OR (password_changed_at IS NOT NULL))
  )
);

DROP POLICY IF EXISTS interactions_insert ON public.interactions;
CREATE POLICY interactions_insert
ON public.interactions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (is_member(agency_id) AND (created_by = (select auth.uid())))
);
