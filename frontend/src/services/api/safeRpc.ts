import { ResultAsync } from 'neverthrow';

import type { AppError } from '@/services/errors/AppError';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { mapTrpcError } from '@/services/errors/mapTrpcError';
import { safeApiCall } from '@/lib/result';
import { isRecord, readBoolean } from '@/utils/recordNarrowing';
import { buildRpcRequestInit, type RpcClient, rpcClient } from './rpcClient';

type ParseRpcResponse<TResponse> = (payload: unknown) => TResponse;
type RpcCall = (client: RpcClient, init: RequestInit) => Promise<unknown>;

const runRpcCall = async (
  call: RpcCall
): Promise<unknown> => {
  const requestInit = await buildRpcRequestInit();

  let payload: unknown;
  try {
    payload = await call(rpcClient, requestInit);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    throw mapTrpcError(error, 'Erreur serveur.');
  }

  return payload;
};

export const invokeRpc = async <TResponse>(
  call: RpcCall,
  parseResponse: ParseRpcResponse<TResponse>
): Promise<TResponse> => {
  const payload = await runRpcCall(call);
  if (!isRecord(payload)) {
    throw createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: 'Reponse serveur invalide.',
      source: 'edge'
    });
  }
  if (readBoolean(payload, 'ok') === false) {
    throw mapEdgeError(payload, 'Erreur serveur.');
  }
  return parseResponse(payload);
};

export const safeRpc = <TResponse>(
  call: RpcCall,
  parseResponse: ParseRpcResponse<TResponse>,
  fallbackMessage: string
): ResultAsync<TResponse, AppError> =>
  safeApiCall(invokeRpc(call, parseResponse), fallbackMessage);
