import { endOfDay, endOfISOWeek, getISOWeek, startOfISOWeek, subDays, subWeeks } from 'date-fns';

import { Channel, type Interaction } from '@/types';
import { isCommercialInteraction } from '@/utils/dashboard/dashboardPipeline';
import { resolveActivityTimestamp } from '@/utils/dashboard/dashboardSort';
import { toDate } from '@/utils/date/toDate';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';

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

// Une semaine ne compte comme point reel que si elle porte un montant sur l'une des
// deux series tracees. Les semaines a zero sont un remplissage, pas une courbe.
export const EVOLUTION_MIN_POINTS = 8;

export const countRealEvolutionPoints = (points: WeeklyEvolutionPoint[]): number =>
  points.filter(
    (point) => point.openPipelineAmount > 0 || point.wonCumulativeAmount > 0
  ).length;

// Une serie constante repetee sur douze semaines n'est pas une courbe : c'est un seul
// fait duplique. Il faut donc aussi de la variation pour qu'un trace informe.
export const EVOLUTION_MIN_DISTINCT_VALUES = 3;

export const countDistinctEvolutionValues = (points: WeeklyEvolutionPoint[]): number => {
  const values = new Set<number>();
  points.forEach((point) => {
    values.add(point.openPipelineAmount);
    values.add(point.wonCumulativeAmount);
  });
  return values.size;
};

export const hasEnoughEvolutionPoints = (points: WeeklyEvolutionPoint[]): boolean =>
  countRealEvolutionPoints(points) >= EVOLUTION_MIN_POINTS
  && countDistinctEvolutionValues(points) >= EVOLUTION_MIN_DISTINCT_VALUES;

export type OpenDossiersDelta = {
  value: number;
  label: string;
};

// Substitut chiffre de la courbe quand la serie est trop courte : variation du
// stock ouvert entre la semaine courante et celle de `weeksBack` semaines avant.
export const buildOpenDossiersDelta = (
  points: WeeklyEvolutionPoint[],
  weeksBack = 4
): OpenDossiersDelta | null => {
  if (points.length < weeksBack + 1) {
    return null;
  }

  const current = points[points.length - 1].openDossiersCount;
  const previous = points[points.length - 1 - weeksBack].openDossiersCount;
  const value = current - previous;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const magnitude = Math.abs(value);
  const noun = magnitude > 1 ? 'dossiers' : 'dossier';

  return {
    value,
    label:
      value === 0
        ? `stable sur ${weeksBack} sem.`
        : `${sign}${magnitude} ${noun} sur ${weeksBack} sem.`
  };
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

export type DossierScopeFilter = 'open' | 'period';

export const DOSSIER_SCOPE_FILTERS: Array<{ key: DossierScopeFilter; label: string }> = [
  { key: 'open', label: 'À traiter' },
  { key: 'period', label: 'Toute la période' }
];

export type DossierUrgency = 'overdue' | 'today' | 'upcoming' | 'unplanned' | 'closed';

const URGENCY_RANK: Record<DossierUrgency, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  unplanned: 3,
  closed: 4
};

const STAGE_RANK: Record<string, number> = {
  unqualified: 0,
  qualification: 1,
  quote_sent: 2,
  negotiation: 3,
  won: 4,
  lost: 5
};

export type DossierRow = {
  interaction: Interaction;
  displayName: string;
  urgency: DossierUrgency;
  dueTime: number | null;
  lateDays: number | null;
  isOpen: boolean;
  activityTime: number;
  amount: number | null;
  stageRank: number;
};

export type DossierSortKey = 'priority' | 'client' | 'stage' | 'amount' | 'activity';
export type DossierSortDirection = 'asc' | 'desc';

export type DossierSort = {
  key: DossierSortKey;
  direction: DossierSortDirection;
};

export const DEFAULT_DOSSIER_SORT: DossierSort = { key: 'priority', direction: 'asc' };

// Sens naturel d'une colonne au premier clic : la priorite et le client se lisent
// du plus urgent / de A a Z, le montant et l'activite du plus grand au plus recent.
export const getDefaultSortDirection = (key: DossierSortKey): DossierSortDirection =>
  key === 'priority' || key === 'client' ? 'asc' : 'desc';

const DAY_MS = 24 * 60 * 60 * 1000;

type BuildDossierRowsParams = {
  interactions: Interaction[];
  isStatusDone: (interaction: Interaction) => boolean;
  now?: Date;
};

// Modele unique de la page : un dossier produit une ligne et une seule, portant
// a la fois son urgence (ex-file de priorite), son etape (ex-pipeline) et son
// montant (ex-top clients).
export const buildDossierRows = ({
  interactions,
  isStatusDone,
  now = new Date()
}: BuildDossierRowsParams): DossierRow[] => {
  const nowTime = now.getTime();
  const endOfTodayTime = endOfDay(now).getTime();

  return interactions.map((interaction) => {
    const stage = interaction.stage ?? null;
    const isClosed = stage === 'won' || stage === 'lost' || isStatusDone(interaction);
    const reminderTime = interaction.reminder_at
      ? toDate(interaction.reminder_at).getTime()
      : Number.NaN;
    const hasReminder = !Number.isNaN(reminderTime);

    let urgency: DossierUrgency;
    if (isClosed) {
      urgency = 'closed';
    } else if (!hasReminder) {
      urgency = 'unplanned';
    } else if (reminderTime < nowTime) {
      urgency = 'overdue';
    } else if (reminderTime <= endOfTodayTime) {
      urgency = 'today';
    } else {
      urgency = 'upcoming';
    }

    return {
      interaction,
      displayName: getInteractionDisplayName(interaction),
      urgency,
      dueTime: hasReminder ? reminderTime : null,
      lateDays:
        urgency === 'overdue' ? Math.floor((nowTime - reminderTime) / DAY_MS) : null,
      isOpen: !isClosed,
      activityTime: resolveActivityTimestamp(interaction),
      amount: interaction.amount ?? null,
      stageRank: STAGE_RANK[stage ?? 'unqualified'] ?? 0
    };
  });
};

const compareByPriority = (first: DossierRow, second: DossierRow): number => {
  const rankDelta = URGENCY_RANK[first.urgency] - URGENCY_RANK[second.urgency];
  if (rankDelta !== 0) {
    return rankDelta;
  }

  if (first.dueTime !== null && second.dueTime !== null) {
    return first.dueTime - second.dueTime;
  }

  // Sans echeance, le dossier laisse sans nouvelle depuis le plus longtemps passe devant ;
  // les dossiers clos se lisent au contraire du plus recent au plus ancien.
  return first.urgency === 'closed'
    ? second.activityTime - first.activityTime
    : first.activityTime - second.activityTime;
};

const compareByAmount = (first: DossierRow, second: DossierRow): number => {
  if (first.amount === null) {
    return second.amount === null ? 0 : 1;
  }
  if (second.amount === null) {
    return -1;
  }
  return second.amount - first.amount;
};

const COMPARATORS: Record<DossierSortKey, (first: DossierRow, second: DossierRow) => number> = {
  priority: compareByPriority,
  client: (first, second) => first.displayName.localeCompare(second.displayName, 'fr'),
  stage: (first, second) => first.stageRank - second.stageRank || compareByPriority(first, second),
  amount: (first, second) => compareByAmount(first, second) || compareByPriority(first, second),
  activity: (first, second) => second.activityTime - first.activityTime
};

export const sortDossierRows = (rows: DossierRow[], sort: DossierSort): DossierRow[] => {
  const comparator = COMPARATORS[sort.key];
  const reversed = sort.direction !== getDefaultSortDirection(sort.key);
  return [...rows].sort((first, second) => {
    const result = comparator(first, second);
    return reversed ? -result : result;
  });
};

type SelectDossierRowsParams = {
  rows: DossierRow[];
  scope: DossierScopeFilter;
  channel: DossierChannelFilter;
  periodDays: number;
  sort: DossierSort;
  now?: Date;
};

// "À traiter" ne garde que les dossiers ouverts ; "Toute la période" y ajoute les
// dossiers clos dont la derniere activite tombe dans la fenetre choisie.
export const selectDossierRows = ({
  rows,
  scope,
  channel,
  periodDays,
  sort,
  now = new Date()
}: SelectDossierRowsParams): DossierRow[] => {
  const periodStart = subDays(now, periodDays).getTime();

  const inScope = rows.filter((row) =>
    scope === 'open' ? row.isOpen : row.isOpen || row.activityTime >= periodStart
  );

  const byChannel =
    channel === 'all'
      ? inScope
      : inScope.filter((row) => row.interaction.channel === channel);

  return sortDossierRows(byChannel, sort);
};

// Un libelle raccourci ne doit pas se terminer sur un mot-outil : « Attente elements du… »
// se lit comme une troncature ratee la ou « Attente elements… » se lit comme un resume.
const TRAILING_STOP_WORDS = /\s+(de|du|des|la|le|les|un|une|au|aux|a|en|et|pour|sur|par|avec|sans)$/i;

// Les libelles de statut agence sont libres : on les raccourcit a la source sur une
// frontiere de mot pour qu'aucun badge ne soit coupe en plein milieu.
export const shortenBadgeLabel = (label: string, maxLength = 24): string => {
  const trimmed = label.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  let kept = lastSpace > maxLength * 0.5 ? cut.slice(0, lastSpace) : cut;

  let previous = '';
  while (previous !== kept) {
    previous = kept;
    kept = kept.replace(TRAILING_STOP_WORDS, '');
  }

  return `${kept.replace(/[\s,;:.]+$/, '')}…`;
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
