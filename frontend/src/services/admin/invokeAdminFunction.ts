import { ResultAsync } from 'neverthrow';

import { safeApiCall, safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord, readString } from '@/utils/recordNarrowing';

export type EdgeFunctionResponse = { ok?: boolean; error?: string; code?: string; request_id?: string };
const FUNCTION_PATHS: Record<string, string> = { 'admin-users': '/admin/users', 'admin-agencies': '/admin/agencies' };

const parseEdgeResponse = <T extends EdgeFunctionResponse>(payload: unknown): T => {
  if (!isRecord(payload)) throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  const request_id = readString(payload, 'request_id') ?? undefined;
  const error = readString(payload, 'error') ?? undefined;
  const code = readString(payload, 'code') ?? undefined;
  const ok = typeof payload.ok === 'boolean' ? payload.ok : undefined;
  return Object.assign(payload, { request_id, error, code, ok }) as T;
};

export const invokeAdminFunction = <T extends EdgeFunctionResponse>(functionName: string, payload: Record<string, unknown>, fallbackMessage: string): ResultAsync<T, AppError> => {
  const apiPath = FUNCTION_PATHS[functionName];
  if (!apiPath) {
    const error = createAppError({ code: 'CONFIG_INVALID', message: fallbackMessage, source: 'client' });
    return safeAsync(Promise.reject(error), () => error);
  }

  return safeApiCall(safeInvoke(apiPath, payload, parseEdgeResponse<T>), fallbackMessage);
};
