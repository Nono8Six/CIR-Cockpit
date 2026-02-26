import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

import { createAppError } from '@/services/errors/AppError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord } from '@/utils/recordNarrowing';

const TOKEN_REFRESH_SAFETY_WINDOW_SECONDS = 30;

const getTrpcBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw createAppError({
      code: 'CONFIG_INVALID',
      message: 'Configuration invalide.',
      source: 'client'
    });
  }
  return `${baseUrl}/functions/v1/api/trpc`;
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

const readContextHeaders = (context: unknown): Headers => {
  if (!isRecord(context)) {
    return new Headers();
  }

  const value = context.headers;
  if (!value) {
    return new Headers();
  }

  if (value instanceof Headers) {
    return new Headers(value);
  }
  if (Array.isArray(value)) {
    const tuples = value.filter(
      (entry): entry is [string, string] =>
        Array.isArray(entry)
        && entry.length === 2
        && typeof entry[0] === 'string'
        && typeof entry[1] === 'string'
    );
    return new Headers(tuples);
  }
  if (isRecord(value)) {
    const headers = new Headers();
    Object.entries(value).forEach(([key, entryValue]) => {
      if (typeof entryValue === 'string') {
        headers.set(key, entryValue);
      }
    });
    return headers;
  }

  return new Headers();
};

const createDefaultHeaders = (): Headers => {
  const headers = new Headers();
  const apiKey = getOptionalApiKeyHeader();
  if (apiKey) {
    headers.set('apikey', apiKey);
  }
  return headers;
};

let trpcClient: ReturnType<typeof createTRPCUntypedClient<AnyRouter>> | null = null;

const getTrpcClient = () => {
  if (trpcClient) {
    return trpcClient;
  }

  trpcClient = createTRPCUntypedClient<AnyRouter>({
    links: [
      httpBatchLink({
        url: getTrpcBaseUrl(),
        headers: async ({ opList }) => {
          const headers = createDefaultHeaders();
          const token = await getUserAccessToken();
          if (token) {
            headers.set('Authorization', token);
          }

          for (const operation of opList) {
            const operationHeaders = readContextHeaders(operation.context);
            operationHeaders.forEach((value, key) => {
              headers.set(key, value);
            });
          }

          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }

          return Object.fromEntries(headers.entries());
        }
      })
    ]
  });

  return trpcClient;
};

export const callTrpcMutation = (
  path: string,
  input: unknown,
  init?: RequestInit
): Promise<unknown> =>
  getTrpcClient().mutation(path, input, {
    context: init?.headers ? { headers: init.headers } : undefined
  });

export const buildRpcRequestInit = async (
  init?: RequestInit
): Promise<RequestInit> => {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  return {
    ...init,
    headers
  };
};
