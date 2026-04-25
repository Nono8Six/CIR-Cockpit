import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { agencies, agency_members, entities, profiles } from '../../../drizzle/schema.ts';
import type {
  DirectoryAgencyOption,
  DirectoryCitySuggestionsInput,
  DirectoryCommercialOption,
  DirectoryListInput,
  DirectoryListRow,
  DirectoryOptionsInput,
  DirectoryRecord,
  DirectoryRouteRef,
  DirectorySuggestionOption
} from '../../../../shared/schemas/directory.schema.ts';
import type {
  DirectoryCitySuggestionsResponse,
  DirectoryListResponse,
  DirectoryOptionsResponse,
  DirectoryRecordResponse
} from '../../../../shared/schemas/api-responses.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureDataRateLimit } from './dataAccess.ts';
import {
  buildBaseWhereClause,
  buildListWhereClause,
  commercialDisplayNameSql,
  escapeLikePattern,
  normalizeClientKind,
  normalizeDepartment,
  normalizedCitySql,
  normalizedDepartmentSql,
  normalizedOfficialDataSourceSql,
  PROSPECT_ENTITY_TYPE_WHERE,
  resolveAccessibleAgencyIds,
  toAccessibleAgencyCondition,
  toCommercialOption,
  toSortingOrder
} from './directoryShared.ts';

export const listDirectory = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryListInput
): Promise<DirectoryListResponse> => {
  await ensureDataRateLimit('directory:list', authContext.userId);

  const whereClause = buildListWhereClause(authContext, input);
  const offset = (input.page - 1) * input.pageSize;

  try {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: entities.id,
          entity_type: entities.entity_type,
          client_kind: entities.client_kind,
          client_number: entities.client_number,
          account_type: entities.account_type,
          name: entities.name,
          city: entities.city,
          postal_code: entities.postal_code,
          department: entities.department,
          siret: entities.siret,
          siren: entities.siren,
          official_name: entities.official_name,
          agency_id: entities.agency_id,
          agency_name: agencies.name,
          cir_commercial_id: entities.cir_commercial_id,
          cir_commercial_name: commercialDisplayNameSql,
          archived_at: entities.archived_at,
          updated_at: entities.updated_at
        })
        .from(entities)
        .leftJoin(agencies, eq(entities.agency_id, agencies.id))
        .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
        .where(whereClause)
        .orderBy(...toSortingOrder(input.sorting))
        .limit(input.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(entities)
        .where(whereClause)
    ]);

    const normalizedRows = rows.map((row): DirectoryListRow => ({
      ...row,
      client_kind: normalizeClientKind(row.client_kind)
    }));

    return {
      request_id: requestId,
      ok: true,
      rows: normalizedRows,
      total: Number(countRows[0]?.count ?? 0),
      page: input.page,
      page_size: input.pageSize
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger l'annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryOptions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsInput
): Promise<DirectoryOptionsResponse> => {
  await ensureDataRateLimit('directory:options', authContext.userId);

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const selectedAgencyIds = resolveAccessibleAgencyIds(authContext, input.agencyIds);
  const allAccessibleAgencyIds = authContext.isSuperAdmin ? [] : authContext.agencyIds;
  const agenciesWhereClause = authContext.isSuperAdmin && allAccessibleAgencyIds.length === 0
    ? isNull(agencies.archived_at)
    : allAccessibleAgencyIds.length > 0
      ? and(inArray(agencies.id, allAccessibleAgencyIds), isNull(agencies.archived_at))
      : sql<boolean>`false`;
  const commercialsWhereClause = selectedAgencyIds.length > 0
    ? and(inArray(agency_members.agency_id, selectedAgencyIds), isNull(profiles.archived_at))
    : authContext.isSuperAdmin
      ? and(isNotNull(agency_members.agency_id), isNull(profiles.archived_at))
      : authContext.agencyIds.length > 0
        ? and(inArray(agency_members.agency_id, authContext.agencyIds), isNull(profiles.archived_at))
        : sql<boolean>`false`;

  try {
    const [agencyRows, commercialRows, departmentRows] = await Promise.all([
      db
        .select({
          id: agencies.id,
          name: agencies.name
        })
        .from(agencies)
        .where(agenciesWhereClause)
        .orderBy(asc(sql`lower(${agencies.name})`)),
      db
        .select({
          id: profiles.id,
          display_name: commercialDisplayNameSql
        })
        .from(agency_members)
        .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
        .where(commercialsWhereClause)
        .orderBy(asc(sql`lower(${commercialDisplayNameSql})`)),
      db
        .select({
          department: entities.department
        })
        .from(entities)
        .where(and(baseWhereClause, isNotNull(entities.department)))
        .orderBy(asc(normalizedDepartmentSql))
    ]);

    const departments = Array.from(
      new Set(
        departmentRows
          .map((row) => normalizeDepartment(row.department))
          .filter((value): value is string => value !== null)
      )
    );

    const commercials = Array.from(
      new Map(
        commercialRows
          .map(toCommercialOption)
          .filter((value): value is DirectoryCommercialOption => value !== null)
          .map((option) => [option.id, option])
      ).values()
    );

    return {
      request_id: requestId,
      ok: true,
      agencies: agencyRows satisfies DirectoryAgencyOption[],
      commercials,
      departments
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger les filtres de l'annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryCitySuggestions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCitySuggestionsInput
): Promise<DirectoryCitySuggestionsResponse> => {
  await ensureDataRateLimit('directory:city-suggestions', authContext.userId);

  const normalizedQuery = input.q.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return {
      request_id: requestId,
      ok: true,
      cities: []
    };
  }

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`;
  const containsPattern = `%${escapeLikePattern(normalizedQuery)}%`;

  try {
    const rows = await db
      .select({
        city: entities.city,
        rank: sql<number>`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`
      })
      .from(entities)
      .where(
        and(
          baseWhereClause,
          isNotNull(entities.city),
          sql<boolean>`lower(${entities.city}) like ${containsPattern}`
        )
      )
      .groupBy(entities.city)
      .orderBy(
        asc(sql`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`),
        asc(normalizedCitySql)
      )
      .limit(12);

    return {
      request_id: requestId,
      ok: true,
      cities: rows
        .map((row) => row.city?.trim() ?? '')
        .filter((value) => value.length > 0)
        .map((value): DirectorySuggestionOption => ({
          value,
          label: value
        }))
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de proposer des villes.',
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryRecord = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  route: DirectoryRouteRef
): Promise<DirectoryRecordResponse> => {
  await ensureDataRateLimit('directory:record', authContext.userId);

  const routeCondition = route.kind === 'client'
    ? and(eq(entities.entity_type, 'Client'), eq(entities.client_number, route.clientNumber))
    : and(PROSPECT_ENTITY_TYPE_WHERE, eq(entities.id, route.id));

  const accessibleAgencyCondition = toAccessibleAgencyCondition(authContext, []);
  const whereClause = accessibleAgencyCondition
    ? and(routeCondition, accessibleAgencyCondition)
    : routeCondition;

  try {
    const rows = await db
      .select({
        id: entities.id,
        entity_type: entities.entity_type,
        client_kind: entities.client_kind,
        client_number: entities.client_number,
        account_type: entities.account_type,
        name: entities.name,
        address: entities.address,
        postal_code: entities.postal_code,
        department: entities.department,
        city: entities.city,
        country: entities.country,
        siret: entities.siret,
        siren: entities.siren,
        naf_code: entities.naf_code,
        official_name: entities.official_name,
        official_data_source: normalizedOfficialDataSourceSql,
        official_data_synced_at: entities.official_data_synced_at,
        notes: entities.notes,
        agency_id: entities.agency_id,
        agency_name: agencies.name,
        cir_commercial_id: entities.cir_commercial_id,
        cir_commercial_name: commercialDisplayNameSql,
        archived_at: entities.archived_at,
        created_at: entities.created_at,
        updated_at: entities.updated_at
      })
      .from(entities)
      .leftJoin(agencies, eq(entities.agency_id, agencies.id))
      .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
      .where(whereClause)
      .limit(1);

    const record = rows[0];
    if (!record) {
      throw httpError(
        404,
        'NOT_FOUND',
        route.kind === 'client' ? 'Client introuvable.' : 'Prospect introuvable.'
      );
    }

    return {
      request_id: requestId,
      ok: true,
      record: {
        ...record,
        client_kind: normalizeClientKind(record.client_kind)
      } satisfies DirectoryRecord
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }

    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger la fiche annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};
