import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { normalizeError } from '@/services/errors/normalizeError';

describe('normalizeError', () => {
  it('maps ZodError to validation error', () => {
    const schema = z.object({ name: z.string().min(1, 'Nom requis') });
    const parsed = schema.safeParse({ name: '' });
    if (parsed.success) {
      throw new Error('Expected validation failure');
    }
    const appError = normalizeError(parsed.error, 'Fallback');
    expect(appError.code).toBe('VALIDATION_ERROR');
    expect(appError.details).toContain('name');
  });
});
