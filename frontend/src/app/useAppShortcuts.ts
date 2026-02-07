import { useEffect } from 'react';

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') setIsSearchOpen(false);
      if (event.key === 'F1') {
        event.preventDefault();
        setActiveTab('cockpit');
      }
      if (event.key === 'F2') {
        event.preventDefault();
        setActiveTab('dashboard');
      }
      if (event.key === 'F3') {
        event.preventDefault();
        if (canAccessSettings) setActiveTab('settings');
      }
      if (event.key === 'F4') {
        event.preventDefault();
        if (canAccessAdmin) setActiveTab('admin');
      }
      if (event.key === 'F5') {
        event.preventDefault();
        setActiveTab('clients');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAccessAdmin, canAccessSettings, setActiveTab, setIsSearchOpen]);
};
