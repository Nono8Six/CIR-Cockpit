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
  <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-2">
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {data.reminder_at && (
        <Badge
          variant="outline"
          className={`gap-1 px-1.5 py-0.5 text-xs font-semibold ${
            isBeforeNow(data.reminder_at) && !isDone
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <Clock3 size={11} aria-hidden="true" />
          {formatDate(data.reminder_at)}
        </Badge>
      )}
      {data.order_ref && (
        <Badge
          variant="outline"
          className="gap-1 border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-700"
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
          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
          : statusTone === 'todo' || isLate
            ? 'border-red-300 bg-red-100 text-red-800'
            : 'border-amber-300 bg-amber-100 text-amber-800'
      }`}
    >
      {statusLabel}
    </Badge>
  </div>
);

export default InteractionCardFooter;
