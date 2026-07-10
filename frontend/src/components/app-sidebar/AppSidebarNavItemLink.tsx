import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, type Transition } from 'motion/react';

import { APP_SHELL_SECTION_LABELS } from '@/app/appConstants';
import { APP_SHELL_CLASSES } from '@/components/app-shell/appShellTokens';
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
  const navContentTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: 'easeOut' };

  const link = (
    <Link
      to={getPathForShellNavItem(item)}
      onClick={() => onMobileOpenChange?.(false)}
      className={cn(
        APP_SHELL_CLASSES.navItem,
        isActive ? APP_SHELL_CLASSES.navItemActive : APP_SHELL_CLASSES.navItemInactive,
        collapsed ? 'justify-center px-0' : 'gap-2.5',
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={!collapsed ? undefined : buildCollapsedNavLabel(item)}
      data-testid={`app-shell-nav-${item.id}`}
    >
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
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={navContentTransition}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden"
          >
            <span className="truncate">{item.label}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              {metaLabel ? (
                <span
                  title={item.metaTitle}
                  aria-label={item.metaTitle}
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-warning/25 bg-warning/15 px-1.5 font-mono text-[10px] font-semibold leading-none text-warning-foreground"
                >
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
