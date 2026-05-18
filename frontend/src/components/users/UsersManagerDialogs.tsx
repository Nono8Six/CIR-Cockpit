import ConfirmDialog from '@/components/ConfirmDialog';
import TemporaryPasswordDialog from '@/components/TemporaryPasswordDialog';
import UserCreateDialog from '@/components/UserCreateDialog';
import UserIdentityDialog from '@/components/UserIdentityDialog';
import UserMembershipDialog from '@/components/UserMembershipDialog';
import type { useUsersManager } from '@/hooks/useUsersManager';

type UsersManagerState = ReturnType<typeof useUsersManager>;

type UsersManagerDialogsProps = {
  state: UsersManagerState;
};

const UsersManagerDialogs = ({ state }: UsersManagerDialogsProps) => {
  const {
    createOpen,
    setCreateOpen,
    membershipOpen,
    closeMembershipDialog,
    passwordDialogOpen,
    closePasswordDialog,
    selectedUser,
    tempPassword,
    confirmResetUser,
    confirmArchive,
    editIdentityOpen,
    editIdentityUser,
    confirmDeleteUser,
    agencies,
    handleCreateUser,
    handleMembershipSave,
    handleIdentitySave,
    executeResetPassword,
    closeResetConfirm,
    closeArchiveConfirm,
    executeArchiveToggle,
    closeEditIdentityDialog,
    closeDeleteConfirm,
    executeDeleteUser
  } = state;

  return (
    <>
      <UserCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        agencies={agencies}
        onCreate={handleCreateUser}
      />

      <UserMembershipDialog
        open={membershipOpen}
        onOpenChange={(open) => {
          if (open) return;
          closeMembershipDialog();
        }}
        agencies={agencies}
        selectedIds={selectedUser?.memberships.map((membership) => membership.agency_id) ?? []}
        onSave={handleMembershipSave}
      />

      <UserIdentityDialog
        open={editIdentityOpen}
        onOpenChange={(open) => {
          if (open) return;
          closeEditIdentityDialog();
        }}
        user={editIdentityUser}
        onSave={handleIdentitySave}
      />

      <TemporaryPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          if (open) return;
          closePasswordDialog();
        }}
        password={tempPassword}
        title="Mot de passe temporaire"
        description="Copiez ce mot de passe et communiquez-le à l'utilisateur."
      />

      <ConfirmDialog
        open={confirmResetUser !== null}
        onOpenChange={(open) => {
          if (!open) closeResetConfirm();
        }}
        title="Réinitialiser le mot de passe"
        description={`Un nouveau mot de passe temporaire sera généré pour ${confirmResetUser?.email ?? ''}.`}
        confirmLabel="Réinitialiser"
        variant="destructive"
        onConfirm={executeResetPassword}
      />

      <ConfirmDialog
        open={confirmArchive !== null}
        onOpenChange={(open) => {
          if (!open) closeArchiveConfirm();
        }}
        title={confirmArchive?.nextArchived ? "Archiver l'utilisateur" : "Restaurer l'utilisateur"}
        description={
          confirmArchive?.nextArchived
            ? `L'utilisateur ${confirmArchive?.user.email ?? ''} sera archivé.`
            : `L'utilisateur ${confirmArchive?.user.email ?? ''} sera restauré.`
        }
        confirmLabel={confirmArchive?.nextArchived ? 'Archiver' : 'Restaurer'}
        variant={confirmArchive?.nextArchived ? 'destructive' : 'default'}
        onConfirm={executeArchiveToggle}
      />

      <ConfirmDialog
        open={confirmDeleteUser !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirm();
        }}
        title="Supprimer l'utilisateur"
        description={`L'utilisateur ${confirmDeleteUser?.email ?? ''} sera définitivement supprimé. Ses interactions resteront historisées et réattribuées à un compte système.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={executeDeleteUser}
      />
    </>
  );
};

export default UsersManagerDialogs;
