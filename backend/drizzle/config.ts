// DATABASE_URL must point to the Supavisor transaction pooler (port 6543),
// not the direct connection (port 5432). The pooler multiplexes many client
// connections to a small pool of DB connections, which is required for
// serverless workloads where each Edge Function isolate opens its own client.
// Format: postgresql://postgres.<project_ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres
//
// The auto-injected SUPABASE_DB_URL points to the direct connection and would
// saturate max_connections under burst load — do not use it.
export const getSupabaseDbUrl = (): string => {
  return (Deno.env.get('DATABASE_URL') ?? '').trim();
};

