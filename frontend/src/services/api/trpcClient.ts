import { createTRPCClient, httpLink } from '@trpc/client';

import type { AppRouter } from 'shared/api/trpc.generated';

import { createAppError } from '@/services/errors/AppError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord } from '@/utils/recordNarrowing/isRecord';

const TOKEN_REFRESH_SAFETY_WINDOW_SECONDS = 30;

const getTrpcBaseUrl = (): string => {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    return '/trpc';
  }

  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredApiUrl) {
    return `${configuredApiUrl.replace(/\/+$/, '')}/trpc`;
  }

  if (import.meta.env.MODE === 'test') {
    return 'http://127.0.0.1:8787/trpc';
  }

  throw createAppError({
    code: 'CONFIG_INVALID',
    message: 'Configuration invalide.',
    source: 'client'
  });
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

const createDefaultHeaders = (): Headers => new Headers();

export type TrpcClient = ReturnType<typeof createTRPCClient<AppRouter>>;

let trpcClient: TrpcClient | null = null;

export const getTrpcClient = (): TrpcClient => {
  if (trpcClient) {
    return trpcClient;
  }

  trpcClient = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: getTrpcBaseUrl(),
        headers: async ({ op }) => {
          const headers = createDefaultHeaders();
          const token = await getUserAccessToken();
          if (token) {
            headers.set('Authorization', token);
          }

          const operationHeaders = readContextHeaders(op.context);
          operationHeaders.forEach((value, key) => {
            headers.set(key, value);
          });

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

export const createTrpcCallOptions = (
  init?: RequestInit
): { context?: { headers: HeadersInit } } =>
  init?.headers ? { context: { headers: init.headers } } : {};

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
