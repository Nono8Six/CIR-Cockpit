import { RPC_POST_PATHS, type AppType, type RpcPost } from '../../../../shared/api/generated/rpc-app';
import { createAppError } from '@/services/errors/AppError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

const TOKEN_REFRESH_SAFETY_WINDOW_SECONDS = 30;
export type RpcClient = AppType;

const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw createAppError({
      code: 'CONFIG_INVALID',
      message: 'Configuration invalide.',
      source: 'client'
    });
  }
  return `${baseUrl}/functions/v1/api`;
};

const getOptionalApiKeyHeader = (): string => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return '';
  }
  return anonKey.trim();
};

const toBearerToken = (value: string): string =>
  value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;

const isSessionExpiredOrNearExpiry = (expiresAt?: number): boolean => {
  if (!expiresAt) {
    return true;
  }
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

const createRpcClientDefaultHeaders = (): Record<string, string> => {
  const apiKey = getOptionalApiKeyHeader();
  if (!apiKey) {
    return {};
  }
  return { apikey: apiKey };
};

const createRpcPost = (path: string): RpcPost =>
  async (request, init) => {
    const headers = new Headers(createRpcClientDefaultHeaders());
    const initHeaders = new Headers(init?.headers);
    initHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const body = request.json === undefined ? undefined : JSON.stringify(request.json);
    return fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      method: 'POST',
      headers,
      body
    });
  };

export const rpcClient: RpcClient = {
  data: {
    profile: { $post: createRpcPost(RPC_POST_PATHS.data.profile) },
    config: { $post: createRpcPost(RPC_POST_PATHS.data.config) },
    entities: { $post: createRpcPost(RPC_POST_PATHS.data.entities) },
    'entity-contacts': { $post: createRpcPost(RPC_POST_PATHS.data['entity-contacts']) },
    interactions: { $post: createRpcPost(RPC_POST_PATHS.data.interactions) }
  },
  admin: {
    users: { $post: createRpcPost(RPC_POST_PATHS.admin.users) },
    agencies: { $post: createRpcPost(RPC_POST_PATHS.admin.agencies) }
  }
};

export const buildRpcRequestInit = async (
  init?: RequestInit
): Promise<RequestInit> => {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  const token = await getUserAccessToken();
  if (token) {
    headers.set('Authorization', token);
  }

  return {
    ...init,
    headers
  };
};
