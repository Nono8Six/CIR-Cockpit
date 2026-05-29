import { useMemo, useState } from 'react';

import { useAdminUsers } from '../access/useAdminUsers';
import { useAgencies } from '../../agencies/core/useAgencies';
import { useArchiveUser } from '../access/useArchiveUser';
import { useBulkDeleteUsers } from '../access/useBulkDeleteUsers';
import { useCreateAdminUser } from './useCreateAdminUser';
import { useDeleteUser } from '../access/useDeleteUser';
import { useResetUserPassword } from '../access/useResetUserPassword';
import { useSetUserMemberships } from '../access/useSetUserMemberships';
import { useSetUserRole } from '../access/useSetUserRole';
import { useUnarchiveUser } from '../access/useUnarchiveUser';
import { useUpdateUserIdentity } from './useUpdateUserIdentity';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import type { CreateAdminUserPayload } from '@/services/admin/createAdminUser';
import type { UpdateUserIdentityPayload } from '@/services/admin/updateAdminUserIdentity';
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

  // Multi-selection and bulk action states
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<string[] | null>(null);
  const [confirmBulkArchive, setConfirmBulkArchive] = useState<{ userIds: string[]; nextArchived: boolean } | null>(null);

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
  const bulkDeleteUsersMutation = useBulkDeleteUsers();

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
    await setMembershipMutation.mutateAsync({ userId: selectedUser.id, agencyIds });
    notifySuccess('Agences mises a jour.');
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
    await updateIdentityMutation.mutateAsync(payload);
    notifySuccess('Utilisateur mis a jour.');
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

  /**
   * Toggles the selection state of a single user.
   * @param {string} userId - The ID of the user.
   * @returns {void}
   */
  const toggleSelectUser = (userId: string): void => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  /**
   * Toggles selection for all visible filtered users.
   * @param {AdminUserSummary[]} visibleUsers - The list of visible users.
   * @returns {void}
   */
  const toggleSelectAll = (visibleUsers: AdminUserSummary[]): void => {
    const visibleIds = visibleUsers.map((u) => u.id);
    const allSelected = visibleIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => {
        const newSelection = [...prev];
        visibleIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  /**
   * Clears all user selection.
   * @returns {void}
   */
  const clearSelection = (): void => {
    setSelectedUserIds([]);
  };

  /**
   * Prepares bulk user deletion and opens confirmation.
   * @param {string[]} userIds - The IDs to delete.
   * @returns {void}
   */
  const handleBulkDelete = (userIds: string[]): void => {
    setConfirmBulkDelete(userIds);
  };

  /**
   * Executes the deletion of multiple users in bulk.
   * @returns {Promise<void>}
   */
  const executeBulkDelete = async (): Promise<void> => {
    if (!confirmBulkDelete) return;
    try {
      const response = await bulkDeleteUsersMutation.mutateAsync(confirmBulkDelete);
      if (response.anonymized_interactions > 0) {
        notifySuccess(
          `${response.deleted_count} utilisateur(s) supprimé(s). ${response.anonymized_interactions} interaction(s) réattribuée(s).`
        );
      } else {
        notifySuccess(`${response.deleted_count} utilisateur(s) supprimé(s).`);
      }
      setSelectedUserIds([]);
      setConfirmBulkDelete(null);
    } catch {
      return;
    }
  };

  /**
   * Prepares bulk user archiving/restoring and opens confirmation.
   * @param {string[]} userIds - The IDs to archive/restore.
   * @param {boolean} nextArchived - Target archived status.
   * @returns {void}
   */
  const handleBulkArchive = (userIds: string[], nextArchived: boolean): void => {
    setConfirmBulkArchive({ userIds, nextArchived });
  };

  /**
   * Executes archiving or restoring multiple users in bulk.
   * @returns {Promise<void>}
   */
  const executeBulkArchive = async (): Promise<void> => {
    if (!confirmBulkArchive) return;
    const { userIds, nextArchived } = confirmBulkArchive;
    try {
      let successCount = 0;
      for (const id of userIds) {
        try {
          if (nextArchived) {
            await archiveMutation.mutateAsync(id);
          } else {
            await unarchiveMutation.mutateAsync(id);
          }
          successCount++;
        } catch (error) {
          handleUiError(error, "Impossible de modifier le statut d'un utilisateur sélectionné.", {
            source: 'useUsersManager.bulkArchive',
            user_id: id,
            next_archived: nextArchived
          });
        }
      }
      if (successCount > 0) {
        notifySuccess(
          nextArchived
            ? `${successCount} utilisateur(s) archivé(s).`
            : `${successCount} utilisateur(s) restauré(s).`
        );
      }
      setSelectedUserIds([]);
      setConfirmBulkArchive(null);
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
    selectedUserIds,
    confirmBulkDelete,
    confirmBulkArchive,
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
    toggleSelectUser,
    toggleSelectAll,
    clearSelection,
    handleBulkDelete,
    executeBulkDelete,
    handleBulkArchive,
    executeBulkArchive,
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
    closeDeleteConfirm: () => setConfirmDeleteUser(null),
    closeBulkDeleteConfirm: () => setConfirmBulkDelete(null),
    closeBulkArchiveConfirm: () => setConfirmBulkArchive(null)
  };
};
