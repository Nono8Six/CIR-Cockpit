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
  <div className="grid grid-cols-12 gap-3 mb-4">
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
