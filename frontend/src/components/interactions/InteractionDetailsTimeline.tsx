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
      return <Clock size={14} className="text-amber-500" />;
    case 'order_ref_change':
      return <Hash size={14} className="text-violet-500" />;
    case 'note':
      return <MessageSquare size={14} className="text-slate-500" />;
    default:
      return <span className="size-2 rounded-full bg-slate-300" />;
  }
};

const InteractionDetailsTimeline = ({ timeline }: InteractionDetailsTimelineProps) => (
  <section className="relative border-l-2 border-slate-100 pl-4">
    <div className="space-y-4 pb-3">
      {timeline.map((event) => (
        <article key={event.id} className="relative pl-3">
          <div className="absolute -left-6 top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white">
            {getEventIcon(event.type)}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">
              {formatDate(event.date)} · {formatTime(event.date)}
              {event.author && (
                <span className="ml-1 text-slate-400">· {event.author}</span>
              )}
            </p>
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                event.type === 'note'
                  ? 'border-blue-100 bg-blue-50/60 text-slate-800'
                  : event.type === 'status_change'
                    ? 'border-slate-200 bg-white text-slate-700'
                    : event.type === 'order_ref_change'
                      ? 'border-violet-100 bg-violet-50/70 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {event.content}
            </p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default InteractionDetailsTimeline;
