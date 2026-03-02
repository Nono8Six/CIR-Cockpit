import type { DbClient } from '../../types.ts';
import { getSupabaseAdmin } from '../../middleware/auth.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { buildDisplayName } from './validators.ts';
import { ensureProfileAvailable, getProfileByEmail } from './queryUsers.ts';

export const buildUserMetadata = (
  firstName: string,
  lastName: string
): { first_name: string; last_name: string; full_name?: string } => {
  const displayName = buildDisplayName(lastName, firstName);
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: displayName
  };
};

export const createUserAccount = async (
  db: DbClient,
  email: string,
  firstName: string,
  lastName: string,
  password?: string
): Promise<{ userId: string; state: 'created' | 'existing' }> => {
  const existing = await getProfileByEmail(db, email);
  if (existing) {
    return { userId: existing.id, state: 'existing' };
  }

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: buildUserMetadata(firstName, lastName)
  });

  if (error || !data?.user) {
    throw httpError(400, 'USER_CREATE_FAILED', error?.message ?? "Impossible de creer l'utilisateur.");
  }

  const profile = await ensureProfileAvailable(db, data.user.id);
  return { userId: profile.id, state: 'created' };
};
