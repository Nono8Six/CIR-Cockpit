import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, type Transition } from 'motion/react';

import { APP_SHELL_SECTION_LABELS } from '@/app/appConstants';
import { getPathForShellNavItem } from '@/app/appRoutes';
import type { AppShellNavItem } from '@/app/appConstants';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/feedback/Tooltip';
import { Kbd } from '../ui/data-display/Kbd';
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
  const activeIndicatorTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 30 };
  const navContentTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' };

  const link = (
    <Link
      to={getPathForShellNavItem(item)}
      onClick={() => onMobileOpenChange?.(false)}
      className={cn(
        'group relative flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
        isActive
          ? 'border border-primary/25 bg-primary/[0.07] font-semibold text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.06),0_0_0_1px_hsl(var(--primary)/0.06)]'
          : 'border border-transparent text-muted-foreground hover:bg-card/75 hover:text-foreground',
        collapsed ? 'justify-center px-0' : 'gap-2.5',
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={!collapsed ? undefined : buildCollapsedNavLabel(item)}
      data-testid={`app-shell-nav-${item.id}`}
    >
      {isActive ? (
        <motion.span
          layoutId="active-nav-indicator"
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_0_10px_hsl(var(--primary)/0.16)]',
            collapsed ? 'h-4 w-[2px]' : 'h-[18px] w-[3px]',
          )}
          initial={false}
          transition={activeIndicatorTransition}
        />
      ) : null}

      <item.icon
        size={15}
        className={cn(
          'relative z-10 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />

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
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-warning/25 bg-warning/15 px-1.5 font-mono text-[10px] font-semibold leading-none text-warning-foreground">
                  {metaLabel}
                </span>
              ) : null}
              {item.shortcut ? (
                <span
                  className={cn(
                    'font-mono text-[10px] transition-colors',
                    isActive ? 'text-primary/70' : 'text-muted-foreground/55 group-hover:text-muted-foreground/75',
                  )}
                >
                  {item.shortcut}
                </span>
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
