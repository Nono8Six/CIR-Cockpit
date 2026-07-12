import { MoveRight, Trophy, XCircle } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/navigation/DropdownMenu';
import type { Interaction } from '@/types';
import {
  formatPipelineAmount,
  getStageAgeDays,
  PIPELINE_STAGNATION_THRESHOLD_DAYS,
  type PipelineMoveTarget
} from '@/utils/dashboard/dashboardPipeline';
import { formatDate } from '@/utils/date/formatDate';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';
import { PIPELINE_DRAG_DATA_TYPE, PIPELINE_MOVE_TARGETS, type PipelineColumnKey } from './pipelineColumnsConfig';

type PipelineCardProps = {
  interaction: Interaction;
  columnKey: PipelineColumnKey;
  isUpdatePending: boolean;
  onSelect: (interaction: Interaction) => void;
  onMove: (interaction: Interaction, target: PipelineMoveTarget) => void;
  onRequestClose: (interaction: Interaction) => void;
};

const buildNextActionLabel = (interaction: Interaction): { label: string; isLate: boolean } => {
  if (!interaction.reminder_at) {
    return { label: 'Aucun rappel', isLate: false };
  }

  if (isBeforeNow(interaction.reminder_at)) {
    return { label: `Relance en retard (${formatDate(interaction.reminder_at)})`, isLate: true };
  }

  return { label: `Rappel le ${formatDate(interaction.reminder_at)}`, isLate: false };
};

const PipelineCard = ({
  interaction,
  columnKey,
  isUpdatePending,
  onSelect,
  onMove,
  onRequestClose
}: PipelineCardProps) => {
  const displayName = getInteractionDisplayName(interaction);
  const isClosed = columnKey === 'closed';
  const ageDays = getStageAgeDays(interaction);
  const isStale = !isClosed && ageDays >= PIPELINE_STAGNATION_THRESHOLD_DAYS;
  const nextAction = buildNextActionLabel(interaction);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isClosed && !isUpdatePending}
      onDragStart={(event) => {
        event.dataTransfer.setData(PIPELINE_DRAG_DATA_TYPE, interaction.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onSelect(interaction)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(interaction);
        }
      }}
      aria-label={`Ouvrir ${displayName}`}
      data-testid={`dashboard-pipeline-card-${interaction.id}`}
      className="group/card cursor-pointer rounded-lg border border-border/80 bg-card px-3 py-2.5 text-left shadow-soft transition-[box-shadow,border-color] duration-150 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[12.5px] font-semibold leading-snug text-foreground">
          {displayName}
        </p>
        {!isClosed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isUpdatePending}
                aria-label={`Déplacer ${displayName} vers une autre étape`}
                onClick={(event) => event.stopPropagation()}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-[opacity,color,background-color] hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100"
              >
                <MoveRight size={13} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {PIPELINE_MOVE_TARGETS.filter(
                (item) => item.target !== (interaction.stage ?? null)
              ).map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(interaction, item.target);
                  }}
                >
                  <MoveRight size={13} className="mr-2 text-muted-foreground" aria-hidden="true" />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-success focus:bg-success/10 focus:text-success"
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(interaction, 'won');
                }}
              >
                <Trophy size={13} className="mr-2" aria-hidden="true" />
                <span>Gagné</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestClose(interaction);
                }}
              >
                <XCircle size={13} className="mr-2" aria-hidden="true" />
                <span>Perdu…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <p className="mt-0.5 font-mono text-[12px] font-bold tabular-nums text-foreground">
        {formatPipelineAmount(interaction.amount)}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{interaction.subject}</p>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-border/70 pt-1.5">
        {isClosed ? (
          <span
            className={`text-[10px] font-semibold ${
              interaction.stage === 'won' ? 'text-success' : 'text-destructive'
            }`}
          >
            {interaction.stage === 'won'
              ? 'Gagné'
              : `Perdu${interaction.lost_reason ? ` · ${interaction.lost_reason}` : ''}`}
          </span>
        ) : (
          <span className={`truncate text-[10px] ${nextAction.isLate ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
            {nextAction.label}
          </span>
        )}
        <span
          title={`Dans l'étape depuis ${ageDays} jour${ageDays > 1 ? 's' : ''}`}
          className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${
            isStale ? 'text-warning-foreground' : 'text-muted-foreground/70'
          }`}
        >
          {isClosed ? formatDate(interaction.stage_changed_at ?? interaction.updated_at) : `${ageDays} j`}
        </span>
      </div>
    </div>
  );
};

export default PipelineCard;
