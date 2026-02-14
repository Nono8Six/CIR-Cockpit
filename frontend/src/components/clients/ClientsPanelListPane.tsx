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
  onSelectProspect
}: ClientsPanelListPaneProps) => {
  const loadingState = (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
      <Loader2 size={18} className="animate-spin text-slate-500" />
      <p className="text-sm text-slate-600">
        {viewMode === 'clients'
          ? 'Chargement des clients...'
          : 'Chargement des prospects...'}
      </p>
    </div>
  );

  const errorState = (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-red-200 bg-red-50/60 p-4 text-center">
      <TriangleAlert size={18} className="text-red-600" />
      <p className="text-sm text-red-700">
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
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 p-4 text-center">
      <Inbox size={18} className="text-slate-400" />
      <p className="text-sm text-slate-500">
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
      className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
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
        />
      )}
    </div>
  );
};

export default ClientsPanelListPane;
