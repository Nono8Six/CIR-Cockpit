import type { AgencyStatus, Interaction } from '@/types';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import type { InteractionCardComputedState } from './InteractionCard.types';

export const getInteractionCardState = (
  data: Interaction,
  statusMeta?: AgencyStatus
): InteractionCardComputedState => {
  const isDone = typeof data.status_is_terminal === 'boolean'
    ? data.status_is_terminal
    : statusMeta
      ? statusMeta.is_terminal || statusMeta.category === 'done'
      : false;

  const isLate = data.reminder_at ? isBeforeNow(data.reminder_at) && !isDone : false;
  const statusLabel = statusMeta?.label ?? data.status;

  let statusClass = 'border-l-orange-400';
  if (isLate || statusMeta?.category === 'todo' || statusMeta?.is_default) {
    statusClass = 'border-l-red-500';
  } else if (isDone) {
    statusClass = 'border-l-emerald-500 opacity-60 hover:opacity-100';
  }

  return { isDone, isLate, statusLabel, statusClass };
};
