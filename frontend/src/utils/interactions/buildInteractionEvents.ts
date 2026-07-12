import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { formatPipelineAmount } from '@/utils/dashboard/dashboardPipeline';
import { formatDateTime } from '@/utils/date/formatDateTime';
import { getNowIsoString } from '@/utils/date/getNowIsoString';

type BuildInteractionEventsInput = {
  interaction: Interaction;
  statusId: string;
  reminder: string;
  amount: string;
  orderRef: string;
  note: string;
  statusById: Map<string, AgencyStatus>;
};

// Champ formulaire (string) vers montant : '' = aucun montant, sinon nombre positif.
export const parseAmountInput = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
};

export const buildInteractionEvents = ({
  interaction,
  statusId,
  reminder,
  amount,
  orderRef,
  note,
  statusById
}: BuildInteractionEventsInput) => {
  const safeReminder = interaction.reminder_at || '';
  const safeOrderRef = interaction.order_ref || '';
  const safeAmount = interaction.amount ?? null;
  const nextAmount = parseAmountInput(amount);
  const amountChanged = nextAmount !== undefined && nextAmount !== safeAmount;

  if (!note.trim()
    && statusId === (interaction.status_id ?? '')
    && reminder === safeReminder
    && !amountChanged
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

  if (amountChanged) {
    events.push({
      id: `${Date.now()}am`,
      date: now,
      type: 'amount_change',
      content: `Montant : ${formatPipelineAmount(safeAmount)} ➔ ${formatPipelineAmount(nextAmount)}`
    });
    updates.amount = nextAmount;
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
