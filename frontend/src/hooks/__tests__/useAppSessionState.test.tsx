import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useAppSessionState } from '@/hooks/useAppSessionState';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';

const authMocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
    getProfile: vi.fn(),
    getAgencyMemberships: vi.fn(),
    getProfileActiveAgencyId: vi.fn(),
    setProfileActiveAgencyId: vi.fn(),
    setActiveAgencyId: vi.fn(),
    unsubscribe
  };
});

vi.mock('@/services/auth/getSession', () => ({
  getSession: authMocks.getSession
}));

vi.mock('@/services/auth/onAuthStateChange', () => ({
  onAuthStateChange: authMocks.onAuthStateChange
}));

vi.mock('@/services/auth/signOut', () => ({
  signOut: authMocks.signOut
}));

vi.mock('@/services/auth/getProfile', () => ({
  getProfile: authMocks.getProfile
}));

vi.mock('@/services/agency/getAgencyMemberships', () => ({
  getAgencyMemberships: authMocks.getAgencyMemberships
}));

vi.mock('@/services/agency/getProfileActiveAgencyId', () => ({
  getProfileActiveAgencyId: authMocks.getProfileActiveAgencyId
}));

vi.mock('@/services/agency/setProfileActiveAgencyId', () => ({
  setProfileActiveAgencyId: authMocks.setProfileActiveAgencyId
}));

vi.mock('@/services/agency/getActiveAgencyContext', () => ({
  setActiveAgencyId: authMocks.setActiveAgencyId
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn((error, fallbackMessage) =>
    createAppError({
      code: 'UNKNOWN_ERROR',
      message: fallbackMessage,
      source: 'client',
      cause: error
    })
  )
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseAppSessionStateTestWrapper';
  return Wrapper;
};

describe('useAppSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.onAuthStateChange.mockReturnValue({
      unsubscribe: authMocks.unsubscribe
    });
    authMocks.signOut.mockResolvedValue(undefined);
    authMocks.getProfileActiveAgencyId.mockResolvedValue(null);
    authMocks.setProfileActiveAgencyId.mockResolvedValue({
      isErr: () => false
    });
  });

  it('hydrates session, profile and agency context', async () => {
    authMocks.getSession.mockResolvedValue({
      user: {
        id: 'user-1'
      }
    });
    authMocks.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'User',
      first_name: 'User',
      last_name: 'Test',
      role: 'agency_admin',
      must_change_password: false,
      password_changed_at: null
    });
    authMocks.getAgencyMemberships.mockResolvedValue([
      { agency_id: 'agency-1', agency_name: 'Agence A' },
      { agency_id: 'agency-2', agency_name: 'Agence B' }
    ]);

    const { result } = renderHook(() => useAppSessionState(), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.state.canLoadData).toBe(true);
    });
    expect(result.current.state.activeAgencyId).toBe('agency-1');
    expect(authMocks.setActiveAgencyId).toHaveBeenCalledWith('agency-1');

    let switched = false;
    await act(async () => {
      switched = await result.current.actions.changeActiveAgency('agency-2');
    });
    expect(switched).toBe(true);
    expect(authMocks.setActiveAgencyId).toHaveBeenCalledWith('agency-2');
  });

  it('handles session bootstrap failures', async () => {
    authMocks.getSession.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useAppSessionState(), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.state.authReady).toBe(true);
    });
    expect(result.current.state.session).toBeNull();
    expect(handleUiError).toHaveBeenCalledTimes(1);
  });

  it('keeps data loading disabled when password change is mandatory', async () => {
    authMocks.getSession.mockResolvedValue({
      user: {
        id: 'user-1'
      }
    });
    authMocks.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      display_name: 'User',
      first_name: 'User',
      last_name: 'Test',
      role: 'tcs',
      must_change_password: true,
      password_changed_at: null
    });
    authMocks.getAgencyMemberships.mockResolvedValue([
      { agency_id: 'agency-1', agency_name: 'Agence A' }
    ]);

    const { result } = renderHook(() => useAppSessionState(), {
      wrapper: buildWrapper()
    });

    await waitFor(() => {
      expect(result.current.state.mustChangePassword).toBe(true);
    });
    expect(result.current.state.canLoadData).toBe(false);
    expect(result.current.state.agencyContext).toBeNull();
  });
});
