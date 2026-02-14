import { createAppError, type AppError, type ErrorCode } from './AppError';
import { normalizeError } from './normalizeError';

type AdminAction =
  | 'create_user'
  | 'update_user'
  | 'reset_password'
  | 'create_agency'
  | 'update_agency'
  | 'delete_agency'
  | 'read_audit';

type MapAdminDomainErrorParams = {
  action: AdminAction;
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
  'INVALID_JSON'
]);

const ACTION_CODE: Record<AdminAction, ErrorCode> = {
  create_user: 'USER_CREATE_FAILED',
  update_user: 'USER_UPDATE_FAILED',
  reset_password: 'PASSWORD_RESET_FAILED',
  create_agency: 'AGENCY_CREATE_FAILED',
  update_agency: 'AGENCY_UPDATE_FAILED',
  delete_agency: 'AGENCY_DELETE_FAILED',
  read_audit: 'DB_READ_FAILED'
};

export const mapAdminDomainError = (
  error: unknown,
  params: MapAdminDomainErrorParams
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
