-- COUCHE 1.3 - Re-grant minimum privileges for authenticated role.
-- Objective: grant only what is required by existing RLS policies and runtime paths.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
  policy_row RECORD;
  privilege_list TEXT;
BEGIN
  FOR policy_row IN
    WITH policy_matrix AS (
      SELECT
        tablename AS table_name,
        BOOL_OR(cmd IN ('SELECT', 'ALL')) AS can_select,
        BOOL_OR(cmd IN ('INSERT', 'ALL')) AS can_insert,
        BOOL_OR(cmd IN ('UPDATE', 'ALL')) AS can_update,
        BOOL_OR(cmd IN ('DELETE', 'ALL')) AS can_delete
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          roles IS NULL
          OR array_position(roles, 'authenticated'::name) IS NOT NULL
          OR array_position(roles, 'public'::name) IS NOT NULL
        )
      GROUP BY tablename
    )
    SELECT
      table_name,
      can_select,
      can_insert,
      can_update,
      can_delete
    FROM policy_matrix
    ORDER BY table_name
  LOOP
    privilege_list := concat_ws(
      ', ',
      CASE WHEN policy_row.can_select THEN 'SELECT' END,
      CASE WHEN policy_row.can_insert THEN 'INSERT' END,
      CASE WHEN policy_row.can_update THEN 'UPDATE' END,
      CASE WHEN policy_row.can_delete THEN 'DELETE' END
    );

    IF privilege_list IS NOT NULL AND privilege_list <> '' THEN
      EXECUTE format(
        'GRANT %s ON TABLE public.%I TO authenticated',
        privilege_list,
        policy_row.table_name
      );
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  sequence_row RECORD;
BEGIN
  FOR sequence_row IN
    WITH insertable_tables AS (
      SELECT DISTINCT tablename AS table_name
      FROM pg_policies
      WHERE schemaname = 'public'
        AND cmd IN ('INSERT', 'ALL')
        AND (
          roles IS NULL
          OR array_position(roles, 'authenticated'::name) IS NOT NULL
          OR array_position(roles, 'public'::name) IS NOT NULL
        )
    )
    SELECT DISTINCT
      seq_ns.nspname AS sequence_schema,
      seq.relname AS sequence_name
    FROM pg_class seq
    JOIN pg_namespace seq_ns ON seq_ns.oid = seq.relnamespace
    JOIN pg_depend dep
      ON dep.objid = seq.oid
     AND dep.classid = 'pg_class'::regclass
     AND dep.refclassid = 'pg_class'::regclass
     AND dep.deptype IN ('a', 'n')
    JOIN pg_class tab ON tab.oid = dep.refobjid
    JOIN pg_namespace tab_ns ON tab_ns.oid = tab.relnamespace
    JOIN insertable_tables it ON it.table_name = tab.relname
    WHERE seq.relkind = 'S'
      AND seq_ns.nspname = 'public'
      AND tab_ns.nspname = 'public'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO authenticated',
      sequence_row.sequence_schema,
      sequence_row.sequence_name
    );
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_agency_role(uuid, public.user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
