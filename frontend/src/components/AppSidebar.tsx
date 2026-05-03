import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';

import type { AppShellNavSection } from '@/app/appConstants';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { AppTab } from '@/types';

import AppSidebarContent from './app-sidebar/AppSidebarContent';

export interface AppSidebarProps {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  agencyName?: string;
  agencySubtitle?: string;
  userName?: string;
  userRoleLabel?: string;
  userInitials?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  mobileAccountSlot?: ReactNode;
}

const AppSidebar = ({
  sections,
  activeTab,
  agencyName,
  agencySubtitle,
  userName,
  userRoleLabel,
  userInitials,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  mobileAccountSlot,
}: AppSidebarProps) => {
  const reducedMotion = useReducedMotion() ?? false;
  const sidebarTransition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 350, damping: 35 };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 48 : 232 }}
        transition={sidebarTransition}
        className="relative hidden overflow-hidden border-r border-border bg-surface-2 md:flex md:flex-col"
      >
        <AppSidebarContent
          sections={sections}
          activeTab={activeTab}
          agencyName={agencyName}
          agencySubtitle={agencySubtitle}
          userName={userName}
          userRoleLabel={userRoleLabel}
          userInitials={userInitials}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      </motion.aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(88vw,360px)] border-r border-border/80 p-0 [overscroll-behavior:contain]"
        >
          <AppSidebarContent
            sections={sections}
            activeTab={activeTab}
            agencyName={agencyName}
            agencySubtitle={agencySubtitle}
            userName={userName}
            userRoleLabel={userRoleLabel}
            userInitials={userInitials}
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
