import { AppError, isAppError } from './AppError';
import { normalizeError } from './normalizeError';
import { notifyError } from './notify';
import { reportError } from './reportError';

type ErrorContext = Record<string, unknown> | undefined;

export const handleUiError = (
  error: unknown,
  fallbackMessage: string,
  context?: ErrorContext
): AppError => {
  const appError = isAppError(error) ? error : normalizeError(error, fallbackMessage);
  reportError(appError, context);
  notifyError(appError);
  return appError;
};
