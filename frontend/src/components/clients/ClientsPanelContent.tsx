import ClientsPanelDetailPane from './ClientsPanelDetailPane';
import ClientsPanelListPane from './ClientsPanelListPane';
import type { ClientsPanelContentProps } from './ClientsPanelContent.types';

const ClientsPanelContent = ({
  viewMode,
  clientsLoading,
  clientsError,
  onRetryClients,
  filteredClients,
  selectedClientId,
  onSelectClient,
  prospectsLoading,
  prospectsError,
  onRetryProspects,
  filteredProspects,
  selectedProspectId,
  onSelectProspect,
  isOrphansFilter,
  selectedClient,
  selectedProspect,
  contacts,
  contactsLoading,
  activeAgencyId,
  statuses,
  agencies,
  userRole,
  focusedContactId,
  onEditClient,
  onToggleArchive,
  onDeleteClient,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onReassignEntity,
  isReassignPending,
  onRequestConvert,
  onEditProspect,
  onDeleteProspect
}: ClientsPanelContentProps) => (
  <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:auto-rows-fr lg:grid-cols-12">
    <ClientsPanelListPane
      viewMode={viewMode}
      clientsLoading={clientsLoading}
      clientsError={clientsError}
      onRetryClients={onRetryClients}
      filteredClients={filteredClients}
      selectedClientId={selectedClientId}
      onSelectClient={onSelectClient}
      prospectsLoading={prospectsLoading}
      prospectsError={prospectsError}
      onRetryProspects={onRetryProspects}
      filteredProspects={filteredProspects}
      selectedProspectId={selectedProspectId}
      onSelectProspect={onSelectProspect}
      isOrphansFilter={isOrphansFilter}
      agencies={agencies}
      onReassignEntity={onReassignEntity}
      isReassignPending={isReassignPending}
    />
    <ClientsPanelDetailPane
      viewMode={viewMode}
      selectedClient={selectedClient}
      selectedProspect={selectedProspect}
      contacts={contacts}
      contactsLoading={contactsLoading}
      activeAgencyId={activeAgencyId}
      statuses={statuses}
      agencies={agencies}
      userRole={userRole}
      focusedContactId={focusedContactId}
      onEditClient={onEditClient}
      onToggleArchive={onToggleArchive}
      onDeleteClient={onDeleteClient}
      onAddContact={onAddContact}
      onEditContact={onEditContact}
      onDeleteContact={onDeleteContact}
      onRequestConvert={onRequestConvert}
      onEditProspect={onEditProspect}
      onDeleteProspect={onDeleteProspect}
    />
  </div>
);

export default ClientsPanelContent;
