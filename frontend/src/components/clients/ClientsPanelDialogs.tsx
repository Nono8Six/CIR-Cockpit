import ClientsPanelConfirmDialogs from './ClientsPanelConfirmDialogs';
import ClientsPanelEntityDialogs from './ClientsPanelEntityDialogs';
import type { ClientsPanelDialogsProps } from './ClientsPanelDialogs.types';

const ClientsPanelDialogs = ({
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
  onSaveContact,
  confirmArchive,
  onConfirmArchiveChange,
  onConfirmArchive,
  confirmDeleteContact,
  onConfirmDeleteContactChange,
  onConfirmDeleteContact
}: ClientsPanelDialogsProps) => {
  return (
    <>
      <ClientsPanelEntityDialogs
        agencies={agencies}
        userRole={userRole}
        activeAgencyId={activeAgencyId}
        clientDialogOpen={clientDialogOpen}
        onClientDialogChange={onClientDialogChange}
        clientToEdit={clientToEdit}
        onSaveClient={onSaveClient}
        prospectDialogOpen={prospectDialogOpen}
        onProspectDialogChange={onProspectDialogChange}
        prospectToEdit={prospectToEdit}
        onSaveProspect={onSaveProspect}
        activeEntity={activeEntity}
        contactDialogOpen={contactDialogOpen}
        onContactDialogChange={onContactDialogChange}
        contactToEdit={contactToEdit}
        onSaveContact={onSaveContact}
      />

      <ClientsPanelConfirmDialogs
        confirmArchive={confirmArchive}
        onConfirmArchiveChange={onConfirmArchiveChange}
        onConfirmArchive={onConfirmArchive}
        confirmDeleteContact={confirmDeleteContact}
        onConfirmDeleteContactChange={onConfirmDeleteContactChange}
        onConfirmDeleteContact={onConfirmDeleteContact}
      />
    </>
  );
};

export default ClientsPanelDialogs;
