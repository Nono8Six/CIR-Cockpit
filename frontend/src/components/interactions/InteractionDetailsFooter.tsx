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
  errorMessage?: string | null;
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
  isSubmitDisabled,
  errorMessage
}: InteractionDetailsFooterProps) => (
  <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
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
    {errorMessage ? <p className="mt-2 text-xs font-medium text-red-600">{errorMessage}</p> : null}
    <p className="mt-2 text-right text-[11px] font-medium text-slate-500">
      <span className="font-semibold">Ctrl + Entrée</span> pour envoyer
    </p>
  </footer>
);

export default InteractionDetailsFooter;
