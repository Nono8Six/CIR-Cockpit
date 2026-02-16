import { ResultAsync } from 'neverthrow';

import type { Interaction, InteractionDraft } from '@/types';
import { safeApiCall } from '@/lib/result';
import { getCurrentUserLabel } from '@/services/auth/getCurrentUserLabel';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';
import { hydrateTimeline } from './hydrateTimeline';
import { validateInteractionDraft } from './validateInteractionDraft';

const parseInteractionResponse = (payload: unknown): Interaction => {
  if (!isRecord(payload) || !isRecord(payload.interaction)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return hydrateTimeline(payload.interaction as Interaction);
};

export const saveInteraction = (interaction: InteractionDraft): ResultAsync<Interaction, AppError> =>
  safeApiCall(
    (async () => {
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
      const timeline = interaction.timeline.map((event) => ({
        ...event,
        author: event.author?.trim() || userLabel || undefined
      }));

      return safeInvoke('/data/interactions', {
        action: 'save',
        agency_id: agencyId,
        interaction: {
          ...interaction,
          id: interaction.id,
          timeline
        }
      }, parseInteractionResponse);
    })(),
    "Impossible d'enregistrer l'interaction."
  );
