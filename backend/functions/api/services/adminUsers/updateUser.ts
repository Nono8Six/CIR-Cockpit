import { and, eq, inArray } from 'drizzle-orm';

import { agency_members, profiles } from '../../../../drizzle/schema.ts';
import type { Database } from '../../../../../shared/supabase.types.ts';
import type { DbClient } from '../../types.ts';
import { getSupabaseAdmin } from '../../middleware/auth.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { buildDisplayName } from './validators.ts';
import { getErrorDetails, getProfileByEmail, listMemberships } from './queryUsers.ts';

export type MembershipMode = 'replace' | 'add' | 'remove';

export const sanitizeProfileUpdates = (
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
): Partial<Database['public']['Tables']['profiles']['Update']> => {
  return Object.entries(updates).reduce<Partial<Database['public']['Tables']['profiles']['Update']>>((acc, [key, value]) => {
    if (value !== undefined) {
      Object.assign(acc, { [key]: value });
    }
    return acc;
  }, {});
};

export const updateProfile = async (
  db: DbClient,
  userId: string,
  updates: Partial<Database['public']['Tables']['profiles']['Update']>
): Promise<void> => {
  const cleaned = sanitizeProfileUpdates(updates);
  if (Object.keys(cleaned).length === 0) return;

  try {
    await db
      .update(profiles)
      .set(cleaned)
      .where(eq(profiles.id, userId));
  } catch (error) {
    throw httpError(500, 'PROFILE_UPDATE_FAILED', getErrorDetails(error) ?? 'Impossible de mettre a jour le profil.');
  }
};

export const applyMemberships = async (
  db: DbClient,
  userId: string,
  agencyIds: string[],
  mode: MembershipMode
): Promise<string[]> => {
  if (mode === 'remove') {
    if (agencyIds.length === 0) return listMemberships(db, userId);

    try {
      await db
        .delete(agency_members)
        .where(and(
          eq(agency_members.user_id, userId),
          inArray(agency_members.agency_id, agencyIds)
        ));
    } catch (error) {
      throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', getErrorDetails(error) ?? 'Impossible de supprimer les appartenances.');
    }

    return listMemberships(db, userId);
  }

  if (agencyIds.length > 0) {
    const rows = agencyIds.map((agencyId) => ({ agency_id: agencyId, user_id: userId }));
    try {
      await db
        .insert(agency_members)
        .values(rows)
        .onConflictDoNothing({ target: [agency_members.agency_id, agency_members.user_id] });
    } catch (error) {
      throw httpError(500, 'MEMBERSHIP_UPSERT_FAILED', getErrorDetails(error) ?? 'Impossible de mettre a jour les appartenances.');
    }
  }

  if (mode === 'replace') {
    if (agencyIds.length === 0) {
      try {
        await db
          .delete(agency_members)
          .where(eq(agency_members.user_id, userId));
      } catch (error) {
        throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', getErrorDetails(error) ?? 'Impossible de supprimer les appartenances.');
      }

      return [];
    }

    const currentIds = await listMemberships(db, userId);
    const toDelete = currentIds.filter((currentId) => !agencyIds.includes(currentId));
    if (toDelete.length > 0) {
      try {
        await db
          .delete(agency_members)
          .where(and(
            eq(agency_members.user_id, userId),
            inArray(agency_members.agency_id, toDelete)
          ));
      } catch (error) {
        throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', getErrorDetails(error) ?? 'Impossible de supprimer les appartenances.');
      }
    }
  }

  return listMemberships(db, userId);
};

export const updateAuthPassword = async (userId: string, password: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, { password });
  if (error) {
    throw httpError(400, 'PASSWORD_RESET_FAILED', error.message);
  }
};

export const updateAuthBan = async (userId: string, bannedUntil: string | null): Promise<void> => {
  const payload: Record<string, unknown> = { banned_until: bannedUntil };
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, payload);

  if (error) {
    throw httpError(400, 'USER_UPDATE_FAILED', error.message);
  }
};

export const ensureEmailAvailableForUser = async (
  db: DbClient,
  userId: string,
  email: string
): Promise<void> => {
  const existing = await getProfileByEmail(db, email);
  if (existing && existing.id !== userId) {
    throw httpError(409, 'CONFLICT', 'Cet email est deja utilise.');
  }
};

export const updateAuthIdentity = async (
  userId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> => {
  const displayName = buildDisplayName(lastName, firstName);
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: displayName
    }
  });

  if (!error) return;

  const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const message = error.message.toLowerCase();

  if (errorStatus === 404 || message.includes('not found')) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  if (errorStatus === 409 || message.includes('already')) {
    throw httpError(409, 'CONFLICT', 'Cet email est deja utilise.');
  }
  throw httpError(400, 'USER_UPDATE_FAILED', error.message);
};
