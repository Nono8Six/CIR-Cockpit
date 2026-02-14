import type { Entity, EntityContact, Interaction } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import AppSearchInteractionsSection from './AppSearchInteractionsSection';
import AppSearchClientsSection from './AppSearchClientsSection';
import AppSearchProspectsSection from './AppSearchProspectsSection';
import AppSearchContactsSection from './AppSearchContactsSection';

type AppSearchResultsProps = {
  filteredInteractions: Interaction[];
  filteredClients: Entity[];
  filteredProspects: Entity[];
  filteredContacts: EntityContact[];
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onOpenInteraction: (interaction: Interaction) => void;
};

const AppSearchResults = ({
  filteredInteractions,
  filteredClients,
  filteredProspects,
  filteredContacts,
  entityNameById,
  onFocusClient,
  onRequestConvert,
  onOpenInteraction
}: AppSearchResultsProps) => {
  return (
    <>
      <AppSearchInteractionsSection interactions={filteredInteractions} onOpenInteraction={onOpenInteraction} />
      <AppSearchClientsSection clients={filteredClients} onFocusClient={onFocusClient} />
      <AppSearchProspectsSection prospects={filteredProspects} onRequestConvert={onRequestConvert} />
      <AppSearchContactsSection
        contacts={filteredContacts}
        entityNameById={entityNameById}
        onFocusClient={onFocusClient}
      />
    </>
  );
};

export default AppSearchResults;
