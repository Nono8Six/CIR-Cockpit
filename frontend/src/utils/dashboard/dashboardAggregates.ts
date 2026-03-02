import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import type { Interaction, StatusCategory } from '@/types';

const DONE_STATUS_TOKENS = ['termine', 'cloture', 'clos', 'finalise', 'resolu', 'archive'];
const TODO_STATUS_TOKENS = ['a traiter', 'urgent', 'a faire', 'nouveau', 'nouvelle', 'ouverte'];

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
