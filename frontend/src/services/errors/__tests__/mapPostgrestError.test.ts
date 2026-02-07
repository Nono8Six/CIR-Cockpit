import { describe, expect, it } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';

import { mapPostgrestError } from '@/services/errors/mapPostgrestError';

const makePostgrestError = (message = 'db failed'): PostgrestError =>
  ({
    message,
    details: '',
    hint: '',
    code: 'P0001'
  }) as PostgrestError;

describe('mapPostgrestError', () => {
  it('maps 409 to CONFLICT', () => {
    const result = mapPostgrestError(makePostgrestError(), {
      operation: 'write',
      resource: 'les interactions',
      status: 409
    });
    expect(result.code).toBe('CONFLICT');
  });

  it('maps 404 to NOT_FOUND', () => {
    const result = mapPostgrestError(makePostgrestError(), {
      operation: 'read',
      resource: 'les statuts',
      status: 404
    });
    expect(result.code).toBe('NOT_FOUND');
  });

  it('falls back to DB_READ_FAILED', () => {
    const result = mapPostgrestError(makePostgrestError(), {
      operation: 'read',
      resource: 'les services',
      status: 500
    });
    expect(result.code).toBe('DB_READ_FAILED');
  });
});
