import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';
import { memoryStorage } from './memoryStorage';

type SupabaseAuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const getBrowserLocalStorage = (): SupabaseAuthStorage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const resolveSupabaseAuthStorage = (
  runtimeMode: string,
  browserStorage: SupabaseAuthStorage | null
): SupabaseAuthStorage => {
  if (runtimeMode === 'test') {
    return memoryStorage;
  }

  return browserStorage ?? memoryStorage;
};

let supabase: SupabaseClient<Database> | null = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseAnonKey) {
  const authStorage = resolveSupabaseAuthStorage(import.meta.env.MODE, getBrowserLocalStorage());
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: authStorage
    }
  });
}

export const getSupabaseClient = (): SupabaseClient | null => supabase;
