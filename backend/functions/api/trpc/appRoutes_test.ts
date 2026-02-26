import { assertEquals, assertMatch } from 'std/assert';

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' ? value : null;
};

const readObject = (record: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const readErrorData = async (response: Response): Promise<Record<string, unknown>> => {
  const payload = (await response.json()) as Record<string, unknown>;
  const error = readObject(payload, 'error');
  const data = error ? readObject(error, 'data') : null;
  if (!data) {
    throw new Error('tRPC error payload invalide.');
  }
  return data;
};

Deno.test('tRPC unknown procedure returns NOT_FOUND with aligned appCode/httpStatus', async () => {
  const appModule = await import('../app.ts');
  const response = await appModule.default.request('/trpc/unknown.path', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });

  const data = await readErrorData(response);
  assertEquals(response.status, 404);
  assertEquals(readString(data, 'code'), 'NOT_FOUND');
  assertEquals(readString(data, 'appCode'), 'NOT_FOUND');
  assertEquals(readNumber(data, 'httpStatus'), 404);
  assertMatch(readString(data, 'requestId') ?? '', /^[0-9a-fA-F-]{36}$/);
});

Deno.test('tRPC routes reject missing Authorization header', async () => {
  const appModule = await import('../app.ts');
  const response = await appModule.default.request('/trpc/data.profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });

  const data = await readErrorData(response);
  assertEquals(response.status, 401);
  assertEquals(readString(data, 'code'), 'UNAUTHORIZED');
  assertEquals(readString(data, 'appCode'), 'AUTH_REQUIRED');
  assertEquals(readNumber(data, 'httpStatus'), 401);
});

Deno.test('tRPC routes ignore x-client-authorization fallback header', async () => {
  const appModule = await import('../app.ts');
  const response = await appModule.default.request('/trpc/data.profile', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-client-authorization': 'Bearer fake-token'
    },
    body: '{}'
  });

  const data = await readErrorData(response);
  assertEquals(response.status, 401);
  assertEquals(readString(data, 'code'), 'UNAUTHORIZED');
  assertEquals(readString(data, 'appCode'), 'AUTH_REQUIRED');
  assertEquals(readNumber(data, 'httpStatus'), 401);
});
