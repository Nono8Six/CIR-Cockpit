import type { RefObject } from 'react';
import { User } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AppHeaderProfileMenuProps = {
  sessionEmail: string;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  isProfileMenuOpen: boolean;
  hasProfileMenu: boolean;
  isSettingsDisabled: boolean;
  onToggleProfileMenu: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

const AppHeaderProfileMenu = ({
  sessionEmail,
  profileMenuRef,
  isProfileMenuOpen,
  hasProfileMenu,
  isSettingsDisabled,
  onToggleProfileMenu,
  onOpenSettings,
  onSignOut
}: AppHeaderProfileMenuProps) => (
  <div className="flex items-center gap-2 sm:gap-3">
    <span
      title={sessionEmail}
      className="hidden max-w-[220px] truncate text-xs text-muted-foreground xl:inline"
    >
      {sessionEmail}
    </span>
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        data-testid="app-header-profile-button"
        className={`h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          hasProfileMenu ? 'hover:bg-muted' : 'cursor-default'
        }`}
        onClick={onToggleProfileMenu}
        aria-haspopup="menu"
        aria-expanded={isProfileMenuOpen}
        aria-label="Ouvrir le menu profil"
      >
        <User size={16} aria-hidden="true" />
      </button>
      {isProfileMenuOpen && hasProfileMenu && (
        <div
          className="absolute right-0 z-30 mt-2 w-44 rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          <Button
            type="button"
            variant="ghost"
            className={`w-full justify-start px-3 py-2 text-sm ${
              isSettingsDisabled ? 'text-muted-foreground/70 cursor-not-allowed' : 'text-muted-foreground'
            }`}
            role="menuitem"
            disabled={isSettingsDisabled}
            aria-disabled={isSettingsDisabled}
            onClick={onOpenSettings}
          >
            Paramètres
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-sm text-muted-foreground"
            role="menuitem"
            onClick={onSignOut}
          >
            Déconnexion
          </Button>
        </div>
      )}
    </div>
  </div>
);

export default AppHeaderProfileMenu;
