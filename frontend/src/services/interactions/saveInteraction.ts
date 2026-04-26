import { ResultAsync } from 'neverthrow';

import { dataInteractionsMutationResponseSchema } from 'shared/schemas/api-responses';
import type { Interaction, InteractionDraft } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';
import { getCurrentUserLabel } from '@/services/auth/getCurrentUserLabel';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { hydrateTimeline } from './hydrateTimeline';
import { validateInteractionDraft } from './validateInteractionDraft';

const parseInteractionResponse = (payload: unknown): Interaction => {
  const parsed = dataInteractionsMutationResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return hydrateTimeline(parsed.data.interaction);
};

export const saveInteraction = (interaction: InteractionDraft): ResultAsync<Interaction, AppError> =>
  safeTrpc(
    async (api, options) => {
      validateInteractionDraft(interaction);
      const agencyId = interaction.agency_id?.trim();
      const interactionId = interaction.id?.trim();
      const statusId = interaction.status_id?.trim();
      const interactionType = interaction.interaction_type?.trim();
      if (!agencyId) {
        throw createAppError({
          code: 'AGENCY_ID_INVALID',
          message: 'Agence active invalide.',
          source: 'validation'
        });
      }
      if (!interactionId) {
        throw createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Identifiant interaction requis.',
          source: 'validation'
        });
      }
      if (!statusId) {
        throw createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Statut interaction requis.',
          source: 'validation'
        });
      }
      if (!interactionType) {
        throw createAppError({
          code: 'VALIDATION_ERROR',
          message: "Type d'interaction requis.",
          source: 'validation'
        });
      }
      const userLabel = await getCurrentUserLabel();
      const interactionPayload = { ...interaction };
      delete interactionPayload.agency_id;
      const timeline = interaction.timeline.map((event) => ({
        ...event,
        author: event.author?.trim() || userLabel || undefined
      }));
      const normalizedInteraction = {
        ...interactionPayload,
        id: interactionId,
        status_id: statusId,
        interaction_type: interactionType,
        contact_phone: interaction.contact_phone ?? undefined,
        contact_email: interaction.contact_email ?? undefined,
        order_ref: interaction.order_ref ?? undefined,
        reminder_at: interaction.reminder_at ?? undefined,
        notes: interaction.notes ?? undefined,
        entity_id: interaction.entity_id ?? undefined,
        contact_id: interaction.contact_id ?? undefined,
        timeline
      };

      return api.data.interactions.mutate({
          action: 'save',
          agency_id: agencyId,
          interaction: normalizedInteraction
        }, options);
    },
    parseInteractionResponse,
    "Impossible d'enregistrer l'interaction."
  );
