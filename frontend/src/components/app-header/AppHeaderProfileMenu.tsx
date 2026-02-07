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
  <div className="flex items-center gap-3">
    <span className="hidden md:inline text-xs text-slate-500 truncate max-w-[160px]">
      {sessionEmail}
    </span>
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        className={`w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
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
          className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-30"
          role="menu"
        >
          <Button
            type="button"
            variant="ghost"
            className={`w-full justify-start px-3 py-2 text-xs ${
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
            className="w-full justify-start px-3 py-2 text-xs text-slate-600"
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
