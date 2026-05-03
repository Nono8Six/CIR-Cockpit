import { Clock } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CockpitReminderControlProps = {
  footerLabelStyle: string;
  reminderField: UseFormRegisterReturn;
  reminderAt: string;
  onSetReminder: (type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => void;
  layout?: 'stacked' | 'inline';
};

const CockpitReminderControl = ({
  footerLabelStyle,
  reminderField,
  reminderAt,
  onSetReminder,
  layout = 'stacked'
}: CockpitReminderControlProps) => {
  const isInline = layout === 'inline';

  return (
    <div className={cn('min-w-0', isInline ? 'grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center' : 'space-y-1.5')}>
      <div className="flex min-h-[18px] min-w-0 items-center gap-3">
        <label className={cn(footerLabelStyle, isInline && 'mb-0')} htmlFor="interaction-reminder">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} aria-hidden="true" />
            Rappel
          </span>
        </label>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          id="interaction-reminder"
          type="datetime-local"
          {...reminderField}
          value={reminderAt}
          onChange={(event) => {
            reminderField.onChange(event);
          }}
          className="h-10 min-w-0 flex-1 text-sm text-muted-foreground"
          aria-label="Rappel"
          autoComplete="off"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetReminder('1h')}
            className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            +1h
          </button>
          <button
            type="button"
            onClick={() => onSetReminder('tomorrow')}
            className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Demain
          </button>
          <button
            type="button"
            onClick={() => onSetReminder('3days')}
            className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            J+3
          </button>
        </div>
      </div>
    </div>
  );
};

export default CockpitReminderControl;
