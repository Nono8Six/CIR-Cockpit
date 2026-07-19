import { getErrorCatalogEntry } from '../../../../shared/errors/catalog.ts';
import type { ErrorCode } from '../../../../shared/errors/types.ts';
import {
  edgeErrorPayloadSchema,
  publicErrorDetails,
  type EdgeErrorPayload
} from '../../../../shared/schemas/system/edge-error.schema.ts';

export type HttpError = Error & {
  status?: number;
  code?: ErrorCode;
  details?: string;
  retryAfterMs?: number;
};

export const httpError = (
  status: number,
  code: ErrorCode,
  message: string,
  details?: string,
  options?: { retryAfterMs?: number }
): HttpError => {
  return Object.assign(new Error(message), {
    status,
    code,
    details,
    retryAfterMs: options?.retryAfterMs
  });
};

const readErrorNumber = (error: Error, key: string): number | undefined => {
  const candidate = Reflect.get(error, key);
  return typeof candidate === 'number' ? candidate : undefined;
};

const readErrorCode = (error: Error): string | undefined => {
  const candidate = Reflect.get(error, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

const readErrorDetails = (error: Error): string | undefined => {
  const candidate = Reflect.get(error, 'details');
  return typeof candidate === 'string' ? candidate : undefined;
};

const readRetryAfterMs = (error: Error): number | undefined => {
  const candidate = Reflect.get(error, 'retryAfterMs');
  return typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0 && candidate <= 300_000
    ? candidate
    : undefined;
};

const normalizeError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      status: readErrorNumber(err, 'status') ?? 500,
      code: readErrorCode(err) ?? 'REQUEST_FAILED',
      message: err.message || 'La requete a echoue.',
      details: readErrorDetails(err),
      retryAfterMs: readRetryAfterMs(err)
    };
  }
  return {
    status: 500,
    code: 'REQUEST_FAILED',
    message: 'La requete a echoue.',
    details: undefined,
    retryAfterMs: undefined
  };
};

type ContextLike = {
  get: (key: string) => string | undefined;
  json: (body: Record<string, unknown>, status?: number) => Response;
};

export const handleError = (err: unknown, c: ContextLike) => {
  const requestId = c.get('requestId') ?? crypto.randomUUID();
  const { status, code, message, details, retryAfterMs } = normalizeError(err);
  const catalogEntry = getErrorCatalogEntry(code);
  const fallbackEntry = getErrorCatalogEntry('REQUEST_FAILED');
  const resolvedCode = catalogEntry?.code ?? fallbackEntry?.code ?? 'REQUEST_FAILED';
  const resolvedMessage = catalogEntry?.message ?? fallbackEntry?.message ?? message;
  const body: EdgeErrorPayload = {
    request_id: requestId,
    ok: false,
    error: resolvedMessage,
    code: resolvedCode,
    retryable: catalogEntry?.retryable ?? false,
    recovery_action: catalogEntry?.recoveryAction ?? 'none'
  };
  const allowedDetails = publicErrorDetails(resolvedCode, details);
  if (allowedDetails) {
    body.details = allowedDetails;
  }
  if (retryAfterMs !== undefined) {
    body.retry_after_ms = retryAfterMs;
  }
  const parsed = edgeErrorPayloadSchema.safeParse(body);
  if (parsed.success) {
    return c.json(parsed.data, status);
  }
  return c.json({
    request_id: requestId,
    ok: false,
    error: fallbackEntry?.message ?? 'La requete a echoue.',
    code: 'REQUEST_FAILED',
    retryable: fallbackEntry?.retryable ?? false,
    recovery_action: fallbackEntry?.recoveryAction ?? 'none'
  }, 500);
};
