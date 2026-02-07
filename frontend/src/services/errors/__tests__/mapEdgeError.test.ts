import { describe, expect, it } from 'vitest';

import { mapEdgeError } from '@/services/errors/mapEdgeError';

describe('mapEdgeError', () => {
  it('uses payload.code when available', () => {
    const result = mapEdgeError(
      { code: 'RATE_LIMITED', error: 'Too many requests', request_id: 'req-1' },
      'Fallback message',
      429
    );
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.message).toBe('Too many requests');
    expect(result.requestId).toBe('req-1');
  });

  it('falls back to statusMap when payload has no code', () => {
    const result = mapEdgeError(
      { error: 'Bad request' },
      'Fallback message',
      400
    );
    expect(result.code).toBe('INVALID_PAYLOAD');
    expect(result.message).toBe('Bad request');
  });

  it('maps 401 to AUTH_REQUIRED', () => {
    const result = mapEdgeError(null, 'Fallback', 401);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.message).toBe('Fallback');
  });

  it('maps 403 to AUTH_FORBIDDEN', () => {
    const result = mapEdgeError(null, 'Fallback', 403);
    expect(result.code).toBe('AUTH_FORBIDDEN');
  });

  it('maps 404 to NOT_FOUND', () => {
    const result = mapEdgeError(null, 'Fallback', 404);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('maps 409 to CONFLICT', () => {
    const result = mapEdgeError(null, 'Fallback', 409);
    expect(result.code).toBe('CONFLICT');
  });

  it('maps 429 to RATE_LIMIT', () => {
    const result = mapEdgeError(null, 'Fallback', 429);
    expect(result.code).toBe('RATE_LIMIT');
  });

  it('maps 500 to EDGE_FUNCTION_ERROR', () => {
    const result = mapEdgeError(null, 'Fallback', 500);
    expect(result.code).toBe('EDGE_FUNCTION_ERROR');
  });

  it('maps 502/503 to REQUEST_FAILED', () => {
    expect(mapEdgeError(null, 'Fallback', 502).code).toBe('REQUEST_FAILED');
    expect(mapEdgeError(null, 'Fallback', 503).code).toBe('REQUEST_FAILED');
  });

  it('falls back to EDGE_FUNCTION_ERROR for unknown status', () => {
    const result = mapEdgeError(null, 'Fallback', 999);
    expect(result.code).toBe('EDGE_FUNCTION_ERROR');
    expect(result.message).toBe('Fallback');
  });

  it('falls back to EDGE_FUNCTION_ERROR when no status provided', () => {
    const result = mapEdgeError(null, 'Fallback');
    expect(result.code).toBe('EDGE_FUNCTION_ERROR');
  });

  it('propagates request_id from payload', () => {
    const result = mapEdgeError(
      { request_id: 'abc-123', error: 'fail' },
      'Fallback',
      500
    );
    expect(result.requestId).toBe('abc-123');
  });

  it('propagates details from payload', () => {
    const result = mapEdgeError(
      { error: 'fail', details: 'some detail' },
      'Fallback',
      500
    );
    expect(result.details).toBe('some detail');
  });

  it('sets source to edge', () => {
    const result = mapEdgeError(null, 'Fallback', 500);
    expect(result.source).toBe('edge');
  });
});
