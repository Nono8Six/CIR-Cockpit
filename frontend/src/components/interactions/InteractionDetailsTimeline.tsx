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
      return <CheckCircle2 size={14} className="text-success/90" />;
    case 'status_change':
      return <ArrowRight size={14} className="text-primary" />;
    case 'reminder_change':
      return <Clock size={14} className="text-warning" />;
    case 'order_ref_change':
      return <Hash size={14} className="text-warning-foreground" />;
    case 'note':
      return <MessageSquare size={14} className="text-muted-foreground" />;
    default:
      return <span className="size-2 rounded-full bg-muted" />;
  }
};

const InteractionDetailsTimeline = ({ timeline }: InteractionDetailsTimelineProps) => (
  <section className="relative border-l-2 border-border/70 pl-4">
    <div className="space-y-4 pb-3">
      {timeline.map((event) => (
        <article key={event.id} className="relative pl-3">
          <div className="absolute -left-6 top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-card">
            {getEventIcon(event.type)}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {formatDate(event.date)} · {formatTime(event.date)}
              {event.author && (
                <span className="ml-1 text-muted-foreground/80">· {event.author}</span>
              )}
            </p>
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                event.type === 'note'
                  ? 'border-primary/25 bg-primary/10 text-foreground'
                  : event.type === 'status_change'
                    ? 'border-border bg-card text-foreground'
                    : event.type === 'order_ref_change'
                      ? 'border-warning/25 bg-warning/15 text-warning-foreground'
                      : 'border-border bg-card text-muted-foreground'
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
