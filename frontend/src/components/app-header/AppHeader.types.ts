import type { RefObject } from 'react';

import type { AppShellNavSection } from '@/app/appConstants';
import type { AgencyContext, AgencyMembershipSummary, AppTab } from '@/types';

export type AppHeaderProps = {
  sections: AppShellNavSection[];
  activeTab: AppTab;
  activeSectionLabel: string;
  activeItemLabel: string;
  agencyContext: AgencyContext | null;
  agencyMemberships: AgencyMembershipSummary[];
  hasMultipleAgencies: boolean;
  sessionEmail: string;
  userFullName: string;
  userInitials: string;
  userRoleLabel: string;
  profileLoading: boolean;
  isContextRefreshing: boolean;
  isSettingsDisabled: boolean;
  isProfileMenuOpen: boolean;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  onAgencyChange: (agencyId: string) => void;
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
  onProfileMenuOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenAccountPanel: () => void;
  onSignOut: () => void;
  onBackToCockpit: () => void;
  onOpenMobileMenu: () => void;
};
