import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

export async function updateUserPassword(newPassword: string): Promise<void> {
  const supabase = requireSupabaseClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw mapSupabaseAuthError(error, 'Impossible de changer le mot de passe.');
  }
}
