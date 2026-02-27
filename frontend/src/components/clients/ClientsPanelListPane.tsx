import { Inbox, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import ClientList from '@/components/ClientList';
import ProspectList from '@/components/ProspectList';
import type { ClientsPanelContentProps } from './ClientsPanelContent.types';

type ClientsPanelListPaneProps = Pick<
  ClientsPanelContentProps,
  | 'viewMode'
  | 'clientsLoading'
  | 'clientsError'
  | 'onRetryClients'
  | 'filteredClients'
  | 'selectedClientId'
  | 'onSelectClient'
  | 'prospectsLoading'
  | 'prospectsError'
  | 'onRetryProspects'
  | 'filteredProspects'
  | 'selectedProspectId'
  | 'onSelectProspect'
  | 'isOrphansFilter'
  | 'agencies'
  | 'onReassignEntity'
  | 'isReassignPending'
>;

const ClientsPanelListPane = ({
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
  agencies,
  onReassignEntity,
  isReassignPending
}: ClientsPanelListPaneProps) => {
  const loadingState = (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-surface-1/80 p-4 text-center">
      <Loader2 size={18} className="animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {viewMode === 'clients'
          ? 'Chargement des clients...'
          : 'Chargement des prospects...'}
      </p>
    </div>
  );

  const errorState = (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-center">
      <TriangleAlert size={18} className="text-destructive" />
      <p className="text-sm text-destructive">
        {viewMode === 'clients'
          ? 'La liste clients est indisponible.'
          : 'La liste prospects est indisponible.'}
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-8 text-xs"
        onClick={viewMode === 'clients' ? onRetryClients : onRetryProspects}
      >
        Reessayer
      </Button>
    </div>
  );

  const emptyState = (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border p-4 text-center">
      <Inbox size={18} className="text-muted-foreground/80" />
      <p className="text-sm text-muted-foreground">
        {viewMode === 'clients'
          ? 'Aucun client ne correspond a votre recherche.'
          : 'Aucun prospect ne correspond a votre recherche.'}
      </p>
    </div>
  );

  const hasEmptyState = viewMode === 'clients'
    ? filteredClients.length === 0
    : filteredProspects.length === 0;

  return (
    <div
      className="lg:col-span-5 rounded-lg border border-border bg-card p-4 shadow-sm"
      data-testid="clients-list-pane"
    >
      {viewMode === 'clients' ? (
        clientsLoading ? (
          loadingState
        ) : clientsError ? (
          errorState
        ) : hasEmptyState ? (
          emptyState
        ) : (
          <ClientList
            clients={filteredClients}
            selectedClientId={selectedClientId}
            onSelect={onSelectClient}
            isOrphansFilterActive={isOrphansFilter}
            agencies={agencies}
            onReassignEntity={onReassignEntity}
            isReassignPending={isReassignPending}
          />
        )
      ) : prospectsLoading ? (
        loadingState
      ) : prospectsError ? (
        errorState
      ) : hasEmptyState ? (
        emptyState
      ) : (
        <ProspectList
          prospects={filteredProspects}
          selectedProspectId={selectedProspectId}
          onSelect={onSelectProspect}
          isOrphansFilterActive={isOrphansFilter}
          agencies={agencies}
          onReassignEntity={onReassignEntity}
          isReassignPending={isReassignPending}
        />
      )}
    </div>
  );
};

export default ClientsPanelListPane;
