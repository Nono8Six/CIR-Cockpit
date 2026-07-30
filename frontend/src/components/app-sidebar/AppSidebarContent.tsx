import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';

import {
  getSidebarToggleShortcutLabel,
  SIDEBAR_TOGGLE_SHORTCUT_ARIA,
} from '@/app/appConstants';
import { APP_SHELL_CLASSES, APP_SHELL_DIMENSIONS } from '@/components/app-shell/appShellTokens';
import { getPathForTab, isShellNavItemActive } from '@/app/appRoutes';
import type { AppShellNavSection } from '@/app/appConstants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/feedback/Tooltip';
import { Kbd } from '../ui/data-display/Kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/navigation/DropdownMenu';
import { cn } from '@/lib/utils';
import type { AgencyMembershipSummary, AppTab } from '@/types';

import AppSidebarNavItemLink from './AppSidebarNavItemLink';

export interface AppSidebarContentProps {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  activePath: string;
  agencyName?: string;
  agencySubtitle?: string;
  agencyMemberships?: AgencyMembershipSummary[];
  activeAgencyId?: string;
  onAgencyChange?: (agencyId: string) => void;
  userName?: string;
  userRoleLabel?: string;
  userInitials?: string;
  collapsed: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onToggleCollapsed?: () => void;
  mobileAccountSlot?: ReactNode;
  mobileOpen?: boolean;
}

const AppSidebarContent = ({
  sections,
  activeTab,
  activePath,
  agencyName,
  agencySubtitle = 'Agence active',
  agencyMemberships,
  activeAgencyId,
  onAgencyChange,
  userName,
  userRoleLabel,
  userInitials,
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
  const safeAgencyMemberships = Array.isArray(agencyMemberships) ? agencyMemberships : [];
  const canSwitchAgency = safeAgencyMemberships.length > 1 && typeof onAgencyChange === 'function';
  const agencyBlockContent = (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_2px_hsl(var(--success)/0.14)]" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-semibold text-foreground">{agencyName}</span>
        <span className="block truncate text-[10.5px] text-muted-foreground">{agencySubtitle}</span>
      </span>
    </>
  );
  const fadeSlideTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: 'easeOut' };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-surface-1">
        <div className={cn('flex items-center', APP_SHELL_DIMENSIONS.headerHeightClass, collapsed ? 'justify-center px-2' : 'gap-2 px-3')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-black text-primary-foreground">
              C
            </span>
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={fadeSlideTransition}
                  className="inline-flex min-w-0 flex-col overflow-hidden leading-tight"
                >
                  <span className="whitespace-nowrap text-[13px] font-bold text-foreground">
                    CIR Cockpit
                  </span>
                  <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                    v2.0
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {!collapsed && mobileAccountSlot ? (
          <div className="m-2 rounded-lg border border-border bg-card p-3">{mobileAccountSlot}</div>
        ) : null}

        {!collapsed && agencyName ? (
          canSwitchAgency ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Changer d'agence"
                  className={cn(
                    'group mx-2.5 mt-2 flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-left text-xs transition-[background-color,border-color,box-shadow] duration-150 hover:border-border/80 hover:bg-background',
                    APP_SHELL_CLASSES.sidebarFocus
                  )}
                >
                  {agencyBlockContent}
                  <ChevronDown
                    size={12}
                    className="text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">Changer d&apos;agence</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={activeAgencyId ?? ''}
                  onValueChange={(value) => onAgencyChange?.(value)}
                >
                  {safeAgencyMemberships.map((membership) => (
                    <DropdownMenuRadioItem
                      key={membership.agency_id}
                      value={membership.agency_id}
                      className="cursor-pointer text-[12.5px]"
                    >
                      <span className="truncate">{membership.agency_name}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="mx-2.5 mt-2 flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-left text-xs">
              {agencyBlockContent}
            </div>
          )
        ) : null}

        {!collapsed ? (
          <div className="px-2.5 py-2">
            <Link
              to={getPathForTab('cockpit')}
              className={cn(APP_SHELL_CLASSES.sidebarCta, 'justify-start gap-2 px-2.5')}
            >
              <Plus size={14} aria-hidden="true" />
              Nouvelle interaction
              <Kbd className="ml-auto border-white/25 bg-white/15 text-white">Ctrl N</Kbd>
            </Link>
          </div>
        ) : (
          <div className="px-1.5 py-2">
            <Link
              to={getPathForTab('cockpit')}
              aria-label="Nouvelle interaction"
              className={cn(APP_SHELL_CLASSES.sidebarCta, 'justify-center')}
            >
              <Plus size={15} aria-hidden="true" />
            </Link>
          </div>
        )}

        <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-2">
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
                    className="px-2 pb-1 text-[11px] font-medium text-muted-foreground"
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
                    isActive={isShellNavItemActive(item, activeTab, activePath)}
                    reducedMotion={reducedMotion}
                    onMobileOpenChange={onMobileOpenChange}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </nav>

        {onToggleCollapsed && (
          <div className="mt-auto border-t border-border/70 px-2 py-2">
            {userName ? (
              <div className={cn('mb-1.5 flex min-w-0 items-center gap-2 rounded-lg px-1 py-1.5', collapsed ? 'justify-center' : '')}>
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[11px] font-bold text-primary">
                  {(userInitials || userName.slice(0, 2)).toUpperCase()}
                </span>
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={fadeSlideTransition}
                      className="min-w-0 flex-1 leading-tight"
                    >
                      <p className="truncate text-[12px] font-semibold text-foreground">{userName}</p>
                      {userRoleLabel ? (
                        <p className="truncate text-[10px] text-muted-foreground">{userRoleLabel}</p>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}
            <Tooltip delayDuration={120}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={toggleLabel}
                  aria-expanded={!collapsed}
                  aria-keyshortcuts={SIDEBAR_TOGGLE_SHORTCUT_ARIA}
                  onClick={onToggleCollapsed}
                  className={cn(
                    'group flex h-8 w-full items-center rounded-lg text-xs transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
                    APP_SHELL_CLASSES.sidebarFocus,
                    collapsed
                      ? 'justify-center px-0 text-muted-foreground hover:bg-card hover:text-foreground'
                      : 'justify-between px-2 text-muted-foreground hover:bg-card hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {collapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronLeft size={14} className="shrink-0" />}
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
