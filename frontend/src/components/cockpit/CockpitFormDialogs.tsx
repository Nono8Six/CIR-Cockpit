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
  isProspectDialogOpen: boolean;
  isContactDialogOpen: boolean;
  isConvertDialogOpen: boolean;
  convertTarget: Entity | null;
  onClientDialogChange: (open: boolean) => void;
  onProspectDialogChange: (open: boolean) => void;
  onContactDialogChange: (open: boolean) => void;
  onConvertDialogChange: (open: boolean) => void;
  onSaveClient: (payload: ClientPayload) => Promise<void>;
  onSaveProspect: (payload: EntityPayload) => Promise<void>;
  onSaveContact: (payload: EntityContactPayload) => Promise<void>;
  onConvertClient: (payload: ClientPayload) => Promise<void>;
};

const saveClientFallback: (payload: ClientPayload) => Promise<void> = async () => undefined;
const saveProspectFallback: (payload: EntityPayload) => Promise<void> = async () => undefined;

const CockpitFormDialogs = ({
  agencies,
  userRole,
  activeAgencyId,
  selectedEntity,
  isClientDialogOpen,
  isProspectDialogOpen,
  isContactDialogOpen,
  isConvertDialogOpen,
  convertTarget,
  onClientDialogChange,
  onProspectDialogChange,
  onContactDialogChange,
  onConvertDialogChange,
  onSaveClient,
  onSaveProspect,
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
      <EntityOnboardingDialog
        open={isProspectDialogOpen}
        onOpenChange={onProspectDialogChange}
        agencies={agencies}
        userRole={userRole}
        activeAgencyId={activeAgencyId}
        allowedIntents={['prospect']}
        defaultIntent="prospect"
        sourceLabel="Cockpit"
        onSaveClient={saveClientFallback}
        onSaveProspect={onSaveProspect}
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
          onSaveProspect={saveProspectFallback}
        />
      ) : null}
    </>
  );
};

export default CockpitFormDialogs;
