import type { SupabaseClient } from '@supabase/supabase-js';

import type { DbClient as DrizzleDbClient } from '../../drizzle/index.ts';
import type { Database } from '../../../shared/supabase.types.ts';

export type SupabaseDbClient = SupabaseClient<Database>;
export type DbClient = DrizzleDbClient;
export type UserRole = Database['public']['Enums']['user_role'];

export type AuthContext = {
  userId: string;
  role: UserRole;
  agencyIds: string[];
  isSuperAdmin: boolean;
};

export type AppEnv = {
  Variables: {
    requestId: string;
    callerId?: string;
    authContext?: AuthContext;
    db?: DbClient;
    userDb?: DbClient;
  };
};
