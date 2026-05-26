import { Trash2 } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';
import type { Interaction, StatusCategory } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import { getInteractionChannelIcon } from './InteractionChannelIcon';

type InteractionCardHeaderProps = {
  data: Interaction;
  statusTone?: StatusCategory;
  onDeleteInteraction?: (interaction: Interaction) => void;
};

const InteractionCardHeader = ({ data, statusTone, onDeleteInteraction }: InteractionCardHeaderProps) => {
  const statusDotClass =
    statusTone === 'done'
      ? 'bg-success'
      : statusTone === 'todo'
        ? 'bg-destructive'
        : 'bg-warning';

  return (
    <div className="mb-1.5 flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border/40 bg-muted/40 text-muted-foreground/80">
          {getInteractionChannelIcon(data.channel)}
        </span>
        <span
          className="truncate text-xs font-semibold text-foreground/90 tracking-tight"
          title={data.company_name}
        >
          {data.company_name}
        </span>
        {statusTone && (
          <span className={`size-1.5 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <div className="flex items-center justify-end h-4">
          {onDeleteInteraction ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-destructive/80 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDeleteInteraction(data);
              }}
              aria-label={`Supprimer ${data.company_name}`}
            >
              <Trash2 size={12} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <p className="font-mono text-[9px] font-medium text-muted-foreground/80 tabular-nums">{formatDate(data.last_action_at)}</p>
        <p className="font-mono text-[8px] text-muted-foreground/60 tabular-nums">{formatTime(data.last_action_at)}</p>
      </div>
    </div>
  );
};

export default InteractionCardHeader;
