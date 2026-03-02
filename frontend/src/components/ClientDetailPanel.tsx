import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import ConfirmDialog from '@/components/ConfirmDialog';
import DashboardDetailsOverlay from '@/components/dashboard/DashboardDetailsOverlay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAddTimelineEvent } from '@/hooks/useAddTimelineEvent';
import { useDeleteInteraction } from '@/hooks/useDeleteInteraction';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import {
  invalidateEntityInteractionsQueries,
  invalidateInteractionsQuery
} from '@/services/query/queryInvalidation';

import ClientDetailContactsSection from './client-detail/ClientDetailContactsSection';
import ClientDetailEmptyState from './client-detail/ClientDetailEmptyState';
import ClientDetailHeader from './client-detail/ClientDetailHeader';
import ClientDetailInfoGrid from './client-detail/ClientDetailInfoGrid';
import ClientDetailInteractionsSection from './client-detail/ClientDetailInteractionsSection';
import type { ClientDetailPanelProps } from './client-detail/ClientDetailPanel.types';

const INTERACTIONS_PAGE_SIZE = 20;

const buildTimelineSuccessMessage = (
  updates: InteractionUpdate | undefined,
  event: TimelineEvent,
  statusById: Map<string, AgencyStatus>
): string => {
  if (updates?.status_id) {
    return `Statut change : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis a jour'}`;
  }
  if (updates?.status) {
    return `Statut change : ${updates.status}`;
  }
  if (updates?.order_ref) {
    return 'N° de dossier enregistre';
  }
  if (event.type === 'note') {
    return 'Note ajoutee';
  }
  return 'Dossier mis a jour';
};

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
  const [page, setPage] = useState(1);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(activeAgencyId);
  const deleteInteractionMutation = useDeleteInteraction({
    agencyId: activeAgencyId,
    entityId: client?.id ?? null
  });

  const interactionsQuery = useEntityInteractions(
    client?.id ?? null,
    page,
    INTERACTIONS_PAGE_SIZE,
    Boolean(client)
  );
  const interactionsPage = interactionsQuery.data;
  const interactions = interactionsPage?.interactions ?? [];
  const totalPages = interactionsPage?.totalPages ?? 1;
  const totalInteractions = interactionsPage?.total ?? 0;
  const clientId = client?.id ?? null;
  const agencyName = client
    ? agencies.find((agency) => agency.id === client.agency_id)?.name ?? 'Sans agence'
    : 'Sans agence';
  const isArchived = Boolean(client?.archived_at);

  const statusById = useMemo(() => {
    const map = new Map<string, AgencyStatus>();
    statuses.forEach((status) => {
      if (status.id) {
        map.set(status.id, status);
      }
    });
    return map;
  }, [statuses]);

  const handleInteractionUpdate = useCallback(
    async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
      try {
        const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });
        setSelectedInteraction((current) => (current?.id === updated.id ? updated : current));
        void invalidateEntityInteractionsQueries(queryClient, clientId);
        notifySuccess(buildTimelineSuccessMessage(updates, event, statusById));
      } catch (error) {
        if (isAppError(error) && error.code === 'CONFLICT') {
          setSelectedInteraction(null);
          void invalidateInteractionsQuery(queryClient, activeAgencyId);
          handleUiError(
            error,
            'Ce dossier a ete modifie par un autre utilisateur. Rechargez les donnees.',
            { source: 'client.details.conflict' }
          );
          return;
        }
        handleUiError(error, 'Impossible de mettre a jour le dossier.', {
          source: 'client.details.update'
        });
      }
    },
    [activeAgencyId, addTimelineMutation, clientId, queryClient, statusById]
  );

  const handleConfirmDeleteInteraction = useCallback(async () => {
    if (!interactionToDelete) {
      return;
    }

    try {
      const deletedInteractionId = await deleteInteractionMutation.mutateAsync(interactionToDelete.id);
      if (selectedInteraction?.id === deletedInteractionId) {
        setSelectedInteraction(null);
      }
      if (interactions.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      setInteractionToDelete(null);
      notifySuccess('Interaction supprimee.');
    } catch {
      return;
    }
  }, [deleteInteractionMutation, interactionToDelete, interactions.length, page, selectedInteraction]);

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
            isInteractionsLoading={interactionsQuery.isLoading}
            currentPage={page}
            totalPages={totalPages}
            totalInteractions={totalInteractions}
            hasError={interactionsQuery.isError}
            onRetry={() => {
              void interactionsQuery.refetch();
            }}
            onOpenInteraction={setSelectedInteraction}
            onDeleteInteraction={setInteractionToDelete}
            onPreviousPage={() => {
              setPage((current) => Math.max(1, current - 1));
            }}
            onNextPage={() => {
              setPage((current) => Math.min(totalPages, current + 1));
            }}
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
          if (!open && !deleteInteractionMutation.isPending) {
            setInteractionToDelete(null);
          }
        }}
        title="Supprimer cette interaction"
        description={`L'interaction "${interactionToDelete?.subject ?? ''}" sera definitivement supprimee.`}
        confirmLabel={deleteInteractionMutation.isPending ? 'Suppression...' : 'Supprimer'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />
    </div>
  );
};

export default ClientDetailPanel;
