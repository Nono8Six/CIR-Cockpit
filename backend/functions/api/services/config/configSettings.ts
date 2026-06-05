import { and, asc, eq, sql } from 'drizzle-orm';

import {
  agency_families,
  agency_interaction_types,
  agency_reference_resolutions,
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
  ConfigReferenceArchiveInput,
  ConfigReferenceResolveInput,
  ConfigReferenceRestoreInput,
  ConfigReferenceUnresolveInput,
  ConfigReferenceRenameInput,
  ConfigReferenceReorderInput,
} from '../../../../../shared/schemas/system/config.schema.ts';
import type { DataConfigPayload } from '../../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

const CONFIG_REFERENCE_RATE_LIMIT_MAX = 60;

type LabelTable =
  | typeof agency_services
  | typeof agency_families
  | typeof agency_interaction_types;

type ExistingStatusRow = {
  id: string;
  label: string;
  is_active: boolean;
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
  is_active: boolean;
  deactivated_at: null;
};

type ReferenceDeleteResult = {
  usageCount: number;
  deactivated: boolean;
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
    existingRows.filter((row) => row.is_active !== false).map((row) => [row.label.toLowerCase(), row.id])
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
      is_terminal: status.category === 'done',
      is_active: true,
      deactivated_at: null
    };
  });
};

export const ensureReferenceWriteAccess = (authContext: AuthContext): void => {
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

export const ensureOneAffectedRow = (rows: unknown[], message: string): void => {
  if (rows.length !== 1) {
    throw httpError(409, 'CONFLICT', message);
  }
};

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

const ensureStatusesAreEditable = (
  requestedStatuses: AgencyStatusInput[],
  existingRows: ExistingStatusRow[]
): void => {
  const inactiveRows = existingRows.filter((row) => !row.is_active);
  const inactiveById = new Set(inactiveRows.map((row) => row.id));
  const inactiveByLabel = new Map(
    inactiveRows.map((row) => [normalizeReferenceKey(row.label), row.label])
  );

  for (const status of requestedStatuses) {
    if (status.id && inactiveById.has(status.id)) {
      throw httpError(409, 'CONFLICT', `Le statut historique "${status.label}" n'est plus editable.`);
    }
    const historicalLabel = inactiveByLabel.get(normalizeReferenceKey(status.label));
    if (historicalLabel && !status.id) {
      throw httpError(409, 'CONFLICT', `Le statut historique "${historicalLabel}" existe deja.`);
    }
  }
};

export const resolveStatusDeleteMode = (
  usageCount: number,
  activeCount: number
): 'delete' | 'deactivate' => {
  if (activeCount <= 1) {
    throw httpError(400, 'CONFIG_INVALID', 'Au moins un statut actif est requis.');
  }
  return usageCount > 0 ? 'deactivate' : 'delete';
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

const countActiveStatuses = async (
  db: DbClient,
  agencyId: string
): Promise<number> => {
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agency_statuses)
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.is_active, true)));
    return rows[0]?.count ?? 0;
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de verifier les statuts actifs.');
  }
};

const ensureActiveDefaultStatus = async (
  db: DbClient,
  agencyId: string
): Promise<void> => {
  const activeStatuses = await db
    .select({
      id: agency_statuses.id,
      is_default: agency_statuses.is_default
    })
    .from(agency_statuses)
    .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.is_active, true)))
    .orderBy(asc(agency_statuses.sort_order));

  if (activeStatuses.length === 0) {
    throw httpError(400, 'CONFIG_INVALID', 'Au moins un statut actif est requis.');
  }
  if (activeStatuses.some((status) => status.is_default)) {
    return;
  }

  const defaultStatusId = activeStatuses[0]?.id;
  if (!defaultStatusId) {
    throw httpError(400, 'CONFIG_INVALID', 'Statut actif par defaut introuvable.');
  }
  await db
    .update(agency_statuses)
    .set({ is_default: true })
    .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, defaultStatusId)));
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
): Promise<number> => {
  const previous = previousLabel.trim().toLowerCase();
  try {
    if (dimension === 'services') {
      const updated = await db
        .update(interactions)
        .set({ contact_service: nextLabel })
        .where(and(eq(interactions.agency_id, agencyId), sql`lower(${interactions.contact_service}) = ${previous}`))
        .returning({ id: interactions.id });
      return updated.length;
    }

    if (dimension === 'interaction_types') {
      const updated = await db
        .update(interactions)
        .set({ interaction_type: nextLabel })
        .where(and(eq(interactions.agency_id, agencyId), sql`lower(${interactions.interaction_type}) = ${previous}`))
        .returning({ id: interactions.id });
      return updated.length;
    }

    const updated = await db.execute<{ id: string }>(sql`
      update public.interactions
      set mega_families = (
        select array_agg(
          case when lower(family) = ${previous} then ${nextLabel} else family end
          order by position
        )
        from unnest(mega_families) with ordinality as values(family, position)
      )
      where agency_id = ${agencyId}
        and exists (
          select 1 from unnest(mega_families) as family
          where lower(family) = ${previous}
        )
      returning id
    `);
    return updated.length;
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
        label: agency_statuses.label,
        is_active: agency_statuses.is_active
      })
      .from(agency_statuses)
      .where(eq(agency_statuses.agency_id, agencyId));
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les statuts.');
  }

  ensureStatusesAreEditable(statuses, existing ?? []);
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
            is_terminal: sql`excluded.is_terminal`,
            is_active: sql`excluded.is_active`,
            deactivated_at: sql`excluded.deactivated_at`
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
            is_terminal: sql`excluded.is_terminal`,
            is_active: sql`excluded.is_active`,
            deactivated_at: sql`excluded.deactivated_at`
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
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.is_active, true)));
    const count = rows[0]?.count ?? 0;
    await db.insert(agency_statuses).values({
      ...(input.status_id ? { id: input.status_id } : {}),
      agency_id: agencyId,
      label,
      sort_order: count + 1,
      is_default: count === 0,
      category: input.category,
      is_terminal: input.category === 'done',
      is_active: true,
      deactivated_at: null
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

const handleReferenceArchive = async (
  db: DbClient,
  agencyId: string,
  input: ConfigReferenceArchiveInput
): Promise<ReferenceDeleteResult> => {
  if (input.dimension === 'statuses') {
    const statusId = requireReferenceId(input.reference_id, 'Identifiant statut requis.');
    const statusRows = await db
      .select({
        id: agency_statuses.id,
        label: agency_statuses.label,
        is_active: agency_statuses.is_active
      })
      .from(agency_statuses)
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId)));
    const status = statusRows[0];
    if (!status) {
      throw httpError(400, 'CONFIG_INVALID', 'Statut introuvable.');
    }
    if (!status.is_active) {
      throw httpError(409, 'CONFLICT', `Le statut historique "${status.label}" n'est plus supprimable.`);
    }

    const activeCount = await countActiveStatuses(db, agencyId);
    const usageCount = await countStatusUsage(db, agencyId, statusId);
    const mode = resolveStatusDeleteMode(usageCount, activeCount);
    const updated = mode === 'delete'
      ? await db.delete(agency_statuses)
        .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId)))
        .returning({ id: agency_statuses.id })
      : await db.update(agency_statuses)
        .set({ is_active: false, is_default: false, deactivated_at: sql`now()` })
        .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId)))
        .returning({ id: agency_statuses.id });
    ensureOneAffectedRow(updated, 'Ce statut a deja ete modifie. Rechargez la page.');
    await ensureActiveDefaultStatus(db, agencyId);
    return { usageCount, deactivated: mode === 'deactivate' };
  }

  const label = requireLabel(input.label, 'Libelle de referentiel requis.');
  const usageCount = await countLabelUsage(db, agencyId, input.dimension, label);
  const table = getLabelTable(input.dimension);
  const updated = usageCount === 0
    ? await db.delete(table)
      .where(and(eq(table.agency_id, agencyId), eq(table.label, label), sql`${table.archived_at} is null`))
      .returning({ id: table.id })
    : await db.update(table)
      .set({ archived_at: sql`now()` })
      .where(and(eq(table.agency_id, agencyId), eq(table.label, label), sql`${table.archived_at} is null`))
      .returning({ id: table.id });
  ensureOneAffectedRow(updated, 'Cette valeur a deja ete modifiee. Rechargez la page.');
  return { usageCount, deactivated: usageCount > 0 };
};

const handleReferenceRestore = async (db: DbClient, agencyId: string, input: ConfigReferenceRestoreInput): Promise<void> => {
  if (input.dimension === 'statuses') {
    const statusId = requireReferenceId(input.reference_id, 'Identifiant statut requis.');
    const updated = await db.update(agency_statuses).set({ is_active: true, deactivated_at: null })
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.id, statusId), eq(agency_statuses.is_active, false)))
      .returning({ id: agency_statuses.id });
    ensureOneAffectedRow(updated, 'Ce statut a deja ete reactive. Rechargez la page.');
    await ensureActiveDefaultStatus(db, agencyId);
    return;
  }
  const label = requireLabel(input.label, 'Libelle de referentiel requis.');
  const table = getLabelTable(input.dimension);
  const updated = await db.update(table).set({ archived_at: null })
    .where(and(eq(table.agency_id, agencyId), eq(table.label, label), sql`${table.archived_at} is not null`))
    .returning({ id: table.id });
  ensureOneAffectedRow(updated, 'Cette valeur a deja ete reactivee. Rechargez la page.');
};

const targetColumn = (dimension: ConfigReferenceResolveInput['dimension'], targetId: string) => ({
  target_status_id: dimension === 'statuses' ? targetId : null,
  target_service_id: dimension === 'services' ? targetId : null,
  target_family_id: dimension === 'families' ? targetId : null,
  target_interaction_type_id: dimension === 'interaction_types' ? targetId : null
});

const ensureResolutionTarget = async (db: DbClient, agencyId: string, input: ConfigReferenceResolveInput): Promise<void> => {
  const active = input.dimension === 'statuses'
    ? sql`select 1 from public.agency_statuses where id=${input.target_reference_id} and agency_id=${agencyId} and is_active=true`
    : input.dimension === 'services'
      ? sql`select 1 from public.agency_services where id=${input.target_reference_id} and agency_id=${agencyId} and archived_at is null`
      : input.dimension === 'families'
        ? sql`select 1 from public.agency_families where id=${input.target_reference_id} and agency_id=${agencyId} and archived_at is null`
        : sql`select 1 from public.agency_interaction_types where id=${input.target_reference_id} and agency_id=${agencyId} and archived_at is null`;
  const rows = await db.execute<{ '?column?': number }>(active);
  if (rows.length === 0) throw httpError(409, 'CONFLICT', 'La valeur cible doit etre active dans cette agence.');
};

const handleReferenceResolve = async (db: DbClient, auth: AuthContext, agencyId: string, input: ConfigReferenceResolveInput): Promise<void> => {
  await ensureResolutionTarget(db, agencyId, input);
  const target = targetColumn(input.dimension, input.target_reference_id);
  const updated = await db.execute<{ id: string }>(sql`
    insert into public.agency_reference_resolutions (
      agency_id, dimension, source_label, resolved_by,
      target_status_id, target_service_id, target_family_id, target_interaction_type_id
    ) values (
      ${agencyId}, ${input.dimension}, ${input.source_label.trim()}, ${auth.userId},
      ${target.target_status_id}, ${target.target_service_id}, ${target.target_family_id}, ${target.target_interaction_type_id}
    )
    on conflict (agency_id, dimension, lower(btrim(source_label))) do update set
      resolved_by = excluded.resolved_by,
      resolved_at = now(),
      target_status_id = excluded.target_status_id,
      target_service_id = excluded.target_service_id,
      target_family_id = excluded.target_family_id,
      target_interaction_type_id = excluded.target_interaction_type_id
    returning id
  `);
  ensureOneAffectedRow(updated, "Le rattachement historique n'a pas pu etre enregistre.");
};

const handleReferenceUnresolve = async (db: DbClient, agencyId: string, input: ConfigReferenceUnresolveInput): Promise<void> => {
  const updated = await db.delete(agency_reference_resolutions).where(and(
    eq(agency_reference_resolutions.agency_id, agencyId),
    eq(agency_reference_resolutions.id, input.resolution_id)
  )).returning({ id: agency_reference_resolutions.id });
  ensureOneAffectedRow(updated, 'Ce rattachement a deja ete annule. Rechargez la page.');
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
    const updated = await db
      .update(agency_statuses)
      .set({ label: nextLabel })
      .where(and(
        eq(agency_statuses.agency_id, agencyId),
        eq(agency_statuses.id, statusId),
        eq(agency_statuses.is_active, true)
      ))
      .returning({ id: agency_statuses.id });
    if (updated.length === 0) {
      throw httpError(409, 'CONFLICT', "Ce statut n'est plus editable.");
    }
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
  const updated = await db
    .update(table)
    .set({ label: nextLabel })
    .where(and(eq(table.agency_id, agencyId), eq(table.label, previousLabel), sql`${table.archived_at} is null`))
    .returning({ id: table.id });
  ensureOneAffectedRow(updated, "Cette valeur n'est plus editable. Rechargez la page.");
  const migratedCount = await updateInteractionLabel(db, agencyId, input.dimension, previousLabel, nextLabel);
  if (migratedCount !== usageCount) {
    throw httpError(409, 'CONFLICT', "L'historique a change pendant la correction. Rechargez la page.");
  }
  return migratedCount;
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
    const uniqueIds = new Set(ids);
    const activeRows = await db.select({ id: agency_statuses.id }).from(agency_statuses)
      .where(and(eq(agency_statuses.agency_id, agencyId), eq(agency_statuses.is_active, true)));
    if (uniqueIds.size !== ids.length || activeRows.length !== ids.length || activeRows.some((row) => !uniqueIds.has(row.id))) {
      throw httpError(409, 'CONFLICT', 'La liste des statuts a change. Rechargez la page.');
    }
    const updated = await Promise.all(ids.map((id, index) =>
      db
        .update(agency_statuses)
        .set({ sort_order: index + 1, is_default: index === 0 })
        .where(and(
          eq(agency_statuses.agency_id, agencyId),
          eq(agency_statuses.id, id),
          eq(agency_statuses.is_active, true)
        ))
        .returning({ id: agency_statuses.id })
    ));
    if (updated.some((rows) => rows.length !== 1)) throw httpError(409, 'CONFLICT', 'La liste des statuts a change. Rechargez la page.');
    return;
  }

  const labels = input.labels ?? [];
  if (labels.length === 0) {
    throw httpError(400, 'CONFIG_INVALID', 'Ordre du referentiel requis.');
  }
  const table = getLabelTable(input.dimension);
  const normalizedLabels = labels.map((label) => label.trim());
  const uniqueLabels = new Set(normalizedLabels.map(normalizeReferenceKey));
  const activeRows = await db.select({ label: table.label }).from(table)
    .where(and(eq(table.agency_id, agencyId), sql`${table.archived_at} is null`));
  if (uniqueLabels.size !== labels.length || activeRows.length !== labels.length || activeRows.some((row) => !uniqueLabels.has(normalizeReferenceKey(row.label)))) {
    throw httpError(409, 'CONFLICT', 'La liste des valeurs a change. Rechargez la page.');
  }
  const updated = await Promise.all(normalizedLabels.map((label, index) =>
    db
      .update(table)
      .set({ sort_order: index + 1 })
      .where(and(eq(table.agency_id, agencyId), eq(table.label, label.trim())))
      .returning({ id: table.id })
  ));
  if (updated.some((rows) => rows.length !== 1)) throw httpError(409, 'CONFLICT', 'La liste des valeurs a change. Rechargez la page.');
};

export const handleConfigReferenceAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: ConfigReferenceActionInput
): Promise<ConfigReferenceActionResponse> => {
  await ensureDataRateLimit('config:reference', authContext.userId, {
    max: CONFIG_REFERENCE_RATE_LIMIT_MAX
  });
  ensureReferenceWriteAccess(authContext);
  const agencyId = ensureAgencyAccess(authContext, input.agency_id);

  let usageCount = 0;
  let deactivated = false;
  try {
    await db.transaction(async (tx) => {
      if (input.action === 'add') {
        await handleReferenceAdd(tx, agencyId, input);
        return;
      }
      if (input.action === 'archive') {
        const result = await handleReferenceArchive(tx, agencyId, input);
        usageCount = result.usageCount;
        deactivated = result.deactivated;
        return;
      }
      if (input.action === 'rename') {
        usageCount = await handleReferenceRename(tx, agencyId, input);
        return;
      }
      if (input.action === 'restore') return void await handleReferenceRestore(tx, agencyId, input);
      if (input.action === 'resolve') return void await handleReferenceResolve(tx, authContext, agencyId, input);
      if (input.action === 'unresolve') return void await handleReferenceUnresolve(tx, agencyId, input);
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
    ...(deactivated ? { deactivated } : {}),
    ...(input.action === 'rename' ? { migrated_interactions_count: usageCount } : {})
  };
};

const saveReferenceConfig = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  input: DataConfigPayload
): Promise<DataConfigResponse> => {
  await ensureDataRateLimit('data:config', authContext.userId, {
    max: CONFIG_REFERENCE_RATE_LIMIT_MAX
  });
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
