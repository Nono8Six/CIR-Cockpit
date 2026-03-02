import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { agencies, agency_members, interactions, profiles } from '../../../../drizzle/schema.ts';
import type { Database } from '../../../../../shared/supabase.types.ts';
import type { DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';

export type ProfileSummary = {
  id: string;
  email: string;
  role: Database['public']['Enums']['user_role'];
  archived_at: string | null;
};

export const getErrorDetails = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

export const ensureAgenciesExist = async (db: DbClient, agencyIds: string[]): Promise<void> => {
  if (agencyIds.length === 0) return;

  let rows: Array<{ id: string }> = [];
  try {
    rows = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(inArray(agencies.id, agencyIds));
  } catch {
    throw httpError(500, 'AGENCY_LOOKUP_FAILED', 'Impossible de valider les agences.');
  }

  const existing = new Set(rows.map((row) => row.id));
  const missing = agencyIds.filter((agencyId) => !existing.has(agencyId));

  if (missing.length > 0) {
    throw httpError(404, 'AGENCY_NOT_FOUND', `Agence introuvable: ${missing.join(', ')}`);
  }
};

const toProfileSummary = (row: {
  id: string;
  email: string | null;
  role: Database['public']['Enums']['user_role'] | null;
  archived_at: string | null;
} | undefined): ProfileSummary | null => {
  if (!row?.email || !row.role) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    archived_at: row.archived_at
  };
};

export const getProfileByEmail = async (db: DbClient, email: string): Promise<ProfileSummary | null> => {
  try {
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        role: profiles.role,
        archived_at: profiles.archived_at
      })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    return toProfileSummary(rows[0]);
  } catch {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }
};

export const getProfileById = async (db: DbClient, userId: string): Promise<ProfileSummary | null> => {
  try {
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        role: profiles.role,
        archived_at: profiles.archived_at
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    return toProfileSummary(rows[0]);
  } catch {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }
};

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const ensureProfileAvailable = async (db: DbClient, userId: string): Promise<ProfileSummary> => {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const profile = await getProfileById(db, userId);
    if (profile) return profile;
    await wait(150);
  }

  throw httpError(500, 'PROFILE_CREATE_FAILED', "Le profil n'a pas ete cree apres la creation utilisateur.");
};

export const listMemberships = async (db: DbClient, userId: string): Promise<string[]> => {
  let rows: Array<{ agency_id: string }> = [];
  try {
    rows = await db
      .select({ agency_id: agency_members.agency_id })
      .from(agency_members)
      .where(eq(agency_members.user_id, userId));
  } catch {
    throw httpError(500, 'MEMBERSHIP_LOOKUP_FAILED', 'Impossible de charger les appartenances.');
  }

  return rows.map((row) => row.agency_id);
};

export const ensureUserExists = async (db: DbClient, userId: string): Promise<ProfileSummary> => {
  const profile = await getProfileById(db, userId);
  if (!profile) {
    throw httpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  return profile;
};

export const loadAgencyNames = async (db: DbClient, agencyIds: string[]): Promise<Map<string, string>> => {
  if (agencyIds.length === 0) return new Map();

  let rows: Array<{ id: string; name: string }> = [];
  try {
    rows = await db
      .select({ id: agencies.id, name: agencies.name })
      .from(agencies)
      .where(inArray(agencies.id, agencyIds));
  } catch (error) {
    throw httpError(
      500,
      'SYSTEM_USER_PROVISION_FAILED',
      'Impossible de charger les agences pour la suppression utilisateur.',
      getErrorDetails(error)
    );
  }

  return new Map(rows.map((row) => [row.id, row.name]));
};

export const toUniqueAgencyIds = (rows: Array<{ agency_id: string | null }>): string[] => {
  const uniqueIds = new Set<string>();
  for (const row of rows) {
    const agencyId = row.agency_id?.trim() ?? '';
    if (agencyId) {
      uniqueIds.add(agencyId);
    }
  }

  return [...uniqueIds];
};

export const listUserInteractionOwnership = async (
  db: DbClient,
  userId: string
): Promise<{ agencyIds: string[]; hasOrphanInteractions: boolean }> => {
  let rows: Array<{ agency_id: string | null }> = [];
  try {
    rows = await db
      .select({ agency_id: interactions.agency_id })
      .from(interactions)
      .where(eq(interactions.created_by, userId));
  } catch (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible d'analyser les interactions de l'utilisateur.",
      getErrorDetails(error)
    );
  }

  return {
    agencyIds: toUniqueAgencyIds(rows),
    hasOrphanInteractions: rows.some((row) => row.agency_id === null)
  };
};

export const countUserInteractions = async (
  db: DbClient,
  userId: string,
  agencyId: string | null
): Promise<number> => {
  try {
    const whereClause = agencyId
      ? and(eq(interactions.created_by, userId), eq(interactions.agency_id, agencyId))
      : and(eq(interactions.created_by, userId), isNull(interactions.agency_id));

    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(whereClause);

    return Number(rows[0]?.count ?? 0);
  } catch (error) {
    throw httpError(
      500,
      'USER_DELETE_ANONYMIZATION_FAILED',
      "Impossible de compter les interactions a anonymiser.",
      getErrorDetails(error)
    );
  }
};
