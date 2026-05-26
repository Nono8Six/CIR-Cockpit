import { Clock3, FileText } from 'lucide-react';

import { Badge } from '../ui/data-display/Badge';
import type { Interaction, StatusCategory } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

type InteractionCardFooterProps = {
  data: Interaction;
  isDone: boolean;
  isLate: boolean;
  statusTone: StatusCategory;
  statusLabel: string;
};

const InteractionCardFooter = ({
  data,
  isDone,
  isLate,
  statusTone,
  statusLabel
}: InteractionCardFooterProps) => (
  <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/15 pt-1.5 select-none">
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {data.reminder_at && (
        <Badge
          variant="outline"
          className={`gap-1 px-1.5 py-0.5 font-mono text-[9px] font-medium tabular-nums ${
            isBeforeNow(data.reminder_at) && !isDone
              ? 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/5'
              : 'border-border/40 bg-muted/40 text-muted-foreground/80 hover:bg-muted/40'
          }`}
        >
          <Clock3 size={9} className="opacity-70" aria-hidden="true" />
          {formatDate(data.reminder_at)}
        </Badge>
      )}
      {data.order_ref && (
        <Badge
          variant="outline"
          className="gap-1 border-border/40 bg-muted/45 px-1.5 py-0.5 font-mono text-[9px] font-medium tabular-nums text-foreground/85 hover:bg-muted/45"
        >
          <FileText size={9} className="opacity-60" aria-hidden="true" />
          #{data.order_ref}
        </Badge>
      )}
    </div>
    <Badge
      variant="outline"
      className={`px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider ${
        statusTone === 'done'
          ? 'border-success/20 bg-success/5 text-success/80 hover:bg-success/5'
          : statusTone === 'todo' || isLate
            ? 'border-destructive/20 bg-destructive/5 text-destructive/80 hover:bg-destructive/5'
            : 'border-warning/30 bg-warning/5 text-warning-foreground hover:bg-warning/5'
      }`}
    >
      {statusLabel}
    </Badge>
  </div>
);

export default InteractionCardFooter;
