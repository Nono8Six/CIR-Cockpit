import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  agencies,
  business_profile_types,
  customer_account_secondary_commercials,
  customer_accounts,
  entities,
  organization_business_profiles,
  profiles,
  tier_role_types,
  tier_roles
} from '../../../../../drizzle/schema.ts';
import {
  tierContactReadSchema,
  tierOrganizationReadSchema,
  type TierContactRead,
  type TierDirectoryListInput,
  type TierOrganizationRead
} from '../../../../../../shared/schemas/entity/tier-foundation.schema.ts';
import type { TierV1DirectoryListResponse } from '../../../../../../shared/schemas/system/api-responses.ts';
import type { Database } from '../../../../../../shared/supabase.types.ts';
import type { AuthContext, DbClient } from '../../../types.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import { ensureDataRateLimit } from '../../data/dataAccess.ts';
import {
  resolveDirectoryScope,
  toDirectoryResponseMeta,
  type ResolvedDirectoryScope
} from '../../directory/core/directoryShared.ts';

type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type SqlCondition = ReturnType<typeof sql>;

const nullableText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const isoTimestamp = (value: string): string => new Date(value).toISOString();
const nullableIsoTimestamp = (value: string | null | undefined): string | null =>
  value ? isoTimestamp(value) : null;

const commercialDisplayName = (profile: {
  display_name: string | null;
  first_name: string | null;
  last_name: string;
  email: string;
}): string => nullableText(profile.display_name)
  ?? nullableText([profile.first_name, profile.last_name].filter(Boolean).join(' '))
  ?? profile.email;

const formatValidationDetails = (issues: Array<{ path: PropertyKey[]; message: string }>): string =>
  issues.map((issue) => `${issue.path.map(String).join('.') || 'payload'}: ${issue.message}`).join(' | ');

export const toTierContactReads = (rows: EntityContactRow[]): TierContactRead[] => {
  const candidates = rows.map((row) => ({
    id: row.id,
    organization_id: row.entity_id,
    legacy_entity_id: row.entity_id,
    first_name: nullableText(row.first_name),
    last_name: row.last_name,
    email: nullableText(row.email),
    phone: nullableText(row.phone),
    position: nullableText(row.position),
    service_label: nullableText(row.service_label),
    is_primary: row.is_primary,
    notes: nullableText(row.notes),
    archived_at: nullableIsoTimestamp(row.archived_at),
    created_at: isoTimestamp(row.created_at),
    updated_at: isoTimestamp(row.updated_at),
    provenance: {
      source_system: 'entity_contacts',
      source_record_id: row.id,
      authority: 'cir_cockpit' as const,
      synced_at: null
    }
  }));
  const parsed = tierContactReadSchema.array().safeParse(candidates);
  if (!parsed.success) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Contrat de lecture des contacts invalide.',
      formatValidationDetails(parsed.error.issues)
    );
  }
  return parsed.data;
};

export const loadTierOrganizationsByIds = async (
  db: DbClient,
  entityIds: string[],
  options: { includeHistoricalRoles?: boolean } = {}
): Promise<TierOrganizationRead[]> => {
  const ids = Array.from(new Set(entityIds));
  if (ids.length === 0) return [];

  try {
    const roleConditions = [inArray(tier_roles.entity_id, ids)];
    if (options.includeHistoricalRoles === false) roleConditions.push(isNull(tier_roles.valid_to));

    const [entityRows, roleRows, accountRows, secondaryRows, businessProfileRows, referenceRows] = await Promise.all([
      db.select().from(entities).where(inArray(entities.id, ids)),
      db
        .select({
          id: tier_roles.id,
          entity_id: tier_roles.entity_id,
          code: tier_roles.role_code,
          label: tier_role_types.label,
          is_active_reference: tier_role_types.is_active,
          valid_from: tier_roles.valid_from,
          valid_to: tier_roles.valid_to,
          source_system: tier_roles.source_system,
          source_record_id: tier_roles.source_record_id
        })
        .from(tier_roles)
        .innerJoin(tier_role_types, eq(tier_role_types.code, tier_roles.role_code))
        .where(and(...roleConditions) ?? sql<boolean>`true`)
        .orderBy(asc(tier_role_types.sort_order), desc(tier_roles.valid_from)),
      db
        .select({
          id: customer_accounts.id,
          entity_id: customer_accounts.entity_id,
          client_number: customer_accounts.client_number,
          account_type: customer_accounts.account_type,
          account_status: customer_accounts.account_status,
          agency_id: customer_accounts.agency_id,
          agency_name: agencies.name,
          primary_commercial_id: customer_accounts.primary_commercial_id,
          primary_display_name: profiles.display_name,
          primary_first_name: profiles.first_name,
          primary_last_name: profiles.last_name,
          primary_email: profiles.email,
          number_authority: customer_accounts.number_authority,
          status_authority: customer_accounts.status_authority,
          source_system: customer_accounts.source_system,
          source_record_id: customer_accounts.source_record_id,
          source_synced_at: customer_accounts.source_synced_at,
          archived_at: customer_accounts.archived_at
        })
        .from(customer_accounts)
        .innerJoin(agencies, eq(agencies.id, customer_accounts.agency_id))
        .leftJoin(profiles, eq(profiles.id, customer_accounts.primary_commercial_id))
        .where(inArray(customer_accounts.entity_id, ids)),
      db
        .select({
          account_id: customer_account_secondary_commercials.customer_account_id,
          id: profiles.id,
          display_name: profiles.display_name,
          first_name: profiles.first_name,
          last_name: profiles.last_name,
          email: profiles.email
        })
        .from(customer_account_secondary_commercials)
        .innerJoin(customer_accounts, eq(customer_accounts.id, customer_account_secondary_commercials.customer_account_id))
        .innerJoin(profiles, eq(profiles.id, customer_account_secondary_commercials.commercial_id))
        .where(inArray(customer_accounts.entity_id, ids)),
      db
        .select({
          id: organization_business_profiles.id,
          entity_id: organization_business_profiles.entity_id,
          code: organization_business_profiles.profile_code,
          label: business_profile_types.label,
          is_primary: organization_business_profiles.is_primary,
          valid_from: organization_business_profiles.valid_from,
          valid_to: organization_business_profiles.valid_to,
          source_system: organization_business_profiles.source_system,
          source_record_id: organization_business_profiles.source_record_id
        })
        .from(organization_business_profiles)
        .innerJoin(business_profile_types, eq(business_profile_types.code, organization_business_profiles.profile_code))
        .where(inArray(organization_business_profiles.entity_id, ids))
        .orderBy(desc(organization_business_profiles.is_primary), asc(business_profile_types.sort_order)),
      db.select({ code: business_profile_types.code }).from(business_profile_types).limit(1)
    ]);

    const rolesByEntity = new Map<string, typeof roleRows>();
    for (const role of roleRows) rolesByEntity.set(role.entity_id, [...(rolesByEntity.get(role.entity_id) ?? []), role]);
    const accountByEntity = new Map(accountRows.map((account) => [account.entity_id, account]));
    const secondaryByAccount = new Map<string, typeof secondaryRows>();
    for (const commercial of secondaryRows) {
      secondaryByAccount.set(commercial.account_id, [...(secondaryByAccount.get(commercial.account_id) ?? []), commercial]);
    }
    const businessProfilesByEntity = new Map<string, typeof businessProfileRows>();
    for (const profile of businessProfileRows) {
      businessProfilesByEntity.set(profile.entity_id, [...(businessProfilesByEntity.get(profile.entity_id) ?? []), profile]);
    }

    const candidates = entityRows.map((entity) => {
      const rawRoles = rolesByEntity.get(entity.id) ?? [];
      const roles = rawRoles.map((role) => ({
        id: role.id,
        code: role.code,
        label: role.label,
        is_active_reference: role.is_active_reference,
          valid_from: isoTimestamp(role.valid_from),
          valid_to: nullableIsoTimestamp(role.valid_to),
        provenance: {
          source_system: role.source_system,
          source_record_id: role.source_record_id,
          authority: role.source_system === 'entities_compatibility' ? 'compatibility' as const : 'cir_cockpit' as const,
          synced_at: null
        }
      }));
      const activeRoleCodes = new Set(rawRoles.filter((role) => role.valid_to === null).map((role) => role.code));
      const account = accountByEntity.get(entity.id);
      const primaryCommercial = account?.primary_commercial_id && account.primary_last_name && account.primary_email
        ? {
          id: account.primary_commercial_id,
          display_name: commercialDisplayName({
            display_name: account.primary_display_name,
            first_name: account.primary_first_name,
            last_name: account.primary_last_name,
            email: account.primary_email
          }),
          email: account.primary_email
        }
        : null;
      const secondaryCommercials = account
        ? (secondaryByAccount.get(account.id) ?? []).map((commercial) => ({
          id: commercial.id,
          display_name: commercialDisplayName(commercial),
          email: commercial.email
        }))
        : [];
      const activeBusinessProfiles = (businessProfilesByEntity.get(entity.id) ?? []).filter((profile) => profile.valid_to === null);
      const mappedBusinessProfiles = activeBusinessProfiles.map((profile) => ({
        id: profile.id,
        code: profile.code,
        label: profile.label,
        is_primary: profile.is_primary,
        valid_from: isoTimestamp(profile.valid_from),
        valid_to: nullableIsoTimestamp(profile.valid_to),
        provenance: {
          source_system: profile.source_system,
          source_record_id: profile.source_record_id,
          authority: 'cir_cockpit' as const,
          synced_at: null
        }
      }));
      const primaryBusinessProfile = mappedBusinessProfiles.find((profile) => profile.is_primary) ?? null;
      const businessProfileState = referenceRows.length === 0
        ? 'reference_data_missing' as const
        : mappedBusinessProfiles.length === 0
          ? 'assignment_missing' as const
          : 'available' as const;
      const isClient = activeRoleCodes.has('client');
      const missingData: TierOrganizationRead['missing_data'] = [];
      if (isClient && !account) missingData.push('customer_account');
      if (isClient && account && !primaryCommercial) missingData.push('primary_commercial');
      if (businessProfileState === 'reference_data_missing') missingData.push('business_profile_reference');
      if (businessProfileState === 'assignment_missing') missingData.push('business_profile_assignment');

      return {
        id: entity.id,
        legacy_entity_id: entity.id,
        name: entity.name,
        legal_form_code: nullableText(entity.legal_form_code),
        naf_code: nullableText(entity.naf_code),
        city: nullableText(entity.city),
        primary_phone: nullableText(entity.primary_phone),
        primary_email: nullableText(entity.primary_email),
        archived_at: nullableIsoTimestamp(entity.archived_at),
        created_at: isoTimestamp(entity.created_at),
        updated_at: isoTimestamp(entity.updated_at),
        roles,
        customer_account_state: account ? 'available' as const : isClient ? 'missing' as const : 'not_applicable' as const,
        customer_account: account
          ? {
            id: account.id,
            client_number: account.client_number,
            account_type: account.account_type,
            account_status: nullableText(account.account_status),
            agency: { id: account.agency_id, name: account.agency_name },
            primary_commercial: primaryCommercial,
            secondary_commercials: secondaryCommercials,
            number_authority: account.number_authority,
            status_authority: account.status_authority,
            archived_at: nullableIsoTimestamp(account.archived_at),
            provenance: {
              source_system: account.source_system,
              source_record_id: account.source_record_id,
              authority: account.source_system === 'entities_compatibility' ? 'compatibility' as const : 'erp_as400' as const,
              synced_at: nullableIsoTimestamp(account.source_synced_at)
            }
          }
          : null,
        responsible_agency: account ? { id: account.agency_id, name: account.agency_name } : null,
        primary_commercial_state: !isClient ? 'not_applicable' as const : primaryCommercial ? 'available' as const : 'missing' as const,
        business_profiles: {
          state: businessProfileState,
          primary: primaryBusinessProfile,
          secondary: mappedBusinessProfiles.filter((profile) => !profile.is_primary)
        },
        missing_data: missingData,
        provenance: {
          source_system: 'entities',
          source_record_id: entity.id,
          authority: 'cir_cockpit' as const,
          synced_at: null
        },
        compatibility: {
          entity_type: entity.entity_type,
          agency_id: entity.agency_id,
          cir_commercial_id: entity.cir_commercial_id,
          client_number: entity.client_number,
          account_type: entity.account_type
        }
      };
    });

    const parsed = tierOrganizationReadSchema.array().safeParse(candidates);
    if (!parsed.success) {
      throw httpError(
        500,
        'DB_READ_FAILED',
        'Contrat de lecture Tiers invalide.',
        formatValidationDetails(parsed.error.issues)
      );
    }
    const byId = new Map(parsed.data.map((tier) => [tier.id, tier]));
    return ids.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') throw error;
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de charger les tiers.',
      error instanceof Error ? error.message : undefined
    );
  }
};

const valuesCondition = (values: string[]): SqlCondition =>
  sql`(${sql.join(values.map((value) => sql`${value}`), sql`, `)})`;

const escapeLikePattern = (value: string): string => value
  .replaceAll('\\', '\\\\')
  .replaceAll('%', '\\%')
  .replaceAll('_', '\\_');

const toTierScopeCondition = (scope: ResolvedDirectoryScope): SqlCondition | undefined => {
  if (scope.isGlobal) return undefined;
  if (scope.agencyIds.length === 0) return sql<boolean>`false`;
  const ids = valuesCondition(scope.agencyIds);
  return sql<boolean>`(
    exists (
      select 1 from public.customer_accounts account
      where account.entity_id = ${entities.id} and account.agency_id in ${ids}
    )
    or (
      not exists (select 1 from public.customer_accounts account where account.entity_id = ${entities.id})
      and ${entities.agency_id} in ${ids}
    )
    or (
      ${entities.agency_id} is null
      and exists (
        select 1 from public.tier_roles role
        where role.entity_id = ${entities.id} and role.role_code = 'supplier' and role.valid_to is null
      )
    )
  )`;
};

const buildTierDirectoryConditions = (
  scope: ResolvedDirectoryScope,
  input: TierDirectoryListInput
): SqlCondition[] => {
  const conditions: SqlCondition[] = [];
  const scopeCondition = toTierScopeCondition(scope);
  if (scopeCondition) conditions.push(scopeCondition);
  if (!input.include_archived) conditions.push(isNull(entities.archived_at));
  if (input.query) {
    const pattern = `%${escapeLikePattern(input.query.toLowerCase())}%`;
    conditions.push(sql<boolean>`(
      lower(${entities.name}) like ${pattern} escape '\\'
      or lower(coalesce(${entities.client_number}, '')) like ${pattern} escape '\\'
      or lower(coalesce(${entities.supplier_code}, '')) like ${pattern} escape '\\'
      or lower(coalesce(${entities.supplier_number}, '')) like ${pattern} escape '\\'
      or lower(coalesce(${entities.siret}, '')) like ${pattern} escape '\\'
      or lower(coalesce(${entities.siren}, '')) like ${pattern} escape '\\'
      or lower(coalesce(${entities.city}, '')) like ${pattern} escape '\\'
      or exists (
        select 1 from public.entity_contacts contact
        where contact.entity_id = ${entities.id}
          and (
            lower(coalesce(contact.first_name, '')) like ${pattern} escape '\\'
            or lower(contact.last_name) like ${pattern} escape '\\'
            or lower(coalesce(contact.email, '')) like ${pattern} escape '\\'
            or regexp_replace(coalesce(contact.phone, ''), '\\D', '', 'g') like ${pattern} escape '\\'
          )
      )
    )`);
  }
  if (input.role_codes.length > 0) {
    const roles = valuesCondition(input.role_codes);
    conditions.push(sql<boolean>`exists (
      select 1 from public.tier_roles role
      where role.entity_id = ${entities.id}
        and role.role_code in ${roles}
        ${input.include_historical_roles ? sql`` : sql`and role.valid_to is null`}
    )`);
  }
  if (input.business_profile_codes.length > 0) {
    const profilesFilter = valuesCondition(input.business_profile_codes);
    conditions.push(sql<boolean>`exists (
      select 1 from public.organization_business_profiles business_profile
      where business_profile.entity_id = ${entities.id}
        and business_profile.profile_code in ${profilesFilter}
        and business_profile.valid_to is null
    )`);
  }
  if (input.primary_commercial !== 'all') {
    conditions.push(sql<boolean>`exists (
      select 1 from public.customer_accounts account
      where account.entity_id = ${entities.id}
        and account.primary_commercial_id is ${input.primary_commercial === 'missing' ? sql`null` : sql`not null`}
    )`);
  }
  return conditions;
};

export const resolveTierDirectoryScope = (
  authContext: AuthContext,
  input: Pick<TierDirectoryListInput, 'scope'>
): ResolvedDirectoryScope => resolveDirectoryScope(
  authContext,
  input.scope,
  { allowAllAccessible: true }
);

export const listTierDirectory = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: TierDirectoryListInput
): Promise<TierV1DirectoryListResponse> => {
  await ensureDataRateLimit('directory:tiers-list', authContext.userId);
  const scope = resolveTierDirectoryScope(authContext, input);
  const conditions = buildTierDirectoryConditions(scope, input);
  const whereClause = conditions.length > 0 ? and(...conditions) ?? sql<boolean>`true` : sql<boolean>`true`;
  const offset = (input.page - 1) * input.page_size;

  try {
    const [idRows, countRows] = await Promise.all([
      db
        .select({ id: entities.id })
        .from(entities)
        .where(whereClause)
        .orderBy(asc(sql<string>`lower(${entities.name})`), asc(entities.id))
        .limit(input.page_size)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(entities).where(whereClause)
    ]);
    const rows = await loadTierOrganizationsByIds(
      db,
      idRows.map((row) => row.id),
      { includeHistoricalRoles: input.include_historical_roles }
    );
    return {
      request_id: requestId,
      ok: true,
      rows,
      page: input.page,
      page_size: input.page_size,
      total: Number(countRows[0]?.count ?? 0),
      meta: toDirectoryResponseMeta(scope, true)!
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') throw error;
    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger l'annuaire des tiers.",
      error instanceof Error ? error.message : undefined
    );
  }
};
