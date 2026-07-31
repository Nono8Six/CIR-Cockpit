import { QueryClient } from '@tanstack/react-query';
import type { NavigateFn } from '@tanstack/react-router';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppViewState } from '../session/useAppViewState';
import { prefetchAdminPanelQueries } from '@/services/query/queryPrefetch';

vi.mock('@/services/query/queryPrefetch', () => ({
  prefetchAdminPanelQueries: vi.fn()
}));

type RenderViewStateOptions = {
  pathname: string;
  isAccessControlReady: boolean;
  canAccessAdmin: boolean;
  canAccessSettings: boolean;
};

const renderViewState = ({
  pathname,
  isAccessControlReady,
  canAccessAdmin,
  canAccessSettings
}: RenderViewStateOptions) => {
  const navigateSpy = vi.fn<(_: unknown) => void>();
  const navigate: NavigateFn = (options) => {
    navigateSpy(options);
    return Promise.resolve();
  };
  const queryClient = new QueryClient();

  const view = renderHook(() =>
    useAppViewState({
      pathname,
      navigate,
      queryClient,
      activeAgencyId: 'agency-1',
      isAccessControlReady,
      canAccessAdmin,
      canAccessSettings
    })
  );

  return { navigate: navigateSpy, result: view.result };
};

describe('useAppViewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attend la resolution du profil avant de rediriger admin', async () => {
    const { navigate } = renderViewState({
      pathname: '/admin',
      isAccessControlReady: false,
      canAccessAdmin: false,
      canAccessSettings: false
    });

    await Promise.resolve();

    expect(navigate).not.toHaveBeenCalled();
    expect(prefetchAdminPanelQueries).not.toHaveBeenCalled();
  });

  it('conserve la route admin quand le super admin est resolu', async () => {
    const { navigate } = renderViewState({
      pathname: '/admin',
      isAccessControlReady: true,
      canAccessAdmin: true,
      canAccessSettings: true
    });

    await waitFor(() => expect(prefetchAdminPanelQueries).toHaveBeenCalledTimes(1));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('conserve la route parametres quand un admin agence est resolu', async () => {
    const { navigate } = renderViewState({
      pathname: '/settings',
      isAccessControlReady: true,
      canAccessAdmin: true,
      canAccessSettings: true
    });

    await Promise.resolve();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige les vrais profils tcs hors admin', async () => {
    const { navigate } = renderViewState({
      pathname: '/admin',
      isAccessControlReady: true,
      canAccessAdmin: false,
      canAccessSettings: false
    });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/cockpit', replace: true })
    );
  });

  it('garde la palette montee et repart a neuf a chaque fermeture', () => {
    const { result } = renderViewState({
      pathname: '/cockpit',
      isAccessControlReady: true,
      canAccessAdmin: true,
      canAccessSettings: true
    });

    expect(result.current.hasOpenedSearch).toBe(false);

    act(() => {
      result.current.handleOpenSearch();
    });
    act(() => {
      result.current.setSearchQuery('@alice');
      result.current.setIncludeArchivedSearch(true);
    });

    expect(result.current.isSearchOpen).toBe(true);
    expect(result.current.hasOpenedSearch).toBe(true);

    act(() => {
      result.current.handleSearchOpenChange(false);
    });

    expect(result.current.isSearchOpen).toBe(false);
    // La palette reste montee pour que Radix rende le focus au declencheur.
    expect(result.current.hasOpenedSearch).toBe(true);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.includeArchivedSearch).toBe(false);
  });

  it('ouvre les parcours de creation existants depuis la palette', () => {
    const { navigate, result } = renderViewState({
      pathname: '/cockpit',
      isAccessControlReady: true,
      canAccessAdmin: true,
      canAccessSettings: true
    });

    act(() => {
      result.current.handleCreateEntity();
    });
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/clients/new' }));

    act(() => {
      result.current.handleCreateSupplier();
    });
    expect(navigate).toHaveBeenCalledWith({ to: '/suppliers/new' });
    expect(result.current.isSearchOpen).toBe(false);
  });

  it('redirige les vrais profils tcs hors fournisseurs', async () => {
    const { navigate } = renderViewState({
      pathname: '/suppliers',
      isAccessControlReady: true,
      canAccessAdmin: false,
      canAccessSettings: false
    });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/cockpit', replace: true })
    );
  });
});
