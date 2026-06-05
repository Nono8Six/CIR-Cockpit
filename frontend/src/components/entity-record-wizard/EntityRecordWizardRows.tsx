import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface WizardRecordRowProps {
  children: ReactNode;
  active?: boolean;
  warning?: boolean;
  className?: string;
}

interface WizardAsideProps {
  label: string;
  children: ReactNode;
  className?: string;
}

interface WizardEmptyStateProps {
  icon?: ReactNode;
  title: string;
  body: ReactNode;
  tone?: 'default' | 'warning';
}

export const EntityRecordWizardRecordRow = ({
  children,
  active,
  warning,
  className
}: WizardRecordRowProps) => (
  <div
    className={cn(
      'border-b border-border-subtle bg-background transition-[background-color,border-color,box-shadow]',
      active && 'bg-primary/[0.035] shadow-[inset_3px_0_0_hsl(var(--primary))]',
      warning && 'bg-warning/[0.035]',
      className
    )}
  >
    {children}
  </div>
);

export const EntityRecordWizardAside = ({
  label,
  children,
  className
}: WizardAsideProps) => (
  <aside
    aria-label={label}
    className={cn(
      'min-h-0 overflow-y-auto border-t border-border bg-surface-2/75 p-4 sm:border-l sm:border-t-0 sm:p-4 lg:p-5',
      className
    )}
  >
    {children}
  </aside>
);

export const EntityRecordWizardEmptyState = ({
  icon,
  title,
  body,
  tone = 'default'
}: WizardEmptyStateProps) => (
  <div
    className={cn(
      'mx-auto flex max-w-md flex-col items-center justify-center border border-dashed px-8 py-10 text-center',
      tone === 'warning'
        ? 'border-warning/35 bg-warning/[0.025] text-warning-foreground'
        : 'border-border bg-surface-1/35 text-muted-foreground'
    )}
  >
    {icon ? <div className="mb-3 text-muted-foreground/45">{icon}</div> : null}
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</div>
  </div>
);
