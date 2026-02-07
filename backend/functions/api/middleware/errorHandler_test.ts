import { assertEquals, assertMatch, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleError, httpError } from './errorHandler.ts';
import { getErrorCatalogEntry } from '../../../../shared/errors/catalog.ts';

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
