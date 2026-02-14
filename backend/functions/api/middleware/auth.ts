import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import type { MiddlewareHandler } from 'jsr:@hono/hono';

import type { Database } from '../../../../shared/supabase.types.ts';
import type { AppEnv, DbClient } from '../types.ts';
import { httpError } from './errorHandler.ts';

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
};

type AuthIdentity = {
  userId: string;
};

type AuthGateway = {
  verifyAccessToken: (token: string) => Promise<AuthIdentity | null>;
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
let supabaseAuthGateway: AuthGateway | null = null;

export const getSupabaseAdmin = (): DbClient => {
  const config = assertSupabaseConfig();
  if (!supabaseAdmin) {
    supabaseAdmin = createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseAdmin;
};

const createAuthClient = (): DbClient => {
  const config = assertSupabaseConfig();
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
};

const createSupabaseAuthGateway = (): AuthGateway => {
  const client = createAuthClient();
  return {
    async verifyAccessToken(token: string): Promise<AuthIdentity | null> {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return { userId: data.user.id };
    }
  };
};

const getSupabaseAuthGateway = (): AuthGateway => {
  if (!supabaseAuthGateway) {
    supabaseAuthGateway = createSupabaseAuthGateway();
  }
  return supabaseAuthGateway;
};

export const getBearerToken = (header: string | null): string => {
  if (!header) return '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
};

export const getAccessTokenFromHeaders = (
  authHeader: string | null,
  clientAuthHeader: string | null
): string => {
  const clientToken = getBearerToken(clientAuthHeader);
  if (clientToken) {
    return clientToken;
  }
  return getBearerToken(authHeader);
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(
    c.req.header('Authorization'),
    c.req.header('x-client-authorization')
  );
  if (!token) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await getSupabaseAuthGateway().verifyAccessToken(token);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  c.set('callerId', identity.userId);
  c.set('db', getSupabaseAdmin());
  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(
    c.req.header('Authorization'),
    c.req.header('x-client-authorization')
  );
  if (!token) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await getSupabaseAuthGateway().verifyAccessToken(token);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  const db = getSupabaseAdmin();
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role')
    .eq('id', identity.userId)
    .single();

  if (profileError || profile?.role !== 'super_admin') {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  c.set('callerId', identity.userId);
  c.set('db', db);
  await next();
};
