import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

import { agencies, entities, entity_contacts, profiles } from '../../../drizzle/schema.ts';
import type {
  DirectoryDuplicateMatch,
  DirectoryDuplicatesInput,
  DirectoryListRow
} from '../../../../shared/schemas/directory.schema.ts';
import type { DirectoryDuplicatesResponse } from '../../../../shared/schemas/api-responses.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { ensureDataRateLimit } from './dataAccess.ts';
import {
  buildBaseWhereClause,
  commercialDisplayNameSql,
  normalizeClientKind,
  normalizePhoneDigits,
  type SqlCondition
} from './directoryShared.ts';

export type DirectoryDuplicateLookupRow = DirectoryListRow & {
  contact_email: string | null;
  contact_phone: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
};

const toDirectoryDuplicateRecord = (
  row: DirectoryDuplicateLookupRow
): DirectoryListRow => ({
  id: row.id,
  entity_type: row.entity_type,
  client_kind: normalizeClientKind(row.client_kind),
  client_number: row.client_number,
  account_type: row.account_type,
  name: row.name,
  city: row.city,
  postal_code: row.postal_code,
  department: row.department,
  siret: row.siret,
  siren: row.siren,
  official_name: row.official_name,
  agency_id: row.agency_id,
  agency_name: row.agency_name,
  cir_commercial_id: row.cir_commercial_id,
  cir_commercial_name: row.cir_commercial_name,
  archived_at: row.archived_at,
  updated_at: row.updated_at
});

export const buildCompanyDuplicateReason = (
  input: Extract<DirectoryDuplicatesInput, { kind: 'company' }>,
  row: DirectoryListRow
): string | null => {
  if (input.siret && row.siret === input.siret) {
    return 'SIRET deja present';
  }

  if (input.siren && row.siren === input.siren) {
    return 'SIREN deja present';
  }

  const normalizedInputName = input.name.trim().toLowerCase();
  const normalizedRowName = row.name.trim().toLowerCase();
  const normalizedInputCity = input.city?.trim().toLowerCase() ?? '';
  const normalizedRowCity = row.city?.trim().toLowerCase() ?? '';

  if (normalizedInputName.length > 0 && normalizedInputName === normalizedRowName) {
    if (normalizedInputCity.length > 0 && normalizedInputCity === normalizedRowCity) {
      return 'Nom et ville deja presents';
    }

    return 'Nom deja present';
  }

  return null;
};

export const rankIndividualDuplicate = (
  input: Extract<DirectoryDuplicatesInput, { kind: 'individual' }>,
  row: DirectoryDuplicateLookupRow
): { rank: number; reason: string } | null => {
  const normalizedEmail = input.email?.trim().toLowerCase() ?? '';
  const normalizedPhone = normalizePhoneDigits(input.phone);
  const normalizedFirstName = input.first_name.trim().toLowerCase();
  const normalizedLastName = input.last_name.trim().toLowerCase();
  const normalizedCity = input.city.trim().toLowerCase();
  const normalizedRowFirstName = row.contact_first_name?.trim().toLowerCase() ?? '';
  const normalizedRowLastName = row.contact_last_name?.trim().toLowerCase() ?? '';
  const normalizedRowEmail = row.contact_email?.trim().toLowerCase() ?? '';
  const normalizedRowPhone = normalizePhoneDigits(row.contact_phone);
  const normalizedRowCity = row.city?.trim().toLowerCase() ?? '';
  const matchesName = normalizedRowFirstName === normalizedFirstName && normalizedRowLastName === normalizedLastName;

  if (normalizedEmail && normalizedRowEmail === normalizedEmail) {
    return { rank: 0, reason: 'Email deja present' };
  }

  if (normalizedPhone && normalizedRowPhone === normalizedPhone) {
    return { rank: 1, reason: 'Telephone deja present' };
  }

  if (matchesName && row.postal_code === input.postal_code) {
    return { rank: 2, reason: 'Nom, prenom et code postal deja presents' };
  }

  if (matchesName && normalizedRowCity === normalizedCity) {
    return { rank: 3, reason: 'Nom, prenom et ville deja presents' };
  }

  return null;
};

export const getDirectoryDuplicates = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryDuplicatesInput
): Promise<DirectoryDuplicatesResponse> => {
  await ensureDataRateLimit(`directory:duplicates:${input.kind}`, authContext.userId);

  const baseWhereClause = buildBaseWhereClause(authContext, {
    type: 'all',
    agencyIds: input.agencyIds,
    includeArchived: input.includeArchived
  });

  if (input.kind === 'company') {
    const companyConditions = [
      input.siret ? eq(entities.siret, input.siret) : undefined,
      input.siren ? eq(entities.siren, input.siren) : undefined,
      sql<boolean>`lower(${entities.name}) = ${input.name.trim().toLowerCase()}`
    ].filter((condition): condition is SqlCondition => Boolean(condition));

    const cityCondition = input.city
      ? sql<boolean>`lower(coalesce(${entities.city}, '')) = ${input.city.trim().toLowerCase()}`
      : undefined;
    const whereClause = and(
      baseWhereClause,
      cityCondition ? or(...companyConditions.map((condition) => and(condition, cityCondition) ?? condition)) : or(...companyConditions)
    ) ?? baseWhereClause;

    const rows = await db
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
        contact_email: sql<string | null>`null`,
        contact_phone: sql<string | null>`null`,
        contact_first_name: sql<string | null>`null`,
        contact_last_name: sql<string | null>`null`
      })
      .from(entities)
      .leftJoin(agencies, eq(entities.agency_id, agencies.id))
      .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
      .where(whereClause)
      .orderBy(desc(entities.updated_at))
      .limit(12);

    const matches = rows
      .map((row) => {
        const record = toDirectoryDuplicateRecord(row);
        const reason = buildCompanyDuplicateReason(input, record);
        return reason ? { record, reason } : null;
      })
      .filter((entry): entry is DirectoryDuplicateMatch => entry !== null);

    return {
      request_id: requestId,
      ok: true,
      matches
    };
  }

  const normalizedEmail = input.email?.trim().toLowerCase() ?? '';
  const normalizedPhone = normalizePhoneDigits(input.phone);
  const normalizedLastName = input.last_name.trim().toLowerCase();
  const driverConditions = [
    sql<boolean>`lower(coalesce(${entity_contacts.last_name}, '')) = ${normalizedLastName}`,
    normalizedEmail
      ? sql<boolean>`lower(coalesce(${entity_contacts.email}, '')) = ${normalizedEmail}`
      : undefined,
    normalizedPhone
      ? sql<boolean>`regexp_replace(coalesce(${entity_contacts.phone}, ''), '[^0-9]', '', 'g') = ${normalizedPhone}`
      : undefined
  ].filter(Boolean) as SqlCondition[];

  const rows = await db
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
      contact_email: entity_contacts.email,
      contact_phone: entity_contacts.phone,
      contact_first_name: entity_contacts.first_name,
      contact_last_name: entity_contacts.last_name
    })
    .from(entities)
    .leftJoin(agencies, eq(entities.agency_id, agencies.id))
    .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
    .leftJoin(
      entity_contacts,
      and(eq(entity_contacts.entity_id, entities.id), isNull(entity_contacts.archived_at))
    )
    .where(and(baseWhereClause, or(...driverConditions)) ?? baseWhereClause)
    .orderBy(desc(entities.updated_at))
    .limit(24);

  const matchesById = new Map<string, { rank: number; match: DirectoryDuplicateMatch }>();

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
        reason: ranking.reason
      }
    });
  }

  const matches = Array.from(matchesById.values())
    .sort((left, right) => left.rank - right.rank || right.match.record.updated_at.localeCompare(left.match.record.updated_at))
    .map((entry) => entry.match);

  return {
    request_id: requestId,
    ok: true,
    matches
  };
};
