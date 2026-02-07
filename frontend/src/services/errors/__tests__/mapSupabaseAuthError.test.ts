import { describe, expect, it } from 'vitest';
import type { AuthError } from '@supabase/supabase-js';

import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

const makeAuthError = (overrides: Partial<AuthError>): AuthError =>
  ({
    name: 'AuthError',
    message: 'Auth failed',
    status: 400,
    ...overrides
  }) as AuthError;

describe('mapSupabaseAuthError', () => {
  it('maps known auth codes', () => {
    const error = makeAuthError({ code: 'invalid_credentials' });
    const result = mapSupabaseAuthError(error);
    expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('maps 401/403 to AUTH_FORBIDDEN', () => {
    const error = makeAuthError({ status: 401 });
    const result = mapSupabaseAuthError(error);
    expect(result.code).toBe('AUTH_FORBIDDEN');
  });

  it('falls back to AUTH_ERROR', () => {
    const error = makeAuthError({ code: 'unknown_code', status: 500 });
    const result = mapSupabaseAuthError(error, 'fallback');
    expect(result.code).toBe('AUTH_ERROR');
    expect(result.message).toBe('fallback');
  });
});
