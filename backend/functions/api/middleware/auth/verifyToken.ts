import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from 'jose';

import { assertSupabaseConfig, type SupabaseConfig } from './dbClients.ts';

export type AuthIdentity = {
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

const getAudienceCacheKey = (audience: string | string[]): string =>
  Array.isArray(audience) ? audience.join(',') : audience;

let supabaseAuthGateway: AuthGateway | null = null;
let supabaseAuthGatewayKey = '';
let jwksResolver: JWTVerifyGetKey | null = null;
let jwksResolverUrl = '';
let jwksResolverCreatedAt = 0;

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

export const getBearerToken = (header: string | null | undefined): string => {
  if (!header) return '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
};

export const getAccessTokenFromHeaders = (
  authHeader: string | null | undefined
): string => getBearerToken(authHeader);

export const verifyAccessToken = (token: string): Promise<AuthIdentity | null> => {
  return getSupabaseAuthGateway().verifyAccessToken(token);
};

export const resetVerifyTokenCachesForTests = (): void => {
  supabaseAuthGateway = null;
  supabaseAuthGatewayKey = '';
  jwksResolver = null;
  jwksResolverUrl = '';
  jwksResolverCreatedAt = 0;
};
