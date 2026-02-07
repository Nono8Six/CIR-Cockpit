import { describe, expect, it } from 'vitest';

import { createAppError, isAppError } from '@/services/errors/AppError';

describe('AppError', () => {
  it('createAppError returns a shallow copy with defaults', () => {
    const input = { code: 'AUTH_ERROR', message: 'oops', source: 'auth' } as const;
    const result = createAppError(input);
    expect(result).toMatchObject(input);
    expect(result).not.toBe(input);
    expect(result.domain).toBe('auth');
    expect(result.fingerprint).toBeDefined();
  });

  it('isAppError detects _tag discriminant', () => {
    const real = createAppError({ code: 'AUTH_ERROR', message: 'boom', source: 'auth' });
    expect(isAppError(real)).toBe(true);
    expect(isAppError({ _tag: 'AppError', code: 'AUTH_ERROR', message: 'boom' })).toBe(true);
    expect(isAppError({ code: 'AUTH_ERROR', message: 'boom' })).toBe(false);
    expect(isAppError({ message: 'boom' })).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
