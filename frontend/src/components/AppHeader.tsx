import { memo } from 'react';
import type { AppHeaderProps } from './app-header/AppHeader.types';
import AppHeaderBrandSection from './app-header/AppHeaderBrandSection';
import AppHeaderTabsSection from './app-header/AppHeaderTabsSection';
import AppHeaderStatusSection from './app-header/AppHeaderStatusSection';
import AppHeaderSearchButton from './app-header/AppHeaderSearchButton';
import AppHeaderProfileMenu from './app-header/AppHeaderProfileMenu';

const AppHeader = ({
  agencyContext,
  agencyMemberships,
  hasMultipleAgencies,
  userRole,
  sessionEmail,
  profileLoading,
  isContextRefreshing,
  activeTab,
  navigationTabs,
  isSettingsDisabled,
  isProfileMenuOpen,
  profileMenuRef,
  hasProfileMenu,
  roleLabels,
  roleBadgeStyles,
  onTabChange,
  onAgencyChange,
  onOpenSearch,
  onSearchIntent,
  onToggleProfileMenu,
  onOpenSettings,
  onSignOut
}: AppHeaderProps) => {
  return (
    <header className="z-20 flex h-14 shrink-0 items-center border-b border-border bg-card px-3 shadow-sm sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-4">
        <div className="shrink-0">
          <AppHeaderBrandSection
            agencyContext={agencyContext}
            agencyMemberships={agencyMemberships}
            hasMultipleAgencies={hasMultipleAgencies}
            userRole={userRole}
            roleLabels={roleLabels}
            roleBadgeStyles={roleBadgeStyles}
            onAgencyChange={onAgencyChange}
          />
        </div>
        <div className="min-w-0 flex-1">
          <AppHeaderTabsSection
            activeTab={activeTab}
            navigationTabs={navigationTabs}
            onTabChange={onTabChange}
          />
        </div>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-2 sm:gap-3">
        <AppHeaderStatusSection
          profileLoading={profileLoading}
          isContextRefreshing={isContextRefreshing}
        />
        <AppHeaderSearchButton onOpenSearch={onOpenSearch} onSearchIntent={onSearchIntent} />
        <AppHeaderProfileMenu
          sessionEmail={sessionEmail}
          profileMenuRef={profileMenuRef}
          isProfileMenuOpen={isProfileMenuOpen}
          hasProfileMenu={hasProfileMenu}
          isSettingsDisabled={isSettingsDisabled}
          onToggleProfileMenu={onToggleProfileMenu}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
};

export default memo(AppHeader);
export type { NavigationTab } from './app-header/AppHeader.types';
