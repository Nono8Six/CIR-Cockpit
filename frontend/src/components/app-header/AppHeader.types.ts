import type { ReactNode, RefObject } from 'react';

import type {
  AgencyContext,
  AgencyMembershipSummary,
  AppTab,
  UserRole
} from '@/types';

export type NavigationTab = {
  value: AppTab;
  icon: ReactNode;
  label: ReactNode;
  ariaLabel: string;
  badge?: ReactNode | null;
};

export type AppHeaderProps = {
  agencyContext: AgencyContext | null;
  agencyMemberships: AgencyMembershipSummary[];
  hasMultipleAgencies: boolean;
  userRole: UserRole;
  sessionEmail: string;
  profileLoading: boolean;
  isContextRefreshing: boolean;
  activeTab: AppTab;
  navigationTabs: NavigationTab[];
  isSettingsDisabled: boolean;
  isProfileMenuOpen: boolean;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  hasProfileMenu: boolean;
  roleLabels: Record<UserRole, string>;
  roleBadgeStyles: Record<UserRole, string>;
  onTabChange: (tab: AppTab) => void;
  onAgencyChange: (agencyId: string) => void;
  onOpenSearch: () => void;
  onToggleProfileMenu: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};
