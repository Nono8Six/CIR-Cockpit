import { assertEquals } from 'std/assert';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK
} from 'jose';

import {
  createJwtAuthGateway,
  getAccessTokenFromHeaders,
  getBearerToken,
  isProfileAccessRevoked
} from './auth.ts';

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

Deno.test('getAccessTokenFromHeaders prioritizes Authorization', () => {
  assertEquals(
    getAccessTokenFromHeaders('Bearer gatewayToken'),
    'gatewayToken'
  );
});

Deno.test('getAccessTokenFromHeaders returns empty when Authorization is missing', () => {
  assertEquals(getAccessTokenFromHeaders(null), '');
});

Deno.test('isProfileAccessRevoked returns true for archived profiles', () => {
  assertEquals(
    isProfileAccessRevoked({ role: 'tcs', archived_at: '2026-02-16T00:00:00.000Z', is_system: false }),
    true
  );
});

Deno.test('isProfileAccessRevoked returns true for system profiles', () => {
  assertEquals(
    isProfileAccessRevoked({ role: 'tcs', archived_at: null, is_system: true }),
    true
  );
});

Deno.test('createJwtAuthGateway verifies a valid token and extracts sub', async () => {
  const issuer = 'https://example.supabase.co/auth/v1';
  const audience = 'authenticated';
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey) as JWK;
  publicJwk.kid = 'k1';
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  const gateway = createJwtAuthGateway({
    getKeyResolver: () => createLocalJWKSet({ keys: [publicJwk] }),
    issuer,
    audience,
    allowedAlgorithms: ['ES256']
  });

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject('f22aab2e-c4f0-473a-9524-a1b98c815f95')
    .setExpirationTime('2h')
    .sign(privateKey);

  const identity = await gateway.verifyAccessToken(token);
  assertEquals(identity?.userId, 'f22aab2e-c4f0-473a-9524-a1b98c815f95');
});

Deno.test('createJwtAuthGateway rejects invalid issuer', async () => {
  const issuer = 'https://example.supabase.co/auth/v1';
  const audience = 'authenticated';
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey) as JWK;
  publicJwk.kid = 'k1';
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  const gateway = createJwtAuthGateway({
    getKeyResolver: () => createLocalJWKSet({ keys: [publicJwk] }),
    issuer,
    audience,
    allowedAlgorithms: ['ES256']
  });

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer('https://other.example/auth/v1')
    .setAudience(audience)
    .setSubject('c57f3db4-78bb-41d5-b494-5e35757a9a0c')
    .setExpirationTime('2h')
    .sign(privateKey);

  const identity = await gateway.verifyAccessToken(token);
  assertEquals(identity, null);
});

Deno.test('createJwtAuthGateway rejects disallowed algorithm', async () => {
  const issuer = 'https://example.supabase.co/auth/v1';
  const audience = 'authenticated';
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey) as JWK;
  publicJwk.kid = 'k1';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const gateway = createJwtAuthGateway({
    getKeyResolver: () => createLocalJWKSet({ keys: [publicJwk] }),
    issuer,
    audience,
    allowedAlgorithms: ['ES256']
  });

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject('85f65f8d-2f6e-4f9f-a03c-646130480a72')
    .setExpirationTime('2h')
    .sign(privateKey);

  const identity = await gateway.verifyAccessToken(token);
  assertEquals(identity, null);
});
