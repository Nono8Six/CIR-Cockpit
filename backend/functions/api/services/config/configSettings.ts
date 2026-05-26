import { and, eq, sql } from 'drizzle-orm';

import {
  agency_families,
  agency_interaction_types,
  agency_services,
  agency_statuses,
  interactions
} from '../../../../drizzle/schema.ts';
import type {
  ConfigReferenceActionResponse,
  DataConfigResponse
} from '../../../../../shared/schemas/system/api-responses.ts';
import type {
  AgencyStatusInput,
  ConfigReferenceActionInput,
  ConfigReferenceAddInput,
  ConfigReferenceDeleteInput,
  ConfigReferenceRenameInput,
  ConfigReferenceReorderInput,
} from '../../../../../shared/schemas/system/config.schema.ts';
import type { DataConfigPayload } from '../../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

type LabelTable =
  | typeof agency_services
  | typeof agency_families
  | typeof agency_interaction_types;

type ExistingStatusRow = {
  id: string;
  label: string;
};

type LabelDimension = 'services' | 'families' | 'interaction_types';

type StatusUpsertRow = {
  id?: string;
  agency_id: string;
  label: string;
  sort_order: number;
  is_default: boolean;
  category: string;
  is_terminal: boolean;
};

const STATUS_CATEGORIES = ['todo', 'in_progress', 'done'] as const;

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

const ensureReferenceWriteAccess = (authContext: AuthContext): void => {
  if (authContext.role === 'tcs') {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

const getLabelTable = (dimension: LabelDimension): LabelTable => {
  if (dimension === 'services') return agency_services;
  if (dimension === 'families') return agency_families;
  return agency_interaction_types;
};

const requireReferenceId = (value: string | undefined, message: string): string => {
  if (!value?.trim()) {
    throw httpError(400, 'CONFIG_INVALID', message);
  }
  return value;
};

const requireLabel = (value: string | undefined, message: string): string => {
  const label = value?.trim();
  if (!label) {
    throw httpError(400, 'CONFIG_INVALID', message);
  }
  return label;
};

const normalizeReferenceKey = (value: string): string => value.trim().toLowerCase();

const ensureStatusLabelAvailable = async (
  db: DbClient,
  agencyId: string,
  label: string,
  currentStatusId?: string
): Promise<void> => {
  const rows = await db
    .select({ id: agency_statuses.id, label: agency_statuses.label })
    .from(agency_statuses)
    .where(eq(agency_statuses.agency_id, agencyId));
  const nextKey = normalizeReferenceKey(label);
  const duplicate = rows.some((row) =>
    row.id !== currentStatusId && normalizeReferenceKey(row.label) === nextKey
  );
  if (duplicate) {
    throw httpError(409, 'CONFLICT', `Le statut "${label}" existe deja.`);
  }
};

const ensureLabelAvailable = async (
  db: DbClient,
  table: LabelTable,
  agencyId: string,
  label: string,
  currentLabel?: string
): Promise<void> => {
  const rows = await db
    .select({ label: table.label })
    .from(table)
    .where(eq(table.agency_id, agencyId));
  const nextKey = normalizeReferenceKey(label);
  const currentKey = currentLabel ? normalizeReferenceKey(currentLabel) : null;
  const duplicate = rows.some((row) => {
    const rowKey = normalizeReferenceKey(row.label);
    return rowKey !== currentKey && rowKey === nextKey;
  });
  if (duplicate) {
    throw httpError(409, 'CONFLICT', `La valeur "${label}" existe deja dans cette liste.`);
  }
};

const countStatusUsage = async (
  db: DbClient,
  agencyId: string,
  statusId: string
): Promise<number> => {
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(and(eq(interactions.agency_id, agencyId), eq(interactions.status_id, statusId)));
    return rows[0]?.count ?? 0;
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'utilisation du statut.");
  }
};

const countLabelUsage = async (
  db: DbClient,
  agencyId: string,
  dimension: LabelDimension,
  label: string
): Promise<number> => {
  const normalizedLabel = label.trim().toLowerCase();
  const usageExpression =
    dimension === 'services'
      ? sql<boolean>`lower(${interactions.contact_service}) = ${normalizedLabel}`
      : dimension === 'interaction_types'
        ? sql<boolean>`lower(${interactions.interaction_type}) = ${normalizedLabel}`
        : sql<boolean>`exists (
            select 1
            from unnest(${interactions.mega_families}) as family
            where lower(family) = ${normalizedLabel}
          )`;

  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interactions)
      .where(and(eq(interactions.agency_id, agencyId), usageExpression));
    return rows[0]?.count ?? 0;
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'utilisation du referentiel.");
  }
};

const updateInteractionLabel = async (
  db: DbClient,
  agencyId: string,
  dimension: LabelDimension,
  previousLabel: string,
  nextLabel: string
): Promise<void> => {
  const previous = previousLabel.trim();
  try {
    if (dimension === 'services') {
      await db
        .update(interactions)
        .set({ contact_service: nextLabel })
        .where(and(eq(interactions.agency_id, agencyId), eq(interactions.contact_service, previous)));
      return;
    }

    if (dimension === 'interaction_types') {
      await db
        .update(interactions)
        .set({ interaction_type: nextLabel })
        .where(and(eq(interactions.agency_id, agencyId), eq(interactions.interaction_type, previous)));
      return;
    }

    await db.execute(sql`
      update public.interactions
      set mega_families = array_replace(mega_families, ${previous}, ${nextLabel})
      where agency_id = ${agencyId}
        and ${previous} = any(mega_families)
    `);
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de migrer les interactions rattachees.');
  }
};

const syncLabelTable = async (
  db: DbClient,
  table: LabelTable,
  agencyId: string,
  labels: string[]
): Promise<void> => {
  const desired = normalizeLabelList(labels);
  if (desired.length === 0) return;

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

  const rows = buildStatusUpsertRows(statuses, agencyId, existing ?? []);
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

      await Promise.all(rowsWithId.map((row) =>
        db
          .update(interactions)
          .set({ status: row.label, status_is_terminal: row.is_terminal })
          .where(and(eq(interactions.agency_id, agencyId), eq(interactions.status_id, row.id)))
      ));
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
};

const handleReferenceAdd = async (
  db: DbClient,
  agencyId: string,
  input: ConfigReferenceAddInput
): Promise<void> => {
  const label = input.label.trim();
  if (input.dimension === 'statuses') {
    if (!input.category) {
      throw httpError(400, 'CONFIG_INVALID', 'Categorie de statut requise.');
    }
    await ensureStatusLabelAvailable(db, agencyId, label);
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agency_statuses)
      .where(eq(agency_statuses.agency_id, agencyId));
    const count = rows[0]?.count ?? 0;
    await db.insert(agency_statuses).values({
      ...(input.status_id ? { id: input.status_id } : {}),
      agency_id: agencyId,
      label,
      sort_order: count + 1,
      is_default: count === 0,
      category: input.category,
      is_terminal: input.category === 'done'
    });
    return;
  }

  const table = getLabelTable(input.dimension);
  await ensureLabelAvailable(db, table, agencyId, label);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.agency_id, agencyId));
  await db.insert(table).values({
    agency_id: agencyId,
    label,
    sort_order: (rows[0]?.count ?? 0) + 1
  });
};

const handleReferenceDelete = async (
  db: DbClient,
  agencyId: string,
  input: ConfigReferenceDeleteInput
): Promise<number> => {
  if (input.dimension === 'statuses') {
    const statusId = requireReferenceId(input.reference_id, 'Identifiant statut requis.');
    const usageCount = await countStatusUsage(db, agencyId, statusId);
    if (usageCount > 0) {
      throw httpError(409, 'CONFLICT', `Impossible de supprimer ce statut : ${usageCount} interaction(s) l'utilisent encore. Renommez le statut pour mettre a jour l'historique.`);
    }
    await db.delete(agency_statuses).where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId)));
    return usageCount;
  }

  const label = requireLabel(input.label, 'Libelle de referentiel requis.');
  const usageCount = await countLabelUsage(db, agencyId, input.dimension, label);
  if (usageCount > 0) {
    throw httpError(409, 'CONFLICT', `Impossible de supprimer "${label}" : ${usageCount} interaction(s) l'utilisent encore. Renommez la valeur pour mettre a jour l'historique.`);
  }
  const table = getLabelTable(input.dimension);
  await db.delete(table).where(and(eq(table.agency_id, agencyId), eq(table.label, label)));
  return usageCount;
};

const handleReferenceRename = async (
  db: DbClient,
  agencyId: string,
  input: ConfigReferenceRenameInput
): Promise<number> => {
  const nextLabel = input.next_label.trim();
  if (input.dimension === 'statuses') {
    const statusId = requireReferenceId(input.reference_id, 'Identifiant statut requis.');
    const usageCount = await countStatusUsage(db, agencyId, statusId);
    await ensureStatusLabelAvailable(db, agencyId, nextLabel, statusId);
    await db
      .update(agency_statuses)
      .set({ label: nextLabel })
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId)));
    await db
      .update(interactions)
      .set({ status: nextLabel })
      .where(and(eq(interactions.agency_id, agencyId), eq(interactions.status_id, statusId)));
    return usageCount;
  }

  const previousLabel = requireLabel(input.previous_label, 'Libelle actuel requis.');
  const usageCount = await countLabelUsage(db, agencyId, input.dimension, previousLabel);
  const table = getLabelTable(input.dimension);
  await ensureLabelAvailable(db, table, agencyId, nextLabel, previousLabel);
  await db
    .update(table)
    .set({ label: nextLabel })
    .where(and(eq(table.agency_id, agencyId), eq(table.label, previousLabel)));
  await updateInteractionLabel(db, agencyId, input.dimension, previousLabel, nextLabel);
  return usageCount;
};

const handleReferenceReorder = async (
  db: DbClient,
  agencyId: string,
  input: ConfigReferenceReorderInput
): Promise<void> => {
  if (input.dimension === 'statuses') {
    const ids = input.reference_ids ?? [];
    if (ids.length === 0) {
      throw httpError(400, 'CONFIG_INVALID', 'Ordre des statuts requis.');
    }
    await Promise.all(ids.map((id, index) =>
      db
        .update(agency_statuses)
        .set({ sort_order: index + 1, is_default: index === 0 })
        .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, id)))
    ));
    return;
  }

  const labels = input.labels ?? [];
  if (labels.length === 0) {
    throw httpError(400, 'CONFIG_INVALID', 'Ordre du referentiel requis.');
  }
  const table = getLabelTable(input.dimension);
  await Promise.all(labels.map((label, index) =>
    db
      .update(table)
      .set({ sort_order: index + 1 })
      .where(and(eq(table.agency_id, agencyId), eq(table.label, label.trim())))
  ));
};

export const handleConfigReferenceAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: ConfigReferenceActionInput
): Promise<ConfigReferenceActionResponse> => {
  await ensureDataRateLimit('config:reference', authContext.userId);
  ensureReferenceWriteAccess(authContext);
  const agencyId = ensureAgencyAccess(authContext, input.agency_id);

  let usageCount = 0;
  try {
    await db.transaction(async (tx) => {
      if (input.action === 'add') {
        await handleReferenceAdd(tx, agencyId, input);
        return;
      }
      if (input.action === 'delete') {
        usageCount = await handleReferenceDelete(tx, agencyId, input);
        return;
      }
      if (input.action === 'rename') {
        usageCount = await handleReferenceRename(tx, agencyId, input);
        return;
      }
      await handleReferenceReorder(tx, agencyId, input);
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : null;
    if (code === 'CONFLICT' || code === 'CONFIG_INVALID' || code === 'AUTH_FORBIDDEN') {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour le referentiel.');
  }

  return {
    request_id: requestId,
    ok: true,
    usage_count: usageCount,
    ...(input.action === 'rename' ? { migrated_interactions_count: usageCount } : {})
  };
};

const saveReferenceConfig = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: DataConfigPayload
): Promise<DataConfigResponse> => {
  await ensureDataRateLimit('data:config', authContext.userId);
  ensureReferenceWriteAccess(authContext);
  const resolvedAgencyId = ensureAgencyAccess(authContext, input.agency_id);

  const normalizedInput: DataConfigPayload = {
    ...input,
    agency_id: resolvedAgencyId
  };

  await db.transaction(async (tx) => {
    await syncStatuses(
      tx,
      resolvedAgencyId,
      normalizedInput.statuses.map((status) => ({
        id: status.id,
        label: status.label,
        category: status.category as AgencyStatusInput['category']
      }))
    );
    await syncLabelTable(tx, agency_services, resolvedAgencyId, normalizedInput.services);
    await syncLabelTable(tx, agency_families, resolvedAgencyId, normalizedInput.families);
    await syncLabelTable(
      tx,
      agency_interaction_types,
      resolvedAgencyId,
      normalizedInput.interactionTypes
    );
  });

  return { request_id: requestId, ok: true };
};

export const saveLegacyDataConfig = (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataConfigPayload
): Promise<DataConfigResponse> => {
  return saveReferenceConfig(db, authContext, requestId, data);
};
