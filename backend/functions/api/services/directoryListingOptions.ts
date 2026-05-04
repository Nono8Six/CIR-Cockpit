import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import {
  agencies,
  agency_members,
  entities,
  profiles,
} from "../../../drizzle/schema.ts";
import type {
  DirectoryAgencyOption,
  DirectoryCommercialOption,
  DirectoryOptionsAgenciesInput,
  DirectoryOptionsCitiesInput,
  DirectoryOptionsFacetInput,
  DirectorySuggestionOption,
} from "../../../../shared/schemas/directory.schema.ts";
import type {
  DirectoryOptionsAgenciesResponse,
  DirectoryOptionsCitiesResponse,
  DirectoryOptionsCommercialsResponse,
  DirectoryOptionsDepartmentsResponse,
} from "../../../../shared/schemas/api-responses.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import {
  buildBaseWhereClause,
  commercialDisplayNameSql,
  normalizedCitySql,
  normalizedDepartmentSql,
  normalizeDepartment,
  normalizeNullableText,
  resolveDirectoryScope,
  toCommercialOption,
  toDirectoryResponseMeta,
} from "./directoryShared.ts";

const toAgenciesWhereClause = (
  authContext: AuthContext,
  includeArchived: boolean,
) => {
  const archiveCondition = includeArchived ? undefined : isNull(agencies.archived_at);

  if (authContext.isSuperAdmin) {
    return archiveCondition ?? sql<boolean>`true`;
  }

  if (authContext.agencyIds.length === 0) {
    return sql<boolean>`false`;
  }

  const membershipCondition = inArray(agencies.id, authContext.agencyIds);
  return archiveCondition ? and(membershipCondition, archiveCondition) : membershipCondition;
};

export const getDirectoryOptionAgencies = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsAgenciesInput,
): Promise<DirectoryOptionsAgenciesResponse> => {
  await ensureDataRateLimit("directory:options:agencies", authContext.userId);

  try {
    const agencyRows = await db
      .select({
        id: agencies.id,
        name: agencies.name,
      })
      .from(agencies)
      .where(toAgenciesWhereClause(authContext, input.includeArchived))
      .orderBy(asc(sql`lower(${agencies.name})`));

    return {
      request_id: requestId,
      ok: true,
      agencies: agencyRows satisfies DirectoryAgencyOption[],
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger les agences de l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};

export const getDirectoryOptionCommercials = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsFacetInput,
): Promise<DirectoryOptionsCommercialsResponse> => {
  await ensureDataRateLimit("directory:options:commercials", authContext.userId);

  const resolvedScope = resolveDirectoryScope(authContext, input.scope);
  const selectedAgencyIds = resolvedScope.agencyIds;
  const whereClause = selectedAgencyIds.length > 0
    ? and(
      inArray(agency_members.agency_id, selectedAgencyIds),
      isNull(profiles.archived_at),
    )
    : sql<boolean>`false`;

  try {
    const commercialRows = await db
      .select({
        id: profiles.id,
        display_name: commercialDisplayNameSql,
      })
      .from(agency_members)
      .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
      .where(whereClause)
      .orderBy(asc(sql`lower(${commercialDisplayNameSql})`));

    const commercials = Array.from(
      new Map(
        commercialRows
          .map(toCommercialOption)
          .filter((value): value is DirectoryCommercialOption => value !== null)
          .map((option) => [option.id, option]),
      ).values(),
    );
    const meta = toDirectoryResponseMeta(resolvedScope, input.debug?.includeResolvedScope);

    return {
      request_id: requestId,
      ok: true,
      commercials,
      ...(meta ? { meta } : {}),
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger les commerciaux de l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};

export const getDirectoryOptionDepartments = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsFacetInput,
): Promise<DirectoryOptionsDepartmentsResponse> => {
  await ensureDataRateLimit("directory:options:departments", authContext.userId);

  const resolvedScope = resolveDirectoryScope(authContext, input.scope);
  const baseWhereClause = buildBaseWhereClause(authContext, input);

  try {
    const departmentRows = await db
      .select({
        department: entities.department,
      })
      .from(entities)
      .where(and(baseWhereClause, isNotNull(entities.department)))
      .orderBy(asc(normalizedDepartmentSql));

    const departments = Array.from(
      new Set(
        departmentRows
          .map((row) => normalizeDepartment(row.department))
          .filter((value): value is string => value !== null),
      ),
    );
    const meta = toDirectoryResponseMeta(resolvedScope, input.debug?.includeResolvedScope);

    return {
      request_id: requestId,
      ok: true,
      departments,
      ...(meta ? { meta } : {}),
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger les departements de l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};

export const getDirectoryOptionCities = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsCitiesInput,
): Promise<DirectoryOptionsCitiesResponse> => {
  await ensureDataRateLimit("directory:options:cities", authContext.userId);

  const resolvedScope = resolveDirectoryScope(authContext, input.scope);
  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const cityPattern = input.q ? `%${input.q.toLowerCase()}%` : null;
  const whereClause = cityPattern
    ? and(baseWhereClause, isNotNull(entities.city), sql<boolean>`${normalizedCitySql} like ${cityPattern}`)
    : and(baseWhereClause, isNotNull(entities.city));

  try {
    const cityRows = await db
      .select({
        city: entities.city,
      })
      .from(entities)
      .where(whereClause)
      .orderBy(asc(normalizedCitySql))
      .limit(50);

    const cities = Array.from(
      new Set(
        cityRows
          .map((row) => normalizeNullableText(row.city))
          .filter((value): value is string => value !== null),
      ),
    ).map((city): DirectorySuggestionOption => ({
      value: city,
      label: city,
    }));
    const meta = toDirectoryResponseMeta(resolvedScope, input.debug?.includeResolvedScope);

    return {
      request_id: requestId,
      ok: true,
      cities,
      ...(meta ? { meta } : {}),
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger les villes de l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};
