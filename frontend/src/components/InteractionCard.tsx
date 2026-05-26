import InteractionCardBody from './interaction-card/InteractionCardBody';
import InteractionCardFamilies from './interaction-card/InteractionCardFamilies';
import InteractionCardFooter from './interaction-card/InteractionCardFooter';
import InteractionCardHeader from './interaction-card/InteractionCardHeader';
import { getInteractionCardState } from './interaction-card/getInteractionCardState';
import type { InteractionCardProps } from './interaction-card/InteractionCard.types';

const InteractionCard = ({ data, statusMeta, onDeleteInteraction }: InteractionCardProps) => {
  const { isDone, isLate, statusTone, statusLabel } = getInteractionCardState(
    data,
    statusMeta
  );

  const accentColor =
    statusTone === 'done'
      ? 'border-l-success'
      : statusTone === 'todo'
        ? 'border-l-primary'
        : 'border-l-warning';

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border border-border border-l-[3px] ${accentColor} bg-card p-3 shadow-soft transition-[box-shadow,border-color] duration-150 hover:border-border-subtle hover:shadow-sm`}
    >
      <InteractionCardHeader data={data} statusTone={statusTone} onDeleteInteraction={onDeleteInteraction} />
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
