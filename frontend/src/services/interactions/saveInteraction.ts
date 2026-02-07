import { ResultAsync } from 'neverthrow';

import type { Interaction, InteractionDraft } from '@/types';
import { safeAsync } from '@/lib/result';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { getCurrentUserLabel } from '@/services/auth/getCurrentUserLabel';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import type { TablesInsert } from '@/types/supabase';
import { hydrateTimeline } from './hydrateTimeline';
import { validateInteractionDraft } from './validateInteractionDraft';

export const saveInteraction = (interaction: InteractionDraft): ResultAsync<Interaction, AppError> =>
  safeAsync((async () => {
    validateInteractionDraft(interaction);
    const supabase = requireSupabaseClient();
    const agencyId = interaction.agency_id?.trim() || (await getActiveAgencyId());
    const userId = interaction.created_by?.trim() || (await getCurrentUserId());
    const userLabel = await getCurrentUserLabel();
    const interactionId = interaction.id?.trim();
    if (!interactionId) throw createAppError({ code: 'VALIDATION_ERROR', message: "Identifiant d'interaction manquant.", source: 'validation' });
    const normalizeOptionalId = (value?: string | null) => value?.trim() ? value.trim() : null;

    const payloadRow: TablesInsert<'interactions'> = {
      ...interaction,
      id: interactionId,
      status: interaction.status ?? '',
      timeline: interaction.timeline.map(event => ({ ...event, author: event.author?.trim() || userLabel || undefined })),
      agency_id: agencyId,
      entity_id: normalizeOptionalId(interaction.entity_id),
      contact_id: normalizeOptionalId(interaction.contact_id),
      created_by: userId
    };

    const { data, error, status } = await supabase.from('interactions').upsert(payloadRow, { onConflict: 'id' }).select('*');
    if (error) throw mapPostgrestError(error, { operation: 'write', resource: 'les interactions', status });
    const saved = data?.[0];
    if (!saved) throw createAppError({ code: 'DB_WRITE_FAILED', message: "Impossible d'enregistrer l'interaction.", source: 'db' });
    return hydrateTimeline(saved);
  })(), error => normalizeError(error, "Impossible d'enregistrer l'interaction."));
