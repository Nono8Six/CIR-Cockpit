import { ResultAsync } from 'neverthrow';

import { safeApiCall } from '@/lib/result';
import type { AppError } from '@/services/errors/AppError';
import { invokeTrpc, type ParseTrpcResponse, type TrpcCall } from './invokeTrpc';

/**
 * @description Safely executes a tRPC call returning a neverthrow ResultAsync wrapper around AppError.
 * @param {TrpcCall} call - The tRPC call to execute.
 * @param {ParseTrpcResponse<TResponse>} parseResponse - Function to parse the raw payload into TResponse.
 * @param {string} fallbackMessage - Fallback error message.
 * @returns {ResultAsync<TResponse, AppError>} ResultAsync wrapping the successful parsed response or mapped AppError.
 */
export const safeTrpc = <TResponse>(
  call: TrpcCall,
  parseResponse: ParseTrpcResponse<TResponse>,
  fallbackMessage: string
): ResultAsync<TResponse, AppError> =>
  safeApiCall(invokeTrpc(call, parseResponse, fallbackMessage), fallbackMessage);
