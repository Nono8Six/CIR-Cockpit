import { useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import DashboardDetailsOverlay from '@/components/dashboard/DashboardDetailsOverlay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientDetailInteractions } from './client-detail/useClientDetailInteractions';

import ClientDetailContactsSection from './client-detail/ClientDetailContactsSection';
import ClientDetailEmptyState from './client-detail/ClientDetailEmptyState';
import ClientDetailHeader from './client-detail/ClientDetailHeader';
import ClientDetailInfoGrid from './client-detail/ClientDetailInfoGrid';
import ClientDetailInteractionsSection from './client-detail/ClientDetailInteractionsSection';
import type { ClientDetailPanelProps } from './client-detail/ClientDetailPanel.types';

const ClientDetailPanel = ({
  client,
  contacts,
  isContactsLoading,
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
  onDeleteContact
}: ClientDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'interactions'>('contacts');
  const agencyName = client
    ? agencies.find((agency) => agency.id === client.agency_id)?.name ?? 'Sans agence'
    : 'Sans agence';
  const isArchived = Boolean(client?.archived_at);
  const {
    currentPage,
    hasError,
    interactionToDelete,
    interactions,
    isDeletePending,
    isInteractionsLoading,
    selectedInteraction,
    totalInteractions,
    totalPages,
    handleConfirmDeleteInteraction,
    handleInteractionUpdate,
    onNextPage,
    onPreviousPage,
    onRetry,
    setInteractionToDelete,
    setSelectedInteraction
  } = useClientDetailInteractions({
    activeAgencyId,
    clientId: client?.id ?? null,
    statuses
  });

  if (!client) {
    return <ClientDetailEmptyState />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm">
      <ClientDetailHeader
        client={client}
        agencyName={agencyName}
        isArchived={isArchived}
        canDeleteClient={userRole === 'super_admin'}
        onEditClient={onEditClient}
        onToggleArchive={onToggleArchive}
        onDeleteClient={onDeleteClient}
      />
      <ClientDetailInfoGrid client={client} />
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'contacts' || value === 'interactions') {
            setActiveTab(value);
          }
        }}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-surface-1 p-1">
          <TabsTrigger value="contacts" className="h-7 px-3 text-xs sm:text-sm">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="interactions" className="h-7 px-3 text-xs sm:text-sm">
            Interactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contacts" className="mt-0 min-h-0 flex-1">
          <ClientDetailContactsSection
            contacts={contacts}
            focusedContactId={focusedContactId}
            isContactsLoading={isContactsLoading}
            onAddContact={onAddContact}
            onEditContact={onEditContact}
            onDeleteContact={onDeleteContact}
          />
        </TabsContent>
        <TabsContent value="interactions" className="mt-0 min-h-0 flex-1">
          <ClientDetailInteractionsSection
            interactions={interactions}
            isInteractionsLoading={isInteractionsLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalInteractions={totalInteractions}
            hasError={hasError}
            onRetry={onRetry}
            onOpenInteraction={setSelectedInteraction}
            onDeleteInteraction={setInteractionToDelete}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
          />
        </TabsContent>
      </Tabs>

      {userRole === 'tcs' && isArchived && (
        <p className="text-xs text-warning">Client archive - lecture seule.</p>
      )}

      {selectedInteraction && (
        <DashboardDetailsOverlay
          interaction={selectedInteraction}
          statuses={statuses}
          onClose={() => setSelectedInteraction(null)}
          onUpdate={handleInteractionUpdate}
          onRequestConvert={() => undefined}
          onDeleteInteraction={setInteractionToDelete}
        />
      )}

      <ConfirmDialog
        open={interactionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) {
            setInteractionToDelete(null);
          }
        }}
        title="Supprimer cette interaction"
        description={`L'interaction "${interactionToDelete?.subject ?? ''}" sera definitivement supprimee.`}
        confirmLabel={isDeletePending ? 'Suppression...' : 'Supprimer'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />
    </div>
  );
};

export default ClientDetailPanel;
