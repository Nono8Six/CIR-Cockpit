import { eq, sql } from "drizzle-orm";

import { agencies, entities, profiles } from "../../../drizzle/schema.ts";
import type {
  DirectoryListInput,
  DirectoryListRow,
} from "../../../../shared/schemas/directory.schema.ts";
import type { DirectoryListResponse } from "../../../../shared/schemas/api-responses.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import {
  buildListWhereClause,
  commercialDisplayNameSql,
  normalizeClientKind,
  resolveDirectoryScope,
  toSortingOrder,
  toDirectoryResponseMeta,
} from "./directoryShared.ts";

export const listDirectory = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryListInput,
): Promise<DirectoryListResponse> => {
  await ensureDataRateLimit("directory:list", authContext.userId);

  const whereClause = buildListWhereClause(authContext, input);
  const resolvedScope = resolveDirectoryScope(authContext, input.scope);
  const offset = (input.pagination.page - 1) * input.pagination.pageSize;

  try {
    const rowsPromise = db
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
        updated_at: entities.updated_at,
      })
      .from(entities)
      .leftJoin(agencies, eq(entities.agency_id, agencies.id))
      .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
      .where(whereClause)
      .orderBy(...toSortingOrder(input.sorting))
      .limit(input.pagination.pageSize)
      .offset(offset);
    const countPromise = input.pagination.includeTotal
      ? db
        .select({ count: sql<number>`count(*)::int` })
        .from(entities)
        .where(whereClause)
      : Promise.resolve([]);
    const [rows, countRows] = await Promise.all([
      rowsPromise,
      countPromise,
    ]);

    const normalizedRows = rows.map((row): DirectoryListRow => ({
      ...row,
      client_kind: normalizeClientKind(row.client_kind),
    }));

    const total = input.pagination.includeTotal ? Number(countRows[0]?.count ?? 0) : undefined;

    return {
      request_id: requestId,
      ok: true,
      rows: normalizedRows,
      ...(typeof total === "number" ? { total } : {}),
      page: input.pagination.page,
      page_size: input.pagination.pageSize,
      ...(toDirectoryResponseMeta(resolvedScope, input.debug?.includeResolvedScope)
        ? { meta: toDirectoryResponseMeta(resolvedScope, input.debug?.includeResolvedScope) }
        : {}),
    };
  } catch (error) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de charger l'annuaire.",
      error instanceof Error ? error.message : undefined,
    );
  }
};
