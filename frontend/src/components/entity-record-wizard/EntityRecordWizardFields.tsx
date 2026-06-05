import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface WizardSectionProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

interface WizardFieldProps {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const wizardInputClasses =
  'h-9 rounded-md border-border bg-background px-3 text-[13px] font-medium shadow-none transition-[border-color,box-shadow,background-color] hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20';

export const wizardReadOnlyInputClasses =
  'cursor-not-allowed bg-surface-2/70 text-muted-foreground shadow-none';

export const EntityRecordWizardSection = ({
  title,
  eyebrow,
  children,
  className
}: WizardSectionProps) => (
  <section className={cn('border border-border bg-card', className)}>
    <div className="border-b border-border-subtle bg-surface-1/55 px-4 py-3">
      {eyebrow ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      ) : null}
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

export const EntityRecordWizardField = ({
  label,
  htmlFor,
  helper,
  error,
  required,
  className,
  children
}: WizardFieldProps) => (
  <div className={cn('grid gap-1.5', className)}>
    <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      {required ? <span className="ml-1 text-destructive">*</span> : null}
    </label>
    {children}
    {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    {!error && helper ? <p className="text-xs text-muted-foreground/70">{helper}</p> : null}
  </div>
);
