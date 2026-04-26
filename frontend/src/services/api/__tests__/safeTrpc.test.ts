import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc, safeTrpc } from '@/services/api/safeTrpc';
import { buildRpcRequestInit, createTrpcCallOptions, getTrpcClient } from '@/services/api/trpcClient';

const mockTrpcClient = {
  data: {},
  admin: {},
  config: {},
  cockpit: {},
  directory: {}
};

vi.mock('../trpcClient', () => ({
  buildRpcRequestInit: vi.fn(async () => ({
    headers: { Authorization: 'Bearer token-1' }
  })),
  createTrpcCallOptions: vi.fn(() => ({ context: { headers: { Authorization: 'Bearer token-1' } } })),
  getTrpcClient: vi.fn(() => mockTrpcClient)
}));

const mockBuildRpcRequestInit = vi.mocked(buildRpcRequestInit);
const mockCreateTrpcCallOptions = vi.mocked(createTrpcCallOptions);
const mockGetTrpcClient = vi.mocked(getTrpcClient);

describe('safeTrpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed payload when rpc call succeeds', async () => {
    const value = await invokeTrpc(
      async () => ({
        ok: true,
        payload: { id: 'item-1' }
      }),
      (payload) => payload,
      'Fallback'
    );

    expect(mockBuildRpcRequestInit).toHaveBeenCalledTimes(1);
    expect(mockCreateTrpcCallOptions).toHaveBeenCalledTimes(1);
    expect(mockGetTrpcClient).toHaveBeenCalledTimes(1);
    expect(value).toMatchObject({
      ok: true,
      payload: { id: 'item-1' }
    });
  });

  it('rejects invalid payload formats and ok=false payloads', async () => {
    await expect(
      invokeTrpc(
        async () => null,
        (payload) => payload,
        'Fallback'
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });

    await expect(
      invokeTrpc(
        async () => ({
          ok: false,
          error: 'Erreur serveur'
        }),
        (payload) => payload,
        'Fallback'
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });
  });

  it('maps thrown network errors and keeps AppError untouched', async () => {
    await expect(
      invokeTrpc(
        async () => {
          throw new Error('fetch failed');
        },
        (payload) => payload,
        'Fallback'
      )
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    const appError = createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Auth requise.',
      source: 'edge'
    });
    await expect(
      invokeTrpc(
        async () => {
          throw appError;
        },
        (payload) => payload,
        'Fallback'
      )
    ).rejects.toBe(appError);
  });

  it('returns ResultAsync success and failure for safeTrpc', async () => {
    const success = await safeTrpc(
      async () => ({ ok: true, value: 42 }),
      (payload) => (typeof payload === 'object' && payload ? Reflect.get(payload, 'value') : null),
      'Fallback'
    ).match(
      (result) => result,
      () => null
    );

    const errorCode = await safeTrpc(
      async () => {
        throw new Error('network down');
      },
      (payload) => payload,
      'Fallback'
    ).match(
      () => '',
      (error) => error.code
    );

    expect(success).toBe(42);
    expect(errorCode).toBe('NETWORK_ERROR');
  });
});
