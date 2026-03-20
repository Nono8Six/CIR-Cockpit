import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';
import { memoryStorage } from './memoryStorage';

type SupabaseAuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type SupabaseClientFactory = (
  supabaseUrl: string,
  supabaseAnonKey: string,
  authStorage: SupabaseAuthStorage
) => SupabaseClient<Database>;
type GlobalWithSupabaseClient = typeof globalThis & {
  __cirSupabaseClient__?: SupabaseClient<Database> | null;
};

type InitializeSupabaseClientArgs = {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  runtimeMode: string;
  browserStorage: SupabaseAuthStorage | null;
  globalObject?: typeof globalThis;
  createClientInstance?: SupabaseClientFactory;
};

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

const createSupabaseClientInstance: SupabaseClientFactory = (
  supabaseUrl,
  supabaseAnonKey,
  authStorage
) =>
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: authStorage
    }
  });

const getGlobalSupabaseClientStore = (
  globalObject: typeof globalThis = globalThis
): GlobalWithSupabaseClient => globalObject as GlobalWithSupabaseClient;

export const initializeSupabaseClient = ({
  supabaseUrl,
  supabaseAnonKey,
  runtimeMode,
  browserStorage,
  globalObject = globalThis,
  createClientInstance = createSupabaseClientInstance
}: InitializeSupabaseClientArgs): SupabaseClient<Database> | null => {
  const globalStore = getGlobalSupabaseClientStore(globalObject);
  if (globalStore.__cirSupabaseClient__ !== undefined) {
    return globalStore.__cirSupabaseClient__;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authStorage = resolveSupabaseAuthStorage(runtimeMode, browserStorage);
  const client = createClientInstance(supabaseUrl, supabaseAnonKey, authStorage);
  globalStore.__cirSupabaseClient__ = client;
  return client;
};

const supabase = initializeSupabaseClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  runtimeMode: import.meta.env.MODE,
  browserStorage: getBrowserLocalStorage()
});

export const getSupabaseClient = (): SupabaseClient<Database> | null => supabase;
