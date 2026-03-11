import { describe, expect, it } from 'vitest';

import { resolveSupabaseAuthStorage } from '@/services/supabase/getSupabaseClient';
import { memoryStorage } from '@/services/supabase/memoryStorage';

describe('memoryStorage', () => {
  it('stores and clears values', () => {
    memoryStorage.setItem('key', 'value');
    expect(memoryStorage.getItem('key')).toBe('value');
    memoryStorage.removeItem('key');
    expect(memoryStorage.getItem('key')).toBeNull();
  });

  it('uses in-memory storage in test mode', () => {
    const browserStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };

    expect(resolveSupabaseAuthStorage('test', browserStorage)).toBe(memoryStorage);
  });

  it('uses browser storage outside test mode when available', () => {
    const browserStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };

    expect(resolveSupabaseAuthStorage('production', browserStorage)).toBe(browserStorage);
  });

  it('falls back to in-memory storage outside test mode when browser storage is unavailable', () => {
    expect(resolveSupabaseAuthStorage('production', null)).toBe(memoryStorage);
  });
});
