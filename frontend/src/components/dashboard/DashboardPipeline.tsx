import { useCallback, useMemo, useState } from 'react';
import { Info } from 'lucide-react';

import type { Interaction } from '@/types';
import type { PipelineBoard, PipelineMoveTarget } from '@/utils/dashboard/dashboardPipeline';
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
  unqualified: 'Aucune nouvelle demande.',
  qualification: 'Aucun dossier en chiffrage.',
  quote_sent: 'Aucun devis envoyé.',
  negotiation: 'Aucune relance en cours.',
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
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pt-4 pb-4 px-0.5"
      data-testid="dashboard-pipeline"
    >
      {board.excludedOpenCount > 0 ? (
        <p
          className="flex items-center gap-1.5 px-1 text-[11.5px] text-muted-foreground"
          data-testid="dashboard-pipeline-excluded"
        >
          <Info size={12} className="shrink-0 text-muted-foreground/70" aria-hidden="true" />
          {board.excludedOpenCount} dossier{board.excludedOpenCount > 1 ? 's' : ''} ouvert
          {board.excludedOpenCount > 1 ? 's' : ''} hors vente (sollicitation, interne, technique) —
          visible{board.excludedOpenCount > 1 ? 's' : ''} dans Ma journée et l&apos;Historique.
        </p>
      ) : null}

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
