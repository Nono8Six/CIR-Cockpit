import { describe, expect, it, vi } from 'vitest';

import {
  initializeSupabaseClient,
  resolveSupabaseAuthStorage
} from '@/services/supabase/getSupabaseClient';
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

  it('reuses the same Supabase client across repeated initializations', () => {
    const globalObject = {} as typeof globalThis & {
      __cirSupabaseClient__?: object | null;
    };
    const client = { auth: {} };
    const createClientInstance = vi.fn(() => client as never);

    const firstClient = initializeSupabaseClient({
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'anon-key',
      runtimeMode: 'development',
      browserStorage: null,
      globalObject,
      createClientInstance
    });
    const secondClient = initializeSupabaseClient({
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'anon-key',
      runtimeMode: 'development',
      browserStorage: null,
      globalObject,
      createClientInstance
    });

    expect(firstClient).toBe(client);
    expect(secondClient).toBe(client);
    expect(createClientInstance).toHaveBeenCalledTimes(1);
    expect(globalObject.__cirSupabaseClient__).toBe(client);
  });
});
