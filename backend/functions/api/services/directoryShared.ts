import { and, asc, desc, inArray, isNull, sql } from 'drizzle-orm';

import { agencies, entities, profiles } from '../../../drizzle/schema.ts';
import type {
  DirectoryCitySuggestionsInput,
  DirectoryOptionsCitiesInput,
  DirectoryOptionsFacetInput,
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
  DirectoryListInput,
  DirectoryListRow,
  DirectoryScopeInput,
  DirectorySortingRule
} from '../../../../shared/schemas/directory.schema.ts';
import type { AuthContext } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess } from './dataAccess.ts';

export type SqlCondition = ReturnType<typeof sql>;
export type ResolvedDirectoryScope = {
  mode: 'single_agency' | 'multi_agency' | 'global_read';
  agencyIds: string[];
  isGlobal: boolean;
};
export type DirectoryResponseMeta = {
  scope: {
    mode: ResolvedDirectoryScope['mode'];
    agencyIds: string[];
  };
};
type DirectoryScopedBaseInput = {
  scope: DirectoryScopeInput;
  type: DirectoryListInput['type'] | DirectoryOptionsFacetInput['type'] | DirectoryOptionsCitiesInput['type'] | DirectoryCitySuggestionsInput['type'];
  includeArchived?: boolean;
  filters?: Pick<DirectoryListInput['filters'], 'includeArchived'>;
};

export const PROSPECT_ENTITY_TYPE_WHERE = sql<boolean>`
  (
    lower(${entities.entity_type}) like '%prospect%'
    or lower(${entities.entity_type}) like '%particulier%'
  )
`;

export const commercialDisplayNameSql = sql<string>`
  coalesce(
    nullif(${profiles.display_name}, ''),
    nullif(trim(concat_ws(' ', ${profiles.first_name}, ${profiles.last_name})), ''),
    ${profiles.email}
  )
`;

export const normalizedNameSql = sql<string>`lower(${entities.name})`;
export const normalizedEntityTypeSql = sql<string>`lower(${entities.entity_type})`;
export const normalizedClientNumberSql = sql<string>`lower(coalesce(${entities.client_number}, ''))`;
export const normalizedCitySql = sql<string>`lower(coalesce(${entities.city}, ''))`;
export const normalizedDepartmentSql = sql<string>`lower(coalesce(${entities.department}, ''))`;
export const normalizedAgencyNameSql = sql<string>`lower(coalesce(${agencies.name}, ''))`;
export const normalizedCommercialNameSql = sql<string>`lower(coalesce(${commercialDisplayNameSql}, ''))`;
export const normalizedOfficialDataSourceSql = sql<'api-recherche-entreprises' | null>`
  case
    when ${entities.official_data_source} = 'api-recherche-entreprises' then 'api-recherche-entreprises'
    else null
  end
`;
export const numericClientNumberSql = sql<number | null>`
  case
    when coalesce(${entities.client_number}, '') ~ '^[0-9]+$' then (${entities.client_number})::numeric
    else null
  end
`;
export const numericDepartmentSql = sql<number | null>`
  case
    when coalesce(${entities.department}, '') ~ '^[0-9]+$' then (${entities.department})::integer
    else null
  end
`;

const toEntityTypeCondition = (
  type: DirectoryListInput['type'] | DirectoryOptionsFacetInput['type'] | DirectoryOptionsCitiesInput['type'] | DirectoryCitySuggestionsInput['type']
): SqlCondition | undefined => {
  if (type === 'client') {
    return sql<boolean>`${entities.entity_type} = 'Client'`;
  }

  if (type === 'prospect') {
    return PROSPECT_ENTITY_TYPE_WHERE;
  }

  return undefined;
};

const getIncludeArchived = (
  input: DirectoryScopedBaseInput
): boolean => input.filters?.includeArchived ?? Boolean(input.includeArchived);

export const resolveAccessibleAgencyIds = (
  authContext: AuthContext,
  agencyIds: string[]
): string[] => {
  if (agencyIds.length === 0) {
    return authContext.isSuperAdmin ? [] : authContext.agencyIds;
  }

  return Array.from(new Set(agencyIds.map((agencyId) => ensureAgencyAccess(authContext, agencyId))));
};

const resolveActiveAgencyId = (authContext: AuthContext): string => {
  const activeAgencyId = authContext.activeAgencyId ?? (
    authContext.agencyIds.length === 1 ? authContext.agencyIds[0] : null
  );

  if (!activeAgencyId) {
    throw httpError(400, 'AGENCY_ID_INVALID', 'Agence active requise.');
  }

  return ensureAgencyAccess(authContext, activeAgencyId);
};

const toResolvedDirectoryScope = (agencyIds: string[]): ResolvedDirectoryScope => ({
  mode: agencyIds.length === 1 ? 'single_agency' : 'multi_agency',
  agencyIds,
  isGlobal: false
});

export const resolveDirectoryScope = (
  authContext: AuthContext,
  scope: DirectoryScopeInput,
  options: { allowAllAccessible?: boolean } = {}
): ResolvedDirectoryScope => {
  if (scope.mode === 'active_agency') {
    return toResolvedDirectoryScope([resolveActiveAgencyId(authContext)]);
  }

  if (scope.mode === 'selected_agencies') {
    return toResolvedDirectoryScope(
      Array.from(new Set(scope.agencyIds.map((agencyId) => ensureAgencyAccess(authContext, agencyId))))
    );
  }

  if (!options.allowAllAccessible) {
    throw httpError(
      400,
      'INVALID_PAYLOAD',
      'Scope annuaire trop large pour cette operation.'
    );
  }

  if (authContext.isSuperAdmin) {
    return {
      mode: 'global_read',
      agencyIds: [],
      isGlobal: true
    };
  }

  if (authContext.agencyIds.length === 0) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  return toResolvedDirectoryScope(authContext.agencyIds);
};

export const toDirectoryScopeCondition = (
  resolvedScope: ResolvedDirectoryScope
): SqlCondition | undefined => {
  if (resolvedScope.isGlobal) {
    return undefined;
  }

  if (resolvedScope.agencyIds.length === 0) {
    return sql<boolean>`false`;
  }

  if (resolvedScope.agencyIds.length === 1) {
    return sql<boolean>`${entities.agency_id} = ${resolvedScope.agencyIds[0]}`;
  }

  return inArray(entities.agency_id, resolvedScope.agencyIds);
};

export const toDirectoryResponseMeta = (
  resolvedScope: ResolvedDirectoryScope,
  includeResolvedScope?: boolean
): DirectoryResponseMeta | undefined => includeResolvedScope
  ? {
    scope: {
      mode: resolvedScope.mode,
      agencyIds: resolvedScope.agencyIds
    }
  }
  : undefined;

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

export const toAccessibleAgencyCondition = (
  authContext: AuthContext,
  agencyIds: string[]
): SqlCondition | undefined => {
  if (authContext.isSuperAdmin && agencyIds.length === 0) {
    return sql<boolean>`false`;
  }

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

// Role-scoped variant (no listing-style "explicit choice required" semantic).
// Use for record-by-id reads where the natural key already isolates a single row
// and we only need to enforce row-level access by role:
//   - super admin: no agency filter
//   - member of >=1 agencies: restrict to those agencies
//   - member of 0 agencies: deny (false)
export const toRoleScopedAgencyCondition = (
  authContext: AuthContext
): SqlCondition | undefined => {
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

export const escapeLikePattern = (value: string): string =>
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

export const buildBaseWhereClause = (
  authContext: AuthContext,
  input: DirectoryScopedBaseInput
): SqlCondition => {
  const conditions: SqlCondition[] = [];
  const accessibleAgencyCondition = toDirectoryScopeCondition(resolveDirectoryScope(authContext, input.scope));
  const entityTypeCondition = toEntityTypeCondition(input.type);

  if (accessibleAgencyCondition) {
    conditions.push(accessibleAgencyCondition);
  }

  if (!getIncludeArchived(input)) {
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

export const buildListWhereClause = (
  authContext: AuthContext,
  input: DirectoryListInput
): SqlCondition => {
  const conditions: SqlCondition[] = [buildBaseWhereClause(authContext, input)];
  const searchCondition = buildSearchCondition(input.filters.q);

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  const normalizedDepartments = input.filters.departments.map((department) => department.toLowerCase());
  const departmentCondition = buildTextInCondition(normalizedDepartmentSql, normalizedDepartments);
  if (departmentCondition) {
    conditions.push(departmentCondition);
  }

  if (input.filters.city) {
    conditions.push(sql<boolean>`${normalizedCitySql} = ${input.filters.city.toLowerCase()}`);
  }

  if (input.filters.cirCommercialIds.length === 1) {
    conditions.push(sql<boolean>`${entities.cir_commercial_id} = ${input.filters.cirCommercialIds[0]}`);
  }

  if (input.filters.cirCommercialIds.length > 1) {
    conditions.push(inArray(entities.cir_commercial_id, input.filters.cirCommercialIds));
  }

  return and(...conditions) ?? sql<boolean>`true`;
};

const appendStableFallback = (orders: SqlCondition[]): SqlCondition[] => {
  const nameFallback = asc(normalizedNameSql);
  return [...orders, nameFallback];
};

export const toSortingOrder = (sorting: DirectorySortingRule[]): SqlCondition[] => {
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

export const normalizeDepartment = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeNullableText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeNullableCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

export const normalizeNullableYear = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

export const normalizeNullableAmount = (value: number | null | undefined): number | null =>
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

export const normalizeSignal = (value: boolean | string | number | null | undefined): boolean =>
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

export const normalizeEstablishmentStatus = (
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

export const normalizeClientKind = (
  value: string | null | undefined
): DirectoryListRow['client_kind'] =>
  value === 'company' || value === 'individual' ? value : null;

export const normalizePhoneDigits = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

export const toCommercialOption = (row: { id: string; display_name: string | null }): DirectoryCommercialOption | null => {
  const label = row.display_name?.trim() ?? '';
  if (!label) {
    return null;
  }

  return {
    id: row.id,
    display_name: label
  };
};
