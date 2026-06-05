import InteractionCardBody from './interaction-card/InteractionCardBody';
import InteractionCardFamilies from './interaction-card/InteractionCardFamilies';
import InteractionCardFooter from './interaction-card/InteractionCardFooter';
import InteractionCardHeader from './interaction-card/InteractionCardHeader';
import { getInteractionCardState } from './interaction-card/getInteractionCardState';
import type { InteractionCardProps } from './interaction-card/InteractionCard.types';

/**
 * Premium Kanban board interaction card component.
 * Features a modern hover-lift effect, custom action items, and clear status tones.
 * 
 * @param {InteractionCardProps} props - The component props.
 * @returns {React.JSX.Element} The rendered interaction card.
 */
const InteractionCard = ({ data, statusMeta, onDeleteInteraction, onSelectInteraction }: InteractionCardProps) => {
  const { isDone, isLate, statusTone, statusLabel } = getInteractionCardState(
    data,
    statusMeta
  );

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-md hover:border-border"
    >
      <InteractionCardHeader
        data={data}
        statusTone={statusTone}
        onDeleteInteraction={onDeleteInteraction}
        onSelectInteraction={onSelectInteraction}
      />
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
