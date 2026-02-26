export const getSupabaseDbUrl = (): string => {
  return (Deno.env.get('SUPABASE_DB_URL') ?? '').trim();
};

