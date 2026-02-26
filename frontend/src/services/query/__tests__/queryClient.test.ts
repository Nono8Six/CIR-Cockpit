import { describe, expect, it } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { shouldRetryQueryError } from '@/services/query/queryClient';

describe('shouldRetryQueryError', () => {
  it('stops retrying after max attempts', () => {
    expect(shouldRetryQueryError(3, new Error('network'))).toBe(false);
  });

  it('does not retry non-retryable AppError codes from catalog', () => {
    const error = createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Veuillez vous reconnecter.',
      source: 'auth'
    });
    expect(shouldRetryQueryError(0, error)).toBe(false);
  });

  it('retries AppError when catalog marks it retryable', () => {
    const error = createAppError({
      code: 'NETWORK_ERROR',
      message: 'Connexion interrompue.',
      source: 'network'
    });
    expect(shouldRetryQueryError(0, error)).toBe(true);
  });

  it('retries unknown errors before max attempts', () => {
    expect(shouldRetryQueryError(1, new Error('temporary failure'))).toBe(true);
  });
});
