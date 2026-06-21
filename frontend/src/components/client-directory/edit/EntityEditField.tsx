import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EntityEditFieldProps = {
  children: ReactNode;
  htmlFor?: string;
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  className?: string;
};

const EntityEditField = ({
  children,
  htmlFor,
  label,
  error,
  helper,
  required = false,
  className
}: EntityEditFieldProps) => (
  <div className={cn('min-w-0', className)}>
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-primary" aria-hidden="true">*</span> : null}
      </label>
      {helper ? <span className="truncate text-[11px] text-muted-foreground">{helper}</span> : null}
    </div>
    {children}
    {error ? (
      <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
        {error}
      </p>
    ) : null}
  </div>
);

export default EntityEditField;
