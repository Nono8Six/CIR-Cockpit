import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { agency_members, interactions, profiles } from '../../../drizzle/schema.ts';
import type {
  CockpitAgencyMember,
  CockpitAgencyMembersInput,
  CockpitAgencyMembersResponse,
  CockpitPhoneLookupInput,
  CockpitPhoneLookupResponse
} from '../../../../shared/schemas/cockpit.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';

const DEFAULT_PHONE_LOOKUP_LIMIT = 5;

const normalizePhone = (value: string): string => value.replace(/\D/g, '');

export const listCockpitAgencyMembers = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: CockpitAgencyMembersInput
): Promise<CockpitAgencyMembersResponse> => {
  const agencyId = ensureAgencyAccess(authContext, input.agency_id);
  await ensureDataRateLimit('cockpit:agency_members', authContext.userId);

  try {
    const rows = await db
      .select({
        profile_id: profiles.id,
        first_name: profiles.first_name,
        last_name: profiles.last_name,
        display_name: profiles.display_name,
        email: profiles.email,
        role: profiles.role
      })
      .from(agency_members)
      .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
      .where(and(
        eq(agency_members.agency_id, agencyId),
        isNull(profiles.archived_at),
        eq(profiles.is_system, false)
      ))
      .orderBy(profiles.last_name, profiles.first_name, profiles.email);

    const members: CockpitAgencyMember[] = rows.map((row) => ({
      profile_id: row.profile_id,
      first_name: row.first_name,
      last_name: row.last_name,
      display_name: row.display_name,
      email: row.email,
      role: row.role
    }));

    return { request_id: requestId, ok: true, members };
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger les membres de l'agence.");
  }
};

export const lookupCockpitPhone = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: CockpitPhoneLookupInput
): Promise<CockpitPhoneLookupResponse> => {
  const agencyId = ensureAgencyAccess(authContext, input.agency_id);
  await ensureDataRateLimit('cockpit:phone_lookup', authContext.userId);

  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) {
    throw httpError(400, 'VALIDATION_ERROR', 'Numero requis.');
  }
  const limit = input.limit ?? DEFAULT_PHONE_LOOKUP_LIMIT;
  const phoneMatches = sql`regexp_replace(coalesce(${interactions.contact_phone}, ''), '\\D', '', 'g') = ${normalizedPhone}`;
  const whereClause = and(eq(interactions.agency_id, agencyId), phoneMatches);

  try {
    const [matches, countRows] = await Promise.all([
      db
        .select({
          id: interactions.id,
          channel: interactions.channel,
          entity_type: interactions.entity_type,
          company_name: interactions.company_name,
          contact_name: interactions.contact_name,
          contact_phone: interactions.contact_phone,
          subject: interactions.subject,
          status_id: interactions.status_id,
          interaction_type: interactions.interaction_type,
          entity_id: interactions.entity_id,
          contact_id: interactions.contact_id,
          created_at: interactions.created_at,
          last_action_at: interactions.last_action_at
        })
        .from(interactions)
        .where(whereClause)
        .orderBy(desc(interactions.last_action_at), desc(interactions.created_at))
        .limit(limit),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(interactions)
        .where(whereClause)
    ]);

    return {
      request_id: requestId,
      ok: true,
      normalized_phone: normalizedPhone,
      total: Number(countRows[0]?.count ?? 0),
      matches
    };
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de rechercher l'historique du numero.");
  }
};
