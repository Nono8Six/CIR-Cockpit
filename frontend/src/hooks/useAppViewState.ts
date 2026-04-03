import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFn } from '@tanstack/react-router';

import { getPathForTab, getTabFromPathname } from '@/app/appRoutes';
import { useAppShortcuts } from '@/app/useAppShortcuts';
import { DEFAULT_DIRECTORY_SEARCH } from '@/components/client-directory/clientDirectorySearch';
import { prefetchAdminPanelQueries } from '@/services/query/queryPrefetch';
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
        params: { prospectId: entity.id },
        search: () => DEFAULT_DIRECTORY_SEARCH
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

  useEffect(() => {
    if ((activeTab === 'settings' && !canAccessSettings) || (activeTab === 'admin' && !canAccessAdmin)) {
      void navigate({ to: getPathForTab('cockpit'), replace: true });
    }
  }, [activeTab, canAccessAdmin, canAccessSettings, navigate]);

  useEffect(() => {
    if (activeTab === 'admin' && canAccessAdmin) {
      void prefetchAdminPanelQueries(queryClient);
    }
  }, [activeTab, canAccessAdmin, queryClient]);

  return {
    activeTab,
    isSearchOpen,
    searchQuery,
    isProfileMenuOpen,
    focusedClientId,
    focusedContactId,
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
