import { useEffect } from 'react';

import { APP_TAB_SHORTCUTS } from '@/app/appConstants';
import type { AppTab } from '@/types';

type UseAppShortcutsParams = {
  canAccessSettings: boolean;
  canAccessAdmin: boolean;
  setActiveTab: (tab: AppTab) => void;
  setIsSearchOpen: (open: boolean) => void;
};

export const useAppShortcuts = ({
  canAccessSettings,
  canAccessAdmin,
  setActiveTab,
  setIsSearchOpen
}: UseAppShortcutsParams) => {
  useEffect(() => {
    const keyToTab = new Map<string, AppTab>([
      [APP_TAB_SHORTCUTS.cockpit, 'cockpit'],
      [APP_TAB_SHORTCUTS.dashboard, 'dashboard'],
      [APP_TAB_SHORTCUTS.settings, 'settings'],
      [APP_TAB_SHORTCUTS.admin, 'admin'],
      [APP_TAB_SHORTCUTS.clients, 'clients']
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') setIsSearchOpen(false);
      const mappedTab = keyToTab.get(event.key.toUpperCase());
      if (!mappedTab) {
        return;
      }

      event.preventDefault();
      if (mappedTab === 'settings' && !canAccessSettings) {
        return;
      }
      if (mappedTab === 'admin' && !canAccessAdmin) {
        return;
      }

      setActiveTab(mappedTab);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAccessAdmin, canAccessSettings, setActiveTab, setIsSearchOpen]);
};
