import type { Interaction } from '@/types';
import { formatTime } from '@/utils/date/formatTime';
import { getInteractionChannelIcon } from './getInteractionChannelIcon';

type InteractionCardHeaderProps = {
  data: Interaction;
};

const InteractionCardHeader = ({ data }: InteractionCardHeaderProps) => (
  <div className="flex justify-between items-start mb-2">
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200">
        {getInteractionChannelIcon(data.channel)}
      </span>
      <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={data.company_name}>
        {data.company_name}
      </span>
    </div>
    <span className="text-xs text-slate-400 font-medium">{formatTime(data.created_at)}</span>
  </div>
);

export default InteractionCardHeader;
