import { ResultAsync } from 'neverthrow';

import { safeApiCall } from '@/lib/result';
import type { AppError } from '@/services/errors/AppError';
import {
  invokeTrpc,
  type InvalidTrpcResponse,
  type TrpcCall,
  type TrpcResponseContract
} from './invokeTrpc';

/**
 * @description Safely executes a tRPC call returning a neverthrow ResultAsync wrapper around AppError.
 * @param {TrpcCall} call - The tRPC call to execute.
 * @param {TrpcResponseContract<TPayload, TResponse>} responseContract - Runtime contract for the external response.
 * @param {string} fallbackMessage - Fallback error message.
 * @returns {ResultAsync<TResponse, AppError>} ResultAsync wrapping the successful parsed response or mapped AppError.
 */
export const safeTrpc = <TPayload, TResponse>(
  call: TrpcCall<TPayload>,
  responseContract: TrpcResponseContract<TPayload, TResponse>,
  fallbackMessage: string,
  invalidResponse?: InvalidTrpcResponse
): ResultAsync<TResponse, AppError> =>
  safeApiCall(
    invokeTrpc(call, responseContract, fallbackMessage, invalidResponse),
    fallbackMessage
  );
