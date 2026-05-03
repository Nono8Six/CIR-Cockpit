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
  DirectoryOptionsInput,
} from "../../../../shared/schemas/directory.schema.ts";
import type { DirectoryOptionsResponse } from "../../../../shared/schemas/api-responses.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import {
  buildBaseWhereClause,
  commercialDisplayNameSql,
  normalizedDepartmentSql,
  normalizeDepartment,
  resolveAccessibleAgencyIds,
  toCommercialOption,
} from "./directoryShared.ts";

export const getDirectoryOptions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsInput,
): Promise<DirectoryOptionsResponse> => {
  await ensureDataRateLimit("directory:options", authContext.userId);

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const selectedAgencyIds = resolveAccessibleAgencyIds(
    authContext,
    input.agencyIds,
  );
  const allAccessibleAgencyIds = authContext.isSuperAdmin
    ? []
    : authContext.agencyIds;
  const agenciesWhereClause =
    authContext.isSuperAdmin && allAccessibleAgencyIds.length === 0
      ? isNull(agencies.archived_at)
      : allAccessibleAgencyIds.length > 0
      ? and(
        inArray(agencies.id, allAccessibleAgencyIds),
        isNull(agencies.archived_at),
      )
      : sql<boolean>`false`;
  const commercialsWhereClause = selectedAgencyIds.length > 0
    ? and(
      inArray(agency_members.agency_id, selectedAgencyIds),
      isNull(profiles.archived_at),
    )
    : authContext.isSuperAdmin
    ? sql<boolean>`false`
    : authContext.agencyIds.length > 0
    ? and(
      inArray(agency_members.agency_id, authContext.agencyIds),
      isNull(profiles.archived_at),
    )
    : sql<boolean>`false`;

  try {
    const [agencyRows, commercialRows, departmentRows] = await Promise.all([
      db
        .select({
          id: agencies.id,
          name: agencies.name,
        })
        .from(agencies)
        .where(agenciesWhereClause)
        .orderBy(asc(sql`lower(${agencies.name})`)),
      db
        .select({
          id: profiles.id,
          display_name: commercialDisplayNameSql,
        })
        .from(agency_members)
        .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
        .where(commercialsWhereClause)
        .orderBy(asc(sql`lower(${commercialDisplayNameSql})`)),
      db
        .select({
          department: entities.department,
        })
        .from(entities)
        .where(and(baseWhereClause, isNotNull(entities.department)))
        .orderBy(asc(normalizedDepartmentSql)),
    ]);

    const departments = Array.from(
      new Set(
        departmentRows
          .map((row) => normalizeDepartment(row.department))
          .filter((value): value is string => value !== null),
      ),
    );

    const commercials = Array.from(
      new Map(
        commercialRows
          .map(toCommercialOption)
          .filter((value): value is DirectoryCommercialOption => value !== null)
          .map((option) => [option.id, option]),
      ).values(),
    );

    return {
      request_id: requestId,
      ok: true,
      agencies: agencyRows satisfies DirectoryAgencyOption[],
      commercials,
      departments,
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger les filtres de l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};
