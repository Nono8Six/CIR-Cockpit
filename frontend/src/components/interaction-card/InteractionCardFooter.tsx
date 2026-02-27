import { Clock3, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
  <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/70 pt-2">
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {data.reminder_at && (
        <Badge
          variant="outline"
          className={`gap-1 px-1.5 py-0.5 text-xs font-semibold ${
            isBeforeNow(data.reminder_at) && !isDone
              ? 'border-destructive/40 bg-destructive/15 text-destructive'
              : 'border-border bg-surface-1 text-muted-foreground'
          }`}
        >
          <Clock3 size={11} aria-hidden="true" />
          {formatDate(data.reminder_at)}
        </Badge>
      )}
      {data.order_ref && (
        <Badge
          variant="outline"
          className="gap-1 border-border bg-surface-1 px-1.5 py-0.5 font-mono text-xs text-foreground"
        >
          <FileText size={11} aria-hidden="true" />
          #{data.order_ref}
        </Badge>
      )}
    </div>
    <Badge
      variant="outline"
      className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        statusTone === 'done'
          ? 'border-success/40 bg-success/18 text-success'
          : statusTone === 'todo' || isLate
            ? 'border-destructive/40 bg-destructive/15 text-destructive'
            : 'border-warning/40 bg-warning/20 text-warning-foreground'
      }`}
    >
      {statusLabel}
    </Badge>
  </div>
);

export default InteractionCardFooter;
