import { describe, expect, it } from 'vitest';

import { memoryStorage } from '@/services/supabase/memoryStorage';

describe('memoryStorage', () => {
  it('stores and clears values', () => {
    memoryStorage.setItem('key', 'value');
    expect(memoryStorage.getItem('key')).toBe('value');
    memoryStorage.removeItem('key');
    expect(memoryStorage.getItem('key')).toBeNull();
  });
});
