import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeRpc, safeRpc } from '@/services/api/safeRpc';
import { buildRpcRequestInit } from '@/services/api/rpcClient';

vi.mock('../rpcClient', () => ({
  buildRpcRequestInit: vi.fn(async () => ({
    headers: { Authorization: 'Bearer token-1' }
  })),
  rpcClient: {
    data: {},
    admin: {}
  }
}));

const mockBuildRpcRequestInit = vi.mocked(buildRpcRequestInit);

describe('safeRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed payload when rpc call succeeds', async () => {
    const value = await invokeRpc(
      async () => ({
        ok: true,
        payload: { id: 'item-1' }
      }),
      (payload) => payload
    );

    expect(mockBuildRpcRequestInit).toHaveBeenCalledTimes(1);
    expect(value).toMatchObject({
      ok: true,
      payload: { id: 'item-1' }
    });
  });

  it('rejects invalid payload formats and ok=false payloads', async () => {
    await expect(
      invokeRpc(
        async () => null,
        (payload) => payload
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });

    await expect(
      invokeRpc(
        async () => ({
          ok: false,
          error: 'Erreur serveur'
        }),
        (payload) => payload
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });
  });

  it('maps thrown network errors and keeps AppError untouched', async () => {
    await expect(
      invokeRpc(
        async () => {
          throw new Error('fetch failed');
        },
        (payload) => payload
      )
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    const appError = createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Auth requise.',
      source: 'edge'
    });
    await expect(
      invokeRpc(
        async () => {
          throw appError;
        },
        (payload) => payload
      )
    ).rejects.toBe(appError);
  });

  it('returns ResultAsync success and failure for safeRpc', async () => {
    const success = await safeRpc(
      async () => ({ ok: true, value: 42 }),
      (payload) => (typeof payload === 'object' && payload ? Reflect.get(payload, 'value') : null),
      'Fallback'
    ).match(
      (result) => result,
      () => null
    );

    const errorCode = await safeRpc(
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
