import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

import {
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
import { cn } from '@/lib/utils';
import type { AppTab } from '@/types';

type SidebarContentProps = {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  collapsed: boolean;
  onMobileOpenChange?: (open: boolean) => void;
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

const DesktopRailToggle = ({
  collapsed,
  onToggleCollapsed
}: Pick<AppSidebarProps, 'collapsed' | 'onToggleCollapsed'>) => {
  const actionLabel = collapsed ? 'D\u00E9plier la navigation' : 'Replier la navigation';
  const shortcutLabel = getSidebarToggleShortcutLabel();

  return (
    <div className="pointer-events-none absolute inset-y-0 -right-5 z-10 hidden w-10 items-center justify-center md:flex">
      <button
        type="button"
        aria-label={actionLabel}
        aria-expanded={!collapsed}
        aria-keyshortcuts={SIDEBAR_TOGGLE_SHORTCUT_ARIA}
        data-testid="app-sidebar-rail-toggle"
        title={`${actionLabel} (${shortcutLabel})`}
        onClick={onToggleCollapsed}
        className="group pointer-events-auto inline-flex h-16 w-10 touch-manipulation items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-12 w-5 items-center justify-center rounded-full border bg-card text-muted-foreground transition-[transform,border-color,background-color,color] duration-200 group-hover:-translate-x-px group-hover:border-primary/35 group-hover:text-foreground group-active:scale-[0.98]',
            collapsed ? 'border-border/85' : 'border-border/75'
          )}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </span>
      </button>
    </div>
  );
};

const NavItemLink = ({
  item,
  collapsed,
  isActive,
  onMobileOpenChange
}: {
  item: AppShellNavItem;
  collapsed: boolean;
  isActive: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) => {
  const link = (
    <Link
      to={getPathForTab(item.id)}
      onClick={() => onMobileOpenChange?.(false)}
      className={cn(
        'group relative flex h-10 w-full items-center rounded-xl border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary/35 bg-primary/12 text-foreground shadow-[0_6px_20px_-16px_rgba(200,30,30,0.95)]'
          : 'border-transparent text-muted-foreground hover:border-border/80 hover:bg-card/85 hover:text-foreground',
        collapsed ? 'justify-center px-0' : 'gap-2.5'
      )}
      activeProps={{ 'aria-current': 'page' }}
      aria-label={!collapsed ? undefined : `${item.sectionId} - ${item.label}`}
      data-testid={`app-shell-nav-${item.id}`}
    >
      {isActive && !collapsed ? (
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-4 w-1.5 rounded-full bg-primary/90"
        />
      ) : null}
      <item.icon size={15} className="shrink-0" />
      {!collapsed ? (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate font-medium">{item.label}</span>
          <span className="inline-flex items-center gap-1.5">
            {item.metaLabel ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {item.metaLabel}
              </span>
            ) : null}
            <span className="font-mono text-[10px] text-muted-foreground/80">{item.shortcut}</span>
          </span>
        </span>
      ) : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
};

const SidebarContent = ({
  sections,
  activeTab,
  collapsed,
  onMobileOpenChange,
  mobileAccountSlot
}: SidebarContentProps) => {
  const safeSections = Array.isArray(sections) ? sections : [];

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-gradient-to-b from-[hsl(210,38%,98%)] via-[hsl(215,32%,96%)] to-[hsl(218,22%,94%)] p-3">
        <div className={cn('mb-3 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-black text-white shadow-[0_8px_18px_-10px_rgba(200,30,30,0.9)]">
              C
            </span>
            {!collapsed ? (
              <div className="inline-flex min-w-0 flex-col">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  CIR Cockpit
                  <ChevronDown size={13} className="text-muted-foreground" />
                </span>
                <span className="text-[11px] text-muted-foreground">Navigation principale</span>
              </div>
            ) : null}
          </div>
        </div>

        {!collapsed && mobileAccountSlot ? (
          <div className="mb-3 rounded-xl border border-border/80 bg-card/90 p-3">
            {mobileAccountSlot}
          </div>
        ) : null}

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {safeSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!collapsed ? (
                <p className="px-2 pb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {section.title}
                </p>
              ) : null}
              {section.items.map((item) => (
                <NavItemLink
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  isActive={item.id === activeTab}
                  onMobileOpenChange={onMobileOpenChange}
                />
              ))}
            </div>
          ))}
        </nav>
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
}: AppSidebarProps) => (
  <>
    <aside
      className={cn(
        'relative hidden border-r border-border/80 bg-[hsl(214,24%,95%)] transition-[width] duration-200 md:flex md:flex-col',
        collapsed ? 'w-[80px]' : 'w-[296px]'
      )}
    >
      <SidebarContent
        sections={sections}
        activeTab={activeTab}
        collapsed={collapsed}
      />
      <DesktopRailToggle collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
    </aside>

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
        />
      </SheetContent>
    </Sheet>
  </>
);

export default AppSidebar;
