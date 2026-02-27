import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Car, Mail, Phone, Store } from 'lucide-react';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import { isProspectRelationValue } from '@/constants/relations';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import type {
  AgencyStatus,
  Interaction,
  InteractionUpdate,
  StatusCategory,
  TimelineEvent
} from '@/types';
import { getEndOfDay } from '@/utils/date/getEndOfDay';
import { getPresetDateRange, type FilterPeriod } from '@/utils/date/getPresetDateRange';
import { getStartOfDay } from '@/utils/date/getStartOfDay';
import { getTodayIsoDate } from '@/utils/date/getTodayIsoDate';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { toTimestamp } from '@/utils/date/toTimestamp';
import { useAddTimelineEvent } from './useAddTimelineEvent';

type ViewMode = 'kanban' | 'list';

type UseDashboardStateParams = {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

type DateBounds = {
  start: number;
  end: number;
};

const resolveActivityTimestamp = (interaction: Interaction): number =>
  toTimestamp(interaction.last_action_at ?? interaction.updated_at ?? interaction.created_at);

const isTimestampWithinBounds = (timestamp: number, bounds: DateBounds): boolean =>
  timestamp >= bounds.start && timestamp <= bounds.end;

const DONE_STATUS_TOKENS = ['termine', 'cloture', 'clos', 'finalise', 'resolu', 'archive'];
const TODO_STATUS_TOKENS = ['a traiter', 'urgent', 'a faire', 'nouveau', 'nouvelle', 'ouverte'];

const normalizeStatusLabel = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const includesAnyToken = (value: string, tokens: string[]): boolean =>
  tokens.some((token) => value.includes(token));

const inferStatusCategoryFromLabel = (statusLabel: string): StatusCategory => {
  const normalizedLabel = normalizeStatusLabel(statusLabel);

  if (includesAnyToken(normalizedLabel, DONE_STATUS_TOKENS)) {
    return 'done';
  }

  if (includesAnyToken(normalizedLabel, TODO_STATUS_TOKENS)) {
    return 'todo';
  }

  return 'in_progress';
};

const buildDateBounds = (startDate: string, endDate: string): DateBounds | null => {
  const start = getStartOfDay(startDate).getTime();
  const end = getEndOfDay(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }

  return { start, end };
};

const validateCustomDateRange = (startDate: string, endDate: string): string | null => {
  if (!startDate || !endDate) {
    return 'Renseignez une date de debut et de fin.';
  }

  if (startDate > endDate) {
    return 'La date de debut doit preceder la date de fin.';
  }

  return null;
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
  const today = getTodayIsoDate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [periodErrorMessage, setPeriodErrorMessage] = useState<string | null>(null);
  const [lastValidCustomRange, setLastValidCustomRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: today,
    endDate: today
  });
  const startDateRef = useRef(today);
  const endDateRef = useRef(today);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = useMemo(() => deferredSearchTerm.trim().toLowerCase(), [deferredSearchTerm]);
  const compactSearchTerm = useMemo(() => normalizedSearchTerm.replace(/\s/g, ''), [normalizedSearchTerm]);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);

  const presetDates = useMemo(
    () => getPresetDateRange(period, startDate, endDate),
    [period, startDate, endDate]
  );

  const customRangeError = useMemo(
    () => validateCustomDateRange(startDate, endDate),
    [startDate, endDate]
  );

  const effectiveStartDate =
    period === 'custom'
      ? customRangeError
        ? lastValidCustomRange.startDate
        : startDate
      : presetDates.startDate;

  const effectiveEndDate =
    period === 'custom'
      ? customRangeError
        ? lastValidCustomRange.endDate
        : endDate
      : presetDates.endDate;

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

  const dateBounds = useMemo(
    () => buildDateBounds(effectiveStartDate, effectiveEndDate),
    [effectiveStartDate, effectiveEndDate]
  );

  const filteredData = useMemo(() => {
    let data = interactions;

    if (normalizedSearchTerm) {
      data = data.filter((interaction) =>
        interaction.company_name.toLowerCase().includes(normalizedSearchTerm)
        || interaction.contact_name.toLowerCase().includes(normalizedSearchTerm)
        || interaction.subject.toLowerCase().includes(normalizedSearchTerm)
        || Boolean(interaction.order_ref && interaction.order_ref.includes(compactSearchTerm))
        || Boolean(interaction.contact_phone && interaction.contact_phone.includes(compactSearchTerm))
        || Boolean(
          interaction.contact_email
          && interaction.contact_email.toLowerCase().includes(normalizedSearchTerm)
        )
        || interaction.mega_families.some((family) =>
          family.toLowerCase().includes(normalizedSearchTerm)
        )
      );
    }

    if (!dateBounds) {
      if (viewMode === 'list') {
        return [...data].sort(
          (first, second) => resolveActivityTimestamp(second) - resolveActivityTimestamp(first)
        );
      }

      return data.filter((interaction) => !isStatusDone(interaction));
    }

    if (viewMode === 'list') {
      return data
        .filter((interaction) => {
          const lastActivityAt = resolveActivityTimestamp(interaction);
          return isTimestampWithinBounds(lastActivityAt, dateBounds);
        })
        .sort((first, second) => resolveActivityTimestamp(second) - resolveActivityTimestamp(first));
    }

    return data.filter((interaction) => {
      const lastActivityAt = resolveActivityTimestamp(interaction);
      return isTimestampWithinBounds(lastActivityAt, dateBounds);
    });
  }, [compactSearchTerm, dateBounds, interactions, isStatusDone, normalizedSearchTerm, viewMode]);

  const kanbanColumns = useMemo<KanbanColumns | null>(() => {
    if (viewMode === 'list') {
      return null;
    }

    return {
      urgencies: filteredData.filter(
        (interaction) =>
          isStatusTodo(interaction)
          || Boolean(
            interaction.reminder_at
            && isBeforeNow(interaction.reminder_at)
            && !isStatusDone(interaction)
          )
      ),
      inProgress: filteredData.filter(
        (interaction) =>
          !isStatusTodo(interaction)
          && !isStatusDone(interaction)
          && !(interaction.reminder_at && isBeforeNow(interaction.reminder_at))
      ),
      completed: filteredData.filter((interaction) => isStatusDone(interaction))
    };
  }, [filteredData, isStatusDone, isStatusTodo, viewMode]);

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

  const setCustomDateRange = useCallback(
    (nextStartDate: string, nextEndDate: string) => {
      startDateRef.current = nextStartDate;
      endDateRef.current = nextEndDate;
      setPeriod('custom');
      setStartDate(nextStartDate);
      setEndDate(nextEndDate);

      const validationMessage = validateCustomDateRange(nextStartDate, nextEndDate);
      if (validationMessage) {
        setPeriodErrorMessage(validationMessage);
        if (periodErrorMessage !== validationMessage) {
          handleUiError(
            createAppError({
              code: 'VALIDATION_ERROR',
              message: validationMessage,
              source: 'validation'
            }),
            validationMessage,
            { source: 'dashboard.filters' }
          );
        }
        return;
      }

      setPeriodErrorMessage(null);
      setLastValidCustomRange({
        startDate: nextStartDate,
        endDate: nextEndDate
      });
    },
    [periodErrorMessage]
  );

  const handleDateRangeChange = useCallback(
    (nextStartDate: string, nextEndDate: string) => {
      setCustomDateRange(nextStartDate, nextEndDate);
    },
    [setCustomDateRange]
  );

  const handlePeriodChange = useCallback((nextPeriod: FilterPeriod) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      setPeriodErrorMessage(null);
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
    setPeriod: handlePeriodChange,
    setSelectedInteraction,
    handleDateRangeChange,
    handleStartDateChange: (value: string) => setCustomDateRange(value, endDateRef.current),
    handleEndDateChange: (value: string) => setCustomDateRange(startDateRef.current, value),
    handleConvertRequest,
    handleInteractionUpdate
  };
};
