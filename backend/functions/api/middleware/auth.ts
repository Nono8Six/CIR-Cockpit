import { createClient } from '@supabase/supabase-js';
import type { MiddlewareHandler } from '@hono/hono';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { Database } from '../../../../shared/supabase.types.ts';
import type { AppEnv, AuthContext, DbClient } from '../types.ts';
import { httpError } from './errorHandler.ts';

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  supabaseJwksUrl: string;
  jwtIssuer: string;
  jwtAudience: string | string[];
  jwtAllowedAlgorithms: string[];
  jwksCacheTtlMs: number;
};

type AuthIdentity = {
  userId: string;
};

type AuthGateway = {
  verifyAccessToken: (token: string) => Promise<AuthIdentity | null>;
};

type JwtGatewayDependencies = {
  getKeyResolver: () => JWTVerifyGetKey;
  issuer: string;
  audience: string | string[];
  allowedAlgorithms: readonly string[];
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

const assertSupabaseConfig = (): SupabaseConfig => {
  const config = getSupabaseConfig();
  if (
    !config.supabaseUrl
    || !config.supabaseServiceRoleKey
    || !config.supabaseAnonKey
    || !config.supabaseJwksUrl
    || !config.jwtIssuer
  ) {
    throw httpError(
      500,
      'CONFIG_MISSING',
      'Configuration Supabase manquante.'
    );
  }
  return config;
};

let supabaseAdmin: DbClient | null = null;
let supabaseAdminKey = '';
let supabaseAuthGateway: AuthGateway | null = null;
let supabaseAuthGatewayKey = '';
let jwksResolver: JWTVerifyGetKey | null = null;
let jwksResolverUrl = '';
let jwksResolverCreatedAt = 0;

const getAudienceCacheKey = (audience: string | string[]): string => {
  return Array.isArray(audience) ? audience.join(',') : audience;
};

const toUniqueAgencyIds = (rows: Array<{ agency_id: string }>): string[] => {
  const unique = new Set<string>();
  for (const row of rows) {
    const agencyId = row.agency_id.trim();
    if (agencyId) {
      unique.add(agencyId);
    }
  }
  return [...unique];
};

type ProfileAuthState = {
  role: AuthContext['role'] | null;
  archived_at: string | null;
  is_system: boolean;
};

type MembershipLookupRow = {
  agency_id: string | null;
};

type ProfileLookupRow = ProfileAuthState & {
  agency_members?: MembershipLookupRow[] | null;
};

export const isProfileAccessRevoked = (profile: ProfileAuthState): boolean =>
  Boolean(profile.archived_at) || profile.is_system;

const resolveAuthContext = async (
  db: DbClient,
  userId: string
): Promise<AuthContext> => {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role, archived_at, is_system, agency_members(agency_id)')
    .eq('id', userId)
    .single<ProfileLookupRow>();

  if (profileError) {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }
  if (!profile?.role) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
  if (isProfileAccessRevoked(profile)) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  if (profile.role === 'super_admin') {
    return {
      userId,
      role: profile.role,
      agencyIds: [],
      isSuperAdmin: true
    };
  }

  const memberships = Array.isArray(profile.agency_members)
    ? profile.agency_members
      .filter((membership): membership is { agency_id: string } => typeof membership.agency_id === 'string')
    : [];

  return {
    userId,
    role: profile.role,
    agencyIds: toUniqueAgencyIds(memberships ?? []),
    isSuperAdmin: false
  };
};

export const getSupabaseAdmin = (): DbClient => {
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

export const createUserScopedClient = (accessToken: string): DbClient => {
  const config = assertSupabaseConfig();
  const normalizedToken = accessToken.trim();
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${normalizedToken}`
      }
    }
  });
};

const getJwksResolver = (config: SupabaseConfig): JWTVerifyGetKey => {
  const now = Date.now();
  const hasFreshResolver = jwksResolver
    && jwksResolverUrl === config.supabaseJwksUrl
    && (now - jwksResolverCreatedAt) < config.jwksCacheTtlMs;

  if (hasFreshResolver && jwksResolver) {
    return jwksResolver;
  }

  jwksResolver = createRemoteJWKSet(new URL(config.supabaseJwksUrl));
  jwksResolverUrl = config.supabaseJwksUrl;
  jwksResolverCreatedAt = now;
  return jwksResolver;
};

export const createJwtAuthGateway = (dependencies: JwtGatewayDependencies): AuthGateway => {
  return {
    async verifyAccessToken(token: string): Promise<AuthIdentity | null> {
      const trimmedToken = token.trim();
      if (!trimmedToken) return null;

      const allowedAlgorithms = new Set(dependencies.allowedAlgorithms);

      try {
        const protectedHeader = decodeProtectedHeader(trimmedToken);
        const algorithm = typeof protectedHeader.alg === 'string' ? protectedHeader.alg : '';
        const keyId = typeof protectedHeader.kid === 'string' ? protectedHeader.kid.trim() : '';

        if (!algorithm || !allowedAlgorithms.has(algorithm) || !keyId) {
          return null;
        }

        const { payload } = await jwtVerify(trimmedToken, dependencies.getKeyResolver(), {
          issuer: dependencies.issuer,
          audience: dependencies.audience
        });

        const userId = typeof payload.sub === 'string' ? payload.sub.trim() : '';
        if (!userId) {
          return null;
        }

        return { userId };
      } catch {
        return null;
      }
    }
  };
};

const createSupabaseAuthGateway = (config: SupabaseConfig): AuthGateway => {
  return createJwtAuthGateway({
    getKeyResolver: () => getJwksResolver(config),
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    allowedAlgorithms: config.jwtAllowedAlgorithms
  });
};

const getSupabaseAuthGateway = (): AuthGateway => {
  const config = assertSupabaseConfig();
  const nextKey = [
    config.supabaseJwksUrl,
    config.jwtIssuer,
    getAudienceCacheKey(config.jwtAudience),
    config.jwtAllowedAlgorithms.join(','),
    String(config.jwksCacheTtlMs)
  ].join('|');

  if (!supabaseAuthGateway || supabaseAuthGatewayKey !== nextKey) {
    supabaseAuthGateway = createSupabaseAuthGateway(config);
    supabaseAuthGatewayKey = nextKey;
  }
  return supabaseAuthGateway;
};

export const resetAuthCachesForTests = (): void => {
  supabaseAdmin = null;
  supabaseAdminKey = '';
  supabaseAuthGateway = null;
  supabaseAuthGatewayKey = '';
  jwksResolver = null;
  jwksResolverUrl = '';
  jwksResolverCreatedAt = 0;
};

export const getBearerToken = (header: string | null | undefined): string => {
  if (!header) return '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
};

export const getAccessTokenFromHeaders = (
  authHeader: string | null | undefined
): string => {
  return getBearerToken(authHeader);
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  if (!token) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await getSupabaseAuthGateway().verifyAccessToken(token);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  const db = getSupabaseAdmin();
  const userDb = createUserScopedClient(token);
  const authContext = await resolveAuthContext(db, identity.userId);

  c.set('callerId', authContext.userId);
  c.set('authContext', authContext);
  c.set('db', db);
  c.set('userDb', userDb);
  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  if (!token) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await getSupabaseAuthGateway().verifyAccessToken(token);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  const db = getSupabaseAdmin();
  const authContext = await resolveAuthContext(db, identity.userId);
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  c.set('callerId', authContext.userId);
  c.set('authContext', authContext);
  c.set('db', db);
  await next();
};
