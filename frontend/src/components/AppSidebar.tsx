import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  PanelLeft
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition
} from 'motion/react';

import {
  APP_SHELL_SECTION_LABELS,
  getSidebarToggleShortcutLabel,
  SIDEBAR_TOGGLE_SHORTCUT_ARIA
} from '@/app/appConstants';
import { getPathForTab } from '@/app/appRoutes';
import type { AppShellNavItem, AppShellNavSection } from '@/app/appConstants';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import type { AppTab } from '@/types';

type SidebarContentProps = {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  collapsed: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onToggleCollapsed?: () => void;
  mobileAccountSlot?: ReactNode;
};

type AppSidebarProps = {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  mobileAccountSlot?: ReactNode;
};

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

const NavItemLink = ({
  item,
  collapsed,
  isActive,
  reducedMotion,
  onMobileOpenChange
}: {
  item: AppShellNavItem;
  collapsed: boolean;
  isActive: boolean;
  reducedMotion: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) => {
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
        collapsed ? 'justify-center px-0' : 'gap-2.5'
      )}
      activeProps={{ 'aria-current': 'page' }}
      aria-label={!collapsed ? undefined : buildCollapsedNavLabel(item)}
      data-testid={`app-shell-nav-${item.id}`}
    >
      {isActive ? (
        <motion.span
          layoutId="active-nav-indicator"
          className={cn(
            "absolute -left-[1px] top-[15%] h-[70%] rounded-r-full bg-primary",
            collapsed ? "w-[2px]" : "w-[3px]"
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

const SidebarContent = ({
  sections,
  activeTab,
  collapsed,
  onMobileOpenChange,
  onToggleCollapsed,
  mobileAccountSlot,
  mobileOpen
}: SidebarContentProps & { mobileOpen?: boolean }) => {
  const safeSections = Array.isArray(sections) ? sections : [];
  const toggleLabel = collapsed ? 'D\u00E9plier le menu' : 'R\u00E9duire le menu';
  const toggleShortcut = getSidebarToggleShortcutLabel();
  const reducedMotion = useReducedMotion() ?? false;
  const shouldAnimateMobileOpen = !collapsed && Boolean(mobileOpen) && !reducedMotion;
  const fadeSlideTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: 'easeOut' };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-surface-2 p-3">
        <div className={cn('mb-5 flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary text-xs font-black text-white shadow-sm">
              C
            </span>
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={fadeSlideTransition}
                  className="inline-flex min-w-0 flex-col overflow-hidden"
                >
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    CIR Cockpit
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {!collapsed && mobileAccountSlot ? (
          <div className="mb-4 rounded-xl border border-border/80 bg-card/90 p-3">
            {mobileAccountSlot}
          </div>
        ) : null}

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {safeSections.map((section, sectionIndex) => (
            <div key={section.id} className="space-y-1">
              <AnimatePresence initial={false}>
                {!collapsed ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reducedMotion ? fadeSlideTransition : { ...fadeSlideTransition, delay: sectionIndex * 0.05 }}
                    className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60"
                  >
                    {section.title}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item.id}
                  initial={shouldAnimateMobileOpen ? { opacity: 0, x: -10 } : false}
                  animate={shouldAnimateMobileOpen ? { opacity: 1, x: 0 } : false}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 0.2, delay: (sectionIndex * 0.1) + (itemIndex * 0.05), ease: 'easeOut' }
                  }
                >
                  <NavItemLink
                    item={item}
                    collapsed={collapsed}
                    isActive={item.id === activeTab}
                    reducedMotion={reducedMotion}
                    onMobileOpenChange={onMobileOpenChange}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </nav>

        {onToggleCollapsed && (
          <div className="mt-auto pt-4 border-t border-border/40">
            <Tooltip delayDuration={120}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={toggleLabel}
                  aria-expanded={!collapsed}
                  aria-keyshortcuts={SIDEBAR_TOGGLE_SHORTCUT_ARIA}
                  onClick={onToggleCollapsed}
                  className={cn(
                    'group flex h-10 w-full items-center rounded-xl text-sm transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
                    collapsed ? 'justify-center px-0 text-muted-foreground hover:bg-card/85 hover:text-foreground' : 'justify-between px-3 text-muted-foreground hover:bg-card/85 hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <PanelLeft size={15} className="shrink-0" />
                    <AnimatePresence initial={false}>
                      {!collapsed ? (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={fadeSlideTransition}
                          className="font-medium truncate"
                        >
                          R&eacute;duire le menu
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence initial={false}>
                    {!collapsed ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeSlideTransition}
                      >
                        <Kbd className="group-hover:bg-background/80 transition-colors group-hover:text-foreground">{toggleShortcut}</Kbd>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {toggleLabel} <Kbd className="ml-1 bg-transparent border-border/40">{toggleShortcut}</Kbd>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

const AppSidebar = ({
  sections,
  activeTab,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  mobileAccountSlot
}: AppSidebarProps) => {
  const reducedMotion = useReducedMotion() ?? false;
  const sidebarTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 350, damping: 35 };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 296 }}
        transition={sidebarTransition}
        className="relative hidden overflow-hidden border-r border-border/80 bg-[hsl(214,24%,95%)] md:flex md:flex-col"
      >
        <SidebarContent
          sections={sections}
          activeTab={activeTab}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      </motion.aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(88vw,360px)] border-r border-border/80 p-0 [overscroll-behavior:contain]"
        >
          <SidebarContent
            sections={sections}
            activeTab={activeTab}
            collapsed={false}
            onMobileOpenChange={onMobileOpenChange}
            mobileAccountSlot={mobileAccountSlot}
            mobileOpen={mobileOpen}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppSidebar;
