import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/supabase.types.ts';

export type DbClient = SupabaseClient<Database>;

export type AppEnv = {
  Variables: {
    requestId: string;
    callerId?: string;
    db?: DbClient;
  };
};
