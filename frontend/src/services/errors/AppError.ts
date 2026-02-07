import {
  createErrorFingerprint,
  getErrorCatalogEntry,
  type AppError,
  type ErrorCode,
  type ErrorDomain,
  type ErrorSeverity,
  type RecoveryAction
} from '../../../../shared/errors';

export type { AppError, ErrorCode, ErrorDomain, ErrorSeverity, RecoveryAction };

export const createAppError = (error: Omit<AppError, '_tag'> & { _tag?: 'AppError' }): AppError => {
  const entry = getErrorCatalogEntry(error.code);
  const domain = error.domain ?? error.source ?? entry?.domain ?? 'unknown';
  const severity = error.severity ?? entry?.severity ?? 'error';
  const recoveryAction = error.recoveryAction ?? entry?.recoveryAction ?? 'none';
  const retryable = error.retryable ?? entry?.retryable;
  const fingerprint = error.fingerprint ?? createErrorFingerprint({
    code: error.code,
    domain,
    source: error.source,
    status: error.status
  });

  return {
    ...error,
    _tag: 'AppError',
    message: error.message || entry?.message || 'Erreur inattendue.',
    domain,
    severity,
    recoveryAction,
    retryable,
    fingerprint,
    source: error.source ?? domain
  };
};

export const isAppError = (error: unknown): error is AppError => {
  if (!error || typeof error !== 'object') return false;
  return '_tag' in error && Reflect.get(error, '_tag') === 'AppError';
};

