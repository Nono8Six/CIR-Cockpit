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
  onToggleProfileMenu,
  onOpenSettings,
  onSignOut
}: AppHeaderProps) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
      <div className="flex items-center gap-6 min-w-0 flex-1">
        <AppHeaderBrandSection
          agencyContext={agencyContext}
          agencyMemberships={agencyMemberships}
          hasMultipleAgencies={hasMultipleAgencies}
          userRole={userRole}
          roleLabels={roleLabels}
          roleBadgeStyles={roleBadgeStyles}
          onAgencyChange={onAgencyChange}
        />
        <AppHeaderTabsSection
          activeTab={activeTab}
          navigationTabs={navigationTabs}
          onTabChange={onTabChange}
        />
      </div>

      <div className="flex items-center gap-4 min-w-0">
        <AppHeaderStatusSection
          profileLoading={profileLoading}
          isContextRefreshing={isContextRefreshing}
        />
        <AppHeaderSearchButton onOpenSearch={onOpenSearch} />
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

export default AppHeader;
export type { NavigationTab } from './app-header/AppHeader.types';
