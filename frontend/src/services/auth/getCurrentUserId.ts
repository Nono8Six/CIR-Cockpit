import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { createAppError } from '@/services/errors/AppError';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

export const getCurrentUserId = async (): Promise<string> => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw mapSupabaseAuthError(error, 'Impossible de lire l’utilisateur.');
  }
  if (!data?.user?.id) {
    throw createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Utilisateur non authentifie.',
      source: 'auth'
    });
  }
  return data.user.id;
};
