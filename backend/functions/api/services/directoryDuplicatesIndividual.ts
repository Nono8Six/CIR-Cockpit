import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import {
  agencies,
  entities,
  entity_contacts,
  profiles,
} from "../../../drizzle/schema.ts";
import type {
  DirectoryDuplicateMatch,
  DirectoryDuplicatesInput,
} from "../../../../shared/schemas/directory.schema.ts";
import type { DbClient } from "../types.ts";
import { normalizePhoneDigits, type SqlCondition } from "./directoryShared.ts";
import {
  type DirectoryDuplicateLookupRow,
  duplicateIndividualSelect,
  toDirectoryDuplicateRecord,
} from "./directoryDuplicateRows.ts";

export const rankIndividualDuplicate = (
  input: Extract<DirectoryDuplicatesInput, { kind: "individual" }>,
  row: DirectoryDuplicateLookupRow,
): { rank: number; reason: string } | null => {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? "";
  const normalizedPhone = normalizePhoneDigits(input.phone);
  const normalizedFirstName = input.first_name.trim().toLowerCase();
  const normalizedLastName = input.last_name.trim().toLowerCase();
  const normalizedCity = input.city.trim().toLowerCase();
  const normalizedRowFirstName = row.contact_first_name?.trim().toLowerCase() ??
    "";
  const normalizedRowLastName = row.contact_last_name?.trim().toLowerCase() ??
    "";
  const normalizedRowEmail = row.contact_email?.trim().toLowerCase() ?? "";
  const normalizedRowPhone = normalizePhoneDigits(row.contact_phone);
  const normalizedRowCity = row.city?.trim().toLowerCase() ?? "";
  const matchesName = normalizedRowFirstName === normalizedFirstName &&
    normalizedRowLastName === normalizedLastName;

  if (normalizedEmail && normalizedRowEmail === normalizedEmail) {
    return { rank: 0, reason: "Email deja present" };
  }

  if (normalizedPhone && normalizedRowPhone === normalizedPhone) {
    return { rank: 1, reason: "Telephone deja present" };
  }

  if (matchesName && row.postal_code === input.postal_code) {
    return { rank: 2, reason: "Nom, prenom et code postal deja presents" };
  }

  if (matchesName && normalizedRowCity === normalizedCity) {
    return { rank: 3, reason: "Nom, prenom et ville deja presents" };
  }

  return null;
};

export const getIndividualDuplicateMatches = async (
  db: DbClient,
  baseWhereClause: SqlCondition,
  input: Extract<DirectoryDuplicatesInput, { kind: "individual" }>,
): Promise<DirectoryDuplicateMatch[]> => {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? "";
  const normalizedPhone = normalizePhoneDigits(input.phone);
  const normalizedLastName = input.last_name.trim().toLowerCase();
  const driverConditions: SqlCondition[] = [
    sql<
      boolean
    >`lower(coalesce(${entity_contacts.last_name}, '')) = ${normalizedLastName}`,
  ];

  if (normalizedEmail) {
    driverConditions.push(
      sql<
        boolean
      >`lower(coalesce(${entity_contacts.email}, '')) = ${normalizedEmail}`,
    );
  }

  if (normalizedPhone) {
    driverConditions.push(
      sql<
        boolean
      >`regexp_replace(coalesce(${entity_contacts.phone}, ''), '[^0-9]', '', 'g') = ${normalizedPhone}`,
    );
  }

  const rows = await db
    .select(duplicateIndividualSelect)
    .from(entities)
    .leftJoin(agencies, eq(entities.agency_id, agencies.id))
    .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
    .leftJoin(
      entity_contacts,
      and(
        eq(entity_contacts.entity_id, entities.id),
        isNull(entity_contacts.archived_at),
      ),
    )
    .where(and(baseWhereClause, or(...driverConditions)) ?? baseWhereClause)
    .orderBy(desc(entities.updated_at))
    .limit(24);

  const matchesById = new Map<
    string,
    { rank: number; match: DirectoryDuplicateMatch }
  >();

  for (const row of rows) {
    const ranking = rankIndividualDuplicate(input, row);
    if (!ranking) {
      continue;
    }

    const existing = matchesById.get(row.id);
    if (existing && existing.rank <= ranking.rank) {
      continue;
    }

    matchesById.set(row.id, {
      rank: ranking.rank,
      match: {
        record: toDirectoryDuplicateRecord(row),
        reason: ranking.reason,
      },
    });
  }

  return Array.from(matchesById.values())
    .sort((left, right) =>
      left.rank - right.rank ||
      right.match.record.updated_at.localeCompare(left.match.record.updated_at)
    )
    .map((entry) => entry.match);
};
