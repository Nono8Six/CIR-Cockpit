import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import type { MiddlewareHandler } from 'https://deno.land/x/hono@4.6.10/mod.ts';

import type { Database } from '../../../../shared/supabase.types.ts';
import type { AppEnv, DbClient } from '../types.ts';
import { httpError } from './errorHandler.ts';

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const getSupabaseConfig = (): SupabaseConfig => ({
  supabaseUrl: SUPABASE_URL,
  supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: SUPABASE_ANON_KEY
});

const assertSupabaseConfig = (): SupabaseConfig => {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey || !config.supabaseAnonKey) {
    throw httpError(
      500,
      'CONFIG_MISSING',
      'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY'
    );
  }
  return config;
};

let supabaseAdmin: DbClient | null = null;

export const getSupabaseAdmin = (): DbClient => {
  const config = assertSupabaseConfig();
  if (!supabaseAdmin) {
    supabaseAdmin = createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseAdmin;
};

export const createUserClient = (token: string): DbClient => {
  const config = assertSupabaseConfig();
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

const getBearerToken = (header: string | null): string => {
  if (!header) return '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getBearerToken(c.req.header('Authorization'));
  if (!token) {
    throw httpError(403, 'AUTH_REQUIRED', 'Authorization required');
  }

  const supabaseUser = createUserClient(token);
  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data?.user) {
    throw httpError(403, 'AUTH_REQUIRED', 'Authorization required');
  }

  const { data: profile, error: profileError } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || profile?.role !== 'super_admin') {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Forbidden');
  }

  c.set('callerId', data.user.id);
  c.set('db', supabaseUser);
  await next();
};
