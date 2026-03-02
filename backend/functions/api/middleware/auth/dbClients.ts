import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../../../shared/supabase.types.ts';
import type { SupabaseDbClient } from '../../types.ts';
import { httpError } from '../errorHandler.ts';

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  supabaseJwksUrl: string;
  jwtIssuer: string;
  jwtAudience: string | string[];
  jwtAllowedAlgorithms: string[];
  jwksCacheTtlMs: number;
};

const DEFAULT_AUDIENCE = 'authenticated';
const DEFAULT_ALLOWED_ALGORITHM = 'ES256';
const DEFAULT_JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const toList = (value: string | undefined, fallback: string[]): string[] => {
  const parsed = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
};

const parseAudience = (value: string | undefined): string | string[] => {
  const parsed = toList(value, [DEFAULT_AUDIENCE]);
  return parsed.length === 1 ? parsed[0] : parsed;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const getSupabaseConfig = (): SupabaseConfig => {
  const rawUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const baseUrl = normalizeBaseUrl(rawUrl);
  const jwtIssuerDefault = baseUrl ? `${baseUrl}/auth/v1` : '';
  const jwksUrlDefault = baseUrl ? `${baseUrl}/auth/v1/.well-known/jwks.json` : '';

  return {
    supabaseUrl: baseUrl,
    supabaseServiceRoleKey: (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim(),
    supabaseAnonKey: (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim(),
    supabaseJwksUrl: (Deno.env.get('SUPABASE_JWKS_URL') ?? jwksUrlDefault).trim(),
    jwtIssuer: (Deno.env.get('SUPABASE_JWT_ISSUER') ?? jwtIssuerDefault).trim(),
    jwtAudience: parseAudience(Deno.env.get('SUPABASE_JWT_AUDIENCE') ?? undefined),
    jwtAllowedAlgorithms: toList(
      Deno.env.get('SUPABASE_JWT_ALLOWED_ALGS') ?? undefined,
      [DEFAULT_ALLOWED_ALGORITHM]
    ),
    jwksCacheTtlMs: parsePositiveInt(
      Deno.env.get('SUPABASE_JWKS_CACHE_TTL_MS') ?? undefined,
      DEFAULT_JWKS_CACHE_TTL_MS
    )
  };
};

export const assertSupabaseConfig = (): SupabaseConfig => {
  const config = getSupabaseConfig();
  if (
    !config.supabaseUrl
    || !config.supabaseServiceRoleKey
    || !config.supabaseAnonKey
    || !config.supabaseJwksUrl
    || !config.jwtIssuer
  ) {
    throw httpError(500, 'CONFIG_MISSING', 'Configuration Supabase manquante.');
  }
  return config;
};

let supabaseAdmin: SupabaseDbClient | null = null;
let supabaseAdminKey = '';

export const getSupabaseAdmin = (): SupabaseDbClient => {
  const config = assertSupabaseConfig();
  const nextKey = `${config.supabaseUrl}|${config.supabaseServiceRoleKey}`;

  if (!supabaseAdmin || supabaseAdminKey !== nextKey) {
    supabaseAdmin = createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
    supabaseAdminKey = nextKey;
  }

  return supabaseAdmin;
};

export const resetSupabaseAdminCacheForTests = (): void => {
  supabaseAdmin = null;
  supabaseAdminKey = '';
};
