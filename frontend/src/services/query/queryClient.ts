import { QueryClient } from '@tanstack/react-query';

import { isAppError } from '@/services/errors/AppError';

const MAX_RETRY_ATTEMPTS = 3;

export const shouldRetryQueryError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_RETRY_ATTEMPTS) return false;
  if (isAppError(error)) return error.retryable === true;
  return true;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryQueryError,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});
