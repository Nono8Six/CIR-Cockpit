import { and, desc, eq, or, sql } from "drizzle-orm";

import { agencies, entities, profiles } from "../../../drizzle/schema.ts";
import type {
  DirectoryDuplicateMatch,
  DirectoryDuplicatesInput,
  DirectoryListRow,
} from "../../../../shared/schemas/directory.schema.ts";
import type { DbClient } from "../types.ts";
import { type SqlCondition } from "./directoryShared.ts";
import {
  duplicateCompanySelect,
  toDirectoryDuplicateRecord,
} from "./directoryDuplicateRows.ts";

export const buildCompanyDuplicateReason = (
  input: Extract<DirectoryDuplicatesInput, { kind: "company" }>,
  row: DirectoryListRow,
): string | null => {
  if (input.siret && row.siret === input.siret) {
    return "SIRET deja present";
  }

  if (input.siren && row.siren === input.siren) {
    return "SIREN deja present";
  }

  const normalizedInputName = input.name.trim().toLowerCase();
  const normalizedRowName = row.name.trim().toLowerCase();
  const normalizedInputCity = input.city?.trim().toLowerCase() ?? "";
  const normalizedRowCity = row.city?.trim().toLowerCase() ?? "";

  if (
    normalizedInputName.length > 0 && normalizedInputName === normalizedRowName
  ) {
    if (
      normalizedInputCity.length > 0 &&
      normalizedInputCity === normalizedRowCity
    ) {
      return "Nom et ville deja presents";
    }

    return "Nom deja present";
  }

  return null;
};

export const getCompanyDuplicateMatches = async (
  db: DbClient,
  baseWhereClause: SqlCondition,
  input: Extract<DirectoryDuplicatesInput, { kind: "company" }>,
): Promise<DirectoryDuplicateMatch[]> => {
  const identifierConditions = [
    input.siret ? eq(entities.siret, input.siret) : undefined,
    input.siren ? eq(entities.siren, input.siren) : undefined,
  ].filter((condition): condition is SqlCondition => Boolean(condition));
  const cityCondition = input.city
    ? sql<
      boolean
    >`lower(coalesce(${entities.city}, '')) = ${input.city.trim().toLowerCase()}`
    : undefined;
  const nameCondition = sql<
    boolean
  >`lower(${entities.name}) = ${input.name.trim().toLowerCase()}`;
  const scopedNameCondition = cityCondition
    ? and(nameCondition, cityCondition)
    : nameCondition;
  const companyConditions = [
    ...identifierConditions,
    scopedNameCondition,
  ].filter((condition): condition is SqlCondition => Boolean(condition));
  const whereClause = and(
    baseWhereClause,
    or(...companyConditions),
  ) ?? baseWhereClause;

  const rows = await db
    .select(duplicateCompanySelect)
    .from(entities)
    .leftJoin(agencies, eq(entities.agency_id, agencies.id))
    .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
    .where(whereClause)
    .orderBy(desc(entities.updated_at))
    .limit(12);

  return rows
    .map((row) => {
      const record = toDirectoryDuplicateRecord(row);
      const reason = buildCompanyDuplicateReason(input, record);
      return reason ? { record, reason } : null;
    })
    .filter((entry): entry is DirectoryDuplicateMatch => entry !== null);
};
