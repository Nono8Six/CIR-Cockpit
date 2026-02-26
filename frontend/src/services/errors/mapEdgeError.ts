import { createAppError, type AppError, type ErrorCode } from './AppError';
import { edgeErrorPayloadSchema } from '../../../../shared/schemas/edge-error.schema';

const isErrorCode = (value: string): value is ErrorCode => value.length > 0;

export const mapEdgeError = (payload: unknown, fallbackMessage: string, status?: number): AppError => {
  const parsed = edgeErrorPayloadSchema.safeParse(payload);
  const edgePayload = parsed.success ? parsed.data : null;
  const statusMap: Record<number, ErrorCode> = { 400: 'INVALID_PAYLOAD', 401: 'AUTH_REQUIRED', 403: 'AUTH_FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 429: 'RATE_LIMIT', 500: 'EDGE_FUNCTION_ERROR', 502: 'REQUEST_FAILED', 503: 'REQUEST_FAILED' };
  const resolvedCode = edgePayload?.code && isErrorCode(edgePayload.code) ? edgePayload.code : (typeof status === 'number' ? statusMap[status] : undefined) ?? 'EDGE_FUNCTION_ERROR';

  return createAppError({ code: resolvedCode, message: edgePayload?.error ?? fallbackMessage, source: 'edge', status, requestId: edgePayload?.request_id, details: edgePayload?.details });
};
