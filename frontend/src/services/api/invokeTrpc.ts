import { createAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { mapTrpcError } from '@/services/errors/mapTrpcError';
import { isRecord, readBoolean } from '@/utils/recordNarrowing';

type ParseResponse<TResponse> = (payload: unknown) => TResponse;

export const invokeTrpc = async <TResponse>(
  call: () => Promise<unknown>,
  parseResponse: ParseResponse<TResponse>,
  fallbackMessage: string
): Promise<TResponse> => {
  let payload: unknown;

  try {
    payload = await call();
  } catch (error) {
    throw mapTrpcError(error, fallbackMessage);
  }

  if (!isRecord(payload)) {
    throw createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: 'Reponse serveur invalide.',
      source: 'edge'
    });
  }

  if (readBoolean(payload, 'ok') === false) {
    throw mapEdgeError(payload, fallbackMessage);
  }

  return parseResponse(payload);
};
