import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useDeleteInteraction } from '@/hooks/interactions/core/actions/useDeleteInteraction';
import { useEntityInteractions } from '@/hooks/interactions/core/queries/useEntityInteractions';
import { useAddTimelineEvent } from '@/hooks/interactions/timeline/useAddTimelineEvent';
import { handleUiError } from '@/services/errors/handleUiError';
import { isAppError } from '@/services/errors/AppError';
import type { EntityInteractionsScope } from '@/services/interactions/getInteractionsByEntity';
import { notifySuccess } from '@/services/errors/notifySuccess';
import {
  invalidateEntityInteractionsQueries,
  invalidateInteractionsQuery
} from '@/services/query/queryInvalidation';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';

const INTERACTIONS_PAGE_SIZE = 10;

const buildTimelineSuccessMessage = (
  updates: InteractionUpdate | undefined,
  event: TimelineEvent,
  statusById: Map<string, AgencyStatus>
): string => {
  if (updates?.status_id) {
    return `Statut changé : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis à jour'}`;
  }
  if (updates?.status) {
    return `Statut changé : ${updates.status}`;
  }
  if (updates?.order_ref) {
    return 'N° de dossier enregistré';
  }
  if (event.type === 'note') {
    return 'Note ajoutée.';
  }
  return 'Dossier mis à jour.';
};

type UseClientDirectoryRecordInteractionsParams = {
  agencyId: string | null;
  entityId: string | null;
  statuses: AgencyStatus[];
};

const normalizeSearchValue = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('fr');

const matchesSearch = (interaction: Interaction, searchText: string): boolean => {
  const query = normalizeSearchValue(searchText);
  if (!query) return true;

  return [
    interaction.subject,
    interaction.status,
    interaction.interaction_type,
    interaction.contact_name,
    interaction.contact_service,
    interaction.contact_email,
    interaction.contact_phone,
    interaction.order_ref
  ].some((value) => normalizeSearchValue(value ?? '').includes(query));
};

export const useClientDirectoryRecordInteractions = ({
  agencyId,
  entityId,
  statuses
}: UseClientDirectoryRecordInteractionsParams) => {
  const [scope, setScope] = useState<EntityInteractionsScope>('open');
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId, entityId });
  const listQuery = useEntityInteractions(entityId, page, INTERACTIONS_PAGE_SIZE, Boolean(entityId), scope);

  const statusById = useMemo(() => {
    const map = new Map<string, AgencyStatus>();
    statuses.forEach((status) => {
      if (status.id) {
        map.set(status.id, status);
      }
    });
    return map;
  }, [statuses]);

  const interactions = useMemo(
    () => (listQuery.data?.interactions ?? []).filter((interaction) => matchesSearch(interaction, searchText)),
    [listQuery.data?.interactions, searchText]
  );

  const handleScopeChange = useCallback((nextScope: EntityInteractionsScope) => {
    setScope(nextScope);
    setPage(1);
  }, []);

  const handleInteractionUpdate = useCallback(
    async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
      try {
        const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });
        setSelectedInteraction((current) => (current?.id === updated.id ? updated : current));
        void invalidateEntityInteractionsQueries(queryClient, entityId);
        notifySuccess(buildTimelineSuccessMessage(updates, event, statusById));
      } catch (error) {
        if (isAppError(error) && error.code === 'CONFLICT') {
          setSelectedInteraction(null);
          void invalidateInteractionsQuery(queryClient, agencyId);
          handleUiError(
            error,
            'Ce dossier a été modifié par un autre utilisateur. Rechargez les données.',
            { source: 'client.directory.detail.interaction.conflict' }
          );
          return;
        }

        handleUiError(error, 'Impossible de mettre à jour le dossier.', {
          source: 'client.directory.detail.interaction.update'
        });
      }
    },
    [addTimelineMutation, agencyId, entityId, queryClient, statusById]
  );

  const handleConfirmDeleteInteraction = useCallback(async () => {
    if (!interactionToDelete) return;

    try {
      const deletedInteractionId = await deleteInteractionMutation.mutateAsync(interactionToDelete.id);
      if (selectedInteraction?.id === deletedInteractionId) {
        setSelectedInteraction(null);
      }
      if ((listQuery.data?.interactions.length ?? 0) === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      setInteractionToDelete(null);
      notifySuccess('Interaction supprimée.');
    } catch {
      return;
    }
  }, [deleteInteractionMutation, interactionToDelete, listQuery.data?.interactions.length, page, selectedInteraction]);

  return {
    filters: {
      scope,
      searchText,
      onScopeChange: handleScopeChange,
      onSearchTextChange: setSearchText
    },
    list: {
      currentPage: page,
      hasError: listQuery.isError,
      interactions,
      isLoading: listQuery.isLoading,
      isRefreshing: listQuery.isFetching && !listQuery.isLoading,
      onNextPage: () => setPage((current) => Math.min(listQuery.data?.totalPages ?? 1, current + 1)),
      onPreviousPage: () => setPage((current) => Math.max(1, current - 1)),
      onRetry: () => {
        void listQuery.refetch();
      },
      totalInteractions: listQuery.data?.total ?? 0,
      totalPages: listQuery.data?.totalPages ?? 1,
      visibleInteractions: interactions.length
    },
    handleConfirmDeleteInteraction,
    handleInteractionUpdate,
    interactionToDelete,
    isDeletePending: deleteInteractionMutation.isPending,
    selectedInteraction,
    setInteractionToDelete,
    setSelectedInteraction
  };
};
