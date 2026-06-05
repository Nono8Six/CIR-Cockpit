import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface WizardShellProps {
  children: ReactNode;
  className?: string;
}

interface WizardHeaderProps {
  leading: ReactNode;
  progress: ReactNode;
  actions: ReactNode;
}

interface WizardWorkspaceProps {
  main: ReactNode;
  aside: ReactNode;
  mainClassName?: string;
  isSheet?: boolean;
  showAside?: boolean;
}

export const EntityRecordWizardShell = ({ children, className }: WizardShellProps) => (
  <div
    className={cn(
      'flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground',
      className
    )}
  >
    {children}
  </div>
);

export const EntityRecordWizardHeader = ({
  leading,
  progress,
  actions
}: WizardHeaderProps) => (
  <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1/70 px-4 py-2 lg:flex-nowrap lg:px-5">
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
      {leading}
      <div className="hidden min-w-0 flex-1 md:block">{progress}</div>
    </div>
    <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div>
  </header>
);

export const EntityRecordWizardWorkspace = ({
  main,
  aside,
  mainClassName,
  isSheet = false,
  showAside = true
}: WizardWorkspaceProps) => (
  <div
    className={cn(
      'flex min-h-0 flex-1 flex-col overflow-y-auto',
      isSheet
        ? showAside
          ? 'sm:grid sm:grid-cols-[1fr_260px] sm:overflow-hidden'
          : 'grid-cols-1'
        : 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]'
    )}
  >
    <main
      className={cn(
        'min-h-fit overflow-x-hidden bg-background px-5 py-6 sm:px-7 lg:min-h-0 lg:overflow-y-auto lg:px-9',
        mainClassName,
        isSheet && 'px-4 py-4 sm:px-5'
      )}
    >
      {main}
    </main>
    {showAside && aside}
  </div>
);
