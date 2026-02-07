import ConfirmDialog from '@/components/ConfirmDialog';
import TemporaryPasswordDialog from '@/components/TemporaryPasswordDialog';
import UserCreateDialog from '@/components/UserCreateDialog';
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
    agencies,
    handleCreateUser,
    handleMembershipSave,
    executeResetPassword,
    closeResetConfirm,
    closeArchiveConfirm,
    executeArchiveToggle
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

      <TemporaryPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          if (open) return;
          closePasswordDialog();
        }}
        password={tempPassword}
        title="Mot de passe temporaire"
        description="Copiez ce mot de passe et communiquez-le a l'utilisateur."
      />

      <ConfirmDialog
        open={confirmResetUser !== null}
        onOpenChange={(open) => {
          if (!open) closeResetConfirm();
        }}
        title="Reinitialiser le mot de passe"
        description={`Un nouveau mot de passe temporaire sera genere pour ${confirmResetUser?.email ?? ''}.`}
        confirmLabel="Reinitialiser"
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
            ? `L'utilisateur ${confirmArchive?.user.email ?? ''} sera archive.`
            : `L'utilisateur ${confirmArchive?.user.email ?? ''} sera restaure.`
        }
        confirmLabel={confirmArchive?.nextArchived ? 'Archiver' : 'Restaurer'}
        variant={confirmArchive?.nextArchived ? 'destructive' : 'default'}
        onConfirm={executeArchiveToggle}
      />
    </>
  );
};

export default UsersManagerDialogs;
