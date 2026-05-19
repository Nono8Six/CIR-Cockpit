import { describe, expect, it } from 'vitest';

import { convertClientSchema } from '../entity/convert-client.schema.ts';

describe('convertClientSchema', () => {
  it('accepts valid payload', () => {
    const result = convertClientSchema.safeParse({
      client_number: '1234',
      account_type: 'term'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid client number', () => {
    const result = convertClientSchema.safeParse({
      client_number: 'abcd',
      account_type: 'cash'
    });

    expect(result.success).toBe(false);
  });
});
