import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/data-display/Badge';
import { cn } from '@/lib/utils';

interface SettingsSectionShellProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  badgeTone?: 'default' | 'primary' | 'warning';
  className?: string;
  children: ReactNode;
}

const BADGE_CLASS = {
  default: 'border-border bg-surface-1 text-muted-foreground',
  primary: 'border-primary/20 bg-primary/5 text-primary',
  warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
};

const SettingsSectionShell = ({
  id,
  title,
  description,
  icon: Icon,
  badge,
  badgeTone = 'default',
  className,
  children,
}: SettingsSectionShellProps) => {
  return (
    <section
      id={id}
      className={cn(
        'min-h-full scroll-mt-5 border border-border/70 bg-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center border border-border bg-surface-1 text-primary sm:size-7">
            <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-foreground text-pretty">{title}</h3>
            <p className="hidden max-w-[72ch] text-xs leading-relaxed text-muted-foreground md:block">
              {description}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'w-fit shrink-0 text-[10px] font-semibold uppercase tracking-wider',
            BADGE_CLASS[badgeTone]
          )}
        >
          {badge}
        </Badge>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
};

export default SettingsSectionShell;
