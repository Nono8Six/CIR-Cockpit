import { assertEquals } from 'std/assert';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK
} from 'jose';

import { createJwtAuthGateway, getAccessTokenFromHeaders, getBearerToken } from './verifyToken.ts';

Deno.test('verifyToken.getBearerToken extracts bearer token case-insensitively', () => {
  assertEquals(getBearerToken('Bearer abc123'), 'abc123');
  assertEquals(getBearerToken('bearer xyz'), 'xyz');
  assertEquals(getBearerToken('Token abc123'), '');
});

Deno.test('verifyToken.getAccessTokenFromHeaders returns bearer token', () => {
  assertEquals(getAccessTokenFromHeaders('Bearer gatewayToken'), 'gatewayToken');
  assertEquals(getAccessTokenFromHeaders(null), '');
});

Deno.test('verifyToken.createJwtAuthGateway verifies a valid token', async () => {
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

Deno.test('verifyToken.createJwtAuthGateway rejects disallowed algorithm', async () => {
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
