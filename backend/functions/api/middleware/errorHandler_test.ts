import { assertEquals, assertMatch, assert } from 'std/assert';

import { handleError, httpError } from './errorHandler.ts';
import { getErrorCatalogEntry } from '../../../../shared/errors/catalog.ts';
import { edgeErrorPayloadSchema } from '../../../../shared/schemas/edge-error.schema.ts';

type ContextLike = {
  get: (key: string) => string | undefined;
  json: (body: Record<string, unknown>, status?: number) => Response;
};

const makeContext = (requestId?: string): ContextLike =>
  ({
    get: (key: string) => (key === 'requestId' ? requestId : undefined),
    json: (body: Record<string, unknown>, status?: number) =>
      new Response(JSON.stringify(body), {
        status: status ?? 200,
        headers: { 'content-type': 'application/json' }
      })
  } as ContextLike);

Deno.test('handleError uses catalog message when code is known', async () => {
  const ctx = makeContext('req-1');
  const err = httpError(400, 'INVALID_JSON', 'Invalid JSON body', 'bad_json');
  const response = handleError(err, ctx) as Response;
  const result = (await response.json()) as Record<string, unknown>;
  const catalog = getErrorCatalogEntry('INVALID_JSON');
  assertEquals(response.status, 400);
  assertEquals(result.ok, false);
  assertEquals(result.code, 'INVALID_JSON');
  assertEquals(result.error, catalog?.message);
  assertEquals(result.details, 'bad_json');
  assertEquals(result.request_id, 'req-1');
  const parsed = edgeErrorPayloadSchema.safeParse(result);
  assertEquals(parsed.success, true);
});

Deno.test('handleError falls back to catalog REQUEST_FAILED for unknown errors', async () => {
  const ctx = makeContext('req-2');
  const err = new Error('boom');
  const response = handleError(err, ctx) as Response;
  const result = (await response.json()) as Record<string, unknown>;
  const catalog = getErrorCatalogEntry('REQUEST_FAILED');
  assertEquals(response.status, 500);
  assertEquals(result.ok, false);
  assertEquals(result.code, 'REQUEST_FAILED');
  assertEquals(result.error, catalog?.message);
  assertEquals(result.request_id, 'req-2');
});

Deno.test('handleError generates request_id when absent', async () => {
  const ctx = makeContext();
  const err = httpError(403, 'AUTH_FORBIDDEN', 'Forbidden');
  const response = handleError(err, ctx) as Response;
  const result = (await response.json()) as Record<string, unknown>;
  assertEquals(response.status, 403);
  assertEquals(result.code, 'AUTH_FORBIDDEN');
  assert(result.request_id);
  assertMatch(String(result.request_id), /^[0-9a-fA-F-]{36}$/);
});

Deno.test('app.notFound returns JSON payload with CORS headers', async () => {
  const previousOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN');
  try {
    Deno.env.set('CORS_ALLOWED_ORIGIN', 'https://app.cir.test');
    const appModule = await import('../app.ts');
    const response = await appModule.default.request('/unknown-route', {
      method: 'POST',
      headers: {
        origin: 'https://app.cir.test',
        'content-type': 'application/json'
      },
      body: '{}'
    });

    const payload = (await response.json()) as Record<string, unknown>;
    assertEquals(response.status, 404);
    assertEquals(payload.code, 'NOT_FOUND');
    assertEquals(response.headers.get('access-control-allow-origin'), 'https://app.cir.test');
  } finally {
    if (previousOrigin === undefined) {
      Deno.env.delete('CORS_ALLOWED_ORIGIN');
    } else {
      Deno.env.set('CORS_ALLOWED_ORIGIN', previousOrigin);
    }
  }
});

Deno.test('OPTIONS request returns CORS headers for allowed origin', async () => {
  const previousOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN');
  try {
    Deno.env.set('CORS_ALLOWED_ORIGIN', 'https://app.cir.test');
    const appModule = await import('../app.ts');
    const response = await appModule.default.request('/trpc/data.entities', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://app.cir.test',
        'access-control-request-method': 'POST'
      }
    });

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('access-control-allow-origin'), 'https://app.cir.test');
    assertEquals(response.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    if (previousOrigin === undefined) {
      Deno.env.delete('CORS_ALLOWED_ORIGIN');
    } else {
      Deno.env.set('CORS_ALLOWED_ORIGIN', previousOrigin);
    }
  }
});

Deno.test('POST request rejects oversized payload', async () => {
  const previousOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN');
  try {
    Deno.env.set('CORS_ALLOWED_ORIGIN', 'https://app.cir.test');
    const appModule = await import('../app.ts');
    const response = await appModule.default.request('/trpc/data.entities', {
      method: 'POST',
      headers: {
        origin: 'https://app.cir.test',
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
        'content-length': '1000001'
      },
      body: '{}'
    });

    const payload = (await response.json()) as Record<string, unknown>;
    assertEquals(response.status, 413);
    assertEquals(payload.code, 'PAYLOAD_TOO_LARGE');
    assertEquals(response.headers.get('access-control-allow-origin'), 'https://app.cir.test');
  } finally {
    if (previousOrigin === undefined) {
      Deno.env.delete('CORS_ALLOWED_ORIGIN');
    } else {
      Deno.env.set('CORS_ALLOWED_ORIGIN', previousOrigin);
    }
  }
});

Deno.test('legacy REST routes return NOT_FOUND after consolidation', async () => {
  const previousOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN');
  try {
    Deno.env.set('CORS_ALLOWED_ORIGIN', 'https://app.cir.test');
    const appModule = await import('../app.ts');
    const response = await appModule.default.request('/data/entities', {
      method: 'POST',
      headers: {
        origin: 'https://app.cir.test',
        'content-type': 'application/json'
      },
      body: '{}'
    });

    const payload = (await response.json()) as Record<string, unknown>;
    assertEquals(response.status, 404);
    assertEquals(payload.code, 'NOT_FOUND');
    assertEquals(response.headers.get('access-control-allow-origin'), 'https://app.cir.test');
  } finally {
    if (previousOrigin === undefined) {
      Deno.env.delete('CORS_ALLOWED_ORIGIN');
    } else {
      Deno.env.set('CORS_ALLOWED_ORIGIN', previousOrigin);
    }
  }
});
