import InteractionFooterNoteComposer from './footer/InteractionFooterNoteComposer';
import InteractionFooterTopFields from './footer/InteractionFooterTopFields';

type InteractionDetailsFooterProps = {
  statusOptions: { id: string; label: string }[];
  statusId: string;
  onStatusChange: (value: string) => void;
  reminder: string;
  onReminderChange: (value: string) => void;
  orderRef: string;
  onOrderRefChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
};

const InteractionDetailsFooter = ({
  statusOptions,
  statusId,
  onStatusChange,
  reminder,
  onReminderChange,
  orderRef,
  onOrderRefChange,
  note,
  onNoteChange,
  onSubmit,
  isSubmitDisabled
}: InteractionDetailsFooterProps) => (
  <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0">
    <InteractionFooterTopFields
      statusOptions={statusOptions}
      statusId={statusId}
      onStatusChange={onStatusChange}
      reminder={reminder}
      onReminderChange={onReminderChange}
      orderRef={orderRef}
      onOrderRefChange={onOrderRefChange}
    />
    <InteractionFooterNoteComposer
      note={note}
      onNoteChange={onNoteChange}
      onSubmit={onSubmit}
      isSubmitDisabled={isSubmitDisabled}
    />
    <div className="text-xs text-slate-400 mt-2 text-right">
      <span className="font-bold">Ctrl + Enter</span> pour envoyer
    </div>
  </div>
);

export default InteractionDetailsFooter;
