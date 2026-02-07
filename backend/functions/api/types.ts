import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import type { Database } from '../../../shared/supabase.types.ts';

export type DbClient = SupabaseClient<Database>;

export type AppEnv = {
  Variables: {
    requestId: string;
    callerId?: string;
    db?: DbClient;
  };
};
