import type { MiddlewareHandler } from 'hono';

import type { AppEnv, AuthContext } from '../../types.ts';
import { httpError } from '../errorHandler.ts';
import { getSupabaseAdmin, resetSupabaseAdminCacheForTests } from './dbClients.ts';
import { isProfileAccessRevoked, resolveAuthContext } from './buildAuthContext.ts';
import {
  createJwtAuthGateway,
  getAccessTokenFromHeaders,
  getBearerToken,
  resetVerifyTokenCachesForTests,
  verifyAccessToken
} from './verifyToken.ts';

type AuthenticatedRequestContext = {
  callerId: string;
  authContext: AuthContext;
};

type SuperAdminRequestContext = {
  callerId: string;
  authContext: AuthContext;
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
  return {
    callerId: authContext.userId,
    authContext
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

  return {
    callerId: authContext.userId,
    authContext
  };
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  const authenticatedContext = await authenticateAccessToken(token);

  c.set('callerId', authenticatedContext.callerId);
  c.set('authContext', authenticatedContext.authContext);
  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getAccessTokenFromHeaders(c.req.header('Authorization'));
  const authenticatedContext = await authenticateSuperAdminAccessToken(token);

  c.set('callerId', authenticatedContext.callerId);
  c.set('authContext', authenticatedContext.authContext);
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
