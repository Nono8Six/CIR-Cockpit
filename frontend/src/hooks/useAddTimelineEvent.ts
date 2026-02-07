import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addTimelineEvent } from '@/services/interactions/addTimelineEvent';
import { interactionsKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';
import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { upsertInteractionInList } from '@/utils/interactions/upsertInteractionInList';

type TimelineMutationInput = {
  interaction: Interaction;
  event: TimelineEvent;
  updates?: InteractionUpdate;
};

export const useAddTimelineEvent = (agencyId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ interaction, event, updates }: TimelineMutationInput) =>
      addTimelineEvent(interaction, event, updates),
    onSuccess: (interaction) => {
      if (!agencyId) return;
      queryClient.setQueryData<Interaction[]>(interactionsKey(agencyId), (current) =>
        upsertInteractionInList(current, interaction)
      );
    },
    onError: (err) => {
      const appError = normalizeError(err, 'Impossible de mettre a jour le dossier.');
      reportError(appError, { source: 'useAddTimelineEvent' });
      notifyError(appError);
    }
  });
};
