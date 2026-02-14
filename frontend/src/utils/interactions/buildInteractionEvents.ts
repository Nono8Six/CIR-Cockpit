import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { formatDateTime } from '@/utils/date/formatDateTime';
import { getNowIsoString } from '@/utils/date/getNowIsoString';

type BuildInteractionEventsInput = {
  interaction: Interaction;
  statusId: string;
  reminder: string;
  orderRef: string;
  note: string;
  statusById: Map<string, AgencyStatus>;
};

export const buildInteractionEvents = ({
  interaction,
  statusId,
  reminder,
  orderRef,
  note,
  statusById
}: BuildInteractionEventsInput) => {
  const safeReminder = interaction.reminder_at || '';
  const safeOrderRef = interaction.order_ref || '';

  if (!note.trim()
    && statusId === (interaction.status_id ?? '')
    && reminder === safeReminder
    && orderRef === safeOrderRef) {
    return { events: [], updates: null };
  }

  const events: TimelineEvent[] = [];
  const updates: InteractionUpdate = {};
  const now = getNowIsoString();

  if (orderRef !== safeOrderRef) {
    events.push({
      id: `${Date.now()}or`,
      date: now,
      type: 'order_ref_change',
      content: `N° Dossier : ${safeOrderRef || 'Aucun'} ➔ ${orderRef}`
    });
    updates.order_ref = orderRef;
  }

  if (statusId && statusId !== (interaction.status_id ?? '')) {
    const previousLabel = statusById.get(interaction.status_id ?? '')?.label ?? interaction.status;
    const nextStatus = statusById.get(statusId);
    const nextLabel = nextStatus?.label ?? interaction.status;
    events.push({
      id: `${Date.now()}st`,
      date: now,
      type: 'status_change',
      content: `Statut modifié : ${previousLabel} ➔ ${nextLabel}`
    });
    updates.status_id = statusId;
    updates.status = nextLabel;
    if (nextStatus) {
      updates.status_is_terminal = nextStatus.is_terminal || nextStatus.category === 'done';
    }
  }

  if (reminder !== safeReminder) {
    const prettyDate = reminder ? formatDateTime(reminder) : 'Aucun';
    events.push({
      id: `${Date.now()}rm`,
      date: now,
      type: 'reminder_change',
      content: `Rappel mis à jour : ${prettyDate}`
    });
    updates.reminder_at = reminder;
  }

  if (note.trim()) {
    events.push({
      id: `${Date.now()}nt`,
      date: now,
      type: 'note',
      content: note
    });
  }

  if (events.length > 0) {
    updates.last_action_at = now;
  }

  return { events, updates };
};
