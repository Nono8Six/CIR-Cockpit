import { useCallback, useMemo } from 'react';

import type { AgencyStatus, Interaction } from '@/types';
import { inferStatusCategoryFromLabel } from '@/utils/dashboard/dashboardAggregates';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

export const useDashboardStatusHelpers = (statuses: AgencyStatus[]) => {
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
    [statuses],
  );

  const getStatusMeta = useCallback(
    (interaction: Interaction) => {
      if (interaction.status_id) {
        return (
          statusById.get(interaction.status_id) ?? statusByLabel.get(interaction.status.toLowerCase())
        );
      }

      return statusByLabel.get(interaction.status.toLowerCase());
    },
    [statusById, statusByLabel],
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
    [getStatusMeta],
  );

  const isStatusTodo = useCallback(
    (interaction: Interaction) => {
      const statusMeta = getStatusMeta(interaction);
      if (statusMeta) {
        return Boolean(statusMeta.category === 'todo' || statusMeta.is_default);
      }

      return inferStatusCategoryFromLabel(interaction.status) === 'todo';
    },
    [getStatusMeta],
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
    [getStatusMeta],
  );

  const isReminderOverdue = useCallback(
    (interaction: Interaction) =>
      Boolean(
        interaction.reminder_at && isBeforeNow(interaction.reminder_at) && !isStatusDone(interaction),
      ),
    [isStatusDone],
  );

  return {
    statusById,
    getStatusMeta,
    isStatusDone,
    isStatusTodo,
    getStatusBadgeClass,
    isReminderOverdue,
  };
};
