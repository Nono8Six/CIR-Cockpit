import { and, eq, inArray, sql } from 'drizzle-orm';

import {
  agency_entities,
  agency_families,
  agency_interaction_types,
  agency_services,
  agency_settings,
  agency_statuses,
  app_settings
} from '../../../drizzle/schema.ts';
import type {
  ConfigSaveAgencyResponse,
  ConfigSaveProductResponse,
  DataConfigResponse
} from '../../../../shared/schemas/api-responses.ts';
import type {
  AgencyStatusInput,
  ConfigSaveAgencyInput,
  ConfigSaveProductInput
} from '../../../../shared/schemas/config.schema.ts';
import type { DataConfigPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from './dataAccess.ts';

type LabelTable =
  | typeof agency_services
  | typeof agency_entities
  | typeof agency_families
  | typeof agency_interaction_types;

const APP_SETTINGS_SINGLETON_ID = 1;
const STATUS_CATEGORIES = ['todo', 'in_progress', 'done'] as const;

type ExistingStatusRow = {
  id: string;
  label: string;
};

type StatusUpsertRow = {
  id?: string;
  agency_id: string;
  label: string;
  sort_order: number;
  is_default: boolean;
  category: string;
  is_terminal: boolean;
};

export const normalizeLabelList = (labels: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
};

const isStatusCategory = (value: string): value is typeof STATUS_CATEGORIES[number] =>
  STATUS_CATEGORIES.includes(value as typeof STATUS_CATEGORIES[number]);

export const assertValidStatusCategories = (statuses: AgencyStatusInput[]): void => {
  for (const status of statuses) {
    if (!isStatusCategory(status.category)) {
      throw httpError(400, 'CONFIG_INVALID', `Categorie de statut invalide: ${status.category}`);
    }
  }
};

export const buildStatusUpsertRows = (
  statuses: AgencyStatusInput[],
  agencyId: string,
  existingRows: ExistingStatusRow[]
): StatusUpsertRow[] => {
  const existingByLabel = new Map(
    existingRows.map((row) => [row.label.toLowerCase(), row.id])
  );

  return statuses.map((status, index) => {
    const resolvedId =
      status.id ?? existingByLabel.get(status.label.toLowerCase()) ?? undefined;
    return {
      ...(resolvedId ? { id: resolvedId } : {}),
      agency_id: agencyId,
      label: status.label.trim(),
      sort_order: index + 1,
      is_default: index === 0,
      category: status.category,
      is_terminal: status.category === 'done'
    };
  });
};

const ensureAgencySettingsWriteAccess = (authContext: AuthContext): void => {
  if (authContext.role === 'tcs') {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

const syncLabelTable = async (
  db: DbClient,
  table: LabelTable,
  agencyId: string,
  labels: string[]
): Promise<void> => {
  const desired = normalizeLabelList(labels);
  const desiredSet = new Set(desired.map((label) => label.toLowerCase()));

  let existing: Array<{ label: string }> = [];
  try {
    existing = await db
      .select({ label: table.label })
      .from(table)
      .where(eq(table.agency_id, agencyId));
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger la configuration.');
  }

  const toDelete = (existing ?? [])
    .map((item) => item.label)
    .filter((label) => !desiredSet.has(label.toLowerCase()));

  if (desired.length > 0) {
    const rows = desired.map((label, index) => ({
      agency_id: agencyId,
      label,
      sort_order: index + 1
    }));

    try {
      await db
        .insert(table)
        .values(rows)
        .onConflictDoUpdate({
          target: [table.agency_id, table.label],
          set: { sort_order: sql`excluded.sort_order` }
        });
    } catch {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour la configuration.');
    }
  }

  if (toDelete.length > 0) {
    try {
      await db
        .delete(table)
        .where(and(
          eq(table.agency_id, agencyId),
          inArray(table.label, toDelete)
        ));
    } catch {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour la configuration.');
    }
  }
};

const syncStatuses = async (
  db: DbClient,
  agencyId: string,
  statuses: AgencyStatusInput[]
): Promise<void> => {
  if (statuses.length === 0) {
    throw httpError(400, 'CONFIG_INVALID', 'Au moins un statut est requis.');
  }
  assertValidStatusCategories(statuses);

  let existing: ExistingStatusRow[] = [];
  try {
    existing = await db
      .select({
        id: agency_statuses.id,
        label: agency_statuses.label
      })
      .from(agency_statuses)
      .where(eq(agency_statuses.agency_id, agencyId));
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les statuts.');
  }

  const existingRows = existing ?? [];
  const rows = buildStatusUpsertRows(statuses, agencyId, existingRows);

  const rowsWithId = rows.filter((row): row is StatusUpsertRow & { id: string } => typeof row.id === 'string');
  const rowsWithoutId = rows.filter((row) => typeof row.id !== 'string');

  try {
    if (rowsWithId.length > 0) {
      await db
        .insert(agency_statuses)
        .values(rowsWithId)
        .onConflictDoUpdate({
          target: agency_statuses.id,
          set: {
            label: sql`excluded.label`,
            sort_order: sql`excluded.sort_order`,
            is_default: sql`excluded.is_default`,
            category: sql`excluded.category`,
            is_terminal: sql`excluded.is_terminal`
          }
        });
    }

    if (rowsWithoutId.length > 0) {
      await db
        .insert(agency_statuses)
        .values(rowsWithoutId)
        .onConflictDoUpdate({
          target: [agency_statuses.agency_id, agency_statuses.label],
          set: {
            sort_order: sql`excluded.sort_order`,
            is_default: sql`excluded.is_default`,
            category: sql`excluded.category`,
            is_terminal: sql`excluded.is_terminal`
          }
        });
    }
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour les statuts.');
  }

  const desiredIds = new Set(
    rows.map((row) => row.id).filter((value): value is string => typeof value === 'string')
  );
  const toDeleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !desiredIds.has(id));

  if (toDeleteIds.length > 0) {
    try {
      await db
        .delete(agency_statuses)
        .where(and(
          eq(agency_statuses.agency_id, agencyId),
          inArray(agency_statuses.id, toDeleteIds)
        ));
    } catch {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de supprimer les statuts obsoletes.');
    }
  }
};

const syncAgencySettings = async (
  db: DbClient,
  input: ConfigSaveAgencyInput
): Promise<void> => {
  try {
    await db
      .insert(agency_settings)
      .values({
        agency_id: input.agency_id,
        onboarding: input.onboarding
      })
      .onConflictDoUpdate({
        target: agency_settings.agency_id,
        set: {
          onboarding: sql`excluded.onboarding`
        }
      });
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour les parametres agence.');
  }
};

export const saveAgencyConfigSettings = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: ConfigSaveAgencyInput
): Promise<ConfigSaveAgencyResponse> => {
  await ensureDataRateLimit('config:save-agency', authContext.userId);
  ensureAgencySettingsWriteAccess(authContext);
  const resolvedAgencyId = ensureAgencyAccess(authContext, input.agency_id);

  const normalizedInput: ConfigSaveAgencyInput = {
    ...input,
    agency_id: resolvedAgencyId
  };

  await db.transaction(async (tx) => {
    await syncAgencySettings(tx, normalizedInput);
    await syncStatuses(tx, resolvedAgencyId, normalizedInput.references.statuses);
    await syncLabelTable(tx, agency_services, resolvedAgencyId, normalizedInput.references.services);
    await syncLabelTable(tx, agency_entities, resolvedAgencyId, normalizedInput.references.entities);
    await syncLabelTable(tx, agency_families, resolvedAgencyId, normalizedInput.references.families);
    await syncLabelTable(
      tx,
      agency_interaction_types,
      resolvedAgencyId,
      normalizedInput.references.interaction_types
    );
  });

  return { request_id: requestId, ok: true };
};

export const saveProductConfigSettings = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  input: ConfigSaveProductInput
): Promise<ConfigSaveProductResponse> => {
  await ensureDataRateLimit('config:save-product', callerId);

  try {
    await db
      .insert(app_settings)
      .values({
        id: APP_SETTINGS_SINGLETON_ID,
        feature_flags: input.feature_flags,
        onboarding: input.onboarding
      })
      .onConflictDoUpdate({
        target: app_settings.id,
        set: {
          feature_flags: sql`excluded.feature_flags`,
          onboarding: sql`excluded.onboarding`
        }
      });
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour les parametres produit.');
  }

  return { request_id: requestId, ok: true };
};

export const saveLegacyDataConfig = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataConfigPayload
): Promise<DataConfigResponse> => {
  await saveAgencyConfigSettings(db, authContext, requestId, {
    agency_id: data.agency_id,
    onboarding: {},
    references: {
      statuses: data.statuses.map((status) => ({
        id: status.id,
        label: status.label,
        category: status.category as AgencyStatusInput['category']
      })),
      services: data.services,
      entities: data.entities,
      families: data.families,
      interaction_types: data.interactionTypes
    }
  });

  return { request_id: requestId, ok: true };
};
