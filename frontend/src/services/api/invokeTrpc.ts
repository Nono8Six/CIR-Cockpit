import {
  createAppError,
  isAppError,
  type ErrorCode
} from '@/services/errors/AppError';
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

export type TrpcCallOptions = ReturnType<typeof createTrpcCallOptions>;
export type TrpcCall<TPayload> = (
  client: TrpcClient,
  options: TrpcCallOptions
) => Promise<TPayload>;

export type TrpcResponseSchema<TResponse> = {
  safeParse: (
    payload: unknown
  ) =>
    | { success: true; data: TResponse }
    | { success: false; error: { message: string } };
  invalidResponse?: InvalidTrpcResponse;
};

export type InvalidTrpcResponse = {
  code?: ErrorCode;
  message?: string;
};

export const withInvalidTrpcResponse = <TResponse>(
  responseSchema: TrpcResponseSchema<TResponse>,
  invalidResponse: InvalidTrpcResponse
): TrpcResponseSchema<TResponse> => ({
  safeParse: responseSchema.safeParse.bind(responseSchema),
  invalidResponse
});

export type TrpcResponseParser<TPayload, TResponse> = (
  payload: TPayload
) => TResponse;

export type TrpcResponseContract<TPayload, TResponse> =
  | TrpcResponseSchema<TResponse>
  | TrpcResponseParser<TPayload, TResponse>;

export const parseTrpcResponse = <TResponse>(
  responseSchema: TrpcResponseSchema<TResponse>,
  payload: unknown,
  invalidResponse: InvalidTrpcResponse = {}
): TResponse => {
  const resolvedInvalidResponse = {
    ...responseSchema.invalidResponse,
    ...invalidResponse
  };
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: resolvedInvalidResponse.code ?? 'REQUEST_FAILED',
      message: resolvedInvalidResponse.message ?? 'Réponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const createTrpcResponseParser = <TParsed, TResponse>(
  responseSchema: TrpcResponseSchema<TParsed>,
  transform: (response: TParsed) => TResponse,
  invalidResponse?: InvalidTrpcResponse,
  preprocess: (payload: unknown) => unknown = (payload) => payload
): TrpcResponseParser<unknown, TResponse> =>
  (payload) => transform(
    parseTrpcResponse(responseSchema, preprocess(payload), invalidResponse)
  );

export const parseTrpcContract = <TPayload, TResponse>(
  responseContract: TrpcResponseContract<TPayload, TResponse>,
  payload: TPayload,
  invalidResponse?: InvalidTrpcResponse
): TResponse =>
  typeof responseContract === 'function'
    ? responseContract(payload)
    : parseTrpcResponse(responseContract, payload, invalidResponse);

const describeInvalidPayload = (payload: unknown): string => {
  if (payload === null) {
    return 'Payload null.';
  }
  if (Array.isArray(payload)) {
    return 'Payload tableau.';
  }
  return `Payload ${typeof payload}.`;
};

/**
 * @description Runs a tRPC call safely by wrapping it in try-catch and mapping any thrown error to an AppError.
 * @param {TrpcCall} call - The tRPC call to execute.
 * @param {string} fallbackMessage - Message to use if mapping fails or error is unknown.
 * @returns {Promise<TPayload>} The payload inferred from the tRPC procedure.
 */
const runTrpcCall = async <TPayload>(
  call: TrpcCall<TPayload>,
  fallbackMessage: string
): Promise<TPayload> => {
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
 * @param {TrpcResponseContract<TPayload, TResponse>} responseContract - Runtime contract and optional domain transformation for the external response.
 * @param {string} fallbackMessage - Fallback error message.
 * @returns {Promise<TResponse>} The parsed response.
 */
export const invokeTrpc = async <TPayload, TResponse>(
  call: TrpcCall<TPayload>,
  responseContract: TrpcResponseContract<TPayload, TResponse>,
  fallbackMessage: string,
  invalidResponse: InvalidTrpcResponse = {}
): Promise<TResponse> => {
  const payload = await runTrpcCall(call, fallbackMessage);
  if (!isRecord(payload)) {
    throw createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: 'Réponse serveur invalide.',
      source: 'edge',
      details: describeInvalidPayload(payload)
    });
  }
  if (readBoolean(payload, 'ok') === false) {
    throw mapEdgeError(payload, fallbackMessage);
  }

  return parseTrpcContract(responseContract, payload, invalidResponse);
};
