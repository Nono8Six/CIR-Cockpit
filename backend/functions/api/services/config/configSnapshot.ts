import { asc, eq } from 'drizzle-orm';
import type { ZodType } from 'zod/v4';

import {
  agency_families,
  agency_interaction_types,
  agency_services,
  agency_statuses,
  reference_departments
} from '../../../../drizzle/schema.ts';
import type { ConfigGetResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import {
  configStatusCategorySchema,
  EMPTY_AGENCY_REFERENCE_CONFIG,
  type AgencyReferenceConfig,
  type AgencyStatusConfig,
  type ConfigStatusCategory,
  type ConfigGetInput,
  type DepartmentReference
} from '../../../../../shared/schemas/system/config.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

type AgencyStatusRow = Omit<AgencyStatusConfig, 'category'> & { category: string };

export const parseStoredJson = <T>(
  value: unknown,
  parser: ZodType<T>,
  resource: string
): T => {
  const parsed = parser.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  throw httpError(
    500,
    'DB_READ_FAILED',
    `Impossible de charger ${resource}.`,
    parsed.error.message
  );
};

export const resolveConfigAgencyId = (
  authContext: AuthContext,
  agencyId: string | undefined
): string | null => {
  const normalizedAgencyId = (agencyId ?? '').trim();
  if (normalizedAgencyId) {
    return ensureAgencyAccess(authContext, normalizedAgencyId);
  }

  if (authContext.isSuperAdmin) {
    return null;
  }

  if (authContext.agencyIds.length === 1) {
    return authContext.agencyIds[0] ?? null;
  }

  throw httpError(400, 'AGENCY_ID_INVALID', 'Identifiant agence requis.');
};

const parseStatusCategory = (value: string): ConfigStatusCategory => {
  const parsed = configStatusCategorySchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  throw httpError(
    500,
    'DB_READ_FAILED',
    'Impossible de charger les referentiels agence.',
    parsed.error.message
  );
};

export const mapAgencyReferenceStatuses = (
  rows: AgencyStatusRow[]
): AgencyReferenceConfig['statuses'] =>
  rows.map((row) => ({
    ...row,
    category: parseStatusCategory(row.category)
  }));

const loadDepartments = async (db: DbClient): Promise<DepartmentReference[]> => {
  try {
    return await db
      .select({
        code: reference_departments.code,
        label: reference_departments.label,
        sort_order: reference_departments.sort_order,
        is_active: reference_departments.is_active
      })
      .from(reference_departments)
      .where(eq(reference_departments.is_active, true))
      .orderBy(asc(reference_departments.sort_order), asc(reference_departments.code));
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les departements.');
  }
};

const loadAgencyReferences = async (
  db: DbClient,
  agencyId: string | null
): Promise<AgencyReferenceConfig> => {
  if (!agencyId) {
    return EMPTY_AGENCY_REFERENCE_CONFIG;
  }

  try {
    const [statuses, services, families, interactionTypes] = await Promise.all([
      db
        .select({
          id: agency_statuses.id,
          agency_id: agency_statuses.agency_id,
          label: agency_statuses.label,
          category: agency_statuses.category,
          is_default: agency_statuses.is_default,
          is_terminal: agency_statuses.is_terminal,
          sort_order: agency_statuses.sort_order
        })
        .from(agency_statuses)
        .where(eq(agency_statuses.agency_id, agencyId))
        .orderBy(asc(agency_statuses.sort_order)),
      db
        .select({ label: agency_services.label })
        .from(agency_services)
        .where(eq(agency_services.agency_id, agencyId))
        .orderBy(asc(agency_services.sort_order)),
      db
        .select({ label: agency_families.label })
        .from(agency_families)
        .where(eq(agency_families.agency_id, agencyId))
        .orderBy(asc(agency_families.sort_order)),
      db
        .select({ label: agency_interaction_types.label })
        .from(agency_interaction_types)
        .where(eq(agency_interaction_types.agency_id, agencyId))
        .orderBy(asc(agency_interaction_types.sort_order))
    ]);

    return {
      statuses: mapAgencyReferenceStatuses(statuses),
      services: services.map((row) => row.label),
      families: families.map((row) => row.label),
      interaction_types: interactionTypes.map((row) => row.label)
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') {
      throw error;
    }
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les referentiels agence.');
  }
};

export const getConfigSnapshot = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: ConfigGetInput
): Promise<ConfigGetResponse> => {
  await ensureDataRateLimit('config:get', authContext.userId);
  const resolvedAgencyId = resolveConfigAgencyId(authContext, input.agency_id);

  const [departments, references] = await Promise.all([
    loadDepartments(db),
    loadAgencyReferences(db, resolvedAgencyId)
  ]);

  return {
    request_id: requestId,
    ok: true,
    snapshot: {
      references: {
        ...references,
        departments
      }
    }
  };
};
