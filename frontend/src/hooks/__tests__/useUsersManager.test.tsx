import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsersManager } from '../admin/users/identity/useUsersManager';
import { notifySuccess } from '@/services/errors/notifySuccess';
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
  useUpdateUserIdentity: vi.fn()
}));

vi.mock('@/hooks/admin/users/access/useAdminUsers', () => ({
  useAdminUsers: usersMocks.useAdminUsers
}));
vi.mock('@/hooks/admin/agencies/core/useAgencies', () => ({
  useAgencies: usersMocks.useAgencies
}));
vi.mock('@/hooks/admin/users/identity/useCreateAdminUser', () => ({
  useCreateAdminUser: usersMocks.useCreateAdminUser
}));
vi.mock('@/hooks/admin/users/access/useSetUserRole', () => ({
  useSetUserRole: usersMocks.useSetUserRole
}));
vi.mock('@/hooks/admin/users/access/useSetUserMemberships', () => ({
  useSetUserMemberships: usersMocks.useSetUserMemberships
}));
vi.mock('@/hooks/admin/users/access/useResetUserPassword', () => ({
  useResetUserPassword: usersMocks.useResetUserPassword
}));
vi.mock('@/hooks/admin/users/access/useArchiveUser', () => ({
  useArchiveUser: usersMocks.useArchiveUser
}));
vi.mock('@/hooks/admin/users/access/useUnarchiveUser', () => ({
  useUnarchiveUser: usersMocks.useUnarchiveUser
}));
vi.mock('@/hooks/admin/users/identity/useUpdateUserIdentity', () => ({
  useUpdateUserIdentity: usersMocks.useUpdateUserIdentity
}));

vi.mock('@/services/errors/notifySuccess', () => ({ notifySuccess: vi.fn() }));

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

    expect(notifySuccess).toHaveBeenCalledWith('Utilisateur créé.');
    expect(result.current.passwordDialogOpen).toBe(true);
    expect(result.current.tempPassword).toBe('Temp#123');
  });

  it('swallows role-change mutation errors without crashing', async () => {
    usersMocks.useSetUserRole.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('boom'))
    });
    const { result } = renderHook(() => useUsersManager());

    act(() => {
      result.current.openRoleChangeDialog(createUser());
    });
    await act(async () => {
      await result.current.executeRoleChange('agency_admin');
    });

    expect(notifySuccess).not.toHaveBeenCalled();
    expect(result.current.roleChangeUser).not.toBeNull();
  });

  it('ne change aucun role tant que le dialog de confirmation n a pas ete ouvert', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    usersMocks.useSetUserRole.mockReturnValue({ mutateAsync });
    const { result } = renderHook(() => useUsersManager());

    await act(async () => {
      await result.current.executeRoleChange('super_admin');
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('applique l elevation de privilege et nomme les deux roles apres confirmation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    usersMocks.useSetUserRole.mockReturnValue({ mutateAsync });
    const { result } = renderHook(() => useUsersManager());

    act(() => {
      result.current.openRoleChangeDialog(createUser({ role: 'tcs' }));
    });
    await act(async () => {
      await result.current.executeRoleChange('super_admin');
    });

    expect(mutateAsync).toHaveBeenCalledWith({ userId: 'user-1', role: 'super_admin' });
    expect(notifySuccess).toHaveBeenCalledWith('Rôle mis à jour : TCS → Super admin.');
    expect(result.current.roleChangeUser).toBeNull();
  });

  it('archive un utilisateur apres confirmation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    usersMocks.useArchiveUser.mockReturnValue({ mutateAsync });
    const user = createUser();
    const { result } = renderHook(() => useUsersManager());

    act(() => {
      result.current.handleArchiveToggle(user);
    });
    await act(async () => {
      await result.current.executeArchiveToggle();
    });

    expect(mutateAsync).toHaveBeenCalledWith(user.id);
    expect(notifySuccess).toHaveBeenCalledWith('Utilisateur archivé.');
  });

  describe('multi-selection and bulk actions', () => {
    it('toggles selection of single users and clears selection', () => {
      const { result } = renderHook(() => useUsersManager());

      expect(result.current.selectedUserIds).toEqual([]);

      act(() => {
        result.current.toggleSelectUser('user-1');
      });
      expect(result.current.selectedUserIds).toEqual(['user-1']);

      act(() => {
        result.current.toggleSelectUser('user-2');
      });
      expect(result.current.selectedUserIds).toEqual(['user-1', 'user-2']);

      act(() => {
        result.current.toggleSelectUser('user-1');
      });
      expect(result.current.selectedUserIds).toEqual(['user-2']);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedUserIds).toEqual([]);
    });

    it('toggles selection for all visible users', () => {
      const { result } = renderHook(() => useUsersManager());
      const visibleUsers = [
        createUser({ id: 'user-1' }),
        createUser({ id: 'user-2' })
      ];

      act(() => {
        result.current.toggleSelectAll(visibleUsers);
      });
      expect(result.current.selectedUserIds).toEqual(['user-1', 'user-2']);

      act(() => {
        result.current.toggleSelectAll(visibleUsers);
      });
      expect(result.current.selectedUserIds).toEqual([]);
    });

    it('executes bulk archiving successfully', async () => {
      const archiveMutateMock = vi.fn().mockResolvedValue(undefined);
      usersMocks.useArchiveUser.mockReturnValue({ mutateAsync: archiveMutateMock });

      const { result } = renderHook(() => useUsersManager());

      act(() => {
        result.current.handleBulkArchive(['user-1', 'user-2'], true);
      });
      expect(result.current.confirmBulkArchive).toEqual({
        userIds: ['user-1', 'user-2'],
        nextArchived: true
      });

      await act(async () => {
        await result.current.executeBulkArchive();
      });

      expect(archiveMutateMock).toHaveBeenCalledTimes(2);
      expect(notifySuccess).toHaveBeenCalledWith('2 utilisateur(s) archivé(s).');
      expect(result.current.selectedUserIds).toEqual([]);
      expect(result.current.confirmBulkArchive).toBeNull();
    });

  });
});
