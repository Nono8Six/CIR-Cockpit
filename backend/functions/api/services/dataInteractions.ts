import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataInteractionsPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  ensureOptionalAgencyAccess
} from './dataAccess.ts';

type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type InteractionInsert = Database['public']['Tables']['interactions']['Insert'];
type InteractionUpdate = Database['public']['Tables']['interactions']['Update'];
type SaveInteractionPayload = Extract<DataInteractionsPayload, { action: 'save' }>;
type AddTimelineEventPayload = Extract<DataInteractionsPayload, { action: 'add_timeline_event' }>;

const toNullableString = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeInteractionUpdates = (
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

  const { data, error } = await db
    .from('interactions')
    .upsert(row, { onConflict: 'id' })
    .select('*');

  if (error) throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
  const saved = data?.[0];
  if (!saved) throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
  return saved;
};

const addTimelineEvent = async (
  db: DbClient,
  authContext: AuthContext,
  payload: AddTimelineEventPayload
): Promise<InteractionRow> => {
  const { interaction_id: interactionId, expected_updated_at: expectedUpdatedAt, event, updates } = payload;
  const { data: current, error: fetchError } = await db
    .from('interactions')
    .select('timeline, agency_id')
    .eq('id', interactionId)
    .single();

  if (fetchError || !current) throw httpError(404, 'NOT_FOUND', 'Interaction introuvable.');
  ensureOptionalAgencyAccess(authContext, current.agency_id);

  const currentTimeline = Array.isArray(current.timeline) ? current.timeline : [];
  const updatedTimeline = [...currentTimeline, event];

  const rowUpdates: InteractionUpdate = {
    ...normalizeInteractionUpdates(updates),
    timeline: updatedTimeline
  };

  const { data, error } = await db
    .from('interactions')
    .update(rowUpdates)
    .eq('id', interactionId)
    .eq('updated_at', expectedUpdatedAt)
    .select('*');

  if (error) throw httpError(500, 'DB_WRITE_FAILED', "Impossible de mettre a jour l'interaction.");
  if (!data || data.length === 0) {
    throw httpError(409, 'CONFLICT', 'Ce dossier a ete modifie par un autre utilisateur. Rechargez pour continuer.');
  }
  return data[0];
};

export const handleDataInteractionsAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataInteractionsPayload
): Promise<Record<string, unknown>> => {
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
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
