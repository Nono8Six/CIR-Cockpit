import { Session } from '@supabase/supabase-js';

import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

export const getSession = async (): Promise<Session | null> => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw mapSupabaseAuthError(error, 'Impossible de lire la session.');
  }
  return data.session ?? null;
};
