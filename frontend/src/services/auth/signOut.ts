import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

export const signOut = async (): Promise<void> => {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw mapSupabaseAuthError(error, 'Impossible de se deconnecter.');
  }
};
