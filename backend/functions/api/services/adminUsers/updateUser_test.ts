import { assertEquals } from 'std/assert';

import type { Database } from '../../../../../shared/supabase.types.ts';
import { sanitizeProfileUpdates } from './updateUser.ts';

Deno.test('sanitizeProfileUpdates removes undefined values', () => {
  const updates: Partial<Database['public']['Tables']['profiles']['Update']> = {
    first_name: 'Alice',
    last_name: undefined,
    display_name: 'Alice Martin'
  };

  assertEquals(sanitizeProfileUpdates(updates), {
    first_name: 'Alice',
    display_name: 'Alice Martin'
  });
});
