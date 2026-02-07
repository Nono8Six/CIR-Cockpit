import { Clock, FileText } from 'lucide-react';

import type { Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

type InteractionCardFooterProps = {
  data: Interaction;
  isDone: boolean;
  statusLabel: string;
};

const InteractionCardFooter = ({ data, isDone, statusLabel }: InteractionCardFooterProps) => (
  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
    <div className="flex items-center gap-2">
      {data.reminder_at && (
        <span
          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isBeforeNow(data.reminder_at) && !isDone
              ? 'bg-red-50 text-red-600'
              : 'bg-slate-50 text-slate-500'
          }`}
        >
          <Clock size={10} />
          {formatDate(data.reminder_at)}
        </span>
      )}
      {data.order_ref && (
        <span className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
          <FileText size={10} />#{data.order_ref}
        </span>
      )}
    </div>

    <span className="text-[9px] text-slate-400 uppercase font-bold">{statusLabel}</span>
  </div>
);

export default InteractionCardFooter;
