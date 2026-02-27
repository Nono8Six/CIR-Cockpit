import InteractionCardBody from './interaction-card/InteractionCardBody';
import InteractionCardFamilies from './interaction-card/InteractionCardFamilies';
import InteractionCardFooter from './interaction-card/InteractionCardFooter';
import InteractionCardHeader from './interaction-card/InteractionCardHeader';
import { getInteractionCardState } from './interaction-card/getInteractionCardState';
import type { InteractionCardProps } from './interaction-card/InteractionCard.types';

const InteractionCard = ({ data, statusMeta }: InteractionCardProps) => {
  const { isDone, isLate, statusTone, statusLabel, statusClass } = getInteractionCardState(
    data,
    statusMeta
  );

  return (
    <article
      className={`group rounded-lg border bg-card p-3 shadow-sm transition hover:shadow-md ${statusClass}`}
    >
      <InteractionCardHeader data={data} />
      <InteractionCardBody data={data} />
      <InteractionCardFamilies families={data.mega_families} />
      <InteractionCardFooter
        data={data}
        isDone={isDone}
        isLate={isLate}
        statusTone={statusTone}
        statusLabel={statusLabel}
      />
    </article>
  );
};

export default InteractionCard;
