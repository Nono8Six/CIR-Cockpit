import { useCallback, useMemo } from 'react';

import type { AgencyStatus, Interaction } from '@/types';
import type { AgencyConfig } from '@/services/config';
import {
  createInteractionStatusPredicates,
  inferStatusCategoryFromLabel
} from '@/utils/dashboard/dashboardAggregates';
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

  const predicates = useMemo(
    () =>
      createInteractionStatusPredicates(statuses, (rawLabel) =>
        resolveReferenceLabel('statuses', rawLabel, resolutions)
      ),
    [resolutions, statuses],
  );

  const { getStatusMeta, isStatusDone, isStatusTodo, isReminderOverdue } = predicates;

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

  return {
    statusById,
    getStatusMeta,
    isStatusDone,
    isStatusTodo,
    getStatusBadgeClass,
    isReminderOverdue,
  };
};
