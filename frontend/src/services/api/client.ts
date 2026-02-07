import { createAppError } from '@/services/errors/AppError';
import { mapEdgeError } from '@/services/errors/mapEdgeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readBoolean, readString } from '@/utils/recordNarrowing';

const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) throw createAppError({ code: 'CONFIG_INVALID', message: 'Configuration invalide.', source: 'client' });
  return `${baseUrl}/functions/v1/api`;
};

const getAnonKey = (): string => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) throw createAppError({ code: 'CONFIG_MISSING', message: 'Configuration invalide.', source: 'client' });
  return anonKey;
};

const getAuthHeader = async (): Promise<string> => {
  const supabase = requireSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? `Bearer ${data.session.access_token}` : '';
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
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: getAnonKey() };
  if (authHeader) headers.Authorization = authHeader;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
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
