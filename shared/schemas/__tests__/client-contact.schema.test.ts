import { describe, expect, it } from 'vitest';

import { clientContactFormSchema } from '../client-contact.schema';

describe('clientContactFormSchema', () => {
  it('rejects when phone and email are missing', () => {
    const result = clientContactFormSchema.safeParse({
      first_name: 'Jean',
      last_name: 'Dupont',
      email: '',
      phone: ''
    });

    expect(result.success).toBe(false);
  });

  it('accepts when email is provided', () => {
    const result = clientContactFormSchema.safeParse({
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@example.com',
      phone: ''
    });

    expect(result.success).toBe(true);
  });
});
