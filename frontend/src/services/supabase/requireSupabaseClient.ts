import { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from './getSupabaseClient';
import { Database } from '@/types/supabase';
import { createAppError } from '@/services/errors/AppError';

export const requireSupabaseClient = (): SupabaseClient<Database> => {
  const client = getSupabaseClient();
  if (!client) {
    throw createAppError({
      code: 'CLIENT_NOT_CONFIGURED',
      message: 'Client Supabase non configure.',
      source: 'client'
    });
  }
  return client;
};
