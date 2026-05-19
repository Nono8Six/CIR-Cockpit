import type { ReactNode } from 'react';

import { Switch } from '../../ui/inputs/basic/Switch';
import { cn } from '@/lib/utils';

type GuidedTierSearchShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  shortcutLabel?: string;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (value: boolean) => void;
  archiveSupport?: 'visible' | 'disabled' | 'hidden';
  className?: string;
  contentClassName?: string;
};

const GuidedTierSearchShell = ({
  children,
  footer,
  shortcutLabel,
  includeArchived = false,
  onIncludeArchivedChange,
  archiveSupport = 'visible',
  className,
  contentClassName
}: GuidedTierSearchShellProps) => {
  const showArchiveToggle = archiveSupport !== 'hidden';

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-ring/40 focus-within:ring-2 focus-within:ring-ring/15',
        className
      )}
      aria-label="Rechercher ou créer le tiers"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface-1/70 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recherche</p>
          {shortcutLabel ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {shortcutLabel}
            </span>
          ) : null}
        </div>
        {showArchiveToggle ? (
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="guided-tier-archived-toggle" className="text-xs font-medium text-muted-foreground">
              Inclure archivés
            </label>
            <Switch
              id="guided-tier-archived-toggle"
              checked={includeArchived}
              onCheckedChange={onIncludeArchivedChange}
              disabled={archiveSupport === 'disabled'}
              aria-label="Inclure les tiers archivés"
            />
          </div>
        ) : null}
      </div>
      <div className={cn('min-h-[180px] bg-card', contentClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="border-t border-border bg-surface-1/80 px-3 py-2">
          {footer}
        </div>
      ) : null}
    </section>
  );
};

export default GuidedTierSearchShell;
