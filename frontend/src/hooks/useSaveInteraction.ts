import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveInteraction } from '@/services/interactions/saveInteraction';
import { interactionsKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';
import type { Interaction, InteractionDraft } from '@/types';
import type { AppError } from '@/services/errors/AppError';
import { upsertInteractionInList } from '@/utils/interactions/upsertInteractionInList';

export const useSaveInteraction = (agencyId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<Interaction, AppError, InteractionDraft>({
    mutationFn: (payload: InteractionDraft) =>
      saveInteraction(payload).match(
        (interaction) => interaction,
        (error) => {
          throw error;
        }
      ),
    onSuccess: (interaction) => {
      if (!agencyId) return;
      queryClient.setQueryData<Interaction[]>(interactionsKey(agencyId), (current) =>
        upsertInteractionInList(current, interaction)
      );
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible d'enregistrer l'interaction.");
      reportError(appError, { source: 'useSaveInteraction' });
      notifyError(appError);
    }
  });
};
