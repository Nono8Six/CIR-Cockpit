import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { useInteractionDetailsState } from '@/hooks/useInteractionDetailsState';
import InteractionDetailsFooter from './interactions/InteractionDetailsFooter';
import InteractionDetailsHeader from './interactions/InteractionDetailsHeader';
import InteractionDetailsSubjectCard from './interactions/InteractionDetailsSubjectCard';
import InteractionDetailsTimeline from './interactions/InteractionDetailsTimeline';

interface Props {
  interaction: Interaction;
  onClose: () => void;
  onUpdate: (
    interaction: Interaction,
    event: TimelineEvent,
    updates?: InteractionUpdate
  ) => Promise<void> | void;
  statuses: AgencyStatus[];
  onRequestConvert: (interaction: Interaction) => void;
}

const InteractionDetails = ({
  interaction,
  onClose,
  onUpdate,
  statuses,
  onRequestConvert
}: Props) => {
  const {
    note,
    setNote,
    statusId,
    setStatusId,
    reminder,
    setReminder,
    orderRef,
    setOrderRef,
    statusOptions,
    canConvert,
    scrollRef,
    isSubmitDisabled,
    errorMessage,
    handleSubmit
  } = useInteractionDetailsState({ interaction, statuses, onUpdate });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <InteractionDetailsHeader
        interaction={interaction}
        canConvert={canConvert}
        onRequestConvert={onRequestConvert}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-5" ref={scrollRef}>
        <InteractionDetailsSubjectCard interaction={interaction} />
        <InteractionDetailsTimeline timeline={interaction.timeline} />
      </div>
      <InteractionDetailsFooter
        statusOptions={statusOptions}
        statusId={statusId}
        onStatusChange={setStatusId}
        reminder={reminder}
        onReminderChange={setReminder}
        orderRef={orderRef}
        onOrderRefChange={setOrderRef}
        note={note}
        onNoteChange={setNote}
        onSubmit={handleSubmit}
        isSubmitDisabled={isSubmitDisabled}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default InteractionDetails;
