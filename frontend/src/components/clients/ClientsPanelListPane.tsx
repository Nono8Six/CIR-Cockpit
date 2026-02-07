import ClientList from '@/components/ClientList';
import ProspectList from '@/components/ProspectList';
import type { ClientsPanelContentProps } from './ClientsPanelContent.types';

type ClientsPanelListPaneProps = Pick<
  ClientsPanelContentProps,
  | 'viewMode'
  | 'clientsLoading'
  | 'clientsError'
  | 'filteredClients'
  | 'selectedClientId'
  | 'onSelectClient'
  | 'prospectsLoading'
  | 'prospectsError'
  | 'filteredProspects'
  | 'selectedProspectId'
  | 'onSelectProspect'
>;

const ClientsPanelListPane = ({
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
  onSelectProspect
}: ClientsPanelListPaneProps) => (
  <div className="xl:col-span-4 min-h-0 overflow-y-auto bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
    {viewMode === 'clients' ? (
      clientsLoading ? (
        <div className="text-sm text-slate-400">Chargement des clients...</div>
      ) : clientsError ? (
        <div className="text-sm text-red-600">Erreur lors du chargement des clients.</div>
      ) : (
        <ClientList
          clients={filteredClients}
          selectedClientId={selectedClientId}
          onSelect={onSelectClient}
        />
      )
    ) : prospectsLoading ? (
      <div className="text-sm text-slate-400">Chargement des prospects...</div>
    ) : prospectsError ? (
      <div className="text-sm text-red-600">Erreur lors du chargement des prospects.</div>
    ) : (
      <ProspectList
        prospects={filteredProspects}
        selectedProspectId={selectedProspectId}
        onSelect={onSelectProspect}
      />
    )}
  </div>
);

export default ClientsPanelListPane;
