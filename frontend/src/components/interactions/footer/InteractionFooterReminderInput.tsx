import { Input } from '@/components/ui/input';

type InteractionFooterReminderInputProps = {
  reminder: string;
  onReminderChange: (value: string) => void;
};

const InteractionFooterReminderInput = ({
  reminder,
  onReminderChange
}: InteractionFooterReminderInputProps) => (
  <div className="sm:col-span-1 lg:col-span-5">
    <label
      htmlFor="interaction-reminder"
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Prochain rappel
    </label>
    <Input
      id="interaction-reminder"
      type="datetime-local"
      value={reminder}
      onChange={(event) => onReminderChange(event.target.value)}
      className="h-9 bg-card text-sm"
      name="interaction-reminder"
      autoComplete="off"
    />
  </div>
);

export default InteractionFooterReminderInput;
