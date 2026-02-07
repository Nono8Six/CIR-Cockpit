import ClientsPanelDetailPane from './ClientsPanelDetailPane';
import ClientsPanelListPane from './ClientsPanelListPane';
import type { ClientsPanelContentProps } from './ClientsPanelContent.types';

const ClientsPanelContent = ({
  viewMode,
  clientsLoading,
  clientsError,
  filteredClients,
  selectedClientId,
  onSelectClient,
  prospectsLoading,
  prospectsError,
  filteredProspects,
  selectedProspectId,
  onSelectProspect,
  selectedClient,
  selectedProspect,
  contacts,
  contactsLoading,
  agencies,
  userRole,
  focusedContactId,
  onEditClient,
  onToggleArchive,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onRequestConvert,
  onEditProspect
}: ClientsPanelContentProps) => (
  <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
    <ClientsPanelListPane
      viewMode={viewMode}
      clientsLoading={clientsLoading}
      clientsError={clientsError}
      filteredClients={filteredClients}
      selectedClientId={selectedClientId}
      onSelectClient={onSelectClient}
      prospectsLoading={prospectsLoading}
      prospectsError={prospectsError}
      filteredProspects={filteredProspects}
      selectedProspectId={selectedProspectId}
      onSelectProspect={onSelectProspect}
    />
    <ClientsPanelDetailPane
      viewMode={viewMode}
      selectedClient={selectedClient}
      selectedProspect={selectedProspect}
      contacts={contacts}
      contactsLoading={contactsLoading}
      agencies={agencies}
      userRole={userRole}
      focusedContactId={focusedContactId}
      onEditClient={onEditClient}
      onToggleArchive={onToggleArchive}
      onAddContact={onAddContact}
      onEditContact={onEditContact}
      onDeleteContact={onDeleteContact}
      onRequestConvert={onRequestConvert}
      onEditProspect={onEditProspect}
    />
  </div>
);

export default ClientsPanelContent;
