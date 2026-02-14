import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { getAccessTokenFromHeaders, getBearerToken } from './auth.ts';

Deno.test('getBearerToken returns empty string when header is missing', () => {
  assertEquals(getBearerToken(null), '');
});

Deno.test('getBearerToken extracts bearer token case-insensitively', () => {
  assertEquals(getBearerToken('Bearer abc123'), 'abc123');
  assertEquals(getBearerToken('bearer xyz'), 'xyz');
});

Deno.test('getBearerToken returns empty when scheme is invalid', () => {
  assertEquals(getBearerToken('Token abc123'), '');
});

Deno.test('getAccessTokenFromHeaders prioritizes x-client-authorization', () => {
  assertEquals(
    getAccessTokenFromHeaders('Bearer gatewayToken', 'Bearer userToken'),
    'userToken'
  );
});

Deno.test('getAccessTokenFromHeaders falls back to Authorization', () => {
  assertEquals(
    getAccessTokenFromHeaders('Bearer userToken', null),
    'userToken'
  );
});
