import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EntityEditSectionProps = {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

const EntityEditSection = ({
  children,
  title,
  description,
  className
}: EntityEditSectionProps) => (
  <section className={cn('border-t border-border px-5 py-6 sm:px-7', className)}>
    <div className="mb-5 grid gap-1 sm:grid-cols-[180px_1fr] sm:gap-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="hidden sm:block" aria-hidden="true" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);

export default EntityEditSection;
