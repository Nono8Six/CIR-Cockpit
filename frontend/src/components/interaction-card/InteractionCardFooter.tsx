import { Calendar, FileText } from 'lucide-react';

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

/**
 * Footer section of the InteractionCard.
 * Displays date reminders (as plain text next to a calendar icon), work order references,
 * and Linear-style status badges with an inner glowing dot indicator.
 * 
 * @param {InteractionCardFooterProps} props - The component props.
 * @returns {React.JSX.Element} The rendered card footer.
 */
const InteractionCardFooter = ({
  data,
  isDone,
  isLate,
  statusTone,
  statusLabel
}: InteractionCardFooterProps) => {
  const reminderLate = data.reminder_at ? isBeforeNow(data.reminder_at) && !isDone : false;

  const statusBadgeStyle =
    statusTone === 'done'
      ? 'border-success/35 bg-success/5 text-success/95 hover:bg-success/10'
      : statusTone === 'todo' || isLate
        ? 'border-destructive/35 bg-destructive/5 text-destructive hover:bg-destructive/10'
        : 'border-warning/35 bg-warning/5 text-warning-foreground hover:bg-warning/10';

  const statusDotStyle =
    statusTone === 'done'
      ? 'bg-success'
      : statusTone === 'todo' || isLate
        ? 'bg-destructive'
        : 'bg-warning';

  return (
    <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border/40 pt-3 select-none">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {data.reminder_at && (
          <div
            className={`flex items-center gap-1.5 font-sans text-[11px] font-semibold tabular-nums transition-colors ${
              reminderLate
                ? 'text-destructive font-bold'
                : 'text-muted-foreground/80'
            }`}
          >
            <Calendar size={13} className="shrink-0 opacity-80" aria-hidden="true" />
            <span>{formatDate(data.reminder_at)}</span>
          </div>
        )}
        {data.order_ref && (
          <Badge
            variant="outline"
            className="rounded-full gap-1 border-border/80 bg-surface-2/50 px-2 py-0.5 font-sans text-[9px] font-bold tabular-nums text-foreground/75 hover:bg-surface-2 transition-colors"
          >
            <FileText size={9.5} className="opacity-60" aria-hidden="true" />
            #{data.order_ref}
          </Badge>
        )}
      </div>
      <Badge
        variant="outline"
        className={`rounded-full gap-1.5 px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider transition-colors ${statusBadgeStyle}`}
      >
        <span className={`size-1.5 rounded-full ${statusDotStyle}`} aria-hidden="true" />
        <span>{statusLabel}</span>
      </Badge>
    </div>
  );
};

export default InteractionCardFooter;
