import { useCallback, useMemo } from 'react';

import type { AgencyStatus, Interaction } from '@/types';
import type { AgencyConfig } from '@/services/config';
import { inferStatusCategoryFromLabel } from '@/utils/dashboard/dashboardAggregates';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { resolveReferenceLabel } from '@/utils/references/resolveReferenceLabel';

export const useDashboardStatusHelpers = (
  statuses: AgencyStatus[],
  resolutions: NonNullable<AgencyConfig['resolutions']> = [],
) => {
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
        const byId = statusById.get(interaction.status_id);
        if (byId) return byId;
      }

      const resolvedLabel = resolveReferenceLabel('statuses', interaction.status, resolutions);
      return statusByLabel.get(resolvedLabel.toLowerCase());
    },
    [resolutions, statusById, statusByLabel],
  );

  const isStatusDone = useCallback(
    (interaction: Interaction) => {
      const statusMeta = getStatusMeta(interaction);
      if (statusMeta) {
        return Boolean(statusMeta.is_terminal || statusMeta.category === 'done');
      }

      if (typeof interaction.status_is_terminal === 'boolean') {
        return interaction.status_is_terminal;
      }

      return inferStatusCategoryFromLabel(resolveReferenceLabel('statuses', interaction.status, resolutions)) === 'done';
    },
    [getStatusMeta, resolutions],
  );

  const isStatusTodo = useCallback(
    (interaction: Interaction) => {
      const statusMeta = getStatusMeta(interaction);
      if (statusMeta) {
        return Boolean(statusMeta.category === 'todo' || statusMeta.is_default);
      }

      return inferStatusCategoryFromLabel(resolveReferenceLabel('statuses', interaction.status, resolutions)) === 'todo';
    },
    [getStatusMeta, resolutions],
  );

  const getStatusBadgeClass = useCallback(
    (interaction: Interaction) => {
      const meta = getStatusMeta(interaction);
      const isTerminal =
        typeof interaction.status_is_terminal === 'boolean'
          ? interaction.status_is_terminal
          : meta?.is_terminal;
      const inferredCategory = inferStatusCategoryFromLabel(
        resolveReferenceLabel('statuses', interaction.status, resolutions),
      );

      if (meta?.category === 'todo' || meta?.is_default || inferredCategory === 'todo') {
        return 'border-destructive/50 bg-destructive/15 text-destructive';
      }

      if (meta?.category === 'done' || isTerminal || inferredCategory === 'done') {
        return 'border-success/45 bg-success/18 text-success';
      }

      return 'border-warning/45 bg-warning/20 text-warning-foreground';
    },
    [getStatusMeta, resolutions],
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
