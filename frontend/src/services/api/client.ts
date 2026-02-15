import { createAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readBoolean, readString } from '@/utils/recordNarrowing';

const TOKEN_REFRESH_SAFETY_WINDOW_SECONDS = 30;

const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) throw createAppError({ code: 'CONFIG_INVALID', message: 'Configuration invalide.', source: 'client' });
  return `${baseUrl}/functions/v1/api`;
};

const getOptionalApiKeyHeader = (): string => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) return '';
  const trimmed = anonKey.trim();
  if (!trimmed) return '';
  return trimmed;
};

const toBearerToken = (value: string): string => {
  return value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;
};

const isSessionExpiredOrNearExpiry = (expiresAt?: number): boolean => {
  if (!expiresAt) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= (nowSeconds + TOKEN_REFRESH_SAFETY_WINDOW_SECONDS);
};

const getUserAccessToken = async (): Promise<string> => {
  const supabase = requireSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData.session;

  const shouldRefresh = !session?.access_token || isSessionExpiredOrNearExpiry(session.expires_at);
  if (shouldRefresh) {
    const { data: refreshedData } = await supabase.auth.refreshSession();
    if (refreshedData.session?.access_token) {
      session = refreshedData.session;
    }
  }

  return session?.access_token ? toBearerToken(session.access_token) : '';
};

type ApiErrorPayload = { request_id?: string; ok?: boolean; code?: string; error?: string; details?: string };

const toApiPayload = (value: unknown): ApiErrorPayload | null => {
  if (!isRecord(value)) return null;
  return {
    request_id: readString(value, 'request_id') ?? undefined,
    ok: readBoolean(value, 'ok') ?? undefined,
    code: readString(value, 'code') ?? undefined,
    error: readString(value, 'error') ?? undefined,
    details: readString(value, 'details') ?? undefined
  };
};

export const safeInvoke = async <TResponse>(path: string, body: unknown, parseResponse: (payload: unknown) => TResponse): Promise<TResponse> => {
  return safeInvokeUrl(`${getApiBaseUrl()}${path}`, body, parseResponse);
};

const safeInvokeUrl = async <TResponse>(
  url: string,
  body: unknown,
  parseResponse: (payload: unknown) => TResponse
): Promise<TResponse> => {
  const userAuthHeader = await getUserAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKeyHeader = getOptionalApiKeyHeader();
  if (apiKeyHeader) {
    headers.apikey = apiKeyHeader;
  }
  if (userAuthHeader) {
    headers.Authorization = userAuthHeader;
  }

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (error) {
    throw createAppError({ code: 'NETWORK_ERROR', message: 'Impossible de joindre le serveur. Verifiez votre connexion.', source: 'network', cause: error });
  }

  let payload: unknown = null;
  try { payload = await response.json(); } catch { payload = null; }

  const apiPayload = toApiPayload(payload);
  if (!apiPayload) throw mapEdgeError(null, 'Reponse serveur invalide.', response.status);
  if (!response.ok || apiPayload.ok === false) throw mapEdgeError(apiPayload, 'Erreur serveur.', response.status);
  return parseResponse(payload);
};
