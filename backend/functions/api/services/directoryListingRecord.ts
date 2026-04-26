import { and, eq } from "drizzle-orm";

import { agencies, entities, profiles } from "../../../drizzle/schema.ts";
import type {
  DirectoryRecord,
  DirectoryRouteRef,
} from "../../../../shared/schemas/directory.schema.ts";
import type { DirectoryRecordResponse } from "../../../../shared/schemas/api-responses.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import {
  commercialDisplayNameSql,
  normalizeClientKind,
  normalizedOfficialDataSourceSql,
  PROSPECT_ENTITY_TYPE_WHERE,
  toAccessibleAgencyCondition,
} from "./directoryShared.ts";

export const getDirectoryRecord = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  route: DirectoryRouteRef,
): Promise<DirectoryRecordResponse> => {
  await ensureDataRateLimit("directory:record", authContext.userId);

  const routeCondition = route.kind === "client"
    ? and(
      eq(entities.entity_type, "Client"),
      eq(entities.client_number, route.clientNumber),
    )
    : and(PROSPECT_ENTITY_TYPE_WHERE, eq(entities.id, route.id));

  const accessibleAgencyCondition = toAccessibleAgencyCondition(
    authContext,
    [],
  );
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
        updated_at: entities.updated_at,
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
        "NOT_FOUND",
        route.kind === "client"
          ? "Client introuvable."
          : "Prospect introuvable.",
      );
    }

    return {
      request_id: requestId,
      ok: true,
      record: {
        ...record,
        client_kind: normalizeClientKind(record.client_kind),
      } satisfies DirectoryRecord,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      Reflect.get(error, "code") === "NOT_FOUND"
    ) {
      throw error;
    }

    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger la fiche annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};
