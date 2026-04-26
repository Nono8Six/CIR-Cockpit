import { ResultAsync } from 'neverthrow';

import { safeApiCall } from '@/lib/result';
import { createAppError, isAppError, type AppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { mapTrpcError } from '@/services/errors/mapTrpcError';
import { isRecord, readBoolean } from '@/utils/recordNarrowing';
import {
  buildRpcRequestInit,
  createTrpcCallOptions,
  type TrpcClient,
  getTrpcClient
} from './trpcClient';

type ParseTrpcResponse<TResponse> = (payload: unknown) => TResponse;
type TrpcCallOptions = ReturnType<typeof createTrpcCallOptions>;
type TrpcCall = (client: TrpcClient, options: TrpcCallOptions) => Promise<unknown>;

const runTrpcCall = async (
  call: TrpcCall,
  fallbackMessage: string
): Promise<unknown> => {
  const requestInit = await buildRpcRequestInit();

  try {
    return await call(getTrpcClient(), createTrpcCallOptions(requestInit));
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    throw mapTrpcError(error, fallbackMessage);
  }
};

export const invokeTrpc = async <TResponse>(
  call: TrpcCall,
  parseResponse: ParseTrpcResponse<TResponse>,
  fallbackMessage: string
): Promise<TResponse> => {
  const payload = await runTrpcCall(call, fallbackMessage);
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

export const safeTrpc = <TResponse>(
  call: TrpcCall,
  parseResponse: ParseTrpcResponse<TResponse>,
  fallbackMessage: string
): ResultAsync<TResponse, AppError> =>
  safeApiCall(invokeTrpc(call, parseResponse, fallbackMessage), fallbackMessage);
