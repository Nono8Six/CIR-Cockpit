import { useMemo, useState } from 'react';

import { useAdminUsers } from '../access/useAdminUsers';
import { useAgencies } from '../../agencies/core/useAgencies';
import { useArchiveUser } from '../access/useArchiveUser';
import { useCreateAdminUser } from './useCreateAdminUser';
import { useResetUserPassword } from '../access/useResetUserPassword';
import { useSetUserMemberships } from '../access/useSetUserMemberships';
import { useSetUserRole } from '../access/useSetUserRole';
import { useUnarchiveUser } from '../access/useUnarchiveUser';
import { useUpdateUserIdentity } from './useUpdateUserIdentity';
import { ROLE_LABELS } from '@/app/appConstants';
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
  const [roleChangeUser, setRoleChangeUser] = useState<AdminUserSummary | null>(null);

  // Multi-selection and bulk action states
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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
    notifySuccess('Utilisateur créé.');
    if (response.temporary_password) {
      setTempPassword(response.temporary_password);
      setPasswordDialogOpen(true);
    }
  };

  // Aucune elevation de privilege sans confirmation nommee : la mutation n'est
  // jamais appelee depuis la ligne, seulement depuis le dialog de confirmation.
  const executeRoleChange = async (role: UserRole) => {
    if (!roleChangeUser) return;
    const previousRole = roleChangeUser.role;
    try {
      await setRoleMutation.mutateAsync({ userId: roleChangeUser.id, role });
      notifySuccess(`Rôle mis à jour : ${ROLE_LABELS[previousRole]} → ${ROLE_LABELS[role]}.`);
      setRoleChangeUser(null);
    } catch {
      return;
    }
  };

  const handleMembershipSave = async (agencyIds: string[]) => {
    if (!selectedUser) return;
    await setMembershipMutation.mutateAsync({ userId: selectedUser.id, agencyIds });
    notifySuccess('Agences mises à jour.');
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
      notifySuccess(confirmArchive.nextArchived ? 'Utilisateur archivé.' : 'Utilisateur restauré.');
    } catch {
      return;
    }
  };

  const handleIdentitySave = async (payload: UpdateUserIdentityPayload) => {
    await updateIdentityMutation.mutateAsync(payload);
    notifySuccess('Utilisateur mis à jour.');
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
    roleChangeUser,
    selectedUserIds,
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
    handleCreateUser,
    executeRoleChange,
    openRoleChangeDialog: (user: AdminUserSummary) => setRoleChangeUser(user),
    closeRoleChangeDialog: () => setRoleChangeUser(null),
    handleMembershipSave,
    handleIdentitySave,
    executeResetPassword,
    executeArchiveToggle,
    toggleSelectUser,
    toggleSelectAll,
    clearSelection,
    handleBulkArchive,
    executeBulkArchive,
    handleResetPassword: (user: AdminUserSummary) => setConfirmResetUser(user),
    handleArchiveToggle: (user: AdminUserSummary) =>
      setConfirmArchive({ user, nextArchived: !user.archived_at }),
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
    closeBulkArchiveConfirm: () => setConfirmBulkArchive(null)
  };
};
