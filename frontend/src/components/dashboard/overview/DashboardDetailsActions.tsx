import { Check, ChevronDown, ThumbsDown, Trophy } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/navigation/DropdownMenu';
import { cn } from '@/lib/utils';
import type { Interaction } from '@/types';
import type { InteractionStage } from '../../../../../shared/schemas/interaction/stages.schema';
import { PIPELINE_STAGE_LABELS } from '@/utils/dashboard/dashboardPipeline';

const OPEN_STAGES: InteractionStage[] = ['qualification', 'quote_sent', 'negotiation'];

const secondaryButtonClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50';

type DashboardDetailsActionsProps = {
  interaction: Interaction;
  isPending: boolean;
  onCompleteReminder: (interaction: Interaction) => void;
  onPostponeReminder: (interaction: Interaction, daysAhead: number) => void;
  onStageChange: (interaction: Interaction, stage: InteractionStage) => void;
  onRequestLost: (interaction: Interaction) => void;
};

// Actions rapides du dossier depuis le pilotage : relance et etape pipeline.
const DashboardDetailsActions = ({
  interaction,
  isPending,
  onCompleteReminder,
  onPostponeReminder,
  onStageChange,
  onRequestLost
}: DashboardDetailsActionsProps) => {
  const isClosed = interaction.stage === 'won' || interaction.stage === 'lost';

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle bg-surface-1 px-4 py-2.5 sm:px-5"
      data-testid="dashboard-details-actions"
    >
      {interaction.reminder_at ? (
        <button
          type="button"
          disabled={isPending}
          title="Relance faite : efface le rappel et journalise l'action"
          onClick={() => onCompleteReminder(interaction)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check size={13} strokeWidth={3} aria-hidden="true" />
          Relance faite
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        title="Rappel dans 2 jours à 09:00"
        onClick={() => onPostponeReminder(interaction, 2)}
        className={secondaryButtonClass}
      >
        {interaction.reminder_at ? 'Reporter +2 j' : 'Planifier +2 j'}
      </button>
      <button
        type="button"
        disabled={isPending}
        title="Rappel dans 1 semaine à 09:00"
        onClick={() => onPostponeReminder(interaction, 7)}
        className={secondaryButtonClass}
      >
        +1 sem
      </button>

      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          className={cn(secondaryButtonClass, 'gap-1')}
          data-testid="dashboard-details-stage-trigger"
        >
          {interaction.stage
            ? `Étape : ${PIPELINE_STAGE_LABELS[interaction.stage as InteractionStage] ?? interaction.stage}`
            : "Changer d'étape"}
          <ChevronDown size={12} className="text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {OPEN_STAGES.map((stage) => (
            <DropdownMenuItem
              key={stage}
              disabled={interaction.stage === stage}
              onSelect={() => onStageChange(interaction, stage)}
            >
              {PIPELINE_STAGE_LABELS[stage]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {!isClosed ? (
        <>
          <button
            type="button"
            disabled={isPending}
            title="Clôturer le dossier comme gagné"
            onClick={() => onStageChange(interaction, 'won')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/30 bg-card px-2.5 text-xs font-semibold text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trophy size={12} aria-hidden="true" />
            Gagné
          </button>
          <button
            type="button"
            disabled={isPending}
            title="Clôturer le dossier comme perdu (motif demandé)"
            onClick={() => onRequestLost(interaction)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/25 bg-card px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
          >
            <ThumbsDown size={12} aria-hidden="true" />
            Perdu
          </button>
        </>
      ) : null}
    </div>
  );
};

export default DashboardDetailsActions;
