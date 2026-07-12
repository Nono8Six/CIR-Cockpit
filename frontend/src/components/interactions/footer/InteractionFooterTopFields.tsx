import InteractionFooterAmountInput from './InteractionFooterAmountInput';
import InteractionFooterOrderRefInput from './InteractionFooterOrderRefInput';
import InteractionFooterReminderInput from './InteractionFooterReminderInput';
import InteractionFooterStatusSelect from './InteractionFooterStatusSelect';

type InteractionFooterTopFieldsProps = {
  statusOptions: { id: string; label: string; isHistorical?: boolean }[];
  statusId: string;
  onStatusChange: (value: string) => void;
  reminder: string;
  onReminderChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  orderRef: string;
  onOrderRefChange: (value: string) => void;
};

const InteractionFooterTopFields = ({
  statusOptions,
  statusId,
  onStatusChange,
  reminder,
  onReminderChange,
  amount,
  onAmountChange,
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
    <InteractionFooterAmountInput
      amount={amount}
      onAmountChange={onAmountChange}
    />
    <InteractionFooterOrderRefInput
      orderRef={orderRef}
      onOrderRefChange={onOrderRefChange}
    />
  </div>
);

export default InteractionFooterTopFields;
