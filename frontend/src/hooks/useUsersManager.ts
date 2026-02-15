import { useMemo, useState } from 'react';

import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAgencies } from '@/hooks/useAgencies';
import { useArchiveUser } from '@/hooks/useArchiveUser';
import { useCreateAdminUser } from '@/hooks/useCreateAdminUser';
import { useDeleteUser } from '@/hooks/useDeleteUser';
import { useResetUserPassword } from '@/hooks/useResetUserPassword';
import { useSetUserMemberships } from '@/hooks/useSetUserMemberships';
import { useSetUserRole } from '@/hooks/useSetUserRole';
import { useUnarchiveUser } from '@/hooks/useUnarchiveUser';
import { useUpdateUserIdentity } from '@/hooks/useUpdateUserIdentity';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import type { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import type { UpdateUserIdentityPayload } from '@/services/admin/adminUsersUpdateIdentity';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';

type ConfirmArchiveState = {
  user: AdminUserSummary;
  nextArchived: boolean;
};

export const useUsersManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmResetUser, setConfirmResetUser] = useState<AdminUserSummary | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<ConfirmArchiveState | null>(null);
  const [editIdentityOpen, setEditIdentityOpen] = useState(false);
  const [editIdentityUser, setEditIdentityUser] = useState<AdminUserSummary | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUserSummary | null>(null);

  const usersQuery = useAdminUsers(true);
  const agencies = useAgencies(false, true).data ?? [];
  const users = usersQuery.data ?? [];

  const createUserMutation = useCreateAdminUser();
  const setRoleMutation = useSetUserRole();
  const setMembershipMutation = useSetUserMemberships();
  const resetPasswordMutation = useResetUserPassword();
  const archiveMutation = useArchiveUser();
  const unarchiveMutation = useUnarchiveUser();
  const updateIdentityMutation = useUpdateUserIdentity();
  const deleteUserMutation = useDeleteUser();

  const filteredUsers = useMemo(() => {
    const visibleUsers = showArchived ? users : users.filter((user) => !user.archived_at);
    if (!searchTerm.trim()) return visibleUsers;

    const lower = searchTerm.toLowerCase();
    return visibleUsers.filter((user) => {
      const identity = `${user.last_name ?? ''} ${user.first_name ?? ''}`.toLowerCase();
      return (
        user.email.toLowerCase().includes(lower)
        || (user.display_name ?? '').toLowerCase().includes(lower)
        || identity.includes(lower)
      );
    });
  }, [searchTerm, showArchived, users]);

  const handleCreateUser = async (payload: CreateAdminUserPayload) => {
    const response = await createUserMutation.mutateAsync(payload);
    notifySuccess('Utilisateur cree.');
    if (response.temporary_password) {
      setTempPassword(response.temporary_password);
      setPasswordDialogOpen(true);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await setRoleMutation.mutateAsync({ userId, role });
      notifySuccess('Role mis a jour.');
    } catch {
      return;
    }
  };

  const handleMembershipSave = async (agencyIds: string[]) => {
    if (!selectedUser) return;
    if (selectedUser.role === 'tcs' && agencyIds.length === 0) {
      handleUiError(
        createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Un utilisateur TCS doit avoir au moins une agence.',
          source: 'client'
        }),
        'Un utilisateur TCS doit avoir au moins une agence.',
        { source: 'UsersManager.memberships' }
      );
      return;
    }

    try {
      await setMembershipMutation.mutateAsync({ userId: selectedUser.id, agencyIds });
      notifySuccess('Agences mises a jour.');
    } catch {
      return;
    }
  };

  const executeResetPassword = async () => {
    if (!confirmResetUser) return;
    try {
      const response = await resetPasswordMutation.mutateAsync({ userId: confirmResetUser.id });
      setTempPassword(response.temporary_password);
      setPasswordDialogOpen(true);
      notifySuccess('Mot de passe reinitialise.');
    } catch {
      return;
    }
  };

  const executeArchiveToggle = async () => {
    if (!confirmArchive) return;
    try {
      if (confirmArchive.nextArchived) {
        await archiveMutation.mutateAsync(confirmArchive.user.id);
      } else {
        await unarchiveMutation.mutateAsync(confirmArchive.user.id);
      }
      notifySuccess(confirmArchive.nextArchived ? 'Utilisateur archive.' : 'Utilisateur restaure.');
    } catch {
      return;
    }
  };

  const handleIdentitySave = async (payload: UpdateUserIdentityPayload) => {
    try {
      await updateIdentityMutation.mutateAsync(payload);
      notifySuccess('Utilisateur mis a jour.');
    } catch {
      return;
    }
  };

  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      const response = await deleteUserMutation.mutateAsync(confirmDeleteUser.id);
      const anonymizedCount = response.anonymized_interactions ?? 0;
      if (anonymizedCount > 0) {
        notifySuccess(`Utilisateur supprime. ${anonymizedCount} interaction(s) reattribuee(s).`);
      } else {
        notifySuccess('Utilisateur supprime.');
      }
    } catch {
      return;
    }
  };

  return {
    searchTerm,
    showArchived,
    createOpen,
    membershipOpen,
    selectedUser,
    passwordDialogOpen,
    tempPassword,
    confirmResetUser,
    confirmArchive,
    editIdentityOpen,
    editIdentityUser,
    confirmDeleteUser,
    usersQuery,
    agencies,
    filteredUsers,
    setSearchTerm,
    setShowArchived,
    setCreateOpen,
    setConfirmResetUser,
    setConfirmArchive,
    setPasswordDialogOpen,
    setConfirmDeleteUser,
    handleCreateUser,
    handleRoleChange,
    handleMembershipSave,
    handleIdentitySave,
    executeResetPassword,
    executeArchiveToggle,
    executeDeleteUser,
    handleResetPassword: (user: AdminUserSummary) => setConfirmResetUser(user),
    handleArchiveToggle: (user: AdminUserSummary) =>
      setConfirmArchive({ user, nextArchived: !user.archived_at }),
    handleDeleteUser: (user: AdminUserSummary) => setConfirmDeleteUser(user),
    openMembershipDialog: (user: AdminUserSummary) => {
      setSelectedUser(user);
      setMembershipOpen(true);
    },
    closeMembershipDialog: () => {
      setMembershipOpen(false);
      setSelectedUser(null);
    },
    openEditIdentityDialog: (user: AdminUserSummary) => {
      setEditIdentityUser(user);
      setEditIdentityOpen(true);
    },
    closeEditIdentityDialog: () => {
      setEditIdentityOpen(false);
      setEditIdentityUser(null);
    },
    closePasswordDialog: () => setPasswordDialogOpen(false),
    closeResetConfirm: () => setConfirmResetUser(null),
    closeArchiveConfirm: () => setConfirmArchive(null),
    closeDeleteConfirm: () => setConfirmDeleteUser(null)
  };
};
