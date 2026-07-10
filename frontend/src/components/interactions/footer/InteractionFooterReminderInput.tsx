import { Input } from '../../ui/inputs/basic/Input';

type InteractionFooterReminderInputProps = {
  reminder: string;
  onReminderChange: (value: string) => void;
};

const REMINDER_PRESETS: Array<{ label: string; title: string; daysAhead: number }> = [
  { label: '+2 j', title: 'Relance dans 2 jours à 09:00', daysAhead: 2 },
  { label: '+1 sem', title: 'Relance dans 1 semaine à 09:00', daysAhead: 7 }
];

// Valeur locale au format datetime-local (YYYY-MM-DDTHH:mm), relance à 09:00.
const buildReminderPresetValue = (daysAhead: number): string => {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  target.setHours(9, 0, 0, 0);

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
};

const InteractionFooterReminderInput = ({
  reminder,
  onReminderChange
}: InteractionFooterReminderInputProps) => (
  <div className="sm:col-span-1 lg:col-span-5">
    <div className="mb-1 flex items-center justify-between gap-2">
      <label
        htmlFor="interaction-reminder"
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Prochain rappel
      </label>
      <span className="inline-flex items-center gap-1">
        {REMINDER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            title={preset.title}
            onClick={() => onReminderChange(buildReminderPresetValue(preset.daysAhead))}
            className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {preset.label}
          </button>
        ))}
        {reminder ? (
          <button
            type="button"
            title="Effacer le rappel"
            onClick={() => onReminderChange('')}
            className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Aucun
          </button>
        ) : null}
      </span>
    </div>
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
