import { useState } from 'react';

import type { Interaction } from '@/types';
import { formatPipelineAmount, type PipelineMoveTarget } from '@/utils/dashboard/dashboardPipeline';
import PipelineCard from './PipelineCard';
import { PIPELINE_DRAG_DATA_TYPE, type PipelineColumnConfig } from './pipelineColumnsConfig';

type PipelineColumnProps = {
  config: PipelineColumnConfig;
  interactions: Interaction[];
  amount?: number;
  footerLabel?: string;
  emptyLabel: string;
  isUpdatePending: boolean;
  onSelectInteraction: (interaction: Interaction) => void;
  onMoveInteraction: (interactionId: string, target: PipelineMoveTarget) => void;
  onMoveCard: (interaction: Interaction, target: PipelineMoveTarget) => void;
  onRequestClose: (interaction: Interaction) => void;
};

const PipelineColumn = ({
  config,
  interactions,
  amount,
  footerLabel,
  emptyLabel,
  isUpdatePending,
  onSelectInteraction,
  onMoveInteraction,
  onMoveCard,
  onRequestClose
}: PipelineColumnProps) => {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const acceptsDrop = config.dropTarget !== undefined;

  return (
    <section
      aria-label={config.label}
      data-testid={`dashboard-pipeline-column-${config.key}`}
      onDragOver={(event) => {
        if (!acceptsDrop || !event.dataTransfer.types.includes(PIPELINE_DRAG_DATA_TYPE)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(event) => {
        setIsDropTarget(false);
        if (!acceptsDrop) {
          return;
        }
        const interactionId = event.dataTransfer.getData(PIPELINE_DRAG_DATA_TYPE);
        if (!interactionId) {
          return;
        }
        event.preventDefault();
        onMoveInteraction(interactionId, config.dropTarget ?? null);
      }}
      className={`flex min-h-[18rem] min-w-0 flex-col rounded-xl border bg-surface-2/50 p-2.5 transition-colors duration-150 ${
        isDropTarget ? 'border-primary/50 bg-primary/5' : 'border-border-subtle'
      }`}
    >
      <header className="mb-2 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex min-w-0 items-baseline gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="truncate">{config.label}</span>
            <span className="font-mono text-[10px] font-medium tabular-nums text-muted-foreground/60">
              {interactions.length}
            </span>
          </h3>
        </div>
        <p className="mt-0.5 font-mono text-[13px] font-bold leading-tight tabular-nums text-foreground">
          {footerLabel ?? formatPipelineAmount(amount ?? 0)}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {interactions.map((interaction) => (
          <PipelineCard
            key={interaction.id}
            interaction={interaction}
            columnKey={config.key}
            isUpdatePending={isUpdatePending}
            onSelect={onSelectInteraction}
            onMove={onMoveCard}
            onRequestClose={onRequestClose}
          />
        ))}
        {interactions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-3 py-8 text-center">
            <p className="text-[11px] font-medium text-muted-foreground/80">{emptyLabel}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PipelineColumn;
