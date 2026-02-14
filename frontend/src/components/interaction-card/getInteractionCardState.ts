import type { AgencyStatus, Interaction, StatusCategory } from '@/types';
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
  const isTodo = Boolean(statusMeta?.category === 'todo' || statusMeta?.is_default);
  const statusLabel = statusMeta?.label ?? data.status;
  const statusTone: StatusCategory = isDone ? 'done' : isTodo || isLate ? 'todo' : 'in_progress';

  const statusClass =
    statusTone === 'todo'
      ? 'border-red-300 border-l-4'
      : statusTone === 'done'
        ? 'border-emerald-300 border-l-4'
        : 'border-amber-300 border-l-4';

  return { isDone, isLate, statusTone, statusLabel, statusClass };
};
