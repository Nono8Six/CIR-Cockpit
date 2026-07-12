import { useCallback, useMemo, useState } from 'react';

import type { Interaction } from '@/types';
import {
  formatPipelineAmount,
  type PipelineBoard,
  type PipelineMoveTarget
} from '@/utils/dashboard/dashboardPipeline';
import PipelineColumn from './pipeline/PipelineColumn';
import PipelineLostDialog from './pipeline/PipelineLostDialog';
import { PIPELINE_COLUMNS } from './pipeline/pipelineColumnsConfig';

type DashboardPipelineProps = {
  board: PipelineBoard;
  isUpdatePending: boolean;
  onSelectInteraction: (interaction: Interaction) => void;
  onStageChange: (
    interaction: Interaction,
    target: PipelineMoveTarget,
    options?: { lostReason?: string }
  ) => void;
};

const COLUMN_EMPTY_LABELS: Record<string, string> = {
  unqualified: 'Aucun dossier à qualifier.',
  qualification: 'Aucun dossier qualifié.',
  quote_sent: 'Aucun devis envoyé.',
  negotiation: 'Aucune négociation en cours.',
  closed: 'Rien de clôturé sur 30 jours.'
};

const DashboardPipeline = ({
  board,
  isUpdatePending,
  onSelectInteraction,
  onStageChange
}: DashboardPipelineProps) => {
  const [interactionToClose, setInteractionToClose] = useState<Interaction | null>(null);

  const interactionById = useMemo(() => {
    const map = new Map<string, Interaction>();
    PIPELINE_COLUMNS.forEach((column) => {
      board[column.key].forEach((interaction) => map.set(interaction.id, interaction));
    });
    return map;
  }, [board]);

  const handleMoveById = useCallback(
    (interactionId: string, target: PipelineMoveTarget) => {
      const interaction = interactionById.get(interactionId);
      if (interaction) {
        onStageChange(interaction, target);
      }
    },
    [interactionById, onStageChange]
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pt-3 pb-4 px-0.5"
      data-testid="dashboard-pipeline"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Pipeline ouvert</p>
          <p
            className="font-mono text-[22px] font-bold leading-tight tabular-nums text-foreground"
            data-testid="dashboard-pipeline-total"
          >
            {formatPipelineAmount(board.openAmountTotal)}
          </p>
        </div>
        <p className="pb-1 text-xs text-muted-foreground" data-testid="dashboard-pipeline-closed-summary">
          <span className="font-semibold text-success">{board.wonCount30d} gagné{board.wonCount30d > 1 ? 's' : ''}</span>
          {' · '}
          <span className="font-semibold text-destructive">{board.lostCount30d} perdu{board.lostCount30d > 1 ? 's' : ''}</span>
          {' sur 30 jours'}
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {PIPELINE_COLUMNS.map((column) => (
          <PipelineColumn
            key={column.key}
            config={column}
            interactions={board[column.key]}
            amount={column.amountKey ? board.amounts[column.amountKey] : undefined}
            footerLabel={
              column.key === 'closed'
                ? `${board.wonCount30d} / ${board.wonCount30d + board.lostCount30d} gagnés`
                : undefined
            }
            emptyLabel={COLUMN_EMPTY_LABELS[column.key]}
            isUpdatePending={isUpdatePending}
            onSelectInteraction={onSelectInteraction}
            onMoveInteraction={handleMoveById}
            onMoveCard={(interaction, target) => {
              if (target === 'lost') {
                setInteractionToClose(interaction);
                return;
              }
              onStageChange(interaction, target);
            }}
            onRequestClose={setInteractionToClose}
          />
        ))}
      </div>

      <PipelineLostDialog
        key={interactionToClose?.id ?? 'aucun'}
        interaction={interactionToClose}
        isSubmitting={isUpdatePending}
        onCancel={() => setInteractionToClose(null)}
        onConfirm={(interaction, lostReason) => {
          onStageChange(interaction, 'lost', { lostReason });
          setInteractionToClose(null);
        }}
      />
    </div>
  );
};

export default DashboardPipeline;
