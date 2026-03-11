import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFn } from '@tanstack/react-router';

import { getPathForTab, getTabFromPathname } from '@/app/appRoutes';
import { useAppShortcuts } from '@/app/useAppShortcuts';
import { useProfileMenuDismiss } from '@/app/useProfileMenuDismiss';
import { prefetchAdminPanelQueries, prefetchClientsPanelQueries } from '@/services/query/queryPrefetch';
import type { AppTab } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

type UseAppViewStateParams = {
  pathname: string;
  navigate: NavigateFn;
  queryClient: QueryClient;
  activeAgencyId: string | null;
  canAccessAdmin: boolean;
  canAccessSettings: boolean;
  onSearchOpen?: () => void;
};

export const useAppViewState = ({
  pathname,
  navigate,
  queryClient,
  activeAgencyId,
  canAccessAdmin,
  canAccessSettings,
  onSearchOpen
}: UseAppViewStateParams) => {
  const activeTab = useMemo<AppTab>(() => getTabFromPathname(pathname), [pathname]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [focusedClientId, setFocusedClientId] = useState<string | null>(null);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const handleTabChange = useCallback(
    (tab: AppTab) => {
      void navigate({ to: getPathForTab(tab) });
    },
    [navigate]
  );

  const handleSearchOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        onSearchOpen?.();
      }
      setIsSearchOpen(open);
    },
    [onSearchOpen]
  );

  const handleOpenSearch = useCallback(() => {
    onSearchOpen?.();
    setIsSearchOpen(true);
  }, [onSearchOpen]);

  const handleRequestConvert = useCallback(
    (entity: ConvertClientEntity) => {
      setIsSearchOpen(false);
      setSearchQuery('');
      if (!entity.id) {
        return;
      }

      void navigate({
        to: '/clients/prospects/$prospectId/convert',
        params: { prospectId: entity.id }
      });
    },
    [navigate]
  );

  useAppShortcuts({
    canAccessAdmin,
    canAccessSettings,
    setActiveTab: handleTabChange,
    setIsSearchOpen: handleSearchOpenChange
  });
  useProfileMenuDismiss(profileMenuRef, isProfileMenuOpen, setIsProfileMenuOpen);

  useEffect(() => {
    if ((activeTab === 'settings' && !canAccessSettings) || (activeTab === 'admin' && !canAccessAdmin)) {
      void navigate({ to: getPathForTab('cockpit'), replace: true });
    }
  }, [activeTab, canAccessAdmin, canAccessSettings, navigate]);

  useEffect(() => {
    if (activeTab === 'clients' && activeAgencyId) {
      void prefetchClientsPanelQueries(queryClient, activeAgencyId);
    }
    if (activeTab === 'admin' && canAccessAdmin) {
      void prefetchAdminPanelQueries(queryClient);
    }
  }, [activeAgencyId, activeTab, canAccessAdmin, queryClient]);

  return {
    activeTab,
    isSearchOpen,
    searchQuery,
    isProfileMenuOpen,
    focusedClientId,
    focusedContactId,
    profileMenuRef,
    setSearchQuery,
    setIsProfileMenuOpen,
    setFocusedClientId,
    setFocusedContactId,
    handleTabChange,
    handleSearchOpenChange,
    handleOpenSearch,
    handleRequestConvert
  };
};
