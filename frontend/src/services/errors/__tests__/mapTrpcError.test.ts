import { describe, expect, it } from 'vitest';
import { TRPCClientError } from '@trpc/client';

import { mapTrpcError } from '@/services/errors/mapTrpcError';

const createTrpcError = (
  message: string,
  data: Record<string, unknown>
): TRPCClientError<never> =>
  TRPCClientError.from({
    error: {
      code: -32000,
      message,
      data
    }
  });

describe('mapTrpcError', () => {
  it('maps non-trpc network errors to NETWORK_ERROR', () => {
    const mapped = mapTrpcError(new Error('fetch failed'), 'Fallback');
    expect(mapped.code).toBe('NETWORK_ERROR');
    expect(mapped.source).toBe('network');
  });

  it('maps non-trpc generic errors to REQUEST_FAILED', () => {
    const mapped = mapTrpcError(new Error('unexpected'), 'Fallback');
    expect(mapped.code).toBe('REQUEST_FAILED');
    expect(mapped.message).toBe('Fallback');
  });

  it('uses appCode when provided by tRPC error data', () => {
    const mapped = mapTrpcError(
      createTrpcError('Interdit', {
        appCode: 'AUTH_FORBIDDEN',
        httpStatus: 403,
        requestId: 'req-1',
        details: 'forbidden'
      }),
      'Fallback'
    );

    expect(mapped.code).toBe('AUTH_FORBIDDEN');
    expect(mapped.status).toBe(403);
    expect(mapped.requestId).toBe('req-1');
    expect(mapped.details).toBe('forbidden');
  });

  it('falls back to status mapping when appCode is missing', () => {
    const mapped = mapTrpcError(
      createTrpcError('Introuvable', {
        httpStatus: 404
      }),
      'Fallback'
    );

    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.status).toBe(404);
  });

  it('maps 413 status to PAYLOAD_TOO_LARGE when appCode is missing', () => {
    const mapped = mapTrpcError(
      createTrpcError('Payload trop volumineux', {
        httpStatus: 413
      }),
      'Fallback'
    );

    expect(mapped.code).toBe('PAYLOAD_TOO_LARGE');
    expect(mapped.status).toBe(413);
  });
});
