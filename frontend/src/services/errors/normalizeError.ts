import { ZodError } from 'zod';

import { AppError, ErrorCode, createAppError, isAppError } from './AppError';

const isNetworkErrorMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch');
};

export const normalizeError = (
  error: unknown,
  fallbackMessage: string,
  fallbackCode: ErrorCode = 'UNKNOWN_ERROR'
): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const details = error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      })
      .join(' | ');
    return createAppError({
      code: 'VALIDATION_ERROR',
      message: 'Données invalides.',
      source: 'validation',
      details,
      cause: error
    });
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createAppError({
        code: 'NETWORK_ERROR',
        message: 'Requête annulée. Veuillez réessayer.',
        source: 'network',
        details: error.message,
        cause: error
      });
    }

    if (isNetworkErrorMessage(error.message)) {
      return createAppError({
        code: 'NETWORK_ERROR',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
        source: 'network',
        details: error.message,
        cause: error
      });
    }

    return createAppError({
      code: fallbackCode,
      message: fallbackMessage,
      source: 'unknown',
      details: error.message,
      cause: error
    });
  }

  return createAppError({
    code: fallbackCode,
    message: fallbackMessage,
    source: 'unknown',
    details: typeof error === 'string' ? error : undefined,
    cause: error
  });
};
