import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';
import {
  createTrpcResponseParser,
  invokeTrpc,
  withInvalidTrpcResponse
} from '@/services/api/invokeTrpc';
import { buildRpcRequestInit, createTrpcCallOptions, getTrpcClient } from '@/services/api/trpcClient';
import { z } from 'zod';

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
      z.object({
        ok: z.literal(true),
        payload: z.object({ id: z.string() })
      }).strict(),
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
        z.object({ ok: z.boolean() }),
        'Fallback'
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });

    await expect(
      invokeTrpc(
        async () => ({
          ok: false,
          error: 'Erreur serveur'
        }),
        z.object({ ok: z.literal(true) }),
        'Fallback'
      )
    ).rejects.toMatchObject({ code: 'EDGE_FUNCTION_ERROR' });
  });

  it('centralizes schema errors while preserving domain-specific metadata and transformations', async () => {
    const responseSchema = z.object({
      ok: z.literal(true),
      value: z.number()
    }).strict();

    await expect(
      invokeTrpc(
        async () => ({ ok: true, value: 'invalid' }),
        withInvalidTrpcResponse(responseSchema, {
          code: 'CONFIGURATOR_OUTPUT_INVALID',
          message: 'Réponse configurateur invalide.'
        }),
        'Fallback'
      )
    ).rejects.toMatchObject({
      code: 'CONFIGURATOR_OUTPUT_INVALID',
      message: 'Réponse configurateur invalide.'
    });

    const value = await invokeTrpc(
      async () => ({ ok: true, value: 21 }),
      createTrpcResponseParser(responseSchema, (response) => response.value * 2),
      'Fallback'
    );

    expect(value).toBe(42);
  });

  it('maps thrown network errors and keeps AppError untouched', async () => {
    await expect(
      invokeTrpc(
        async () => {
          throw new Error('fetch failed');
        },
        z.object({ ok: z.literal(true) }),
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
        z.object({ ok: z.literal(true) }),
        'Fallback'
      )
    ).rejects.toBe(appError);
  });

  it('returns ResultAsync success and failure for safeTrpc', async () => {
    const success = await safeTrpc(
      async () => ({ ok: true, value: 42 }),
      z.object({ ok: z.literal(true), value: z.number() }).transform(({ value }) => value),
      'Fallback'
    ).match(
      (result) => result,
      () => null
    );

    const errorCode = await safeTrpc(
      async () => {
        throw new Error('network down');
      },
      z.object({ ok: z.literal(true) }),
      'Fallback'
    ).match(
      () => '',
      (error) => error.code
    );

    expect(success).toBe(42);
    expect(errorCode).toBe('NETWORK_ERROR');
  });
});
