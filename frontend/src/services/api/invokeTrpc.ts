import { createAppError, isAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { mapTrpcError } from '@/services/errors/mapTrpcError';
import { isRecord } from '@/utils/recordNarrowing/isRecord';
import { readBoolean } from '@/utils/recordNarrowing/readBoolean';
import {
  buildRpcRequestInit,
  createTrpcCallOptions,
  type TrpcClient,
  getTrpcClient
} from './trpcClient';

export type ParseTrpcResponse<TResponse> = (payload: unknown) => TResponse;
export type TrpcCallOptions = ReturnType<typeof createTrpcCallOptions>;
export type TrpcCall = (client: TrpcClient, options: TrpcCallOptions) => Promise<unknown>;

/**
 * @description Runs a tRPC call safely by wrapping it in try-catch and mapping any thrown error to an AppError.
 * @param {TrpcCall} call - The tRPC call to execute.
 * @param {string} fallbackMessage - Message to use if mapping fails or error is unknown.
 * @returns {Promise<unknown>} The raw payload returned by the tRPC call.
 */
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

/**
 * @description Invokes a tRPC call, validates the shape of the response, and parses it.
 * @param {TrpcCall} call - The tRPC call to execute.
 * @param {ParseTrpcResponse<TResponse>} parseResponse - Function to parse the raw payload into TResponse.
 * @param {string} fallbackMessage - Fallback error message.
 * @returns {Promise<TResponse>} The parsed response.
 */
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
