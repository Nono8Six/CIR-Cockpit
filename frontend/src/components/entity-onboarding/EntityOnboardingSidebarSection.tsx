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
    <section className="rounded-lg border border-border-subtle bg-background shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <p className="text-[12px] font-semibold text-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : undefined
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border-subtle px-4 py-4">{children}</div>
      ) : null}
    </section>
  );
};

export const SidebarInfoRow = ({
  label,
  value
}: SidebarInfoRowProps) => (
  <div className="flex items-start justify-between gap-4 text-[12px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value}</span>
  </div>
);
