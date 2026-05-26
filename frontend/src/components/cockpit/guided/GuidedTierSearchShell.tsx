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
        'overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_8px_-1px_rgba(0,0,0,0.03),0_8px_24px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.04),0_12px_32px_-4px_rgba(0,0,0,0.03)]',
        className
      )}
      aria-label="Rechercher ou créer le tiers"
    >
      {/* En-tête structuré et contrasté */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card px-5 py-3.5 select-none">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Recherche
          </p>
          {shortcutLabel ? (
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground shadow-sm">
              {shortcutLabel}
            </kbd>
          ) : null}
        </div>
        {showArchiveToggle ? (
          <div className="flex shrink-0 items-center gap-2.5">
            <label htmlFor="guided-tier-archived-toggle" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-150">
              Inclure archivés
            </label>
            <Switch
              id="guided-tier-archived-toggle"
              checked={includeArchived}
              onCheckedChange={onIncludeArchivedChange}
              disabled={archiveSupport === 'disabled'}
              aria-label="Inclure les tiers archivés"
              className="scale-75 origin-right"
            />
          </div>
        ) : null}
      </div>
      <div className={cn('min-h-[160px] bg-card', contentClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="border-t border-border/60 bg-card px-5 py-3.5">
          {footer}
        </div>
      ) : null}
    </section>
  );
};

export default GuidedTierSearchShell;
