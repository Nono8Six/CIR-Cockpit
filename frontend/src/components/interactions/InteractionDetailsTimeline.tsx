import { ArrowRight, CheckCircle2, Clock, Hash, MessageSquare } from 'lucide-react';

import type { TimelineEvent } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';

type InteractionDetailsTimelineProps = {
  timeline: TimelineEvent[];
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'creation':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'status_change':
      return <ArrowRight size={14} className="text-blue-500" />;
    case 'reminder_change':
      return <Clock size={14} className="text-orange-500" />;
    case 'order_ref_change':
      return <Hash size={14} className="text-purple-500" />;
    case 'note':
      return <MessageSquare size={14} className="text-slate-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-slate-300" />;
  }
};

const InteractionDetailsTimeline = ({ timeline }: InteractionDetailsTimelineProps) => (
  <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
    {timeline.map((event) => (
      <div key={event.id} className="relative pl-8 group">
        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
          {getEventIcon(event.type)}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              {formatDate(event.date)} <span className="font-normal opacity-75">{formatTime(event.date)}</span>
            </span>
            {event.author ? (
              <>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] font-medium text-slate-400">{event.author}</span>
              </>
            ) : null}
          </div>
          <div className={`text-sm ${
            event.type === 'note'
              ? 'text-slate-800 bg-blue-50/50 p-3 rounded-md border border-blue-50'
              : event.type === 'status_change'
                ? 'text-slate-600 italic'
                : event.type === 'order_ref_change'
                  ? 'text-purple-700 font-medium bg-purple-50 p-2 rounded border border-purple-100'
                  : 'text-slate-600'
          }`}>
            {event.content}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default InteractionDetailsTimeline;
