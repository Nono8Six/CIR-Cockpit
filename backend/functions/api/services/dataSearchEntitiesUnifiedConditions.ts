import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { agency_members, entities, profiles } from '../../../drizzle/schema.ts';
import type { TierV1SearchInput } from '../../../../shared/schemas/tier-v1.schema.ts';
import type { AuthContext } from '../types.ts';
import { ensureAgencyAccess } from './dataAccess.ts';
import { escapeLikePattern, normalizePhoneDigits } from './directoryShared.ts';

type SqlCondition = ReturnType<typeof sql>;

export const resolveUnifiedSearchAgencyIds = (
  authContext: AuthContext,
  agencyId: string | null | undefined
): string[] | null => {
  if (agencyId) {
    return [ensureAgencyAccess(authContext, agencyId)];
  }

  if (authContext.isSuperAdmin) {
    return null;
  }

  return authContext.agencyIds.length > 0 ? authContext.agencyIds : [];
};

const toEntityAgencyCondition = (agencyIds: string[] | null): SqlCondition | undefined => {
  if (agencyIds === null) return undefined;
  if (agencyIds.length === 0) return sql<boolean>`false`;
  if (agencyIds.length === 1) return eq(entities.agency_id, agencyIds[0]);
  return inArray(entities.agency_id, agencyIds);
};

const toMemberAgencyCondition = (agencyIds: string[] | null): SqlCondition | undefined => {
  if (agencyIds === null) return undefined;
  if (agencyIds.length === 0) return sql<boolean>`false`;
  if (agencyIds.length === 1) return eq(agency_members.agency_id, agencyIds[0]);
  return inArray(agency_members.agency_id, agencyIds);
};

const toPhoneDigitVariants = (digits: string): string[] => {
  if (!digits) return [];
  return [
    digits,
    digits.startsWith('0') ? `33${digits.slice(1)}` : '',
    digits.startsWith('33') ? `0${digits.slice(2)}` : ''
  ].filter((entry) => entry.length > 0);
};

const phoneCondition = (
  column: typeof entities.primary_phone | typeof profiles.phone,
  query: string
): SqlCondition => {
  const digitVariants = toPhoneDigitVariants(normalizePhoneDigits(query));
  if (digitVariants.length === 0) return sql<boolean>`false`;
  return or(...digitVariants.map((variant) =>
    sql<boolean>`regexp_replace(coalesce(${column}, ''), '\\D', '', 'g') like ${`%${variant}%`}`
  )) ?? sql<boolean>`false`;
};

const entityTypeCondition = (input: TierV1SearchInput): SqlCondition | undefined => {
  if (input.family === 'clients') return sql<boolean>`${entities.entity_type} = 'Client'`;
  if (input.family === 'prospects') return sql<boolean>`lower(${entities.entity_type}) like '%prospect%'`;
  if (input.family === 'suppliers') return sql<boolean>`${entities.entity_type} = 'Fournisseur'`;
  if (input.family === 'internals') return sql<boolean>`lower(${entities.entity_type}) like '%interne%'`;
  if (input.family === 'solicitations') return sql<boolean>`false`;
  return undefined;
};

const entitySubtypeCondition = (input: TierV1SearchInput): SqlCondition | undefined => {
  if (input.family === 'clients' && input.client_filter === 'individual') {
    return sql<boolean>`${entities.client_kind} = 'individual'`;
  }
  if (input.family === 'clients' && input.client_filter !== 'all') {
    return and(
      sql<boolean>`coalesce(${entities.client_kind}, 'company') = 'company'`,
      sql<boolean>`${entities.account_type} = ${input.client_filter}`
    ) ?? sql<boolean>`false`;
  }
  if (input.family === 'prospects' && input.prospect_filter === 'individual') {
    return sql<boolean>`${entities.client_kind} = 'individual'`;
  }
  if (input.family === 'prospects' && input.prospect_filter === 'company') {
    return sql<boolean>`coalesce(${entities.client_kind}, 'company') = 'company'`;
  }
  return undefined;
};

const entitySearchCondition = (query: string): SqlCondition => {
  const pattern = `%${escapeLikePattern(query)}%`;
  return or(
    sql<boolean>`lower(${entities.name}) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.first_name}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.last_name}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.primary_email}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.client_number}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.siret}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.siren}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.supplier_code}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.supplier_number}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${entities.city}, '')) like ${pattern}`,
    phoneCondition(entities.primary_phone, query)
  ) ?? sql<boolean>`false`;
};

const profileSearchCondition = (query: string): SqlCondition => {
  const pattern = `%${escapeLikePattern(query)}%`;
  return or(
    sql<boolean>`lower(coalesce(${profiles.display_name}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${profiles.first_name}, '')) like ${pattern}`,
    sql<boolean>`lower(coalesce(${profiles.last_name}, '')) like ${pattern}`,
    sql<boolean>`lower(${profiles.email}) like ${pattern}`,
    phoneCondition(profiles.phone, query)
  ) ?? sql<boolean>`false`;
};

export const buildUnifiedEntitySearchConditions = (
  input: TierV1SearchInput,
  agencyIds: string[] | null
): SqlCondition[] => [
  toEntityAgencyCondition(agencyIds),
  input.include_archived ? undefined : isNull(entities.archived_at),
  entityTypeCondition(input),
  entitySubtypeCondition(input),
  entitySearchCondition(input.query)
].filter((condition): condition is SqlCondition => Boolean(condition));

export const buildUnifiedProfileSearchConditions = (
  input: TierV1SearchInput,
  agencyIds: string[] | null
): SqlCondition[] => [
  toMemberAgencyCondition(agencyIds),
  input.include_archived ? undefined : isNull(profiles.archived_at),
  profileSearchCondition(input.query)
].filter((condition): condition is SqlCondition => Boolean(condition));
