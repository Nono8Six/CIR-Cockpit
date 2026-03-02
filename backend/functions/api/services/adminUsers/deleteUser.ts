import { and, eq, isNull, sql } from 'drizzle-orm';

import { agency_system_users, interactions } from '../../../../drizzle/schema.ts';
import type { DbClient } from '../../types.ts';
import { getSupabaseAdmin } from '../../middleware/auth.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import {
  BANNED_UNTIL,
  SYSTEM_DEFAULT_FIRST_NAME,
  SYSTEM_EMAIL_DOMAIN,
  SYSTEM_LAST_NAME,
  SYSTEM_ORPHAN_FIRST_NAME,
  buildDisplayName,
  generateTempPassword,
  normalizePersonName
} from './validators.ts';
import {
  countUserInteractions,
  ensureProfileAvailable,
  getErrorDetails,
  getProfileByEmail,
  listUserInteractionOwnership,
  loadAgencyNames
} from './queryUsers.ts';
import { applyMemberships, updateAuthBan, updateProfile } from './updateUser.ts';

export type UserDeleteAnonymizationSummary = {
  reassignedCount: number;
  reassignedAgencyIds: string[];
  orphanReassignedCount: number;
};

export const buildAgencySystemEmail = (agencyId: string): string => {
  const normalizedId = agencyId.replaceAll('-', '');
  return `system+agency-${normalizedId}@${SYSTEM_EMAIL_DOMAIN}`;
};

export const buildOrphanSystemEmail = (): string => `system+orphan@${SYSTEM_EMAIL_DOMAIN}`;

const ensureSystemAuthUser = async (
  db: DbClient,
  email: string,
  firstName: string,
  lastName: string
): Promise<string> => {
  const existing = await getProfileByEmail(db, email);
  if (existing) return existing.id;

  const displayName = buildDisplayName(lastName, firstName);
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password: generateTempPassword(20),
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: displayName
    }
  });

  if (error || !data?.user) {
    const message = error?.message ?? 'Erreur inconnue.';
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
      const conflicted = await getProfileByEmail(db, email);
      if (conflicted) return conflicted.id;
    }

    throw httpError(500, 'SYSTEM_USER_PROVISION_FAILED', 'Impossible de creer le compte systeme.', message);
  }

  try {
    const profile = await ensureProfileAvailable(db, data.user.id);
    return profile.id;
  } catch (errorProfile) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de finaliser la creation du compte systeme.',
      getErrorDetails(errorProfile)
    );
  }
};

const ensureSystemProfileState = async (
  db: DbClient,
  userId: string,
  firstName: string,
  lastName: string,
  agencyId?: string
): Promise<void> => {
  try {
    await updateProfile(db, userId, {
      first_name: firstName,
      last_name: lastName,
      display_name: buildDisplayName(lastName, firstName),
      role: 'tcs',
      archived_at: null,
      must_change_password: false,
      is_system: true
    });

    if (agencyId) {
      await applyMemberships(db, userId, [agencyId], 'add');
    }

    await updateAuthBan(userId, BANNED_UNTIL);
  } catch (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de preparer le compte systeme.',
      getErrorDetails(error)
    );
  }
};

const getAgencySystemUserId = async (db: DbClient, agencyId: string): Promise<string | null> => {
  try {
    const rows = await db
      .select({ user_id: agency_system_users.user_id })
      .from(agency_system_users)
      .where(eq(agency_system_users.agency_id, agencyId))
      .limit(1);
    return rows[0]?.user_id ?? null;
  } catch (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      "Impossible de charger le compte systeme de l'agence.",
      getErrorDetails(error)
    );
  }
};

const upsertAgencySystemUser = async (db: DbClient, agencyId: string, userId: string): Promise<void> => {
  try {
    await db
      .insert(agency_system_users)
      .values({ agency_id: agencyId, user_id: userId })
      .onConflictDoUpdate({
        target: agency_system_users.agency_id,
        set: { user_id: sql`excluded.user_id` }
      });
  } catch (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      "Impossible d'associer le compte systeme a l'agence.",
      getErrorDetails(error)
    );
  }
};

const ensureAgencySystemUser = async (
  db: DbClient,
  agencyId: string,
  agencyName?: string
): Promise<string> => {
  const firstName = normalizePersonName(agencyName) ?? SYSTEM_DEFAULT_FIRST_NAME;
  const email = buildAgencySystemEmail(agencyId);
  const existingUserId = await getAgencySystemUserId(db, agencyId);

  if (existingUserId) {
    await ensureSystemProfileState(db, existingUserId, firstName, SYSTEM_LAST_NAME, agencyId);
    return existingUserId;
  }

  const provisionedUserId = await ensureSystemAuthUser(db, email, firstName, SYSTEM_LAST_NAME);

  await ensureSystemProfileState(db, provisionedUserId, firstName, SYSTEM_LAST_NAME, agencyId);
  await upsertAgencySystemUser(db, agencyId, provisionedUserId);

  const resolvedUserId = await getAgencySystemUserId(db, agencyId);
  if (!resolvedUserId) {
    throw httpError(500, 'SYSTEM_USER_NOT_FOUND', "Compte systeme introuvable pour l'agence.");
  }

  return resolvedUserId;
};

const ensureOrphanSystemUser = async (db: DbClient): Promise<string> => {
  const email = buildOrphanSystemEmail();
  const userId = await ensureSystemAuthUser(db, email, SYSTEM_ORPHAN_FIRST_NAME, SYSTEM_LAST_NAME);
  await ensureSystemProfileState(db, userId, SYSTEM_ORPHAN_FIRST_NAME, SYSTEM_LAST_NAME);
  return userId;
};

const reassignUserInteractions = async (
  db: DbClient,
  userId: string,
  agencyId: string | null,
  targetUserId: string
): Promise<number> => {
  const interactionCount = await countUserInteractions(db, userId, agencyId);
  if (interactionCount === 0) return 0;

  try {
    const whereClause = agencyId
      ? and(eq(interactions.created_by, userId), eq(interactions.agency_id, agencyId))
      : and(eq(interactions.created_by, userId), isNull(interactions.agency_id));

    await db
      .update(interactions)
      .set({ created_by: targetUserId })
      .where(whereClause);
  } catch (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible de reattribuer les interactions de l'utilisateur.",
      getErrorDetails(error)
    );
  }

  return interactionCount;
};

export const anonymizeUserInteractionsBeforeDelete = async (
  db: DbClient,
  userId: string
): Promise<UserDeleteAnonymizationSummary> => {
  const ownership = await listUserInteractionOwnership(db, userId);
  if (ownership.agencyIds.length === 0 && !ownership.hasOrphanInteractions) {
    return {
      reassignedCount: 0,
      reassignedAgencyIds: [],
      orphanReassignedCount: 0
    };
  }

  const agencyNames = await loadAgencyNames(db, ownership.agencyIds);
  let reassignedCount = 0;

  for (const agencyId of ownership.agencyIds) {
    const systemUserId = await ensureAgencySystemUser(db, agencyId, agencyNames.get(agencyId));
    reassignedCount += await reassignUserInteractions(db, userId, agencyId, systemUserId);
  }

  let orphanReassignedCount = 0;
  if (ownership.hasOrphanInteractions) {
    const orphanSystemUserId = await ensureOrphanSystemUser(db);
    orphanReassignedCount = await reassignUserInteractions(db, userId, null, orphanSystemUserId);
    reassignedCount += orphanReassignedCount;
  }

  return {
    reassignedCount,
    reassignedAgencyIds: ownership.agencyIds,
    orphanReassignedCount
  };
};

export const deleteAuthUser = async (userId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (!error) return;

  const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const message = error.message.toLowerCase();

  if (errorStatus === 404 || message.includes('not found')) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }

  if (
    message.includes('foreign key')
    || message.includes('constraint')
    || message.includes('violates')
  ) {
    throw httpError(
      409,
      'USER_DELETE_REFERENCED',
      "Impossible de supprimer cet utilisateur car des donnees y sont rattachees."
    );
  }

  throw httpError(400, 'USER_DELETE_FAILED', error.message);
};
