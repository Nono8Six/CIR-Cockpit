import type { ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';

import {
  getSidebarToggleShortcutLabel,
  SIDEBAR_TOGGLE_SHORTCUT_ARIA,
} from '@/app/appConstants';
import type { AppShellNavSection } from '@/app/appConstants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import type { AppTab } from '@/types';

import AppSidebarNavItemLink from './AppSidebarNavItemLink';

export interface AppSidebarContentProps {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  collapsed: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onToggleCollapsed?: () => void;
  mobileAccountSlot?: ReactNode;
  mobileOpen?: boolean;
}

const AppSidebarContent = ({
  sections,
  activeTab,
  collapsed,
  onMobileOpenChange,
  onToggleCollapsed,
  mobileAccountSlot,
  mobileOpen,
}: AppSidebarContentProps) => {
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
          <div className="mb-4 rounded-xl border border-border/80 bg-card/90 p-3">{mobileAccountSlot}</div>
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
                    transition={
                      reducedMotion
                        ? fadeSlideTransition
                        : { ...fadeSlideTransition, delay: sectionIndex * 0.05 }
                    }
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
                      : {
                          duration: 0.2,
                          delay: sectionIndex * 0.1 + itemIndex * 0.05,
                          ease: 'easeOut',
                        }
                  }
                >
                  <AppSidebarNavItemLink
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
                    collapsed
                      ? 'justify-center px-0 text-muted-foreground hover:bg-card/85 hover:text-foreground'
                      : 'justify-between px-3 text-muted-foreground hover:bg-card/85 hover:text-foreground',
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
                        <Kbd className="group-hover:bg-background/80 transition-colors group-hover:text-foreground">
                          {toggleShortcut}
                        </Kbd>
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

export default AppSidebarContent;
