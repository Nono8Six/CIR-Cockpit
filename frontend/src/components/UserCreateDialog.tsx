import { Agency } from '@/types';
import { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useUserCreateDialog } from '@/hooks/useUserCreateDialog';
import UserCreateIdentitySection from './user-create/UserCreateIdentitySection';
import UserCreateRoleSection from './user-create/UserCreateRoleSection';
import UserCreateAgenciesSection from './user-create/UserCreateAgenciesSection';
import UserCreateFooter from './user-create/UserCreateFooter';

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencies: Agency[];
  onCreate: (payload: CreateAdminUserPayload) => Promise<void>;
}

const UserCreateDialog = ({ open, onOpenChange, agencies, onCreate }: UserCreateDialogProps) => {
  const {
    email,
    firstName,
    lastName,
    role,
    password,
    agencyIds,
    error,
    isSubmitting,
    canSubmit,
    setEmail,
    setFirstName,
    setLastName,
    setRole,
    setPassword,
    handleAgencyIdsChange,
    handleSubmit
  } = useUserCreateDialog({ onCreate, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Creer un utilisateur</DialogTitle>
          <DialogDescription className="sr-only">
            Renseignez les informations du nouvel utilisateur et ses droits.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <UserCreateIdentitySection
            email={email}
            firstName={firstName}
            lastName={lastName}
            onEmailChange={setEmail}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
          />
          <UserCreateRoleSection
            role={role}
            password={password}
            onRoleChange={setRole}
            onPasswordChange={setPassword}
          />
          <UserCreateAgenciesSection
            agencies={agencies}
            selectedAgencyIds={agencyIds}
            onAgencyIdsChange={handleAgencyIdsChange}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <UserCreateFooter
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserCreateDialog;
