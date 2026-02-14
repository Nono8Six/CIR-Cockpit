import { createAppError, type AppError, type ErrorCode } from './AppError';
import { normalizeError } from './normalizeError';

type SettingsAction = 'load_config' | 'save_config';

type MapSettingsDomainErrorParams = {
  action: SettingsAction;
  fallbackMessage: string;
};

const PASS_THROUGH_CODES = new Set<ErrorCode>([
  'AUTH_REQUIRED',
  'AUTH_FORBIDDEN',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'AGENCY_ID_INVALID',
  'CONFIG_INVALID',
  'VALIDATION_ERROR'
]);

const ACTION_CODE: Record<SettingsAction, ErrorCode> = {
  load_config: 'DB_READ_FAILED',
  save_config: 'DB_WRITE_FAILED'
};

export const mapSettingsDomainError = (
  error: unknown,
  params: MapSettingsDomainErrorParams
): AppError => {
  const normalized = normalizeError(error, params.fallbackMessage);

  if (normalized.code === 'VALIDATION_ERROR') {
    return createAppError({
      ...normalized,
      code: 'CONFIG_INVALID',
      message: params.fallbackMessage,
      source: 'validation',
      cause: normalized.cause ?? error
    });
  }

  if (PASS_THROUGH_CODES.has(normalized.code)) return normalized;

  return createAppError({
    ...normalized,
    code: ACTION_CODE[params.action],
    message: params.fallbackMessage,
    source: normalized.source === 'unknown' ? 'db' : normalized.source,
    cause: normalized.cause ?? error
  });
};
