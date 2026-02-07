import { AppError, createAppError, isAppError } from './AppError';
import { appendErrorToJournal } from './journal';
import { isValidErrorSource, normalizeErrorSource } from './source';

export type ErrorReporter = (error: AppError | unknown, context?: Record<string, unknown>) => void;

let reporter: ErrorReporter | null = null;

export const setErrorReporter = (next: ErrorReporter | null): void => {
  reporter = next;
};

const formatError = (error: AppError | unknown): string => {
  if (isAppError(error)) {
    const parts = [`[${error.code}] ${error.message}`];
    if (error.domain) parts.push(`domain=${error.domain}`);
    if (error.source) parts.push(`source=${error.source}`);
    if (error.status) parts.push(`status=${error.status}`);
    if (error.details) parts.push(`details=${error.details}`);
    if (error.requestId) parts.push(`request_id=${error.requestId}`);
    return parts.join(' | ');
  }
  if (error instanceof Error) return error.message;
  return String(error);
};

const journalError = (error: AppError | unknown, context?: Record<string, unknown>) => {
  if (isAppError(error)) {
    void appendErrorToJournal(error, context);
    return;
  }

  const normalized = createAppError({
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Erreur inattendue.',
    source: 'unknown',
    cause: error
  });
  void appendErrorToJournal(normalized, context);
};

const normalizeContext = (context?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!context) {
    return undefined;
  }

  const next = { ...context };
  if ('source' in next) {
    const normalizedSource = normalizeErrorSource(next.source);
    if (typeof next.source === 'string' && !isValidErrorSource(next.source)) {
      next.original_source = next.source;
    }
    next.source = normalizedSource;
  }

  return next;
};

export const reportError = (error: AppError | unknown, context?: Record<string, unknown>): void => {
  const normalizedContext = normalizeContext(context);
  journalError(error, normalizedContext);

  if (reporter) {
    reporter(error, normalizedContext);
  }
  if (import.meta.env.DEV) {
    if (normalizedContext) {
      console.debug('[AppError]', formatError(error), normalizedContext);
    } else {
      console.debug('[AppError]', formatError(error));
    }
  }
};
