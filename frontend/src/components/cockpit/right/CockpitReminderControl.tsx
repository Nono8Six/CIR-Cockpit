import { Clock } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { motion, useReducedMotion } from 'motion/react';

import { Input } from '../../ui/inputs/basic/Input';
import { cn } from '@/lib/utils';

type CockpitReminderControlProps = {
  footerLabelStyle: string;
  reminderField: UseFormRegisterReturn;
  reminderAt: string;
  onSetReminder: (type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => void;
  layout?: 'stacked' | 'inline';
  variant?: 'default' | 'fused';
};

const CockpitReminderControl = ({
  footerLabelStyle,
  reminderField,
  reminderAt,
  onSetReminder,
  layout = 'stacked',
  variant = 'default'
}: CockpitReminderControlProps) => {
  const isInline = layout === 'inline';
  const shouldReduceMotion = useReducedMotion();
  const isReminderSet = Boolean(reminderAt);
  const isFused = variant === 'fused';

  return (
    <div className={cn('min-w-0', isInline ? 'grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center' : 'space-y-0.5')}>
      <div className="flex min-h-[18px] min-w-0 items-center gap-3">
        <label className={cn(footerLabelStyle, isInline && 'mb-0')} htmlFor="interaction-reminder">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} aria-hidden="true" className={isReminderSet ? 'text-primary' : 'text-muted-foreground/80'} />
            Rappel
            {isReminderSet && !shouldReduceMotion ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
              </span>
            ) : isReminderSet ? (
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
            ) : null}
          </span>
        </label>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2.5">
        <Input
          id="interaction-reminder"
          type="datetime-local"
          {...reminderField}
          value={reminderAt}
          onChange={(event) => {
            reminderField.onChange(event);
          }}
          className={cn(
            isFused
              ? "h-9 min-w-0 flex-1 text-sm text-foreground/90 border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none mt-1 font-semibold text-[13px]"
              : "h-11 min-w-0 flex-1 bg-background border border-border rounded-lg px-3 text-[13px] font-medium text-foreground placeholder:text-muted-foreground/75 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 shadow-sm mt-1"
          )}
          aria-label="Rappel"
          autoComplete="off"
        />
        <div className={cn(
          isFused
            ? "flex shrink-0 items-center gap-0.5 bg-surface-2 p-0.5 rounded-lg border border-border/80 shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.03)] mt-1"
            : "flex shrink-0 items-center gap-1.5 mt-1"
        )}>
          <motion.button
            type="button"
            onClick={() => onSetReminder('1h')}
            whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            className={cn(
              isFused
                ? "inline-flex h-6 items-center rounded-md px-2.5 text-[10px] font-extrabold text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-sm transition-all duration-150 cursor-pointer select-none border border-transparent"
                : "inline-flex h-8 items-center rounded-lg border border-border/80 bg-card px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-surface-1 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer select-none"
            )}
          >
            +1h
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSetReminder('tomorrow')}
            whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            className={cn(
              isFused
                ? "inline-flex h-6 items-center rounded-md px-2.5 text-[10px] font-extrabold text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-sm transition-all duration-150 cursor-pointer select-none border border-transparent"
                : "inline-flex h-8 items-center rounded-lg border border-border/80 bg-card px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-surface-1 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer select-none"
            )}
          >
            Demain
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSetReminder('3days')}
            whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            className={cn(
              isFused
                ? "inline-flex h-6 items-center rounded-md px-2.5 text-[10px] font-extrabold text-muted-foreground hover:text-foreground hover:bg-card hover:shadow-sm transition-all duration-150 cursor-pointer select-none border border-transparent"
                : "inline-flex h-8 items-center rounded-lg border border-border/80 bg-card px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-surface-1 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer select-none"
            )}
          >
            J+3
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CockpitReminderControl;

