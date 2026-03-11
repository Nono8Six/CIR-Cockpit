import type { ReactNode } from 'react';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon
} from 'lucide-react';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type UiPocNavItem = {
  id: 'clients' | 'cockpit' | 'dashboard' | 'admin' | 'settings';
  label: string;
  icon: LucideIcon;
  sectionId: UiPocSidebarSection['id'];
  description: string;
};

export type UiPocSidebarSection = {
  id: 'clients' | 'interactions' | 'admin';
  title: string;
  items: UiPocNavItem[];
};

type SidebarContentProps = {
  sections: UiPocSidebarSection[];
  activeItemId: UiPocNavItem['id'];
  onSelectItem: (id: UiPocNavItem['id']) => void;
  collapsed: boolean;
  mobileAccountSlot?: ReactNode;
};

type UiPocSidebarProps = {
  sections: UiPocSidebarSection[];
  activeItemId: UiPocNavItem['id'];
  onSelectItem: (id: UiPocNavItem['id']) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  mobileAccountSlot?: ReactNode;
};

const DesktopRailToggle = ({
  collapsed,
  onToggleCollapsed
}: Pick<UiPocSidebarProps, 'collapsed' | 'onToggleCollapsed'>) => (
  <div className="pointer-events-none absolute inset-y-0 -right-[7px] hidden w-4 items-center md:flex">
    <button
      type="button"
      aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
      aria-expanded={!collapsed}
      onClick={onToggleCollapsed}
      className="pointer-events-auto inline-flex h-11 w-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
    </button>
  </div>
);

const NavItemButton = ({
  item,
  collapsed,
  isActive,
  onSelectItem
}: {
  item: UiPocNavItem;
  collapsed: boolean;
  isActive: boolean;
  onSelectItem: (id: UiPocNavItem['id']) => void;
}) => {
  const button = (
    <button
      type="button"
      onClick={() => onSelectItem(item.id)}
      className={cn(
        'group relative flex h-10 w-full items-center rounded-xl border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'border-primary/35 bg-primary/12 text-foreground shadow-[0_6px_20px_-16px_rgba(200,30,30,0.95)]'
          : 'border-transparent text-muted-foreground hover:border-border/80 hover:bg-card/85 hover:text-foreground',
        collapsed ? 'justify-center px-0' : 'gap-2.5'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={!collapsed ? undefined : `${item.sectionId} - ${item.label}`}
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
          <span className="truncate text-[11px] text-muted-foreground/80">{item.description}</span>
        </span>
      ) : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : null}
    </button>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
};

const SidebarContent = ({
  sections,
  activeItemId,
  onSelectItem,
  collapsed,
  mobileAccountSlot
}: SidebarContentProps) => (
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
              <span className="text-[11px] text-muted-foreground">POC navigation v2</span>
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
        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            {!collapsed ? (
              <p className="px-2 pb-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => (
              <NavItemButton
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={item.id === activeItemId}
                onSelectItem={onSelectItem}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  </TooltipProvider>
);

const UiPocSidebar = ({
  sections,
  activeItemId,
  onSelectItem,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  mobileAccountSlot
}: UiPocSidebarProps) => (
  <>
    <aside
      className={cn(
        'relative hidden border-r border-border/80 bg-[hsl(214,24%,95%)] transition-[width] duration-200 md:flex md:flex-col',
        collapsed ? 'w-[80px]' : 'w-[296px]'
      )}
    >
      <SidebarContent
        sections={sections}
        activeItemId={activeItemId}
        onSelectItem={onSelectItem}
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
          activeItemId={activeItemId}
          onSelectItem={(id) => {
            onSelectItem(id);
            onMobileOpenChange(false);
          }}
          collapsed={false}
          mobileAccountSlot={mobileAccountSlot}
        />
      </SheetContent>
    </Sheet>
  </>
);

export default UiPocSidebar;
