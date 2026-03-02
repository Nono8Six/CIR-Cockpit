import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsersManager } from '@/hooks/useUsersManager';
import { notifySuccess } from '@/services/errors/notify';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';

const usersMocks = vi.hoisted(() => ({
  useAdminUsers: vi.fn(),
  useAgencies: vi.fn(),
  useCreateAdminUser: vi.fn(),
  useSetUserRole: vi.fn(),
  useSetUserMemberships: vi.fn(),
  useResetUserPassword: vi.fn(),
  useArchiveUser: vi.fn(),
  useUnarchiveUser: vi.fn(),
  useUpdateUserIdentity: vi.fn(),
  useDeleteUser: vi.fn()
}));

vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUsers: usersMocks.useAdminUsers
}));
vi.mock('@/hooks/useAgencies', () => ({
  useAgencies: usersMocks.useAgencies
}));
vi.mock('@/hooks/useCreateAdminUser', () => ({
  useCreateAdminUser: usersMocks.useCreateAdminUser
}));
vi.mock('@/hooks/useSetUserRole', () => ({
  useSetUserRole: usersMocks.useSetUserRole
}));
vi.mock('@/hooks/useSetUserMemberships', () => ({
  useSetUserMemberships: usersMocks.useSetUserMemberships
}));
vi.mock('@/hooks/useResetUserPassword', () => ({
  useResetUserPassword: usersMocks.useResetUserPassword
}));
vi.mock('@/hooks/useArchiveUser', () => ({
  useArchiveUser: usersMocks.useArchiveUser
}));
vi.mock('@/hooks/useUnarchiveUser', () => ({
  useUnarchiveUser: usersMocks.useUnarchiveUser
}));
vi.mock('@/hooks/useUpdateUserIdentity', () => ({
  useUpdateUserIdentity: usersMocks.useUpdateUserIdentity
}));
vi.mock('@/hooks/useDeleteUser', () => ({
  useDeleteUser: usersMocks.useDeleteUser
}));

vi.mock('@/services/errors/notify', () => ({
  notifySuccess: vi.fn()
}));

const createUser = (overrides?: Partial<AdminUserSummary>): AdminUserSummary => ({
  id: overrides?.id ?? 'user-1',
  email: overrides?.email ?? 'user@example.com',
  display_name: overrides?.display_name ?? 'Alice Martin',
  first_name: overrides?.first_name ?? 'Alice',
  last_name: overrides?.last_name ?? 'Martin',
  role: overrides?.role ?? 'tcs',
  archived_at: overrides?.archived_at ?? null,
  created_at: overrides?.created_at ?? '2026-01-01T10:00:00.000Z',
  memberships: overrides?.memberships ?? []
});

describe('useUsersManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usersMocks.useAdminUsers.mockReturnValue({
      data: [createUser(), createUser({ id: 'user-2', email: 'archived@example.com', archived_at: '2026-01-10T10:00:00.000Z' })]
    });
    usersMocks.useAgencies.mockReturnValue({ data: [] });
    usersMocks.useCreateAdminUser.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ temporary_password: 'Temp#123' }) });
    usersMocks.useSetUserRole.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    usersMocks.useSetUserMemberships.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    usersMocks.useResetUserPassword.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ temporary_password: 'Temp#123' }) });
    usersMocks.useArchiveUser.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    usersMocks.useUnarchiveUser.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    usersMocks.useUpdateUserIdentity.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined) });
    usersMocks.useDeleteUser.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ anonymized_interactions: 0 }) });
  });

  it('creates a user and exposes temporary password dialog state', async () => {
    const { result } = renderHook(() => useUsersManager());

    await act(async () => {
      await result.current.handleCreateUser({
        email: 'new@example.com',
        first_name: 'Nouveau',
        last_name: 'Compte',
        role: 'tcs',
        agency_ids: []
      });
    });

    expect(notifySuccess).toHaveBeenCalledWith('Utilisateur cree.');
    expect(result.current.passwordDialogOpen).toBe(true);
    expect(result.current.tempPassword).toBe('Temp#123');
  });

  it('swallows role-change mutation errors without crashing', async () => {
    usersMocks.useSetUserRole.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom'))
    });
    const { result } = renderHook(() => useUsersManager());

    await act(async () => {
      await result.current.handleRoleChange('user-1', 'agency_admin');
    });

    expect(notifySuccess).not.toHaveBeenCalledWith('Role mis a jour.');
  });

  it('reports anonymized interactions count on delete', async () => {
    usersMocks.useDeleteUser.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ anonymized_interactions: 3 })
    });

    const { result } = renderHook(() => useUsersManager());
    act(() => {
      result.current.handleDeleteUser(createUser());
    });
    await act(async () => {
      await result.current.executeDeleteUser();
    });

    expect(notifySuccess).toHaveBeenCalledWith(
      'Utilisateur supprime. 3 interaction(s) reattribuee(s).'
    );
  });
});
