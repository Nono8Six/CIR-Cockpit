import { isTRPCClientError } from '@trpc/client';

import { createAppError, type AppError, type ErrorCode } from './AppError';
import { isRecord, readObject, readString } from '@/utils/recordNarrowing';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'INVALID_PAYLOAD',
  401: 'AUTH_REQUIRED',
  403: 'AUTH_FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'EDGE_FUNCTION_ERROR'
};

const isErrorCode = (value: string): value is ErrorCode => value.trim().length > 0;
const isNetworkErrorMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to fetch');
};

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' ? value : null;
};

export const mapTrpcError = (error: unknown, fallbackMessage: string): AppError => {
  if (!isTRPCClientError(error)) {
    if (error instanceof Error) {
      if (isNetworkErrorMessage(error.message)) {
        return createAppError({
          code: 'NETWORK_ERROR',
          message: 'Impossible de joindre le serveur. Verifiez votre connexion.',
          source: 'network',
          details: error.message,
          cause: error
        });
      }

      return createAppError({
        code: 'REQUEST_FAILED',
        message: fallbackMessage,
        source: 'edge',
        details: error.message,
        cause: error
      });
    }

    return createAppError({
      code: 'REQUEST_FAILED',
      message: fallbackMessage,
      source: 'edge',
      cause: error
    });
  }

  const detailsData = isRecord(error.data) ? error.data : null;
  const appCodeRaw = detailsData ? readString(detailsData, 'appCode') : null;
  const requestId = detailsData ? readString(detailsData, 'requestId') : null;
  const details = detailsData ? readString(detailsData, 'details') : null;
  const status = detailsData ? readNumber(detailsData, 'httpStatus') : null;

  const shapeError = isRecord(error.shape) ? error.shape : null;
  const shapeData = shapeError ? readObject(shapeError, 'data') : null;
  const shapeHttpStatus = shapeData ? readNumber(shapeData, 'httpStatus') : null;
  const resolvedStatus = status ?? shapeHttpStatus ?? undefined;

  const resolvedCode = appCodeRaw && isErrorCode(appCodeRaw)
    ? appCodeRaw
    : (resolvedStatus ? STATUS_TO_CODE[resolvedStatus] : undefined) ?? 'EDGE_FUNCTION_ERROR';

  return createAppError({
    code: resolvedCode,
    message: error.message || fallbackMessage,
    source: 'edge',
    status: resolvedStatus,
    requestId: requestId ?? undefined,
    details: details ?? undefined,
    cause: error
  });
};
