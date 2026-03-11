import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAddTimelineEvent } from '@/hooks/useAddTimelineEvent';
import { useDeleteInteraction } from '@/hooks/useDeleteInteraction';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import { isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import {
  invalidateEntityInteractionsQueries,
  invalidateInteractionsQuery
} from '@/services/query/queryInvalidation';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';

const INTERACTIONS_PAGE_SIZE = 20;

const buildTimelineSuccessMessage = (
  updates: InteractionUpdate | undefined,
  event: TimelineEvent,
  statusById: Map<string, AgencyStatus>
): string => {
  if (updates?.status_id) {
    return `Statut change : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis a jour'}`;
  }
  if (updates?.status) {
    return `Statut change : ${updates.status}`;
  }
  if (updates?.order_ref) {
    return 'N° de dossier enregistre';
  }
  if (event.type === 'note') {
    return 'Note ajoutee';
  }
  return 'Dossier mis a jour';
};

type UseClientDetailInteractionsParams = {
  activeAgencyId: string | null;
  clientId: string | null;
  statuses: AgencyStatus[];
};

export const useClientDetailInteractions = ({
  activeAgencyId,
  clientId,
  statuses
}: UseClientDetailInteractionsParams) => {
  const [page, setPage] = useState(1);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(activeAgencyId);
  const deleteInteractionMutation = useDeleteInteraction({
    agencyId: activeAgencyId,
    entityId: clientId
  });
  const interactionsQuery = useEntityInteractions(
    clientId,
    page,
    INTERACTIONS_PAGE_SIZE,
    Boolean(clientId)
  );

  const statusById = useMemo(() => {
    const map = new Map<string, AgencyStatus>();
    statuses.forEach((status) => {
      if (status.id) {
        map.set(status.id, status);
      }
    });
    return map;
  }, [statuses]);

  const interactionsPage = interactionsQuery.data;
  const interactions = interactionsPage?.interactions ?? [];
  const totalPages = interactionsPage?.totalPages ?? 1;
  const totalInteractions = interactionsPage?.total ?? 0;

  const handleInteractionUpdate = useCallback(
    async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
      try {
        const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });
        setSelectedInteraction((current) => (current?.id === updated.id ? updated : current));
        void invalidateEntityInteractionsQueries(queryClient, clientId);
        notifySuccess(buildTimelineSuccessMessage(updates, event, statusById));
      } catch (error) {
        if (isAppError(error) && error.code === 'CONFLICT') {
          setSelectedInteraction(null);
          void invalidateInteractionsQuery(queryClient, activeAgencyId);
          handleUiError(
            error,
            'Ce dossier a ete modifie par un autre utilisateur. Rechargez les donnees.',
            { source: 'client.details.conflict' }
          );
          return;
        }

        handleUiError(error, 'Impossible de mettre a jour le dossier.', {
          source: 'client.details.update'
        });
      }
    },
    [activeAgencyId, addTimelineMutation, clientId, queryClient, statusById]
  );

  const handleConfirmDeleteInteraction = useCallback(async () => {
    if (!interactionToDelete) {
      return;
    }

    try {
      const deletedInteractionId = await deleteInteractionMutation.mutateAsync(interactionToDelete.id);
      if (selectedInteraction?.id === deletedInteractionId) {
        setSelectedInteraction(null);
      }
      if (interactions.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      setInteractionToDelete(null);
      notifySuccess('Interaction supprimee.');
    } catch {
      return;
    }
  }, [deleteInteractionMutation, interactionToDelete, interactions.length, page, selectedInteraction]);

  return {
    currentPage: page,
    hasError: interactionsQuery.isError,
    interactionToDelete,
    interactions,
    isDeletePending: deleteInteractionMutation.isPending,
    isInteractionsLoading: interactionsQuery.isLoading,
    selectedInteraction,
    totalInteractions,
    totalPages,
    handleConfirmDeleteInteraction,
    handleInteractionUpdate,
    onNextPage: () => {
      setPage((current) => Math.min(totalPages, current + 1));
    },
    onPreviousPage: () => {
      setPage((current) => Math.max(1, current - 1));
    },
    onRetry: () => {
      void interactionsQuery.refetch();
    },
    setInteractionToDelete,
    setSelectedInteraction
  };
};
