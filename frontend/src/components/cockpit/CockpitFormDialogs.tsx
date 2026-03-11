import { Agency, Entity, UserRole } from '@/types';
import ClientFormDialog from '@/components/ClientFormDialog';
import ClientContactDialog from '@/components/ClientContactDialog';
import EntityOnboardingDialog from '@/components/EntityOnboardingDialog';
import { ClientPayload } from '@/services/clients/saveClient';
import { EntityPayload } from '@/services/entities/saveEntity';
import { EntityContactPayload } from '@/services/entities/saveEntityContact';

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
  onConvertClient: (payload: ClientPayload) => Promise<void>;
};

const saveProspectFallback = async (): Promise<void> => undefined;

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
      {convertTarget ? (
        <EntityOnboardingDialog
          open={isConvertDialogOpen}
          onOpenChange={onConvertDialogChange}
          agencies={agencies}
          userRole={userRole}
          activeAgencyId={activeAgencyId}
          mode="convert"
          allowedIntents={['client']}
          initialEntity={convertTarget}
          sourceLabel="Cockpit"
          onSaveClient={onConvertClient}
          onSaveProspect={saveProspectFallback as (payload: EntityPayload) => Promise<void>}
        />
      ) : null}
    </>
  );
};

export default CockpitFormDialogs;
