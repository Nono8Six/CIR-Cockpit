import { asc, eq } from 'drizzle-orm';
import type { ZodType } from 'zod/v4';

import {
  agency_entities,
  agency_families,
  agency_interaction_types,
  agency_services,
  agency_settings,
  agency_statuses,
  app_settings,
  reference_departments
} from '../../../drizzle/schema.ts';
import type { ConfigGetResponse } from '../../../../shared/schemas/api-responses.ts';
import {
  agencySettingsSchema,
  appSettingsSchema,
  configStatusCategorySchema,
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_APP_SETTINGS,
  EMPTY_AGENCY_REFERENCE_CONFIG,
  type AgencyReferenceConfig,
  type AgencySettings,
  type AgencyStatusConfig,
  type AppSettings,
  type ConfigStatusCategory,
  type ConfigGetInput,
  type DepartmentReference
} from '../../../../shared/schemas/config.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';

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

const loadAppSettings = async (db: DbClient): Promise<AppSettings> => {
  try {
    const rows = await db
      .select({
        feature_flags: app_settings.feature_flags,
        onboarding: app_settings.onboarding
      })
      .from(app_settings)
      .where(eq(app_settings.id, 1))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return DEFAULT_APP_SETTINGS;
    }

    return parseStoredJson(row, appSettingsSchema, 'les parametres produit');
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') {
      throw error;
    }
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les parametres produit.');
  }
};

const loadAgencySettings = async (
  db: DbClient,
  agencyId: string | null
): Promise<AgencySettings> => {
  if (!agencyId) {
    return DEFAULT_AGENCY_SETTINGS;
  }

  try {
    const rows = await db
      .select({
        onboarding: agency_settings.onboarding
      })
      .from(agency_settings)
      .where(eq(agency_settings.agency_id, agencyId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return DEFAULT_AGENCY_SETTINGS;
    }

    return parseStoredJson({ onboarding: row.onboarding }, agencySettingsSchema, "les parametres d'agence");
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'DB_READ_FAILED') {
      throw error;
    }
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger les parametres d'agence.");
  }
};

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
    const [statuses, services, entities, families, interactionTypes] = await Promise.all([
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
        .select({ label: agency_entities.label })
        .from(agency_entities)
        .where(eq(agency_entities.agency_id, agencyId))
        .orderBy(asc(agency_entities.sort_order)),
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
      entities: entities.map((row) => row.label),
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

  const [product, agency, departments, references] = await Promise.all([
    loadAppSettings(db),
    loadAgencySettings(db, resolvedAgencyId),
    loadDepartments(db),
    loadAgencyReferences(db, resolvedAgencyId)
  ]);

  return {
    request_id: requestId,
    ok: true,
    snapshot: {
      product,
      agency,
      references: {
        ...references,
        departments
      }
    }
  };
};
