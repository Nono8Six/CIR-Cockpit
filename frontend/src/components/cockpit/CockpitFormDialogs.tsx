import { Agency, Entity, UserRole } from '@/types';
import ClientFormDialog from '@/components/ClientFormDialog';
import ClientContactDialog from '@/components/ClientContactDialog';
import ConvertClientDialog from '@/components/ConvertClientDialog';
import { ClientPayload } from '@/services/clients/saveClient';
import { EntityContactPayload } from '@/services/entities/saveEntityContact';
import { ConvertClientPayload } from '@/services/entities/convertEntityToClient';

type CockpitFormDialogsProps = {
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  selectedEntity: Entity | null;
  isClientDialogOpen: boolean;
  isContactDialogOpen: boolean;
  isConvertDialogOpen: boolean;
  convertTarget: Entity | null;
  onClientDialogChange: (open: boolean) => void;
  onContactDialogChange: (open: boolean) => void;
  onConvertDialogChange: (open: boolean) => void;
  onSaveClient: (payload: ClientPayload) => Promise<void>;
  onSaveContact: (payload: EntityContactPayload) => Promise<void>;
  onConvertClient: (payload: ConvertClientPayload) => Promise<void>;
};

const CockpitFormDialogs = ({
  agencies,
  userRole,
  activeAgencyId,
  selectedEntity,
  isClientDialogOpen,
  isContactDialogOpen,
  isConvertDialogOpen,
  convertTarget,
  onClientDialogChange,
  onContactDialogChange,
  onConvertDialogChange,
  onSaveClient,
  onSaveContact,
  onConvertClient
}: CockpitFormDialogsProps) => {
  return (
    <>
      <ClientFormDialog
        open={isClientDialogOpen}
        onOpenChange={onClientDialogChange}
        client={null}
        agencies={agencies}
        userRole={userRole}
        activeAgencyId={activeAgencyId}
        onSave={onSaveClient}
      />
      {selectedEntity && (
        <ClientContactDialog
          open={isContactDialogOpen}
          onOpenChange={onContactDialogChange}
          contact={null}
          entityId={selectedEntity.id}
          onSave={onSaveContact}
        />
      )}
      <ConvertClientDialog
        open={isConvertDialogOpen}
        onOpenChange={onConvertDialogChange}
        entity={convertTarget}
        onConvert={onConvertClient}
      />
    </>
  );
};

export default CockpitFormDialogs;
