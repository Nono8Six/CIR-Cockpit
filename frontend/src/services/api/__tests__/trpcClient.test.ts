import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');

const mockRequireSupabase = vi.mocked(requireSupabaseClient);

const makeSession = (accessToken: string, expiresAt: number) => ({
  access_token: accessToken,
  expires_at: expiresAt
});

const makeTrpcSuccessResponse = (data: unknown): Response =>
  new Response(
    JSON.stringify({
      result: { data }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

describe('trpcClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends request to /trpc with auth and contextual headers', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8787');

    const nowSeconds = Math.floor(Date.now() / 1000);
    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('token-123', nowSeconds + 3600) }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeTrpcSuccessResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    const result = await module.getTrpcClient().data.profile.mutate(
      { action: 'password_changed' },
      module.createTrpcCallOptions({ headers: { 'x-request-id': 'req-1' } })
    );

    expect(result).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('http://127.0.0.1:8787/trpc/data.profile');
    expect(url).not.toContain('batch=1');

    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-123');
    expect(headers.get('x-request-id')).toBe('req-1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('refreshes session when token is near expiry', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const nowSeconds = Math.floor(Date.now() / 1000);
    const refreshSession = vi.fn().mockResolvedValue({
      data: { session: makeSession('token-refreshed', nowSeconds + 3600) }
    });

    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('token-old', nowSeconds + 5) }
        }),
        refreshSession
      }
    } as never);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeTrpcSuccessResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    await module.getTrpcClient().data.profile.mutate({ action: 'password_changed' });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-refreshed');
  });

  it('uses VITE_API_URL when provided', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.cir.test');

    const nowSeconds = Math.floor(Date.now() / 1000);
    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('token-url', nowSeconds + 3600) }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeTrpcSuccessResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    await module.getTrpcClient().data.profile.mutate({ action: 'password_changed' });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('http://api.cir.test/trpc/data.profile');
  });

  it('reuses cached client instance across calls', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const nowSeconds = Math.floor(Date.now() / 1000);
    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('token-cache', nowSeconds + 3600) }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeTrpcSuccessResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    await module.getTrpcClient().data.profile.mutate({ action: 'password_changed' });
    await module.getTrpcClient().data.profile.mutate(
      { action: 'password_changed' },
      module.createTrpcCallOptions({ headers: new Headers([['x-request-id', 'req-cache']]) })
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('buildRpcRequestInit enforces JSON content type and keeps custom headers', async () => {
    const module = await import('../trpcClient');

    const init = await module.buildRpcRequestInit({
      method: 'POST',
      headers: {
        'x-request-id': 'req-3'
      }
    });

    const headers = new Headers(init.headers);
    expect(init.method).toBe('POST');
    expect(headers.get('x-request-id')).toBe('req-3');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('supports tuple headers and keeps existing bearer token', async () => {

    const nowSeconds = Math.floor(Date.now() / 1000);
    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('Bearer token-inline', nowSeconds + 3600) }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(makeTrpcSuccessResponse({ ok: true }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    await module.getTrpcClient().data.profile.mutate(
      { action: 'password_changed' },
      module.createTrpcCallOptions({ headers: [['x-request-id', 'req-array']] })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-inline');
    expect(headers.get('x-request-id')).toBe('req-array');
  });
});
