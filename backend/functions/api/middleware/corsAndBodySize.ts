import type { MiddlewareHandler } from '@hono/hono';

import type { AppEnv } from '../types.ts';
import { httpError } from './errorHandler.ts';

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

export const corsAndBodySize: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, getAllowedOrigins());
  const responseHeaders = buildResponseHeaders(allowedOrigin);
  for (const [key, value] of Object.entries(responseHeaders)) {
    c.header(key, value);
  }

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
    throw httpError(413, 'PAYLOAD_TOO_LARGE', 'Payload trop volumineux.');
  }

  if (c.req.method === 'OPTIONS') {
    return c.text('ok', 200, responseHeaders);
  }

  await next();
};
