import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataInteractionsPayload } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';

type InteractionRow = Database['public']['Tables']['interactions']['Row'];

const saveInteraction = async (
  db: DbClient,
  callerId: string,
  agencyId: string | undefined,
  interaction: Record<string, unknown>
): Promise<InteractionRow> => {
  const interactionId = interaction.id as string;
  if (!interactionId) throw httpError(400, 'VALIDATION_ERROR', "Identifiant d'interaction manquant.");

  const resolvedAgencyId = (agencyId ?? '').trim();

  const row = {
    ...interaction,
    id: interactionId,
    agency_id: resolvedAgencyId || null,
    entity_id: (interaction.entity_id as string | undefined)?.trim() || null,
    contact_id: (interaction.contact_id as string | undefined)?.trim() || null,
    created_by: callerId,
    status: (interaction.status as string) ?? ''
  };

  const { data, error } = await db
    .from('interactions')
    .upsert(row as any, { onConflict: 'id' })
    .select('*');

  if (error) throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
  const saved = data?.[0];
  if (!saved) throw httpError(500, 'DB_WRITE_FAILED', "Impossible d'enregistrer l'interaction.");
  return saved;
};

const addTimelineEvent = async (
  db: DbClient,
  interactionId: string,
  expectedUpdatedAt: string,
  event: Record<string, unknown>,
  additionalUpdates?: Record<string, unknown>
): Promise<InteractionRow> => {
  const { data: current, error: fetchError } = await db
    .from('interactions')
    .select('timeline')
    .eq('id', interactionId)
    .single();

  if (fetchError || !current) throw httpError(404, 'NOT_FOUND', 'Interaction introuvable.');

  const currentTimeline = Array.isArray(current.timeline) ? current.timeline : [];
  const updatedTimeline = [...currentTimeline, event];

  const updates = {
    ...(additionalUpdates ?? {}),
    timeline: updatedTimeline
  };

  const { data, error } = await db
    .from('interactions')
    .update(updates)
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
  callerId: string,
  requestId: string | undefined,
  data: DataInteractionsPayload
): Promise<Record<string, unknown>> => {
  switch (data.action) {
    case 'save': {
      const interaction = await saveInteraction(
        db,
        callerId,
        data.agency_id,
        data.interaction as unknown as Record<string, unknown>
      );
      return { request_id: requestId, ok: true, interaction };
    }
    case 'add_timeline_event': {
      const interaction = await addTimelineEvent(
        db,
        data.interaction_id,
        data.expected_updated_at,
        data.event as unknown as Record<string, unknown>,
        data.updates as Record<string, unknown> | undefined
      );
      return { request_id: requestId, ok: true, interaction };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
