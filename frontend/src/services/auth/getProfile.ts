import { UserRole } from '@/types';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';
import { isUserRole } from '@/utils/typeGuards';

export type UserProfile = { id: string; email: string; display_name: string | null; role: UserRole; must_change_password: boolean; password_changed_at: string | null };

export async function getProfile(): Promise<UserProfile> {
  const supabase = requireSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw mapSupabaseAuthError(userError, 'Impossible de lire l’utilisateur.');
  if (!user) throw createAppError({ code: 'AUTH_REQUIRED', message: 'Utilisateur non authentifie.', source: 'auth' });

  const { data, error, status } = await supabase.from('profiles').select('id, email, display_name, role, must_change_password, password_changed_at').eq('id', user.id).single();
  if (error || !data) {
    if (error) throw mapPostgrestError(error, { operation: 'read', resource: 'le profil', status });
    throw createAppError({ code: 'PROFILE_NOT_FOUND', message: 'Profil introuvable.', source: 'db' });
  }

  if (!isUserRole(data.role)) throw createAppError({ code: 'DB_READ_FAILED', message: 'Profil invalide.', source: 'db' });
  return { id: data.id, email: data.email, display_name: data.display_name, role: data.role, must_change_password: Boolean(data.must_change_password), password_changed_at: data.password_changed_at };
}
