import type { InteractionStage } from '../../../../shared/schemas/interaction/stages.schema';
import type { Interaction } from '@/types';
import { toDate } from '@/utils/date/toDate';

export type PipelineMoveTarget = InteractionStage | null;

export type PipelineBoard = {
  unqualified: Interaction[];
  qualification: Interaction[];
  quote_sent: Interaction[];
  negotiation: Interaction[];
  closed: Interaction[];
  amounts: {
    unqualified: number;
    qualification: number;
    quote_sent: number;
    negotiation: number;
  };
  openAmountTotal: number;
  wonCount30d: number;
  lostCount30d: number;
  // Dossiers ouverts non commerciaux (sollicitations, interne, technique) tenus hors pipeline.
  excludedOpenCount: number;
};

export const PIPELINE_STAGE_LABELS: Record<'unqualified' | InteractionStage, string> = {
  unqualified: 'Nouvelles demandes',
  qualification: 'En chiffrage',
  quote_sent: 'Devis envoyé',
  negotiation: 'Relance & négociation',
  won: 'Gagné',
  lost: 'Perdu'
};

// Un dossier est commercial s'il porte deja une etape ou un montant, ou si son type
// d'interaction traduit une demande de vente (devis, prix, commande, chiffrage, offre).
const COMMERCIAL_TYPE_PATTERN = /devis|prix|commande|chiffrage|offre/i;

export const isCommercialInteraction = (interaction: Interaction): boolean =>
  (interaction.stage ?? null) !== null
  || (interaction.amount ?? null) !== null
  || COMMERCIAL_TYPE_PATTERN.test(interaction.interaction_type ?? '');

export const getPipelineStageLabel = (stage: string | null | undefined): string => {
  if (!stage) {
    return PIPELINE_STAGE_LABELS.unqualified;
  }

  return PIPELINE_STAGE_LABELS[stage as InteractionStage] ?? PIPELINE_STAGE_LABELS.unqualified;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_WINDOW_MS = 30 * DAY_MS;

export const PIPELINE_STAGNATION_THRESHOLD_DAYS = 14;

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

export const formatPipelineAmount = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? '—' : euroFormatter.format(amount);

// Age dans l'etape : depuis le dernier changement d'etape, sinon depuis la creation.
export const getStageAgeDays = (interaction: Interaction, now: Date = new Date()): number => {
  const referenceTime = toDate(interaction.stage_changed_at ?? interaction.created_at).getTime();
  if (Number.isNaN(referenceTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - referenceTime) / DAY_MS));
};

const byStageAgeDesc = (now: Date) => (a: Interaction, b: Interaction): number =>
  getStageAgeDays(b, now) - getStageAgeDays(a, now);

const byClosedAtDesc = (a: Interaction, b: Interaction): number =>
  toDate(b.stage_changed_at ?? b.updated_at).getTime() - toDate(a.stage_changed_at ?? a.updated_at).getTime();

const sumAmounts = (interactions: Interaction[]): number =>
  interactions.reduce((total, interaction) => total + (interaction.amount ?? 0), 0);

type BuildPipelineBoardParams = {
  interactions: Interaction[];
  isStatusDone: (interaction: Interaction) => boolean;
  now?: Date;
};

// Le pipeline est un stock : pas de filtre temporel, sauf la colonne Cloture
// qui ne garde que les 30 derniers jours pour rester lisible.
export const buildPipelineBoard = ({
  interactions,
  isStatusDone,
  now = new Date()
}: BuildPipelineBoardParams): PipelineBoard => {
  const board: Pick<PipelineBoard, 'unqualified' | 'qualification' | 'quote_sent' | 'negotiation' | 'closed'> = {
    unqualified: [],
    qualification: [],
    quote_sent: [],
    negotiation: [],
    closed: []
  };
  let wonCount30d = 0;
  let lostCount30d = 0;
  let excludedOpenCount = 0;
  const closedWindowStart = now.getTime() - CLOSED_WINDOW_MS;

  interactions.forEach((interaction) => {
    if (!isCommercialInteraction(interaction)) {
      if (!isStatusDone(interaction)) {
        excludedOpenCount += 1;
      }
      return;
    }

    const stage = interaction.stage;

    if (stage === 'won' || stage === 'lost') {
      const closedTime = toDate(interaction.stage_changed_at ?? interaction.updated_at).getTime();
      if (!Number.isNaN(closedTime) && closedTime >= closedWindowStart) {
        board.closed.push(interaction);
        if (stage === 'won') {
          wonCount30d += 1;
        } else {
          lostCount30d += 1;
        }
      }
      return;
    }

    if (stage === 'qualification' || stage === 'quote_sent' || stage === 'negotiation') {
      board[stage].push(interaction);
      return;
    }

    if (!isStatusDone(interaction)) {
      board.unqualified.push(interaction);
    }
  });

  const stageSort = byStageAgeDesc(now);
  board.unqualified.sort(stageSort);
  board.qualification.sort(stageSort);
  board.quote_sent.sort(stageSort);
  board.negotiation.sort(stageSort);
  board.closed.sort(byClosedAtDesc);

  const amounts = {
    unqualified: sumAmounts(board.unqualified),
    qualification: sumAmounts(board.qualification),
    quote_sent: sumAmounts(board.quote_sent),
    negotiation: sumAmounts(board.negotiation)
  };

  return {
    ...board,
    amounts,
    openAmountTotal:
      amounts.unqualified + amounts.qualification + amounts.quote_sent + amounts.negotiation,
    wonCount30d,
    lostCount30d,
    excludedOpenCount
  };
};
