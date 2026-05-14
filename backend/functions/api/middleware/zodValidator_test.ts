import { assertEquals } from 'std/assert';
import { Hono } from '@hono/hono';
import { z } from 'zod/v4';

import { handleError } from './errorHandler.ts';
import { zValidator } from './zodValidator.ts';

const app = new Hono();
const schema = z.strictObject({
  name: z.string().min(1)
});

app.post('/validate', zValidator('json', schema), (c) => {
  const payload = c.req.valid('json');
  return c.json({ ok: true, name: payload.name });
});

app.onError((error, c) => handleError(error, c));

Deno.test('zValidator accepts valid payload', async () => {
  const response = await app.request('/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Alice' })
  });

  const json = await response.json();
  assertEquals(response.status, 200);
  assertEquals(json.ok, true);
  assertEquals(json.name, 'Alice');
});

Deno.test('zValidator rejects invalid payload type', async () => {
  const response = await app.request('/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 42 })
  });

  const json = await response.json();
  assertEquals(response.status, 400);
  assertEquals(json.code, 'INVALID_PAYLOAD');
  assertEquals(typeof json.details === 'string', true);
});

Deno.test('zValidator rejects payload with missing required field', async () => {
  const response = await app.request('/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  const json = await response.json();
  assertEquals(response.status, 400);
  assertEquals(json.code, 'INVALID_PAYLOAD');
  assertEquals(typeof json.details === 'string', true);
});
