import { Session } from '@supabase/supabase-js';

import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';
import { createAppError } from '@/services/errors/AppError';

type SignInCredentials = {
  email: string;
  password: string;
};

export const signInWithPassword = async (credentials: SignInCredentials): Promise<Session> => {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    throw mapSupabaseAuthError(error);
  }
  if (!data.session) {
    throw createAppError({
      code: 'AUTH_ERROR',
      message: 'Impossible de demarrer la session.',
      source: 'auth'
    });
  }
  return data.session;
};
