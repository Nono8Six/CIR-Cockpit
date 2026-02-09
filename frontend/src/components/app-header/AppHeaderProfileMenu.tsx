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
      className="hidden max-w-[220px] truncate text-xs text-slate-500 xl:inline"
    >
      {sessionEmail}
    </span>
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        data-testid="app-header-profile-button"
        className={`h-9 w-9 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          hasProfileMenu ? 'hover:bg-slate-200' : 'cursor-default'
        }`}
        onClick={onToggleProfileMenu}
        aria-haspopup="menu"
        aria-expanded={isProfileMenuOpen}
        aria-label="Ouvrir le menu profil"
      >
        <User size={16} />
      </button>
      {isProfileMenuOpen && hasProfileMenu && (
        <div
          className="absolute right-0 z-30 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <Button
            type="button"
            variant="ghost"
            className={`w-full justify-start px-3 py-2 text-sm ${
              isSettingsDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600'
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
            className="w-full justify-start px-3 py-2 text-sm text-slate-600"
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
