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
  | 'agencies'
  | 'userRole'
  | 'focusedContactId'
  | 'onEditClient'
  | 'onToggleArchive'
  | 'onAddContact'
  | 'onEditContact'
  | 'onDeleteContact'
  | 'onRequestConvert'
  | 'onEditProspect'
>;

const ClientsPanelDetailPane = ({
  viewMode,
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
}: ClientsPanelDetailPaneProps) => (
  <div className="xl:col-span-8 min-h-0 overflow-y-auto">
    {viewMode === 'clients' ? (
      <ClientDetailPanel
        client={selectedClient}
        contacts={contacts}
        isContactsLoading={contactsLoading}
        agencies={agencies}
        userRole={userRole}
        focusedContactId={focusedContactId}
        onEditClient={onEditClient}
        onToggleArchive={onToggleArchive}
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
        onRequestConvert={onRequestConvert}
        onEditProspect={onEditProspect}
        onAddContact={onAddContact}
        onEditContact={onEditContact}
        onDeleteContact={onDeleteContact}
      />
    )}
  </div>
);

export default ClientsPanelDetailPane;
