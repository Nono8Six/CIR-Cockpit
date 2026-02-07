import { useMemo, useState } from 'react';

import type { UserRole } from '@/types';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAgencies } from '@/hooks/useAgencies';
import { useCreateAdminUser } from '@/hooks/useCreateAdminUser';
import { useSetUserRole } from '@/hooks/useSetUserRole';
import { useSetUserMemberships } from '@/hooks/useSetUserMemberships';
import { useResetUserPassword } from '@/hooks/useResetUserPassword';
import { useArchiveUser } from '@/hooks/useArchiveUser';
import { useUnarchiveUser } from '@/hooks/useUnarchiveUser';
import { notifySuccess } from '@/services/errors/notify';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';

export const useUsersManager = () => {
  const [searchTerm, setSearchTerm] = useState(''); const [showArchived, setShowArchived] = useState(false); const [createOpen, setCreateOpen] = useState(false); const [membershipOpen, setMembershipOpen] = useState(false); const [passwordDialogOpen, setPasswordDialogOpen] = useState(false); const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null); const [tempPassword, setTempPassword] = useState(''); const [confirmResetUser, setConfirmResetUser] = useState<AdminUserSummary | null>(null); const [confirmArchive, setConfirmArchive] = useState<{ user: AdminUserSummary; nextArchived: boolean } | null>(null);
  const usersQuery = useAdminUsers(true); const agencies = useAgencies(false, true).data ?? [];
  const createUserMutation = useCreateAdminUser(); const setRoleMutation = useSetUserRole(); const setMembershipMutation = useSetUserMemberships(); const resetPasswordMutation = useResetUserPassword(); const archiveMutation = useArchiveUser(); const unarchiveMutation = useUnarchiveUser();
  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const list = showArchived ? users : users.filter(user => !user.archived_at);
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(user => user.email.toLowerCase().includes(lower) || (user.display_name ?? '').toLowerCase().includes(lower));
  }, [searchTerm, showArchived, users]);

  const handleCreateUser = async (payload: Parameters<typeof createUserMutation.mutateAsync>[0]) => { try { const response = await createUserMutation.mutateAsync(payload); notifySuccess('Utilisateur cree.'); if (response.temporary_password) { setTempPassword(response.temporary_password); setPasswordDialogOpen(true); } } catch { return; } };
  const handleRoleChange = async (userId: string, role: UserRole) => { try { await setRoleMutation.mutateAsync({ userId, role }); notifySuccess('Role mis a jour.'); } catch { return; } };

  const handleMembershipSave = async (agencyIds: string[]) => {
    if (!selectedUser) return;
    if (selectedUser.role === 'tcs' && agencyIds.length === 0) {
      handleUiError(createAppError({ code: 'VALIDATION_ERROR', message: 'Un utilisateur TCS doit avoir au moins une agence.', source: 'client' }), 'Un utilisateur TCS doit avoir au moins une agence.', { source: 'UsersManager.memberships' });
      return;
    }
    try { await setMembershipMutation.mutateAsync({ userId: selectedUser.id, agencyIds }); notifySuccess('Agences mises a jour.'); } catch { return; }
  };

  const executeResetPassword = async () => { if (!confirmResetUser) return; try { const response = await resetPasswordMutation.mutateAsync({ userId: confirmResetUser.id }); setTempPassword(response.temporary_password); setPasswordDialogOpen(true); notifySuccess('Mot de passe reinitialise.'); } catch { return; } };
  const executeArchiveToggle = async () => { if (!confirmArchive) return; try { if (confirmArchive.nextArchived) await archiveMutation.mutateAsync(confirmArchive.user.id); else await unarchiveMutation.mutateAsync(confirmArchive.user.id); notifySuccess(confirmArchive.nextArchived ? 'Utilisateur archive.' : 'Utilisateur restaure.'); } catch { return; } };

  return {
    searchTerm,
    setSearchTerm,
    showArchived,
    setShowArchived,
    createOpen,
    setCreateOpen,
    membershipOpen,
    setMembershipOpen: (user: AdminUserSummary) => { setSelectedUser(user); setMembershipOpen(true); },
    closeMembershipDialog: () => { setMembershipOpen(false); setSelectedUser(null); },
    passwordDialogOpen,
    closePasswordDialog: () => setPasswordDialogOpen(false),
    selectedUser,
    tempPassword,
    confirmResetUser,
    confirmArchive,
    usersQuery,
    agencies,
    filteredUsers,
    handleCreateUser,
    handleRoleChange,
    handleMembershipSave,
    handleResetPassword: (user: AdminUserSummary) => setConfirmResetUser(user),
    executeResetPassword,
    handleArchiveToggle: (user: AdminUserSummary) => setConfirmArchive({ user, nextArchived: !user.archived_at }),
    executeArchiveToggle,
    openMembershipDialog: (user: AdminUserSummary) => { setSelectedUser(user); setMembershipOpen(true); },
    closeResetConfirm: () => setConfirmResetUser(null),
    closeArchiveConfirm: () => setConfirmArchive(null),
    setConfirmResetUser,
    setConfirmArchive,
    setPasswordDialogOpen,
    setSelectedUser
  };
};
