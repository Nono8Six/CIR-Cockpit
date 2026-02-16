import { Hono } from '@hono/hono';

import type { AppEnv } from './types.ts';
import { handleError, httpError } from './middleware/errorHandler.ts';
import { requestId } from './middleware/requestId.ts';
import { registerAdminAgenciesRoutes } from './routes/adminAgencies.ts';
import { registerAdminUsersRoutes } from './routes/adminUsers.ts';
import { registerDataConfigRoutes } from './routes/dataConfig.ts';
import { registerDataEntitiesRoutes } from './routes/dataEntities.ts';
import { registerDataEntityContactsRoutes } from './routes/dataEntityContacts.ts';
import { registerDataInteractionsRoutes } from './routes/dataInteractions.ts';
import { registerDataProfileRoutes } from './routes/dataProfile.ts';

const BASE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id'
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
const MAX_REQUEST_BODY_BYTES = 1_000_000;

const parseAllowedOrigins = (rawValue: string | undefined): string[] =>
  (rawValue ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const getAllowedOrigins = (): string[] => {
  const configuredOrigins = parseAllowedOrigins(Deno.env.get('CORS_ALLOWED_ORIGIN') ?? undefined);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  const environment = (Deno.env.get('DENO_ENV') ?? '').trim().toLowerCase();
  return environment === 'production' ? [] : ['*'];
};

const resolveAllowedOrigin = (origin: string | undefined, allowedOrigins: readonly string[]): string => {
  if (allowedOrigins.includes('*')) {
    return '*';
  }
  if (!origin) {
    return '';
  }
  return allowedOrigins.includes(origin) ? origin : '';
};

const buildResponseHeaders = (allowedOrigin: string): Record<string, string> => {
  const headers: Record<string, string> = {
    ...BASE_CORS_HEADERS,
    ...SECURITY_HEADERS,
    Vary: 'Origin'
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return headers;
};

const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, getAllowedOrigins());
  const contentLengthHeader = c.req.header('Content-Length');
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : null;

  if (requestOrigin && !allowedOrigin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Origine non autorisee.');
  }
  if (
    c.req.method === 'POST'
    && contentLength !== null
    && Number.isFinite(contentLength)
    && contentLength > MAX_REQUEST_BODY_BYTES
  ) {
    throw httpError(413, 'INVALID_PAYLOAD', 'Payload trop volumineux.');
  }

  if (c.req.method === 'OPTIONS') {
    return c.text('ok', 200, buildResponseHeaders(allowedOrigin));
  }

  await next();
  for (const [key, value] of Object.entries(buildResponseHeaders(allowedOrigin))) {
    c.header(key, value);
  }
});

app.onError((err, c) => handleError(err, c));
app.notFound((c) => handleError(httpError(404, 'NOT_FOUND', 'Ressource introuvable.'), c));

registerAdminUsersRoutes(app);
registerAdminAgenciesRoutes(app);
registerDataEntitiesRoutes(app);
registerDataEntityContactsRoutes(app);
registerDataInteractionsRoutes(app);
registerDataConfigRoutes(app);
registerDataProfileRoutes(app);

export type AppType = typeof app;
export default app;
