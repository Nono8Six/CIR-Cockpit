import { ResultAsync } from 'neverthrow';

import { dataInteractionsMutationResponseSchema } from 'shared/schemas/api-responses';
import type { Interaction, InteractionDraft } from '@/types';
import { safeRpc } from '@/services/api/safeRpc';
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
  safeRpc(
    async (api, init) => {
      validateInteractionDraft(interaction);
      const agencyId = interaction.agency_id?.trim();
      if (!agencyId) {
        throw createAppError({
          code: 'AGENCY_ID_INVALID',
          message: 'Agence active invalide.',
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

      return api.data.interactions.$post({
        json: {
          action: 'save',
          agency_id: agencyId,
          interaction: {
            ...interactionPayload,
            id: interaction.id,
            timeline
          }
        }
      }, init);
    },
    parseInteractionResponse,
    "Impossible d'enregistrer l'interaction."
  );
