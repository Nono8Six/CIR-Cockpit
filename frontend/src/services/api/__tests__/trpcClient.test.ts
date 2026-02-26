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

  it('sends request to /trpc with auth, apikey and contextual headers', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const nowSeconds = Math.floor(Date.now() / 1000);
    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: makeSession('token-123', nowSeconds + 3600) }
        }),
        refreshSession: vi.fn()
      }
    } as never);

    const fetchMock = vi.fn().mockResolvedValue(makeTrpcSuccessResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    const result = await module.callTrpcMutation(
      'data.entities',
      { action: 'save' },
      { headers: { 'x-request-id': 'req-1' } }
    );

    expect(result).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://demo.supabase.co/functions/v1/api/trpc/data.entities');
    expect(url).toContain('batch=1');

    const headers = new Headers(init.headers);
    expect(headers.get('apikey')).toBe('anon-key');
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

    const fetchMock = vi.fn().mockResolvedValue(makeTrpcSuccessResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('../trpcClient');
    await module.callTrpcMutation('data.profile', { action: 'password_changed' });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-refreshed');
  });

  it('throws CONFIG_INVALID when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');

    mockRequireSupabase.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null } })
      }
    } as never);

    const module = await import('../trpcClient');
    let error: unknown;
    try {
      await module.callTrpcMutation('data.config', { agency_id: 'agency-1' });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: 'CONFIG_INVALID' });
  });
});
