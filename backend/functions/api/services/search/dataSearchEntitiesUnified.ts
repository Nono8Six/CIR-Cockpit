import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { agencies, agency_members, entities, entity_contacts, profiles } from '../../../../drizzle/schema.ts';
import type { TierV1SearchInput } from '../../../../../shared/schemas/interaction/tier-v1.schema.ts';
import type { TierV1SearchResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureDataRateLimit } from '../data/dataAccess.ts';
import { commercialDisplayNameSql } from '../directory/core/directoryShared.ts';
import {
  buildUnifiedEntitySearchConditions,
  buildUnifiedProfileSearchConditions,
  resolveUnifiedSearchAgencyIds
} from './dataSearchEntitiesUnifiedConditions.ts';
import {
  matchesUnifiedEntitySearch,
  matchesUnifiedProfileSearch,
  matchesUnifiedSupplierContactSearch,
  sortUnifiedResults,
  toUnifiedEntityResult,
  toUnifiedProfileResult,
  toUnifiedSupplierContactResult,
  type UnifiedEntitySearchRow,
  type UnifiedProfileSearchRow,
  type UnifiedSupplierContactSearchRow
} from './dataSearchEntitiesUnifiedMapping.ts';
import { escapeLikePattern, normalizePhoneDigits } from '../directory/core/directoryShared.ts';

export { resolveUnifiedSearchAgencyIds } from './dataSearchEntitiesUnifiedConditions.ts';

type SqlCondition = ReturnType<typeof sql>;

const supplierContactAgencyCondition = (agencyIds: string[] | null): SqlCondition | undefined => {
  if (agencyIds === null) return undefined;
  if (agencyIds.length === 0) return sql<boolean>`false`;
  if (agencyIds.length === 1) return eq(entities.agency_id, agencyIds[0]);
  return inArray(entities.agency_id, agencyIds);
};

const phoneDigitVariants = (query: string): string[] => {
  const digits = normalizePhoneDigits(query);
  if (!digits) return [];
  return [
    digits,
    digits.startsWith('0') ? `33${digits.slice(1)}` : '',
    digits.startsWith('33') ? `0${digits.slice(2)}` : ''
  ].filter((entry) => entry.length > 0);
};

const supplierContactSearchCondition = (query: string): SqlCondition => {
  const pattern = `%${escapeLikePattern(query)}%`;
  const phoneVariants = phoneDigitVariants(query);

  return or(
    sql<boolean>`lower(${entities.name}) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entity_contacts.first_name}, '')) like ${pattern}`,
    sql<boolean>`lower(${entity_contacts.last_name}) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entity_contacts.position}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entity_contacts.email}, '')) like ${pattern}`,
    ...phoneVariants.map((variant) =>
      sql<boolean>`regexp_replace(coalesce(${entity_contacts.phone}, ''), '\\D', '', 'g') like ${`%${variant}%`}`
    )
  ) ?? sql<boolean>`false`;
};

const buildSupplierContactSearchConditions = (
  input: TierV1SearchInput,
  agencyIds: string[] | null
): SqlCondition[] => [
  supplierContactAgencyCondition(agencyIds),
  sql<boolean>`${entities.entity_type} = 'Fournisseur'`,
  input.include_archived ? undefined : isNull(entities.archived_at),
  input.include_archived ? undefined : isNull(entity_contacts.archived_at),
  supplierContactSearchCondition(input.query)
].filter((condition): condition is SqlCondition => Boolean(condition));

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
    const supplierContactRowsPromise = input.family === 'all' || input.family === 'suppliers'
      ? db
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
          archived_at: entities.archived_at,
          contact_id: entity_contacts.id,
          contact_first_name: entity_contacts.first_name,
          contact_last_name: entity_contacts.last_name,
          contact_position: entity_contacts.position,
          contact_phone: entity_contacts.phone,
          contact_email: entity_contacts.email
        })
        .from(entity_contacts)
        .innerJoin(entities, eq(entity_contacts.entity_id, entities.id))
        .leftJoin(agencies, eq(entities.agency_id, agencies.id))
        .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
        .where(and(...buildSupplierContactSearchConditions(input, agencyIds)) ?? sql<boolean>`true`)
        .orderBy(desc(entity_contacts.updated_at))
        .limit(input.limit)
      : Promise.resolve([] as UnifiedSupplierContactSearchRow[]);
    const [entityRows, profileRows, supplierContactRows] = await Promise.all([
      entityRowsPromise,
      profileRowsPromise,
      supplierContactRowsPromise
    ]);
    const results = sortUnifiedResults([
      ...entityRows
        .filter((row) => matchesUnifiedEntitySearch(row, input.query))
        .map(toUnifiedEntityResult),
      ...supplierContactRows
        .filter((row) => matchesUnifiedSupplierContactSearch(row, input.query))
        .map((row) => toUnifiedSupplierContactResult(row, input.query)),
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
