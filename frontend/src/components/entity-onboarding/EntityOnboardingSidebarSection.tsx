import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SidebarSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

interface SidebarInfoRowProps {
  label: string;
  value: string;
}

export const SidebarSection = ({
  title,
  subtitle,
  defaultOpen = false,
  children
}: SidebarSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left py-1 group focus-visible:outline-none"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground/80 leading-normal">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover:text-foreground',
            open ? 'rotate-180' : undefined
          )}
        />
      </button>
      {open ? (
        <div className="mt-3 space-y-2.5">{children}</div>
      ) : null}
    </section>
  );
};

export const SidebarInfoRow = ({
  label,
  value
}: SidebarInfoRowProps) => (
  <div className="flex items-start gap-4 text-[12px] py-0.5">
    <span className="text-muted-foreground w-28 shrink-0 text-[11px] font-medium tracking-tight">
      {label}
    </span>
    <span className="font-semibold text-foreground flex-1 break-words leading-tight">
      {value}
    </span>
  </div>
);
