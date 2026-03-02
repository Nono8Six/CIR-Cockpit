import { and, desc, eq, sql } from 'drizzle-orm';

import { interactions } from '../../../drizzle/schema.ts';
import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataInteractionsResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataInteractionsPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  ensureOptionalAgencyAccess,
  getEntityAgencyId
} from './dataAccess.ts';

type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type InteractionUpdate = Database['public']['Tables']['interactions']['Update'];
type InteractionInsert = typeof interactions.$inferInsert;
type SaveInteractionPayload = Extract<DataInteractionsPayload, { action: 'save' }>;
type AddTimelineEventPayload = Extract<DataInteractionsPayload, { action: 'add_timeline_event' }>;
type ListByEntityPayload = Extract<DataInteractionsPayload, { action: 'list_by_entity' }>;
type DeleteInteractionPayload = Extract<DataInteractionsPayload, { action: 'delete' }>;

const DEFAULT_INTERACTIONS_PAGE = 1;
const DEFAULT_INTERACTIONS_PAGE_SIZE = 20;

const toNullableString = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeInteractionUpdates = (
  updates: AddTimelineEventPayload['updates']
): InteractionUpdate => {
  if (!updates) return {};

  const normalized: InteractionUpdate = {};

  if (Object.hasOwn(updates, 'status')) {
    const status = toNullableString(updates.status);
    if (typeof status === 'string') normalized.status = status;
  }
  if (Object.hasOwn(updates, 'status_id')) {
    const statusId = toNullableString(updates.status_id);
    if (statusId !== undefined) normalized.status_id = statusId;
  }
  if (Object.hasOwn(updates, 'order_ref')) {
    const orderRef = toNullableString(updates.order_ref);
    if (orderRef !== undefined) normalized.order_ref = orderRef;
  }
  if (Object.hasOwn(updates, 'reminder_at')) {
    const reminderAt = toNullableString(updates.reminder_at);
    if (reminderAt !== undefined) normalized.reminder_at = reminderAt;
  }
  if (Object.hasOwn(updates, 'notes')) {
    const notes = toNullableString(updates.notes);
    if (notes !== undefined) normalized.notes = notes;
  }
  if (Object.hasOwn(updates, 'last_action_at')) {
    const lastActionAt = updates.last_action_at;
    if (typeof lastActionAt === 'string') {
      const trimmed = lastActionAt.trim();
      if (trimmed.length > 0) {
        normalized.last_action_at = trimmed;
      }
    }
  }
  if (Object.hasOwn(updates, 'entity_id')) {
    const entityId = toNullableString(updates.entity_id);
    if (entityId !== undefined) normalized.entity_id = entityId;
  }
  if (Object.hasOwn(updates, 'contact_id')) {
    const contactId = toNullableString(updates.contact_id);
    if (contactId !== undefined) normalized.contact_id = contactId;
  }
  if (Object.hasOwn(updates, 'status_is_terminal') && typeof updates.status_is_terminal === 'boolean') {
    normalized.status_is_terminal = updates.status_is_terminal;
  }
  if (Object.hasOwn(updates, 'mega_families')) {
    const families = updates.mega_families;
    if (Array.isArray(families) && families.every((item) => typeof item === 'string')) {
      normalized.mega_families = families;
    }
  }

  return normalized;
};

const saveInteraction = async (
  db: DbClient,
  authContext: AuthContext,
  payload: SaveInteractionPayload
): Promise<InteractionRow> => {
  const { interaction } = payload;
  const resolvedAgencyId = ensureAgencyAccess(authContext, payload.agency_id);
  const row: InteractionInsert = {
    id: interaction.id,
    agency_id: resolvedAgencyId,
    channel: interaction.channel,
    entity_type: interaction.entity_type,
    contact_service: interaction.contact_service,
    company_name: interaction.company_name?.trim() ?? '',
    contact_name: interaction.contact_name?.trim() ?? '',
    contact_phone: interaction.contact_phone?.trim() || null,
    contact_email: interaction.contact_email?.trim() || null,
    subject: interaction.subject,
    mega_families: interaction.mega_families ?? [],
    status: '',
    status_id: interaction.status_id.trim(),
    interaction_type: interaction.interaction_type,
    order_ref: interaction.order_ref?.trim() || null,
    reminder_at: interaction.reminder_at?.trim() || null,
    notes: interaction.notes?.trim() || null,
    entity_id: interaction.entity_id ?? null,
    contact_id: interaction.contact_id ?? null,
    created_by: authContext.userId,
    timeline: interaction.timeline ?? []
  };
  const {
    id: _rowId,
    ...rowForUpdate
  } = row;

  try {
    const savedRows = await db
      .insert(interactions)
      .values(row)
      .onConflictDoUpdate({
        target: interactions.id,
        set: rowForUpdate
      })
      .returning();
    const saved = savedRows[0];
    if (!saved) throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
    return saved;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
  }
};

const addTimelineEvent = async (
  db: DbClient,
  authContext: AuthContext,
  payload: AddTimelineEventPayload
): Promise<InteractionRow> => {
  const { interaction_id: interactionId, expected_updated_at: expectedUpdatedAt, event, updates } = payload;
  let current:
    | {
      timeline: Database['public']['Tables']['interactions']['Row']['timeline'];
      agency_id: string | null;
    }
    | undefined;
  try {
    const rows = await db
      .select({
        timeline: interactions.timeline,
        agency_id: interactions.agency_id
      })
      .from(interactions)
      .where(eq(interactions.id, interactionId))
      .limit(1);
    current = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger l\'interaction.');
  }

  if (!current) throw httpError(404, 'NOT_FOUND', 'Interaction introuvable.');
  ensureOptionalAgencyAccess(authContext, current.agency_id ?? null);

  const currentTimeline = Array.isArray(current.timeline) ? current.timeline : [];
  const updatedTimeline = [...currentTimeline, event];

  const rowUpdates: InteractionUpdate = {
    ...normalizeInteractionUpdates(updates),
    timeline: updatedTimeline
  };

  const sanitizedUpdates = Object.fromEntries(
    Object.entries(rowUpdates).filter(([, value]) => value !== undefined)
  ) as InteractionUpdate;

  try {
    const rows = await db
      .update(interactions)
      .set(sanitizedUpdates)
      .where(and(
        eq(interactions.id, interactionId),
        eq(interactions.updated_at, expectedUpdatedAt)
      ))
      .returning();

    if (rows.length === 0) {
      throw httpError(409, 'CONFLICT', 'Ce dossier a ete modifie par un autre utilisateur. Rechargez pour continuer.');
    }
    return rows[0];
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'CONFLICT'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de mettre a jour l'interaction.");
  }
};

export const resolvePagination = (payload: Pick<ListByEntityPayload, 'page' | 'page_size'>): {
  page: number;
  pageSize: number;
  offset: number;
} => {
  const page = payload.page ?? DEFAULT_INTERACTIONS_PAGE;
  const pageSize = payload.page_size ?? DEFAULT_INTERACTIONS_PAGE_SIZE;
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const listInteractionsByEntity = async (
  db: DbClient,
  authContext: AuthContext,
  payload: ListByEntityPayload
): Promise<{
  interactions: InteractionRow[];
  page: number;
  page_size: number;
  total: number;
}> => {
  const agencyId = await getEntityAgencyId(db, payload.entity_id);
  ensureOptionalAgencyAccess(authContext, agencyId);

  const {
    page,
    pageSize,
    offset
  } = resolvePagination(payload);

  try {
    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(interactions)
        .where(eq(interactions.entity_id, payload.entity_id))
        .orderBy(desc(interactions.last_action_at), desc(interactions.created_at))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(interactions)
        .where(eq(interactions.entity_id, payload.entity_id))
    ]);

    return {
      interactions: rows,
      page,
      page_size: pageSize,
      total: Number(countRows[0]?.count ?? 0)
    };
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger les interactions du client.");
  }
};

const deleteInteraction = async (
  db: DbClient,
  authContext: AuthContext,
  payload: DeleteInteractionPayload
): Promise<string> => {
  let current:
    | {
      id: string;
      agency_id: string | null;
      entity_id: string | null;
    }
    | undefined;
  try {
    const rows = await db
      .select({
        id: interactions.id,
        agency_id: interactions.agency_id,
        entity_id: interactions.entity_id
      })
      .from(interactions)
      .where(eq(interactions.id, payload.interaction_id))
      .limit(1);
    current = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de charger l'interaction.");
  }

  if (!current) {
    throw httpError(404, 'NOT_FOUND', 'Interaction introuvable.');
  }

  if (current.entity_id) {
    const agencyId = await getEntityAgencyId(db, current.entity_id);
    ensureOptionalAgencyAccess(authContext, agencyId);
  } else {
    ensureOptionalAgencyAccess(authContext, current.agency_id ?? null);
  }

  try {
    const rows = await db
      .delete(interactions)
      .where(eq(interactions.id, payload.interaction_id))
      .returning({ id: interactions.id });
    const deleted = rows[0];
    if (!deleted) {
      throw httpError(404, 'NOT_FOUND', 'Interaction introuvable.');
    }
    return deleted.id;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de supprimer l'interaction.");
  }
};

export const handleDataInteractionsAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataInteractionsPayload
): Promise<DataInteractionsResponse> => {
  await ensureDataRateLimit(`data_interactions:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'save': {
      const interaction = await saveInteraction(db, authContext, data);
      return { request_id: requestId, ok: true, interaction };
    }
    case 'add_timeline_event': {
      const interaction = await addTimelineEvent(db, authContext, data);
      return { request_id: requestId, ok: true, interaction };
    }
    case 'list_by_entity': {
      const result = await listInteractionsByEntity(db, authContext, data);
      return { request_id: requestId, ok: true, ...result };
    }
    case 'delete': {
      const interactionId = await deleteInteraction(db, authContext, data);
      return { request_id: requestId, ok: true, interaction_id: interactionId };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
