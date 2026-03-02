import ClientDetailPanel from '@/components/ClientDetailPanel';
import ProspectDetailPanel from '@/components/ProspectDetailPanel';
import type { ClientsPanelContentProps } from './ClientsPanelContent.types';

type ClientsPanelDetailPaneProps = Pick<
  ClientsPanelContentProps,
  | 'viewMode'
  | 'selectedClient'
  | 'selectedProspect'
  | 'contacts'
  | 'contactsLoading'
  | 'activeAgencyId'
  | 'statuses'
  | 'agencies'
  | 'userRole'
  | 'focusedContactId'
  | 'onEditClient'
  | 'onToggleArchive'
  | 'onDeleteClient'
  | 'onAddContact'
  | 'onEditContact'
  | 'onDeleteContact'
  | 'onRequestConvert'
  | 'onEditProspect'
  | 'onDeleteProspect'
>;

const ClientsPanelDetailPane = ({
  viewMode,
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
  onRequestConvert,
  onEditProspect,
  onDeleteProspect
}: ClientsPanelDetailPaneProps) => (
  <div
    className="h-full min-h-0 overflow-hidden lg:col-span-7"
    data-testid="clients-detail-pane"
  >
    {viewMode === 'clients' ? (
      <ClientDetailPanel
        key={selectedClient?.id ?? 'client-detail-empty'}
        client={selectedClient}
        contacts={contacts}
        isContactsLoading={contactsLoading}
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
      />
    ) : (
      <ProspectDetailPanel
        prospect={selectedProspect}
        contacts={contacts}
        isContactsLoading={contactsLoading}
        agencies={agencies}
        focusedContactId={focusedContactId}
        canDeleteProspect={userRole === 'super_admin'}
        onRequestConvert={onRequestConvert}
        onEditProspect={onEditProspect}
        onDeleteProspect={onDeleteProspect}
        onAddContact={onAddContact}
        onEditContact={onEditContact}
        onDeleteContact={onDeleteContact}
      />
    )}
  </div>
);

export default ClientsPanelDetailPane;
