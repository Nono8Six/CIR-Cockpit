export type ErrorDomain = 'auth' | 'db' | 'edge' | 'network' | 'validation' | 'client' | 'unknown';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export type RecoveryAction = 'retry' | 'reload' | 'relogin' | 'contact_support' | 'none';

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_WEAK_PASSWORD'
  | 'AUTH_SAME_PASSWORD'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_ERROR'
  | 'CLIENT_NOT_CONFIGURED'
  | 'CONFIG_INVALID'
  | 'CONFIG_MISSING'
  | 'CONFLICT'
  | 'DB_READ_FAILED'
  | 'DB_WRITE_FAILED'
  | 'DRAFT_NOT_FOUND'
  | 'DRAFT_SAVE_FAILED'
  | 'EDGE_FUNCTION_ERROR'
  | 'EMAIL_REQUIRED'
  | 'EMAIL_INVALID'
  | 'DISPLAY_NAME_EMPTY'
  | 'DISPLAY_NAME_TOO_LONG'
  | 'AGENCY_IDS_INVALID'
  | 'AGENCY_ID_INVALID'
  | 'AGENCY_NOT_FOUND'
  | 'AGENCY_NAME_REQUIRED'
  | 'AGENCY_NAME_EMPTY'
  | 'AGENCY_NAME_TOO_LONG'
  | 'AGENCY_NAME_EXISTS'
  | 'AGENCY_CREATE_FAILED'
  | 'AGENCY_UPDATE_FAILED'
  | 'AGENCY_DELETE_FAILED'
  | 'AGENCY_LOOKUP_FAILED'
  | 'ENTITY_DETACH_FAILED'
  | 'MEMBERSHIP_LOOKUP_FAILED'
  | 'MEMBERSHIP_UPSERT_FAILED'
  | 'MEMBERSHIP_DELETE_FAILED'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'PROFILE_CREATE_FAILED'
  | 'PROFILE_LOOKUP_FAILED'
  | 'PROFILE_UPDATE_FAILED'
  | 'PROFILE_NOT_FOUND'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_REQUIRES_DIGIT'
  | 'PASSWORD_REQUIRES_SYMBOL'
  | 'PASSWORD_RESET_FAILED'
  | 'RATE_LIMIT'
  | 'RATE_LIMITED'
  | 'RATE_LIMIT_CHECK_FAILED'
  | 'REQUEST_FAILED'
  | 'INVALID_JSON'
  | 'INVALID_PAYLOAD'
  | 'ACTION_REQUIRED'
  | 'ROLE_INVALID'
  | 'USER_NOT_FOUND'
  | 'USER_CREATE_FAILED'
  | 'USER_UPDATE_FAILED'
  | 'USER_DELETE_FAILED'
  | 'USER_DELETE_SELF_FORBIDDEN'
  | 'USER_DELETE_HAS_INTERACTIONS'
  | 'USER_DELETE_REFERENCED'
  | 'SYSTEM_USER_PROVISION_FAILED'
  | 'SYSTEM_USER_NOT_FOUND'
  | 'USER_DELETE_ANONYMIZATION_FAILED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
  | (string & {});

export type AppError = {
  readonly _tag: 'AppError';
  code: ErrorCode;
  message: string;
  status?: number;
  retryable?: boolean;
  /** Catalog-derived domain (auth, db, edge, etc.). Set by createAppError from catalog or explicit. */
  domain?: ErrorDomain;
  severity?: ErrorSeverity;
  recoveryAction?: RecoveryAction;
  fingerprint?: string;
  /** Caller-specified origin. Falls back to domain if not set. Kept for backward compat. */
  source?: ErrorDomain;
  details?: string;
  requestId?: string;
  cause?: unknown;
};
