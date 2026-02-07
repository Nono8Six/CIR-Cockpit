import { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const supabase = requireSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
};
