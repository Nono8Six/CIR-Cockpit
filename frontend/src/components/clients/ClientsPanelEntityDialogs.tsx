import ClientContactDialog from '@/components/ClientContactDialog';
import ClientFormDialog from '@/components/ClientFormDialog';
import ProspectFormDialog from '@/components/ProspectFormDialog';
import type { ClientsPanelDialogsProps } from './ClientsPanelDialogs.types';

type ClientsPanelEntityDialogsProps = Pick<
  ClientsPanelDialogsProps,
  | 'agencies'
  | 'userRole'
  | 'activeAgencyId'
  | 'clientDialogOpen'
  | 'onClientDialogChange'
  | 'clientToEdit'
  | 'onSaveClient'
  | 'prospectDialogOpen'
  | 'onProspectDialogChange'
  | 'prospectToEdit'
  | 'onSaveProspect'
  | 'activeEntity'
  | 'contactDialogOpen'
  | 'onContactDialogChange'
  | 'contactToEdit'
  | 'onSaveContact'
>;

const ClientsPanelEntityDialogs = ({
  agencies,
  userRole,
  activeAgencyId,
  clientDialogOpen,
  onClientDialogChange,
  clientToEdit,
  onSaveClient,
  prospectDialogOpen,
  onProspectDialogChange,
  prospectToEdit,
  onSaveProspect,
  activeEntity,
  contactDialogOpen,
  onContactDialogChange,
  contactToEdit,
  onSaveContact
}: ClientsPanelEntityDialogsProps) => (
  <>
    <ClientFormDialog
      open={clientDialogOpen}
      onOpenChange={onClientDialogChange}
      client={clientToEdit}
      agencies={agencies}
      userRole={userRole}
      activeAgencyId={activeAgencyId}
      onSave={onSaveClient}
    />

    <ProspectFormDialog
      open={prospectDialogOpen}
      onOpenChange={onProspectDialogChange}
      prospect={prospectToEdit}
      agencies={agencies}
      userRole={userRole}
      activeAgencyId={activeAgencyId}
      onSave={onSaveProspect}
    />

    {activeEntity && (
      <ClientContactDialog
        open={contactDialogOpen}
        onOpenChange={onContactDialogChange}
        contact={contactToEdit}
        entityId={activeEntity.id}
        onSave={onSaveContact}
      />
    )}
  </>
);

export default ClientsPanelEntityDialogs;
