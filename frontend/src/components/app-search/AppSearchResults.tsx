import type { Entity, EntityContact, Interaction } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import AppSearchInteractionsSection from './AppSearchInteractionsSection';
import AppSearchClientsSection from './AppSearchClientsSection';
import AppSearchProspectsSection from './AppSearchProspectsSection';
import AppSearchContactsSection from './AppSearchContactsSection';

type AppSearchResultsProps = {
  searchQuery: string;
  hasSearchResults: boolean;
  filteredInteractions: Interaction[];
  filteredClients: Entity[];
  filteredProspects: Entity[];
  filteredContacts: EntityContact[];
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

const AppSearchResults = ({
  searchQuery,
  hasSearchResults,
  filteredInteractions,
  filteredClients,
  filteredProspects,
  filteredContacts,
  entityNameById,
  onFocusClient,
  onRequestConvert
}: AppSearchResultsProps) => {
  if (!searchQuery || !hasSearchResults) return null;

  return (
    <div className="space-y-3">
      <AppSearchInteractionsSection interactions={filteredInteractions} />
      <AppSearchClientsSection clients={filteredClients} onFocusClient={onFocusClient} />
      <AppSearchProspectsSection prospects={filteredProspects} onRequestConvert={onRequestConvert} />
      <AppSearchContactsSection
        contacts={filteredContacts}
        entityNameById={entityNameById}
        onFocusClient={onFocusClient}
      />
    </div>
  );
};

export default AppSearchResults;
