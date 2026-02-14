import type { DataConfigPayload } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';

type ConfigTable =
  | 'agency_statuses'
  | 'agency_services'
  | 'agency_entities'
  | 'agency_families'
  | 'agency_interaction_types';

const STATUS_CATEGORIES = ['todo', 'in_progress', 'done'] as const;

const normalizeLabelList = (labels: string[]): string[] => {
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

const syncLabelTable = async (
  db: DbClient,
  table: ConfigTable,
  agencyId: string,
  labels: string[]
): Promise<void> => {
  const desired = normalizeLabelList(labels);
  const desiredSet = new Set(desired.map((l) => l.toLowerCase()));

  const { data: existing, error: readError } = await db
    .from(table)
    .select('label')
    .eq('agency_id', agencyId);

  if (readError) {
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
    const { error } = await db
      .from(table)
      .upsert(rows, { onConflict: 'agency_id,label' });
    if (error) {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour la configuration.');
    }
  }

  if (toDelete.length > 0) {
    const { error } = await db
      .from(table)
      .delete()
      .eq('agency_id', agencyId)
      .in('label', toDelete);
    if (error) {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour la configuration.');
    }
  }
};

const syncStatuses = async (
  db: DbClient,
  agencyId: string,
  statuses: DataConfigPayload['statuses']
): Promise<void> => {
  if (statuses.length === 0) {
    throw httpError(400, 'CONFIG_INVALID', 'Au moins un statut est requis.');
  }

  for (const s of statuses) {
    if (!STATUS_CATEGORIES.includes(s.category as typeof STATUS_CATEGORIES[number])) {
      throw httpError(400, 'CONFIG_INVALID', `Categorie de statut invalide: ${s.category}`);
    }
  }

  const { data: existing, error: readError } = await db
    .from('agency_statuses')
    .select('id, label')
    .eq('agency_id', agencyId);

  if (readError) {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les statuts.');
  }

  const existingRows = existing ?? [];
  const existingByLabel = new Map(
    existingRows.map((row) => [row.label.toLowerCase(), row.id])
  );

  const rows = statuses.map((status, index) => {
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

  const { error: upsertError } = await db
    .from('agency_statuses')
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) {
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour les statuts.');
  }

  const desiredIds = new Set(
    rows.map((row) => (row as { id?: string }).id).filter(Boolean)
  );
  const toDeleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !desiredIds.has(id));

  if (toDeleteIds.length > 0) {
    const { error } = await db
      .from('agency_statuses')
      .delete()
      .eq('agency_id', agencyId)
      .in('id', toDeleteIds);
    if (error) {
      throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de supprimer les statuts obsoletes.');
    }
  }
};

export const handleDataConfigAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  agencyId: string,
  data: DataConfigPayload
): Promise<Record<string, unknown>> => {
  await syncStatuses(db, agencyId, data.statuses);
  await syncLabelTable(db, 'agency_services', agencyId, data.services);
  await syncLabelTable(db, 'agency_entities', agencyId, data.entities);
  await syncLabelTable(db, 'agency_families', agencyId, data.families);
  await syncLabelTable(db, 'agency_interaction_types', agencyId, data.interactionTypes);

  return { request_id: requestId, ok: true };
};
