do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('private.resolve_ai_feature_access(text,uuid,uuid)'::regprocedure)
  into function_definition;
  function_definition := replace(
    function_definition,
    'pg_catalog.coalesce(caller_role, '''')',
    'coalesce(caller_role, '''')'
  );
  execute function_definition;
end;
$$;
