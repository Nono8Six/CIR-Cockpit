import type { MiddlewareHandler } from '@hono/hono';

import { getDbClient } from '../../../drizzle/index.ts';
import type { AppEnv, AuthContext, DbClient } from '../types.ts';
import { httpError } from './errorHandler.ts';
import { getSupabaseAdmin, resetSupabaseAdminCacheForTests } from './auth/dbClients.ts';
import { isProfileAccessRevoked, resolveAuthContext } from './auth/buildAuthContext.ts';
import {
  createJwtAuthGateway,
  getAccessTokenFromHeaders,
  getBearerToken,
  resetVerifyTokenCachesForTests,
  verifyAccessToken
} from './auth/verifyToken.ts';

type AuthenticatedRequestContext = {
  callerId: string;
  authContext: AuthContext;
  db: DbClient;
  userDb: DbClient;
};

type SuperAdminRequestContext = {
  callerId: string;
  authContext: AuthContext;
  db: DbClient;
};

export const authenticateAccessToken = async (token: string): Promise<AuthenticatedRequestContext> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await verifyAccessToken(normalizedToken);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const authContext = await resolveAuthContext(supabaseAdmin, identity.userId);
  const db = getDbClient();
  if (!db) {
    throw httpError(500, 'CONFIG_MISSING', 'Configuration Supabase manquante.');
  }

  return {
    callerId: authContext.userId,
    authContext,
    db,
    userDb: db
  };
};

export const authenticateSuperAdminAccessToken = async (token: string): Promise<SuperAdminRequestContext> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw httpError(401, 'AUTH_REQUIRED', 'Authentification requise.');
  }

  const identity = await verifyAccessToken(normalizedToken);
  if (!identity) {
    throw httpError(401, 'AUTH_REQUIRED', 'Session invalide.');
  }

  const supabaseAdmin = getSupabaseAdmin();
  const authContext = await resolveAuthContext(supabaseAdmin, identity.userId);
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  const db = getDbClient();
  if (!db) {
    throw httpError(500, 'CONFIG_MISSING', 'Configuration Supabase manquante.');
  }

  return {
    callerId: authContext.userId,
    authContext,
    db
  };
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  const authenticatedContext = await authenticateAccessToken(token);

  c.set('callerId', authenticatedContext.callerId);
  c.set('authContext', authenticatedContext.authContext);
  c.set('db', authenticatedContext.db);
  c.set('userDb', authenticatedContext.userDb);
  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  const authenticatedContext = await authenticateSuperAdminAccessToken(token);

  c.set('callerId', authenticatedContext.callerId);
  c.set('authContext', authenticatedContext.authContext);
  c.set('db', authenticatedContext.db);
  await next();
};

export const resetAuthCachesForTests = (): void => {
  resetSupabaseAdminCacheForTests();
  resetVerifyTokenCachesForTests();
};

export {
  createJwtAuthGateway,
  getAccessTokenFromHeaders,
  getBearerToken,
  getSupabaseAdmin,
  isProfileAccessRevoked,
  resolveAuthContext
};
