import { getErrorCatalogEntry } from '../../../../shared/errors/catalog.ts';
import type { ErrorCode } from '../../../../shared/errors/types.ts';
import { edgeErrorPayloadSchema, type EdgeErrorPayload } from '../../../../shared/schemas/edge-error.schema.ts';

export type HttpError = Error & { status?: number; code?: ErrorCode; details?: string };

export const httpError = (
  status: number,
  code: ErrorCode,
  message: string,
  details?: string
): HttpError => {
  const err = new Error(message) as HttpError;
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
};

const normalizeError = (err: unknown) => {
  if (err instanceof Error) {
    const maybe = err as HttpError;
    return {
      status: typeof maybe.status === 'number' ? maybe.status : 500,
      code: maybe.code ?? 'REQUEST_FAILED',
      message: maybe.message || 'La requete a echoue.',
      details: maybe.details
    };
  }
  return {
    status: 500,
    code: 'REQUEST_FAILED',
    message: 'La requete a echoue.'
  };
};

type ContextLike = {
  get: (key: string) => string | undefined;
  json: (body: Record<string, unknown>, status?: number) => Response;
};

export const handleError = (err: unknown, c: ContextLike) => {
  const requestId = c.get('requestId') ?? crypto.randomUUID();
  const { status, code, message, details } = normalizeError(err);
  const catalogEntry = getErrorCatalogEntry(code);
  const fallbackEntry = getErrorCatalogEntry('REQUEST_FAILED');
  const resolvedCode = catalogEntry?.code ?? fallbackEntry?.code ?? 'REQUEST_FAILED';
  const resolvedMessage = catalogEntry?.message ?? fallbackEntry?.message ?? message;
  const body: EdgeErrorPayload = {
    request_id: requestId,
    ok: false,
    error: resolvedMessage,
    code: resolvedCode
  };
  if (details) {
    body.details = details;
  }
  return c.json(edgeErrorPayloadSchema.parse(body), status);
};
