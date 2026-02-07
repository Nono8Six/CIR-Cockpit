import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';
import { memoryStorage } from './memoryStorage';

let supabase: SupabaseClient<Database> | null = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: memoryStorage
    }
  });
}

export const getSupabaseClient = (): SupabaseClient | null => supabase;
