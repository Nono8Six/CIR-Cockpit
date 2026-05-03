import * as React from 'react';

import { cn } from '@/lib/utils';

export type KbdProps = React.ComponentPropsWithoutRef<'kbd'>;

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      'pointer-events-none inline-flex h-[18px] select-none items-center justify-center gap-1 rounded-[3px] border border-border bg-surface-2 px-1.5 font-mono text-[10px] font-semibold leading-none text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.05)]',
      className
    )}
    {...props}
  />
));

Kbd.displayName = 'Kbd';
