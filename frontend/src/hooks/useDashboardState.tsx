import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Car, Mail, Phone, Store } from 'lucide-react';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import { isProspectRelationValue } from '@/constants/relations';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import type {
  AgencyStatus,
  Interaction,
  InteractionUpdate,
  TimelineEvent
} from '@/types';
import { inferStatusCategoryFromLabel, buildKanbanColumns } from '@/utils/dashboard/dashboardAggregates';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

import { useAddTimelineEvent } from './useAddTimelineEvent';
import { useDeleteInteraction } from './useDeleteInteraction';

type ViewMode = 'kanban' | 'list';

type UseDashboardStateParams = {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

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

export const useDashboardState = ({
  interactions,
  statuses,
  agencyId,
  onRequestConvert
}: UseDashboardStateParams) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId });
  const lastPeriodErrorMessageRef = useRef<string | null>(null);

  const statusById = useMemo(() => {
    const map = new Map<string, AgencyStatus>();
    statuses.forEach((status) => {
      if (status.id) {
        map.set(status.id, status);
      }
    });
    return map;
  }, [statuses]);

  const statusByLabel = useMemo(
    () => new Map(statuses.map((status) => [status.label.toLowerCase(), status])),
    [statuses]
  );

  const getStatusMeta = useCallback(
    (interaction: Interaction) => {
      if (interaction.status_id) {
        return (
          statusById.get(interaction.status_id)
          ?? statusByLabel.get(interaction.status.toLowerCase())
        );
      }

      return statusByLabel.get(interaction.status.toLowerCase());
    },
    [statusById, statusByLabel]
  );

  const isStatusDone = useCallback(
    (interaction: Interaction) => {
      if (typeof interaction.status_is_terminal === 'boolean') {
        return interaction.status_is_terminal;
      }

      const statusMeta = getStatusMeta(interaction);
      if (statusMeta) {
        return Boolean(statusMeta.is_terminal || statusMeta.category === 'done');
      }

      return inferStatusCategoryFromLabel(interaction.status) === 'done';
    },
    [getStatusMeta]
  );

  const isStatusTodo = useCallback(
    (interaction: Interaction) => {
      const statusMeta = getStatusMeta(interaction);
      if (statusMeta) {
        return Boolean(statusMeta.category === 'todo' || statusMeta.is_default);
      }

      return inferStatusCategoryFromLabel(interaction.status) === 'todo';
    },
    [getStatusMeta]
  );

  const {
    searchTerm,
    setSearchTerm,
    period,
    setPeriod,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange
  } = useDashboardFilters({
    interactions,
    viewMode,
    isStatusDone
  });

  useEffect(() => {
    if (!periodErrorMessage) {
      lastPeriodErrorMessageRef.current = null;
      return;
    }

    if (periodErrorMessage === lastPeriodErrorMessageRef.current) {
      return;
    }

    lastPeriodErrorMessageRef.current = periodErrorMessage;
    handleUiError(
      createAppError({
        code: 'VALIDATION_ERROR',
        message: periodErrorMessage,
        source: 'validation'
      }),
      periodErrorMessage,
      { source: 'dashboard.filters' }
    );
  }, [periodErrorMessage]);

  const getStatusBadgeClass = useCallback(
    (interaction: Interaction) => {
      const meta = getStatusMeta(interaction);
      const isTerminal =
        typeof interaction.status_is_terminal === 'boolean'
          ? interaction.status_is_terminal
          : meta?.is_terminal;
      const inferredCategory = inferStatusCategoryFromLabel(interaction.status);

      if (meta?.category === 'todo' || meta?.is_default || inferredCategory === 'todo') {
        return 'border-destructive/50 bg-destructive/15 text-destructive';
      }

      if (meta?.category === 'done' || isTerminal || inferredCategory === 'done') {
        return 'border-success/45 bg-success/18 text-success';
      }

      return 'border-warning/45 bg-warning/20 text-warning-foreground';
    },
    [getStatusMeta]
  );

  const isReminderOverdue = useCallback(
    (interaction: Interaction) =>
      Boolean(interaction.reminder_at && isBeforeNow(interaction.reminder_at) && !isStatusDone(interaction)),
    [isStatusDone]
  );

  const kanbanColumns = useMemo<KanbanColumns | null>(() => {
    if (viewMode === 'list') {
      return null;
    }

    return buildKanbanColumns({
      interactions: filteredData,
      isStatusTodo,
      isStatusDone,
      isReminderOverdue
    });
  }, [filteredData, isReminderOverdue, isStatusDone, isStatusTodo, viewMode]);

  const getChannelIcon = useCallback((channel: string) => {
    switch (channel) {
      case 'Téléphone':
        return <Phone size={14} className="text-muted-foreground" />;
      case 'Email':
        return <Mail size={14} className="text-muted-foreground" />;
      case 'Comptoir':
        return <Store size={14} className="text-muted-foreground" />;
      case 'Visite':
        return <Car size={14} className="text-muted-foreground" />;
      default:
        return <Phone size={14} className="text-muted-foreground" />;
    }
  }, []);

  const handleConvertRequest = useCallback(
    (interaction: Interaction) => {
      if (!interaction.entity_id || !isProspectRelationValue(interaction.entity_type)) {
        return;
      }

      onRequestConvert({
        id: interaction.entity_id,
        name: interaction.company_name,
        client_number: null,
        account_type: null
      });
    },
    [onRequestConvert]
  );

  const handleInteractionUpdate = useCallback(
    async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
      try {
        const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });

        if (selectedInteraction?.id === interaction.id) {
          setSelectedInteraction(updated);
        }

        notifySuccess(buildTimelineSuccessMessage(updates, event, statusById));
      } catch (error) {
        if (isAppError(error) && error.code === 'CONFLICT') {
          setSelectedInteraction(null);
          void invalidateInteractionsQuery(queryClient, agencyId);
          handleUiError(
            error,
            'Ce dossier a ete modifie par un autre utilisateur. Rechargez les donnees.',
            { source: 'dashboard.details.conflict' }
          );
          return;
        }

        handleUiError(error, 'Impossible de mettre a jour le dossier.', {
          source: 'dashboard.details.update'
        });
      }
    },
    [addTimelineMutation, agencyId, queryClient, selectedInteraction, statusById]
  );

  const handleRequestDeleteInteraction = useCallback((interaction: Interaction) => {
    setInteractionToDelete(interaction);
  }, []);

  const handleConfirmDeleteInteraction = useCallback(async () => {
    if (!interactionToDelete) {
      return;
    }

    try {
      const deletedInteractionId = await deleteInteractionMutation.mutateAsync(interactionToDelete.id);
      if (selectedInteraction?.id === deletedInteractionId) {
        setSelectedInteraction(null);
      }
      setInteractionToDelete(null);
      notifySuccess('Interaction supprimee.');
    } catch {
      return;
    }
  }, [deleteInteractionMutation, interactionToDelete, selectedInteraction]);

  return {
    viewMode,
    searchTerm,
    selectedInteraction,
    period,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    kanbanColumns,
    getStatusMeta,
    getStatusBadgeClass,
    getChannelIcon,
    setViewMode,
    setSearchTerm,
    setPeriod,
    setSelectedInteraction,
    setInteractionToDelete,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleConvertRequest,
    handleInteractionUpdate,
    interactionToDelete,
    isDeleteInteractionPending: deleteInteractionMutation.isPending,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  };
};
