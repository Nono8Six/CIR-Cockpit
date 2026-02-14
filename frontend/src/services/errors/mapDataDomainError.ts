import { createAppError, type AppError, type ErrorCode } from './AppError';
import { normalizeError } from './normalizeError';

type DataAction =
  | 'save_entity'
  | 'archive_entity'
  | 'convert_entity'
  | 'save_contact'
  | 'delete_contact'
  | 'save_interaction'
  | 'add_timeline_event'
  | 'save_config'
  | 'password_changed';

type MapDataDomainErrorParams = {
  action: DataAction;
  fallbackMessage: string;
};

const PASS_THROUGH_CODES = new Set<ErrorCode>([
  'AUTH_REQUIRED',
  'AUTH_FORBIDDEN',
  'RATE_LIMIT',
  'CONFLICT',
  'NETWORK_ERROR',
  'NOT_FOUND',
  'INVALID_PAYLOAD',
  'INVALID_JSON',
  'VALIDATION_ERROR',
  'CONFIG_INVALID'
]);

const ACTION_CODE: Record<DataAction, ErrorCode> = {
  save_entity: 'DB_WRITE_FAILED',
  archive_entity: 'DB_WRITE_FAILED',
  convert_entity: 'DB_WRITE_FAILED',
  save_contact: 'DB_WRITE_FAILED',
  delete_contact: 'DB_WRITE_FAILED',
  save_interaction: 'DB_WRITE_FAILED',
  add_timeline_event: 'DB_WRITE_FAILED',
  save_config: 'DB_WRITE_FAILED',
  password_changed: 'PROFILE_UPDATE_FAILED'
};

export const mapDataDomainError = (
  error: unknown,
  params: MapDataDomainErrorParams
): AppError => {
  const normalized = normalizeError(error, params.fallbackMessage);
  if (PASS_THROUGH_CODES.has(normalized.code)) return normalized;

  return createAppError({
    ...normalized,
    code: ACTION_CODE[params.action],
    message: params.fallbackMessage,
    source: normalized.source === 'unknown' ? 'edge' : normalized.source,
    cause: normalized.cause ?? error
  });
};
