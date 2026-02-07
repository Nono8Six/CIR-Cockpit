import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';

export async function setProfilePasswordChanged(): Promise<void> {
  const supabase = requireSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw mapSupabaseAuthError(userError, 'Impossible de lire l’utilisateur.');
  }

  if (!user) {
    throw createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Utilisateur non authentifie.',
      source: 'auth'
    });
  }

  const { error, status } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);

  if (error) {
    throw mapPostgrestError(error, { operation: 'write', resource: 'le profil', status });
  }
}
