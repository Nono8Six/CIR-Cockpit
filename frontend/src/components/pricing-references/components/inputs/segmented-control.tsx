import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedControlOption<TValue extends string> {
  value: TValue;
  label: string;
  ariaLabel?: string;
  prefix?: ReactNode;
}

interface SegmentedControlProps<TValue extends string> {
  value: TValue;
  options: Array<SegmentedControlOption<TValue>>;
  onChange: (value: TValue) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Unique segmented control vocabulary for the pricing references workspace.
 * One container style, one active-state style, shared by every inline view switch.
 */
export const SegmentedControl = <TValue extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className
}: SegmentedControlProps<TValue>) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn(
      'inline-flex h-8 select-none items-center gap-0.5 rounded-lg border border-border/70 bg-muted/45 p-0.5',
      className
    )}
  >
    {options.map((option) => {
      const isActive = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={isActive}
          aria-label={option.ariaLabel}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex h-7 items-center rounded-md px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
            isActive ? 'bg-background text-foreground shadow-none' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.prefix}
          {option.label}
        </button>
      );
    })}
  </div>
);
