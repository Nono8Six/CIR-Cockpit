import type { Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import { getInteractionChannelIcon } from './getInteractionChannelIcon';

type InteractionCardHeaderProps = {
  data: Interaction;
};

const InteractionCardHeader = ({ data }: InteractionCardHeaderProps) => (
  <div className="mb-2 flex items-start justify-between gap-2">
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        {getInteractionChannelIcon(data.channel)}
      </span>
      <span
        className="truncate text-sm font-semibold text-foreground"
        title={data.company_name}
      >
        {data.company_name}
      </span>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium text-muted-foreground">{formatDate(data.last_action_at)}</p>
      <p className="text-xs text-muted-foreground">{formatTime(data.last_action_at)}</p>
    </div>
  </div>
);

export default InteractionCardHeader;
