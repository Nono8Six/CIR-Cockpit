import InteractionFooterOrderRefInput from './InteractionFooterOrderRefInput';
import InteractionFooterReminderInput from './InteractionFooterReminderInput';
import InteractionFooterStatusSelect from './InteractionFooterStatusSelect';

type InteractionFooterTopFieldsProps = {
  statusOptions: { id: string; label: string }[];
  statusId: string;
  onStatusChange: (value: string) => void;
  reminder: string;
  onReminderChange: (value: string) => void;
  orderRef: string;
  onOrderRefChange: (value: string) => void;
};

const InteractionFooterTopFields = ({
  statusOptions,
  statusId,
  onStatusChange,
  reminder,
  onReminderChange,
  orderRef,
  onOrderRefChange
}: InteractionFooterTopFieldsProps) => (
  <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
    <InteractionFooterStatusSelect
      statusOptions={statusOptions}
      statusId={statusId}
      onStatusChange={onStatusChange}
    />
    <InteractionFooterReminderInput
      reminder={reminder}
      onReminderChange={onReminderChange}
    />
    <InteractionFooterOrderRefInput
      orderRef={orderRef}
      onOrderRefChange={onOrderRefChange}
    />
  </div>
);

export default InteractionFooterTopFields;
