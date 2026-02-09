import { Clock } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';

type CockpitReminderControlProps = {
  footerLabelStyle: string;
  reminderField: UseFormRegisterReturn;
  reminderAt: string;
  onSetReminder: (type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => void;
};

const CockpitReminderControl = ({
  footerLabelStyle,
  reminderField,
  reminderAt,
  onSetReminder
}: CockpitReminderControlProps) => {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label className={footerLabelStyle} htmlFor="interaction-reminder">
        <span className="flex items-center gap-1"><Clock size={12} /> Rappel</span>
      </label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Input
          id="interaction-reminder"
          type="datetime-local"
          {...reminderField}
          value={reminderAt}
          onChange={(event) => {
            reminderField.onChange(event);
          }}
          className="h-9 w-full min-w-0 flex-1 text-xs text-slate-600 sm:max-w-[260px]"
          aria-label="Rappel"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => onSetReminder('1h')}
          className="h-9 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50 text-slate-600 shadow-sm"
        >
          +1h
        </button>
        <button
          type="button"
          onClick={() => onSetReminder('3days')}
          className="h-9 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50 text-slate-600 shadow-sm"
        >
          J+3
        </button>
      </div>
    </div>
  );
};

export default CockpitReminderControl;
