import { ResultAsync } from 'neverthrow';

import type { AppError } from '@/services/errors/AppError';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { safeApiCall } from '@/lib/result';
import { isRecord, readBoolean } from '@/utils/recordNarrowing';
import { buildRpcRequestInit, type RpcClient, rpcClient } from './rpcClient';

type ParseRpcResponse<TResponse> = (payload: unknown) => TResponse;
type RpcCall = (client: RpcClient, init: RequestInit) => Promise<Response>;

const runRpcCall = async (
  call: RpcCall
): Promise<{ response: Response; payload: unknown }> => {
  const requestInit = await buildRpcRequestInit();

  let response: Response;
  try {
    response = await call(rpcClient, requestInit);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    throw createAppError({
      code: 'NETWORK_ERROR',
      message: 'Impossible de joindre le serveur. Verifiez votre connexion.',
      source: 'network',
      cause: error
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
};

export const invokeRpc = async <TResponse>(
  call: RpcCall,
  parseResponse: ParseRpcResponse<TResponse>
): Promise<TResponse> => {
  const { response, payload } = await runRpcCall(call);
  if (!response.ok) {
    throw mapEdgeError(payload, 'Erreur serveur.', response.status);
  }
  if (!isRecord(payload)) {
    throw mapEdgeError(null, 'Reponse serveur invalide.', response.status);
  }
  if (readBoolean(payload, 'ok') === false) {
    throw mapEdgeError(payload, 'Erreur serveur.', response.status);
  }
  return parseResponse(payload);
};

export const safeRpc = <TResponse>(
  call: RpcCall,
  parseResponse: ParseRpcResponse<TResponse>,
  fallbackMessage: string
): ResultAsync<TResponse, AppError> =>
  safeApiCall(invokeRpc(call, parseResponse), fallbackMessage);
