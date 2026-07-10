import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import type { AgencyStatus, Interaction, StatusCategory } from '@/types';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

const DONE_STATUS_TOKENS = ['termine', 'cloture', 'clos', 'finalise', 'resolu', 'archive'];
const TODO_STATUS_TOKENS = ['a traiter', 'urgent', 'a faire', 'nouveau', 'nouvelle', 'ouverte'];

export type InteractionStatusPredicates = {
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
  isStatusDone: (interaction: Interaction) => boolean;
  isStatusTodo: (interaction: Interaction) => boolean;
  isReminderOverdue: (interaction: Interaction) => boolean;
};

type BuildKanbanColumnsParams = {
  interactions: Interaction[];
  isStatusTodo: (interaction: Interaction) => boolean;
  isStatusDone: (interaction: Interaction) => boolean;
  isReminderOverdue: (interaction: Interaction) => boolean;
};

const normalizeStatusLabel = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const includesAnyToken = (value: string, tokens: string[]): boolean =>
  tokens.some((token) => value.includes(token));

export const inferStatusCategoryFromLabel = (statusLabel: string): StatusCategory => {
  const normalizedLabel = normalizeStatusLabel(statusLabel);

  if (includesAnyToken(normalizedLabel, DONE_STATUS_TOKENS)) {
    return 'done';
  }

  if (includesAnyToken(normalizedLabel, TODO_STATUS_TOKENS)) {
    return 'todo';
  }

  return 'in_progress';
};

export const createInteractionStatusPredicates = (
  statuses: AgencyStatus[],
  resolveStatusLabel: (rawLabel: string) => string = (rawLabel) => rawLabel
): InteractionStatusPredicates => {
  const statusById = new Map<string, AgencyStatus>();
  const statusByLabel = new Map<string, AgencyStatus>();
  statuses.forEach((status) => {
    if (status.id) {
      statusById.set(status.id, status);
    }
    statusByLabel.set(status.label.toLowerCase(), status);
  });

  const getStatusMeta = (interaction: Interaction): AgencyStatus | undefined => {
    if (interaction.status_id) {
      const byId = statusById.get(interaction.status_id);
      if (byId) return byId;
    }

    return statusByLabel.get(resolveStatusLabel(interaction.status).toLowerCase());
  };

  const isStatusDone = (interaction: Interaction): boolean => {
    const statusMeta = getStatusMeta(interaction);
    if (statusMeta) {
      return Boolean(statusMeta.is_terminal || statusMeta.category === 'done');
    }

    if (typeof interaction.status_is_terminal === 'boolean') {
      return interaction.status_is_terminal;
    }

    return inferStatusCategoryFromLabel(resolveStatusLabel(interaction.status)) === 'done';
  };

  const isStatusTodo = (interaction: Interaction): boolean => {
    const statusMeta = getStatusMeta(interaction);
    if (statusMeta) {
      return Boolean(statusMeta.category === 'todo' || statusMeta.is_default);
    }

    return inferStatusCategoryFromLabel(resolveStatusLabel(interaction.status)) === 'todo';
  };

  const isReminderOverdue = (interaction: Interaction): boolean =>
    Boolean(
      interaction.reminder_at && isBeforeNow(interaction.reminder_at) && !isStatusDone(interaction)
    );

  return { getStatusMeta, isStatusDone, isStatusTodo, isReminderOverdue };
};

export const isInteractionInWorkQueue = (
  interaction: Interaction,
  predicates: Pick<InteractionStatusPredicates, 'isStatusDone' | 'isStatusTodo' | 'isReminderOverdue'>
): boolean =>
  !predicates.isStatusDone(interaction)
  && (predicates.isStatusTodo(interaction) || predicates.isReminderOverdue(interaction));

export const countWorkQueueInteractions = (
  interactions: Interaction[],
  statuses: AgencyStatus[]
): number => {
  const predicates = createInteractionStatusPredicates(statuses);
  return interactions.filter((interaction) => isInteractionInWorkQueue(interaction, predicates)).length;
};

export const buildKanbanColumns = ({
  interactions,
  isStatusTodo,
  isStatusDone,
  isReminderOverdue
}: BuildKanbanColumnsParams): KanbanColumns => ({
  urgencies: interactions.filter(
    (interaction) => isStatusTodo(interaction) || isReminderOverdue(interaction)
  ),
  inProgress: interactions.filter(
    (interaction) =>
      !isStatusTodo(interaction) && !isStatusDone(interaction) && !isReminderOverdue(interaction)
  ),
  completed: interactions.filter((interaction) => isStatusDone(interaction))
});
