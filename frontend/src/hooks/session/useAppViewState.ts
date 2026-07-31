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
  isAccessControlReady: boolean;
  canAccessAdmin: boolean;
  canAccessSettings: boolean;
  onSearchOpen?: () => void;
};

export const useAppViewState = ({
  pathname,
  navigate,
  queryClient,
  isAccessControlReady,
  canAccessAdmin,
  canAccessSettings,
  onSearchOpen
}: UseAppViewStateParams) => {
  const activeTab = useMemo<AppTab>(() => getTabFromPathname(pathname), [pathname]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // La palette reste montee une fois ouverte : la demonter a la fermeture
  // empeche Radix de rendre le focus au declencheur.
  const [hasOpenedSearch, setHasOpenedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [focusedClientId, setFocusedClientId] = useState<string | null>(null);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [includeArchivedSearch, setIncludeArchivedSearch] = useState(false);

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
        setHasOpenedSearch(true);
      } else {
        // L'elargissement aux archives est une sortie d'impasse ponctuelle,
        // pas une preference : la palette repart toujours sur le perimetre actif.
        setIncludeArchivedSearch(false);
        // Sans remise a zero, la palette rouvre sur l'ancienne requete et les recents restent caches.
        setSearchQuery('');
      }
      setIsSearchOpen(open);
    },
    [onSearchOpen]
  );

  const handleOpenSearch = useCallback(() => {
    onSearchOpen?.();
    setHasOpenedSearch(true);
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

  const handleCreateEntity = useCallback(() => {
    setIsSearchOpen(false);
    void navigate({ to: '/clients/new', search: () => DEFAULT_DIRECTORY_SEARCH });
  }, [navigate]);

  const handleCreateSupplier = useCallback(() => {
    setIsSearchOpen(false);
    void navigate({ to: '/suppliers/new' });
  }, [navigate]);

  useAppShortcuts({
    canAccessAdmin,
    canAccessSettings,
    setActiveTab: handleTabChange,
    setIsSearchOpen: handleSearchOpenChange
  });

  useEffect(() => {
    if (!isAccessControlReady) {
      return;
    }

    if (
      (activeTab === 'settings' && !canAccessSettings)
      || (activeTab === 'admin' && !canAccessAdmin)
      || (activeTab === 'suppliers' && !canAccessAdmin)
    ) {
      void navigate({ to: getPathForTab('cockpit'), replace: true });
    }
  }, [activeTab, canAccessAdmin, canAccessSettings, isAccessControlReady, navigate]);

  useEffect(() => {
    if (activeTab === 'admin' && canAccessAdmin) {
      void prefetchAdminPanelQueries(queryClient);
    }
  }, [activeTab, canAccessAdmin, queryClient]);

  return {
    activeTab,
    isSearchOpen,
    hasOpenedSearch,
    searchQuery,
    isProfileMenuOpen,
    focusedClientId,
    focusedContactId,
    includeArchivedSearch,
    setSearchQuery,
    setIsProfileMenuOpen,
    setFocusedClientId,
    setFocusedContactId,
    setIncludeArchivedSearch,
    handleTabChange,
    handleSearchOpenChange,
    handleOpenSearch,
    handleRequestConvert,
    handleCreateEntity,
    handleCreateSupplier
  };
};
