import InteractionCardBody from './interaction-card/InteractionCardBody';
import InteractionCardFamilies from './interaction-card/InteractionCardFamilies';
import InteractionCardFooter from './interaction-card/InteractionCardFooter';
import InteractionCardHeader from './interaction-card/InteractionCardHeader';
import { getInteractionCardState } from './interaction-card/getInteractionCardState';
import type { InteractionCardProps } from './interaction-card/InteractionCard.types';

const InteractionCard = ({ data, statusMeta }: InteractionCardProps) => {
  const { isDone, statusLabel, statusClass } = getInteractionCardState(data, statusMeta);

  return (
    <div className={`p-3 rounded-md shadow-sm border border-slate-200 bg-white hover:shadow-md transition group border-l-[3px] ${statusClass} cursor-pointer hover:border-slate-300 relative`}>
      <InteractionCardHeader data={data} />
      <InteractionCardBody data={data} />
      <InteractionCardFamilies families={data.mega_families} />
      <InteractionCardFooter data={data} isDone={isDone} statusLabel={statusLabel} />
    </div>
  );
};

export default InteractionCard;
