import * as React from 'react';

import { cn } from '@/lib/utils';
import { APP_SHELL_CLASSES } from './appShellTokens';

const PageToolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(APP_SHELL_CLASSES.pageToolbar, className)}
      {...props}
    />
  )
);
PageToolbar.displayName = 'PageToolbar';

const PageToolbarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(APP_SHELL_CLASSES.pageToolbarGroup, className)}
      {...props}
    />
  )
);
PageToolbarGroup.displayName = 'PageToolbarGroup';

export { PageToolbar, PageToolbarGroup };
