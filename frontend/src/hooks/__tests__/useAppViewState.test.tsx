import { QueryClient } from '@tanstack/react-query';
import type { NavigateFn } from '@tanstack/react-router';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppViewState } from '@/hooks/useAppViewState';
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

  renderHook(() =>
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

  return { navigate: navigateSpy };
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
});
