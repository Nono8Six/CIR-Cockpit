import { and, desc, eq, sql } from 'drizzle-orm';

import { agencies, agency_members, entities, profiles } from '../../../drizzle/schema.ts';
import type { TierV1SearchInput } from '../../../../shared/schemas/tier-v1.schema.ts';
import type { TierV1SearchResponse } from '../../../../shared/schemas/api-responses.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureDataRateLimit } from './dataAccess.ts';
import { commercialDisplayNameSql } from './directoryShared.ts';
import {
  buildUnifiedEntitySearchConditions,
  buildUnifiedProfileSearchConditions,
  resolveUnifiedSearchAgencyIds
} from './dataSearchEntitiesUnifiedConditions.ts';
import {
  matchesUnifiedEntitySearch,
  matchesUnifiedProfileSearch,
  sortUnifiedResults,
  toUnifiedEntityResult,
  toUnifiedProfileResult,
  type UnifiedEntitySearchRow,
  type UnifiedProfileSearchRow
} from './dataSearchEntitiesUnifiedMapping.ts';

export { resolveUnifiedSearchAgencyIds } from './dataSearchEntitiesUnifiedConditions.ts';

export const searchEntitiesUnified = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: TierV1SearchInput
): Promise<TierV1SearchResponse> => {
  await ensureDataRateLimit('data_search_entities_unified', authContext.userId);

  const agencyIds = resolveUnifiedSearchAgencyIds(authContext, input.agency_id);
  const entityConditions = buildUnifiedEntitySearchConditions(input, agencyIds);
  const profileConditions = buildUnifiedProfileSearchConditions(input, agencyIds);

  try {
    const entityRowsPromise = input.family === 'solicitations'
      ? Promise.resolve([] as UnifiedEntitySearchRow[])
      : db
        .select({
          id: entities.id,
          entity_type: entities.entity_type,
          client_kind: entities.client_kind,
          account_type: entities.account_type,
          name: entities.name,
          first_name: entities.first_name,
          last_name: entities.last_name,
          client_number: entities.client_number,
          siret: entities.siret,
          siren: entities.siren,
          supplier_code: entities.supplier_code,
          supplier_number: entities.supplier_number,
          primary_phone: entities.primary_phone,
          primary_email: entities.primary_email,
          city: entities.city,
          agency_name: agencies.name,
          referent_name: commercialDisplayNameSql,
          updated_at: entities.updated_at,
          archived_at: entities.archived_at
        })
        .from(entities)
        .leftJoin(agencies, eq(entities.agency_id, agencies.id))
        .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
        .where(and(...entityConditions) ?? sql<boolean>`true`)
        .orderBy(desc(entities.updated_at))
        .limit(input.limit);
    const profileRowsPromise = input.family === 'all' || input.family === 'internals'
      ? db
        .select({
          id: profiles.id,
          agency_id: agency_members.agency_id,
          email: profiles.email,
          display_name: profiles.display_name,
          first_name: profiles.first_name,
          last_name: profiles.last_name,
          phone: profiles.phone,
          agency_name: agencies.name,
          updated_at: profiles.updated_at,
          archived_at: profiles.archived_at
        })
        .from(profiles)
        .innerJoin(agency_members, eq(agency_members.user_id, profiles.id))
        .leftJoin(agencies, eq(agency_members.agency_id, agencies.id))
        .where(and(...profileConditions) ?? sql<boolean>`true`)
        .orderBy(desc(profiles.updated_at))
        .limit(input.limit)
      : Promise.resolve([] as UnifiedProfileSearchRow[]);
    const [entityRows, profileRows] = await Promise.all([entityRowsPromise, profileRowsPromise]);
    const results = sortUnifiedResults([
      ...entityRows
        .filter((row) => matchesUnifiedEntitySearch(row, input.query))
        .map(toUnifiedEntityResult),
      ...profileRows
        .filter((row) => matchesUnifiedProfileSearch(row, input.query))
        .map(toUnifiedProfileResult)
    ], input.query).slice(0, input.limit);

    return {
      request_id: requestId,
      ok: true,
      results
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de rechercher les tiers.',
      error instanceof Error ? error.message : undefined
    );
  }
};
