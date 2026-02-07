

import ClientDetailContactsSection from './client-detail/ClientDetailContactsSection';
import ClientDetailEmptyState from './client-detail/ClientDetailEmptyState';
import ClientDetailHeader from './client-detail/ClientDetailHeader';
import ClientDetailInfoGrid from './client-detail/ClientDetailInfoGrid';
import type { ClientDetailPanelProps } from './client-detail/ClientDetailPanel.types';

const ClientDetailPanel = ({
  client,
  contacts,
  isContactsLoading,
  agencies,
  userRole,
  focusedContactId,
  onEditClient,
  onToggleArchive,
  onAddContact,
  onEditContact,
  onDeleteContact
}: ClientDetailPanelProps) => {
  if (!client) {
    return <ClientDetailEmptyState />;
  }

  const agencyName = agencies.find((agency) => agency.id === client.agency_id)?.name ?? 'Sans agence';
  const isArchived = Boolean(client.archived_at);

  return (
    <div className="h-full bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col gap-6">
      <ClientDetailHeader
        client={client}
        agencyName={agencyName}
        isArchived={isArchived}
        onEditClient={onEditClient}
        onToggleArchive={onToggleArchive}
      />
      <ClientDetailInfoGrid client={client} />
      <ClientDetailContactsSection
        contacts={contacts}
        focusedContactId={focusedContactId}
        isContactsLoading={isContactsLoading}
        onAddContact={onAddContact}
        onEditContact={onEditContact}
        onDeleteContact={onDeleteContact}
      />

      {userRole === 'tcs' && isArchived && (
        <p className="text-xs text-amber-600">Client archive - lecture seule.</p>
      )}
    </div>
  );
};

export default ClientDetailPanel;
