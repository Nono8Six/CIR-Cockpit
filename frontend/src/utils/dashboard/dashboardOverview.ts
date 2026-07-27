import { endOfISOWeek, getISOWeek, startOfISOWeek, subDays, subWeeks } from 'date-fns';

import { Channel, type Interaction } from '@/types';
import { isCommercialInteraction } from '@/utils/dashboard/dashboardPipeline';
import { resolveActivityTimestamp, sortInteractionsByLatestActivity } from '@/utils/dashboard/dashboardSort';
import { toDate } from '@/utils/date/toDate';

export type OverviewPeriodKey = '7d' | '30d' | 'quarter';

export const OVERVIEW_PERIODS: Array<{ key: OverviewPeriodKey; label: string; days: number }> = [
  { key: '7d', label: '7 j', days: 7 },
  { key: '30d', label: '30 j', days: 30 },
  { key: 'quarter', label: 'Trim.', days: 91 }
];

export const getOverviewPeriodDays = (period: OverviewPeriodKey): number =>
  OVERVIEW_PERIODS.find((entry) => entry.key === period)?.days ?? 30;

export type WeeklyEvolutionPoint = {
  weekStart: number;
  label: string;
  openPipelineAmount: number;
  openPipelineCount: number;
  wonCumulativeAmount: number;
  openDossiersCount: number;
};

type StatusPredicate = (interaction: Interaction) => boolean;

type BuildWeeklyEvolutionParams = {
  interactions: Interaction[];
  isStatusDone: StatusPredicate;
  weeks?: number;
  now?: Date;
};

const safeTime = (value: string | null | undefined): number => {
  if (!value) {
    return Number.NaN;
  }
  return toDate(value).getTime();
};

// Reconstruction honnete depuis les colonnes datees existantes : l'entree dans le
// pipeline est created_at, la sortie est stage_changed_at pour won/lost et, faute
// d'historique de statuts, updated_at sert de proxy de cloture pour les dossiers
// termines sans etape. A remplacer par l'endpoint d'historique quand il existera.
const resolveClosureTime = (interaction: Interaction, isStatusDone: StatusPredicate): number => {
  if (interaction.stage === 'won' || interaction.stage === 'lost') {
    const stageTime = safeTime(interaction.stage_changed_at);
    return Number.isNaN(stageTime) ? safeTime(interaction.updated_at) : stageTime;
  }

  if (isStatusDone(interaction)) {
    return safeTime(interaction.updated_at);
  }

  return Number.POSITIVE_INFINITY;
};

export const buildWeeklyEvolution = ({
  interactions,
  isStatusDone,
  weeks = 12,
  now = new Date()
}: BuildWeeklyEvolutionParams): WeeklyEvolutionPoint[] => {
  const points: WeeklyEvolutionPoint[] = [];
  const windowStart = startOfISOWeek(subWeeks(now, weeks - 1)).getTime();

  const prepared = interactions.map((interaction) => ({
    interaction,
    createdTime: safeTime(interaction.created_at),
    closureTime: resolveClosureTime(interaction, isStatusDone),
    isCommercial: isCommercialInteraction(interaction),
    amount: interaction.amount ?? 0
  }));

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekReference = subWeeks(now, index);
    const weekStart = startOfISOWeek(weekReference);
    const weekEndTime = Math.min(endOfISOWeek(weekReference).getTime(), now.getTime());

    let openPipelineAmount = 0;
    let openPipelineCount = 0;
    let wonCumulativeAmount = 0;
    let openDossiersCount = 0;

    prepared.forEach(({ interaction, createdTime, closureTime, isCommercial, amount }) => {
      if (Number.isNaN(createdTime) || createdTime > weekEndTime) {
        return;
      }

      const isOpenAtWeekEnd = closureTime > weekEndTime;

      if (isOpenAtWeekEnd) {
        openDossiersCount += 1;
      }

      if (!isCommercial) {
        return;
      }

      // Un dossier aujourd'hui gagne/perdu comptait dans le stock ouvert tant
      // que sa cloture (stage_changed_at) n'etait pas passee.
      if (isOpenAtWeekEnd) {
        openPipelineAmount += amount;
        openPipelineCount += 1;
        return;
      }

      if (
        interaction.stage === 'won'
        && closureTime <= weekEndTime
        && closureTime >= windowStart
      ) {
        wonCumulativeAmount += amount;
      }
    });

    points.push({
      weekStart: weekStart.getTime(),
      label: `S${getISOWeek(weekStart)}`,
      openPipelineAmount,
      openPipelineCount,
      wonCumulativeAmount,
      openDossiersCount
    });
  }

  return points;
};

export type TopClientEntry = {
  key: string;
  name: string;
  amount: number;
  ratio: number;
};

type BuildTopClientsParams = {
  interactions: Interaction[];
  periodDays: number;
  now?: Date;
  limit?: number;
};

export const buildTopClients = ({
  interactions,
  periodDays,
  now = new Date(),
  limit = 5
}: BuildTopClientsParams): TopClientEntry[] => {
  const periodStart = subDays(now, periodDays).getTime();
  const totals = new Map<string, { name: string; amount: number }>();

  interactions.forEach((interaction) => {
    const amount = interaction.amount ?? 0;
    if (amount <= 0 || !isCommercialInteraction(interaction)) {
      return;
    }

    if (resolveActivityTimestamp(interaction) < periodStart) {
      return;
    }

    const key = interaction.entity_id ?? interaction.company_name.trim().toLowerCase();
    const existing = totals.get(key);
    if (existing) {
      existing.amount += amount;
      return;
    }

    totals.set(key, { name: interaction.company_name, amount });
  });

  const ranked = [...totals.entries()]
    .map(([key, entry]) => ({ key, ...entry }))
    .sort((first, second) => second.amount - first.amount)
    .slice(0, limit);

  const topAmount = ranked[0]?.amount ?? 0;

  return ranked.map((entry) => ({
    ...entry,
    ratio: topAmount > 0 ? entry.amount / topAmount : 0
  }));
};

// Anciennete en jours de la relance en retard la plus ancienne (liste triee par rappel croissant).
export const getOldestOverdueDays = (
  overdue: Interaction[],
  now: Date = new Date()
): number | null => {
  const oldest = overdue[0];
  if (!oldest?.reminder_at) {
    return null;
  }

  const reminderTime = toDate(oldest.reminder_at).getTime();
  if (Number.isNaN(reminderTime)) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - reminderTime) / (24 * 60 * 60 * 1000)));
};

export const computeConversionRate = (wonCount: number, lostCount: number): number | null => {
  const total = wonCount + lostCount;
  if (total === 0) {
    return null;
  }

  return Math.round((wonCount / total) * 100);
};

const compactUnitFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const compactIntFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

// Format court pour les KPI : "820 €", "4,8 k€", "342 k€", "1,8 M€".
export const formatCompactEuro = (amount: number): string => {
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000) {
    return `${compactUnitFormatter.format(amount / 1_000_000)} M€`;
  }

  if (absolute >= 10_000) {
    return `${compactIntFormatter.format(amount / 1_000)} k€`;
  }

  if (absolute >= 1_000) {
    return `${compactUnitFormatter.format(amount / 1_000)} k€`;
  }

  return `${compactIntFormatter.format(amount)} €`;
};

export type DossierChannelFilter = 'all' | Channel;

export const DOSSIER_CHANNEL_FILTERS: Array<{ key: DossierChannelFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: Channel.PHONE, label: Channel.PHONE },
  { key: Channel.EMAIL, label: Channel.EMAIL },
  { key: Channel.VISIT, label: Channel.VISIT },
  { key: Channel.COUNTER, label: Channel.COUNTER }
];

type FilterDossiersParams = {
  interactions: Interaction[];
  periodDays: number;
  channel: DossierChannelFilter;
  now?: Date;
};

// Table "Dossiers en cours" : journal borne par la periode (derniere activite)
// et filtrable par canal, trie du plus recent au plus ancien.
export const filterDossiersForTable = ({
  interactions,
  periodDays,
  channel,
  now = new Date()
}: FilterDossiersParams): Interaction[] => {
  const periodStart = subDays(now, periodDays).getTime();

  const withinPeriod = interactions.filter(
    (interaction) => resolveActivityTimestamp(interaction) >= periodStart
  );

  const byChannel =
    channel === 'all'
      ? withinPeriod
      : withinPeriod.filter((interaction) => interaction.channel === channel);

  return sortInteractionsByLatestActivity(byChannel);
};

export const sumClosedAmounts = (
  closed: Interaction[]
): { wonAmount: number; lostAmount: number } =>
  closed.reduce(
    (totals, interaction) => {
      const amount = interaction.amount ?? 0;
      if (interaction.stage === 'won') {
        totals.wonAmount += amount;
      } else if (interaction.stage === 'lost') {
        totals.lostAmount += amount;
      }
      return totals;
    },
    { wonAmount: 0, lostAmount: 0 }
  );
