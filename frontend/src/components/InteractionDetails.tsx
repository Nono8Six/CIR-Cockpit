import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { useInteractionDetailsState } from '@/hooks/useInteractionDetailsState';
import InteractionDetailsFooter from './interactions/InteractionDetailsFooter';
import InteractionDetailsHeader from './interactions/InteractionDetailsHeader';
import InteractionDetailsSubjectCard from './interactions/InteractionDetailsSubjectCard';
import InteractionDetailsTimeline from './interactions/InteractionDetailsTimeline';

interface Props {
  interaction: Interaction;
  onClose: () => void;
  onUpdate: (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => void;
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
    handleSubmit
  } = useInteractionDetailsState({ interaction, statuses, onUpdate });

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col">
      <InteractionDetailsHeader
        interaction={interaction}
        canConvert={canConvert}
        onRequestConvert={onRequestConvert}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-6 bg-white" ref={scrollRef}>
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
      />
    </div>
  );
};

export default InteractionDetails;
