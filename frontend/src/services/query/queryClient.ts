import { QueryClient } from '@tanstack/react-query';

import { isAppError } from '@/services/errors/AppError';

const NON_RETRYABLE_CODES = new Set([
  'AUTH_REQUIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_FORBIDDEN',
  'AUTH_WEAK_PASSWORD',
  'AUTH_SAME_PASSWORD',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT'
]);

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) return false;
  if (isAppError(error) && NON_RETRYABLE_CODES.has(error.code)) return false;
  return true;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});
