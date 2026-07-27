import { endOfDay } from 'date-fns';

import type { AgencyStatus, Interaction, StatusCategory } from '@/types';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { toDate } from '@/utils/date/toDate';

const DONE_STATUS_TOKENS = ['termine', 'cloture', 'clos', 'finalise', 'resolu', 'archive'];
const TODO_STATUS_TOKENS = ['a traiter', 'urgent', 'a faire', 'nouveau', 'nouvelle', 'ouverte'];

export type InteractionStatusPredicates = {
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
  isStatusDone: (interaction: Interaction) => boolean;
  isStatusTodo: (interaction: Interaction) => boolean;
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

export type MyDayGroups = {
  overdue: Interaction[];
  dueToday: Interaction[];
  upcoming: Interaction[];
  toPlan: Interaction[];
};

export type MyDayKpis = {
  overdueCount: number;
  dueTodayCount: number;
  openCount: number;
  averageOpenAgeDays: number | null;
};

export type MyDayView = {
  groups: MyDayGroups;
  kpis: MyDayKpis;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const byReminderAsc = (a: Interaction, b: Interaction): number =>
  toDate(a.reminder_at ?? '').getTime() - toDate(b.reminder_at ?? '').getTime();

const byLastActionAsc = (a: Interaction, b: Interaction): number =>
  toDate(a.last_action_at).getTime() - toDate(b.last_action_at).getTime();

// Quatre groupes au vocabulaire simple : relances en retard, a faire aujourd'hui,
// prochaines relances (tout rappel futur), et dossiers "a traiter" sans rappel planifie.
export const buildMyDayView = (
  interactions: Interaction[],
  predicates: Pick<InteractionStatusPredicates, 'isStatusDone' | 'isStatusTodo'>,
  now: Date = new Date()
): MyDayView => {
  const groups: MyDayGroups = { overdue: [], dueToday: [], upcoming: [], toPlan: [] };
  const nowTime = now.getTime();
  const endOfTodayTime = endOfDay(now).getTime();

  let openCount = 0;
  let openAgeTotalMs = 0;

  interactions.forEach((interaction) => {
    if (predicates.isStatusDone(interaction)) {
      return;
    }

    openCount += 1;
    const createdTime = toDate(interaction.created_at).getTime();
    if (!Number.isNaN(createdTime)) {
      openAgeTotalMs += Math.max(0, nowTime - createdTime);
    }

    const reminderTime = interaction.reminder_at ? toDate(interaction.reminder_at).getTime() : Number.NaN;

    if (Number.isNaN(reminderTime)) {
      if (predicates.isStatusTodo(interaction)) {
        groups.toPlan.push(interaction);
      }
      return;
    }

    if (reminderTime < nowTime) {
      groups.overdue.push(interaction);
      return;
    }

    if (reminderTime <= endOfTodayTime) {
      groups.dueToday.push(interaction);
      return;
    }

    groups.upcoming.push(interaction);
  });

  groups.overdue.sort(byReminderAsc);
  groups.dueToday.sort(byReminderAsc);
  groups.upcoming.sort(byReminderAsc);
  groups.toPlan.sort(byLastActionAsc);

  return {
    groups,
    kpis: {
      overdueCount: groups.overdue.length,
      dueTodayCount: groups.dueToday.length,
      openCount,
      averageOpenAgeDays: openCount > 0 ? Math.round(openAgeTotalMs / openCount / DAY_MS) : null
    }
  };
};
