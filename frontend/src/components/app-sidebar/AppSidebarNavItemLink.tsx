import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, type Transition } from 'motion/react';

import { APP_SHELL_SECTION_LABELS } from '@/app/appConstants';
import { getPathForTab } from '@/app/appRoutes';
import type { AppShellNavItem } from '@/app/appConstants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

const buildCollapsedNavLabel = (item: AppShellNavItem): string => {
  const parts = [APP_SHELL_SECTION_LABELS[item.sectionId], item.label];

  if (item.metaLabel) {
    parts.push(item.metaLabel);
  }

  if (item.shortcut) {
    parts.push(item.shortcut);
  }

  return parts.join(' - ');
};

export interface AppSidebarNavItemLinkProps {
  item: AppShellNavItem;
  collapsed: boolean;
  isActive: boolean;
  reducedMotion: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const AppSidebarNavItemLink = ({
  item,
  collapsed,
  isActive,
  reducedMotion,
  onMobileOpenChange,
}: AppSidebarNavItemLinkProps) => {
  const sectionLabel = APP_SHELL_SECTION_LABELS[item.sectionId];
  const metaLabel = item.metaLabel;
  const shouldPulseMetaLabel = typeof metaLabel === 'string' && /\d/.test(metaLabel) && !reducedMotion;
  const activeIndicatorTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 30 };
  const navContentTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' };

  const link = (
    <Link
      to={getPathForTab(item.id)}
      onClick={() => onMobileOpenChange?.(false)}
      className={cn(
        'group relative flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
        isActive
          ? 'bg-surface-1/80 font-semibold text-foreground shadow-sm ring-1 ring-border/50'
          : 'text-muted-foreground hover:bg-card/85 hover:text-foreground',
        collapsed ? 'justify-center px-0' : 'gap-2.5',
      )}
      activeProps={{ 'aria-current': 'page' }}
      aria-label={!collapsed ? undefined : buildCollapsedNavLabel(item)}
      data-testid={`app-shell-nav-${item.id}`}
    >
      {isActive ? (
        <motion.span
          layoutId="active-nav-indicator"
          className={cn(
            'absolute -left-[1px] top-[15%] h-[70%] rounded-r-full bg-primary',
            collapsed ? 'w-[2px]' : 'w-[3px]',
          )}
          initial={false}
          transition={activeIndicatorTransition}
        />
      ) : null}

      <item.icon size={15} className="shrink-0 relative z-10" />

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={navContentTransition}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden"
          >
            <span className="truncate">{item.label}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              {metaLabel ? (
                <span className="relative inline-flex min-w-5 items-center justify-center">
                  {shouldPulseMetaLabel ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/20"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : null}
                  <span className="relative z-10 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 border border-primary/20 px-1.5 text-[10px] font-bold text-primary">
                    {metaLabel}
                  </span>
                </span>
              ) : null}
              {item.shortcut ? (
                <span className="font-mono text-[10px] text-muted-foreground/60">{item.shortcut}</span>
              ) : null}
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
      {collapsed ? <span className="sr-only">{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {sectionLabel}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            {item.metaLabel ? (
              <span className="text-xs text-muted-foreground">{item.metaLabel}</span>
            ) : null}
            {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default AppSidebarNavItemLink;
