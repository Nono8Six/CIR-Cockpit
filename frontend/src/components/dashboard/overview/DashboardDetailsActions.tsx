import { ChevronDown, ThumbsDown, Trophy } from 'lucide-react';

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
  onStageChange: (interaction: Interaction, stage: InteractionStage) => void;
  onRequestLost: (interaction: Interaction) => void;
};

// Actions rapides du dossier depuis le pilotage. Les échéances sont gérées dans Tâches.
const DashboardDetailsActions = ({
  interaction,
  isPending,
  onStageChange,
  onRequestLost
}: DashboardDetailsActionsProps) => {
  const isClosed = interaction.stage === 'won' || interaction.stage === 'lost';

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle bg-surface-1 px-4 py-2.5 sm:px-5"
      data-testid="dashboard-details-actions"
    >
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
