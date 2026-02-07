import { ResultAsync, err, ok } from 'neverthrow';
import type { PostgrestError } from '@supabase/supabase-js';

import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';

type DbOperation = 'read' | 'write' | 'delete' | 'upsert';

type DbErrorContext = {
  operation: DbOperation;
  resource: string;
};

export const safeAsync = <T>(
  promise: Promise<T>,
  mapError: (error: unknown) => AppError
): ResultAsync<T, AppError> => ResultAsync.fromPromise(promise, mapError);

export const safeApiCall = <T>(
  promise: Promise<T>,
  fallbackMessage: string
): ResultAsync<T, AppError> => ResultAsync.fromPromise(promise, (error) => normalizeError(error, fallbackMessage));

export const safeSupabaseCall = <T>(
  call: Promise<{ data: T | null; error: PostgrestError | null; status?: number | null }>,
  context: DbErrorContext
): ResultAsync<T, AppError> =>
  ResultAsync.fromPromise(call, (error) => normalizeError(error, `Erreur ${context.operation}`))
    .andThen(({ data, error, status }) => {
      if (error) {
        return err(mapPostgrestError(error, { ...context, status }));
      }
      if (!data) {
        return err(createAppError({
          code: 'NOT_FOUND',
          message: `${context.resource} introuvable.`,
          source: 'db'
        }));
      }
      return ok(data);
    });
