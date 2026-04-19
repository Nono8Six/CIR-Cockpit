import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod/v4';

import { agencies, agency_members, entities, entity_contacts, profiles } from '../../../drizzle/schema.ts';
import type {
  DirectoryAgencyOption,
  DirectoryCompanyDetails,
  DirectoryCompanyDetailsInput,
  DirectoryCitySuggestionsInput,
  DirectoryCompanySearchInput,
  DirectoryCompanySearchResult,
  DirectoryCommercialOption,
  DirectoryDuplicateMatch,
  DirectoryDuplicatesInput,
  DirectoryListInput,
  DirectoryListRow,
  DirectoryOptionsInput,
  DirectoryRecord,
  DirectoryRouteRef,
  DirectorySuggestionOption,
  DirectorySortingRule
} from '../../../../shared/schemas/directory.schema.ts';
import type {
  DirectoryCitySuggestionsResponse,
  DirectoryCompanyDetailsResponse,
  DirectoryCompanySearchResponse,
  DirectoryDuplicatesResponse,
  DirectoryListResponse,
  DirectoryOptionsResponse,
  DirectoryRecordResponse
} from '../../../../shared/schemas/api-responses.ts';
import {
  executeCompanySearch,
  type CompanySearchPageRequest
} from '../../../../shared/search/companySearch.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';

type SqlCondition = ReturnType<typeof sql>;
const COMPANY_SEARCH_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const COMPANY_SEARCH_TIMEOUT_MS = 6_000;
const enterpriseApiNullableYearSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.trim());
      return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
    }

    return null;
  });

const enterpriseApiNumericValueSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.replace(',', '.').trim());
      return Number.isFinite(normalized) ? normalized : null;
    }

    return null;
  });

const enterpriseApiEstablishmentSchema = z.object({
  siret: z.string().trim().min(1, 'SIRET requis').nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
  code_postal: z.string().trim().nullable().optional(),
  libelle_commune: z.string().trim().nullable().optional(),
  departement: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  est_siege: z.boolean().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  date_creation: z.string().trim().nullable().optional(),
  date_debut_activite: z.string().trim().nullable().optional(),
  date_fermeture: z.string().trim().nullable().optional(),
  ancien_siege: z.boolean().optional(),
  nom_commercial: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  caractere_employeur: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  statut_diffusion_etablissement: z.string().trim().nullable().optional(),
  liste_enseignes: z.union([z.array(z.string()), z.string(), z.null(), z.undefined()])
}).passthrough();

const enterpriseApiDirectorSchema = z.object({
  nom: z.string().trim().nullable().optional(),
  prenoms: z.string().trim().nullable().optional(),
  annee_de_naissance: z.number().int().nonnegative().nullable().optional(),
  qualite: z.string().trim().nullable().optional(),
  nationalite: z.string().trim().nullable().optional()
}).passthrough();

const enterpriseApiFinancialYearSchema = z.object({
  ca: enterpriseApiNumericValueSchema,
  resultat_net: enterpriseApiNumericValueSchema
}).passthrough();

const enterpriseApiComplementsSchema = z.object({
  est_association: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_ess: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_qualiopi: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_rge: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_bio: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_organisme_formation: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_service_public: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_societe_mission: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()])
}).partial().passthrough();

const enterpriseApiCompanySchema = z.object({
  siren: z.string().trim().min(1, 'SIREN requis'),
  nom_complet: z.string().trim().min(1, 'Nom complet requis'),
  nom_raison_sociale: z.string().trim().nullable().optional(),
  sigle: z.string().trim().nullable().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  categorie_entreprise: z.string().trim().nullable().optional(),
  caractere_employeur: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  date_creation: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  nature_juridique: z.string().trim().nullable().optional(),
  section_activite_principale: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  statut_diffusion: z.string().trim().nullable().optional(),
  nombre_etablissements: z.number().int().nonnegative().nullable().optional(),
  nombre_etablissements_ouverts: z.number().int().nonnegative().nullable().optional(),
  siege: enterpriseApiEstablishmentSchema.nullable().optional(),
  matching_etablissements: z.array(enterpriseApiEstablishmentSchema).default([]),
  dirigeants: z.array(enterpriseApiDirectorSchema).default([]),
  finances: z.record(z.string(), enterpriseApiFinancialYearSchema).nullable().optional(),
  complements: enterpriseApiComplementsSchema.nullable().optional()
}).passthrough();

const enterpriseApiSearchResponseSchema = z.object({
  results: z.array(enterpriseApiCompanySchema).default([])
}).passthrough();

const PROSPECT_ENTITY_TYPE_WHERE = sql<boolean>`
  (
    lower(${entities.entity_type}) like '%prospect%'
    or lower(${entities.entity_type}) like '%particulier%'
  )
`;

const commercialDisplayNameSql = sql<string>`
  coalesce(
    nullif(${profiles.display_name}, ''),
    nullif(trim(concat_ws(' ', ${profiles.first_name}, ${profiles.last_name})), ''),
    ${profiles.email}
  )
`;

const normalizedNameSql = sql<string>`lower(${entities.name})`;
const normalizedEntityTypeSql = sql<string>`lower(${entities.entity_type})`;
const normalizedClientNumberSql = sql<string>`lower(coalesce(${entities.client_number}, ''))`;
const normalizedCitySql = sql<string>`lower(coalesce(${entities.city}, ''))`;
const normalizedDepartmentSql = sql<string>`lower(coalesce(${entities.department}, ''))`;
const normalizedAgencyNameSql = sql<string>`lower(coalesce(${agencies.name}, ''))`;
const normalizedCommercialNameSql = sql<string>`lower(coalesce(${commercialDisplayNameSql}, ''))`;
const normalizedOfficialDataSourceSql = sql<'api-recherche-entreprises' | null>`
  case
    when ${entities.official_data_source} = 'api-recherche-entreprises' then 'api-recherche-entreprises'
    else null
  end
`;
const numericClientNumberSql = sql<number | null>`
  case
    when coalesce(${entities.client_number}, '') ~ '^[0-9]+$' then (${entities.client_number})::numeric
    else null
  end
`;
const numericDepartmentSql = sql<number | null>`
  case
    when coalesce(${entities.department}, '') ~ '^[0-9]+$' then (${entities.department})::integer
    else null
  end
`;

const toEntityTypeCondition = (
  type: DirectoryListInput['type'] | DirectoryOptionsInput['type'] | DirectoryCitySuggestionsInput['type']
): SqlCondition | undefined => {
  if (type === 'client') {
    return sql<boolean>`${entities.entity_type} = 'Client'`;
  }

  if (type === 'prospect') {
    return PROSPECT_ENTITY_TYPE_WHERE;
  }

  return undefined;
};

const resolveAccessibleAgencyIds = (
  authContext: AuthContext,
  agencyIds: string[]
): string[] => {
  if (agencyIds.length === 0) {
    return authContext.isSuperAdmin ? [] : authContext.agencyIds;
  }

  return Array.from(new Set(agencyIds.map((agencyId) => ensureAgencyAccess(authContext, agencyId))));
};

const buildTextInCondition = (
  column: SqlCondition,
  values: string[]
): SqlCondition | undefined => {
  if (values.length === 0) {
    return undefined;
  }

  if (values.length === 1) {
    return sql<boolean>`${column} = ${values[0]}`;
  }

  return sql<boolean>`${column} in (${sql.join(values.map((value) => sql`${value}`), sql`, `)})`;
};

const toAccessibleAgencyCondition = (
  authContext: AuthContext,
  agencyIds: string[]
): SqlCondition | undefined => {
  const resolvedAgencyIds = resolveAccessibleAgencyIds(authContext, agencyIds);

  if (resolvedAgencyIds.length > 0) {
    if (resolvedAgencyIds.length === 1) {
      return sql<boolean>`${entities.agency_id} = ${resolvedAgencyIds[0]}`;
    }

    return inArray(entities.agency_id, resolvedAgencyIds);
  }

  if (authContext.isSuperAdmin) {
    return undefined;
  }

  if (authContext.agencyIds.length === 0) {
    return sql<boolean>`false`;
  }

  if (authContext.agencyIds.length === 1) {
    return sql<boolean>`${entities.agency_id} = ${authContext.agencyIds[0]}`;
  }

  return inArray(entities.agency_id, authContext.agencyIds);
};

const escapeLikePattern = (value: string): string =>
  value.toLowerCase().replaceAll('%', '').replaceAll('_', '');

const buildSearchCondition = (query: string | undefined): SqlCondition | undefined => {
  if (!query) {
    return undefined;
  }

  const pattern = `%${escapeLikePattern(query)}%`;

  return sql<boolean>`
    (
      ${normalizedNameSql} like ${pattern}
      or ${normalizedClientNumberSql} like ${pattern}
      or ${normalizedCitySql} like ${pattern}
      or lower(coalesce(${entities.postal_code}, '')) like ${pattern}
    )
  `;
};

const buildBaseWhereClause = (
  authContext: AuthContext,
  input: DirectoryOptionsInput | DirectoryListInput | DirectoryCitySuggestionsInput
): SqlCondition => {
  const conditions: SqlCondition[] = [];
  const accessibleAgencyCondition = toAccessibleAgencyCondition(authContext, input.agencyIds);
  const entityTypeCondition = toEntityTypeCondition(input.type);

  if (accessibleAgencyCondition) {
    conditions.push(accessibleAgencyCondition);
  }

  if (!input.includeArchived) {
    conditions.push(isNull(entities.archived_at));
  }

  if (entityTypeCondition) {
    conditions.push(entityTypeCondition);
  }

  if (conditions.length === 0) {
    return sql<boolean>`true`;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions) ?? sql<boolean>`true`;
};

const buildListWhereClause = (
  authContext: AuthContext,
  input: DirectoryListInput
): SqlCondition => {
  const conditions: SqlCondition[] = [buildBaseWhereClause(authContext, input)];
  const searchCondition = buildSearchCondition(input.q);

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const normalizedDepartments = input.departments.map((department) => department.toLowerCase());
  const departmentCondition = buildTextInCondition(normalizedDepartmentSql, normalizedDepartments);
  if (departmentCondition) {
    conditions.push(departmentCondition);
  }

  if (input.city) {
    conditions.push(sql<boolean>`${normalizedCitySql} = ${input.city.toLowerCase()}`);
  }

  if (input.cirCommercialIds.length === 1) {
    conditions.push(eq(entities.cir_commercial_id, input.cirCommercialIds[0]));
  }

  if (input.cirCommercialIds.length > 1) {
    conditions.push(inArray(entities.cir_commercial_id, input.cirCommercialIds));
  }

  return and(...conditions) ?? sql<boolean>`true`;
};

const appendStableFallback = (orders: SqlCondition[]): SqlCondition[] => {
  const nameFallback = asc(normalizedNameSql);
  return [...orders, nameFallback];
};

const toSortingOrder = (sorting: DirectorySortingRule[]): SqlCondition[] => {
  const orders: SqlCondition[] = [];

  for (const rule of sorting) {
    const direction = rule.desc ? desc : asc;

    switch (rule.id) {
      case 'entity_type':
        orders.push(direction(normalizedEntityTypeSql));
        break;
      case 'client_number':
        orders.push(direction(numericClientNumberSql));
        orders.push(direction(normalizedClientNumberSql));
        break;
      case 'city':
        orders.push(direction(normalizedCitySql));
        break;
      case 'department':
        orders.push(direction(numericDepartmentSql));
        orders.push(direction(normalizedDepartmentSql));
        break;
      case 'agency_name':
        orders.push(direction(normalizedAgencyNameSql));
        break;
      case 'cir_commercial_name':
        orders.push(direction(normalizedCommercialNameSql));
        break;
      case 'updated_at':
        orders.push(direction(entities.updated_at));
        break;
      case 'name':
      default:
        orders.push(direction(normalizedNameSql));
        break;
    }
  }

  return appendStableFallback(orders);
};

const normalizeDepartment = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const normalizeNullableYear = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const normalizeNullableAmount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const normalizeBooleanFlag = (value: boolean | string | number | null | undefined): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'o', 'oui', 'true', 'vrai', 'y', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'n', 'non', 'false', 'faux', 'no'].includes(normalized)) {
    return false;
  }

  return null;
};

const normalizeSignal = (value: boolean | string | number | null | undefined): boolean =>
  normalizeBooleanFlag(value) ?? false;

export const normalizeTextArray = (value: string[] | string | null | undefined): string[] => {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      entries
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
};

const normalizeEstablishmentStatus = (
  value: string | null | undefined
): DirectoryCompanySearchResult['establishment_status'] => {
  if (value === 'A') {
    return 'open';
  }

  if (value === 'F') {
    return 'closed';
  }

  return 'unknown';
};

const normalizeClientKind = (
  value: string | null | undefined
): DirectoryListRow['client_kind'] =>
  value === 'company' || value === 'individual' ? value : null;

const normalizePhoneDigits = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

const toCommercialOption = (row: { id: string; display_name: string | null }): DirectoryCommercialOption | null => {
  const label = row.display_name?.trim() ?? '';
  if (!label) {
    return null;
  }

  return {
    id: row.id,
    display_name: label
  };
};

export const listDirectory = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryListInput
): Promise<DirectoryListResponse> => {
  await ensureDataRateLimit('directory:list', authContext.userId);

  const whereClause = buildListWhereClause(authContext, input);
  const offset = (input.page - 1) * input.pageSize;

  try {
    const [rows, countRows] = await Promise.all([
      db
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
          updated_at: entities.updated_at
        })
        .from(entities)
        .leftJoin(agencies, eq(entities.agency_id, agencies.id))
        .leftJoin(profiles, eq(entities.cir_commercial_id, profiles.id))
        .where(whereClause)
        .orderBy(...toSortingOrder(input.sorting))
        .limit(input.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(entities)
        .where(whereClause)
    ]);

    const normalizedRows = rows.map((row): DirectoryListRow => ({
      ...row,
      client_kind: normalizeClientKind(row.client_kind)
    }));

    return {
      request_id: requestId,
      ok: true,
      rows: normalizedRows,
      total: Number(countRows[0]?.count ?? 0),
      page: input.page,
      page_size: input.pageSize
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger l'annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryOptions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryOptionsInput
): Promise<DirectoryOptionsResponse> => {
  await ensureDataRateLimit('directory:options', authContext.userId);

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const selectedAgencyIds = resolveAccessibleAgencyIds(authContext, input.agencyIds);
  const allAccessibleAgencyIds = authContext.isSuperAdmin ? [] : authContext.agencyIds;
  const agenciesWhereClause = authContext.isSuperAdmin && allAccessibleAgencyIds.length === 0
    ? isNull(agencies.archived_at)
    : allAccessibleAgencyIds.length > 0
      ? and(inArray(agencies.id, allAccessibleAgencyIds), isNull(agencies.archived_at))
      : sql<boolean>`false`;
  const commercialsWhereClause = selectedAgencyIds.length > 0
    ? and(inArray(agency_members.agency_id, selectedAgencyIds), isNull(profiles.archived_at))
    : authContext.isSuperAdmin
      ? and(isNotNull(agency_members.agency_id), isNull(profiles.archived_at))
      : authContext.agencyIds.length > 0
        ? and(inArray(agency_members.agency_id, authContext.agencyIds), isNull(profiles.archived_at))
        : sql<boolean>`false`;

  try {
    const [agencyRows, commercialRows, departmentRows] = await Promise.all([
      db
        .select({
          id: agencies.id,
          name: agencies.name
        })
        .from(agencies)
        .where(agenciesWhereClause)
        .orderBy(asc(sql`lower(${agencies.name})`)),
      db
        .select({
          id: profiles.id,
          display_name: commercialDisplayNameSql
        })
        .from(agency_members)
        .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
        .where(commercialsWhereClause)
        .orderBy(asc(sql`lower(${commercialDisplayNameSql})`)),
      db
        .select({
          department: entities.department
        })
        .from(entities)
        .where(and(baseWhereClause, isNotNull(entities.department)))
        .orderBy(asc(normalizedDepartmentSql))
    ]);

    const departments = Array.from(
      new Set(
        departmentRows
          .map((row) => normalizeDepartment(row.department))
          .filter((value): value is string => value !== null)
      )
    );

    const commercials = Array.from(
      new Map(
        commercialRows
          .map(toCommercialOption)
          .filter((value): value is DirectoryCommercialOption => value !== null)
          .map((option) => [option.id, option])
      ).values()
    );

    return {
      request_id: requestId,
      ok: true,
      agencies: agencyRows satisfies DirectoryAgencyOption[],
      commercials,
      departments
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger les filtres de l'annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryCitySuggestions = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCitySuggestionsInput
): Promise<DirectoryCitySuggestionsResponse> => {
  await ensureDataRateLimit('directory:city-suggestions', authContext.userId);

  const normalizedQuery = input.q.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return {
      request_id: requestId,
      ok: true,
      cities: []
    };
  }

  const baseWhereClause = buildBaseWhereClause(authContext, input);
  const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`;
  const containsPattern = `%${escapeLikePattern(normalizedQuery)}%`;

  try {
    const rows = await db
      .select({
        city: entities.city,
        rank: sql<number>`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`
      })
      .from(entities)
      .where(
        and(
          baseWhereClause,
          isNotNull(entities.city),
          sql<boolean>`lower(${entities.city}) like ${containsPattern}`
        )
      )
      .groupBy(entities.city)
      .orderBy(
        asc(sql`case when lower(${entities.city}) like ${prefixPattern} then 0 else 1 end`),
        asc(normalizedCitySql)
      )
      .limit(12);

    return {
      request_id: requestId,
      ok: true,
      cities: rows
        .map((row) => row.city?.trim() ?? '')
        .filter((value) => value.length > 0)
        .map((value): DirectorySuggestionOption => ({
          value,
          label: value
        }))
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de proposer des villes.',
      error instanceof Error ? error.message : undefined
    );
  }
};

export const getDirectoryRecord = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  route: DirectoryRouteRef
): Promise<DirectoryRecordResponse> => {
  await ensureDataRateLimit('directory:record', authContext.userId);

  const routeCondition = route.kind === 'client'
    ? and(eq(entities.entity_type, 'Client'), eq(entities.client_number, route.clientNumber))
    : and(PROSPECT_ENTITY_TYPE_WHERE, eq(entities.id, route.id));

  const accessibleAgencyCondition = toAccessibleAgencyCondition(authContext, []);
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
        updated_at: entities.updated_at
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
        'NOT_FOUND',
        route.kind === 'client' ? 'Client introuvable.' : 'Prospect introuvable.'
      );
    }

    return {
      request_id: requestId,
      ok: true,
      record: {
        ...record,
        client_kind: normalizeClientKind(record.client_kind)
      } satisfies DirectoryRecord
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }

    throw httpError(
      500,
      'DB_READ_FAILED',
      "Impossible de charger la fiche annuaire.",
      error instanceof Error ? error.message : undefined
    );
  }
};

export const buildCompanySearchUrl = (input: CompanySearchPageRequest): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set('q', input.query);
  url.searchParams.set('minimal', 'true');
  url.searchParams.set('include', 'siege,matching_etablissements');
  if (input.department) {
    url.searchParams.set('departement', input.department);
  }
  if (input.city) {
    url.searchParams.set('ville', input.city);
  }
  url.searchParams.set('page', String(input.page));
  url.searchParams.set('per_page', String(input.per_page));
  return url.toString();
};

const buildCompanyDetailsUrl = (siren: string): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set('q', siren);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '10');
  return url.toString();
};

const mapEnterpriseApiEstablishment = (
  company: z.infer<typeof enterpriseApiSearchResponseSchema>['results'][number],
  establishment: z.infer<typeof enterpriseApiEstablishmentSchema>
): DirectoryCompanySearchResult => ({
  name: company.nom_complet,
  address: normalizeNullableText(establishment.adresse),
  postal_code: normalizeNullableText(establishment.code_postal),
  city: normalizeNullableText(establishment.libelle_commune),
  department: normalizeNullableText(establishment.departement),
  region: normalizeNullableText(establishment.region),
  date_creation: normalizeNullableText(establishment.date_creation),
  date_debut_activite: normalizeNullableText(establishment.date_debut_activite),
  employee_range: normalizeNullableText(establishment.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(establishment.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(establishment.caractere_employeur),
  establishment_diffusion_status: normalizeNullableText(establishment.statut_diffusion_etablissement),
  brands: normalizeTextArray(establishment.liste_enseignes),
  is_head_office: Boolean(establishment.est_siege ?? false),
  is_former_head_office: Boolean(establishment.ancien_siege ?? false),
  establishment_status: normalizeEstablishmentStatus(establishment.etat_administratif),
  establishment_closed_at: normalizeNullableText(establishment.date_fermeture),
  commercial_name: normalizeNullableText(establishment.nom_commercial),
  company_establishments_count: normalizeNullableCount(company.nombre_etablissements),
  company_open_establishments_count: normalizeNullableCount(company.nombre_etablissements_ouverts),
  match_quality: 'expanded',
  match_explanation: null,
  siret: normalizeNullableText(establishment.siret),
  siren: normalizeNullableText(company.siren),
  naf_code: normalizeNullableText(establishment.activite_principale ?? company.activite_principale),
  official_name: normalizeNullableText(company.nom_raison_sociale) ?? company.nom_complet,
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: new Date().toISOString()
});

const mapEnterpriseApiCompany = (
  company: z.infer<typeof enterpriseApiSearchResponseSchema>['results'][number]
): DirectoryCompanySearchResult[] => {
  const establishments = company.matching_etablissements.length > 0
    ? company.matching_etablissements
    : company.siege
      ? [company.siege]
      : [];

  return establishments.map((establishment) => mapEnterpriseApiEstablishment(company, establishment));
};

const normalizeEnterpriseApiDirectors = (
  directors: z.infer<typeof enterpriseApiDirectorSchema>[]
): DirectoryCompanyDetails['directors'] =>
  directors.flatMap((director) => {
    const fullName = [director.prenoms, director.nom]
      .map((value) => normalizeNullableText(value))
      .filter((value): value is string => value !== null)
      .join(' ');

    if (!fullName) {
      return [];
    }

    return [{
      full_name: fullName,
      role: normalizeNullableText(director.qualite),
      nationality: normalizeNullableText(director.nationalite),
      birth_year: normalizeNullableYear(director.annee_de_naissance)
    }];
  });

const normalizeEnterpriseApiFinancials = (
  financials: Record<string, z.infer<typeof enterpriseApiFinancialYearSchema>> | null | undefined
): DirectoryCompanyDetails['financials'] => {
  if (!financials) {
    return null;
  }

  const latestEntry = Object.entries(financials)
    .map(([year, values]) => ({
      year: Number(year),
      values
    }))
    .filter((entry) => Number.isInteger(entry.year))
    .sort((left, right) => right.year - left.year)[0];

  if (!latestEntry) {
    return null;
  }

  return {
    latest_year: latestEntry.year,
    revenue: normalizeNullableAmount(latestEntry.values.ca),
    net_income: normalizeNullableAmount(latestEntry.values.resultat_net)
  };
};

const normalizeEnterpriseApiSignals = (
  complements: z.infer<typeof enterpriseApiComplementsSchema> | null | undefined
): DirectoryCompanyDetails['signals'] => ({
  association: normalizeSignal(complements?.est_association),
  ess: normalizeSignal(complements?.est_ess),
  qualiopi: normalizeSignal(complements?.est_qualiopi),
  rge: normalizeSignal(complements?.est_rge),
  bio: normalizeSignal(complements?.est_bio),
  organisme_formation: normalizeSignal(complements?.est_organisme_formation),
  service_public: normalizeSignal(complements?.est_service_public),
  societe_mission: normalizeSignal(complements?.est_societe_mission)
});

const mapEnterpriseApiCompanyDetails = (
  company: z.infer<typeof enterpriseApiCompanySchema>
): DirectoryCompanyDetails => ({
  siren: company.siren,
  official_name: normalizeNullableText(company.nom_raison_sociale) ?? company.nom_complet,
  name: company.nom_complet,
  sigle: normalizeNullableText(company.sigle),
  nature_juridique: normalizeNullableText(company.nature_juridique),
  categorie_entreprise: normalizeNullableText(company.categorie_entreprise),
  date_creation: normalizeNullableText(company.date_creation),
  etat_administratif: normalizeNullableText(company.etat_administratif),
  activite_principale: normalizeNullableText(company.activite_principale),
  activite_principale_naf25: normalizeNullableText(company.activite_principale_naf25),
  section_activite_principale: normalizeNullableText(company.section_activite_principale),
  company_establishments_count: normalizeNullableCount(company.nombre_etablissements),
  company_open_establishments_count: normalizeNullableCount(company.nombre_etablissements_ouverts),
  employee_range: normalizeNullableText(company.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(company.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(company.caractere_employeur),
  diffusion_status: normalizeNullableText(company.statut_diffusion),
  directors: normalizeEnterpriseApiDirectors(company.dirigeants),
  financials: normalizeEnterpriseApiFinancials(company.finances),
  signals: normalizeEnterpriseApiSignals(company.complements)
});

const fetchEnterpriseApiSearchResponse = async (
  requestUrl: string
): Promise<z.infer<typeof enterpriseApiSearchResponseSchema>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPANY_SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIR-Cockpit/1.0'
      },
      signal: controller.signal
    });

    if (response.status === 429) {
      throw httpError(429, 'RATE_LIMITED', 'Le service entreprises est temporairement indisponible. Reessayez.');
    }

    if (!response.ok) {
      throw httpError(
        502,
        'REQUEST_FAILED',
        'Le service entreprises est indisponible.',
        `status=${response.status}`
      );
    }

    const payload = await response.json();
    const parsed = enterpriseApiSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(
        502,
        'REQUEST_FAILED',
        'Reponse invalide du service entreprises.',
        parsed.error.message
      );
    }

    return parsed.data;
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code')) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw httpError(504, 'REQUEST_FAILED', 'Le service entreprises a mis trop de temps a repondre.');
    }

    throw httpError(
      502,
      'REQUEST_FAILED',
      'Impossible de contacter le service entreprises.',
      error instanceof Error ? error.message : undefined
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

export type DirectoryDuplicateLookupRow = DirectoryListRow & {
  contact_email: string | null;
  contact_phone: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
};

const fetchCompanySearchPage = async (
  input: CompanySearchPageRequest
): Promise<DirectoryCompanySearchResult[]> => {
  const payload = await fetchEnterpriseApiSearchResponse(buildCompanySearchUrl(input));
  return payload.results.flatMap(mapEnterpriseApiCompany);
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

export const getDirectoryCompanySearch = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  await ensureDataRateLimit('directory:company-search', authContext.userId);
  const result = await executeCompanySearch(
    input,
    fetchCompanySearchPage,
    (error) => {
      const code = typeof error === 'object' && error !== null
        ? Reflect.get(error, 'code')
        : null;
      return code === 'RATE_LIMITED' ? 'rate-limited' : 'fatal';
    }
  );

  return {
    request_id: requestId,
    ok: true,
    companies: result.companies
  };
};

export const getDirectoryCompanyDetails = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> => {
  await ensureDataRateLimit('directory:company-details', authContext.userId);

  const payload = await fetchEnterpriseApiSearchResponse(buildCompanyDetailsUrl(input.siren));
  const company = payload.results.find((entry) => entry.siren === input.siren);

  if (!company) {
    throw httpError(404, 'NOT_FOUND', 'Societe introuvable.');
  }

  return {
    request_id: requestId,
    ok: true,
    company: mapEnterpriseApiCompanyDetails(company)
  };
};
