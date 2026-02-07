import { PostgrestError } from '@supabase/supabase-js';

import { AppError, createAppError } from './AppError';

type DbOperation = 'read' | 'write' | 'delete' | 'upsert';

type DbErrorContext = {
  operation: DbOperation;
  resource: string;
  status?: number | null;
};

export const mapPostgrestError = (
  error: PostgrestError,
  context: DbErrorContext
): AppError => {
  const status = context.status ?? undefined;
  const baseMessage =
    context.operation === 'read'
      ? `Impossible de charger ${context.resource}.`
      : `Impossible d'enregistrer ${context.resource}.`;

  if (status === 401) {
    return createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Veuillez vous reconnecter.',
      status,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  if (status === 403) {
    return createAppError({
      code: 'AUTH_FORBIDDEN',
      message: 'Accès non autorisé.',
      status,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  if (status === 404) {
    return createAppError({
      code: 'NOT_FOUND',
      message: `${context.resource} introuvable.`,
      status,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  if (status === 409) {
    return createAppError({
      code: 'CONFLICT',
      message: 'Conflit de mise à jour. Rechargez et réessayez.',
      status,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  if (status === 429) {
    return createAppError({
      code: 'RATE_LIMIT',
      message: 'Trop de requêtes. Réessayez plus tard.',
      status,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  if (status === 502 || status === 503) {
    return createAppError({
      code: context.operation === 'read' ? 'DB_READ_FAILED' : 'DB_WRITE_FAILED',
      message: 'Le serveur est temporairement indisponible. Nouvelle tentative…',
      status,
      retryable: true,
      source: 'db',
      details: error.message,
      cause: error
    });
  }

  return createAppError({
    code: context.operation === 'read' ? 'DB_READ_FAILED' : 'DB_WRITE_FAILED',
    message: baseMessage,
    status,
    source: 'db',
    details: error.message,
    cause: error
  });
};
