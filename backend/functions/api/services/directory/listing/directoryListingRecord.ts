import { and, eq } from "drizzle-orm";

import { agencies, entities, profiles } from '../../../../../drizzle/schema.ts';
import type {
  DirectoryRecord,
  DirectoryRouteRef,
} from '../../../../../../shared/schemas/system/directory.schema.ts';
import type { DirectoryRecordResponse } from '../../../../../../shared/schemas/system/api-responses.ts';
import type { AuthContext, DbClient } from '../../../types.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import { ensureDataRateLimit } from '../../data/dataAccess.ts';
import {
  CLIENT_ENTITY_TYPE_WHERE,
  commercialDisplayNameSql,
  normalizeClientKind,
  normalizedOfficialDataSourceSql,
  PROSPECT_ENTITY_TYPE_WHERE,
  SUPPLIER_ENTITY_TYPE_WHERE,
  type SqlCondition,
  toRoleScopedAgencyCondition,
} from '../core/directoryShared.ts';

const toNullableText = (value: Date | string | null | undefined): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const toRequiredText = (value: Date | string | null | undefined): string =>
  toNullableText(value) ?? "";

const toDirectoryRecord = (
  record: Awaited<ReturnType<typeof getDirectoryRecordRows>>[number],
): DirectoryRecord => ({
  id: record.id,
  entity_type: toRequiredText(record.entity_type),
  client_kind: normalizeClientKind(record.client_kind),
  client_number: toNullableText(record.client_number),
  supplier_code: toNullableText(record.supplier_code),
  supplier_number: toNullableText(record.supplier_number),
  account_type: record.account_type,
  name: toRequiredText(record.name),
  address: toNullableText(record.address),
  postal_code: toNullableText(record.postal_code),
  department: toNullableText(record.department),
  city: toNullableText(record.city),
  country: toRequiredText(record.country),
  siret: toNullableText(record.siret),
  siren: toNullableText(record.siren),
  naf_code: toNullableText(record.naf_code),
  official_name: toNullableText(record.official_name),
  official_data_source: record.official_data_source,
  official_data_synced_at: toNullableText(record.official_data_synced_at),
  primary_phone: toNullableText(record.primary_phone),
  primary_email: toNullableText(record.primary_email),
  notes: toNullableText(record.notes),
  agency_id: toNullableText(record.agency_id),
  agency_name: toNullableText(record.agency_name),
  cir_commercial_id: toNullableText(record.cir_commercial_id),
  cir_commercial_name: toNullableText(record.cir_commercial_name),
  archived_at: toNullableText(record.archived_at),
  created_at: toRequiredText(record.created_at),
  updated_at: toRequiredText(record.updated_at),
});

const getDirectoryRecordRows = (
  db: DbClient,
  whereClause: SqlCondition,
) =>
  db
    .select({
      id: entities.id,
      entity_type: entities.entity_type,
      client_kind: entities.client_kind,
      client_number: entities.client_number,
      supplier_code: entities.supplier_code,
      supplier_number: entities.supplier_number,
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
      primary_phone: entities.primary_phone,
      primary_email: entities.primary_email,
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

export const getDirectoryRecord = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  route: DirectoryRouteRef,
): Promise<DirectoryRecordResponse> => {
  await ensureDataRateLimit("directory:record", authContext.userId);

  const routeCondition = route.kind === "client"
    ? and(
      CLIENT_ENTITY_TYPE_WHERE,
      eq(entities.client_number, route.clientNumber),
    )
    : route.kind === "prospect"
      ? and(PROSPECT_ENTITY_TYPE_WHERE, eq(entities.id, route.id))
      : and(SUPPLIER_ENTITY_TYPE_WHERE, eq(entities.id, route.id));
  if (!routeCondition) {
    throw httpError(500, "REQUEST_FAILED", "Filtre fiche annuaire invalide.");
  }

  const accessibleAgencyCondition = route.kind === "supplier"
    ? undefined
    : toRoleScopedAgencyCondition(authContext);
  const whereClause = (accessibleAgencyCondition
    ? and(routeCondition, accessibleAgencyCondition)
    : routeCondition) ?? routeCondition;

  try {
    const rows = await getDirectoryRecordRows(db, whereClause);

    const record = rows[0];
    if (!record) {
      throw httpError(
        404,
        "NOT_FOUND",
        route.kind === "client"
          ? "Client introuvable."
          : route.kind === "prospect"
            ? "Prospect introuvable."
            : "Fournisseur introuvable.",
      );
    }

    return {
      request_id: requestId,
      ok: true,
      record: toDirectoryRecord(record),
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
